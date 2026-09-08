CREATE TABLE public.forex_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair text NOT NULL UNIQUE,
  base_currency text NOT NULL,
  quote_currency text NOT NULL,
  current_rate numeric NOT NULL DEFAULT 1,
  change_pct numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forex_pairs_currencies_differ CHECK (base_currency <> quote_currency),
  CONSTRAINT forex_pairs_rate_positive CHECK (current_rate > 0),
  CONSTRAINT forex_pairs_status_valid CHECK (status IN ('ACTIVE', 'HALTED'))
);
GRANT SELECT ON public.forex_pairs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.forex_pairs TO authenticated;
GRANT ALL ON public.forex_pairs TO service_role;
ALTER TABLE public.forex_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view active forex pairs"
  ON public.forex_pairs FOR SELECT TO authenticated
  USING (status = 'ACTIVE' OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can create forex pairs"
  ON public.forex_pairs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update forex pairs"
  ON public.forex_pairs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete forex pairs"
  ON public.forex_pairs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.forex_pairs (pair, base_currency, quote_currency, current_rate)
VALUES
  ('EUR/USD','EUR','USD',1.08),('EUR/GBP','EUR','GBP',0.86),('EUR/JPY','EUR','JPY',161.00),('EUR/CHF','EUR','CHF',0.94),('EUR/AUD','EUR','AUD',1.64),
  ('GBP/USD','GBP','USD',1.27),('GBP/EUR','GBP','EUR',1.16),('GBP/JPY','GBP','JPY',188.00),('GBP/CHF','GBP','CHF',1.17),('GBP/AUD','GBP','AUD',1.91),
  ('USD/EUR','USD','EUR',0.93),('USD/GBP','USD','GBP',0.79),('USD/JPY','USD','JPY',149.00),('USD/CHF','USD','CHF',0.87),('USD/AUD','USD','AUD',1.52),
  ('JPY/USD','JPY','USD',0.0067),('JPY/EUR','JPY','EUR',0.0062),('JPY/GBP','JPY','GBP',0.0053),('JPY/CHF','JPY','CHF',0.0058),('JPY/AUD','JPY','AUD',0.0102),
  ('CHF/USD','CHF','USD',1.13),('CHF/EUR','CHF','EUR',1.07),('CHF/GBP','CHF','GBP',0.86),('CHF/JPY','CHF','JPY',171.00),('CHF/AUD','CHF','AUD',1.72),
  ('AUD/USD','AUD','USD',0.66),('AUD/EUR','AUD','EUR',0.61),('AUD/GBP','AUD','GBP',0.52),('AUD/JPY','AUD','JPY',98.00),('AUD/CHF','AUD','CHF',0.57),
  ('NZD/USD','NZD','USD',0.61),('NZD/EUR','NZD','EUR',0.57),('NZD/GBP','NZD','GBP',0.48),('NZD/JPY','NZD','JPY',91.00),('NZD/CHF','NZD','CHF',0.53),('NZD/AUD','NZD','AUD',0.92),
  ('CAD/USD','CAD','USD',0.73),('CAD/EUR','CAD','EUR',0.68),('CAD/GBP','CAD','GBP',0.58),('CAD/JPY','CAD','JPY',109.00),('CAD/CHF','CAD','CHF',0.64),('CAD/AUD','CAD','AUD',1.10),
  ('SEK/USD','SEK','USD',0.095),('SEK/EUR','SEK','EUR',0.092),('SEK/GBP','SEK','GBP',0.078),('SEK/JPY','SEK','JPY',14.10),('SEK/CHF','SEK','CHF',0.083),('SEK/AUD','SEK','AUD',0.144),
  ('NOK/USD','NOK','USD',0.094),('NOK/EUR','NOK','EUR',0.087),('NOK/GBP','NOK','GBP',0.074),('NOK/JPY','NOK','JPY',14.00),('NOK/CHF','NOK','CHF',0.082),('NOK/AUD','NOK','AUD',0.143),
  ('DKK/USD','DKK','USD',0.145),('DKK/EUR','DKK','EUR',0.134),('DKK/GBP','DKK','GBP',0.115),('DKK/JPY','DKK','JPY',21.60),('DKK/CHF','DKK','CHF',0.126),('DKK/AUD','DKK','AUD',0.220),
  ('SGD/USD','SGD','USD',0.745),('SGD/EUR','SGD','EUR',0.690),('SGD/GBP','SGD','GBP',0.585),('SGD/JPY','SGD','JPY',111.00),('SGD/CHF','SGD','CHF',0.650),('SGD/AUD','SGD','AUD',1.13),
  ('HKD/USD','HKD','USD',0.128),('HKD/EUR','HKD','EUR',0.119),('HKD/GBP','HKD','GBP',0.101),('HKD/JPY','HKD','JPY',19.10),('HKD/CHF','HKD','CHF',0.111),('HKD/AUD','HKD','AUD',0.195),
  ('PLN/USD','PLN','USD',0.252),('PLN/EUR','PLN','EUR',0.233),('PLN/GBP','PLN','GBP',0.198),('PLN/JPY','PLN','JPY',37.60),('PLN/CHF','PLN','CHF',0.219),('PLN/AUD','PLN','AUD',0.383),
  ('CZK/USD','CZK','USD',0.0435),('CZK/EUR','CZK','EUR',0.0401),('CZK/GBP','CZK','GBP',0.0341),('CZK/JPY','CZK','JPY',6.48),('CZK/CHF','CZK','CHF',0.0378),('CZK/AUD','CZK','AUD',0.0661),
  ('HUF/USD','HUF','USD',0.00275),('HUF/EUR','HUF','EUR',0.00254),('HUF/GBP','HUF','GBP',0.00216),('HUF/JPY','HUF','JPY',0.409),('HUF/CHF','HUF','CHF',0.00239),('HUF/AUD','HUF','AUD',0.00418),
  ('MXN/USD','MXN','USD',0.059),('MXN/EUR','MXN','EUR',0.0545),('MXN/GBP','MXN','GBP',0.0465),('MXN/JPY','MXN','JPY',8.79),('MXN/CHF','MXN','CHF',0.0512),('MXN/AUD','MXN','AUD',0.0877),
  ('ZAR/USD','ZAR','USD',0.055),('ZAR/EUR','ZAR','EUR',0.051),('ZAR/GBP','ZAR','GBP',0.0435),('ZAR/JPY','ZAR','JPY',8.20),('ZAR/CHF','ZAR','CHF',0.048),('ZAR/AUD','ZAR','AUD',0.083)
ON CONFLICT (pair) DO NOTHING;

CREATE TABLE public.forex_user_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_id uuid NOT NULL REFERENCES public.forex_pairs(id) ON DELETE CASCADE,
  direction text NOT NULL,
  start_rate numeric NOT NULL,
  target_rate numeric NOT NULL,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pair_id),
  CONSTRAINT forex_control_direction_valid CHECK (direction IN ('RISE', 'FALL')),
  CONSTRAINT forex_control_rates_positive CHECK (start_rate > 0 AND target_rate > 0),
  CONSTRAINT forex_control_dates_valid CHECK (end_at > start_at)
);
GRANT SELECT ON public.forex_user_controls TO authenticated;
GRANT ALL ON public.forex_user_controls TO service_role;
ALTER TABLE public.forex_user_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own forex controls"
  ON public.forex_user_controls FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.user_forex_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_id uuid NOT NULL REFERENCES public.forex_pairs(id) ON DELETE RESTRICT,
  units numeric NOT NULL,
  entry_rate numeric NOT NULL,
  amount_invested numeric NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  remaining_units numeric NOT NULL,
  amount_sold numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  transaction_id text NOT NULL UNIQUE,
  sale_transaction_id text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  sale_date timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  forecast_direction text,
  forecast_start_rate numeric,
  forecast_target_rate numeric,
  forecast_start_at timestamptz,
  forecast_end_at timestamptz,
  CONSTRAINT user_forex_positions_units_positive CHECK (units > 0),
  CONSTRAINT user_forex_positions_entry_positive CHECK (entry_rate > 0),
  CONSTRAINT user_forex_positions_amount_positive CHECK (amount_invested > 0),
  CONSTRAINT user_forex_positions_remaining_nonnegative CHECK (remaining_units >= 0),
  CONSTRAINT user_forex_positions_status_valid CHECK (status IN ('ACTIVE', 'PARTIALLY_SOLD', 'FULLY_SOLD')),
  CONSTRAINT user_forex_positions_direction_valid CHECK (forecast_direction IS NULL OR forecast_direction IN ('RISE', 'FALL'))
);
GRANT SELECT ON public.user_forex_positions TO authenticated;
GRANT ALL ON public.user_forex_positions TO service_role;
ALTER TABLE public.user_forex_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own forex positions"
  ON public.user_forex_positions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TYPE public.txn_type ADD VALUE IF NOT EXISTS 'FOREX_BUY';
ALTER TYPE public.txn_type ADD VALUE IF NOT EXISTS 'FOREX_SELL';

CREATE OR REPLACE FUNCTION public.forex_effective_rate(
  p_market_rate numeric,
  p_start_rate numeric,
  p_target_rate numeric,
  p_start_at timestamptz,
  p_end_at timestamptz
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_ratio numeric;
BEGIN
  IF p_start_rate IS NULL OR p_target_rate IS NULL OR p_start_at IS NULL OR p_end_at IS NULL THEN
    RETURN p_market_rate;
  END IF;
  IF now() >= p_end_at THEN RETURN p_target_rate; END IF;
  IF now() <= p_start_at THEN RETURN p_start_rate; END IF;
  v_ratio := EXTRACT(EPOCH FROM (now() - p_start_at)) / NULLIF(EXTRACT(EPOCH FROM (p_end_at - p_start_at)), 0);
  RETURN p_start_rate + (p_target_rate - p_start_rate) * LEAST(1, GREATEST(0, v_ratio));
END;
$$;
GRANT EXECUTE ON FUNCTION public.forex_effective_rate(numeric, numeric, numeric, timestamptz, timestamptz) TO authenticated;

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
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
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
GRANT EXECUTE ON FUNCTION public.set_forex_schedule(uuid, uuid, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.buy_forex(
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
  v_user_id uuid := auth.uid();
  v_pair public.forex_pairs%ROWTYPE;
  v_control public.forex_user_controls%ROWTYPE;
  v_balance public.account_balances%ROWTYPE;
  v_position public.user_forex_positions%ROWTYPE;
  v_rate numeric;
  v_units numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Trade amount must be greater than zero'; END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) < 8 THEN RAISE EXCEPTION 'A valid transaction reference is required'; END IF;
  SELECT * INTO v_position FROM public.user_forex_positions WHERE transaction_id = p_transaction_id FOR UPDATE;
  IF FOUND THEN
    IF v_position.user_id <> v_user_id THEN RAISE EXCEPTION 'Transaction reference already used'; END IF;
    RETURN jsonb_build_object('position_id', v_position.id, 'transaction_id', v_position.transaction_id, 'units', v_position.units, 'amount_invested', v_position.amount_invested, 'replayed', true);
  END IF;
  SELECT * INTO v_pair FROM public.forex_pairs WHERE id = p_pair_id AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Forex pair is unavailable'; END IF;
  SELECT * INTO v_control FROM public.forex_user_controls WHERE user_id = v_user_id AND pair_id = p_pair_id AND enabled = true AND end_at > now();
  v_rate := public.forex_effective_rate(v_pair.current_rate, v_control.start_rate, v_control.target_rate, v_control.start_at, v_control.end_at);
  IF v_rate <= 0 THEN RAISE EXCEPTION 'Forex rate is unavailable'; END IF;
  SELECT * INTO v_balance FROM public.account_balances WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.account_balances (user_id, balance, equity, pnl) VALUES (v_user_id, 0, 0, 0) RETURNING * INTO v_balance; END IF;
  IF v_balance.balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  v_units := p_amount / v_rate;
  UPDATE public.account_balances SET balance = balance - p_amount, equity = GREATEST(equity - p_amount, 0) WHERE user_id = v_user_id;
  INSERT INTO public.user_forex_positions (user_id, pair_id, units, entry_rate, amount_invested, current_value, remaining_units, transaction_id, forecast_direction, forecast_start_rate, forecast_target_rate, forecast_start_at, forecast_end_at)
  VALUES (v_user_id, p_pair_id, v_units, v_rate, p_amount, p_amount, v_units, p_transaction_id, NULLIF(v_control.direction, ''), v_control.start_rate, v_control.target_rate, v_control.start_at, v_control.end_at)
  RETURNING * INTO v_position;
  INSERT INTO public.transactions (user_id, type, amount, note) VALUES (v_user_id, 'FOREX_BUY'::public.txn_type, -p_amount, 'Forex buy: ' || v_pair.pair);
  RETURN jsonb_build_object('position_id', v_position.id, 'transaction_id', p_transaction_id, 'pair', v_pair.pair, 'rate', v_rate, 'units', v_units, 'amount_invested', p_amount, 'direction', v_control.direction, 'replayed', false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.buy_forex(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sell_forex(
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
  v_user_id uuid := auth.uid();
  v_position public.user_forex_positions%ROWTYPE;
  v_pair public.forex_pairs%ROWTYPE;
  v_balance public.account_balances%ROWTYPE;
  v_rate numeric;
  v_current_value numeric;
  v_sell_amount numeric;
  v_sell_units numeric;
  v_remaining_units numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Sale amount must be greater than zero'; END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) < 8 THEN RAISE EXCEPTION 'A valid transaction reference is required'; END IF;
  SELECT * INTO v_position FROM public.user_forex_positions WHERE id = p_position_id AND user_id = v_user_id FOR UPDATE;
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
  SELECT * INTO v_balance FROM public.account_balances WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.account_balances (user_id, balance, equity, pnl) VALUES (v_user_id, 0, 0, 0) RETURNING * INTO v_balance; END IF;
  UPDATE public.account_balances SET balance = balance + v_sell_amount, equity = equity + v_sell_amount WHERE user_id = v_user_id;
  UPDATE public.user_forex_positions SET remaining_units = v_remaining_units, current_value = v_remaining_units * v_rate, amount_sold = amount_sold + v_sell_amount, status = CASE WHEN v_remaining_units <= 0.0000000001 THEN 'FULLY_SOLD' ELSE 'PARTIALLY_SOLD' END, sale_date = CASE WHEN v_remaining_units <= 0.0000000001 THEN now() ELSE sale_date END, sale_transaction_id = p_transaction_id, updated_at = now() WHERE id = v_position.id;
  INSERT INTO public.transactions (user_id, type, amount, note) VALUES (v_user_id, 'FOREX_SELL'::public.txn_type, v_sell_amount, 'Forex sale reference: ' || p_transaction_id || ' · ' || v_pair.pair);
  RETURN jsonb_build_object('position_id', v_position.id, 'pair', v_pair.pair, 'rate', v_rate, 'units_sold', v_sell_units, 'amount', v_sell_amount, 'transaction_id', p_transaction_id, 'remaining_units', v_remaining_units);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sell_forex(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.forex_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER forex_pairs_touch_updated_at BEFORE UPDATE ON public.forex_pairs FOR EACH ROW EXECUTE FUNCTION public.forex_touch_updated_at();
CREATE TRIGGER forex_controls_touch_updated_at BEFORE UPDATE ON public.forex_user_controls FOR EACH ROW EXECUTE FUNCTION public.forex_touch_updated_at();
CREATE TRIGGER user_forex_positions_touch_updated_at BEFORE UPDATE ON public.user_forex_positions FOR EACH ROW EXECUTE FUNCTION public.forex_touch_updated_at();