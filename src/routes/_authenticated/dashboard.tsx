import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  BarChart3,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PriceChart } from "@/components/PriceChart";
import { countryByName, formatMoney } from "@/lib/countries";
import { statusMeta, TONE_CLASSES } from "@/lib/account-status";


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
  { key: "history", label: "Trade History", icon: History },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Account Settings", icon: Settings },
] as const;

type NavKey = (typeof NAV)[number]["key"];

const HOLDINGS = [
  { symbol: "BTC/USD", size: "0.842", entry: 61240, pnl: 6183.4 },
  { symbol: "ETH/USD", size: "12.5", entry: 2980, pnl: -412.8 },
  { symbol: "XAU/USD", size: "40", entry: 2321, pnl: 1288.0 },
  { symbol: "EUR/USD", size: "50k", entry: 1.081, pnl: 265.5 },
];

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
        .select("full_name, username, email, country, currency_code, status, created_at")
        .eq("id", auth.user.id)
        .maybeSingle();
      return data;
    },
  });

  const currency = profile?.currency_code || countryByName(profile?.country)?.currency || "USD";
  const locale = countryByName(profile?.country)?.locale;
  const money = (n: number) => formatMoney(n, currency, locale);
  const status = statusMeta(profile?.status);

  useEffect(() => {
    setOpen(false);
  }, [section]);

  const totalPnl = useMemo(() => HOLDINGS.reduce((a, h) => a + h.pnl, 0), []);


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
            "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-sidebar-border bg-sidebar p-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 " +
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

          <div className="absolute bottom-5 left-5 right-5">
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
                <Stat label="Total Balance" value={money(248930.44)} sub="+2.14% today" positive />
                <Stat label="Equity" value={money(251164.02)} sub="Margin used 18%" />
                <Stat
                  label="Unrealised P&L"
                  value={`${totalPnl >= 0 ? "+" : "-"}${money(Math.abs(totalPnl))}`}
                  sub="Across 4 positions"
                  positive={totalPnl >= 0}
                />
              </div>

              <PriceChart />
              <div className="rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
                <h2 className="font-display text-lg font-semibold">Open positions</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="pb-3">Instrument</th>
                        <th className="pb-3">Size</th>
                        <th className="pb-3">Entry</th>
                        <th className="pb-3 text-right">P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {HOLDINGS.map((h) => (
                        <tr key={h.symbol} className="border-t border-border">
                          <td className="py-3 font-medium">{h.symbol}</td>
                          <td className="py-3 text-muted-foreground">{h.size}</td>
                          <td className="py-3 text-muted-foreground">{h.entry.toLocaleString()}</td>
                          <td
                            className={
                              "py-3 text-right font-medium " +
                              (h.pnl >= 0 ? "text-success" : "text-destructive")
                            }
                          >
                            {h.pnl >= 0 ? "+" : "-"}${Math.abs(h.pnl).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {section === "deposit" && (
            <Panel title="Deposit funds" description="Fund your account to start trading.">
              <div className="grid gap-4 sm:grid-cols-3">
                {["Bank transfer", "Card payment", "Crypto (USDT)"].map((m) => (
                  <div key={m} className="rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="font-medium">{m}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Settlement 1–3 business days</p>
                    <Button variant="goldOutline" size="sm" className="mt-4 w-full">
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {section === "history" && (
            <Panel title="Trade history" description="Your executed orders.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Instrument</th>
                      <th className="pb-3">Side</th>
                      <th className="pb-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["2026-08-06", "BTC/USD", "BUY", 1240.2],
                      ["2026-08-04", "ETH/USD", "SELL", -318.5],
                      ["2026-08-01", "XAU/USD", "BUY", 802.75],
                    ].map((row) => (
                      <tr key={row[0] as string} className="border-t border-border">
                        <td className="py-3 text-muted-foreground">{row[0] as string}</td>
                        <td className="py-3 font-medium">{row[1] as string}</td>
                        <td className="py-3 text-muted-foreground">{row[2] as string}</td>
                        <td
                          className={
                            "py-3 text-right font-medium " +
                            ((row[3] as number) >= 0 ? "text-success" : "text-destructive")
                          }
                        >
                          {(row[3] as number) >= 0 ? "+" : "-"}$
                          {Math.abs(row[3] as number).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {section === "analytics" && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Win rate" value="64.2%" sub="Last 90 days" positive />
                <Stat label="Avg. hold" value="3d 4h" sub="Per position" />
                <Stat label="Sharpe" value="1.84" sub="Risk-adjusted" positive />
              </div>
              <PriceChart symbol="Portfolio value" base={248930} height={260} compact />
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
                  ["Status", profile?.status],
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
