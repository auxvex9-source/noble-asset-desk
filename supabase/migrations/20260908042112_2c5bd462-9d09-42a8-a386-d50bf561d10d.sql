REVOKE ALL ON FUNCTION public.buy_forex(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sell_forex(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_forex_schedule(uuid, uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.forex_effective_rate(numeric, numeric, numeric, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_forex(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_forex(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_forex_schedule(uuid, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.forex_effective_rate(numeric, numeric, numeric, timestamptz, timestamptz) TO authenticated;