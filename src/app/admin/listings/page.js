import { connectDB } from "@/config/db";
import { queryListings } from "@/lib/repositories/admin";
import { resolveImageUrl } from "@/lib/storage/urls";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminFilterToolbar } from "@/components/admin/filter-toolbar";
import { AdminResultSummary } from "@/components/admin/result-summary";
import { AdminMlStatusBadge, AdminStatusBadge } from "@/components/admin/status-badge";
import { ReportFlag } from "@/components/admin/report-flag";
import { AdminListingActions } from "@/components/admin/listing-actions";
import { ListingThumb } from "@/components/admin/listing-thumb";
import { LISTING_STATUSES, LISTING_TYPES, PET_TYPES, PROCESSING_STATUSES } from "@/config/constants/enums";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminTableBody,
  AdminTableHead,
  AdminTableRow,
  AdminTableTd,
  AdminTableTh,
} from "@/components/admin/data-table";
import { formatDate } from "@/lib/format";

export default async function AdminListingsPage({ searchParams }) {
  await connectDB();

  const sp = await searchParams;
  const { total, items, showing } = await queryListings(sp);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Listings"
        description="Browse, filter, and moderate all pet ads on the platform."
      />

      <AdminFilterToolbar
        searchPlaceholder="Search color, breed, description…"
        filters={[
          {
            key: "status",
            label: "Status",
            options: LISTING_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
          },
          {
            key: "type",
            label: "Type",
            options: LISTING_TYPES.map((t) => ({ value: t, label: t })),
          },
          {
            key: "petType",
            label: "Pet",
            options: PET_TYPES.map((t) => ({ value: t, label: t })),
          },
          {
            key: "reported",
            label: "Reports",
            options: [
              { value: "yes", label: "Has open reports" },
              { value: "no", label: "No open reports" },
            ],
          },
          {
            key: "processingStatus",
            label: "ML status",
            options: PROCESSING_STATUSES.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      <AdminResultSummary total={total} showing={showing} />

      <AdminDataTable>
        <AdminTableHead>
          <AdminTableTh>Photo</AdminTableTh>
          <AdminTableTh>Pet</AdminTableTh>
          <AdminTableTh>Type</AdminTableTh>
          <AdminTableTh>Status</AdminTableTh>
          <AdminTableTh>Reports</AdminTableTh>
          <AdminTableTh>Location</AdminTableTh>
          <AdminTableTh>Created</AdminTableTh>
          <AdminTableTh>Actions</AdminTableTh>
        </AdminTableHead>
        <AdminTableBody>
          {items.length === 0 ? (
            <AdminEmptyState message="No listings match your filters" colSpan={8} />
          ) : (
            items.map((l) => (
              <AdminTableRow key={l._id.toString()}>
                <AdminTableTd>
                  <ListingThumb url={resolveImageUrl(l.images?.[0])} />
                </AdminTableTd>
                <AdminTableTd>
                  <p className="font-medium capitalize">{l.petType} — {l.color}</p>
                  {l.breed ? <p className="text-xs text-muted-foreground">{l.breed}</p> : null}
                </AdminTableTd>
                <AdminTableTd className="capitalize">{l.type}</AdminTableTd>
                <AdminTableTd>
                  <div className="flex flex-col items-start gap-1">
                    <AdminStatusBadge value={l.status} />
                    <AdminMlStatusBadge value={l.processingStatus} />
                  </div>
                </AdminTableTd>
                <AdminTableTd>
                  <ReportFlag
                    listingId={l._id.toString()}
                    openReportCount={l.openReportCount}
                    openCaseCount={l.openCaseCount}
                  />
                </AdminTableTd>
                <AdminTableTd>
                  <p className="text-xs">{l.location?.city || "—"}</p>
                  <p className="text-xs text-muted-foreground">{l.location?.country}</p>
                </AdminTableTd>
                <AdminTableTd className="text-xs text-muted-foreground">{formatDate(l.createdAt)}</AdminTableTd>
                <AdminTableTd>
                  <AdminListingActions listingId={l.publicId} />
                </AdminTableTd>
              </AdminTableRow>
            ))
          )}
        </AdminTableBody>
      </AdminDataTable>
    </div>
  );
}
