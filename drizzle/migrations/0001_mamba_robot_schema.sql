CREATE TABLE public.mamba_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  rank integer NOT NULL UNIQUE CHECK (rank BETWEEN 1 AND 50),
  price_usd numeric(12,2) NOT NULL CHECK (price_usd > 0),
  daily_trade_allowance integer NOT NULL CHECK (daily_trade_allowance BETWEEN 1 AND 100),
  max_daily_trading_usd numeric(14,2),
  supported_assets text[] NOT NULL DEFAULT ARRAY['Stocks']::text[],
  strategy_level text NOT NULL DEFAULT 'Core',
  risk_features text[] NOT NULL DEFAULT ARRAY[]::text[],
  feature_summary text[] NOT NULL DEFAULT ARRAY[]::text[],
  priority_execution boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mamba_packages TO authenticated;
GRANT ALL ON public.mamba_packages TO service_role;
ALTER TABLE public.mamba_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view active Mamba packages"
  ON public.mamba_packages FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.mamba_annual_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.mamba_packages(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED_AWAITING_PAYMENT', 'PAID', 'DECLINED')),
  annual_price_usd numeric(12,2) CHECK (annual_price_usd IS NULL OR annual_price_usd > 0),
  admin_reason text NOT NULL DEFAULT '',
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mamba_annual_requests TO authenticated;
GRANT ALL ON public.mamba_annual_requests TO service_role;
ALTER TABLE public.mamba_annual_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users and admins can view Mamba annual requests"
  ON public.mamba_annual_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX mamba_annual_requests_status_created_idx
  ON public.mamba_annual_requests (status, created_at DESC);
CREATE UNIQUE INDEX mamba_one_open_annual_request_per_user
  ON public.mamba_annual_requests (user_id)
  WHERE status IN ('PENDING', 'APPROVED_AWAITING_PAYMENT');

CREATE TABLE public.mamba_exchange_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.mamba_packages(id),
  annual_request_id uuid REFERENCES public.mamba_annual_requests(id),
  quote_type text NOT NULL DEFAULT 'MONTHLY' CHECK (quote_type IN ('MONTHLY', 'ANNUAL')),
  price_usd numeric(12,2) NOT NULL CHECK (price_usd > 0),
  wallet_currency text NOT NULL CHECK (wallet_currency ~ '^[A-Z]{3}$'),
  exchange_rate numeric(20,10) NOT NULL CHECK (exchange_rate > 0),
  wallet_amount numeric(16,2) NOT NULL CHECK (wallet_amount > 0),
  rate_date date NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((quote_type = 'MONTHLY' AND annual_request_id IS NULL) OR (quote_type = 'ANNUAL' AND annual_request_id IS NOT NULL))
);
GRANT SELECT ON public.mamba_exchange_quotes TO authenticated;
GRANT ALL ON public.mamba_exchange_quotes TO service_role;
ALTER TABLE public.mamba_exchange_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own Mamba exchange quotes"
  ON public.mamba_exchange_quotes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX mamba_exchange_quotes_user_created_idx
  ON public.mamba_exchange_quotes (user_id, created_at DESC);

CREATE TABLE public.mamba_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.mamba_packages(id),
  package_name_snapshot text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED')),
  term text NOT NULL CHECK (term IN ('MONTHLY', 'ANNUAL')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  price_usd_snapshot numeric(12,2) NOT NULL CHECK (price_usd_snapshot > 0),
  daily_trade_allowance integer NOT NULL CHECK (daily_trade_allowance BETWEEN 1 AND 100),
  wallet_currency text NOT NULL CHECK (wallet_currency ~ '^[A-Z]{3}$'),
  exchange_rate numeric(20,10) NOT NULL CHECK (exchange_rate > 0),
  charged_amount numeric(16,2) NOT NULL CHECK (charged_amount > 0),
  rate_date date NOT NULL,
  purchase_quote_id uuid NOT NULL UNIQUE REFERENCES public.mamba_exchange_quotes(id),
  annual_request_id uuid REFERENCES public.mamba_annual_requests(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at)
);
GRANT SELECT ON public.mamba_subscriptions TO authenticated;
GRANT ALL ON public.mamba_subscriptions TO service_role;
ALTER TABLE public.mamba_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users and admins can view Mamba subscriptions"
  ON public.mamba_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX mamba_subscriptions_user_created_idx
  ON public.mamba_subscriptions (user_id, created_at DESC);
CREATE INDEX mamba_subscriptions_status_expiry_idx
  ON public.mamba_subscriptions (status, expires_at);
CREATE UNIQUE INDEX mamba_one_current_mamba_subscription_per_user
  ON public.mamba_subscriptions (user_id)
  WHERE status IN ('ACTIVE', 'SUSPENDED');

CREATE TABLE public.mamba_robot_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  subscriptions_enabled boolean NOT NULL DEFAULT false,
  execution_enabled boolean NOT NULL DEFAULT false,
  globally_paused boolean NOT NULL DEFAULT true,
  execution_provider_name text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mamba_robot_settings TO authenticated;
GRANT ALL ON public.mamba_robot_settings TO service_role;
ALTER TABLE public.mamba_robot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view Mamba availability"
  ON public.mamba_robot_settings FOR SELECT TO authenticated
  USING (true);

CREATE TABLE public.mamba_trade_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid NOT NULL REFERENCES public.mamba_subscriptions(id),
  provider_trade_id text UNIQUE,
  asset_symbol text NOT NULL,
  asset_category text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  opened_at timestamptz,
  closed_at timestamptz,
  opening_price numeric(20,8),
  closing_price numeric(20,8),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  status text NOT NULL CHECK (status IN ('PENDING', 'EXECUTING', 'COMPLETED', 'CANCELLED', 'FAILED')),
  result_amount numeric(16,2),
  fees numeric(16,2),
  provider_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mamba_trade_records TO authenticated;
GRANT ALL ON public.mamba_trade_records TO service_role;
ALTER TABLE public.mamba_trade_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users and admins can view Mamba trade records"
  ON public.mamba_trade_records FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX mamba_trade_records_user_created_idx
  ON public.mamba_trade_records (user_id, created_at DESC);
CREATE INDEX mamba_trade_records_status_created_idx
  ON public.mamba_trade_records (status, created_at DESC);

CREATE TABLE public.mamba_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid,
  subscription_id uuid REFERENCES public.mamba_subscriptions(id),
  action text NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mamba_admin_audit TO authenticated;
GRANT ALL ON public.mamba_admin_audit TO service_role;
ALTER TABLE public.mamba_admin_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view Mamba admin audit"
  ON public.mamba_admin_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX mamba_admin_audit_created_idx
  ON public.mamba_admin_audit (created_at DESC);
