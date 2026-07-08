"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Share2, Copy, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ShareButton({
  typeLabel,
  petTypeLabel,
  color,
  breed,
  locationLabel,
}) {
  const t = useTranslations("listings");
  const [isNativeShareSupported, setIsNativeShareSupported] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if the browser supports the Web Share API
    const isSupported = typeof navigator !== "undefined" && typeof navigator.share === "function";
    if (isSupported) {
      setTimeout(() => {
        setIsNativeShareSupported(true);
      }, 0);
    }
  }, []);

  // Format share contents
  const shareTitle = `${typeLabel}: ${petTypeLabel}${color ? ` — ${color}` : ""}`;
  const shareTextDetails = [
    breed ? `${breed}` : null,
    locationLabel ? `${t("location")}: ${locationLabel}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const shareText = shareTextDetails
    ? `${shareTitle} (${shareTextDetails}). Please help us spread the word!`
    : `${shareTitle}. Please help us spread the word!`;

  // Get current clean URL (without query parameters)
  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}`;
  };

  const handleNativeShare = async () => {
    const url = getShareUrl();
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: url,
      });
    } catch (err) {
      // AbortError is triggered if the user cancels the share sheet
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
        toast.error(t("shareFailed"));
      }
    }
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("shareSuccess"));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Could not copy link:", err);
      toast.error(t("shareFailed"));
    }
  };

  // Social sharing helpers
  const shareWhatsApp = () => {
    const url = getShareUrl();
    const text = `${shareText}\n\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const shareTelegram = () => {
    const url = getShareUrl();
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareFacebook = () => {
    const url = getShareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  };

  const shareTwitter = () => {
    const url = getShareUrl();
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareEmail = () => {
    const url = getShareUrl();
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\n${t("showOnMap")}: ${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (isNativeShareSupported) {
    return (
      <Button variant="outline" size="sm" onClick={handleNativeShare} className="gap-2">
        <Share2 className="size-4" />
        <span>{t("share")}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="size-4" />
          <span>{t("share")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("shareDialogTitle")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Copy Link */}
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer justify-between">
          <span className="flex items-center gap-2">
            {copied ? (
              <Check className="size-4 text-emerald-500" />
            ) : (
              <Copy className="size-4" />
            )}
            {t("copyLink")}
          </span>
        </DropdownMenuItem>

        {/* WhatsApp */}
        <DropdownMenuItem onClick={shareWhatsApp} className="cursor-pointer">
          <svg className="me-2 size-4 shrink-0 fill-emerald-500" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.002 5.282 5.284 0 11.784 0c3.148.001 6.107 1.227 8.332 3.454a11.722 11.722 0 0 1 3.454 8.332c-.002 6.507-5.285 11.793-11.79 11.793-2.002-.001-3.972-.51-5.713-1.478L0 24zm6.474-3.52c1.642.975 3.254 1.488 4.792 1.489 5.348 0 9.7-4.35 9.702-9.7a9.638 9.638 0 0 0-2.856-6.86 9.646 9.646 0 0 0-6.853-2.846c-5.351 0-9.705 4.352-9.707 9.7-.001 1.637.525 3.236 1.522 4.62l-.994 3.635 3.738-.98c1.393.76 2.87 1.162 4.458 1.162z" />
          </svg>
          {t("shareWhatsApp")}
        </DropdownMenuItem>

        {/* Telegram */}
        <DropdownMenuItem onClick={shareTelegram} className="cursor-pointer">
          <svg className="me-2 size-4 shrink-0 fill-sky-500" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.37-.49 1.03-.75 4.03-1.75 6.72-2.91 8.07-3.48 3.84-1.62 4.64-1.9 5.16-1.9.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.2-.04.22z" />
          </svg>
          {t("shareTelegram")}
        </DropdownMenuItem>

        {/* Facebook */}
        <DropdownMenuItem onClick={shareFacebook} className="cursor-pointer">
          <svg className="me-2 size-4 shrink-0 fill-blue-600" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          {t("shareFacebook")}
        </DropdownMenuItem>

        {/* Twitter */}
        <DropdownMenuItem onClick={shareTwitter} className="cursor-pointer">
          <svg className="me-2 size-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          {t("shareTwitter")}
        </DropdownMenuItem>

        {/* Email */}
        <DropdownMenuItem onClick={shareEmail} className="cursor-pointer">
          <Mail className="me-2 size-4 text-muted-foreground" aria-hidden="true" />
          {t("shareEmail")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
