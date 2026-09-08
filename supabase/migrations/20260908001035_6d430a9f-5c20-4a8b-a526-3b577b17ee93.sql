REVOKE ALL ON FUNCTION public.buy_stock(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sell_stock(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buy_stock(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sell_stock(uuid, numeric, text) TO service_role;