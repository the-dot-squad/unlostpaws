"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PrintableFlyer } from "@/components/flyer/printable-flyer";
import { Printer, Image as ImageIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * FlyerCustomizerDialog Component
 * Dedicated poster printing modal with RTL support and flyer customization options.
 */
export function FlyerCustomizerDialog({ open, onOpenChange, listing, locale, t }) {
  const images = listing?.images || [];

  // State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [customHeadline, setCustomHeadline] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(true);

  if (!listing) return null;

  // Build canonical public slug (e.g. 1cBwhEiwQWHilumVH)
  const slug = listing.publicId || listing._id?.toString() || listing.id || "";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://unlostpaws.com";
  const targetUrl = `${baseUrl}/${locale}/listings/${slug}`;

  // Handle direct print action
  const handlePrint = () => {
    const params = new URLSearchParams();
    params.set("img", selectedImageIndex.toString());
    if (customHeadline) params.set("headline", customHeadline);
    if (customNotes) params.set("notes", customNotes);
    params.set("phone", showPhone ? "1" : "0");
    params.set("email", showEmail ? "1" : "0");
    params.set("print", "true");

    const printUrl = `/${locale}/listings/${slug}/flyer?${params.toString()}`;
    window.open(printUrl, "_blank");
  };

  const isRtl = locale === "fa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <DialogHeader className={isRtl ? "text-right" : "text-left"}>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Printer className="size-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="customize" className="w-full mt-2" dir={isRtl ? "rtl" : "ltr"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customize">{t("headline")}</TabsTrigger>
            <TabsTrigger value="preview">{t("preview")}</TabsTrigger>
          </TabsList>

          {/* Tab 1: Customization Form */}
          <TabsContent value="customize" className="space-y-6 pt-4">
            {/* Image Selector Grid */}
            {images.length > 0 ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-semibold">
                  <ImageIcon className="size-4 text-muted-foreground" />
                  {t("selectImage")} ({images.length})
                </Label>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {images.map((img, idx) => {
                    const isSelected = selectedImageIndex === idx;
                    return (
                      <button
                        key={img.url || idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/20 scale-95"
                            : "border-border hover:border-primary/50 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Image
                          src={img.url}
                          alt={`Pet photo ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="100px"
                          unoptimized={process.env.NODE_ENV === "development"}
                        />
                        {isSelected ? (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <span className="rounded-full bg-primary text-white p-1 text-xs">✓</span>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Custom Headline */}
            <div className="space-y-2">
              <Label htmlFor="flyer-headline">{t("headline")}</Label>
              <Input
                id="flyer-headline"
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                placeholder={t("headlineMissing")}
              />
            </div>

            {/* Custom Notes / Message */}
            <div className="space-y-2">
              <Label htmlFor="flyer-notes">{t("customNotes")}</Label>
              <Textarea
                id="flyer-notes"
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder={t("customNotesPlaceholder")}
              />
            </div>

            {/* Contact Privacy Toggles */}
            <div className="grid gap-4 rounded-xl border border-border p-4 bg-muted/40 sm:grid-cols-2">
              <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse">
                <Label htmlFor="show-phone-switch" className="cursor-pointer text-sm font-medium">
                  {t("showPhone")}
                </Label>
                <Switch
                  id="show-phone-switch"
                  checked={showPhone}
                  onCheckedChange={setShowPhone}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse">
                <Label htmlFor="show-email-switch" className="cursor-pointer text-sm font-medium">
                  {t("showEmail")}
                </Label>
                <Switch
                  id="show-email-switch"
                  checked={showEmail}
                  onCheckedChange={setShowEmail}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Live Poster Preview */}
          <TabsContent value="preview" className="pt-4">
            <div className="scale-95 origin-top">
              <PrintableFlyer
                listing={listing}
                locale={locale}
                selectedImageIndex={selectedImageIndex}
                customHeadline={customHeadline}
                customNotes={customNotes}
                showPhone={showPhone}
                showEmail={showEmail}
                t={t}
                targetUrl={targetUrl}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>

          <Button type="button" onClick={handlePrint} className="gap-2 bg-primary">
            <Printer className="size-4" />
            {t("printButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
