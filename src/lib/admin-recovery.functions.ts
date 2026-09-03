import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const recoveryInput = z.object({
  email: z.string().trim().email().max(255),
});

export const generateAdminRecoveryLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => recoveryInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      throw new Error("Administrator access required");
    }

    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    if (!request) throw new Error("Could not determine the recovery URL");

    const redirectTo = new URL("/reset-password", request.url).toString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: generated, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo },
    });

    if (error) throw new Error(error.message);

    const actionLink = generated.properties?.action_link;
    if (!actionLink) throw new Error("The recovery link could not be generated");

    return { actionLink };
  });