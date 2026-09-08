DROP FUNCTION IF EXISTS public.buy_forex(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.sell_forex(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.set_forex_schedule(uuid, uuid, text, integer);

CREATE OR REPLACE FUNCTION public.set_forex_schedule(
  p_user_id uuid,
  p_pair_id uuid,
  p_direction text,
  p_duration_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pair public.forex_pairs%ROWTYPE;
  v_start_rate numeric;
  v_target_rate numeric;
  v_end_at timestamptz;
  v_control public.forex_user_controls%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_pair_id IS NULL THEN RAISE EXCEPTION 'Client and pair are required'; END IF;
  IF p_direction NOT IN ('RISE', 'FALL') THEN RAISE EXCEPTION 'Choose Rise or Fall'; END IF;
  IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 3650 THEN RAISE EXCEPTION 'Duration must be between 1 and 3650 days'; END IF;
  SELECT * INTO v_pair FROM public.forex_pairs WHERE id = p_pair_id AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Forex pair is unavailable'; END IF;
  v_start_rate := v_pair.current_rate;
  v_target_rate := v_start_rate * CASE WHEN p_direction = 'RISE' THEN 1.08 ELSE 0.92 END;
  v_end_at := now() + make_interval(days => p_duration_days);
  INSERT INTO public.forex_user_controls (user_id, pair_id, direction, start_rate, target_rate, start_at, end_at, enabled)
  VALUES (p_user_id, p_pair_id, p_direction, v_start_rate, v_target_rate, now(), v_end_at, true)
  ON CONFLICT (user_id, pair_id) DO UPDATE SET direction = EXCLUDED.direction, start_rate = EXCLUDED.start_rate, target_rate = EXCLUDED.target_rate, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, enabled = true, updated_at = now()
  RETURNING * INTO v_control;
  UPDATE public.user_forex_positions
    SET forecast_direction = v_control.direction,
        forecast_start_rate = v_control.start_rate,
        forecast_target_rate = v_control.target_rate,
        forecast_start_at = v_control.start_at,
        forecast_end_at = v_control.end_at,
        updated_at = now()
    WHERE user_id = p_user_id AND pair_id = p_pair_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('user_id', p_user_id, 'pair_id', p_pair_id, 'direction', v_control.direction, 'start_rate', v_control.start_rate, 'target_rate', v_control.target_rate, 'start_at', v_control.start_at, 'end_at', v_control.end_at);
END;
$$;
REVOKE ALL ON FUNCTION public.set_forex_schedule(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_forex_schedule(uuid, uuid, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.buy_forex(
  p_user_id uuid,
  p_pair_id uuid,
  p_amount numeric,
  p_transaction_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pair public.forex_pairs%ROWTYPE;
  v_control public.forex_user_controls%ROWTYPE;
  v_balance public.account_balances%ROWTYPE;
  v_position public.user_forex_positions%ROWTYPE;
  v_rate numeric;
  v_units numeric;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Trade amount must be greater than zero'; END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) < 8 THEN RAISE EXCEPTION 'A valid transaction reference is required'; END IF;
  SELECT * INTO v_position FROM public.user_forex_positions WHERE transaction_id = p_transaction_id FOR UPDATE;
  IF FOUND THEN
    IF v_position.user_id <> p_user_id THEN RAISE EXCEPTION 'Transaction reference already used'; END IF;
    RETURN jsonb_build_object('position_id', v_position.id, 'transaction_id', v_position.transaction_id, 'units', v_position.units, 'amount_invested', v_position.amount_invested, 'replayed', true);
  END IF;
  SELECT * INTO v_pair FROM public.forex_pairs WHERE id = p_pair_id AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Forex pair is unavailable'; END IF;
  SELECT * INTO v_control FROM public.forex_user_controls WHERE user_id = p_user_id AND pair_id = p_pair_id AND enabled = true AND end_at > now();
  v_rate := public.forex_effective_rate(v_pair.current_rate, v_control.start_rate, v_control.target_rate, v_control.start_at, v_control.end_at);
  IF v_rate <= 0 THEN RAISE EXCEPTION 'Forex rate is unavailable'; END IF;
  SELECT * INTO v_balance FROM public.account_balances WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.account_balances (user_id, balance, equity, pnl) VALUES (p_user_id, 0, 0, 0) RETURNING * INTO v_balance; END IF;
  IF v_balance.balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  v_units := p_amount / v_rate;
  UPDATE public.account_balances SET balance = balance - p_amount, equity = GREATEST(equity - p_amount, 0) WHERE user_id = p_user_id;
  INSERT INTO public.user_forex_positions (user_id, pair_id, units, entry_rate, amount_invested, current_value, remaining_units, transaction_id, forecast_direction, forecast_start_rate, forecast_target_rate, forecast_start_at, forecast_end_at)
  VALUES (p_user_id, p_pair_id, v_units, v_rate, p_amount, p_amount, v_units, p_transaction_id, NULLIF(v_control.direction, ''), v_control.start_rate, v_control.target_rate, v_control.start_at, v_control.end_at)
  RETURNING * INTO v_position;
  INSERT INTO public.transactions (user_id, type, amount, note) VALUES (p_user_id, 'FOREX_BUY'::public.txn_type, -p_amount, 'Forex buy: ' || v_pair.pair);
  RETURN jsonb_build_object('position_id', v_position.id, 'transaction_id', p_transaction_id, 'pair', v_pair.pair, 'rate', v_rate, 'units', v_units, 'amount_invested', p_amount, 'direction', v_control.direction, 'replayed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.buy_forex(uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buy_forex(uuid, uuid, numeric, text) TO service_role;

CREATE OR REPLACE FUNCTION public.sell_forex(
  p_user_id uuid,
  p_position_id uuid,
  p_amount numeric,
  p_transaction_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position public.user_forex_positions%ROWTYPE;
  v_pair public.forex_pairs%ROWTYPE;
  v_balance public.account_balances%ROWTYPE;
  v_rate numeric;
  v_current_value numeric;
  v_sell_amount numeric;
  v_sell_units numeric;
  v_remaining_units numeric;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Sale amount must be greater than zero'; END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) < 8 THEN RAISE EXCEPTION 'A valid transaction reference is required'; END IF;
  SELECT * INTO v_position FROM public.user_forex_positions WHERE id = p_position_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_position.status = 'FULLY_SOLD' OR v_position.remaining_units <= 0 THEN RAISE EXCEPTION 'Forex position is already sold'; END IF;
  IF EXISTS (SELECT 1 FROM public.transactions WHERE note LIKE 'Forex sale reference: ' || p_transaction_id || '%') THEN RAISE EXCEPTION 'This sale request has already been processed'; END IF;
  SELECT * INTO v_pair FROM public.forex_pairs WHERE id = v_position.pair_id FOR UPDATE;
  IF NOT FOUND OR v_pair.current_rate <= 0 THEN RAISE EXCEPTION 'Current forex rate is unavailable'; END IF;
  v_rate := public.forex_effective_rate(v_pair.current_rate, v_position.forecast_start_rate, v_position.forecast_target_rate, v_position.forecast_start_at, v_position.forecast_end_at);
  v_current_value := v_position.remaining_units * v_rate;
  IF p_amount > v_current_value + 0.00000001 THEN RAISE EXCEPTION 'Sale amount exceeds current position value'; END IF;
  v_sell_amount := p_amount;
  v_sell_units := v_position.remaining_units * (v_sell_amount / v_current_value);
  v_remaining_units := v_position.remaining_units - v_sell_units;
  SELECT * INTO v_balance FROM public.account_balances WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.account_balances (user_id, balance, equity, pnl) VALUES (p_user_id, 0, 0, 0) RETURNING * INTO v_balance; END IF;
  UPDATE public.account_balances SET balance = balance + v_sell_amount, equity = equity + v_sell_amount WHERE user_id = p_user_id;
  UPDATE public.user_forex_positions SET remaining_units = v_remaining_units, current_value = v_remaining_units * v_rate, amount_sold = amount_sold + v_sell_amount, status = CASE WHEN v_remaining_units <= 0.0000000001 THEN 'FULLY_SOLD' ELSE 'PARTIALLY_SOLD' END, sale_date = CASE WHEN v_remaining_units <= 0.0000000001 THEN now() ELSE sale_date END, sale_transaction_id = p_transaction_id, updated_at = now() WHERE id = v_position.id;
  INSERT INTO public.transactions (user_id, type, amount, note) VALUES (p_user_id, 'FOREX_SELL'::public.txn_type, v_sell_amount, 'Forex sale reference: ' || p_transaction_id || ' · ' || v_pair.pair);
  RETURN jsonb_build_object('position_id', v_position.id, 'pair', v_pair.pair, 'rate', v_rate, 'units_sold', v_sell_units, 'amount', v_sell_amount, 'transaction_id', p_transaction_id, 'remaining_units', v_remaining_units);
END;
$$;
REVOKE ALL ON FUNCTION public.sell_forex(uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sell_forex(uuid, uuid, numeric, text) TO service_role;