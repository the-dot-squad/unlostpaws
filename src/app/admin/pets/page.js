import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/config/db";
import { resolveOwnedPetPublicId } from "@/lib/public-id";
import { queryPets } from "@/lib/repositories/admin";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminFilterToolbar } from "@/components/admin/filter-toolbar";
import { AdminResultSummary } from "@/components/admin/result-summary";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { PetActions } from "@/components/admin/pet-actions";
import { OWNED_PET_STATUSES, PET_TYPES } from "@/config/constants/enums";
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

export default async function AdminPetsPage({ searchParams }) {
  await connectDB();

  const sp = await searchParams;
  const { total, items, userMap, showing } = await queryPets(sp);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Registered Pets"
        description="Microchip-registered pets linked to user accounts."
      />

      <AdminFilterToolbar
        searchPlaceholder="Name, microchip, breed, color…"
        filters={[
          {
            key: "status",
            label: "Status",
            options: OWNED_PET_STATUSES.map((s) => ({ value: s, label: s })),
          },
          {
            key: "petType",
            label: "Pet type",
            options: PET_TYPES.map((t) => ({ value: t, label: t })),
          },
        ]}
      />

      <AdminResultSummary total={total} showing={showing} />

      <AdminDataTable>
        <AdminTableHead>
          <AdminTableTh>Photo</AdminTableTh>
          <AdminTableTh>Name</AdminTableTh>
          <AdminTableTh>Microchip</AdminTableTh>
          <AdminTableTh>Type</AdminTableTh>
          <AdminTableTh>Owner</AdminTableTh>
          <AdminTableTh>Status</AdminTableTh>
          <AdminTableTh>Created</AdminTableTh>
          <AdminTableTh>Actions</AdminTableTh>
        </AdminTableHead>
        <AdminTableBody>
          {items.length === 0 ? (
            <AdminEmptyState message="No registered pets match your filters" colSpan={8} />
          ) : (
            items.map((rawPet) => {
              const pet = resolveOwnedPetPublicId(rawPet);
              const owner = userMap[pet.userId];
              return (
                <AdminTableRow key={pet._id.toString()}>
                  <AdminTableTd>
                    {pet.photo?.url ? (
                      <div className="relative size-10 overflow-hidden rounded-md border">
                        <Image src={pet.photo.url} alt="" fill className="object-cover" sizes="40px" />
                      </div>
                    ) : null}
                  </AdminTableTd>
                  <AdminTableTd className="font-medium">{pet.name}</AdminTableTd>
                  <AdminTableTd className="font-mono text-xs">{pet.microchipId}</AdminTableTd>
                  <AdminTableTd className="capitalize">{pet.petType}</AdminTableTd>
                  <AdminTableTd>
                    {owner ? (
                      <Link href={`/admin/users/${owner.publicId}`} className="hover:underline">
                        <div>{owner.name}</div>
                        <div className="text-xs text-muted-foreground">{owner.email}</div>
                      </Link>
                    ) : (
                      "—"
                    )}
                  </AdminTableTd>
                  <AdminTableTd>
                    <AdminStatusBadge value={pet.status} />
                  </AdminTableTd>
                  <AdminTableTd className="text-xs text-muted-foreground">{formatDate(pet.createdAt)}</AdminTableTd>
                  <AdminTableTd>
                    <PetActions petId={pet.publicId} />
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
