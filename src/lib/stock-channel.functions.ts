import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const channelInput = z.object({
  userId: z.string().uuid(),
  stockId: z.string().uuid(),
  direction: z.enum(["RISE", "FALL"]),
  targetPrice: z.number().positive(),
  durationMinutes: z.number().int().min(1).max(5256000),
});

const controlInput = z.object({
  userId: z.string().uuid(),
  stockId: z.string().uuid(),
});

export const setStockChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => channelInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Administrator access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("set_stock_channel", {
      p_user_id: data.userId,
      p_stock_id: data.stockId,
      p_direction: data.direction,
      p_target_price: data.targetPrice,
      p_duration_minutes: data.durationMinutes,
    });
    if (error) throw new Error(error.message);
    return result as unknown as Record<string, string | number | boolean | null>;
  });

function adminControlFn(rpc: "pause_stock_channel" | "resume_stock_channel" | "delete_stock_channel") {
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
        p_stock_id: data.stockId,
      });
      if (error) throw new Error(error.message);
      return result as unknown as Record<string, string | number | boolean | null>;
    });
}

export const pauseStockChannel = adminControlFn("pause_stock_channel");
export const resumeStockChannel = adminControlFn("resume_stock_channel");
export const deleteStockChannel = adminControlFn("delete_stock_channel");
