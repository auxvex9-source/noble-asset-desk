import { useEffect, useRef, useState } from "react";

const MARKETS = [
  { symbol: "BTC/USD", name: "Bitcoin", base: 68420, dp: 2 },
  { symbol: "XAU/USD", name: "Gold Spot", base: 2418.4, dp: 2 },
  { symbol: "EUR/USD", name: "Euro / Dollar", base: 1.0874, dp: 4 },
  { symbol: "NAS100", name: "Nasdaq 100", base: 19842, dp: 1 },
];

function makeSeries(seed: number, base: number, n = 32) {
  const out: number[] = [];
  let v = base;
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    v = v * (1 + (s / 2147483648 - 0.5) * 0.012);
    out.push(v);
  }
  return out;
}

function path(data: number[], w = 120, h = 36) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = 2 + (1 - (v - min) / (max - min || 1)) * (h - 4);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function LiveMarketGrid() {
  const seedRef = useRef(991);
  const [series, setSeries] = useState<number[][]>(() =>
    MARKETS.map((m, i) => makeSeries(17 + i * 31, m.base)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSeries((prev) =>
        prev.map((s) => {
          seedRef.current = (seedRef.current * 1103515245 + 12345) % 2147483648;
          const last = s[s.length - 1]!;
          const next = last * (1 + (seedRef.current / 2147483648 - 0.5) * 0.012);
          return [...s.slice(1), next];
        }),
      );
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {MARKETS.map((m, i) => {
        const data = series[i]!;
        const last = data[data.length - 1]!;
        const change = ((last - m.base) / m.base) * 100;
        const up = change >= 0;
        return (
          <article
            key={m.symbol}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.symbol}</p>
                <p className="truncate text-xs text-muted-foreground">{m.name}</p>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                Live
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold tabular-nums">
                  {last.toLocaleString(undefined, {
                    minimumFractionDigits: m.dp,
                    maximumFractionDigits: m.dp,
                  })}
                </p>
                <p
                  className={
                    up
                      ? "text-xs font-medium tabular-nums text-success"
                      : "text-xs font-medium tabular-nums text-destructive"
                  }
                >
                  {up ? "+" : ""}
                  {change.toFixed(2)}%
                </p>
              </div>
              <svg viewBox="0 0 120 36" className="h-9 w-[120px] shrink-0" aria-hidden="true">
                <path
                  d={path(data)}
                  fill="none"
                  stroke={up ? "var(--success)" : "var(--destructive)"}
                  strokeWidth="1.75"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </article>
        );
      })}
    </div>
  );
}
