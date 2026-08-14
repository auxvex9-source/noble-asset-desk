import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/countries";
import { CRYPTO_OPTIONS } from "@/lib/transactions";
import { withdrawalMeta, type WithdrawalRequest } from "@/lib/withdrawals";

type Named = { name: string; currency: string };

export function WithdrawalsDialog({
  users,
  onClose,
}: {
  users: Record<string, Named>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: rows, isPending } = useQuery({
    queryKey: ["all-withdrawals"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("id, user_id, amount, method, crypto_key, destination, status, admin_reason, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WithdrawalRequest[];
    },
  });

  async function decide(row: WithdrawalRequest, status: "APPROVED" | "REJECTED") {
    const reason = (reasons[row.id] ?? "").trim();
    if (status === "REJECTED" && !reason) {
      toast.error("Type a rejection reason — the client will see it");
      return;
    }
    setBusy(row.id);
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({ status, admin_reason: status === "REJECTED" ? reason : "" })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      status === "APPROVED" ? "Withdrawal approved — successful" : "Withdrawal rejected, funds returned",
    );
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["all-withdrawals"] }),
      qc.invalidateQueries({ queryKey: ["all-balances"] }),
    ]);
  }

  async function removeRequest(row: WithdrawalRequest) {
    setBusy(row.id);
    const { error } = await supabase.from("withdrawal_requests").delete().eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Withdrawal request deleted");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["all-withdrawals"] }),
      qc.invalidateQueries({ queryKey: ["pending-withdrawals-count"] }),
    ]);
  }

  const pending = rows?.filter((r) => r.status === "PENDING") ?? [];
  const decided = rows?.filter((r) => r.status !== "PENDING") ?? [];

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve withdrawals</DialogTitle>
          <DialogDescription>
            Review client payout requests. Approving marks it successful; rejecting returns the
            amount to the client balance with your reason.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
                Pending ({pending.length})
              </h3>
              {!pending.length && (
                <p className="mt-3 rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
                  No withdrawal requests awaiting review.
                </p>
              )}
              <div className="mt-3 space-y-3">
                {pending.map((r) => {
                  const u = users[r.user_id];
                  const coin = CRYPTO_OPTIONS.find((c) => c.key === r.crypto_key);
                  return (
                    <div key={r.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium">{u?.name ?? r.user_id.slice(0, 8)}</p>
                        <p className="font-display text-lg font-bold">
                          {formatMoney(Number(r.amount), u?.currency ?? "USD")}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.method === "CRYPTO"
                          ? `${coin?.name ?? "Crypto"} · ${coin?.network ?? ""}`
                          : "Bank transfer"}{" "}
                        · {new Date(r.created_at).toLocaleString()}
                      </p>
                      <p className="mt-2 break-all font-mono text-xs">{r.destination}</p>
                      <Input
                        value={reasons[r.id] ?? ""}
                        onChange={(e) => setReasons((s) => ({ ...s, [r.id]: e.target.value }))}
                        placeholder="Rejection reason (required to reject)"
                        className="mt-3"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="gold"
                          size="sm"
                          disabled={busy === r.id}
                          onClick={() => decide(r, "APPROVED")}
                        >
                          <Check className="size-3.5" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy === r.id}
                          onClick={() => decide(r, "REJECTED")}
                        >
                          <X className="size-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Decided</h3>
              {!decided.length && (
                <p className="mt-3 text-center text-xs text-muted-foreground">Nothing yet.</p>
              )}
              <div className="mt-3 space-y-2">
                {decided.map((r) => {
                  const u = users[r.user_id];
                  const meta = withdrawalMeta(r.status);
                  return (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u?.name ?? r.user_id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(Number(r.amount), u?.currency ?? "USD")} ·{" "}
                          {new Date(r.created_at).toLocaleDateString()}
                          {r.admin_reason ? ` · ${r.admin_reason}` : ""}
                        </p>
                      </div>
                      <span
                        className={"rounded-full border px-2.5 py-1 text-xs font-medium " + meta.classes}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
