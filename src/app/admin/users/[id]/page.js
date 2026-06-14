import { notFound } from "next/navigation";
import { connectDB } from "@/config/db";
import { requireAdmin } from "@/lib/auth/session";
import { findUserByPublicId } from "@/lib/public-id";
import { getUserLinkedAccounts } from "@/lib/auth/users";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminUserForm } from "@/components/admin/user-form";
import { toPlainObject } from "@/lib/utils";

export default async function AdminUserEditPage({ params }) {
  const session = await requireAdmin();

  await connectDB();
  const { id } = await params;

  const user = await findUserByPublicId(id);
  if (!user) notFound();

  const linkedAccounts = await getUserLinkedAccounts(user.id);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Edit user" description={user.email} />
      <AdminUserForm
        user={toPlainObject(user)}
        linkedAccounts={toPlainObject(linkedAccounts)}
        currentUserId={session.user.id}
      />
    </div>
  );
}
