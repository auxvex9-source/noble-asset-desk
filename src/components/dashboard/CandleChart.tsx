import { useEffect, useMemo, useRef, useState } from "react";

export type Candle = { o: number; h: number; l: number; c: number; v: number };

const TIMEFRAMES = ["15m", "1H", "4H", "1D", "1W"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

const TF_CONFIG: Record<Timeframe, { points: number; vol: number; seed: number }> = {
  "15m": { points: 48, vol: 0.0012, seed: 11 },
  "1H": { points: 56, vol: 0.0025, seed: 29 },
  "4H": { points: 60, vol: 0.005, seed: 47 },
  "1D": { points: 64, vol: 0.009, seed: 83 },
  "1W": { points: 70, vol: 0.018, seed: 137 },
};

function hashSeed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 2147483647) || 7;
}

/** Deterministic candles so the server and browser render the same first frame. */
function buildCandles(
  seed: number,
  points: number,
  endPrice: number,
  vol: number,
  drift: number,
  bias = 0,
) {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648 - 0.5;
  };
  const out: Candle[] = [];
  let price = endPrice / (1 + drift);
  for (let i = 0; i < points; i++) {
    const open = price;
    const r = rand();
    // With a rising scenario most candles close green (and vice versa),
    // while still showing normal up-and-down movement.
    const rising = r + bias * 0.36 > 0;
    const magnitude = Math.abs(r) * vol * 2;
    const move = (rising ? magnitude : -magnitude) + (drift * 2) / points;
    const close = open * (1 + move);

    const wick = Math.abs(rand()) * vol * open + open * vol * 0.15;
    out.push({
      o: open,
      c: close,
      h: Math.max(open, close) + wick,
      l: Math.min(open, close) - wick,
      v: 0.35 + Math.abs(rand()) * 1.3,
    });
    price = close;
  }
  // Anchor the final close to the live price.
  const last = out[out.length - 1];
  if (last) {
    const shift = endPrice / last.c;
    for (const c of out) {
      c.o *= shift;
      c.c *= shift;
      c.h *= shift;
      c.l *= shift;
    }
    last.c = endPrice;
    last.h = Math.max(last.h, endPrice);
    last.l = Math.min(last.l, endPrice);
  }
  return out;
}

export function CandleChart({
  symbol,
  price,
  changePct,
  bias = 0,
  format,
  height = 300,
}: {
  symbol: string;
  price: number;
  changePct: number;
  /** >0 pushes the live candle up, <0 pushes it down. */
  bias?: number;
  format: (n: number) => string;
  height?: number;
}) {
  const [tf, setTf] = useState<Timeframe>("1H");
  const cfg = TF_CONFIG[tf];
  const seed = useMemo(() => hashSeed(symbol + tf) + cfg.seed, [symbol, tf, cfg.seed]);
  const base = useMemo(
    () => buildCandles(seed, cfg.points, price, cfg.vol, changePct / 100),
    [seed, cfg.points, cfg.vol, price, changePct],
  );

  const [candles, setCandles] = useState<Candle[]>(base);
  const tick = useRef(0);
  useEffect(() => setCandles(base), [base]);

  // Live movement: the newest candle breathes, and a fresh candle forms periodically.
  useEffect(() => {
    const id = window.setInterval(() => {
      setCandles((prev) => {
        if (!prev.length) return prev;
        const next = prev.map((c) => ({ ...c }));
        const last = next[next.length - 1]!;
        const drift = (Math.random() - 0.5 + bias * 0.55) * cfg.vol * last.c;
        last.c = Math.max(last.c + drift, last.c * 0.5);
        last.h = Math.max(last.h, last.c);
        last.l = Math.min(last.l, last.c);
        last.v = Math.min(2, Math.max(0.2, last.v + (Math.random() - 0.5) * 0.2));
        tick.current += 1;
        if (tick.current % 8 === 0) {
          next.shift();
          next.push({ o: last.c, c: last.c, h: last.c, l: last.c, v: 0.4 + Math.random() });
        }
        return next;
      });
    }, 1200);
    return () => window.clearInterval(id);
  }, [cfg.vol, bias]);

  const live = candles[candles.length - 1]?.c ?? price;
  const first = candles[0]?.o ?? price;
  const pct = first ? ((live - first) / first) * 100 : 0;
  const up = pct >= 0;
  const high = Math.max(...candles.map((c) => c.h));
  const low = Math.min(...candles.map((c) => c.l));
  const span = high - low || 1;

  const w = 1000;
  const h = 320;
  const volH = 60;
  const bodyH = h - volH - 8;
  const step = w / candles.length;
  const bw = Math.max(2, step * 0.6);
  const toY = (v: number) => 8 + (1 - (v - low) / span) * (bodyH - 16);
  const maxVol = Math.max(...candles.map((c) => c.v)) || 1;

  const gridPrices = [0, 0.25, 0.5, 0.75, 1].map((p) => high - span * p);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lux">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {symbol}
          </p>
          <p
            className={
              "mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl " +
              (up ? "text-success" : "text-destructive")
            }
          >
            {format(live)}
          </p>
          <p
            className={
              "text-sm font-medium " + (up ? "text-success" : "text-destructive")
            }
          >
            {up ? "+" : ""}
            {pct.toFixed(2)}%
          </p>
        </div>
        <div className="shrink-0 space-y-1 text-right text-xs text-muted-foreground">
          <p>
            High <span className="text-foreground tabular-nums">{format(high)}</span>
          </p>
          <p>
            Low <span className="text-foreground tabular-nums">{format(low)}</span>
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className={
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors " +
              (t === tf
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
          {gridPrices.map((_, i) => (
            <line
              key={i}
              x1="0"
              x2={w}
              y1={8 + (i / 4) * (bodyH - 16)}
              y2={8 + (i / 4) * (bodyH - 16)}
              stroke="currentColor"
              className="text-border"
              strokeWidth="1"
            />
          ))}
          {candles.map((c, i) => {
            const x = i * step + step / 2;
            const rising = c.c >= c.o;
            const color = rising ? "var(--success)" : "var(--destructive)";
            const yTop = toY(Math.max(c.o, c.c));
            const yBot = toY(Math.min(c.o, c.c));
            return (
              <g key={i}>
                <line
                  x1={x}
                  x2={x}
                  y1={toY(c.h)}
                  y2={toY(c.l)}
                  stroke={color}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={x - bw / 2}
                  y={yTop}
                  width={bw}
                  height={Math.max(1.5, yBot - yTop)}
                  fill={color}
                />
                <rect
                  x={x - bw / 2}
                  y={h - volH + (1 - c.v / maxVol) * volH}
                  width={bw}
                  height={(c.v / maxVol) * volH}
                  fill={color}
                  opacity="0.35"
                />
              </g>
            );
          })}
          <line
            x1="0"
            x2={w}
            y1={toY(live)}
            y2={toY(live)}
            stroke={up ? "var(--success)" : "var(--destructive)"}
            strokeDasharray="6 6"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="pointer-events-none absolute inset-y-0 right-1 hidden flex-col justify-between py-2 text-[10px] tabular-nums text-muted-foreground sm:flex">
          {gridPrices.map((p, i) => (
            <span key={i}>{format(p)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
