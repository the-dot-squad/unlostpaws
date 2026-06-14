"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./admin-sidebar";

/** Mobile drawer navigation for admin on small screens. */
export function AdminMobileNav({ userName, userRole, badges }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <div onClick={() => setOpen(false)}>
          <AdminSidebar userName={userName} userRole={userRole} badges={badges} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
