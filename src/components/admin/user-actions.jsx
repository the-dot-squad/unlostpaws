"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminDeleteUser } from "@/lib/actions/admin";
import { toast } from "sonner";

/** Row actions for admin users: edit and delete. */
export function UserActions({ publicId, userId, name, email, isSelf = false }) {
  const router = useRouter();

  async function handleDelete() {
    const label = name || email || "this user";
    if (
      !window.confirm(
        `Delete ${label}? This permanently removes their account, listings, pets, uploads, and all activity logs. This cannot be undone.`
      )
    ) {
      return;
    }

    const result = await adminDeleteUser(userId);
    if (result?.success) {
      toast.success("User deleted");
      router.refresh();
      return;
    }

    toast.error(result?.error ?? "Could not delete user");
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="outline" asChild>
        <Link href={`/admin/users/${publicId}`} title="Edit user">
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit</span>
        </Link>
      </Button>
      {!isSelf ? (
        <Button size="sm" variant="destructive" onClick={handleDelete} title="Delete user">
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      ) : null}
    </div>
  );
}
