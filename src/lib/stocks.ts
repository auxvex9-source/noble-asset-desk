export type Stock = {
  id: string;
  company_name: string;
  symbol: string;
  country: string;
  market: string;
  currency: string;
  current_price: number;
  price_change: number;
  percentage_change: number;
  status: string;
};

export type Position = {
  id: string;
  user_id: string;
  stock_id: string;
  shares: number;
  purchase_price: number;
  amount_invested: number;
  current_value: number;
  remaining_value: number;
  amount_sold: number;
  target_price: number | null;
  target_date: string | null;
  sale_price: number | null;
  sale_date: string | null;
  sale_transaction_id: string | null;
  growth_start_at: string | null;
  status: string;
  transaction_id: string;
  purchased_at: string;
};

/**
 * Effective per-share value of a position.
 * When an administrator has scheduled a target value and date, the value grows
 * steadily from the purchase price to the target across that period.
 * Otherwise the live catalog price is used.
 */
export function effectivePrice(
  p: Pick<Position, "purchase_price" | "target_price" | "target_date" | "growth_start_at">,
  marketPrice: number,
) {
  const target = p.target_price ?? 0;
  if (!p.target_date || target <= 0) return marketPrice || p.purchase_price;
  const end = new Date(p.target_date).getTime();
  const start = p.growth_start_at
    ? new Date(p.growth_start_at).getTime()
    : end - 86400000;
  const now = Date.now();
  if (now >= end) return target;
  const span = end - start;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (now - start) / span)) : 0;
  return p.purchase_price + (target - p.purchase_price) * ratio;
}

export const POSITION_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PARTIALLY_SOLD: "Partially sold",
  FULLY_SOLD: "Fully sold",
};

export function positionStatusLabel(status: string) {
  return POSITION_STATUS_LABEL[status] ?? status;
}

export function newTransactionRef(prefix = "RF") {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export function formatShares(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export const STOCK_SELECT =
  "id, company_name, symbol, country, market, currency, current_price, price_change, percentage_change, status";

export type StockChannel = {
  id: string;
  user_id: string;
  stock_id: string;
  direction: "RISE" | "FALL" | string;
  start_price: number;
  target_price: number;
  start_at: string;
  end_at: string;
  paused: boolean;
  resume_target: number | null;
};

export const STOCK_CHANNEL_SELECT =
  "id, user_id, stock_id, direction, start_price, target_price, start_at, end_at, paused, resume_target";

export function numericChannel(c: Record<string, unknown>): StockChannel {
  return {
    ...(c as unknown as StockChannel),
    start_price: Number(c["start_price"]),
    target_price: Number(c["target_price"]),
    resume_target: c["resume_target"] == null ? null : Number(c["resume_target"]),
  };
}

/** Price the channel projects right now; falls back to the live market price. */
export function channelPrice(c: StockChannel | undefined, marketPrice: number) {
  if (!c) return marketPrice;
  const start = new Date(c.start_at).getTime();
  const end = new Date(c.end_at).getTime();
  const now = Date.now();
  if (now >= end) return c.target_price;
  if (now <= start) return c.start_price;
  const ratio = end > start ? (now - start) / (end - start) : 0;
  return c.start_price + (c.target_price - c.start_price) * ratio;
}

export const POSITION_SELECT =
  "id, user_id, stock_id, shares, purchase_price, amount_invested, current_value, remaining_value, amount_sold, target_price, target_date, sale_price, sale_date, sale_transaction_id, growth_start_at, status, transaction_id, purchased_at";
