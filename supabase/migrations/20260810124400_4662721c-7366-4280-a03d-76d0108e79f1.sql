ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'CONTACT_SUPPORT';
ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'TAX_PAYMENT_PROOF';
ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'INSURANCE_FEE_REQUIRED';
ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'INACTIVE';
ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'ACCOUNT_UPGRADE';
ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'KYC_REQUIRED';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'USD';
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'ACTIVE'::public.account_status;

UPDATE public.profiles SET status = 'ACTIVE'::public.account_status WHERE status = 'PENDING_APPROVAL'::public.account_status;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean := lower(COALESCE(NEW.email,'')) = 'admin@reconfinance.com';
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, country, username, currency_code, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.email,''),
    COALESCE(NEW.raw_user_meta_data->>'phone',''),
    COALESCE(NEW.raw_user_meta_data->>'country',''),
    COALESCE(NEW.raw_user_meta_data->>'username',''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'currency_code',''),'USD'),
    'ACTIVE'::public.account_status
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;