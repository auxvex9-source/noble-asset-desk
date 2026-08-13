CREATE TYPE public.withdrawal_status AS ENUM ('PENDING','APPROVED','REJECTED');
CREATE TYPE public.withdrawal_method AS ENUM ('BANK','CRYPTO');

CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method public.withdrawal_method NOT NULL DEFAULT 'BANK',
  crypto_key text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  status public.withdrawal_status NOT NULL DEFAULT 'PENDING',
  admin_reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT UPDATE, DELETE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals" ON public.withdrawal_requests
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Users create own pending withdrawals" ON public.withdrawal_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'PENDING'::public.withdrawal_status AND amount > 0);

CREATE POLICY "Admins update withdrawals" ON public.withdrawal_requests
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins delete withdrawals" ON public.withdrawal_requests
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER withdrawal_requests_touch
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.withdrawal_hold_funds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avail numeric;
BEGIN
  SELECT balance INTO avail FROM public.account_balances WHERE user_id = NEW.user_id;
  IF avail IS NULL THEN
    INSERT INTO public.account_balances (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    avail := 0;
  END IF;
  IF NEW.amount > avail THEN
    RAISE EXCEPTION 'Amount exceeds available balance';
  END IF;
  UPDATE public.account_balances
     SET balance = balance - NEW.amount,
         equity = GREATEST(equity - NEW.amount, 0)
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER withdrawal_requests_hold
AFTER INSERT ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.withdrawal_hold_funds();

CREATE OR REPLACE FUNCTION public.withdrawal_settle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'REJECTED'::public.withdrawal_status
     AND OLD.status <> 'REJECTED'::public.withdrawal_status THEN
    UPDATE public.account_balances
       SET balance = balance + OLD.amount,
           equity = equity + OLD.amount
     WHERE user_id = NEW.user_id;
  ELSIF OLD.status = 'REJECTED'::public.withdrawal_status
        AND NEW.status <> 'REJECTED'::public.withdrawal_status THEN
    UPDATE public.account_balances
       SET balance = balance - OLD.amount,
           equity = GREATEST(equity - OLD.amount, 0)
     WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER withdrawal_requests_settle
AFTER UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.withdrawal_settle();

CREATE TABLE public.nft_charts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Recon Genesis',
  collection text NOT NULL DEFAULT 'Recon Vault',
  floor_price numeric NOT NULL DEFAULT 0,
  change_pct numeric NOT NULL DEFAULT 0,
  volume numeric NOT NULL DEFAULT 0,
  holders integer NOT NULL DEFAULT 0,
  accent text NOT NULL DEFAULT 'gold',
  seed integer NOT NULL DEFAULT 42,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nft_charts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nft_charts TO authenticated;
GRANT ALL ON public.nft_charts TO service_role;

ALTER TABLE public.nft_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own nft chart" ON public.nft_charts
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins insert nft charts" ON public.nft_charts
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins update nft charts" ON public.nft_charts
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins delete nft charts" ON public.nft_charts
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER nft_charts_touch
BEFORE UPDATE ON public.nft_charts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();