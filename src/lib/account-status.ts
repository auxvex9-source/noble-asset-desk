export const ACCOUNT_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "CONTACT_SUPPORT",
  "TAX_PAYMENT_PROOF",
  "INSURANCE_FEE_REQUIRED",
  "INACTIVE",
  "ACCOUNT_UPGRADE",
  "KYC_REQUIRED",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

type Meta = {
  label: string;
  tone: "success" | "warning" | "danger";
  message: string;
};

export const STATUS_META: Record<string, Meta> = {
  ACTIVE: {
    label: "Active",
    tone: "success",
    message: "Your account is active. Trading, deposits and withdrawals are fully enabled.",
  },
  SUSPENDED: {
    label: "Suspended",
    tone: "danger",
    message:
      "Your account has been suspended by compliance. Trading and withdrawals are disabled. Contact support to review the suspension and restore access.",
  },
  CONTACT_SUPPORT: {
    label: "Contact Support",
    tone: "warning",
    message:
      "Our team needs to speak with you before your account can continue. Please contact support at support@reconfinance.com to resolve this.",
  },
  TAX_PAYMENT_PROOF: {
    label: "Tax Payment Proof Required",
    tone: "warning",
    message:
      "Withdrawals are on hold until proof of tax payment is submitted. Upload your tax clearance receipt via support, then your account will be released within 24 hours.",
  },
  INSURANCE_FEE_REQUIRED: {
    label: "Trading & Loss Insurance Fee Required",
    tone: "warning",
    message:
      "A trading and loss insurance fee is outstanding on your portfolio. Settle the insurance fee to re-enable position management and withdrawals.",
  },
  INACTIVE: {
    label: "Account Inactive",
    tone: "danger",
    message:
      "Your account is currently inactive due to prolonged dormancy. Contact support to reactivate and restore your trading privileges.",
  },
  ACCOUNT_UPGRADE: {
    label: "Account Upgrade Required",
    tone: "warning",
    message:
      "Your current tier limits have been reached. Upgrade your account tier to continue trading at your present volume.",
  },
  KYC_REQUIRED: {
    label: "Complete KYC Verification",
    tone: "warning",
    message:
      "Identity verification is incomplete. Submit a government-issued ID and proof of address to unlock full account functionality.",
  },
  PENDING_APPROVAL: {
    label: "Pending Review",
    tone: "warning",
    message: "Your account is under review by our compliance desk.",
  },
  DECLINED: {
    label: "Declined",
    tone: "danger",
    message: "Your registration was declined. Please contact support for details.",
  },
};

export function statusMeta(status?: string | null): Meta {
  return STATUS_META[status ?? "ACTIVE"] ?? STATUS_META["ACTIVE"]!;
}

export const TONE_CLASSES: Record<Meta["tone"], string> = {
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
};
