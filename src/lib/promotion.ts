export const PROMOTION_DURATION_MS = 72 * 60 * 60 * 1000;

// Shared UTC start: five hours before the user's Nov 16, 2026 02:33 UTC update.
export const PROMOTION_STARTS_AT = Date.UTC(2026, 10, 15, 21, 33, 0);
export const PROMOTION_DEADLINE = PROMOTION_STARTS_AT + PROMOTION_DURATION_MS;

export function getPromotionState(now: number) {
  const remainingMs = Math.max(0, PROMOTION_DEADLINE - now);

  return {
    remainingMs,
    isActive: remainingMs > 0,
    progressPercent: Math.min(
      100,
      Math.max(0, ((now - PROMOTION_STARTS_AT) / PROMOTION_DURATION_MS) * 100),
    ),
  };
}