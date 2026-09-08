import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Search, TrendingDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  POSITION_SELECT,
  STOCK_SELECT,
  effectivePrice,
  formatShares,
  newTransactionRef,
  positionStatusLabel,
  type Position,
  type Stock,
} from "@/lib/stocks";

export function useStocks() {
  return useQuery({
    queryKey: ["stocks"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stocks")
        .select(STOCK_SELECT)
        .eq("status", "ACTIVE")
        .order("company_name");
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        current_price: Number(s.current_price),
        price_change: Number(s.price_change),
        percentage_change: Number(s.percentage_change),
      })) as Stock[];
    },
  });
}

export function useMyPositions() {
  return useQuery({
    queryKey: ["my-stock-positions"],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as Position[];
      const { data, error } = await supabase
        .from("user_stock_positions")
        .select(POSITION_SELECT)
        .eq("user_id", auth.user.id)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(numericPosition);
    },
  });
}

export function numericPosition(p: Record<string, unknown>): Position {
  return {
    ...(p as unknown as Position),
    shares: Number(p["shares"]),
    purchase_price: Number(p["purchase_price"]),
    amount_invested: Number(p["amount_invested"]),
    current_value: Number(p["current_value"]),
    remaining_value: Number(p["remaining_value"]),
    amount_sold: Number(p["amount_sold"]),
    target_price: p["target_price"] == null ? null : Number(p["target_price"]),
    sale_price: p["sale_price"] == null ? null : Number(p["sale_price"]),
  };
}

type Money = (n: number) => string;

export function StockTrade({
  country,
  balance,
  money,
}: {
  country: string;
  balance: number;
  money: Money;
}) {
  const [query, setQuery] = useState("");
  const [buying, setBuying] = useState<Stock | null>(null);
  const { data: stocks, isPending } = useStocks();

  const list = useMemo(() => {
    const all = stocks ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter((s) =>
          [s.company_name, s.symbol, s.market, s.country].some((v) =>
            v.toLowerCase().includes(q),
          ),
        )
      : all;
    const local = filtered.filter((s) => s.country.toLowerCase() === country.toLowerCase());
    const rest = filtered.filter((s) => s.country.toLowerCase() !== country.toLowerCase());
    return { local, rest };
  }, [stocks, query, country]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
        <h2 className="font-display text-lg font-semibold">Stock Trade</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore stocks available in your market and popular stocks from around the world.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Your market: <span className="text-foreground">{country || "Global"}</span> · Available
          balance: <span className="text-foreground">{money(balance)}</span>
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stocks…"
            className="pl-9"
            aria-label="Search stocks"
          />
        </div>
      </div>

      {isPending ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {list.local.length > 0 && (
            <StockGroup
              title={`Stocks in ${country}`}
              stocks={list.local}
              onBuy={setBuying}
            />
          )}
          <StockGroup
            title={list.local.length ? "Popular stocks worldwide" : "Popular stocks"}
            stocks={list.rest}
            onBuy={setBuying}
          />
          {!list.local.length && !list.rest.length && (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No stocks match “{query}”.
            </p>
          )}
        </>
      )}

      {buying && (
        <BuyDialog
          stock={buying}
          balance={balance}
          money={money}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}

function StockGroup({
  title,
  stocks,
  onBuy,
}: {
  title: string;
  stocks: Stock[];
  onBuy: (s: Stock) => void;
}) {
  if (!stocks.length) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stocks.map((s) => {
          const up = s.percentage_change >= 0;
          return (
            <div
              key={s.id}
              className="rounded-xl border border-border bg-secondary/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.company_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.symbol} · {s.market} · {s.country}
                  </p>
                </div>
                <span
                  className={
                    "flex shrink-0 items-center gap-1 text-xs font-medium " +
                    (up ? "text-success" : "text-destructive")
                  }
                >
                  {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {up ? "+" : ""}
                  {s.percentage_change.toFixed(2)}%
                </span>
              </div>
              <p className="mt-3 font-display text-xl font-bold">
                {s.currency} {s.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                Today: {s.price_change >= 0 ? "+" : ""}
                {s.price_change.toFixed(2)} {s.currency}
              </p>
              <Button variant="gold" size="sm" className="mt-3 w-full" onClick={() => onBuy(s)}>
                Buy stock
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

function BuyDialog({
  stock,
  balance,
  money,
  onClose,
}: {
  stock: Stock;
  balance: number;
  money: Money;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<null | { shares: number; amount: number; ref: string }>(null);

  const value = Number(amount) || 0;
  const shares = value > 0 && stock.current_price > 0 ? value / stock.current_price : 0;
  const insufficient = value > balance;

  async function submit() {
    if (!value || value <= 0) {
      toast.error("Enter an investment amount greater than zero");
      return;
    }
    if (insufficient) {
      toast.error("Insufficient balance");
      return;
    }
    setBusy(true);
    const ref = newTransactionRef("BUY");
    const { data, error } = await supabase.rpc("buy_stock", {
      p_stock_id: stock.id,
      p_amount: value,
      p_transaction_id: ref,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as unknown as { shares: number; amount_invested: number; transaction_id: string };
    setReceipt({
      shares: Number(result.shares),
      amount: Number(result.amount_invested),
      ref: result.transaction_id,
    });
    qc.invalidateQueries({ queryKey: ["my-balance"] });
    qc.invalidateQueries({ queryKey: ["my-transactions"] });
    qc.invalidateQueries({ queryKey: ["my-stock-positions"] });
  }

  if (receipt) {
    return (
      <Dialog title="Stock purchase successful" onClose={onClose}>
        <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="size-4" /> Your position is now open.
        </div>
        <div className="mt-4">
          <Row label="Stock" value={`${stock.company_name} (${stock.symbol})`} />
          <Row label="Market" value={`${stock.market} · ${stock.country}`} />
          <Row label="Price paid" value={`${stock.currency} ${stock.current_price.toFixed(2)}`} />
          <Row label="Shares" value={formatShares(receipt.shares)} />
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
    <Dialog title={`Buy ${stock.company_name}`} onClose={onClose}>
      <div>
        <Row label="Stock" value={`${stock.company_name} (${stock.symbol})`} />
        <Row label="Market" value={`${stock.market} · ${stock.country}`} />
        <Row
          label="Current price"
          value={`${stock.currency} ${stock.current_price.toFixed(2)}`}
        />
        <Row label="Available balance" value={money(balance)} />
      </div>

      <label className="mt-4 block text-sm">
        <span className="text-muted-foreground">Enter investment amount</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter investment amount"
          className="mt-1.5"
        />
      </label>

      <p className="mt-2 text-xs text-muted-foreground">
        Estimated shares: <span className="text-foreground">{formatShares(shares)}</span>
      </p>

      {insufficient && (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-semibold">Insufficient balance</p>
          <p className="mt-1">
            Available {money(balance)} · Required {money(value)}. Add funds from the Deposit
            section to complete this purchase.
          </p>
        </div>
      )}

      <Button variant="gold" className="mt-5 w-full" disabled={busy} onClick={submit}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirm purchase"}
      </Button>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Simulated internal trading. Prices and positions are managed inside Recon Finance and do
        not represent guaranteed real-world market performance.
      </p>
    </Dialog>
  );
}

export function MyStocks({ money }: { money: Money }) {
  const { data: positions, isPending } = useMyPositions();
  const { data: stocks } = useStocks();
  const [selling, setSelling] = useState<Position | null>(null);

  const stockById = useMemo(
    () => Object.fromEntries((stocks ?? []).map((s) => [s.id, s])),
    [stocks],
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
        You have no stock positions yet. Buy a stock from the Stock Trade section to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((p) => {
        const s = stockById[p.stock_id];
        const price = effectivePrice(p, s?.current_price ?? p.purchase_price);
        const currentValue = p.shares * price;
        const pnl = currentValue - p.amount_invested;
        const pct = p.amount_invested > 0 ? (pnl / p.amount_invested) * 100 : 0;
        const closed = p.status === "FULLY_SOLD" || p.shares <= 0.00000001;
        return (
          <div key={p.id} className="rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {s?.company_name ?? "Stock"}{" "}
                  <span className="text-muted-foreground">({s?.symbol ?? "—"})</span>
                </p>
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
              <Cell label="Shares" value={formatShares(p.shares)} />
              <Cell label="Purchase price" value={money(p.purchase_price)} />
              <Cell label="Current price" value={money(price)} />
              <Cell label="Amount invested" value={money(p.amount_invested)} />
              <Cell label="Current value" value={money(currentValue)} />
              {p.amount_sold > 0 && <Cell label="Amount sold" value={money(p.amount_sold)} />}
              {p.target_price != null && p.target_price > 0 && (
                <Cell
                  label="Target value (scheduled)"
                  value={money(p.target_price * p.shares)}
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
        <SellDialog
          position={selling}
          stock={stockById[selling.stock_id]}
          money={money}
          onClose={() => setSelling(null)}
        />
      )}
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

function SellDialog({
  position,
  stock,
  money,
  onClose,
}: {
  position: Position;
  stock: Stock | undefined;
  money: Money;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const price = effectivePrice(position, stock?.current_price ?? position.purchase_price);
  const available = position.shares * price;
  const [amount, setAmount] = useState(String(Number(available.toFixed(2))));
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<null | {
    sold: number;
    shares: number;
    remaining: number;
    ref: string;
  }>(null);

  const value = Number(amount) || 0;
  const shares = available > 0 ? position.shares * (value / available) : 0;

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
    const ref = newTransactionRef("SELL");
    const { data, error } = await supabase.rpc("sell_stock", {
      p_position_id: position.id,
      p_amount: Math.min(value, available),
      p_transaction_id: ref,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const r = data as unknown as {
      sold_amount: number;
      shares_sold: number;
      remaining_value: number;
      sale_transaction_id: string;
    };
    setReceipt({
      sold: Number(r.sold_amount),
      shares: Number(r.shares_sold),
      remaining: Number(r.remaining_value),
      ref: String(r.sale_transaction_id),
    });
    qc.invalidateQueries({ queryKey: ["my-balance"] });
    qc.invalidateQueries({ queryKey: ["my-transactions"] });
    qc.invalidateQueries({ queryKey: ["my-stock-positions"] });
  }

  if (receipt) {
    return (
      <Dialog title="Sale completed" onClose={onClose}>
        <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="size-4" /> Proceeds credited to your balance.
        </div>
        <div className="mt-4">
          <Row label="Stock" value={`${stock?.company_name ?? "Stock"} (${stock?.symbol ?? "—"})`} />
          <Row label="Sale price" value={money(price)} />
          <Row label="Shares sold" value={formatShares(receipt.shares)} />
          <Row label="Amount credited" value={money(receipt.sold)} strong />
          <Row label="Remaining position value" value={money(receipt.remaining)} />
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
        <Row label="Stock" value={`${stock?.company_name ?? "Stock"} (${stock?.symbol ?? "—"})`} />
        <Row label="Shares held" value={formatShares(position.shares)} />
        <Row label="Purchase amount" value={money(position.amount_invested)} />
        <Row label="Purchase price" value={money(position.purchase_price)} />
        <Row label="Current price" value={money(price)} />
        <Row label="Current value" value={money(available)} strong />
        {position.target_price != null && position.target_price > 0 && (
          <Row label="Scheduled target value" value={money(position.target_price * position.shares)} />
        )}
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
        <Row label="Estimated shares sold" value={formatShares(shares)} />
        <Row label="Transaction fee" value={money(0)} />
        <Row label="Net amount credited" value={money(Math.min(value, available))} strong />
      </div>

      <Button variant="gold" className="mt-5 w-full" disabled={busy} onClick={submit}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirm sale"}
      </Button>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        You are selling at the current recognised value. Any administrator target value is a
        scenario projection only and is never credited automatically.
      </p>
    </Dialog>
  );
}
