DROP FUNCTION IF EXISTS public.set_stock_channel(uuid, uuid, text, numeric, integer);
DROP FUNCTION IF EXISTS public.set_forex_schedule(uuid, uuid, text, numeric, integer);

CREATE OR REPLACE FUNCTION public.set_stock_channel(p_user_id uuid, p_stock_id uuid, p_direction text, p_target_price numeric, p_duration_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stock public.stocks%ROWTYPE;
  v_start numeric;
  v_end_at timestamptz;
  v_control public.stock_user_controls%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_stock_id IS NULL THEN RAISE EXCEPTION 'Client and stock are required'; END IF;
  IF p_direction NOT IN ('RISE', 'FALL') THEN RAISE EXCEPTION 'Choose Rise or Fall'; END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > 5256000 THEN RAISE EXCEPTION 'Duration must be between 1 minute and 3650 days'; END IF;
  IF p_target_price IS NULL OR p_target_price <= 0 THEN RAISE EXCEPTION 'Enter a target price greater than zero'; END IF;
  SELECT * INTO v_stock FROM public.stocks WHERE id = p_stock_id AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock is unavailable'; END IF;
  v_start := v_stock.current_price;
  IF p_direction = 'RISE' AND p_target_price <= v_start THEN RAISE EXCEPTION 'A rising target must be above the current price'; END IF;
  IF p_direction = 'FALL' AND p_target_price >= v_start THEN RAISE EXCEPTION 'A falling target must be below the current price'; END IF;
  v_end_at := now() + make_interval(mins => p_duration_minutes);
  INSERT INTO public.stock_user_controls (user_id, stock_id, direction, start_price, target_price, start_at, end_at, enabled, paused, resume_target, remaining_seconds)
  VALUES (p_user_id, p_stock_id, p_direction, v_start, p_target_price, now(), v_end_at, true, false, NULL, NULL)
  ON CONFLICT (user_id, stock_id) DO UPDATE SET direction = EXCLUDED.direction, start_price = EXCLUDED.start_price, target_price = EXCLUDED.target_price, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, enabled = true, paused = false, resume_target = NULL, remaining_seconds = NULL, updated_at = now()
  RETURNING * INTO v_control;
  UPDATE public.user_stock_positions
    SET target_price = v_control.target_price,
        target_date = v_control.end_at,
        growth_start_at = v_control.start_at,
        updated_at = now()
    WHERE user_id = p_user_id AND stock_id = p_stock_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('user_id', p_user_id, 'stock_id', p_stock_id, 'direction', v_control.direction, 'start_price', v_control.start_price, 'target_price', v_control.target_price, 'start_at', v_control.start_at, 'end_at', v_control.end_at, 'paused', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_forex_schedule(p_user_id uuid, p_pair_id uuid, p_direction text, p_target_rate numeric, p_duration_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pair public.forex_pairs%ROWTYPE;
  v_start_rate numeric;
  v_end_at timestamptz;
  v_control public.forex_user_controls%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_pair_id IS NULL THEN RAISE EXCEPTION 'Client and pair are required'; END IF;
  IF p_direction NOT IN ('RISE', 'FALL') THEN RAISE EXCEPTION 'Choose Rise or Fall'; END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > 5256000 THEN RAISE EXCEPTION 'Duration must be between 1 minute and 3650 days'; END IF;
  IF p_target_rate IS NULL OR p_target_rate <= 0 THEN RAISE EXCEPTION 'Enter a target rate greater than zero'; END IF;
  SELECT * INTO v_pair FROM public.forex_pairs WHERE id = p_pair_id AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Forex pair is unavailable'; END IF;
  v_start_rate := v_pair.current_rate;
  IF p_direction = 'RISE' AND p_target_rate <= v_start_rate THEN RAISE EXCEPTION 'A rising target must be above the current rate'; END IF;
  IF p_direction = 'FALL' AND p_target_rate >= v_start_rate THEN RAISE EXCEPTION 'A falling target must be below the current rate'; END IF;
  v_end_at := now() + make_interval(mins => p_duration_minutes);
  INSERT INTO public.forex_user_controls (user_id, pair_id, direction, start_rate, target_rate, start_at, end_at, enabled, paused, resume_target, remaining_seconds)
  VALUES (p_user_id, p_pair_id, p_direction, v_start_rate, p_target_rate, now(), v_end_at, true, false, NULL, NULL)
  ON CONFLICT (user_id, pair_id) DO UPDATE SET direction = EXCLUDED.direction, start_rate = EXCLUDED.start_rate, target_rate = EXCLUDED.target_rate, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, enabled = true, paused = false, resume_target = NULL, remaining_seconds = NULL, updated_at = now()
  RETURNING * INTO v_control;
  UPDATE public.user_forex_positions
    SET forecast_direction = v_control.direction,
        forecast_start_rate = v_control.start_rate,
        forecast_target_rate = v_control.target_rate,
        forecast_start_at = v_control.start_at,
        forecast_end_at = v_control.end_at,
        updated_at = now()
    WHERE user_id = p_user_id AND pair_id = p_pair_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('user_id', p_user_id, 'pair_id', p_pair_id, 'direction', v_control.direction, 'start_rate', v_control.start_rate, 'target_rate', v_control.target_rate, 'start_at', v_control.start_at, 'end_at', v_control.end_at, 'paused', false);
END;
$function$;