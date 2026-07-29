"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeDialog } from "@/components/flyer/qr-code-dialog";

/**
 * QRCodeButton Component
 * Standalone button that opens the dedicated QRCodeDialog modal.
 *
 * @param {object} props
 * @param {object} props.listing MongoDB Listing document
 * @param {string} props.locale Current locale ("en", "fa")
 * @param {"default" | "outline" | "secondary" | "ghost"} [props.variant="outline"] Button variant
 * @param {"default" | "sm" | "lg" | "icon"} [props.size="sm"] Button size
 * @param {string} [props.className] Additional CSS classes
 */
export function QRCodeButton({
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
        <QrCode className="size-4 text-primary" />
        <span>{t("qrCodeButton") || "QR Code"}</span>
      </Button>

      {open ? (
        <QRCodeDialog
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
