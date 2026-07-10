import Link from "next/link";
import { connectDB } from "@/config/db";
import { requireStaff } from "@/lib/auth/session";
import { queryUsers } from "@/lib/repositories/admin";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminFilterToolbar } from "@/components/admin/filter-toolbar";
import { AdminResultSummary } from "@/components/admin/result-summary";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { UserActions } from "@/components/admin/user-actions";
import { USER_ROLES } from "@/config/constants/enums";
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

export default async function AdminUsersPage({ searchParams }) {
  const session = await requireStaff();
  await connectDB();

  const sp = await searchParams;
  const { total, items, showing } = await queryUsers(sp);
  const isAdmin = session.user.role === "admin";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Manage accounts, roles, and ban status. Only admins can edit users."
      />

      <AdminFilterToolbar
        searchPlaceholder="Name, email, phone…"
        filters={[
          {
            key: "role",
            label: "Role",
            options: USER_ROLES.map((r) => ({ value: r, label: r })),
          },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "banned", label: "Banned" },
              { value: "deactivated", label: "Deactivated" },
              { value: "deleted", label: "Deleted" },
            ],
          },
        ]}
      />

      <AdminResultSummary total={total} showing={showing} />

      <AdminDataTable>
        <AdminTableHead>
          <AdminTableTh>Name</AdminTableTh>
          <AdminTableTh>Email</AdminTableTh>
          <AdminTableTh>Role</AdminTableTh>
          <AdminTableTh>Status</AdminTableTh>
          <AdminTableTh>Joined</AdminTableTh>
          <AdminTableTh>Actions</AdminTableTh>
        </AdminTableHead>
        <AdminTableBody>
          {items.length === 0 ? (
            <AdminEmptyState message="No users match your filters" colSpan={6} />
          ) : (
            items.map((u) => (
              <AdminTableRow key={u.id}>
                <AdminTableTd>
                  <Link href={`/admin/users/${u.publicId}`} className="font-medium hover:underline">
                    {u.name}
                  </Link>
                </AdminTableTd>
                <AdminTableTd className="text-muted-foreground">{u.email}</AdminTableTd>
                <AdminTableTd>
                  <AdminStatusBadge value={u.role || "user"} />
                </AdminTableTd>
                <AdminTableTd>
                  {u.status === "banned" && <Badge variant="destructive">Banned</Badge>}
                  {u.status === "deactivated" && <Badge variant="secondary">Deactivated</Badge>}
                  {u.status === "deleted" && <Badge variant="secondary">Deleted</Badge>}
                  {(!u.status || u.status === "active") && !u.banned && <Badge variant="outline">Active</Badge>}
                  {(!u.status || u.status === "active") && u.banned && <Badge variant="destructive">Banned</Badge>}
                </AdminTableTd>
                <AdminTableTd className="text-xs text-muted-foreground">
                  {u.createdAt ? formatDate(u.createdAt) : "—"}
                </AdminTableTd>
                <AdminTableTd>
                  {isAdmin ? (
                    <UserActions
                      publicId={u.publicId}
                      userId={u.id}
                      name={u.name}
                      email={u.email}
                      isSelf={u.id === session.user.id}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Admin only</span>
                  )}
                </AdminTableTd>
              </AdminTableRow>
            ))
          )}
        </AdminTableBody>
      </AdminDataTable>
    </div>
  );
}
