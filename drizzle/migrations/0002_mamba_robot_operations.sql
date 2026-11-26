CREATE OR REPLACE FUNCTION public.mamba_create_annual_request(p_package_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_package public.mamba_packages%ROWTYPE;
  v_request public.mamba_annual_requests%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_package FROM public.mamba_packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mamba package is unavailable'; END IF;
  SELECT * INTO v_request FROM public.mamba_annual_requests
    WHERE user_id = v_user_id AND status IN ('PENDING', 'APPROVED_AWAITING_PAYMENT')
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('request_id', v_request.id, 'status', v_request.status, 'replayed', true); END IF;
  INSERT INTO public.mamba_annual_requests (user_id, package_id)
    VALUES (v_user_id, p_package_id) RETURNING * INTO v_request;
  RETURN jsonb_build_object('request_id', v_request.id, 'status', v_request.status, 'replayed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.mamba_create_annual_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mamba_create_annual_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mamba_purchase_subscription(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_quote public.mamba_exchange_quotes%ROWTYPE;
  v_package public.mamba_packages%ROWTYPE;
  v_request public.mamba_annual_requests%ROWTYPE;
  v_subscription public.mamba_subscriptions%ROWTYPE;
  v_balance public.account_balances%ROWTYPE;
  v_settings public.mamba_robot_settings%ROWTYPE;
  v_currency text;
  v_term text;
  v_expiry timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_quote FROM public.mamba_exchange_quotes WHERE id = p_quote_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mamba price quote was not found'; END IF;
  SELECT * INTO v_subscription FROM public.mamba_subscriptions WHERE purchase_quote_id = p_quote_id;
  IF FOUND THEN
    RETURN jsonb_build_object('subscription_id', v_subscription.id, 'expires_at', v_subscription.expires_at, 'charged_amount', v_subscription.charged_amount, 'wallet_currency', v_subscription.wallet_currency, 'replayed', true);
  END IF;
  IF v_quote.expires_at <= now() THEN RAISE EXCEPTION 'Mamba price quote expired; request a new quote'; END IF;
  SELECT upper(COALESCE(currency_code, 'USD')) INTO v_currency FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN v_currency := 'USD'; END IF;
  IF v_quote.wallet_currency <> v_currency THEN RAISE EXCEPTION 'Wallet currency changed; request a new quote'; END IF;
  SELECT * INTO v_settings FROM public.mamba_robot_settings WHERE id = 1;
  IF NOT FOUND OR NOT v_settings.subscriptions_enabled OR NOT v_settings.execution_enabled OR v_settings.globally_paused OR v_settings.execution_provider_name IS NULL THEN
    RAISE EXCEPTION 'Mamba subscriptions are unavailable until live execution is configured and enabled';
  END IF;
  SELECT * INTO v_package FROM public.mamba_packages WHERE id = v_quote.package_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mamba package is unavailable'; END IF;
  IF v_quote.quote_type = 'MONTHLY' THEN
    IF NOT v_package.is_active OR v_quote.price_usd <> v_package.price_usd THEN RAISE EXCEPTION 'Package changed; request a new quote'; END IF;
    v_term := 'MONTHLY';
  ELSE
    SELECT * INTO v_request FROM public.mamba_annual_requests
      WHERE id = v_quote.annual_request_id AND user_id = v_user_id FOR UPDATE;
    IF NOT FOUND OR v_request.status <> 'APPROVED_AWAITING_PAYMENT' OR v_request.package_id <> v_package.id OR v_request.annual_price_usd <> v_quote.price_usd THEN
      RAISE EXCEPTION 'Annual request is not approved for this quote';
    END IF;
    v_term := 'ANNUAL';
  END IF;
  UPDATE public.mamba_subscriptions SET status = 'EXPIRED', updated_at = now()
    WHERE user_id = v_user_id AND status IN ('ACTIVE', 'SUSPENDED') AND expires_at <= now();
  IF EXISTS (SELECT 1 FROM public.mamba_subscriptions WHERE user_id = v_user_id AND status IN ('ACTIVE', 'SUSPENDED') AND expires_at > now()) THEN
    RAISE EXCEPTION 'An active Mamba subscription already exists';
  END IF;
  INSERT INTO public.account_balances (user_id, balance, equity, pnl)
    VALUES (v_user_id, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_balance FROM public.account_balances WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance.balance < v_quote.wallet_amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  v_expiry := now() + CASE WHEN v_term = 'ANNUAL' THEN interval '365 days' ELSE interval '30 days' END;
  UPDATE public.account_balances SET balance = balance - v_quote.wallet_amount,
    equity = GREATEST(equity - v_quote.wallet_amount, 0), updated_at = now()
    WHERE user_id = v_user_id;
  INSERT INTO public.mamba_subscriptions (
    user_id, package_id, package_name_snapshot, status, term, starts_at, expires_at,
    price_usd_snapshot, daily_trade_allowance, wallet_currency, exchange_rate,
    charged_amount, rate_date, purchase_quote_id, annual_request_id
  ) VALUES (
    v_user_id, v_package.id, v_package.name, 'ACTIVE', v_term, now(), v_expiry,
    v_quote.price_usd, v_package.daily_trade_allowance, v_quote.wallet_currency,
    v_quote.exchange_rate, v_quote.wallet_amount, v_quote.rate_date, v_quote.id,
    CASE WHEN v_term = 'ANNUAL' THEN v_request.id ELSE NULL END
  ) RETURNING * INTO v_subscription;
  INSERT INTO public.transactions (user_id, type, amount, note)
    VALUES (v_user_id, 'MAMBA_SUBSCRIPTION'::public.txn_type, -v_quote.wallet_amount,
      'Mamba Robot ' || lower(v_term) || ' subscription: ' || v_package.name || ' · USD ' || to_char(v_quote.price_usd, 'FM999999990.00') || ' at ' || v_quote.exchange_rate::text || ' ' || v_quote.wallet_currency || ' per USD · rate date ' || v_quote.rate_date::text);
  IF v_term = 'ANNUAL' THEN
    UPDATE public.mamba_annual_requests SET status = 'PAID', updated_at = now() WHERE id = v_request.id;
  END IF;
  RETURN jsonb_build_object('subscription_id', v_subscription.id, 'expires_at', v_subscription.expires_at, 'charged_amount', v_subscription.charged_amount, 'wallet_currency', v_subscription.wallet_currency, 'replayed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.mamba_purchase_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mamba_purchase_subscription(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mamba_admin_update_subscription(
  p_subscription_id uuid,
  p_action text,
  p_daily_trade_allowance integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_subscription public.mamba_subscriptions%ROWTYPE;
  v_new_status text;
BEGIN
  IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin'::public.app_role) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Enter a reason for this admin action'; END IF;
  SELECT * INTO v_subscription FROM public.mamba_subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mamba subscription not found'; END IF;
  IF p_action = 'SUSPEND' THEN
    IF v_subscription.status <> 'ACTIVE' OR v_subscription.expires_at <= now() THEN RAISE EXCEPTION 'Only active subscriptions can be suspended'; END IF;
    v_new_status := 'SUSPENDED';
  ELSIF p_action = 'RESUME' THEN
    IF v_subscription.status <> 'SUSPENDED' OR v_subscription.expires_at <= now() THEN RAISE EXCEPTION 'Only unexpired suspended subscriptions can be resumed'; END IF;
    v_new_status := 'ACTIVE';
  ELSIF p_action = 'SET_ALLOWANCE' THEN
    IF p_daily_trade_allowance IS NULL OR p_daily_trade_allowance < 1 OR p_daily_trade_allowance > 100 THEN RAISE EXCEPTION 'Daily allowance must be between 1 and 100'; END IF;
    v_new_status := v_subscription.status;
  ELSE
    RAISE EXCEPTION 'Unsupported Mamba admin action';
  END IF;
  UPDATE public.mamba_subscriptions SET status = v_new_status,
    daily_trade_allowance = CASE WHEN p_action = 'SET_ALLOWANCE' THEN p_daily_trade_allowance ELSE daily_trade_allowance END,
    updated_at = now() WHERE id = p_subscription_id RETURNING * INTO v_subscription;
  INSERT INTO public.mamba_admin_audit (admin_id, target_user_id, subscription_id, action, reason, details)
    VALUES (v_admin_id, v_subscription.user_id, v_subscription.id, p_action, trim(p_reason),
      jsonb_build_object('status', v_subscription.status, 'daily_trade_allowance', v_subscription.daily_trade_allowance));
  RETURN jsonb_build_object('subscription_id', v_subscription.id, 'status', v_subscription.status, 'daily_trade_allowance', v_subscription.daily_trade_allowance);
END;
$$;
REVOKE ALL ON FUNCTION public.mamba_admin_update_subscription(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mamba_admin_update_subscription(uuid, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mamba_admin_decide_annual_request(
  p_request_id uuid,
  p_action text,
  p_annual_price_usd numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_request public.mamba_annual_requests%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin'::public.app_role) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Enter a reason for this admin decision'; END IF;
  SELECT * INTO v_request FROM public.mamba_annual_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'PENDING' THEN RAISE EXCEPTION 'Annual request is not pending'; END IF;
  IF p_action = 'APPROVE' THEN
    IF p_annual_price_usd IS NULL OR p_annual_price_usd <= 0 THEN RAISE EXCEPTION 'Set a valid annual USD price before approval'; END IF;
    UPDATE public.mamba_annual_requests SET status = 'APPROVED_AWAITING_PAYMENT', annual_price_usd = p_annual_price_usd,
      admin_reason = trim(p_reason), processed_by = v_admin_id, processed_at = now(), updated_at = now()
      WHERE id = p_request_id RETURNING * INTO v_request;
  ELSIF p_action = 'DECLINE' THEN
    UPDATE public.mamba_annual_requests SET status = 'DECLINED', admin_reason = trim(p_reason),
      processed_by = v_admin_id, processed_at = now(), updated_at = now()
      WHERE id = p_request_id RETURNING * INTO v_request;
  ELSE
    RAISE EXCEPTION 'Choose approve or decline';
  END IF;
  INSERT INTO public.mamba_admin_audit (admin_id, target_user_id, action, reason, details)
    VALUES (v_admin_id, v_request.user_id, 'ANNUAL_' || p_action, trim(p_reason),
      jsonb_build_object('request_id', v_request.id, 'annual_price_usd', v_request.annual_price_usd, 'status', v_request.status));
  RETURN jsonb_build_object('request_id', v_request.id, 'status', v_request.status, 'annual_price_usd', v_request.annual_price_usd);
END;
$$;
REVOKE ALL ON FUNCTION public.mamba_admin_decide_annual_request(uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mamba_admin_decide_annual_request(uuid, text, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mamba_admin_update_settings(
  p_subscriptions_enabled boolean,
  p_globally_paused boolean,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_settings public.mamba_robot_settings%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin'::public.app_role) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Enter a reason for this global control change'; END IF;
  INSERT INTO public.mamba_robot_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  SELECT * INTO v_settings FROM public.mamba_robot_settings WHERE id = 1 FOR UPDATE;
  IF p_subscriptions_enabled AND (NOT v_settings.execution_enabled OR v_settings.execution_provider_name IS NULL OR p_globally_paused) THEN
    RAISE EXCEPTION 'Configure and verify live execution, then resume Mamba, before enabling new subscriptions';
  END IF;
  UPDATE public.mamba_robot_settings SET subscriptions_enabled = p_subscriptions_enabled,
    globally_paused = p_globally_paused, updated_by = v_admin_id, updated_at = now()
    WHERE id = 1 RETURNING * INTO v_settings;
  INSERT INTO public.mamba_admin_audit (admin_id, action, reason, details)
    VALUES (v_admin_id, 'GLOBAL_SETTINGS', trim(p_reason),
      jsonb_build_object('subscriptions_enabled', v_settings.subscriptions_enabled, 'globally_paused', v_settings.globally_paused, 'execution_enabled', v_settings.execution_enabled));
  RETURN jsonb_build_object('subscriptions_enabled', v_settings.subscriptions_enabled, 'globally_paused', v_settings.globally_paused, 'execution_enabled', v_settings.execution_enabled);
END;
$$;
REVOKE ALL ON FUNCTION public.mamba_admin_update_settings(boolean, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mamba_admin_update_settings(boolean, boolean, text) TO authenticated;
