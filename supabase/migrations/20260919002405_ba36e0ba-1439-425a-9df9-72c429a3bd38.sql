CREATE OR REPLACE FUNCTION public.pause_forex_schedule(p_user_id uuid, p_pair_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_control public.forex_user_controls%ROWTYPE;
  v_rate numeric;
  v_remaining numeric;
  v_end timestamptz;
BEGIN
  SELECT * INTO v_control FROM public.forex_user_controls WHERE user_id = p_user_id AND pair_id = p_pair_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No scenario found for this client and pair'; END IF;
  IF v_control.paused THEN RETURN jsonb_build_object('paused', true, 'rate', v_control.target_rate); END IF;
  v_rate := public.forex_effective_rate(v_control.target_rate, v_control.start_rate, v_control.target_rate, v_control.start_at, v_control.end_at);
  v_remaining := GREATEST(0, EXTRACT(EPOCH FROM (v_control.end_at - now())));
  v_end := now() + interval '1 second';
  UPDATE public.forex_user_controls
    SET paused = true,
        resume_target = COALESCE(resume_target, v_control.target_rate),
        remaining_seconds = v_remaining,
        start_rate = v_rate,
        target_rate = v_rate,
        start_at = now(),
        end_at = v_end,
        updated_at = now()
    WHERE id = v_control.id;
  UPDATE public.user_forex_positions
    SET forecast_start_rate = v_rate,
        forecast_target_rate = v_rate,
        forecast_start_at = now(),
        forecast_end_at = v_end,
        updated_at = now()
    WHERE user_id = p_user_id AND pair_id = p_pair_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('paused', true, 'rate', v_rate, 'remaining_seconds', v_remaining);
END;
$function$;

CREATE OR REPLACE FUNCTION public.pause_stock_channel(p_user_id uuid, p_stock_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_control public.stock_user_controls%ROWTYPE;
  v_price numeric;
  v_remaining numeric;
  v_ratio numeric;
  v_end timestamptz;
BEGIN
  SELECT * INTO v_control FROM public.stock_user_controls WHERE user_id = p_user_id AND stock_id = p_stock_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No scenario found for this client and stock'; END IF;
  IF v_control.paused THEN RETURN jsonb_build_object('paused', true, 'price', v_control.target_price); END IF;
  IF now() >= v_control.end_at THEN
    v_price := v_control.target_price;
  ELSIF now() <= v_control.start_at THEN
    v_price := v_control.start_price;
  ELSE
    v_ratio := EXTRACT(EPOCH FROM (now() - v_control.start_at)) / GREATEST(1, EXTRACT(EPOCH FROM (v_control.end_at - v_control.start_at)));
    v_price := v_control.start_price + (v_control.target_price - v_control.start_price) * v_ratio;
  END IF;
  v_remaining := GREATEST(0, EXTRACT(EPOCH FROM (v_control.end_at - now())));
  v_end := now() + interval '1 second';
  UPDATE public.stock_user_controls
    SET paused = true,
        resume_target = COALESCE(resume_target, v_control.target_price),
        remaining_seconds = v_remaining,
        start_price = v_price,
        target_price = v_price,
        start_at = now(),
        end_at = v_end,
        updated_at = now()
    WHERE id = v_control.id;
  UPDATE public.user_stock_positions
    SET target_price = v_price,
        target_date = v_end,
        growth_start_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id AND stock_id = p_stock_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('paused', true, 'price', v_price, 'remaining_seconds', v_remaining);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.pause_forex_schedule(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pause_stock_channel(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pause_forex_schedule(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pause_stock_channel(uuid, uuid) TO service_role;