"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USER_ROLES } from "@/config/constants/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminCountrySelect } from "@/components/admin/admin-country-select";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { adminDeleteUser, adminUpdateUser } from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

/** Admin form to edit user profile, role, and ban status. */
export function AdminUserForm({ user, linkedAccounts = [], currentUserId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    country: user.country || "",
    city: user.city || "",
    locale: user.locale || "en",
    role: user.role || "user",
    banned: Boolean(user.banned),
    banReason: "",
  });

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    const result = await adminUpdateUser(user.id, form);
    setLoading(false);

    if (result?.success) {
      toast.success("User updated");
      router.refresh();
      return;
    }
    toast.error(result?.error ?? "Could not save");
  }

  async function handleDelete() {
    const label = user.name || user.email || "this user";
    if (
      !window.confirm(
        `Delete ${label}? This permanently removes their account, listings, pets, uploads, and all activity logs. This cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    const result = await adminDeleteUser(user.id);
    setLoading(false);

    if (result?.success) {
      toast.success("User deleted");
      router.push("/admin/users");
      router.refresh();
      return;
    }

    toast.error(result?.error ?? "Could not delete user");
  }

  const canDelete = currentUserId !== user.id;

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/users" label="Back to users" />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit user</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Email is managed by the auth provider and cannot be changed here.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <AdminCountrySelect
                  value={form.country}
                  onChange={(code) => update("country", code)}
                />
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Locale</Label>
                  <Select value={form.locale} onValueChange={(v) => update("locale", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fa">Persian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => update("role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Admins can promote or demote any user, including other admins.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Banned</Label>
                  <p className="text-xs text-muted-foreground">Banned users cannot sign in or post.</p>
                </div>
                <Switch checked={form.banned} onCheckedChange={(v) => update("banned", v)} />
              </div>

              {form.banned ? (
                <div className="space-y-2">
                  <Label htmlFor="banReason">Ban reason (optional)</Label>
                  <Input
                    id="banReason"
                    value={form.banReason}
                    onChange={(e) => update("banReason", e.target.value)}
                    placeholder="Included in the suspension email when banning"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only sent when changing status from active to banned.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
            {canDelete ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                Delete user
              </Button>
            ) : null}
          </div>
        </div>

        {/* Sidebar — activity & auth */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {user.publicId ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Public ID</p>
                  <p className="mt-1 font-mono text-xs">{user.publicId}</p>
                  <Link
                    href={`/${user.locale || "en"}/users/${user.publicId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    View public profile
                  </Link>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Role</p>
                <div className="mt-1"><AdminStatusBadge value={form.role} /></div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Listings today</p>
                <p className="mt-1 font-medium">{user.listingsToday ?? 0}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Listings this month</p>
                <p className="mt-1 font-medium">{user.listingsThisMonth ?? 0}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Confirmed violations</p>
                <p className="mt-1 font-medium">{user.confirmedViolationCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Joined</p>
                <p className="mt-1">{user.createdAt ? formatDate(user.createdAt) : "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Last updated</p>
                <p className="mt-1">{user.updatedAt ? formatDate(user.updatedAt) : "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sign-in providers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {linkedAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No linked OAuth accounts</p>
              ) : (
                linkedAccounts.map((account) => (
                  <div key={account.providerId} className="rounded-lg border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">{account.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {account.linkedAt ? formatDate(account.linkedAt) : "—"}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                      {account.accountId}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
