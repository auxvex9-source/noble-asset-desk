export const TXN_TYPES = ["DEPOSIT", "WITHDRAWAL", "TRADE_WON", "TRADE_LOST"] as const;

export type TxnType = (typeof TXN_TYPES)[number];

export const TXN_META: Record<TxnType, { label: string; tone: "success" | "danger" | "neutral" }> = {
  DEPOSIT: { label: "Deposit", tone: "success" },
  WITHDRAWAL: { label: "Withdrawal", tone: "neutral" },
  TRADE_WON: { label: "Trade won", tone: "success" },
  TRADE_LOST: { label: "Trade lost", tone: "danger" },
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
    key: "xrp",
    name: "XRP",
    network: "XRP Ledger",
    address: "rJn2zAPdFA193sixJwuFixRkYDUtx3apQh",
    memo: "501462955",
  },
  {
    key: "usdc",
    name: "USDC",
    network: "ERC-20",
    address: "0x56ea6ec4c073a9230e5a583af7eef99b26d96efa",
  },
  {
    key: "usdt",
    name: "USDT",
    network: "TRC-20",
    address: "TVTuawMhQsWejRfLHfKp7K9j16z2F2U8X4",
  },
  {
    key: "btc",
    name: "Bitcoin",
    network: "BTC",
    address: "1LhHbLasy7h9fqnFSwcJ8bt9MU7iWUx7Et",
  },
];
