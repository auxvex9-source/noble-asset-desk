CREATE TABLE IF NOT EXISTS public.stock_user_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  direction text NOT NULL,
  start_price numeric NOT NULL,
  target_price numeric NOT NULL,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  paused boolean NOT NULL DEFAULT false,
  resume_target numeric,
  remaining_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, stock_id)
);

GRANT SELECT ON public.stock_user_controls TO authenticated;
GRANT ALL ON public.stock_user_controls TO service_role;

ALTER TABLE public.stock_user_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own stock channels"
ON public.stock_user_controls FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER stock_user_controls_touch
BEFORE UPDATE ON public.stock_user_controls
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.set_stock_channel(p_user_id uuid, p_stock_id uuid, p_direction text, p_target_price numeric, p_duration_days integer)
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
  IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 3650 THEN RAISE EXCEPTION 'Duration must be between 1 and 3650 days'; END IF;
  IF p_target_price IS NULL OR p_target_price <= 0 THEN RAISE EXCEPTION 'Enter a target price greater than zero'; END IF;
  SELECT * INTO v_stock FROM public.stocks WHERE id = p_stock_id AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock is unavailable'; END IF;
  v_start := v_stock.current_price;
  IF p_direction = 'RISE' AND p_target_price <= v_start THEN RAISE EXCEPTION 'A rising target must be above the current price'; END IF;
  IF p_direction = 'FALL' AND p_target_price >= v_start THEN RAISE EXCEPTION 'A falling target must be below the current price'; END IF;
  v_end_at := now() + make_interval(days => p_duration_days);
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
  UPDATE public.stock_user_controls
    SET paused = true,
        resume_target = COALESCE(resume_target, v_control.target_price),
        remaining_seconds = v_remaining,
        start_price = v_price,
        target_price = v_price,
        start_at = now(),
        end_at = now(),
        updated_at = now()
    WHERE id = v_control.id;
  UPDATE public.user_stock_positions
    SET target_price = v_price,
        target_date = now(),
        growth_start_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id AND stock_id = p_stock_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('paused', true, 'price', v_price, 'remaining_seconds', v_remaining);
END;
$function$;

CREATE OR REPLACE FUNCTION public.resume_stock_channel(p_user_id uuid, p_stock_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_control public.stock_user_controls%ROWTYPE;
  v_target numeric;
  v_seconds numeric;
  v_end timestamptz;
BEGIN
  SELECT * INTO v_control FROM public.stock_user_controls WHERE user_id = p_user_id AND stock_id = p_stock_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No scenario found for this client and stock'; END IF;
  IF NOT v_control.paused THEN RETURN jsonb_build_object('paused', false); END IF;
  v_target := COALESCE(v_control.resume_target, v_control.target_price);
  v_seconds := GREATEST(3600, COALESCE(v_control.remaining_seconds, 86400));
  v_end := now() + make_interval(secs => v_seconds);
  UPDATE public.stock_user_controls
    SET paused = false,
        target_price = v_target,
        start_at = now(),
        end_at = v_end,
        resume_target = NULL,
        remaining_seconds = NULL,
        updated_at = now()
    WHERE id = v_control.id;
  UPDATE public.user_stock_positions
    SET target_price = v_target,
        target_date = v_end,
        growth_start_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id AND stock_id = p_stock_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('paused', false, 'target_price', v_target, 'end_at', v_end);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_stock_channel(p_user_id uuid, p_stock_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.stock_user_controls WHERE user_id = p_user_id AND stock_id = p_stock_id;
  UPDATE public.user_stock_positions
    SET target_price = NULL,
        target_date = NULL,
        growth_start_at = NULL,
        updated_at = now()
    WHERE user_id = p_user_id AND stock_id = p_stock_id AND status <> 'FULLY_SOLD';
  RETURN jsonb_build_object('deleted', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_stock_channel(uuid, uuid, text, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pause_stock_channel(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resume_stock_channel(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_stock_channel(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_stock_channel(uuid, uuid, text, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.pause_stock_channel(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resume_stock_channel(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_stock_channel(uuid, uuid) TO service_role;