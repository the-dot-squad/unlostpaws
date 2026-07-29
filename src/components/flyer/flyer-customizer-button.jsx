"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { FlyerCustomizerDialog } from "@/components/flyer/flyer-customizer-dialog";

/**
 * FlyerCustomizerButton Component
 * Standalone button that opens the dedicated FlyerCustomizerDialog modal for poster printing.
 *
 * @param {object} props
 * @param {object} props.listing MongoDB Listing document
 * @param {string} props.locale Current locale ("en", "fa")
 * @param {"default" | "outline" | "secondary" | "ghost"} [props.variant="outline"] Button variant
 * @param {"default" | "sm" | "lg" | "icon"} [props.size="sm"] Button size
 * @param {string} [props.className] Additional CSS classes
 */
export function FlyerCustomizerButton({
  listing,
  locale,
  variant = "outline",
  size = "sm",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("flyer");

  if (!listing) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`gap-1.5 ${className}`}
      >
        <Printer className="size-4 text-primary" />
        <span>{t("printPosterButton") || "Print Poster"}</span>
      </Button>

      {open ? (
        <FlyerCustomizerDialog
          open={open}
          onOpenChange={setOpen}
          listing={listing}
          locale={locale}
          t={t}
        />
      ) : null}
    </>
  );
}
