import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/config/db";
import { requireStaff } from "@/lib/auth/session";
import { ListingMatch } from "@/models/listing-match";
import { Listing, listingPublicId } from "@/models/listing";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminFilterToolbar } from "@/components/admin/filter-toolbar";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { MATCH_STATUSES, MATCH_TIERS } from "@/config/constants/enums";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminTableBody,
  AdminTableHead,
  AdminTableRow,
  AdminTableTd,
  AdminTableTh,
} from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

function listingLabel(listing) {
  if (!listing) return "—";
  return `${listing.type} · ${listing.petType} — ${listing.color}`;
}

export default async function AdminMatchesPage({ searchParams }) {
  await requireStaff();
  await connectDB();

  const sp = await searchParams;
  const filter = {};
  if (sp.status) filter.status = sp.status;
  if (sp.tier) filter.tier = sp.tier;

  const matches = await ListingMatch.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  const total = await ListingMatch.countDocuments(filter);

  const listingIds = [
    ...new Set(
      matches.flatMap((m) => [
        String(m.missingListingId || m.listingAId),
        String(m.counterpartListingId || m.listingBId),
      ])
    ),
  ];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("petType color type")
    .lean();
  const listingMap = Object.fromEntries(listings.map((l) => [String(l._id), l]));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="AI Matches"
        description="Cross-type visual similarity matches detected by the intelligence pipeline."
      />

      <AdminFilterToolbar
        filters={[
          {
            key: "status",
            label: "Status",
            options: MATCH_STATUSES.map((s) => ({ value: s, label: s })),
          },
          {
            key: "tier",
            label: "Tier",
            options: MATCH_TIERS.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{total.toLocaleString()}</span> matches
      </p>

      <AdminDataTable>
        <AdminTableHead>
          <AdminTableTh>Missing alert</AdminTableTh>
          <AdminTableTh>Counterpart</AdminTableTh>
          <AdminTableTh>Score</AdminTableTh>
          <AdminTableTh>Tier</AdminTableTh>
          <AdminTableTh>Photos</AdminTableTh>
          <AdminTableTh>Status</AdminTableTh>
          <AdminTableTh>Decided</AdminTableTh>
          <AdminTableTh>Date</AdminTableTh>
        </AdminTableHead>
        <AdminTableBody>
          {matches.length === 0 ? (
            <AdminEmptyState message="No matches found" colSpan={8} />
          ) : (
            matches.map((m) => {
              const score = Math.round(m.finalScore * 100);
              const missingId = m.missingListingId
                ? String(m.missingListingId)
                : m.listingAType === "missing"
                  ? String(m.listingAId)
                  : m.listingBType === "missing"
                    ? String(m.listingBId)
                    : null;
              const counterpartId = m.counterpartListingId
                ? String(m.counterpartListingId)
                : missingId === String(m.listingAId)
                  ? String(m.listingBId)
                  : missingId === String(m.listingBId)
                    ? String(m.listingAId)
                    : null;

              const missing = missingId ? listingMap[missingId] : null;
              const counterpart = counterpartId ? listingMap[counterpartId] : null;

              return (
                <AdminTableRow key={m._id.toString()}>
                  <AdminTableTd>
                    {missing ? (
                      <Link
                        href={`/admin/listings/${listingPublicId(missing)}`}
                        className="capitalize hover:underline"
                      >
                        {listingLabel(missing)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </AdminTableTd>
                  <AdminTableTd>
                    {counterpart ? (
                      <Link
                        href={`/admin/listings/${listingPublicId(counterpart)}`}
                        className="capitalize hover:underline"
                      >
                        {listingLabel(counterpart)}
                      </Link>
                    ) : (
                      <span className="capitalize text-muted-foreground">
                        {listingLabel(listingMap[String(m.listingAId)])} ↔{" "}
                        {listingLabel(listingMap[String(m.listingBId)])}
                      </span>
                    )}
                  </AdminTableTd>
                  <AdminTableTd className="font-semibold tabular-nums">{score}%</AdminTableTd>
                  <AdminTableTd>
                    <Badge variant="outline" className="capitalize">
                      {m.tier}
                    </Badge>
                    {m.confidenceTier ? (
                      <Badge variant="outline" className="ml-1">
                        {m.confidenceTier}
                      </Badge>
                    ) : null}
                  </AdminTableTd>
                  <AdminTableTd>
                    <div className="flex gap-1">
                      {m.matchedImageAUrl ? (
                        <div className="relative size-10 overflow-hidden rounded border">
                          <Image
                            src={m.matchedImageAUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : null}
                      {m.matchedImageBUrl ? (
                        <div className="relative size-10 overflow-hidden rounded border">
                          <Image
                            src={m.matchedImageBUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : null}
                    </div>
                  </AdminTableTd>
                  <AdminTableTd>
                    <AdminStatusBadge value={m.status} />
                  </AdminTableTd>
                  <AdminTableTd className="text-xs text-muted-foreground">
                    {m.decidedAt ? formatDate(m.decidedAt) : "—"}
                  </AdminTableTd>
                  <AdminTableTd className="text-xs text-muted-foreground">
                    {formatDate(m.createdAt)}
                  </AdminTableTd>
                </AdminTableRow>
              );
            })
          )}
        </AdminTableBody>
      </AdminDataTable>
    </div>
  );
}
