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
import { QrCode, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { tagPath } from "@/lib/paths";

/**
 * Opens a QR dialog for a Digital Collar public URL.
 */
export function TagQrButton({ publicId, locale, variant = "outline", size = "sm", className = "" }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("myPets.digitalCollar");

  if (!publicId) return null;

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
        <span>{t("qrButton")}</span>
      </Button>

      {open ? (
        <TagQrDialog open={open} onOpenChange={setOpen} publicId={publicId} locale={locale} />
      ) : null}
    </>
  );
}

function TagQrDialog({ open, onOpenChange, publicId, locale }) {
  const t = useTranslations("myPets.digitalCollar");
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://unlostpaws.com";
  const targetUrl = `${baseUrl}${tagPath(publicId, locale)}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md space-y-4 p-6 text-center"
        dir={locale === "fa" ? "rtl" : "ltr"}
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <QrCode className="size-5 text-primary" />
            {t("qrTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("qrSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-2">
          <QRCodeDisplay
            value={targetUrl}
            size={180}
            showDownload
            downloadLabel={t("downloadQr")}
            filename={`collar-${publicId}.png`}
          />
        </div>

        <div className="space-y-2 border-t border-border pt-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={targetUrl}
              className="min-w-0 flex-1 select-all rounded-md border border-input bg-muted px-3 py-1.5 text-xs text-muted-foreground outline-none"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0 gap-1.5 text-xs"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? t("copied") : t("copyLink")}
            </Button>
            <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" asChild>
              <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                {t("openLink")}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
