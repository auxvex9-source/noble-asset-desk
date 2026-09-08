import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, LineChart, Loader2, LogOut, Menu, ShieldCheck, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ACCOUNT_STATUSES,
  statusMeta,
  TONE_CLASSES,
  type AccountStatus,
} from "@/lib/account-status";
import { AdminUserActions } from "@/components/admin/AdminUserActions";
import { formatMoney } from "@/lib/countries";
import { WithdrawalsDialog } from "@/components/admin/WithdrawalsDialog";
import { UserStocksDialog } from "@/components/admin/UserStocksDialog";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administrator Panel — Recon Finance" },
      { name: "description", content: "Manage Recon Finance account statuses and client access." },
      { property: "og:title", content: "Administrator Panel — Recon Finance" },
      { property: "og:description", content: "Set account status for every registered client." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});


function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showWithdrawals, setShowWithdrawals] = useState(false);
  const [showStocks, setShowStocks] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");


  const { data: isAdmin, isPending: checkingRole } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
      return Boolean(data);
    },
  });

  const { data: users, isPending } = useQuery({
    queryKey: ["all-profiles"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, country, currency_code, status, created_at, username")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingWithdrawals } = useQuery({
    queryKey: ["pending-withdrawals-count"],
    enabled: isAdmin === true,
    refetchInterval: 15000,
    queryFn: async () => {
      const { count } = await supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING");
      return count ?? 0;
    },
  });

  const { data: balances } = useQuery({
    queryKey: ["all-balances"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_balances")
        .select("user_id, balance, equity, pnl");
      if (error) throw error;
      return Object.fromEntries(
        data.map((b) => [
          b.user_id,
          { balance: Number(b.balance), equity: Number(b.equity), pnl: Number(b.pnl) },
        ]),
      );
    },
  });


  async function setStatus(id: string, status: AccountStatus) {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Status set to ${statusMeta(status).label}`);
    queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
  }


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  function handleDeleted(userId: string) {
    queryClient.setQueryData(
      ["all-profiles"],
      (current: typeof users | undefined) => current?.filter((user) => user.id !== userId),
    );
    queryClient.setQueryData(
      ["all-balances"],
      (current: Record<string, { balance: number; equity: number; pnl: number }> | undefined) => {
        if (!current) return current;
        const next = { ...current };
        delete next[userId];
        return next;
      },
    );
  }

  if (checkingRole) {
    return (
      <div className="grid min-h-screen place-items-center bg-hero">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-hero px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">Administrator access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have administrator privileges.
          </p>
          <Button asChild variant="goldOutline" className="mt-6">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const attention =
    users?.filter((u) => u.status !== "ACTIVE" && u.status !== "PENDING_APPROVAL").length ?? 0;

  return (
    <div className="min-h-screen bg-hero px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-gradient text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Administrator
              </p>
              <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
                Account status control
              </h1>
            </div>
          </div>
          <Button
            variant="gold"
            size="icon"
            aria-label="Open admin actions"
            title="Open admin actions"
            onClick={() => setShowAdminMenu(true)}
          >
            <Menu className="size-5" />
          </Button>
        </header>

        <AdminActionsMenu
          open={showAdminMenu}
          onOpenChange={setShowAdminMenu}
          users={users ?? []}
          balance={selectedUserId ? balances?.[selectedUserId] : undefined}
          selectedUserId={selectedUserId}
          onUserChange={setSelectedUserId}
          pendingWithdrawals={pendingWithdrawals ?? 0}
          onShowStocks={() => {
            setShowAdminMenu(false);
            setShowStocks(true);
          }}
          onShowWithdrawals={() => {
            setShowAdminMenu(false);
            setShowWithdrawals(true);
          }}
          onDeleted={() => {
            if (selectedUserId) handleDeleted(selectedUserId);
            setSelectedUserId("");
          }}
          onSignOut={signOut}
        />

        {showWithdrawals && (
          <WithdrawalsDialog
            users={Object.fromEntries(
              (users ?? []).map((u) => [
                u.id,
                { name: u.full_name || u.username || u.email, currency: u.currency_code || "USD" },
              ]),
            )}
            onClose={() => setShowWithdrawals(false)}
          />
        )}

        {showStocks && (
          <UserStocksDialog
            users={Object.fromEntries(
              (users ?? []).map((u) => [
                u.id,
                {
                  name: u.full_name || u.username || u.email,
                  email: u.email,
                  country: u.country || "",
                  currency: u.currency_code || "USD",
                },
              ]),
            )}
            onClose={() => setShowStocks(false)}
          />
        )}


        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Total accounts" value={String(users?.length ?? 0)} />
          <Metric label="Needs action" value={String(attention)} />
          <Metric
            label="Active"
            value={String(users?.filter((u) => u.status === "ACTIVE").length ?? 0)}
          />
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-lux sm:p-6">
          {isPending ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3">User ID</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Country</th>
                    <th className="pb-3">Currency</th>
                    <th className="pb-3">Balance</th>
                    <th className="pb-3">Registered</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Set status</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => {
                    const meta = statusMeta(u.status);
                    const bal = balances?.[u.id];
                    const cur = u.currency_code || "USD";
                    return (
                      <tr key={u.id} className="border-t border-border align-middle">
                        <td className="py-3 font-mono text-xs text-muted-foreground">
                          {u.id.slice(0, 8)}
                        </td>
                        <td className="py-3 font-medium">{u.full_name || u.username || "—"}</td>
                        <td className="py-3 text-muted-foreground">{u.email}</td>
                        <td className="py-3 text-muted-foreground">{u.country || "—"}</td>
                        <td className="py-3 text-muted-foreground">{cur}</td>
                        <td className="py-3 font-medium">
                          {formatMoney(bal?.balance ?? 0, cur)}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <span
                            className={
                              "whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium " +
                              TONE_CLASSES[meta.tone]
                            }
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3">
                          <select
                            aria-label={`Set status for ${u.email}`}
                            value={ACCOUNT_STATUSES.includes(u.status as AccountStatus) ? u.status : ""}
                            onChange={(e) => setStatus(u.id, e.target.value as AccountStatus)}
                            className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="" disabled>
                              Select status
                            </option>
                            {ACCOUNT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {statusMeta(s).label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}


                  {!users?.length && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-muted-foreground">
                        No registrations yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lux">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

type AdminMenuUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string;
  currency_code: string | null;
};

function AdminActionsMenu({
  open,
  onOpenChange,
  users,
  balance,
  selectedUserId,
  onUserChange,
  pendingWithdrawals,
  onShowStocks,
  onShowWithdrawals,
  onDeleted,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AdminMenuUser[];
  balance: { balance: number; equity: number; pnl: number } | undefined;
  selectedUserId: string;
  onUserChange: (userId: string) => void;
  pendingWithdrawals: number;
  onShowStocks: () => void;
  onShowWithdrawals: () => void;
  onDeleted: () => void;
  onSignOut: () => void;
}) {
  const selectedUser = users.find((user) => user.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Menu className="size-5 text-primary" />
            Admin actions
          </DialogTitle>
          <DialogDescription>
            Choose a client first, then open the action you need. Shared admin tools are below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block text-sm">
            <span className="flex items-center gap-2 font-medium">
              <UserRound className="size-4 text-primary" /> Select client
            </span>
            <select
              value={selectedUserId}
              onChange={(event) => onUserChange(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose a client…</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.username || user.email} · {user.email}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
            <Button variant="goldOutline" className="justify-start" onClick={onShowStocks}>
              <LineChart className="size-4" /> User Stocks
            </Button>
            <Button variant="gold" className="justify-start" onClick={onShowWithdrawals}>
              <BadgeCheck className="size-4" />
              Approve withdrawal
              {pendingWithdrawals ? ` (${pendingWithdrawals})` : ""}
            </Button>
          </div>

          {selectedUser ? (
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Client actions · {selectedUser.full_name || selectedUser.username || selectedUser.email}
              </p>
              <AdminUserActions
                userId={selectedUser.id}
                name={selectedUser.full_name || selectedUser.username || selectedUser.email}
                email={selectedUser.email}
                currency={selectedUser.currency_code || "USD"}
                balance={balance}
                onDeleted={onDeleted}
              />
            </div>
          ) : (
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">
              Select a client to access balance, overview, history, password recovery, NFT chart, and
              account deletion.
            </p>
          )}

          <Button variant="ghost" className="w-full" onClick={onSignOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
