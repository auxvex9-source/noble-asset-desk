import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, Gem, History, KeyRound, LineChart, Loader2, Trash2, Wallet } from "lucide-react";

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
import { NFT_ACCENTS, NFT_ASSETS } from "@/components/dashboard/NftChart";
import { generateAdminRecoveryLink } from "@/lib/admin-recovery.functions";
import { deleteAdminUser } from "@/lib/admin-user.functions";

type Balance = { balance: number; equity: number; pnl: number };

export function AdminUserActions({
  userId,
  name,
  email,
  currency,
  balance,
  onDeleted,
}: {
  userId: string;
  name: string;
  email: string;
  currency: string;
  balance: Balance | undefined;
  onDeleted: () => void;
}) {
  const [modal, setModal] = useState<null | "balance" | "overview" | "history" | "nft" | "recovery">(null);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="goldOutline" size="sm" className="justify-start" onClick={() => setModal("balance")}>
          <Wallet className="size-3.5" /> Update balance
        </Button>
        <Button variant="outline" size="sm" className="justify-start" onClick={() => setModal("overview")}>
          <LineChart className="size-3.5" /> Dashboard overview
        </Button>
        <Button variant="outline" size="sm" className="justify-start" onClick={() => setModal("history")}>
          <History className="size-3.5" /> History
        </Button>
        <Button variant="outline" size="sm" className="justify-start" onClick={() => setModal("recovery")}>
          <KeyRound className="size-3.5" /> Reset password
        </Button>
        <Button variant="outline" size="sm" className="justify-start" onClick={() => setModal("nft")}>
          <Gem className="size-3.5" /> Create NFT chart
        </Button>
        <DeleteUserButton userId={userId} name={name} onDeleted={onDeleted} className="justify-start" />
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
      {modal === "nft" && (
        <NftChartDialog userId={userId} name={name} currency={currency} onClose={() => setModal(null)} />
      )}
      {modal === "history" && (
        <HistoryDialog
          userId={userId}
          name={name}
          currency={currency}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "recovery" && (
        <RecoveryDialog
          email={email}
          name={name}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function DeleteUserButton({
  userId,
  name,
  onDeleted,
  className,
}: {
  userId: string;
  name: string;
  onDeleted: () => void;
  className?: string;
}) {
  const removeUser = useServerFn(deleteAdminUser);
  const [saving, setSaving] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete ${name}'s account permanently? They will be able to register again.`)) {
      return;
    }

    setSaving(true);
    try {
      await removeUser({ data: { userId } });
      toast.success("Account deleted. The user can register again.");
      onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={remove}
      disabled={saving}
      title="Delete account permanently"
      className={className}
    >
      {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      Delete account
    </Button>
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

function RecoveryDialog({
  email,
  name,
  onClose,
}: {
  email: string;
  name: string;
  onClose: () => void;
}) {
  const generateLink = useServerFn(generateAdminRecoveryLink);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setSaving(true);
    setCopied(false);
    try {
      const result = await generateLink({ data: { email } });
      setActionLink(result.actionLink);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create recovery link");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!actionLink) return;
    await navigator.clipboard.writeText(actionLink);
    setCopied(true);
    toast.success("Recovery link copied");
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Secure password recovery</DialogTitle>
          <DialogDescription>
            Create a one-time recovery link for {name}. The user chooses their own new password;
            you will never see it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">
            <p className="font-medium">Account email</p>
            <p className="mt-1 break-all text-muted-foreground">{email}</p>
          </div>

          {actionLink ? (
            <div className="space-y-2">
              <label htmlFor="recovery-link" className="text-sm text-muted-foreground">
                One-time recovery link
              </label>
              <div className="flex gap-2">
                <Input id="recovery-link" value={actionLink} readOnly className="min-w-0 text-xs" />
                <Button
                  type="button"
                  variant="goldOutline"
                  size="icon"
                  title="Copy recovery link"
                  aria-label="Copy recovery link"
                  onClick={copyLink}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send this link privately to the account holder. It expires and can only be used to
                set a new password.
              </p>
            </div>
          ) : (
            <Button type="button" variant="gold" className="w-full" onClick={createLink} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Generate recovery link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


function NftChartDialog({
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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "Recon Genesis",
    collection: "Recon Vault",
    floor_price: "0",
    change_pct: "0",
    volume: "0",
    holders: "0",
    accent: "gold",
    seed: "42",
    enabled: true,
    asset: "BTC",
    start_value: "0",
    target_value: "0",
    days: "5",
  });
  const [status, setStatus] = useState<string>("IDLE");

  const { data: existing } = useQuery({
    queryKey: ["nft-chart", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nft_charts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const days =
          data.start_at && data.end_at
            ? (
                (new Date(data.end_at).getTime() - new Date(data.start_at).getTime()) /
                86400000
              ).toFixed(2)
            : "5";
        setForm((f) => ({
          ...f,
          title: data.title,
          collection: data.collection,
          floor_price: String(data.floor_price),
          change_pct: String(data.change_pct),
          volume: String(data.volume),
          holders: String(data.holders),
          accent: data.accent,
          seed: String(data.seed),
          enabled: data.enabled,
          asset: data.asset ?? "BTC",
          start_value: String(data.start_value ?? 0),
          target_value: String(data.target_value ?? 0),
          days,
        }));
        setStatus(data.live_status ?? "IDLE");
      }
      return data;
    },
  });

  function basePayload() {
    return {
      user_id: userId,
      title: form.title.trim() || "Recon Genesis",
      collection: form.collection.trim() || "Recon Vault",
      floor_price: Number(form.floor_price) || 0,
      change_pct: Number(form.change_pct) || 0,
      volume: Number(form.volume) || 0,
      holders: Number(form.holders) || 0,
      accent: form.accent,
      seed: Number(form.seed) || 42,
      enabled: form.enabled,
      asset: form.asset,
      start_value: Number(form.start_value) || 0,
      target_value: Number(form.target_value) || 0,
    };
  }

  async function persist(extra: Record<string, unknown>, message: string) {
    setSaving(true);
    const { error } = await supabase
      .from("nft_charts")
      .upsert({ ...basePayload(), ...extra }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(message);
    qc.invalidateQueries({ queryKey: ["nft-chart", userId] });
    return true;
  }

  async function save() {
    if (await persist({}, "NFT chart published to the client dashboard")) onClose();
  }

  async function startRun() {
    const days = Number(form.days);
    if (!(days > 0)) {
      toast.error("Enter a run duration in days");
      return;
    }
    if (!(Number(form.target_value) > 0)) {
      toast.error("Enter a target value");
      return;
    }
    const start = new Date();
    const end = new Date(start.getTime() + days * 86400000);
    const ok = await persist(
      {
        live_status: "RUNNING",
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        frozen_value: null,
        floor_price: Number(form.start_value) || 0,
        enabled: true,
      },
      `Live run started — ${form.asset} over ${days} day(s)`,
    );
    if (ok) setStatus("RUNNING");
  }

  async function stopRun() {
    const from = Number(form.start_value) || 0;
    const to = Number(form.target_value) || 0;
    const s = existing?.start_at ? new Date(existing.start_at).getTime() : Date.now();
    const e = existing?.end_at ? new Date(existing.end_at).getTime() : Date.now();
    const p = e > s ? Math.min(1, Math.max(0, (Date.now() - s) / (e - s))) : 1;
    const frozen = from + (to - from) * p;
    const ok = await persist(
      { live_status: "STOPPED", frozen_value: frozen, floor_price: frozen },
      "Live run stopped",
    );
    if (ok) setStatus("STOPPED");
  }

  async function resetRun() {
    const ok = await persist(
      { live_status: "IDLE", frozen_value: null, start_at: null, end_at: null },
      "Live run cleared",
    );
    if (ok) setStatus("IDLE");
  }

  async function remove() {
    const { error } = await supabase.from("nft_charts").delete().eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("NFT chart removed — standard price chart restored");
    qc.invalidateQueries({ queryKey: ["nft-chart", userId] });
    onClose();
  }

  const set = (k: keyof typeof form) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create NFT chart</DialogTitle>
          <DialogDescription>
            {name} · replaces the portfolio chart on their dashboard ({currency})
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Chart title" value={form.title} onChange={set("title")} />
          <Text label="Collection" value={form.collection} onChange={set("collection")} />
          <Text
            label={`Floor price (${currency})`}
            value={form.floor_price}
            onChange={set("floor_price")}
            numeric
          />
          <Text label="24h change %" value={form.change_pct} onChange={set("change_pct")} numeric />
          <Text label={`Volume (${currency})`} value={form.volume} onChange={set("volume")} numeric />
          <Text label="Holders" value={form.holders} onChange={set("holders")} numeric />
          <Text label="Chart shape seed" value={form.seed} onChange={set("seed")} numeric />
          <label className="block text-sm">
            <span className="text-muted-foreground">Accent</span>
            <select
              value={form.accent}
              onChange={(e) => set("accent")(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {NFT_ACCENTS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set("enabled")(e.target.checked)}
            className="size-4 accent-[var(--gold)]"
          />
          Show on client dashboard
        </label>

        <div className="mt-4 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Live run</h4>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">{status}</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">Crypto</span>
              <select
                value={form.asset}
                onChange={(e) => set("asset")(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {NFT_ASSETS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <Text label="Duration (days)" value={form.days} onChange={set("days")} numeric />
            <Text
              label={`Start value (${currency})`}
              value={form.start_value}
              onChange={set("start_value")}
              numeric
            />
            <Text
              label={`Target value (${currency})`}
              value={form.target_value}
              onChange={set("target_value")}
              numeric
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="gold" size="sm" onClick={startRun} disabled={saving}>
              {status === "RUNNING" ? "Restart run" : "Start live run"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={stopRun}
              disabled={saving || status !== "RUNNING"}
            >
              Stop
            </Button>
            <Button variant="ghost" size="sm" onClick={resetRun} disabled={saving || status === "IDLE"}>
              Clear run
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The client chart climbs live from the start value to the target across the duration.
          </p>
        </div>


        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {existing && (
            <Button variant="ghost" size="sm" onClick={remove}>
              Remove
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gold" size="sm" onClick={save} disabled={saving}>
            {existing ? "Save NFT chart" : "Create NFT chart"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Text({
  label,
  value,
  onChange,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input
        value={value}
        type={numeric ? "number" : "text"}
        inputMode={numeric ? "decimal" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5"
      />
    </label>
  );
}
