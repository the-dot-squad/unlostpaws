import { notFound } from "next/navigation";
import { connectDB } from "@/config/db";
import { requireStaff } from "@/lib/auth/session";
import { findListingByPublicId } from "@/lib/public-id";
import { listingPublicId } from "@/models/listing";
import { getAuthUserById } from "@/lib/auth/users";
import { getOpenReportStatsByListingIds } from "@/lib/moderation/report-cases";
import { resolveImages } from "@/lib/storage/urls";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminListingForm } from "@/components/admin/listing-form";
import { getAppSettings } from "@/lib/services/settings";
import { toPlainObject } from "@/lib/utils";

export default async function AdminListingEditPage({ params }) {
  await requireStaff();
  await connectDB();

  const { id } = await params;
  const listingModel = await findListingByPublicId(id);
  if (!listingModel) notFound();
  const listing = listingModel.toObject();

  const openStats = await getOpenReportStatsByListingIds([listing._id]);
  const stats = openStats[String(listing._id)] ?? { openReportCount: 0, openCaseCount: 0 };

  const [owner, settings] = await Promise.all([
    getAuthUserById(listing.userId),
    getAppSettings(),
  ]);

  const serialized = toPlainObject(listing);
  serialized.publicId = listingPublicId(listing);
  serialized.images = resolveImages(serialized.images);
  serialized.openReportCount = stats.openReportCount;
  serialized.openCaseCount = stats.openCaseCount;
  serialized.ownerPublicId = owner?.publicId ?? null;
  serialized.ownerLocale = owner?.locale || "en";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Edit listing"
        description={`${listing.petType} — ${listing.color}`}
      />
      <AdminListingForm
        listing={serialized}
        extensionDays={settings.listingExtensionDays ?? 30}
      />
    </div>
  );
}
