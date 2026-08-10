import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CandlestickChart,
  Globe2,
  Layers,
  LockKeyhole,
  TrendingUp,
  Wallet,
} from "lucide-react";


import heroImage from "@/assets/hero-recon.jpg";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { PriceChart } from "@/components/PriceChart";
import { MarketTicker } from "@/components/MarketTicker";
import { LiveMarketGrid } from "@/components/LiveMarketGrid";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recon Finance — Modern Online Trading Platform" },
      {
        name: "description",
        content:
          "Trade global markets with institutional-grade execution, live charting and vetted account access. Register for a Recon Finance account today.",
      },
      { property: "og:title", content: "Recon Finance — Modern Online Trading Platform" },
      {
        property: "og:description",
        content:
          "Institutional-grade execution, live charting and compliance-reviewed account access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CandlestickChart,
    title: "Multi-asset execution",
    body: "Crypto, FX, metals and indices from a single margin account with sub-50ms routing.",
  },
  {
    icon: Activity,
    title: "Live market data",
    body: "Streaming price action with timeframe controls from one hour to one year.",
  },
  {
    icon: LockKeyhole,
    title: "Vetted access",
    body: "Every registration is reviewed by our compliance desk before trading is enabled.",
  },
  {
    icon: Wallet,
    title: "Flexible funding",
    body: "Bank transfer, card and stablecoin deposits with transparent settlement windows.",
  },
  {
    icon: Layers,
    title: "Portfolio analytics",
    body: "Win rate, Sharpe and exposure breakdowns updated with every fill.",
  },
  {
    icon: Globe2,
    title: "Global coverage",
    body: "Clients across 60+ countries served by a 24/5 desk and regional settlement.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <MarketTicker />


      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-hero">
          <div className="absolute inset-0 grid-lines opacity-40" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                Markets live · Compliance-reviewed accounts
              </span>

              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
                Trade global markets with{" "}
                <span className="text-gold-gradient">precision capital</span>.
              </h1>
              <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
                Recon Finance pairs institutional execution infrastructure with a disciplined
                onboarding process — so every account on the book is verified.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="gold" size="lg">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Open an account <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="goldOutline" size="lg">
                  <Link to="/auth" search={{ mode: "signin" }}>
                    Sign in
                  </Link>
                </Button>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-8">
                {[
                  ["$4.2B", "Monthly volume"],
                  ["60+", "Countries served"],
                  ["24/5", "Trading desk"],
                ].map((s) => (
                  <div key={s[1]}>
                    <dt className="font-display text-2xl font-bold text-primary">{s[0]}</dt>
                    <dd className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                      {s[1]}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                alt="Gold candlestick and wave chart artwork on a deep navy background"
                width={1536}
                height={1024}
                className="w-full rounded-3xl border border-border object-cover shadow-lux"
              />
            </div>
          </div>
        </section>

        {/* Live chart */}
        <section id="markets" className="border-y border-border bg-navy-deep py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Live market view</h2>
              <p className="mt-3 text-muted-foreground">
                Read-only charting across our most traded instruments. Full order entry unlocks once
                your account is approved.
              </p>
            </div>
            <div className="mt-10">
              <LiveMarketGrid />
            </div>
            <div className="mt-6">
              <PriceChart />
            </div>

          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Built for serious capital
              </h2>
              <p className="mt-3 text-muted-foreground">
                Everything you need to research, execute and review — without the retail clutter.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/40 text-primary transition-colors group-hover:bg-primary/10">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-t border-border bg-navy-deep py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Security is the product
              </h2>
              <p className="mt-4 text-muted-foreground">
                Credentials are hashed with industry-standard algorithms and never stored or
                displayed in plain text. Sessions are managed with signed tokens, and account
                privileges are governed by server-side status flags.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "Hashed credentials — no plain-text password storage",
                  "Manual administrator approval before trading access",
                  "Row-level access control on every account record",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-primary/30 bg-card p-8 shadow-gold">
              <h3 className="font-display text-xl font-semibold">Ready to apply?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Submit your details and our compliance desk will review your registration.
              </p>
              <Button asChild variant="gold" size="lg" className="mt-6 w-full">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Register now
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* About Us */}
        <section id="about" className="border-t border-border bg-hero py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary">
                <TrendingUp className="size-3.5" />
                About Recon Finance
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
                Built to grow and protect your capital
              </h2>
              <p className="mt-4 text-muted-foreground">
                Recon Finance is an online trading platform designed for investors who want
                access to global markets, disciplined risk controls, and transparent performance
                tracking. We combine institutional-grade execution with a compliance-first
                onboarding process, so every account on the book is verified before it can
                place a single trade.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <article className="rounded-2xl border border-border bg-card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/40 text-primary">
                  <BarChart3 className="size-5" strokeWidth={1.5} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold">Strategic investment access</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Trade crypto, FX, precious metals, and indices from one margin account. Our
                  routing infrastructure targets fast, reliable fills across volatile and stable
                  market conditions.
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/40 text-primary">
                  <TrendingUp className="size-5" strokeWidth={1.5} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold">Profit-driven performance</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Track equity, P&L, win rate, and risk-adjusted returns in real time. Our
                  analytics suite surfaces the metrics that matter so you can make informed
                  decisions and compound profits consistently.
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6 sm:col-span-2 lg:col-span-1">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/40 text-primary">
                  <Wallet className="size-5" strokeWidth={1.5} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold">Capital preservation first</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We treat security and compliance as product features, not afterthoughts. Every
                  position, deposit, and withdrawal sits behind row-level access controls, and
                  accounts remain protected while pursuing growth.
                </p>
              </article>
            </div>

            <div className="mt-12 flex justify-center">
              <Button asChild variant="gold" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start investing today <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>


      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 Recon Finance. Trading involves risk of capital loss.</p>
          <Link to="/auth" search={{ mode: "signin" }} className="hover:text-foreground">
            Client login
          </Link>
        </div>
      </footer>
    </div>
  );
}
