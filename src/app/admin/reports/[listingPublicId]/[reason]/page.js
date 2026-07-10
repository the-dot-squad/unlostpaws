import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/config/db";
import { requireStaff } from "@/lib/auth/session";
import { getReportCaseData } from "@/lib/moderation/report-cases";
import { getAuthUsersByIds } from "@/lib/auth/users";
import { ReportEntriesList } from "@/components/admin/report-entries-list";
import { getAppSettings } from "@/lib/services/settings";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { ReportCaseActions } from "@/components/admin/report-case-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { decodeListingPublicId, isValidListingPublicId } from "@/lib/public-id";
import { listingPath } from "@/lib/paths";
import { toPlainObject } from "@/lib/utils";
import { routing } from "@/i18n/routing";

export default async function AdminReportCasePage({ params }) {
  await requireStaff();
  await connectDB();

  const { listingPublicId, reason: reasonParam } = await params;
  const reason = decodeURIComponent(reasonParam);

  if (!isValidListingPublicId(listingPublicId)) notFound();

  const listingObjectId = decodeListingPublicId(listingPublicId);

  const [{ listing, reports }, settings] = await Promise.all([
    getReportCaseData(listingObjectId, reason),
    getAppSettings(),
  ]);

  if (!reports.length) notFound();

  const openCount = reports.filter((r) => r.status === "open" || r.status === "reviewing").length;

  const lookupIds = [
    ...new Set([
      ...reports.map((r) => r.reporterId),
      listing?.userId,
    ].filter((id) => id && id !== "system")),
  ];
  const userMap = await getAuthUsersByIds(lookupIds);
  const owner = listing?.userId ? userMap[listing.userId] ?? null : null;
  const ownerStrikes = owner?.quota?.violation ?? owner?.confirmedViolationCount ?? 0;
  const banThreshold = settings.confirmedViolationBanThreshold ?? 3;
  const publicLocale = owner?.locale || routing.defaultLocale;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Report case"
        description={`${reason} · ${reports.length} report${reports.length === 1 ? "" : "s"}${openCount ? ` · ${openCount} open` : ""}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Case summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="capitalize">{reason}</Badge>
              <Badge variant="outline">{reports.length} reports</Badge>
              {openCount > 0 ? <Badge variant="destructive">{openCount} open</Badge> : null}
            </div>

            <p className="text-sm text-muted-foreground">
              Auto-review triggers at{" "}
              <strong>{settings.reportAutoReviewMinReports}</strong> independent reporters (unique IP)
              within <strong>{settings.reportAutoReviewWindowHours}</strong> hours for this reason.
            </p>

            {openCount > 0 ? (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-3 text-sm font-medium">Resolve this case</p>
                <ReportCaseActions listingId={listingObjectId} reason={reason} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This case has been resolved.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listing & owner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {listing ? (
              <>
                <p className="text-lg font-medium capitalize">
                  {listing.petType} — {listing.color}
                </p>
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge value={listing.status} />
                  <Badge variant="outline" className="capitalize">{listing.type}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Link href={`/admin/listings/${listing.publicId}`} className="text-primary hover:underline">
                    Edit listing
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <a
                    href={listingPath(listing.publicId, publicLocale)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View public ad
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Listing removed or unavailable.</p>
            )}

            {owner ? (
              <div className="rounded-lg border px-3 py-2 text-sm">
                <p>
                  <span className="font-medium">Owner:</span> {owner.name || owner.email}
                </p>
                <p className="text-muted-foreground">{owner.email}</p>
                <p className="mt-2">
                  <span className="font-medium">Confirmed violations:</span>{" "}
                  {ownerStrikes} / {banThreshold}
                  {(() => {
                    const status = owner.status || (owner.banned ? "banned" : "active");
                    if (status === "active") return null;
                    return (
                      <Badge variant={status === "banned" ? "destructive" : "secondary"} className="ml-2 capitalize">
                        {status}
                      </Badge>
                    );
                  })()}
                </p>
                <Link
                  href={`/admin/users/${owner.publicId}`}
                  className="mt-2 inline-block text-primary hover:underline"
                >
                  View user profile
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Individual reports</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportEntriesList
            reports={toPlainObject(reports)}
            reportersById={toPlainObject(userMap)}
          />
        </CardContent>
      </Card>

      <Link href="/admin/reports" className="text-sm text-primary hover:underline">
        ← Back to report cases
      </Link>
    </div>
  );
}
