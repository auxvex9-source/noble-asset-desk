import { useEffect, useMemo, useState } from "react";
import { Activity, Gem, Sparkles, Users } from "lucide-react";

export const NFT_ASSETS: { key: string; label: string }[] = [
  { key: "BTC", label: "Bitcoin (BTC)" },
  { key: "USDT", label: "Tether (USDT)" },
  { key: "USDC", label: "USD Coin (USDC)" },
  { key: "XRP", label: "Ripple (XRP)" },
];

export type NftChartConfig = {
  title: string;
  collection: string;
  floor_price: number;
  change_pct: number;
  volume: number;
  holders: number;
  accent: string;
  seed: number;
  asset?: string;
  live_status?: string;
  start_value?: number;
  target_value?: number;
  start_at?: string | null;
  end_at?: string | null;
  frozen_value?: number | null;
};

/** Progress 0..1 of a live run at time `now`. */
export function liveProgress(config: NftChartConfig, now: number) {
  if (!config.start_at || !config.end_at) return 0;
  const s = new Date(config.start_at).getTime();
  const e = new Date(config.end_at).getTime();
  if (!(e > s)) return 1;
  return Math.min(1, Math.max(0, (now - s) / (e - s)));
}

export function liveValue(config: NftChartConfig, now: number) {
  const from = Number(config.start_value ?? 0);
  const to = Number(config.target_value ?? 0);
  if (config.live_status === "STOPPED" && config.frozen_value != null) {
    return Number(config.frozen_value);
  }
  if (config.live_status !== "RUNNING") return config.floor_price;
  return from + (to - from) * liveProgress(config, now);
}

export const NFT_ACCENTS: { key: string; label: string; from: string; to: string }[] = [
  { key: "gold", label: "Gold", from: "oklch(0.82 0.14 85)", to: "oklch(0.62 0.13 60)" },
  { key: "aurora", label: "Aurora", from: "oklch(0.80 0.16 190)", to: "oklch(0.60 0.20 280)" },
  { key: "magenta", label: "Magenta", from: "oklch(0.78 0.20 340)", to: "oklch(0.58 0.20 300)" },
  { key: "emerald", label: "Emerald", from: "oklch(0.80 0.16 160)", to: "oklch(0.55 0.14 190)" },
];

export function accentPair(key: string) {
  return NFT_ACCENTS.find((a) => a.key === key) ?? NFT_ACCENTS[0]!;
}

const RANGES = ["24H", "7D", "30D", "ALL"] as const;
type Range = (typeof RANGES)[number];

const RANGE_CFG: Record<Range, { points: number; vol: number; salt: number }> = {
  "24H": { points: 24, vol: 0.05, salt: 3 },
  "7D": { points: 28, vol: 0.09, salt: 11 },
  "30D": { points: 30, vol: 0.14, salt: 23 },
  ALL: { points: 40, vol: 0.2, salt: 47 },
};

/** Deterministic series so SSR and client render identically. */
function series(seed: number, points: number, base: number, vol: number) {
  const out: number[] = [];
  let value = Math.max(base, 1);
  let s = Math.abs(seed) % 2147483647 || 7;
  for (let i = 0; i < points; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const r = s / 2147483648 - 0.48;
    value = Math.max(value * (1 + r * vol) + Math.sin(i / 4) * base * 0.01, base * 0.15);
    out.push(value);
  }
  return out;
}

export function NftChart({ config, money }: { config: NftChartConfig; money: (n: number) => string }) {
  const [range, setRange] = useState<Range>("7D");
  const [now, setNow] = useState<number | null>(null);
  const running = config.live_status === "RUNNING";

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running, config.start_at, config.end_at]);

  const cfg = RANGE_CFG[range];
  const accent = accentPair(config.accent);
  const live = config.live_status === "RUNNING" || config.live_status === "STOPPED";
  const current = live ? liveValue(config, now ?? new Date(config.start_at ?? 0).getTime()) : config.floor_price;
  const progress = running ? liveProgress(config, now ?? new Date(config.start_at ?? 0).getTime()) : 1;
  const base = current > 0 ? current : config.floor_price > 0 ? config.floor_price : 1000;

  const data = useMemo(() => {
    const raw = series(config.seed + cfg.salt, cfg.points, base, cfg.vol);
    if (!live) return raw;
    const from = Number(config.start_value ?? 0) || base * 0.6;
    const shown = Math.max(1, Math.round(cfg.points * (running ? Math.max(progress, 0.08) : 1)));
    return raw.slice(0, shown).map((v, i, arr) => {
      const t = arr.length === 1 ? 1 : i / (arr.length - 1);
      const ramp = from + (current - from) * t;
      return ramp * (0.97 + (v / base) * 0.03);
    });
  }, [config.seed, config.start_value, cfg, base, live, running, progress, current]);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const w = 1000;
  const h = 300;
  const barW = w / data.length;
  const toY = (v: number) => 16 + (1 - (v - min) / (max - min || 1)) * (h - 48);
  const line = data
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * barW + barW / 2).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(" ");
  const up = config.change_pct >= 0;
  const gid = `nft-${config.accent}`;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full opacity-25 blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent.from}, transparent 70%)` }}
      />

      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-xl text-background"
            style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
          >
            <Gem className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="size-3" /> {config.collection}
            </p>
            <h2 className="truncate font-display text-lg font-bold sm:text-xl">{config.title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 rounded-full border border-border bg-secondary/60 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors " +
                (r === range
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-baseline gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Floor price</span>
        <span className="font-display text-2xl font-bold sm:text-3xl">{money(config.floor_price)}</span>
        <span className={"text-sm font-medium " + (up ? "text-success" : "text-destructive")}>
          {up ? "+" : ""}
          {Number(config.change_pct).toFixed(2)}%
        </span>
      </div>

      <div className="relative mt-4 h-[260px]">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent.from} stopOpacity="0.95" />
              <stop offset="100%" stopColor={accent.to} stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1="0"
              x2={w}
              y1={h * p}
              y2={h * p}
              stroke="currentColor"
              className="text-border"
              strokeWidth="1"
            />
          ))}
          {data.map((v, i) => {
            const y = toY(v);
            return (
              <rect
                key={i}
                x={i * barW + barW * 0.18}
                y={y}
                width={barW * 0.64}
                height={h - 12 - y}
                rx={barW * 0.3}
                fill={`url(#${gid})`}
              />
            );
          })}
          <path
            d={line}
            fill="none"
            stroke={accent.from}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
        <Tile icon={Activity} label="Volume" value={money(config.volume)} />
        <Tile icon={Users} label="Holders" value={config.holders.toLocaleString()} />
        <Tile icon={Gem} label="Floor high" value={money(max)} />
        <Tile icon={Gem} label="Floor low" value={money(min)} />
      </div>
    </section>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gem;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}
