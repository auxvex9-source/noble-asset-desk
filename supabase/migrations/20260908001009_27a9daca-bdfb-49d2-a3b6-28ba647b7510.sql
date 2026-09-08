CREATE TABLE public.stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  symbol text NOT NULL,
  country text NOT NULL,
  market text NOT NULL,
  currency text NOT NULL,
  current_price numeric NOT NULL DEFAULT 0,
  price_change numeric NOT NULL DEFAULT 0,
  percentage_change numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stocks_symbol_country_key UNIQUE (symbol, country),
  CONSTRAINT stocks_price_nonnegative CHECK (current_price >= 0),
  CONSTRAINT stocks_status_valid CHECK (status IN ('ACTIVE', 'HALTED'))
);
GRANT SELECT ON public.stocks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stocks TO authenticated;
GRANT ALL ON public.stocks TO service_role;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view active stocks"
  ON public.stocks FOR SELECT TO authenticated
  USING (status = 'ACTIVE' OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can create stocks"
  ON public.stocks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update stocks"
  ON public.stocks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete stocks"
  ON public.stocks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.user_stock_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE RESTRICT,
  shares numeric NOT NULL,
  purchase_price numeric NOT NULL,
  amount_invested numeric NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  target_price numeric,
  target_date timestamptz,
  status text NOT NULL DEFAULT 'ACTIVE',
  transaction_id text NOT NULL UNIQUE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  amount_sold numeric NOT NULL DEFAULT 0,
  remaining_value numeric NOT NULL DEFAULT 0,
  sale_price numeric,
  sale_date timestamptz,
  sale_transaction_id text,
  CONSTRAINT user_stock_positions_shares_positive CHECK (shares > 0),
  CONSTRAINT user_stock_positions_purchase_price_positive CHECK (purchase_price > 0),
  CONSTRAINT user_stock_positions_amount_positive CHECK (amount_invested > 0),
  CONSTRAINT user_stock_positions_current_nonnegative CHECK (current_value >= 0),
  CONSTRAINT user_stock_positions_status_valid CHECK (status IN ('ACTIVE', 'PARTIALLY_SOLD', 'FULLY_SOLD'))
);
GRANT SELECT ON public.user_stock_positions TO authenticated;
GRANT UPDATE ON public.user_stock_positions TO authenticated;
GRANT ALL ON public.user_stock_positions TO service_role;
ALTER TABLE public.user_stock_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own stock positions"
  ON public.user_stock_positions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update stock positions"
  ON public.user_stock_positions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TYPE public.txn_type ADD VALUE IF NOT EXISTS 'STOCK_PURCHASE';
ALTER TYPE public.txn_type ADD VALUE IF NOT EXISTS 'STOCK_SELL';

CREATE OR REPLACE FUNCTION public.stock_trade_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER stocks_touch_updated_at
  BEFORE UPDATE ON public.stocks
  FOR EACH ROW EXECUTE FUNCTION public.stock_trade_touch_updated_at();
CREATE TRIGGER user_stock_positions_touch_updated_at
  BEFORE UPDATE ON public.user_stock_positions
  FOR EACH ROW EXECUTE FUNCTION public.stock_trade_touch_updated_at();

CREATE OR REPLACE FUNCTION public.buy_stock(
  p_stock_id uuid,
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
  v_stock public.stocks%ROWTYPE;
  v_balance public.account_balances%ROWTYPE;
  v_existing public.user_stock_positions%ROWTYPE;
  v_shares numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Investment amount must be greater than zero'; END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) < 8 THEN RAISE EXCEPTION 'A valid transaction reference is required'; END IF;

  SELECT * INTO v_existing FROM public.user_stock_positions WHERE transaction_id = p_transaction_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing.user_id <> v_user_id THEN RAISE EXCEPTION 'Transaction reference already used'; END IF;
    RETURN jsonb_build_object('position_id', v_existing.id, 'transaction_id', v_existing.transaction_id, 'shares', v_existing.shares, 'amount_invested', v_existing.amount_invested, 'current_value', v_existing.current_value, 'replayed', true);
  END IF;

  SELECT * INTO v_stock FROM public.stocks WHERE id = p_stock_id AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock is unavailable'; END IF;
  IF v_stock.current_price <= 0 THEN RAISE EXCEPTION 'Stock price is unavailable'; END IF;

  SELECT * INTO v_balance FROM public.account_balances WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.account_balances (user_id, balance, equity, pnl) VALUES (v_user_id, 0, 0, 0) RETURNING * INTO v_balance;
  END IF;
  IF v_balance.balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  v_shares := p_amount / v_stock.current_price;
  UPDATE public.account_balances
    SET balance = balance - p_amount,
        equity = GREATEST(equity - p_amount, 0)
    WHERE user_id = v_user_id;

  INSERT INTO public.user_stock_positions (user_id, stock_id, shares, purchase_price, amount_invested, current_value, remaining_value, transaction_id)
  VALUES (v_user_id, p_stock_id, v_shares, v_stock.current_price, p_amount, p_amount, p_amount, p_transaction_id)
  RETURNING * INTO v_existing;

  INSERT INTO public.transactions (user_id, type, amount, note)
  VALUES (v_user_id, 'STOCK_PURCHASE'::public.txn_type, -p_amount, 'Stock purchase: ' || v_stock.company_name || ' (' || v_stock.symbol || ')');

  RETURN jsonb_build_object('position_id', v_existing.id, 'transaction_id', v_existing.transaction_id, 'shares', v_existing.shares, 'amount_invested', v_existing.amount_invested, 'current_value', v_existing.current_value, 'stock_name', v_stock.company_name, 'symbol', v_stock.symbol, 'currency', v_stock.currency, 'replayed', false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.buy_stock(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sell_stock(
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
  v_position public.user_stock_positions%ROWTYPE;
  v_stock public.stocks%ROWTYPE;
  v_balance public.account_balances%ROWTYPE;
  v_current_value numeric;
  v_sell_amount numeric;
  v_sell_shares numeric;
  v_remaining_shares numeric;
  v_remaining_cost numeric;
  v_transaction_id uuid := gen_random_uuid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Sale amount must be greater than zero'; END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) < 8 THEN RAISE EXCEPTION 'A valid transaction reference is required'; END IF;

  SELECT * INTO v_position FROM public.user_stock_positions WHERE id = p_position_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock position not found'; END IF;
  IF v_position.status = 'FULLY_SOLD' OR v_position.shares <= 0 THEN RAISE EXCEPTION 'This position is already sold'; END IF;
  IF EXISTS (SELECT 1 FROM public.transactions WHERE note LIKE 'Stock sale reference: ' || p_transaction_id || '%') THEN
    RAISE EXCEPTION 'This sale request has already been processed';
  END IF;

  SELECT * INTO v_stock FROM public.stocks WHERE id = v_position.stock_id FOR UPDATE;
  IF NOT FOUND OR v_stock.current_price <= 0 THEN RAISE EXCEPTION 'Current stock value is unavailable'; END IF;
  v_current_value := v_position.shares * v_stock.current_price;
  v_sell_amount := LEAST(p_amount, v_current_value);
  IF p_amount > v_current_value + 0.00000001 THEN RAISE EXCEPTION 'Sale amount exceeds current position value'; END IF;

  v_sell_shares := v_position.shares * (v_sell_amount / v_current_value);
  v_remaining_shares := v_position.shares - v_sell_shares;
  v_remaining_cost := v_position.amount_invested * (v_remaining_shares / v_position.shares);

  SELECT * INTO v_balance FROM public.account_balances WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.account_balances (user_id, balance, equity, pnl) VALUES (v_user_id, 0, 0, 0) RETURNING * INTO v_balance;
  END IF;

  UPDATE public.account_balances
    SET balance = balance + v_sell_amount,
        equity = equity + v_sell_amount
    WHERE user_id = v_user_id;

  UPDATE public.user_stock_positions
    SET shares = v_remaining_shares,
        amount_invested = v_remaining_cost,
        current_value = v_remaining_shares * v_stock.current_price,
        remaining_value = v_remaining_shares * v_stock.current_price,
        amount_sold = amount_sold + v_sell_amount,
        sale_price = v_stock.current_price,
        sale_date = now(),
        sale_transaction_id = v_transaction_id::text,
        status = CASE WHEN v_remaining_shares <= 0.00000001 THEN 'FULLY_SOLD' ELSE 'PARTIALLY_SOLD' END
    WHERE id = v_position.id;

  INSERT INTO public.transactions (id, user_id, type, amount, note)
  VALUES (v_transaction_id, v_user_id, 'STOCK_SELL'::public.txn_type, v_sell_amount, 'Stock sale reference: ' || p_transaction_id || ' · ' || v_stock.company_name || ' (' || v_stock.symbol || ')');

  RETURN jsonb_build_object('position_id', v_position.id, 'sale_transaction_id', v_transaction_id, 'sold_amount', v_sell_amount, 'sale_price', v_stock.current_price, 'shares_sold', v_sell_shares, 'remaining_shares', v_remaining_shares, 'remaining_value', v_remaining_shares * v_stock.current_price, 'stock_name', v_stock.company_name, 'symbol', v_stock.symbol, 'currency', v_stock.currency);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sell_stock(uuid, numeric, text) TO authenticated;

INSERT INTO public.stocks (company_name, symbol, country, market, currency, current_price, price_change, percentage_change)
VALUES
  ('Apple Inc.', 'AAPL', 'United States', 'NASDAQ', 'USD', 227.16, 1.84, 0.82),
  ('Microsoft Corporation', 'MSFT', 'United States', 'NASDAQ', 'USD', 415.32, -2.11, -0.51),
  ('NVIDIA Corporation', 'NVDA', 'United States', 'NASDAQ', 'USD', 138.85, 3.72, 2.75),
  ('Amazon.com Inc.', 'AMZN', 'United States', 'NASDAQ', 'USD', 225.94, 1.18, 0.52),
  ('Tesla Inc.', 'TSLA', 'United States', 'NASDAQ', 'USD', 342.78, -4.62, -1.33),
  ('Alphabet Inc.', 'GOOGL', 'United States', 'NASDAQ', 'USD', 192.42, 0.96, 0.50),
  ('JPMorgan Chase & Co.', 'JPM', 'United States', 'NYSE', 'USD', 245.58, 1.27, 0.52),
  ('HSBC Holdings plc', 'HSBA', 'United Kingdom', 'LSE', 'GBP', 824.6, -3.1, -0.37),
  ('AstraZeneca plc', 'AZN', 'United Kingdom', 'LSE', 'GBP', 10834, 64, 0.59),
  ('Shopify Inc.', 'SHOP', 'Canada', 'TSX', 'CAD', 139.84, 2.34, 1.70),
  ('Royal Bank of Canada', 'RY', 'Canada', 'TSX', 'CAD', 178.22, 0.8, 0.45),
  ('FirstRand Limited', 'FSR', 'South Africa', 'JSE', 'ZAR', 7620, 95, 1.26),
  ('Naspers Limited', 'NPN', 'South Africa', 'JSE', 'ZAR', 382450, -2140, -0.56),
  ('MTN Nigeria Communications', 'MTNN', 'Nigeria', 'NGX', 'NGN', 462.5, 8.5, 1.87),
  ('Seplat Energy Plc', 'SEPLAT', 'Nigeria', 'NGX', 'NGN', 5480, -30, -0.54),
  ('Dangote Cement Plc', 'DANGCEM', 'Nigeria', 'NGX', 'NGN', 514.9, 4.9, 0.96),
  ('Ghana Commercial Bank', 'GCB', 'Ghana', 'GSE', 'GHS', 5.18, 0.07, 1.37),
  ('Standard Chartered Ghana', 'SCB', 'Ghana', 'GSE', 'GHS', 1.72, -0.02, -1.15)
ON CONFLICT (symbol, country) DO NOTHING;