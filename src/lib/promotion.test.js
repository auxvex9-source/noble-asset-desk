import { describe, expect, test } from "bun:test";
import {
  PROMOTION_DEADLINE,
  PROMOTION_DURATION_MS,
  PROMOTION_STARTS_AT,
  getPromotionState,
} from "./promotion.ts";

describe("subscriber promotion schedule", () => {
  test("uses one 72-hour deadline starting five hours before the Nov 16 update", () => {
    expect(new Date(PROMOTION_STARTS_AT).toISOString()).toBe("2026-11-15T21:33:00.000Z");
    expect(PROMOTION_DURATION_MS).toBe(72 * 60 * 60 * 1000);
    expect(new Date(PROMOTION_DEADLINE).toISOString()).toBe("2026-11-18T21:33:00.000Z");
    expect(getPromotionState(PROMOTION_DEADLINE).isActive).toBe(false);
  });
});