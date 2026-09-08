export type ForexPair = {
  id: string;
  pair: string;
  base_currency: string;
  quote_currency: string;
  current_rate: number;
  change_pct: number;
  status: string;
};

export type ForexPosition = {
  id: string;
  user_id: string;
  pair_id: string;
  units: number;
  entry_rate: number;
  amount_invested: number;
  current_value: number;
  remaining_units: number;
  amount_sold: number;
  status: string;
  transaction_id: string;
  purchased_at: string;
  forecast_direction: string | null;
  forecast_start_rate: number | null;
  forecast_target_rate: number | null;
  forecast_start_at: string | null;
  forecast_end_at: string | null;
};

export const FOREX_PAIR_SELECT =
  "id, pair, base_currency, quote_currency, current_rate, change_pct, status";

export const FOREX_POSITION_SELECT =
  "id, user_id, pair_id, units, entry_rate, amount_invested, current_value, remaining_units, amount_sold, status, transaction_id, purchased_at, forecast_direction, forecast_start_rate, forecast_target_rate, forecast_start_at, forecast_end_at";

/**
 * Rate a position is currently valued at. When an administrator has set a
 * rise/fall scenario the rate moves steadily from the start rate to the
 * target rate across the scheduled window; otherwise the market rate is used.
 */
export function effectiveRate(
  p: Pick<
    ForexPosition,
    "forecast_start_rate" | "forecast_target_rate" | "forecast_start_at" | "forecast_end_at"
  >,
  marketRate: number,
) {
  const start = p.forecast_start_rate;
  const target = p.forecast_target_rate;
  if (start == null || target == null || !p.forecast_start_at || !p.forecast_end_at) {
    return marketRate;
  }
  const startAt = new Date(p.forecast_start_at).getTime();
  const endAt = new Date(p.forecast_end_at).getTime();
  const now = Date.now();
  if (now >= endAt) return target;
  if (now <= startAt) return start;
  const span = endAt - startAt;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (now - startAt) / span)) : 0;
  return start + (target - start) * ratio;
}

export function formatRate(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

export function formatUnits(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function numericPair(p: Record<string, unknown>): ForexPair {
  return {
    ...(p as unknown as ForexPair),
    current_rate: Number(p["current_rate"]),
    change_pct: Number(p["change_pct"]),
  };
}

export function numericForexPosition(p: Record<string, unknown>): ForexPosition {
  return {
    ...(p as unknown as ForexPosition),
    units: Number(p["units"]),
    entry_rate: Number(p["entry_rate"]),
    amount_invested: Number(p["amount_invested"]),
    current_value: Number(p["current_value"]),
    remaining_units: Number(p["remaining_units"]),
    amount_sold: Number(p["amount_sold"]),
    forecast_start_rate: p["forecast_start_rate"] == null ? null : Number(p["forecast_start_rate"]),
    forecast_target_rate:
      p["forecast_target_rate"] == null ? null : Number(p["forecast_target_rate"]),
  };
}
