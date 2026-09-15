import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteStockChannel,
  pauseStockChannel,
  resumeStockChannel,
  setStockChannel,
} from "@/lib/stock-channel.functions";
import { STOCK_CHANNEL_SELECT, STOCK_SELECT, numericChannel, type Stock } from "@/lib/stocks";

export function StockChannelDialog({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const apply = useServerFn(setStockChannel);
  const pause = useServerFn(pauseStockChannel);
  const resume = useServerFn(resumeStockChannel);
  const remove = useServerFn(deleteStockChannel);
  const [stockId, setStockId] = useState("");
  const [direction, setDirection] = useState<"RISE" | "FALL">("RISE");
  const [target, setTarget] = useState("");
  const [days, setDays] = useState("2");
  const [unit, setUnit] = useState<"MINUTES" | "DAYS">("DAYS");
  const [busy, setBusy] = useState(false);

  const { data: stocks, isPending } = useQuery({
    queryKey: ["stocks-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stocks")
        .select(STOCK_SELECT)
        .order("company_name");
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        current_price: Number(s.current_price),
      })) as Stock[];
    },
  });

  const { data: channels, refetch } = useQuery({
    queryKey: ["stock-channels", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_user_controls")
        .select(STOCK_CHANNEL_SELECT)
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((c) => numericChannel(c as unknown as Record<string, unknown>));
    },
  });

  const selected = stocks?.find((s) => s.id === stockId);

  useEffect(() => {
    if (!selected) return;
    const suggestion = selected.current_price * (direction === "RISE" ? 1.5 : 0.6);
    setTarget(suggestion.toFixed(2));
  }, [selected?.id, selected?.current_price, direction, selected]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete that action");
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const duration = Number(days);
    const targetPrice = Number(target);
    if (!stockId) return toast.error("Choose a stock");
    if (!targetPrice || targetPrice <= 0) return toast.error("Enter a target price");
    if (!duration || duration < 1)
      return toast.error(
        unit === "MINUTES" ? "Enter at least one minute" : "Enter a duration of at least one day",
      );
    const durationMinutes = Math.round(duration) * (unit === "MINUTES" ? 1 : 1440);
    return run(
      () =>
        apply({
          data: {
            userId,
            stockId,
            direction,
            targetPrice,
            durationMinutes,
          },
        }),
      "Price channel applied for this client",
    );
  }

  const stockName = (id: string) => {
    const s = stocks?.find((x) => x.id === id);
    return s ? `${s.company_name} (${s.symbol})` : "Stock";
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lux">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Price channel</h3>
            <p className="mt-1 text-sm text-muted-foreground">{userName}</p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {isPending ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className="text-muted-foreground">Stock</span>
              <select
                value={stockId}
                onChange={(e) => setStockId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choose a stock…</option>
                {(stocks ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name} ({s.symbol}) · {s.currency} {s.current_price.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <p className="text-xs text-muted-foreground">
                Current price:{" "}
                <span className="text-foreground">
                  {selected.currency} {selected.current_price.toFixed(2)}
                </span>
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">Direction</span>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as "RISE" | "FALL")}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="RISE">Rise</option>
                  <option value="FALL">Fall</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Target price</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. 600"
                  className="mt-1.5"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Duration (days)</span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="mt-1.5"
                />
              </label>
            </div>

            <Button variant="gold" className="w-full" disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Apply price channel"}
            </Button>

            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Active channels
              </p>
              {channels?.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {channels.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl border border-border bg-secondary/40 p-3 text-xs"
                    >
                      <p className="font-medium text-foreground">
                        {stockName(c.stock_id)} ·{" "}
                        {c.paused ? "Stopped" : c.direction === "RISE" ? "Rising" : "Falling"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {c.start_price.toFixed(2)} →{" "}
                        {(c.resume_target ?? c.target_price).toFixed(2)}
                        {c.paused ? "" : ` · ends ${new Date(c.end_at).toLocaleDateString()}`}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {c.paused ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => resume({ data: { userId, stockId: c.stock_id } }),
                                "Channel continued",
                              )
                            }
                          >
                            Continue
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => pause({ data: { userId, stockId: c.stock_id } }),
                                "Channel stopped",
                              )
                            }
                          >
                            Stop
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () => remove({ data: { userId, stockId: c.stock_id } }),
                              "Channel deleted",
                            )
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No price channel set for this client yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
