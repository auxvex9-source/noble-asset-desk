ALTER TABLE public.nft_charts
  ADD COLUMN IF NOT EXISTS asset text NOT NULL DEFAULT 'BTC',
  ADD COLUMN IF NOT EXISTS live_status text NOT NULL DEFAULT 'IDLE',
  ADD COLUMN IF NOT EXISTS start_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS frozen_value numeric;