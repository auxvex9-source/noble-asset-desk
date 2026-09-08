export const TXN_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "TRADE_WON",
  "TRADE_LOST",
  "STOCK_PURCHASE",
  "STOCK_SELL",
] as const;

export type TxnType = (typeof TXN_TYPES)[number];

export const TXN_META: Record<TxnType, { label: string; tone: "success" | "danger" | "neutral" }> = {
  DEPOSIT: { label: "Deposit", tone: "success" },
  WITHDRAWAL: { label: "Withdrawal", tone: "neutral" },
  TRADE_WON: { label: "Trade won", tone: "success" },
  TRADE_LOST: { label: "Trade lost", tone: "danger" },
  STOCK_PURCHASE: { label: "Stock purchase", tone: "danger" },
  STOCK_SELL: { label: "Stock sale", tone: "success" },
};

export function txnMeta(type: string | null | undefined) {
  return TXN_META[(type as TxnType) ?? "DEPOSIT"] ?? TXN_META.DEPOSIT;
}

export type CryptoOption = {
  key: string;
  name: string;
  network: string;
  address: string;
  memo?: string;
};

export const CRYPTO_OPTIONS: CryptoOption[] = [
  {
    key: "bnb",
    name: "BNB",
    network: "BNB Smart Chain (BEP-20)",
    address: "0x68787F09238c51FCC8f74459BBE18EA8bcb2F7Bd",
  },
  {
    key: "solana",
    name: "Solana",
    network: "Solana",
    address: "9yjWuX3JcmaqeYY7AqWPp5z5WYzSK4z1A8fV1fUritnC",
  },
  {
    key: "polygon",
    name: "Polygon",
    network: "Polygon",
    address: "0x68787F09238c51FCC8f74459BBE18EA8bcb2F7Bd",
  },
  {
    key: "btc",
    name: "Bitcoin",
    network: "Bitcoin",
    address: "bc1qd6agj73lakymg0hpwts8rj0vx3yxmmuzm30tay",
  },
  {
    key: "ethereum",
    name: "Ethereum (ETH)",
    network: "Ethereum (ERC-20)",
    address: "0x68787F09238c51FCC8f74459BBE18EA8bcb2F7Bd",
  },
];
