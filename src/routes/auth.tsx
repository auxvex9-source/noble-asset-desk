import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRIES, countryByName } from "@/lib/countries";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).catch("signin"),
});


export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign In or Register — Recon Finance" },
      {
        name: "description",
        content:
          "Access your Recon Finance trading account or register for a new account. All new accounts are reviewed by an administrator.",
      },
      { property: "og:title", content: "Sign In or Register — Recon Finance" },
      {
        property: "og:description",
        content: "Secure access to the Recon Finance trading platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(30),
  country: z.string().trim().min(2, "Select your country").max(60),
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const isSignUp = mode === "signup";

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: fd.get("fullName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      country: fd.get("country"),
      username: fd.get("username"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          country: parsed.data.country,
          username: parsed.data.username,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" } });
    setBanner("Registration successful. Your account is pending administrator approval.");
  }

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message ?? "Invalid credentials");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", data.user.id)
      .maybeSingle();
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });

    if (!isAdmin && profile?.status !== "ACTIVE") {
      await supabase.auth.signOut();
      setLoading(false);
      const message =
        profile?.status === "DECLINED"
          ? "Your registration was declined. Please contact support."
          : "Account awaiting administrator approval.";
      setBanner(message);
      toast.error(message);
      return;
    }

    setLoading(false);
    navigate({ to: isAdmin ? "/admin" : "/dashboard" });
  }

  return (
    <main className="grid min-h-screen bg-hero lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient font-display text-sm font-bold text-primary-foreground">
            R
          </span>
          <span className="font-display text-lg font-semibold">
            Recon<span className="text-primary">Finance</span>
          </span>
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Institutional-grade execution, <span className="text-gold-gradient">verified access</span>.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every Recon Finance account is manually reviewed by our compliance desk before trading
            privileges are granted.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Passwords are hashed and never stored in plain text.
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="font-display text-lg font-semibold">
              Recon<span className="text-primary">Finance</span>
            </Link>
          </div>

          <h1 className="font-display text-3xl font-bold">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignUp
              ? "Submit your details for compliance review."
              : "Sign in to access your trading dashboard."}
          </p>

          {banner && (
            <div className="mt-6 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-foreground">
              {banner}
            </div>
          )}

          {isSignUp ? (
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <Field name="fullName" label="Full name" placeholder="Ada Lovelace" />
              <Field name="username" label="Username" placeholder="ada.l" />
              <Field name="email" label="Email" type="email" placeholder="you@example.com" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="phone" label="Phone number" placeholder="+1 555 000 1234" />
                <Field name="country" label="Country" placeholder="United States" />
              </div>
              <Field name="password" label="Password" type="password" placeholder="Min. 8 characters" />
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />} Create account
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already registered?{" "}
                <Link to="/auth" search={{ mode: "signin" }} className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <Field name="email" label="Email" type="email" placeholder="you@example.com" />
              <Field name="password" label="Password" type="password" placeholder="Your password" />
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />} Sign in
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                New to Recon Finance?{" "}
                <Link to="/auth" search={{ mode: "signup" }} className="text-primary hover:underline">
                  Register
                </Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} autoComplete="off" />
    </div>
  );
}
