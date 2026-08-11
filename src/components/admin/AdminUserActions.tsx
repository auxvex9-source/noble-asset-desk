import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, LineChart, Wallet } from "lucide-react";

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
import { TXN_TYPES, txnMeta, type TxnType } from "@/lib/transactions";

type Balance = { balance: number; equity: number; pnl: number };

export function AdminUserActions({
  userId,
  name,
  currency,
  balance,
}: {
  userId: string;
  name: string;
  currency: string;
  balance: Balance | undefined;
}) {
  const [modal, setModal] = useState<null | "balance" | "overview" | "history">(null);

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="goldOutline" size="sm" onClick={() => setModal("balance")}>
          <Wallet className="size-3.5" /> Update balance
        </Button>
        <Button variant="outline" size="sm" onClick={() => setModal("overview")}>
          <LineChart className="size-3.5" /> Dashboard overview
        </Button>
        <Button variant="outline" size="sm" onClick={() => setModal("history")}>
          <History className="size-3.5" /> History
        </Button>
      </div>

      {modal === "balance" && (
        <BalanceDialog
          userId={userId}
          name={name}
          currency={currency}
          balance={balance}
          field="balance"
          onClose={() => setModal(null)}
        />
      )}
      {modal === "overview" && (
        <BalanceDialog
          userId={userId}
          name={name}
          currency={currency}
          balance={balance}
          field="overview"
          onClose={() => setModal(null)}
        />
      )}
      {modal === "history" && (
        <HistoryDialog
          userId={userId}
          name={name}
          currency={currency}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

async function upsertBalance(userId: string, patch: Partial<Balance>) {
  const { error } = await supabase
    .from("account_balances")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}

function BalanceDialog({
  userId,
  name,
  currency,
  balance,
  field,
  onClose,
}: {
  userId: string;
  name: string;
  currency: string;
  balance: Balance | undefined;
  field: "balance" | "overview";
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [total, setTotal] = useState(String(balance?.balance ?? 0));
  const [equity, setEquity] = useState(String(balance?.equity ?? 0));
  const [pnl, setPnl] = useState(String(balance?.pnl ?? 0));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const patch =
        field === "balance"
          ? { balance: Number(total) || 0 }
          : { equity: Number(equity) || 0, pnl: Number(pnl) || 0 };
      await upsertBalance(userId, patch);
      await qc.invalidateQueries({ queryKey: ["all-balances"] });
      toast.success("Saved");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {field === "balance" ? "Update total balance" : "Dashboard overview"}
          </DialogTitle>
          <DialogDescription>
            {name} · account currency {currency}
          </DialogDescription>
        </DialogHeader>

        {field === "balance" ? (
          <label className="block text-sm">
            <span className="text-muted-foreground">New total balance ({currency})</span>
            <Input
              type="number"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="mt-1.5"
            />
            <span className="mt-1.5 block text-xs text-muted-foreground">
              Shows as {formatMoney(Number(total) || 0, currency)} on the client dashboard.
            </span>
          </label>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="text-muted-foreground">Equity ({currency})</span>
              <Input
                type="number"
                inputMode="decimal"
                value={equity}
                onChange={(e) => setEquity(e.target.value)}
                className="mt-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Unrealised P&amp;L ({currency})</span>
              <Input
                type="number"
                inputMode="decimal"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
                className="mt-1.5"
              />
            </label>
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gold" size="sm" onClick={save} disabled={saving}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({
  userId,
  name,
  currency,
  onClose,
}: {
  userId: string;
  name: string;
  currency: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<TxnType>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rows } = useQuery({
    queryKey: ["user-transactions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, amount, note, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function add() {
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      type,
      amount: Number(amount) || 0,
      note,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAmount("");
    setNote("");
    toast.success("Entry added");
    qc.invalidateQueries({ queryKey: ["user-transactions", userId] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["user-transactions", userId] });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create history entry</DialogTitle>
          <DialogDescription>{name} · shows instantly on the client dashboard</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TxnType)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TXN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {txnMeta(t).label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Amount ({currency})</span>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Note (optional)</span>
            <Input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5" />
          </label>
          <Button variant="gold" size="sm" onClick={add} disabled={saving} className="w-full">
            Add entry
          </Button>
        </div>

        <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-border">
          {!rows?.length && (
            <p className="p-4 text-center text-xs text-muted-foreground">No entries yet.</p>
          )}
          {rows?.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 border-b border-border p-3 text-sm last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{txnMeta(r.type).label}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-medium">{formatMoney(Number(r.amount), currency)}</span>
                <button
                  onClick={() => remove(r.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
