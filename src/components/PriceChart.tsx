import { useMemo, useState } from "react";

const TIMEFRAMES = ["1H", "1D", "1W", "1M", "1Y"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/** Deterministic pseudo-random series so SSR and client render identically. */
function series(seed: number, points: number, base: number, vol: number) {
  const out: number[] = [];
  let value = base;
  let s = seed;
  for (let i = 0; i < points; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const r = s / 2147483648 - 0.5;
    value = value * (1 + r * vol) + Math.sin(i / 7) * base * 0.0015;
    out.push(value);
  }
  return out;
}

const SEEDS: Record<Timeframe, { seed: number; points: number; vol: number }> = {
  "1H": { seed: 7, points: 60, vol: 0.004 },
  "1D": { seed: 19, points: 96, vol: 0.008 },
  "1W": { seed: 53, points: 84, vol: 0.014 },
  "1M": { seed: 101, points: 90, vol: 0.02 },
  "1Y": { seed: 211, points: 120, vol: 0.03 },
};

export function PriceChart({
  symbol = "BTC / USD",
  base = 68420,
  height = 280,
  compact = false,
}: {
  symbol?: string;
  base?: number;
  height?: number;
  compact?: boolean;
}) {
  const [tf, setTf] = useState<Timeframe>("1D");
  const cfg = SEEDS[tf];
  const data = useMemo(() => series(cfg.seed, cfg.points, base, cfg.vol), [cfg, base]);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const last = data[data.length - 1] ?? base;
  const first = data[0] ?? base;
  const change = ((last - first) / first) * 100;
  const up = change >= 0;

  const w = 1000;
  const h = 320;
  const pad = 12;
  const toX = (i: number) => (i / (data.length - 1)) * w;
  const toY = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(2)},${toY(v).toFixed(2)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-[0.2em] text-muted-foreground">{symbol}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-2xl font-bold sm:text-3xl">
              {last.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className={up ? "text-sm font-medium text-success" : "text-sm font-medium text-destructive"}>
              {up ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 rounded-full border border-border bg-secondary/60 p-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors " +
                (t === tf
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4" style={{ height }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="reconFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
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
          <path d={area} fill="url(#reconFill)" />
          <path d={line} fill="none" stroke="var(--gold)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-4">
          {[
            ["High", max],
            ["Low", min],
            ["Open", first],
            ["Last", last],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{label as string}</p>
              <p className="font-medium">
                {(value as number).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
