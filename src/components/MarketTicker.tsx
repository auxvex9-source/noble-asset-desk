import { useEffect, useRef, useState } from "react";

const INSTRUMENTS = [
  { symbol: "BTC/USD", price: 68420.15, dp: 2 },
  { symbol: "ETH/USD", price: 3542.8, dp: 2 },
  { symbol: "XAU/USD", price: 2418.44, dp: 2 },
  { symbol: "EUR/USD", price: 1.0874, dp: 4 },
  { symbol: "GBP/USD", price: 1.2731, dp: 4 },
  { symbol: "US500", price: 5482.6, dp: 1 },
  { symbol: "NAS100", price: 19842.3, dp: 1 },
  { symbol: "USOIL", price: 78.92, dp: 2 },
  { symbol: "SOL/USD", price: 168.24, dp: 2 },
];

type Tick = { price: number; change: number };

function drift(price: number, seedRef: { s: number }, vol: number) {
  seedRef.s = (seedRef.s * 1103515245 + 12345) % 2147483648;
  const r = seedRef.s / 2147483648 - 0.5;
  return price * (1 + r * vol);
}

export function MarketTicker() {
  const seed = useRef({ s: 42 });
  const [ticks, setTicks] = useState<Tick[]>(() =>
    INSTRUMENTS.map((i) => ({ price: i.price, change: 0 })),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTicks((prev) =>
        prev.map((t, idx) => {
          const next = drift(t.price, seed.current, 0.0035);
          const base = INSTRUMENTS[idx]!.price;
          return { price: next, change: ((next - base) / base) * 100 };
        }),
      );
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const row = INSTRUMENTS.map((inst, idx) => {
    const t = ticks[idx]!;
    const up = t.change >= 0;
    return (
      <span key={inst.symbol} className="flex items-center gap-2 px-5 text-sm">
        <span className="font-medium tracking-wide text-foreground">{inst.symbol}</span>
        <span className="tabular-nums text-muted-foreground transition-colors duration-500">
          {t.price.toLocaleString(undefined, {
            minimumFractionDigits: inst.dp,
            maximumFractionDigits: inst.dp,
          })}
        </span>
        <span className={up ? "tabular-nums text-success" : "tabular-nums text-destructive"}>
          {up ? "▲" : "▼"} {Math.abs(t.change).toFixed(2)}%
        </span>
      </span>
    );
  });

  return (
    <div className="relative flex overflow-hidden border-y border-border bg-card/60 py-2.5 backdrop-blur">
      <div className="marquee flex shrink-0 items-center">{row}</div>
      <div className="marquee flex shrink-0 items-center" aria-hidden="true">
        {row}
      </div>
    </div>
  );
}
