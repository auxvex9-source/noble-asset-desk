import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Recon Finance" },
      { name: "description", content: "Choose a new secure password for your Recon Finance account." },
      { property: "og:title", content: "Reset Password — Recon Finance" },
      { property: "og:description", content: "Choose a new secure password for your Recon Finance account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [isRecovery, setIsRecovery] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setIsRecovery(hash.get("type") === "recovery");
    setReady(true);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    const password = String(values.get("password") ?? "");
    const confirmation = String(values.get("confirmation") ?? "");
    const parsed = passwordSchema.safeParse(password);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Choose a stronger password");
      return;
    }
    if (password !== confirmation) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUpdated(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-hero px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lux sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-gradient text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">
              Recon<span className="text-primary">Finance</span>
            </p>
            <p className="text-xs text-muted-foreground">Secure account recovery</p>
          </div>
        </div>

        {!ready ? (
          <div className="grid place-items-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : updated ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-4 font-display text-2xl font-bold">Password updated</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your new password is ready to use.</p>
            <Button
              variant="gold"
              className="mt-6 w-full"
              onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
            >
              Continue to sign in
            </Button>
          </div>
        ) : !isRecovery ? (
          <div>
            <h1 className="font-display text-2xl font-bold">Invalid or expired link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Request a new password-reset link from the sign-in page, or contact support if email delivery is unavailable.
            </p>
            <Button
              variant="gold"
              className="mt-6 w-full"
              onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
            >
              Return to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
              <p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirm new password</Label>
              <Input
                id="confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Update password
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}