import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const deleteUserInput = z.object({
  userId: z.string().uuid(),
});

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteUserInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      throw new Error("Administrator access required");
    }

    if (data.userId === context.userId) {
      throw new Error("You cannot delete the administrator account you are using");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const userScopedTables = [
      "nft_charts",
      "withdrawal_requests",
      "transactions",
      "account_balances",
      "user_roles",
    ] as const;

    for (const table of userScopedTables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", data.userId);
      if (error) throw new Error(`Could not remove ${table}: ${error.message}`);
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", data.userId);
    if (profileError) throw new Error(`Could not remove profile: ${profileError.message}`);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(data.userId, false);
    if (authError) throw new Error(`Could not remove login account: ${authError.message}`);

    return { ok: true };
  });