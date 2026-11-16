import { useEffect, useState } from "react";
import { BadgePercent, Timer } from "lucide-react";

import { getPromotionState, PROMOTION_DEADLINE } from "@/lib/promotion";

function formatCountdown(remainingMs: number) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [days, hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function PromoBanner() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const promotion = now === null ? null : getPromotionState(now);

  return (
    <section
      aria-label="New subscriber bonus promotion"
      className="border-b border-success/40 bg-success/10 px-4 py-5 sm:px-6 sm:py-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row sm:gap-8">
        <div className="flex min-w-0 items-center gap-3 text-center sm:text-left">
          <span className="grid size-11 shrink-0 place-items-center rounded-full border border-success/40 bg-success/10 text-success sm:size-12">
            <BadgePercent className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-xl font-extrabold leading-tight text-success sm:text-2xl">
              300% BONUS
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground sm:text-base">
              For every new subscriber — promotion ongoing
            </p>
          </div>
        </div>

        {promotion?.isActive && (
          <div className="w-full max-w-sm sm:w-auto sm:min-w-72">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase text-success sm:justify-start">
              <Timer className="size-4" aria-hidden="true" />
              <span>72-hour offer ends in</span>
            </div>
            <p
              className="mt-1 text-center font-mono text-2xl font-bold tabular-nums text-foreground sm:text-left"
              aria-label={`Time remaining: ${formatCountdown(promotion.remainingMs)}`}
              aria-live="off"
            >
              {formatCountdown(promotion.remainingMs)}
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-success/20"
              role="progressbar"
              aria-label="Promotion time elapsed"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.floor(promotion.progressPercent)}
            >
              <div
                className="h-full rounded-full bg-success transition-[width] duration-1000"
                style={{ width: `${promotion.progressPercent}%` }}
              />
            </div>
            <span className="sr-only">
              Promotion deadline: {new Date(PROMOTION_DEADLINE).toUTCString()}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}