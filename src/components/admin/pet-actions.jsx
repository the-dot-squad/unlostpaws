"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Quick link to full pet edit page. */
export function PetActions({ petId }) {
  return (
    <Button size="sm" variant="outline" asChild>
      <Link href={`/admin/pets/${petId}`}>
        <Pencil className="size-3.5" />
        Edit
      </Link>
    </Button>
  );
}
