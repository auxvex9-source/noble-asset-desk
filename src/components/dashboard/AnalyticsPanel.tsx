import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownToLine, ArrowUpFromLine, Trophy, TrendingUp } from "lucide-react";

import { LiveMarketGrid } from "@/components/LiveMarketGrid";
import { PriceChart } from "@/components/PriceChart";

type Txn = { id: string; type: string; amount: number; note: string; created_at: string };

function useTicker(base: number) {
  const [value, setValue] = useState(base);
  useEffect(() => setValue(base), [base]);
  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => {
        const drift = (Math.random() - 0.5) * Math.max(base, 100) * 0.004;
        return v + drift;
      });
    }, 2000);
    return () => clearInterval(id);
  }, [base]);
  return value;
}

export function AnalyticsPanel({
  txns,
  equity,
  balance,
  pnl,
  money,
}: {
  txns: Txn[];
  equity: number;
  balance: number;
  pnl: number;
  money: (n: number) => string;
}) {
  const won = txns.filter((t) => t.type === "TRADE_WON");
  const lost = txns.filter((t) => t.type === "TRADE_LOST");
  const deposits = txns.filter((t) => t.type === "DEPOSIT");
  const withdrawals = txns.filter((t) => t.type === "WITHDRAWAL");
  const trades = won.length + lost.length;
  const winRate = trades ? Math.round((won.length / trades) * 100) : 0;

  const sum = (rows: Txn[]) => rows.reduce((a, r) => a + Math.abs(Number(r.amount)), 0);
  const depositTotal = sum(deposits);
  const withdrawTotal = sum(withdrawals);
  const flowMax = Math.max(depositTotal, withdrawTotal, 1);

  const liveEquity = useTicker(equity);
  const pnlPct = balance > 0 ? (pnl / balance) * 100 : 0;

  const spark = useMemo(() => {
    const bars = txns.slice(0, 14).reverse();
    return bars.length ? bars : [];
  }, [txns]);

  return (
    <div className="mt-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-5 shadow-lux sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <WinRing rate={winRate} />
          <div className="min-w-0 space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Live performance
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live equity</p>
              <p className="font-display text-3xl font-bold tabular-nums transition-all">
                {money(liveEquity)}
              </p>
              <p
                className={
                  "mt-1 text-sm font-medium tabular-nums " +
                  (pnl >= 0 ? "text-success" : "text-destructive")
                }
              >
                {pnl >= 0 ? "▲" : "▼"} {money(Math.abs(pnl))} ({pnlPct.toFixed(2)}%) unrealised
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Trophy} label="Trades won" value={String(won.length)} tone="success" />
        <MetricCard icon={Activity} label="Trades lost" value={String(lost.length)} tone="danger" />
        <MetricCard icon={TrendingUp} label="Win rate" value={`${winRate}%`} tone="gold" />
        <MetricCard icon={ArrowDownToLine} label="Total deposits" value={money(depositTotal)} tone="gold" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-lux sm:p-6">
        <h3 className="font-display text-lg font-semibold">Capital flow</h3>
        <p className="mt-1 text-sm text-muted-foreground">Deposits versus withdrawals on your account.</p>
        <div className="mt-5 space-y-4">
          <FlowBar
            icon={ArrowDownToLine}
            label="Deposits"
            value={money(depositTotal)}
            pct={(depositTotal / flowMax) * 100}
            tone="success"
          />
          <FlowBar
            icon={ArrowUpFromLine}
            label="Withdrawals"
            value={money(withdrawTotal)}
            pct={(withdrawTotal / flowMax) * 100}
            tone="danger"
          />
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Recent activity pulse</p>
          <div className="mt-3 flex h-20 items-end gap-1.5">
            {spark.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet — your pulse appears here.</p>
            )}
            {spark.map((t, i) => {
              const max = Math.max(...spark.map((x) => Math.abs(Number(x.amount))), 1);
              const h = Math.max(8, (Math.abs(Number(t.amount)) / max) * 100);
              const good = t.type === "DEPOSIT" || t.type === "TRADE_WON";
              return (
                <span
                  key={t.id}
                  title={`${t.type} · ${money(Math.abs(Number(t.amount)))}`}
                  className={
                    "flex-1 rounded-t-sm transition-all duration-700 " +
                    (good ? "bg-success/70" : "bg-destructive/70")
                  }
                  style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-display text-lg font-semibold">Live markets</h3>
        <LiveMarketGrid />
      </div>

      <PriceChart symbol="Portfolio value" base={Math.max(balance, 1)} height={260} compact />
    </div>
  );
}

function WinRing({ rate }: { rate: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto size-32 sm:mx-0">
      <svg viewBox="0 0 100 100" className="size-32 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" className="text-border" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * rate) / 100}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-2xl font-bold tabular-nums">{rate}%</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Win rate</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone: "success" | "danger" | "gold";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-primary";
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-lux transition-colors hover:border-primary/50">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <Icon className={"size-4 transition-transform group-hover:scale-110 " + toneClass} />
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function FlowBar({
  icon: Icon,
  label,
  value,
  pct,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  pct: number;
  tone: "success" | "danger";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <Icon className={"size-4 " + (tone === "success" ? "text-success" : "text-destructive")} />
          {label}
        </span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={"h-full rounded-full " + (tone === "success" ? "bg-success" : "bg-destructive")}
          style={{ width: `${Math.min(100, Math.max(2, pct))}%`, transition: "width 1s ease" }}
        />
      </div>
    </div>
  );
}
