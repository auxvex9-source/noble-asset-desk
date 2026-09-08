import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setForexSchedule } from "@/lib/forex.functions";
import { FOREX_PAIR_SELECT, formatRate, numericPair } from "@/lib/forex";

export function ForexStatsDialog({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const schedule = useServerFn(setForexSchedule);
  const [pairId, setPairId] = useState("");
  const [direction, setDirection] = useState<"RISE" | "FALL">("RISE");
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);

  const { data: pairs, isPending } = useQuery({
    queryKey: ["forex-pairs-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forex_pairs")
        .select(FOREX_PAIR_SELECT)
        .order("pair");
      if (error) throw error;
      return (data ?? []).map((p) => numericPair(p as unknown as Record<string, unknown>));
    },
  });

  const { data: controls, refetch } = useQuery({
    queryKey: ["forex-controls", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forex_user_controls")
        .select("id, pair_id, direction, start_rate, target_rate, start_at, end_at, enabled")
        .eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function apply() {
    const duration = Number(days);
    if (!pairId) {
      toast.error("Choose a currency pair");
      return;
    }
    if (!duration || duration < 1) {
      toast.error("Enter a duration of at least one day");
      return;
    }
    setBusy(true);
    try {
      await schedule({
        data: { userId, pairId, direction, durationDays: Math.round(duration) },
      });
      toast.success("Scenario applied for this client");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply the scenario");
    } finally {
      setBusy(false);
    }
  }

  const pairName = (id: string) => pairs?.find((p) => p.id === id)?.pair ?? "Pair";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lux">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Forex scenario</h3>
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
              <span className="text-muted-foreground">Currency pair</span>
              <select
                value={pairId}
                onChange={(e) => setPairId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choose a pair…</option>
                {(pairs ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pair} · {formatRate(p.current_rate)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
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

            <Button variant="gold" className="w-full" disabled={busy} onClick={apply}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Apply scenario"}
            </Button>

            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Active scenarios
              </p>
              {controls?.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {controls.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl border border-border bg-secondary/40 p-3 text-xs"
                    >
                      <p className="font-medium text-foreground">
                        {pairName(c.pair_id)} · {c.direction === "RISE" ? "Rising" : "Falling"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {formatRate(Number(c.start_rate))} → {formatRate(Number(c.target_rate))} ·
                        ends {new Date(c.end_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No scenario set for this client yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
