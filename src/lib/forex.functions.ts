import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const buyInput = z.object({
  pairId: z.string().uuid(),
  amount: z.number().positive(),
  transactionId: z.string().min(8),
});

const sellInput = z.object({
  positionId: z.string().uuid(),
  amount: z.number().positive(),
  transactionId: z.string().min(8),
});

const scheduleInput = z.object({
  userId: z.string().uuid(),
  pairId: z.string().uuid(),
  direction: z.enum(["RISE", "FALL"]),
  targetRate: z.number().positive(),
  durationMinutes: z.number().int().min(1).max(5256000),
});

const controlInput = z.object({
  userId: z.string().uuid(),
  pairId: z.string().uuid(),
});


export const buyForex = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => buyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("buy_forex", {
      p_user_id: context.userId,
      p_pair_id: data.pairId,
      p_amount: data.amount,
      p_transaction_id: data.transactionId,
    });
    if (error) throw new Error(error.message);
    return result as unknown as Record<string, string | number | boolean | null>;
  });

export const sellForex = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sellInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("sell_forex", {
      p_user_id: context.userId,
      p_position_id: data.positionId,
      p_amount: data.amount,
      p_transaction_id: data.transactionId,
    });
    if (error) throw new Error(error.message);
    return result as unknown as Record<string, string | number | boolean | null>;
  });

export const setForexSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scheduleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Administrator access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("set_forex_schedule", {
      p_user_id: data.userId,
      p_pair_id: data.pairId,
      p_direction: data.direction,
      p_target_rate: data.targetRate,
      p_duration_minutes: data.durationMinutes,
    });
    if (error) throw new Error(error.message);
    return result as unknown as Record<string, string | number | boolean | null>;
  });

function adminControlFn(rpc: "pause_forex_schedule" | "resume_forex_schedule" | "delete_forex_schedule") {
  return createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) => controlInput.parse(input))
    .handler(async ({ data, context }) => {
      const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (roleError || !isAdmin) throw new Error("Administrator access required");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: result, error } = await supabaseAdmin.rpc(rpc, {
        p_user_id: data.userId,
        p_pair_id: data.pairId,
      });
      if (error) throw new Error(error.message);
      return result as unknown as Record<string, string | number | boolean | null>;
    });
}

export const pauseForexSchedule = adminControlFn("pause_forex_schedule");
export const resumeForexSchedule = adminControlFn("resume_forex_schedule");
export const deleteForexSchedule = adminControlFn("delete_forex_schedule");

