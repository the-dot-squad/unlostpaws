"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

/**
 * AutoPrintController Component
 * Handles client-side printing triggers for the flyer page.
 *
 * @param {object} props
 * @param {boolean} [props.autoPrint=false] Whether to trigger window.print() on mount
 */
export function AutoPrintController({ autoPrint = false, printLabel }) {
  useEffect(() => {
    if (autoPrint) {
      // Delay slightly to ensure images and fonts are loaded before print dialog opens
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Button type="button" onClick={handlePrint} className="gap-2 shadow-md">
      <Printer className="size-4" />
      {printLabel || "Print Poster / Save PDF"}
    </Button>
  );
}
