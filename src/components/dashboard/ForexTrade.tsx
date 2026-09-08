import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buyForex, sellForex } from "@/lib/forex.functions";
import { newTransactionRef, positionStatusLabel } from "@/lib/stocks";
import {
  FOREX_PAIR_SELECT,
  FOREX_POSITION_SELECT,
  effectiveRate,
  formatRate,
  formatUnits,
  numericForexPosition,
  numericPair,
  type ForexPair,
  type ForexPosition,
} from "@/lib/forex";

type Money = (n: number) => string;

export function useForexPairs() {
  return useQuery({
    queryKey: ["forex-pairs"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forex_pairs")
        .select(FOREX_PAIR_SELECT)
        .eq("status", "ACTIVE")
        .order("pair");
      if (error) throw error;
      return (data ?? []).map((p) => numericPair(p as unknown as Record<string, unknown>));
    },
  });
}

export function useMyForexPositions() {
  return useQuery({
    queryKey: ["my-forex-positions"],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as ForexPosition[];
      const { data, error } = await supabase
        .from("user_forex_positions")
        .select(FOREX_POSITION_SELECT)
        .eq("user_id", auth.user.id)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => numericForexPosition(p as unknown as Record<string, unknown>));
    },
  });
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lux">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-2 text-sm first:border-t-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-muted-foreground">
      {label}: <span className="text-foreground">{value}</span>
    </p>
  );
}

export function useMyForexControls() {
  return useQuery({
    queryKey: ["my-forex-controls"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as { pair_id: string; direction: string; end_at: string }[];
      const { data, error } = await supabase
        .from("forex_user_controls")
        .select("pair_id, direction, end_at, enabled")
        .eq("user_id", auth.user.id)
        .eq("enabled", true);
      if (error) throw error;
      return (data ?? []) as { pair_id: string; direction: string; end_at: string }[];
    },
  });
}

export function ForexTrade({ balance, money }: { balance: number; money: Money }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ForexPair | null>(null);
  const { data: pairs, isPending } = useForexPairs();
  const { data: controls } = useMyForexControls();

  const pinned = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of controls ?? []) {
      if (!c.end_at || new Date(c.end_at).getTime() > Date.now()) map[c.pair_id] = c.direction;
    }
    return map;
  }, [controls]);

  const list = useMemo(() => {
    const all = [...(pairs ?? [])];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter((p) =>
          [p.pair, p.base_currency, p.quote_currency].some((v) => v.toLowerCase().includes(q)),
        )
      : all;
    return filtered.sort((a, b) => {
      const pa = pinned[a.id] ? 0 : 1;
      const pb = pinned[b.id] ? 0 : 1;
      return pa - pb || a.pair.localeCompare(b.pair);
    });
  }, [pairs, query, pinned]);

  const live = open ? (pairs ?? []).find((p) => p.id === open.id) ?? open : null;

  if (live) {
    return (
      <ForexPairView
        pair={live}
        direction={pinned[live.id] ?? null}
        balance={balance}
        money={money}
        onBack={() => setOpen(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
        <h2 className="font-display text-lg font-semibold">Forex Market</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap any pair to open its live trading chart.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Available balance: <span className="text-foreground">{money(balance)}</span>
        </p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search currency pairs…"
            className="pl-9"
            aria-label="Search currency pairs"
          />
        </div>
      </div>

      {isPending ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : list.length ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-lux">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-4 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span>Pair ({list.length})</span>
            <span className="text-right">Last price / 24h</span>
          </div>
          <ul>
            {list.map((p) => {
              const up = p.change_pct >= 0;
              const dir = pinned[p.id];
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setOpen(p)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary/40"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium">
                        {p.pair}
                        {dir && (
                          <span
                            className={
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase " +
                              (dir === "RISE"
                                ? "border-success/40 bg-success/10 text-success"
                                : "border-destructive/40 bg-destructive/10 text-destructive")
                            }
                          >
                            {dir === "RISE" ? "Rising" : "Falling"}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.base_currency} → {p.quote_currency}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display font-semibold tabular-nums">
                        {formatRate(p.current_rate)}
                      </p>
                      <p
                        className={
                          "flex items-center justify-end gap-1 text-xs font-medium " +
                          (up ? "text-success" : "text-destructive")
                        }
                      >
                        {up ? (
                          <TrendingUp className="size-3.5" />
                        ) : (
                          <TrendingDown className="size-3.5" />
                        )}
                        {up ? "+" : ""}
                        {p.change_pct.toFixed(2)}%
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No currency pairs match “{query}”.
        </p>
      )}
    </div>
  );
}

function ForexPairView({
  pair,
  direction,
  balance,
  money,
  onBack,
}: {
  pair: ForexPair;
  direction: string | null;
  balance: number;
  money: Money;
  onBack: () => void;
}) {
  const [buying, setBuying] = useState(false);
  const [selling, setSelling] = useState<ForexPosition | null>(null);
  const { data: positions } = useMyForexPositions();

  const held = useMemo(
    () =>
      (positions ?? []).filter(
        (p) => p.pair_id === pair.id && p.remaining_units > 0.0000000001,
      ),
    [positions, pair.id],
  );

  const bias = direction === "RISE" ? 1 : direction === "FALL" ? -1 : pair.change_pct >= 0 ? 0.2 : -0.2;

  return (
    <div className="space-y-4 pb-2">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to pairs"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold">{pair.pair}</h2>
          <p className="truncate text-xs text-muted-foreground">
            Balance {money(balance)}
            {direction ? ` · Scenario: ${direction === "RISE" ? "Rising" : "Falling"}` : ""}
          </p>
        </div>
      </div>

      <CandleChart
        symbol={pair.pair}
        price={pair.current_rate}
        changePct={pair.change_pct}
        bias={bias}
        format={formatRate}
      />

      {held.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-lux">
          <h3 className="font-display text-sm font-semibold">Your positions in {pair.pair}</h3>
          <div className="mt-3 space-y-2">
            {held.map((p) => {
              const rate = effectiveRate(p, pair.current_rate);
              const value = p.remaining_units * rate;
              const pnl = value - Math.max(p.amount_invested - p.amount_sold, 0);
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {formatUnits(p.remaining_units)} {pair.base_currency}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Entry {formatRate(p.entry_rate)} · {positionStatusLabel(p.status)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium tabular-nums">{money(value)}</p>
                    <p
                      className={
                        "text-xs tabular-nums " + (pnl >= 0 ? "text-success" : "text-destructive")
                      }
                    >
                      {pnl >= 0 ? "+" : "-"}
                      {money(Math.abs(pnl))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="sticky bottom-2 grid grid-cols-2 gap-3">
        <Button
          className="h-12 rounded-xl bg-success text-success-foreground hover:bg-success/90"
          onClick={() => setBuying(true)}
        >
          Buy
        </Button>
        <Button
          className="h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={() => {
            if (!held.length) {
              toast.error("You have no open position in this pair to sell");
              return;
            }
            setSelling(held[0]!);
          }}
        >
          Sell
        </Button>
      </div>

      {buying && (
        <BuyForexDialog
          pair={pair}
          balance={balance}
          money={money}
          onClose={() => setBuying(false)}
        />
      )}
      {selling && (
        <SellForexDialog
          position={selling}
          pair={pair}
          money={money}
          onClose={() => setSelling(null)}
        />
      )}
    </div>
  );
}


function BuyForexDialog({
  pair,
  balance,
  money,
  onClose,
}: {
  pair: ForexPair;
  balance: number;
  money: Money;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const buy = useServerFn(buyForex);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<null | { units: number; amount: number; ref: string; rate: number }>(
    null,
  );

  const value = Number(amount) || 0;
  const units = value > 0 && pair.current_rate > 0 ? value / pair.current_rate : 0;
  const insufficient = value > balance;

  async function submit() {
    if (!value || value <= 0) {
      toast.error("Enter a trade amount greater than zero");
      return;
    }
    if (insufficient) {
      toast.error("Insufficient balance");
      return;
    }
    setBusy(true);
    const ref = newTransactionRef("FX");
    try {
      const r = (await buy({
        data: { pairId: pair.id, amount: value, transactionId: ref },
      })) as unknown as {
        units: number;
        amount_invested: number;
        transaction_id: string;
        rate: number;
      };
      setReceipt({
        units: Number(r.units),
        amount: Number(r.amount_invested),
        ref: String(r.transaction_id),
        rate: Number(r.rate ?? pair.current_rate),
      });
      qc.invalidateQueries({ queryKey: ["my-balance"] });
      qc.invalidateQueries({ queryKey: ["my-transactions"] });
      qc.invalidateQueries({ queryKey: ["my-forex-positions"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Trade could not be completed");
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <Dialog title="Forex trade successful" onClose={onClose}>
        <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="size-4" /> Your position is now open.
        </div>
        <div className="mt-4">
          <Row label="Pair" value={pair.pair} />
          <Row label="Rate" value={formatRate(receipt.rate)} />
          <Row label="Units" value={`${formatUnits(receipt.units)} ${pair.base_currency}`} />
          <Row label="Amount invested" value={money(receipt.amount)} strong />
          <Row label="Transaction ID" value={receipt.ref} />
          <Row label="Date" value={new Date().toLocaleString()} />
        </div>
        <Button variant="gold" className="mt-5 w-full" onClick={onClose}>
          Done
        </Button>
      </Dialog>
    );
  }

  return (
    <Dialog title={`Buy ${pair.pair}`} onClose={onClose}>
      <div>
        <Row label="Pair" value={pair.pair} />
        <Row label="Current rate" value={formatRate(pair.current_rate)} />
        <Row label="Available balance" value={money(balance)} />
      </div>

      <label className="mt-4 block text-sm">
        <span className="text-muted-foreground">Enter trade amount</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter trade amount"
          className="mt-1.5"
        />
      </label>

      <p className="mt-2 text-xs text-muted-foreground">
        Estimated units:{" "}
        <span className="text-foreground">
          {formatUnits(units)} {pair.base_currency}
        </span>
      </p>

      {insufficient && (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-semibold">Insufficient balance</p>
          <p className="mt-1">
            Available {money(balance)} · Required {money(value)}. Add funds from the Deposit section
            to complete this trade.
          </p>
        </div>
      )}

      <Button variant="gold" className="mt-5 w-full" disabled={busy} onClick={submit}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirm trade"}
      </Button>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Simulated internal trading. Rates and positions are managed inside Recon Finance and do not
        represent guaranteed real-world market performance.
      </p>
    </Dialog>
  );
}

export function MyForex({ money }: { money: Money }) {
  const { data: positions, isPending } = useMyForexPositions();
  const { data: pairs } = useForexPairs();
  const [selling, setSelling] = useState<ForexPosition | null>(null);

  const pairById = useMemo(
    () => Object.fromEntries((pairs ?? []).map((p) => [p.id, p])),
    [pairs],
  );

  if (isPending) {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const rows = positions ?? [];
  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        You have no currency positions yet. Buy a pair from the Forex Market section to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((p) => {
        const pair = pairById[p.pair_id];
        const rate = effectiveRate(p, pair?.current_rate ?? p.entry_rate);
        const currentValue = p.remaining_units * rate;
        const invested = p.amount_invested - p.amount_sold;
        const pnl = currentValue - Math.max(invested, 0);
        const pct = p.amount_invested > 0 ? (pnl / p.amount_invested) * 100 : 0;
        const closed = p.status === "FULLY_SOLD" || p.remaining_units <= 0.0000000001;
        return (
          <div key={p.id} className="rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{pair?.pair ?? "Currency pair"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Bought {new Date(p.purchased_at).toLocaleDateString()} ·{" "}
                  {positionStatusLabel(p.status)}
                </p>
              </div>
              <span
                className={
                  "rounded-full border px-2.5 py-1 text-xs font-medium " +
                  (pnl >= 0
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-destructive/40 bg-destructive/10 text-destructive")
                }
              >
                {pnl >= 0 ? "+" : "-"}
                {money(Math.abs(pnl))} ({pct >= 0 ? "+" : ""}
                {pct.toFixed(2)}%)
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
              <Cell label="Units" value={formatUnits(p.remaining_units)} />
              <Cell label="Entry rate" value={formatRate(p.entry_rate)} />
              <Cell label="Current rate" value={formatRate(rate)} />
              <Cell label="Amount invested" value={money(p.amount_invested)} />
              <Cell label="Current value" value={money(currentValue)} />
              {p.amount_sold > 0 && <Cell label="Amount sold" value={money(p.amount_sold)} />}
              {p.forecast_direction && (
                <Cell
                  label="Scenario"
                  value={p.forecast_direction === "RISE" ? "Rising" : "Falling"}
                />
              )}
            </div>

            {!closed && (
              <Button
                variant="goldOutline"
                size="sm"
                className="mt-4"
                onClick={() => setSelling(p)}
              >
                Sell
              </Button>
            )}
          </div>
        );
      })}

      {selling && (
        <SellForexDialog
          position={selling}
          pair={pairById[selling.pair_id]}
          money={money}
          onClose={() => setSelling(null)}
        />
      )}
    </div>
  );
}

function SellForexDialog({
  position,
  pair,
  money,
  onClose,
}: {
  position: ForexPosition;
  pair: ForexPair | undefined;
  money: Money;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const sell = useServerFn(sellForex);
  const rate = effectiveRate(position, pair?.current_rate ?? position.entry_rate);
  const available = position.remaining_units * rate;
  const [amount, setAmount] = useState(String(Number(available.toFixed(2))));
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<null | {
    amount: number;
    units: number;
    remaining: number;
    ref: string;
  }>(null);

  const value = Number(amount) || 0;
  const units = available > 0 ? position.remaining_units * (value / available) : 0;

  async function submit() {
    if (!value || value <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    if (value > available + 0.005) {
      toast.error("Amount exceeds the current value of this position");
      return;
    }
    setBusy(true);
    const ref = newTransactionRef("FXSELL");
    try {
      const r = (await sell({
        data: {
          positionId: position.id,
          amount: Math.min(value, available),
          transactionId: ref,
        },
      })) as unknown as {
        amount: number;
        units_sold: number;
        remaining_units: number;
        transaction_id: string;
      };
      setReceipt({
        amount: Number(r.amount),
        units: Number(r.units_sold),
        remaining: Number(r.remaining_units),
        ref: String(r.transaction_id),
      });
      qc.invalidateQueries({ queryKey: ["my-balance"] });
      qc.invalidateQueries({ queryKey: ["my-transactions"] });
      qc.invalidateQueries({ queryKey: ["my-forex-positions"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sale could not be completed");
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <Dialog title="Sale completed" onClose={onClose}>
        <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="size-4" /> Proceeds credited to your balance.
        </div>
        <div className="mt-4">
          <Row label="Pair" value={pair?.pair ?? "Currency pair"} />
          <Row label="Sale rate" value={formatRate(rate)} />
          <Row label="Units sold" value={formatUnits(receipt.units)} />
          <Row label="Amount credited" value={money(receipt.amount)} strong />
          <Row label="Remaining units" value={formatUnits(receipt.remaining)} />
          <Row label="Sale transaction ID" value={receipt.ref} />
          <Row label="Date" value={new Date().toLocaleString()} />
        </div>
        <Button variant="gold" className="mt-5 w-full" onClick={onClose}>
          Done
        </Button>
      </Dialog>
    );
  }

  return (
    <Dialog title="Confirm sale" onClose={onClose}>
      <div>
        <Row label="Pair" value={pair?.pair ?? "Currency pair"} />
        <Row label="Units held" value={formatUnits(position.remaining_units)} />
        <Row label="Entry rate" value={formatRate(position.entry_rate)} />
        <Row label="Current rate" value={formatRate(rate)} />
        <Row label="Current value" value={money(available)} strong />
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="goldOutline"
          size="sm"
          className="flex-1"
          onClick={() => setAmount(String(Number(available.toFixed(2))))}
        >
          Sell all
        </Button>
      </div>

      <label className="mt-3 block text-sm">
        <span className="text-muted-foreground">Sell amount</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1.5"
        />
      </label>

      <div className="mt-3">
        <Row label="Amount available to sell" value={money(available)} />
        <Row label="Estimated units sold" value={formatUnits(units)} />
        <Row label="Transaction fee" value={money(0)} />
        <Row label="Net amount credited" value={money(Math.min(value, available))} strong />
      </div>

      <Button variant="gold" className="mt-5 w-full" disabled={busy} onClick={submit}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirm sale"}
      </Button>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        You are selling at the current recognised rate. Any administrator scenario is a projection
        only and is never credited automatically.
      </p>
    </Dialog>
  );
}
