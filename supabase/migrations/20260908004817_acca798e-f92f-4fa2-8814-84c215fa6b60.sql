ALTER TABLE public.user_stock_positions ADD COLUMN IF NOT EXISTS growth_start_at timestamptz;

CREATE OR REPLACE FUNCTION public.position_effective_price(
  p_purchase_price numeric,
  p_target_price numeric,
  p_growth_start_at timestamptz,
  p_target_date timestamptz,
  p_market_price numeric
) RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_target_price IS NULL OR p_target_price <= 0 OR p_target_date IS NULL
      THEN COALESCE(NULLIF(p_market_price, 0), p_purchase_price)
    WHEN now() >= p_target_date THEN p_target_price
    ELSE
      COALESCE(p_purchase_price, 0) + (p_target_price - COALESCE(p_purchase_price, 0)) *
      LEAST(1, GREATEST(0,
        EXTRACT(EPOCH FROM (now() - COALESCE(p_growth_start_at, p_target_date - interval '1 day')))
        / NULLIF(EXTRACT(EPOCH FROM (p_target_date - COALESCE(p_growth_start_at, p_target_date - interval '1 day'))), 0)
      ))
  END
$$;

CREATE OR REPLACE FUNCTION public.sell_stock(p_position_id uuid, p_amount numeric, p_transaction_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_position public.user_stock_positions%ROWTYPE;
  v_stock public.stocks%ROWTYPE;
  v_balance public.account_balances%ROWTYPE;
  v_price numeric;
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Current stock value is unavailable'; END IF;

  v_price := public.position_effective_price(
    v_position.purchase_price, v_position.target_price,
    v_position.growth_start_at, v_position.target_date, v_stock.current_price);
  IF v_price IS NULL OR v_price <= 0 THEN RAISE EXCEPTION 'Current stock value is unavailable'; END IF;

  v_current_value := v_position.shares * v_price;
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
        current_value = v_remaining_shares * v_price,
        remaining_value = v_remaining_shares * v_price,
        amount_sold = amount_sold + v_sell_amount,
        sale_price = v_price,
        sale_date = now(),
        sale_transaction_id = v_transaction_id::text,
        status = CASE WHEN v_remaining_shares <= 0.00000001 THEN 'FULLY_SOLD' ELSE 'PARTIALLY_SOLD' END
    WHERE id = v_position.id;

  INSERT INTO public.transactions (id, user_id, type, amount, note)
  VALUES (v_transaction_id, v_user_id, 'STOCK_SELL'::public.txn_type, v_sell_amount, 'Stock sale reference: ' || p_transaction_id || ' · ' || v_stock.company_name || ' (' || v_stock.symbol || ')');

  RETURN jsonb_build_object('position_id', v_position.id, 'sale_transaction_id', v_transaction_id, 'sold_amount', v_sell_amount, 'sale_price', v_price, 'shares_sold', v_sell_shares, 'remaining_shares', v_remaining_shares, 'remaining_value', v_remaining_shares * v_price, 'stock_name', v_stock.company_name, 'symbol', v_stock.symbol, 'currency', v_stock.currency);
END;
$function$;