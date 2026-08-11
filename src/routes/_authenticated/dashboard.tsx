import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Building2,
  CheckCircle2,
  Copy,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceChart } from "@/components/PriceChart";
import { countryByName, formatMoney } from "@/lib/countries";
import { statusMeta, TONE_CLASSES } from "@/lib/account-status";
import { CRYPTO_OPTIONS, txnMeta } from "@/lib/transactions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Trading Dashboard — Recon Finance" },
      {
        name: "description",
        content: "Monitor your portfolio balance, equity, P&L and live market charts.",
      },
      { property: "og:title", content: "Trading Dashboard — Recon Finance" },
      { property: "og:description", content: "Your Recon Finance portfolio at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const NAV = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "deposit", label: "Deposit", icon: ArrowDownToLine },
  { key: "withdraw", label: "Withdrawal", icon: ArrowUpFromLine },
  { key: "history", label: "Account History", icon: History },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Account Settings", icon: Settings },
] as const;

type NavKey = (typeof NAV)[number]["key"];

function Dashboard() {
  const [section, setSection] = useState<NavKey>("overview");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, country, currency_code, status, created_at")
        .eq("id", auth.user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: balance } = useQuery({
    queryKey: ["my-balance"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("account_balances")
        .select("balance, equity, pnl")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      return data
        ? { balance: Number(data.balance), equity: Number(data.equity), pnl: Number(data.pnl) }
        : { balance: 0, equity: 0, pnl: 0 };
    },
  });

  const { data: txns } = useQuery({
    queryKey: ["my-transactions"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data } = await supabase
        .from("transactions")
        .select("id, type, amount, note, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const currency = profile?.currency_code || countryByName(profile?.country)?.currency || "USD";
  const locale = countryByName(profile?.country)?.locale;
  const money = (n: number) => formatMoney(n, currency, locale);
  const status = statusMeta(profile?.status);

  const total = balance?.balance ?? 0;
  const equity = balance?.equity ?? 0;
  const pnl = balance?.pnl ?? 0;

  useEffect(() => {
    setOpen(false);
  }, [section]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto flex max-w-[1500px]">
        <aside
          className={
            "fixed inset-y-0 left-0 z-50 w-64 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar p-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 " +
            (open ? "translate-x-0" : "-translate-x-full")
          }
        >
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient font-display text-sm font-bold text-primary-foreground">
                R
              </span>
              <span className="font-display font-semibold">
                Recon<span className="text-primary">Finance</span>
              </span>
            </Link>
            <button onClick={() => setOpen(false)} className="lg:hidden" aria-label="Close menu">
              <X className="size-4" />
            </button>
          </div>

          <nav className="mt-8 space-y-1">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors " +
                  (section === key
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </aside>

        {open && (
          <button
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-background/70 lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border lg:hidden"
              >
                <Menu className="size-4" />
              </button>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {NAV.find((n) => n.key === section)?.label}
                </p>
                <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
                  {profile?.full_name || profile?.username || "Trader"}
                </h1>
              </div>
            </div>
            <span
              className={
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium " +
                TONE_CLASSES[status.tone]
              }
            >
              {status.label}
            </span>
          </header>

          {section === "overview" && (
            <div className="mt-6 space-y-6">
              <div
                className={
                  "flex items-start gap-3 rounded-2xl border p-4 " + TONE_CLASSES[status.tone]
                }
                role="status"
              >
                {status.tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Account status: {status.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                    {status.message}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                  label="Total Balance"
                  value={money(total)}
                  sub={total > 0 ? "Funded account" : "No deposits yet"}
                />
                <Stat label="Equity" value={money(equity)} sub="Live account equity" />
                <Stat
                  label="Unrealised P&L"
                  value={(pnl >= 0 ? "+" : "-") + money(Math.abs(pnl))}
                  sub={pnl >= 0 ? "In profit" : "In drawdown"}
                  positive={pnl > 0}
                />
              </div>

              <PriceChart />

              <div className="rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
                <h2 className="font-display text-lg font-semibold">Recent activity</h2>
                <TxnTable rows={(txns ?? []).slice(0, 5)} money={money} />
              </div>
            </div>
          )}

          {section === "deposit" && (
            <Panel title="Deposit funds" description="Fund your account by bank transfer or crypto.">
              <DepositPanel currency={currency} />
            </Panel>
          )}

          {section === "withdraw" && (
            <Panel
              title="Withdraw funds"
              description="Request a payout to your bank account or crypto wallet."
            >
              <WithdrawPanel currency={currency} available={total} money={money} />
            </Panel>
          )}

          {section === "history" && (
            <Panel
              title="Account history"
              description="Deposits, withdrawals and trade results on your account."
            >
              <TxnTable rows={txns ?? []} money={money} />
            </Panel>
          )}

          {section === "analytics" && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                  label="Trades won"
                  value={String((txns ?? []).filter((t) => t.type === "TRADE_WON").length)}
                />
                <Stat
                  label="Trades lost"
                  value={String((txns ?? []).filter((t) => t.type === "TRADE_LOST").length)}
                />
                <Stat label="Equity" value={money(equity)} />
              </div>
              <PriceChart symbol="Portfolio value" base={Math.max(total, 1)} height={260} compact />
            </div>
          )}

          {section === "settings" && (
            <Panel title="Account settings" description="Your registered details.">
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Full name", profile?.full_name],
                  ["Username", profile?.username],
                  ["Email", profile?.email],
                  ["Country", profile?.country],
                  ["Account currency", currency],
                  ["Status", status.label],
                ].map((row) => (
                  <div
                    key={row[0] as string}
                    className="rounded-xl border border-border bg-secondary/40 p-4"
                  >
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      {row[0] as string}
                    </dt>
                    <dd className="mt-1 truncate font-medium">{(row[1] as string) || "—"}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </main>
      </div>
    </div>
  );
}

type Txn = { id: string; type: string; amount: number; note: string; created_at: string };

function TxnTable({ rows, money }: { rows: Txn[]; money: (n: number) => string }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="pb-3">Date</th>
            <th className="pb-3">Type</th>
            <th className="pb-3">Note</th>
            <th className="pb-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="border-t border-border">
              <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                No activity yet. Deposits, withdrawals and trade results appear here.
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const meta = txnMeta(r.type);
            return (
              <tr key={r.id} className="border-t border-border">
                <td className="py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 font-medium">{meta.label}</td>
                <td className="py-3 text-muted-foreground">{r.note || "—"}</td>
                <td
                  className={
                    "py-3 text-right font-medium " +
                    (meta.tone === "success"
                      ? "text-success"
                      : meta.tone === "danger"
                        ? "text-destructive"
                        : "text-foreground")
                  }
                >
                  {meta.tone === "success" ? "+" : meta.tone === "danger" ? "-" : ""}
                  {money(Math.abs(Number(r.amount)))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DepositPanel({ currency }: { currency: string }) {
  const [method, setMethod] = useState<"bank" | "crypto">("bank");
  const [coin, setCoin] = useState(CRYPTO_OPTIONS[0]!.key);
  const selected = CRYPTO_OPTIONS.find((c) => c.key === coin)!;

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Copy failed"),
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <MethodCard
          active={method === "bank"}
          onClick={() => setMethod("bank")}
          icon={Building2}
          title="Bank transfer"
          sub={`Deposit in ${currency} · 1–3 business days`}
        />
        <MethodCard
          active={method === "crypto"}
          onClick={() => setMethod("crypto")}
          icon={Wallet}
          title="Crypto"
          sub="XRP, USDC, USDT, BTC · minutes"
        />
      </div>

      {method === "bank" ? (
        <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
          <p className="font-medium">Bank transfer instructions</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Contact your account manager to receive the settlement bank details for {currency}{" "}
            deposits. Transfers are credited to your balance once cleared.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted-foreground">Select crypto</span>
            <select
              value={coin}
              onChange={(e) => setCoin(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CRYPTO_OPTIONS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name} ({c.network})
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {selected.name} deposit address · {selected.network}
            </p>
            <p className="mt-2 break-all font-mono text-sm">{selected.address}</p>
            <Button
              variant="goldOutline"
              size="sm"
              className="mt-3"
              onClick={() => copy(selected.address, "Address")}
            >
              <Copy className="size-3.5" /> Copy address
            </Button>

            {selected.memo && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Destination tag / memo (required)
                </p>
                <p className="mt-2 font-mono text-sm">{selected.memo}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => copy(selected.memo!, "Memo")}
                >
                  <Copy className="size-3.5" /> Copy memo
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Send only {selected.name} over {selected.network}. Your balance is credited after
            network confirmation.
          </p>
        </div>
      )}
    </div>
  );
}

function WithdrawPanel({
  currency,
  available,
  money,
}: {
  currency: string;
  available: number;
  money: (n: number) => string;
}) {
  const [method, setMethod] = useState<"bank" | "crypto">("bank");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");

  function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (value > available) {
      toast.error("Amount exceeds your available balance");
      return;
    }
    if (!destination.trim()) {
      toast.error(method === "bank" ? "Enter your bank details" : "Enter your wallet address");
      return;
    }
    setAmount("");
    setDestination("");
    toast.success("Withdrawal request submitted for review");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-secondary/40 p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Available to withdraw</p>
        <p className="mt-1 font-display text-2xl font-bold">{money(available)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MethodCard
          active={method === "bank"}
          onClick={() => setMethod("bank")}
          icon={Building2}
          title="Bank transfer"
          sub={`Payout in ${currency}`}
        />
        <MethodCard
          active={method === "crypto"}
          onClick={() => setMethod("crypto")}
          icon={Wallet}
          title="Crypto wallet"
          sub="XRP, USDC, USDT, BTC"
        />
      </div>

      <label className="block text-sm">
        <span className="text-muted-foreground">Amount ({currency})</span>
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
          {method === "bank" ? "Bank account details" : "Wallet address"}
        </span>
        <Input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={method === "bank" ? "IBAN / account number" : "Destination wallet address"}
          className="mt-1.5"
        />
      </label>

      <Button variant="gold" className="w-full sm:w-auto" onClick={submit}>
        <ArrowUpFromLine className="size-4" /> Request withdrawal
      </Button>
      <p className="text-xs text-muted-foreground">
        Withdrawal requests are reviewed by compliance before payout.
      </p>
    </div>
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

function Stat({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lux">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {sub && (
        <p className={"mt-1 text-xs " + (positive ? "text-success" : "text-muted-foreground")}>{sub}</p>
      )}
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}
