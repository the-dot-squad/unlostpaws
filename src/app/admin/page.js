import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { reportCasePath } from "@/lib/moderation/report-cases";
import { getDashboardStats } from "@/lib/repositories/admin-stats";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { DashboardAttentionBanner } from "@/components/admin/dashboard/attention-banner";
import { BreakdownList } from "@/components/admin/dashboard/breakdown-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import {
  Users,
  FileText,
  Flag,
  Heart,
  GitCompare,
  AlertTriangle,
  BarChart3,
  TrendingUp,
} from "lucide-react";

export default async function AdminDashboard() {
  await requireStaff();
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="Platform activity, moderation queue, and quick links to admin tools."
      />

      <DashboardAttentionBanner items={stats.attention} />

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          title="Active listings"
          value={stats.listings.active}
          subtitle={`${stats.listings.total} total · ${stats.listings.underReview} under review`}
          icon={FileText}
          href="/admin/listings"
        />
        <AdminStatCard
          title="Open report cases"
          value={stats.reports.open}
          subtitle={`${stats.reports.total} reports all time`}
          icon={Flag}
          href="/admin/reports"
        />
        <AdminStatCard
          title="Registered pets"
          value={stats.pets.active}
          subtitle="Active microchip registrations"
          icon={Heart}
          href="/admin/pets"
        />
        <AdminStatCard
          title="Users"
          value={stats.users.total}
          subtitle={`${stats.matches.sent} matches sent · ${stats.matches.confirmed} confirmed`}
          icon={Users}
          href="/admin/users"
        />
      </div>

      {/* Growth + secondary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="New today"
          value={stats.listings.today}
          subtitle="Listings created since midnight UTC"
          icon={TrendingUp}
        />
        <AdminStatCard
          title="Last 7 days"
          value={stats.listings.thisWeek}
          subtitle="New listings this week"
          icon={TrendingUp}
        />
        <AdminStatCard
          title="Resolved"
          value={stats.listings.resolved}
          subtitle="Successfully reunited or closed"
          icon={FileText}
          href="/admin/listings?status=resolved"
        />
        <AdminStatCard
          title="Pending matches"
          value={stats.matches.pending}
          subtitle={`${stats.matches.confirmed} confirmed all time`}
          icon={GitCompare}
          href="/admin/matches"
        />
      </div>

      {/* Distribution breakdowns */}
      <div className="grid gap-6 lg:grid-cols-3">
        <BreakdownList
          title="Listings by type"
          description="Distribution across ad categories"
          items={stats.listings.byType}
          emptyMessage="No listings yet"
        />
        <BreakdownList
          title="Listings by status"
          description="Moderation and lifecycle states"
          items={stats.listings.byStatus}
          renderLabel={(item) => <AdminStatusBadge value={item._id} />}
        />
        <BreakdownList
          title="Reports by reason"
          description="What users are flagging"
          items={stats.reports.byReason}
          emptyMessage="No reports yet"
        />
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent listings</CardTitle>
              <CardDescription>Latest posts on the platform</CardDescription>
            </div>
            <Link href="/admin/listings" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.listings.recent.map((l) => (
              <Link
                key={l._id.toString()}
                href={`/admin/listings/${l.publicId}`}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate capitalize font-medium">
                    {l.petType} — {l.color}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {l.type} · {formatDate(l.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {l.openReportCount > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="size-3" />
                      {l.openReportCount}
                    </span>
                  ) : null}
                  <AdminStatusBadge value={l.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Open report cases</CardTitle>
              <CardDescription>Grouped by listing and reason</CardDescription>
            </div>
            <Link href="/admin/reports" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.reports.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open reports — all clear.</p>
            ) : (
              stats.reports.recent.map((r) => (
                <Link
                  key={`${r.listingId}:${r.reason}`}
                  href={
                    r.listing?.publicId
                      ? reportCasePath(r.listing.publicId, r.reason)
                      : "/admin/reports"
                  }
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="truncate capitalize font-medium">
                      {r.listing?.petType} — {r.listing?.color}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.reason} · {r.reportCount} report{r.reportCount === 1 ? "" : "s"} ·{" "}
                      {formatDate(r.latestAt)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    {r.reportCount}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <AdminStatCard
          title="ML failures"
          value={stats.processing.failed}
          subtitle="Pipeline & infrastructure"
          icon={BarChart3}
          href="/admin/stats#processing"
        />
        <AdminStatCard
          title="Infrastructure"
          value="Stats"
          subtitle="Database, vectors, queue"
          icon={BarChart3}
          href="/admin/stats"
        />
      </div>
    </div>
  );
}
