"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeDisplay } from "@/components/flyer/qr-code-display";
import { QrCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * QRCodeDialog Component
 * Dedicated modal for displaying and downloading a listing's QR code.
 *
 * @param {object} props
 * @param {boolean} props.open Whether dialog is open
 * @param {function} props.onOpenChange Handler to open/close dialog
 * @param {object} props.listing MongoDB Listing document
 * @param {string} props.locale Current locale ("en", "fa")
 * @param {function} props.t Translation function for "flyer" namespace
 */
export function QRCodeDialog({ open, onOpenChange, listing, locale, t }) {
  const [copied, setCopied] = useState(false);

  if (!listing) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://unlostpaws.com";
  const slug = listing.publicId || listing._id?.toString() || listing.id || "";
  const targetUrl = `${baseUrl}/${locale}/listings/${slug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      toast.success(t("linkCopied") || "Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-6 text-center space-y-4"
        dir={locale === "fa" ? "rtl" : "ltr"}
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <QrCode className="size-5 text-primary" />
            {t("qrCodeTitle") || "Pet Alert QR Code"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("qrCodeSubtitle") || "Scan or download this QR code to quickly share this alert."}
          </DialogDescription>
        </DialogHeader>

        {/* QR Code Graphic Container */}
        <div className="py-2 flex flex-col items-center justify-center">
          <QRCodeDisplay
            value={targetUrl}
            size={180}
            showDownload={true}
            downloadLabel={t("downloadQR")}
            filename={`qr-${slug}.png`}
          />
        </div>

        {/* Copy Link Input Box */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={targetUrl}
              className="flex-1 rounded-md border border-input bg-muted px-3 py-1.5 text-xs text-muted-foreground select-all outline-none"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 text-xs shrink-0"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? (t("copied") || "Copied") : (t("copyLink") || "Copy Link")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
