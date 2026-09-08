ALTER TABLE public.forex_user_controls
  ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resume_target numeric,
  ADD COLUMN IF NOT EXISTS remaining_seconds numeric;

DROP FUNCTION IF EXISTS public.set_forex_schedule(uuid, uuid, text, integer);

CREATE OR REPLACE FUNCTION public.set_forex_schedule(p_user_id uuid, p_pair_id uuid, p_direction text, p_target_rate numeric, p_duration_days integer)
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
  IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 3650 THEN RAISE EXCEPTION 'Duration must be between 1 and 3650 days'; END IF;
  IF p_target_rate IS NULL OR p_target_rate <= 0 THEN RAISE EXCEPTION 'Enter a target rate greater than zero'; END IF;
  SELECT * INTO v_pair FROM public.forex_pairs WHERE id = p_pair_id AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Forex pair is unavailable'; END IF;
  v_start_rate := v_pair.current_rate;
  IF p_direction = 'RISE' AND p_target_rate <= v_start_rate THEN RAISE EXCEPTION 'A rising target must be above the current rate'; END IF;
  IF p_direction = 'FALL' AND p_target_rate >= v_start_rate THEN RAISE EXCEPTION 'A falling target must be below the current rate'; END IF;
  v_end_at := now() + make_interval(days => p_duration_days);
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
BEGIN
  SELECT * INTO v_control FROM public.forex_user_controls WHERE user_id = p_user_id AND pair_id = p_pair_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No scenario found for this client and pair'; END IF;
  IF v_control.paused THEN RETURN jsonb_build_object('paused', true, 'rate', v_control.target_rate); END IF;
  v_rate := public.forex_effective_rate(v_control.target_rate, v_control.start_rate, v_control.target_rate, v_control.start_at, v_control.end_at);
  v_remaining := GREATEST(0, EXTRACT(EPOCH FROM (v_control.end_at - now())));
  UPDATE public.forex_user_controls
    SET paused = true,
        resume_target = COALESCE(resume_target, v_control.target_rate),
        remaining_seconds = v_remaining,
        start_rate = v_rate,
        target_rate = v_rate,
        start_at = now(),
        end_at = now(),
        updated_at = now()
    WHERE id = v_control.id;
  UPDATE public.user_forex_positions
    SET forecast_start_rate = v_rate,
        forecast_target_rate = v_rate,
        forecast_start_at = now(),
        forecast_end_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id AND pair_id = p_pair_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('paused', true, 'rate', v_rate, 'remaining_seconds', v_remaining);
END;
$function$;

CREATE OR REPLACE FUNCTION public.resume_forex_schedule(p_user_id uuid, p_pair_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_control public.forex_user_controls%ROWTYPE;
  v_target numeric;
  v_seconds numeric;
  v_end timestamptz;
BEGIN
  SELECT * INTO v_control FROM public.forex_user_controls WHERE user_id = p_user_id AND pair_id = p_pair_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No scenario found for this client and pair'; END IF;
  IF NOT v_control.paused THEN RETURN jsonb_build_object('paused', false); END IF;
  v_target := COALESCE(v_control.resume_target, v_control.target_rate);
  v_seconds := GREATEST(3600, COALESCE(v_control.remaining_seconds, 86400));
  v_end := now() + make_interval(secs => v_seconds);
  UPDATE public.forex_user_controls
    SET paused = false,
        target_rate = v_target,
        start_rate = v_control.start_rate,
        start_at = now(),
        end_at = v_end,
        resume_target = NULL,
        remaining_seconds = NULL,
        updated_at = now()
    WHERE id = v_control.id;
  UPDATE public.user_forex_positions
    SET forecast_target_rate = v_target,
        forecast_start_rate = v_control.start_rate,
        forecast_start_at = now(),
        forecast_end_at = v_end,
        updated_at = now()
    WHERE user_id = p_user_id AND pair_id = p_pair_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('paused', false, 'target_rate', v_target, 'end_at', v_end);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_forex_schedule(p_user_id uuid, p_pair_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.forex_user_controls WHERE user_id = p_user_id AND pair_id = p_pair_id;
  UPDATE public.user_forex_positions
    SET forecast_direction = NULL,
        forecast_start_rate = NULL,
        forecast_target_rate = NULL,
        forecast_start_at = NULL,
        forecast_end_at = NULL,
        updated_at = now()
    WHERE user_id = p_user_id AND pair_id = p_pair_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('deleted', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_forex_schedule(uuid, uuid, text, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pause_forex_schedule(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resume_forex_schedule(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_forex_schedule(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_forex_schedule(uuid, uuid, text, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.pause_forex_schedule(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resume_forex_schedule(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_forex_schedule(uuid, uuid) TO service_role;