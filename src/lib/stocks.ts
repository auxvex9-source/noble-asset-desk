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
  status: string;
  transaction_id: string;
  purchased_at: string;
};

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

export const POSITION_SELECT =
  "id, user_id, stock_id, shares, purchase_price, amount_invested, current_value, remaining_value, amount_sold, target_price, target_date, sale_price, sale_date, sale_transaction_id, status, transaction_id, purchased_at";
