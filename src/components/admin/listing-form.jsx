"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LISTING_STATUSES, LISTING_TYPES, PET_TYPES } from "@/config/constants/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { LocationPicker } from "@/components/map/location-picker";
import { AdminListingImagesPanel } from "@/components/admin/listing-images-panel";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { adminUpdateListing } from "@/lib/actions/admin";
import { AdminListingExtensionPanel } from "@/components/admin/listing-extension-panel";
import { hasSetCoordinates } from "@/lib/geo";
import { formatDate } from "@/lib/format";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

/** Admin form to edit all key listing fields including map and images. */
export function AdminListingForm({ listing, extensionDays = 30 }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: listing.type,
    status: listing.status,
    petType: listing.petType,
    breed: listing.breed || "",
    color: listing.color,
    description: listing.description || "",
    address: listing.location?.address || "",
    city: listing.location?.city || "",
    country: listing.location?.country || "",
    lng: listing.location?.coordinates?.[0] ?? null,
    lat: listing.location?.coordinates?.[1] ?? null,
  });

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleReverseGeocode(data) {
    setForm((f) => ({
      ...f,
      address: data.address || f.address,
      city: data.city || f.city,
      country: data.country || f.country,
    }));
  }

  function handleCoordinatesChange(nextLat, nextLng) {
    setForm((f) => ({ ...f, lat: nextLat, lng: nextLng }));
  }

  async function handleSave() {
    if (!hasSetCoordinates(Number(form.lng), Number(form.lat))) {
      toast.error("Set a valid location on the map or enter coordinates");
      return;
    }

    setLoading(true);
    const result = await adminUpdateListing(listing.publicId, {
      ...form,
      lng: Number(form.lng),
      lat: Number(form.lat),
    });
    setLoading(false);

    if (result?.success) {
      toast.success("Listing updated");
      router.refresh();
      return;
    }
    toast.error(result?.error ?? "Could not save");
  }

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/listings" label="Back to listings" />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => update("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LISTING_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LISTING_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pet type</Label>
                  <Select value={form.petType} onValueChange={(v) => update("petType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PET_TYPES.map((pt) => (
                        <SelectItem key={pt} value={pt} className="capitalize">{pt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input value={form.color} onChange={(e) => update("color", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Breed</Label>
                  <Input value={form.breed} onChange={(e) => update("breed", e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminListingImagesPanel images={listing.images} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationPicker
                lat={form.lat}
                lng={form.lng}
                tileTheme="light"
                labels={{
                  hint: "Click the map or drag the pin to set location.",
                  geocoding: "Looking up address…",
                  useMyLocation: "Use my location",
                  locationDenied: "Could not access your location",
                }}
                onCoordinatesChange={handleCoordinatesChange}
                onReverseGeocode={handleReverseGeocode}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.lat ?? ""}
                    onChange={(e) => update("lat", e.target.value === "" ? null : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.lng ?? ""}
                    onChange={(e) => update("lng", e.target.value === "" ? null : Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => update("country", e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {/* Sidebar — metadata */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Public ID</p>
                <p className="mt-1 font-mono text-xs">{listing.publicId}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
                <div className="mt-1"><AdminStatusBadge value={listing.status} /></div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Owner</p>
                {listing.ownerPublicId ? (
                  <Link
                    href={`/admin/users/${listing.ownerPublicId}`}
                    className="mt-1 block font-mono text-xs hover:underline"
                  >
                    {listing.ownerPublicId}
                  </Link>
                ) : (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{listing.userId}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Reports</p>
                <p className="mt-1 font-medium">
                  {listing.openReportCount ?? 0} open
                  <span className="text-muted-foreground">
                    {" "}
                    / {listing.reportCount || 0} all time
                  </span>
                </p>
                {(listing.openReportCount ?? 0) > 0 ? (
                  <Link
                    href={`/admin/reports?listingId=${listing._id}&status=open`}
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    Review open cases
                  </Link>
                ) : (listing.reportCount || 0) > 0 ? (
                  <Link
                    href={`/admin/reports?listingId=${listing._id}&status=all`}
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    View report history
                  </Link>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">ML processing</p>
                <p className="mt-1 capitalize">{listing.processingStatus}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Photos</p>
                <p className="mt-1">{listing.images?.length || 0}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Created</p>
                <p className="mt-1">{formatDate(listing.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Expiry</p>
                <div className="mt-2">
                  <AdminListingExtensionPanel listing={listing} extensionDays={extensionDays} />
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={`/${listing.ownerLocale || "en"}/listings/${listing.publicId}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  View public ad
                </a>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
