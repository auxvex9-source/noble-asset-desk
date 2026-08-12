import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Lock, Save, User } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES, countryByName } from "@/lib/countries";
import { statusMeta, TONE_CLASSES } from "@/lib/account-status";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency_code: string | null;
  avatar_url: string | null;
  status: string | null;
};

export function useAvatarUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}

export function AccountSettings({ profile }: { profile: Profile | null | undefined }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setUsername(profile?.username ?? "");
    setPhone(profile?.phone ?? "");
    setCountry(profile?.country ?? "");
  }, [profile?.id, profile?.full_name, profile?.username, profile?.phone, profile?.country]);

  const avatar = useAvatarUrl(profile?.avatar_url);
  const status = statusMeta(profile?.status);
  const currency = countryByName(country)?.currency || profile?.currency_code || "USD";

  async function onPickFile(file: File) {
    if (!profile?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", profile.id);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    toast.success("Profile picture updated");
  }

  async function save() {
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        country,
        currency_code: currency,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    toast.success("Account settings saved");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-secondary/40 p-5 sm:flex-row sm:items-center">
        <div className="relative">
          <div className="grid size-20 place-items-center overflow-hidden rounded-full border border-primary/40 bg-background">
            {avatar ? (
              <img src={avatar} alt="Your profile picture" className="h-full w-full object-cover" />
            ) : (
              <User className="size-8 text-muted-foreground" />
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile picture"
            className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-lux"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          </button>
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="font-display text-lg font-semibold">{fullName || username || "Trader"}</p>
          <p className="text-xs text-muted-foreground">JPG or PNG, up to 5 MB. Change it anytime.</p>
          <Button
            variant="goldOutline"
            size="sm"
            className="mt-3"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="size-3.5" /> {profile?.avatar_url ? "Change picture" : "Upload picture"}
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onPickFile(f);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
        </Field>
        <Field label="Username">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        </Field>
        <Field label="Phone number">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
        </Field>
        <Field label="Country">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Account currency">
          <div className="flex h-11 items-center rounded-md border border-border bg-secondary/50 px-3 text-sm">
            {currency}
          </div>
        </Field>
        <Field label="Email address" locked>
          <div className="flex h-11 items-center truncate rounded-md border border-border bg-secondary/50 px-3 text-sm text-muted-foreground">
            {profile?.email || "—"}
          </div>
        </Field>
        <Field label="Account status" locked>
          <div
            className={
              "flex h-11 items-center rounded-md border px-3 text-sm font-medium " + TONE_CLASSES[status.tone]
            }
          >
            {status.label}
          </div>
        </Field>
      </div>

      <p className="text-xs text-muted-foreground">
        Email address and account status are managed by Recon Finance and cannot be edited here. Contact
        support if either needs to change.
      </p>

      <Button variant="gold" onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
  locked,
}: {
  label: string;
  children: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {label} {locked && <Lock className="size-3" />}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
