import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/countries";
import {
  POSITION_SELECT,
  STOCK_SELECT,
  effectivePrice,
  formatShares,
  positionStatusLabel,
  type Position,
  type Stock,
} from "@/lib/stocks";
import { numericPosition } from "@/components/dashboard/StockTrade";

type UserInfo = { name: string; email: string; country: string; currency: string };

export function UserStocksDialog({
  users,
  onClose,
}: {
  users: Record<string, UserInfo>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [editing, setEditing] = useState<Position | null>(null);

  const { data: positions, isPending } = useQuery({
    queryKey: ["admin-stock-positions"],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stock_positions")
        .select(POSITION_SELECT)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(numericPosition);
    },
  });

  const { data: stocks } = useQuery({
    queryKey: ["admin-stocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stocks").select(STOCK_SELECT);
      if (error) throw error;
      return (data ?? []).map((s) => ({ ...s, current_price: Number(s.current_price) })) as Stock[];
    },
  });

  const stockById = useMemo(
    () => Object.fromEntries((stocks ?? []).map((s) => [s.id, s])),
    [stocks],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (positions ?? []).filter((p) => {
      const u = users[p.user_id];
      const s = stockById[p.stock_id];
      if (statusFilter && p.status !== statusFilter) return false;
      if (countryFilter && (u?.country ?? "") !== countryFilter) return false;
      if (!q) return true;
      return [
        u?.name,
        u?.email,
        u?.country,
        s?.company_name,
        s?.symbol,
        s?.market,
        p.transaction_id,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [positions, users, stockById, query, statusFilter, countryFilter]);

  const countries = useMemo(
    () => Array.from(new Set(Object.values(users).map((u) => u.country).filter(Boolean))).sort(),
    [users],
  );

  const totals = rows.reduce(
    (acc, p) => {
      const price = effectivePrice(p, stockById[p.stock_id]?.current_price ?? p.purchase_price);
      acc.invested += p.amount_invested;
      acc.current += p.shares * price;
      acc.target += (p.target_price ?? 0) * p.shares;
      acc.holders.add(p.user_id);
      return acc;
    },
    { invested: 0, current: 0, target: 0, holders: new Set<string>() },
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-3">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">User Stocks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All client stock positions, valuations and scenario targets.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <Metric label="Positions" value={String(rows.length)} />
          <Metric label="Holders" value={String(totals.holders.size)} />
          <Metric label="Total invested" value={formatMoney(totals.invested, "USD")} />
          <Metric label="Current value" value={formatMoney(totals.current, "USD")} />
          <Metric label="Target value" value={formatMoney(totals.target, "USD")} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user, email, stock, symbol, country, transaction ID"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PARTIALLY_SOLD">Partially sold</option>
            <option value="FULLY_SOLD">Fully sold</option>
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            aria-label="Filter by country"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {isPending ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1500px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {[
                    "User",
                    "Email",
                    "Country",
                    "Stock",
                    "Symbol",
                    "Market",
                    "Shares",
                    "Purchase price",
                    "Invested",
                    "Current price",
                    "Current value",
                    "Target value",
                    "Amount sold",
                    "Remaining",
                    "Sale price",
                    "Sale date",
                    "Sale txn",
                    "P/L",
                    "Purchased",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap pb-3 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const u = users[p.user_id];
                  const s = stockById[p.stock_id];
                  const cur = u?.currency || "USD";
                  const price = effectivePrice(p, s?.current_price ?? p.purchase_price);
                  const currentValue = p.shares * price;
                  const pnl = currentValue - p.amount_invested;
                  return (
                    <tr key={p.id} className="border-t border-border align-middle">
                      <Td>{u?.name ?? "—"}</Td>
                      <Td>{u?.email ?? "—"}</Td>
                      <Td>{u?.country || "—"}</Td>
                      <Td>{s?.company_name ?? "—"}</Td>
                      <Td>{s?.symbol ?? "—"}</Td>
                      <Td>{s?.market ?? "—"}</Td>
                      <Td>{formatShares(p.shares)}</Td>
                      <Td>{formatMoney(p.purchase_price, cur)}</Td>
                      <Td>{formatMoney(p.amount_invested, cur)}</Td>
                      <Td>{formatMoney(price, cur)}</Td>
                      <Td>{formatMoney(currentValue, cur)}</Td>
                      <Td>{formatMoney((p.target_price ?? 0) * p.shares, cur)}</Td>
                      <Td>{formatMoney(p.amount_sold, cur)}</Td>
                      <Td>{formatMoney(p.remaining_value, cur)}</Td>
                      <Td>{p.sale_price == null ? "—" : formatMoney(p.sale_price, cur)}</Td>
                      <Td>{p.sale_date ? new Date(p.sale_date).toLocaleDateString() : "—"}</Td>
                      <Td>
                        <span className="font-mono text-xs">
                          {p.sale_transaction_id ? p.sale_transaction_id.slice(0, 10) : "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className={pnl >= 0 ? "text-success" : "text-destructive"}>
                          {pnl >= 0 ? "+" : "-"}
                          {formatMoney(Math.abs(pnl), cur)}
                        </span>
                      </Td>
                      <Td>{new Date(p.purchased_at).toLocaleDateString()}</Td>
                      <Td>{positionStatusLabel(p.status)}</Td>
                      <Td>
                        <Button variant="goldOutline" size="sm" onClick={() => setEditing(p)}>
                          Manage
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={21} className="py-10 text-center text-muted-foreground">
                      No stock positions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Target values are administrator scenario projections for simulated internal trading. They
          are never credited automatically and do not represent guaranteed real-world performance.
        </p>

        {editing && (
          <ManagePosition
            position={editing}
            stock={stockById[editing.stock_id]}
            currency={users[editing.user_id]?.currency || "USD"}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["admin-stock-positions"] });
            }}
          />
        )}
      </div>
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="whitespace-nowrap py-3 pr-4">{children}</td>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function ManagePosition({
  position,
  stock,
  currency,
  onClose,
  onSaved,
}: {
  position: Position;
  stock: Stock | undefined;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [targetValue, setTargetValue] = useState(
    position.target_price != null ? String(position.target_price * position.shares) : "",
  );
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(false);

  const price = effectivePrice(position, stock?.current_price ?? position.purchase_price);
  const currentValue = position.shares * price;
  const target = Number(targetValue) || 0;
  const expectedChange = position.amount_invested
    ? ((target - position.amount_invested) / position.amount_invested) * 100
    : 0;

  async function save() {
    if (target <= 0) {
      toast.error("Enter a target value greater than zero");
      return;
    }
    const durationDays = Number(days) || 0;
    if (durationDays <= 0 && !position.target_date) {
      toast.error("Enter how many days the growth should take");
      return;
    }
    const now = new Date();
    const targetDate =
      durationDays > 0
        ? new Date(now.getTime() + durationDays * 86400000).toISOString()
        : position.target_date;
    setBusy(true);
    const { error } = await supabase
      .from("user_stock_positions")
      .update({
        target_price: position.shares > 0 ? target / position.shares : 0,
        target_date: targetDate,
        growth_start_at: now.toISOString(),
      })
      .eq("id", position.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Growth schedule applied — the position now rises to the target");
    onSaved();
  }


  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/85 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lux">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-lg font-semibold">
            Manage {stock?.company_name ?? "position"}
          </h3>
          <button onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <p className="text-muted-foreground">
            Original purchase price:{" "}
            <span className="text-foreground">{formatMoney(position.purchase_price, currency)}</span>
          </p>
          <p className="text-muted-foreground">
            Live price: <span className="text-foreground">{formatMoney(price, currency)}</span>
          </p>
          <p className="text-muted-foreground">
            Invested:{" "}
            <span className="text-foreground">{formatMoney(position.amount_invested, currency)}</span>
          </p>
          <p className="text-muted-foreground">
            Shares: <span className="text-foreground">{formatShares(position.shares)}</span>
          </p>
          <p className="text-muted-foreground">
            Current value:{" "}
            <span className="text-foreground">{formatMoney(currentValue, currency)}</span>
          </p>
          <p className="text-muted-foreground">
            Status: <span className="text-foreground">{positionStatusLabel(position.status)}</span>
          </p>
          <p className="text-muted-foreground">
            Target date:{" "}
            <span className="text-foreground">
              {position.target_date ? new Date(position.target_date).toLocaleDateString() : "—"}
            </span>
          </p>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-muted-foreground">Target value (scenario)</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="mt-1.5"
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-muted-foreground">Duration in days (from today)</span>
          <Input
            type="number"
            min="0"
            step="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="e.g. 30"
            className="mt-1.5"
          />
        </label>

        <p className="mt-3 text-xs text-muted-foreground">
          Expected change vs invested: {expectedChange >= 0 ? "+" : ""}
          {expectedChange.toFixed(2)}%
        </p>

        <Button variant="gold" className="mt-5 w-full" disabled={busy} onClick={save}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Save target"}
        </Button>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          This never changes the live market price and is not a guarantee of performance.
        </p>
      </div>
    </div>
  );
}
