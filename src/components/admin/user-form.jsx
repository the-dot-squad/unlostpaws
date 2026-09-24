"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { USER_ROLES } from "@/config/constants/enums";
import { MAX_CITY, MAX_NAME, MAX_NOTE, MAX_USERNAME } from "@/config/constants/field-limits";
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
import {
  adminDeleteUser,
  adminUpdateUser,
  adminGrantPremium,
  adminRevokePremium,
} from "@/lib/actions/admin";
import { isPremium } from "@/lib/premium/entitlements";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

const GRANT_OPTIONS = [
  { value: "0", label: "Forever" },
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "5", label: "5 years" },
];

/** Sub-component for editing user profile information, role, and status. */
function EditUserCard({ form, user, update }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit user</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user.email || ""} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">
            Email is managed by the auth provider and cannot be changed here.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name || ""}
              onChange={(e) => update("name", e.target.value)}
              maxLength={MAX_NAME}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} />
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <div>
                <Label htmlFor="admin-phone-verified" className="text-sm font-medium">
                  Phone verified
                </Label>
                <p className="text-xs text-muted-foreground">
                  Required with Premium for the public verified badge.
                </p>
              </div>
              <Switch
                id="admin-phone-verified"
                checked={Boolean(form.phoneVerified)}
                onCheckedChange={(v) => update("phoneVerified", v)}
              />
            </div>
            {user.phoneVerifiedAt ? (
              <p className="text-xs text-muted-foreground">
                Verified at {formatDate(user.phoneVerifiedAt)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AdminCountrySelect
            value={form.country || ""}
            onChange={(code) => update("country", code)}
          />
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={form.city || ""}
              onChange={(e) => update("city", e.target.value)}
              maxLength={MAX_CITY}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Locale</Label>
            <Select value={form.locale || "en"} onValueChange={(v) => update("locale", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fa">Persian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role || "user"} onValueChange={(v) => update("role", v)}>
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

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status || "active"} onValueChange={(v) => update("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
              <SelectItem value="deleted">Deleted (Soft Deleted)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Banned, deactivated, or deleted users cannot sign in or post.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-username-input">Custom handle (@username)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 font-mono text-sm text-muted-foreground">
              @
            </span>
            <Input
              id="admin-username-input"
              value={form.username || ""}
              onChange={(e) => update("username", e.target.value.toLowerCase().replace(/^@/, ""))}
              placeholder="username (3-30 lowercase characters)"
              className="ps-8 font-mono text-sm"
              maxLength={MAX_USERNAME}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Premium only. Unique public handle for profile URL (e.g. /@username).
          </p>
        </div>

        {form.status === "banned" ? (
          <div className="space-y-2">
            <Label htmlFor="banReason">Ban reason (optional)</Label>
            <Input
              id="banReason"
              value={form.banReason}
              onChange={(e) => update("banReason", e.target.value)}
              placeholder="Included in the suspension email when banning"
              maxLength={MAX_NOTE}
            />
            <p className="text-xs text-muted-foreground">
              Only sent when changing status to banned.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PremiumCard({ user, onChanged }) {
  const [years, setYears] = useState("1");
  const [loading, setLoading] = useState(false);
  const premium = isPremium(user);
  const source = user.premiumSource || null;

  async function handleGrant() {
    setLoading(true);
    const result = await adminGrantPremium(user.id, { years: Number(years) });
    setLoading(false);
    if (result?.success) {
      toast.success("Premium granted");
      onChanged();
      return;
    }
    if (result?.error === "already_premium") {
      toast.error("User already has Premium");
      return;
    }
    toast.error(result?.error ?? "Could not grant Premium");
  }

  async function handleRevoke() {
    if (!window.confirm("Revoke complimentary Premium for this user?")) return;
    setLoading(true);
    const result = await adminRevokePremium(user.id);
    setLoading(false);
    if (result?.success) {
      toast.success("Premium revoked");
      onChanged();
      return;
    }
    if (result?.error === "stripe_premium_use_portal") {
      toast.error("Paid Stripe Premium — cancel via Stripe Customer Portal");
      return;
    }
    toast.error(result?.error ?? "Could not revoke Premium");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Premium</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {premium ? (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200">
              Premium active
            </Badge>
          ) : (
            <Badge variant="outline">No Premium</Badge>
          )}
          {premium && source ? (
            <Badge variant="secondary" className="capitalize">
              {source}
            </Badge>
          ) : null}
        </div>
        {premium ? (
          <p className="text-xs text-muted-foreground">
            {user.premiumPeriodEnd
              ? `Until ${formatDate(user.premiumPeriodEnd)}`
              : "Forever (no end date)"}
          </p>
        ) : null}

        {!premium ? (
          <div className="space-y-2">
            <Label>Complimentary duration</Label>
            <Select value={years} onValueChange={setYears}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRANT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={handleGrant} disabled={loading}>
              {loading ? "Granting…" : "Grant Premium"}
            </Button>
          </div>
        ) : source !== "stripe" ? (
          <Button type="button" size="sm" variant="outline" onClick={handleRevoke} disabled={loading}>
            {loading ? "Revoking…" : "Revoke Premium"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Paid via Stripe — manage cancelation in the Customer Portal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Sub-component for displaying user activity metrics. */
function ActivityCard({ user }) {
  const publicId = user.handle?.publicId || user.publicId;
  const username = user.handle?.username;
  const premium = isPremium(user);
  const profileIdentifier = premium && username ? username : publicId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {publicId ? (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Public ID</p>
            <p className="mt-1 font-mono text-xs">{publicId}</p>
            {profileIdentifier ? (
              <Link
                href={`/${user.locale || "en"}/@${profileIdentifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-primary hover:underline"
              >
                View public profile
              </Link>
            ) : null}
          </div>
        ) : null}
        {username ? (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Handle</p>
            <p className="mt-1 font-mono text-xs text-blue-600 dark:text-blue-400">@{username}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Role</p>
          <div className="mt-1"><AdminStatusBadge value={user.role} /></div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Listings today</p>
          <p className="mt-1 font-medium">{user.quota?.listing?.today ?? user.listingsToday ?? 0}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Listings this month</p>
          <p className="mt-1 font-medium">{user.quota?.listing?.thisMonth ?? user.listingsThisMonth ?? 0}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Confirmed violations</p>
          <p className="mt-1 font-medium">{user.quota?.violation ?? user.confirmedViolationCount ?? 0}</p>
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
  );
}

/** Sub-component for linked social/OAuth accounts. */
function SignInProvidersCard({ linkedAccounts }) {
  return (
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
  );
}

/** Admin form to edit user profile, role, Premium, and ban status. */
export function AdminUserForm({ user, linkedAccounts = [], currentUserId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    phoneVerified: Boolean(user.phoneVerified),
    country: user.country || "",
    city: user.city || "",
    locale: user.locale || "en",
    role: (user.role && USER_ROLES.includes(user.role)) ? user.role : "user",
    username: user.handle?.username || "",
    status: user.status || (user.banned ? "banned" : "active"),
    banReason: "",
  });

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function refresh() {
    router.refresh();
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
          <EditUserCard form={form} user={user} update={update} />

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

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <PremiumCard user={user} onChanged={refresh} />
          <ActivityCard user={user} />
          <SignInProvidersCard linkedAccounts={linkedAccounts} />
        </aside>
      </div>
    </div>
  );
}
