import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Back navigation at the top of admin edit pages. */
export function AdminBackLink({ href, label }) {
  return (
    <Button variant="ghost" size="sm" className="-ms-2 mb-2" asChild>
      <Link href={href}>
        <ArrowLeft className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
