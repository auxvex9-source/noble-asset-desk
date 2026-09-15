REVOKE ALL ON FUNCTION public.set_stock_channel(uuid, uuid, text, numeric, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_forex_schedule(uuid, uuid, text, numeric, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_stock_channel(uuid, uuid, text, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_forex_schedule(uuid, uuid, text, numeric, integer) TO service_role;