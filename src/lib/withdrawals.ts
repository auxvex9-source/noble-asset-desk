export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED";

export const WITHDRAWAL_META: Record<
  WithdrawalStatus,
  { label: string; classes: string }
> = {
  PENDING: {
    label: "Pending review",
    classes: "border-primary/40 bg-primary/10 text-primary",
  },
  APPROVED: {
    label: "Approved",
    classes: "border-success/40 bg-success/10 text-success",
  },
  REJECTED: {
    label: "Rejected",
    classes: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};

export function withdrawalMeta(status: string | null | undefined) {
  return WITHDRAWAL_META[(status as WithdrawalStatus) ?? "PENDING"] ?? WITHDRAWAL_META.PENDING;
}

export type WithdrawalRequest = {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  crypto_key: string;
  destination: string;
  status: string;
  admin_reason: string;
  created_at: string;
};
