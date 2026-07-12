"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAppSettings } from "@/lib/actions/admin";
import { toast } from "sonner";
import { PET_TYPES } from "@/config/constants/enums";
import { prepareSocialLinksForSave } from "@/lib/socials";

function RateLimitReadonlyField({ label, rateLimitEnv, valueKey }) {
  const value = rateLimitEnv?.active
    ? `${rateLimitEnv[valueKey]} / ${rateLimitEnv.windowSeconds}s`
    : "—";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input readOnly disabled value={value} />
    </div>
  );
}

/** Two-column settings layout grouped by concern. */
export function AdminSettingsForm({ settings, rateLimitEnv }) {
  const [form, setForm] = useState({
    maxListingsPerDay: settings.maxListingsPerDay ?? 3,
    maxListingsPerMonth: settings.maxListingsPerMonth ?? 15,
    maxOwnedPetsPerUser: settings.maxOwnedPetsPerUser ?? 10,
    maxReportsPerDay: settings.maxReportsPerDay ?? 50,
    listingExpiryDays: settings.listingExpiryDays ?? 90,
    listingExtensionEnabled: settings.listingExtensionEnabled ?? true,
    listingExtensionDays: settings.listingExtensionDays ?? 30,
    listingExtensionFromDay: settings.listingExtensionFromDay ?? 14,
    reportAutoReviewWindowHours: settings.reportAutoReviewWindowHours ?? 168,
    reportAutoReviewMinReports: settings.reportAutoReviewMinReports ?? 3,
    confirmedViolationBanThreshold: settings.confirmedViolationBanThreshold ?? 3,
    imageMatchingEnabled: settings.imageMatchingEnabled ?? true,
    matchSimilarityThreshold: settings.matchSimilarityThreshold ?? 0.82,
    matchConfidenceHighThreshold: settings.matchConfidenceHighThreshold ?? 0.9,
    geoMatchRadiusKm: settings.geoMatchRadiusKm ?? 100,
    dedupLookbackDays: settings.dedupLookbackDays ?? 365,
    reverseSearchMaxListings: settings.reverseSearchMaxListings ?? 500,
    abuseReportThreshold: settings.abuseReportThreshold ?? 0.7,
    abuseReviewThreshold: settings.abuseReviewThreshold ?? 0.82,
    abuseRemoveThreshold: settings.abuseRemoveThreshold ?? 0.95,
    matchBlockThreshold: settings.matchBlockThreshold ?? 0.5,
    corroborationThresholdMultiplier: settings.corroborationThresholdMultiplier ?? 1.1,
    sameUserRepostLookbackDays: settings.sameUserRepostLookbackDays ?? 30,
    safetyEnabled: settings.safetyEnabled ?? true,
    safetyNsfwReviewThreshold: settings.safetyNsfwReviewThreshold ?? 0.5,
    safetyNsfwBlockThreshold: settings.safetyNsfwBlockThreshold ?? 0.85,
    safetyPetMinLikelihood: settings.safetyPetMinLikelihood ?? 0.32,
    safetyMinImageWidth: settings.safetyMinImageWidth ?? 400,
    safetyMinImageHeight: settings.safetyMinImageHeight ?? 400,
    safetyMaxBlurScore: settings.safetyMaxBlurScore ?? 0.85,
    supportedPetTypes: settings.supportedPetTypes ?? PET_TYPES,
    socialLinks: Array.isArray(settings.socialLinks) ? settings.socialLinks : [],
  });
  const [loading, setLoading] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformUrl, setNewPlatformUrl] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const socialsResult = prepareSocialLinksForSave(
      form.socialLinks,
      newPlatformName,
      newPlatformUrl,
    );
    if (!socialsResult.ok) {
      toast.error(socialsResult.error);
      return;
    }

    setLoading(true);
    const res = await updateAppSettings({
      ...form,
      maxListingsPerDay: Number(form.maxListingsPerDay),
      maxListingsPerMonth: Number(form.maxListingsPerMonth),
      maxOwnedPetsPerUser: Number(form.maxOwnedPetsPerUser),
      maxReportsPerDay: Number(form.maxReportsPerDay),
      listingExpiryDays: Number(form.listingExpiryDays),
      listingExtensionDays: Number(form.listingExtensionDays),
      listingExtensionFromDay: Number(form.listingExtensionFromDay),
      reportAutoReviewWindowHours: Number(form.reportAutoReviewWindowHours),
      reportAutoReviewMinReports: Number(form.reportAutoReviewMinReports),
      confirmedViolationBanThreshold: Number(form.confirmedViolationBanThreshold),
      matchSimilarityThreshold: Number(form.matchSimilarityThreshold),
      matchConfidenceHighThreshold: Number(form.matchConfidenceHighThreshold),
      geoMatchRadiusKm: Number(form.geoMatchRadiusKm),
      dedupLookbackDays: Number(form.dedupLookbackDays),
      reverseSearchMaxListings: Number(form.reverseSearchMaxListings),
      abuseReportThreshold: Number(form.abuseReportThreshold),
      abuseReviewThreshold: Number(form.abuseReviewThreshold),
      abuseRemoveThreshold: Number(form.abuseRemoveThreshold),
      matchBlockThreshold: Number(form.matchBlockThreshold),
      corroborationThresholdMultiplier: Number(form.corroborationThresholdMultiplier),
      sameUserRepostLookbackDays: Number(form.sameUserRepostLookbackDays),
      safetyNsfwReviewThreshold: Number(form.safetyNsfwReviewThreshold),
      safetyNsfwBlockThreshold: Number(form.safetyNsfwBlockThreshold),
      safetyPetMinLikelihood: Number(form.safetyPetMinLikelihood),
      safetyMinImageWidth: Number(form.safetyMinImageWidth),
      safetyMinImageHeight: Number(form.safetyMinImageHeight),
      safetyMaxBlurScore: Number(form.safetyMaxBlurScore),
      socialLinks: socialsResult.socialLinks,
    });
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      update("socialLinks", socialsResult.socialLinks);
      setNewPlatformName("");
      setNewPlatformUrl("");
      toast.success("Settings saved successfully");
    }
  }

  function updateSocialLink(index, field, value) {
    setForm((f) => ({
      ...f,
      socialLinks: f.socialLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link,
      ),
    }));
  }

  function removeSocialLink(index) {
    setForm((f) => ({
      ...f,
      socialLinks: f.socialLinks.filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rate limits */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Rate limits</CardTitle>
              <Badge variant={rateLimitEnv?.active ? "default" : "secondary"}>
                IP {rateLimitEnv?.active ? "active" : "inactive"}
              </Badge>
              {rateLimitEnv?.active ? (
                <Badge variant="outline" className="capitalize">
                  {rateLimitEnv.adapter}
                </Badge>
              ) : null}
            </div>
            <CardDescription>Per-user posting caps and per-IP request throttling.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Max listings per day</Label>
              <Input type="number" value={form.maxListingsPerDay} onChange={(e) => update("maxListingsPerDay", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max listings per month</Label>
              <Input type="number" value={form.maxListingsPerMonth} onChange={(e) => update("maxListingsPerMonth", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max registered pets per user</Label>
              <Input type="number" value={form.maxOwnedPetsPerUser} onChange={(e) => update("maxOwnedPetsPerUser", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max reports per user per day</Label>
              <Input type="number" value={form.maxReportsPerDay} onChange={(e) => update("maxReportsPerDay", e.target.value)} />
            </div>

            <RateLimitReadonlyField
              label="Requests per IP"
              rateLimitEnv={rateLimitEnv}
              valueKey="maxRequests"
            />
            <RateLimitReadonlyField
              label="Upload requests per IP"
              rateLimitEnv={rateLimitEnv}
              valueKey="uploadMaxRequests"
            />
          </CardContent>
        </Card>

        {/* Listing lifecycle */}
        <Card>
          <CardHeader>
            <CardTitle>Listing lifecycle</CardTitle>
            <CardDescription>How long ads stay live and when owners may extend them.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Ad duration (days)</Label>
              <Input type="number" value={form.listingExpiryDays} onChange={(e) => update("listingExpiryDays", e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Listings expire this many days after creation (or after each extension).
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div>
                <Label>Allow owners to extend</Label>
                <p className="text-xs text-muted-foreground">Show extend option on the owner edit form.</p>
              </div>
              <Switch
                checked={form.listingExtensionEnabled}
                onCheckedChange={(v) => update("listingExtensionEnabled", v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Extension length (days)</Label>
              <Input
                type="number"
                value={form.listingExtensionDays}
                onChange={(e) => update("listingExtensionDays", e.target.value)}
                disabled={!form.listingExtensionEnabled}
              />
              <p className="text-xs text-muted-foreground">Days added each time a listing is extended.</p>
            </div>
            <div className="space-y-2">
              <Label>Extend from (days before expiry)</Label>
              <Input
                type="number"
                value={form.listingExtensionFromDay}
                onChange={(e) => update("listingExtensionFromDay", e.target.value)}
                disabled={!form.listingExtensionEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Owners can extend once expiry is within this many days.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Moderation */}
        <Card>
          <CardHeader>
            <CardTitle>Moderation</CardTitle>
            <CardDescription>Automatic listing review and user suspension thresholds.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Auto-review window (hours)</Label>
              <Input
                type="number"
                value={form.reportAutoReviewWindowHours}
                onChange={(e) => update("reportAutoReviewWindowHours", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Only reports within this period count toward automatic listing review.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Auto-review report threshold</Label>
              <Input
                type="number"
                value={form.reportAutoReviewMinReports}
                onChange={(e) => update("reportAutoReviewMinReports", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Independent reporters (unique IP) with the same reason needed to flag a listing.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Violation suspension threshold</Label>
              <Input
                type="number"
                value={form.confirmedViolationBanThreshold}
                onChange={(e) => update("confirmedViolationBanThreshold", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Confirmed violations (upheld report cases) before the listing owner is suspended.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ML & matching */}
        <Card>
          <CardHeader>
            <CardTitle>Image matching</CardTitle>
            <CardDescription>AI similarity thresholds and geo constraints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Image matching enabled</Label>
                <p className="text-xs text-muted-foreground">Toggle ML embedding pipeline.</p>
              </div>
              <Switch checked={form.imageMatchingEnabled} onCheckedChange={(v) => update("imageMatchingEnabled", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Similarity threshold (0–1)</Label>
                <Input type="number" step="0.01" value={form.matchSimilarityThreshold} onChange={(e) => update("matchSimilarityThreshold", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>High confidence (0–1)</Label>
                <Input type="number" step="0.01" value={form.matchConfidenceHighThreshold} onChange={(e) => update("matchConfidenceHighThreshold", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Geo match radius (km)</Label>
                <Input type="number" value={form.geoMatchRadiusKm} onChange={(e) => update("geoMatchRadiusKm", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Reverse search cap</Label>
                <Input type="number" value={form.reverseSearchMaxListings} onChange={(e) => update("reverseSearchMaxListings", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Corroboration multiplier</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.corroborationThresholdMultiplier}
                  onChange={(e) => update("corroborationThresholdMultiplier", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Stricter factor for found↔sighting↔surrender pairs (non-missing).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content safety */}
        <Card>
          <CardHeader>
            <CardTitle>Content safety</CardTitle>
            <CardDescription>NSFW and image quality moderation after listing creation (vision worker callback).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Content safety enabled</Label>
                <p className="text-xs text-muted-foreground">Block or review listings with unsafe images.</p>
              </div>
              <Switch checked={form.safetyEnabled} onCheckedChange={(v) => update("safetyEnabled", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>NSFW review threshold (0–1)</Label>
                <Input type="number" step="0.01" value={form.safetyNsfwReviewThreshold} onChange={(e) => update("safetyNsfwReviewThreshold", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>NSFW block threshold (0–1)</Label>
                <Input type="number" step="0.01" value={form.safetyNsfwBlockThreshold} onChange={(e) => update("safetyNsfwBlockThreshold", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Min pet likelihood (0–1)</Label>
                <Input type="number" step="0.01" value={form.safetyPetMinLikelihood} onChange={(e) => update("safetyPetMinLikelihood", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max blur score (0–1)</Label>
                <Input type="number" step="0.01" value={form.safetyMaxBlurScore} onChange={(e) => update("safetyMaxBlurScore", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Min image width (px)</Label>
                <Input type="number" value={form.safetyMinImageWidth} onChange={(e) => update("safetyMinImageWidth", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Min image height (px)</Label>
                <Input type="number" value={form.safetyMinImageHeight} onChange={(e) => update("safetyMinImageHeight", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Abuse automation */}
        <Card>
          <CardHeader>
            <CardTitle>Abuse automation</CardTitle>
            <CardDescription>Automated duplicate/spam detection thresholds (0–1).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Report threshold</Label>
              <Input type="number" step="0.01" value={form.abuseReportThreshold} onChange={(e) => update("abuseReportThreshold", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Under review threshold</Label>
              <Input type="number" step="0.01" value={form.abuseReviewThreshold} onChange={(e) => update("abuseReviewThreshold", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Soft remove threshold</Label>
              <Input type="number" step="0.01" value={form.abuseRemoveThreshold} onChange={(e) => update("abuseRemoveThreshold", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Match block threshold</Label>
              <Input type="number" step="0.01" value={form.matchBlockThreshold} onChange={(e) => update("matchBlockThreshold", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Same-user repost lookback (days)</Label>
              <Input type="number" value={form.sameUserRepostLookbackDays} onChange={(e) => update("sameUserRepostLookbackDays", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dedup lookback (days)</Label>
              <Input type="number" value={form.dedupLookbackDays} onChange={(e) => update("dedupLookbackDays", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Social media accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Social media accounts</CardTitle>
            <CardDescription>
              Profile links shown in the footer. New platforms below are saved with Save settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {form.socialLinks.map((link, index) => (
                <div key={`${link.platform}-${index}`} className="flex items-center gap-3">
                  <Input
                    type="text"
                    placeholder="Platform (e.g. instagram)"
                    value={link.platform}
                    onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                    className="w-1/3"
                  />
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSocialLink(index)}
                    className="text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label className="text-xs text-muted-foreground">Add platform</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Platform (e.g. instagram)"
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value)}
                  className="w-1/3"
                />
                <Input
                  type="url"
                  placeholder="https://..."
                  value={newPlatformUrl}
                  onChange={(e) => setNewPlatformUrl(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pet types */}
        <Card>
          <CardHeader>
            <CardTitle>Pet types</CardTitle>
            <CardDescription>Supported species for new alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="rounded-lg border bg-muted/30 p-3 text-sm capitalize text-muted-foreground">
              {(form.supportedPetTypes || PET_TYPES).join(", ")}
            </p>
            <p className="text-xs text-muted-foreground">
              Defined in app defaults. Contact engineering to change the allowed species list.
            </p>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={loading} size="lg">
        {loading ? "Saving…" : "Save all settings"}
      </Button>
    </div>
  );
}
