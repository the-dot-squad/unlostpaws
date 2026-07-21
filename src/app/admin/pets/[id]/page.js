import { notFound } from "next/navigation";
import { connectDB, getMongoDb } from "@/config/db";
import { authUserIdFilter, normalizeAuthUser } from "@/lib/auth/users";
import { OwnedPet } from "@/models/owned-pet";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPetForm } from "@/components/admin/pet-form";
import { toPlainObject } from "@/lib/utils";

export default async function AdminPetEditPage({ params }) {
  await connectDB();

  const { id: publicId } = await params;
  const pet = await OwnedPet.findOne({ publicId }).lean();
  if (!pet) notFound();

  const db = await getMongoDb();
  const owner = normalizeAuthUser(
    await db.collection("user").findOne(authUserIdFilter(pet.userId), {
      projection: { _id: 1, id: 1, name: 1, email: 1 },
    })
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Edit pet" description={pet.name} />
      <AdminPetForm
        pet={toPlainObject(pet)}
        owner={owner ? toPlainObject(owner) : null}
      />
    </div>
  );
}
