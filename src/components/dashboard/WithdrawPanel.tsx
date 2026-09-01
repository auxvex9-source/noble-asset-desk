import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpFromLine, Building2, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CRYPTO_OPTIONS } from "@/lib/transactions";
import { withdrawalMeta, type WithdrawalRequest } from "@/lib/withdrawals";

export function useMyWithdrawals() {
  return useQuery({
    queryKey: ["my-withdrawals"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as WithdrawalRequest[];
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("id, user_id, amount, method, crypto_key, destination, status, admin_reason, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as WithdrawalRequest[];
    },
  });
}

export function WithdrawPanel({
  currency,
  available,
  money,
}: {
  currency: string;
  available: number;
  money: (n: number) => string;
}) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<"BANK" | "CRYPTO">("BANK");
  const [coin, setCoin] = useState("");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: requests } = useMyWithdrawals();

  const selected = CRYPTO_OPTIONS.find((c) => c.key === coin);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (value > available) {
      toast.error("Amount exceeds your available balance");
      return;
    }
    if (method === "CRYPTO" && !coin) {
      toast.error("Select a crypto first");
      return;
    }
    if (!destination.trim()) {
      toast.error(method === "BANK" ? "Enter your bank details" : "Enter your wallet address");
      return;
    }

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: auth.user!.id,
      amount: value,
      method,
      crypto_key: method === "CRYPTO" ? coin : "",
      destination: destination.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setAmount("");
    setDestination("");
    setCoin("");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] }),
      qc.invalidateQueries({ queryKey: ["my-balance"] }),
    ]);
    toast.success("Withdrawal request submitted — amount held pending review");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-secondary/40 p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Available to withdraw</p>
        <p className="mt-1 font-display text-2xl font-bold">{money(available)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MethodCard
          active={method === "BANK"}
          onClick={() => setMethod("BANK")}
          icon={Building2}
          title="Bank transfer"
          sub={`Payout in ${currency}`}
        />
        <MethodCard
          active={method === "CRYPTO"}
          onClick={() => setMethod("CRYPTO")}
          icon={Wallet}
          title="Crypto wallet"
          sub="BNB, Solana, Polygon, BTC, ETH"
        />
      </div>

      {method === "CRYPTO" && (
        <label className="block text-sm">
          <span className="text-muted-foreground">Step 1 — select crypto</span>
          <select
            value={coin}
            onChange={(e) => setCoin(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choose a coin / network</option>
            {CRYPTO_OPTIONS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name} ({c.network})
              </option>
            ))}
          </select>
        </label>
      )}

      {(method === "BANK" || coin) && (
        <>
          <label className="block text-sm">
            <span className="text-muted-foreground">
              {method === "BANK"
                ? "Step 1 — amount"
                : `Step 2 — amount (${selected?.name} payout)`}{" "}
              ({currency})
            </span>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1.5"
            />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">
              {method === "BANK"
                ? "Step 2 — bank account details"
                : `Step 3 — your ${selected?.name} address (${selected?.network})`}
            </span>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={
                method === "BANK" ? "IBAN / account number" : "Destination wallet address"
              }
              className="mt-1.5"
            />
          </label>

          <Button variant="gold" className="w-full sm:w-auto" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpFromLine className="size-4" />}{" "}
            Request withdrawal
          </Button>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        The requested amount is held from your balance immediately. If compliance rejects the
        request, the full amount is returned to your balance with a reason.
      </p>

      <div>
        <h3 className="font-display text-base font-semibold">Your withdrawal requests</h3>
        <WithdrawalList rows={requests ?? []} money={money} />
      </div>
    </div>
  );
}

export function WithdrawalList({
  rows,
  money,
}: {
  rows: WithdrawalRequest[];
  money: (n: number) => string;
}) {
  if (!rows.length) {
    return (
      <p className="mt-3 rounded-xl border border-border bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
        No withdrawal requests yet.
      </p>
    );
  }
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((r) => {
        const meta = withdrawalMeta(r.status);
        const coin = CRYPTO_OPTIONS.find((c) => c.key === r.crypto_key);
        return (
          <li key={r.id} className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold">{money(Number(r.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  {r.method === "CRYPTO" ? `${coin?.name ?? "Crypto"} · ${coin?.network ?? ""}` : "Bank transfer"}{" "}
                  · {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium " + meta.classes
                }
              >
                {meta.label}
              </span>
            </div>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{r.destination}</p>
            {r.status === "REJECTED" && (
              <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                Rejected: {r.admin_reason || "No reason provided."} The amount has been returned to
                your balance.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MethodCard({
  active,
  onClick,
  icon: Icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Wallet;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors " +
        (active ? "border-primary bg-primary/10" : "border-border bg-secondary/40")
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}
