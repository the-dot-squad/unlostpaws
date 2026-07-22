"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OWNED_PET_STATUSES, PET_TYPES } from "@/config/constants/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminUpdateOwnedPet } from "@/lib/actions/admin";
import { AdminRequeueProcessingButton } from "@/components/admin/requeue-processing-button";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

/** Admin form to edit registered pet details. */
export function AdminPetForm({ pet, owner }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: pet.name,
    microchipId: pet.microchipId,
    petType: pet.petType,
    breed: pet.breed || "",
    color: pet.color,
    description: pet.description || "",
    status: pet.status,
    adminNote: pet.adminNote || "",
  });

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    const result = await adminUpdateOwnedPet(pet.publicId, form);
    setLoading(false);

    if (result?.success) {
      toast.success("Pet updated");
      router.refresh();
      return;
    }
    toast.error(result?.error ?? "Could not save");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          {pet.photo?.url ? (
            <div className="relative size-16 overflow-hidden rounded-lg border">
              <Image src={pet.photo.url} alt="" fill className="object-cover" sizes="64px" />
            </div>
          ) : null}
          <CardTitle>Edit registered pet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Microchip ID</Label>
              <Input
                value={form.microchipId}
                onChange={(e) => update("microchipId", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OWNED_PET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
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
            <Textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Admin note</Label>
            <Textarea rows={2} value={form.adminNote} onChange={(e) => update("adminNote", e.target.value)} placeholder="Internal note visible only to admins" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Owner & metadata</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p><span className="font-medium text-foreground">Owner:</span> {owner?.name || "—"}</p>
          <p><span className="font-medium text-foreground">Email:</span> {owner?.email || "—"}</p>
          <p><span className="font-medium text-foreground">Processing:</span> {pet.processingStatus}</p>
          <div className="sm:col-span-2">
            <AdminRequeueProcessingButton
              kind="owned-pet"
              publicId={pet.publicId}
              status={pet.processingStatus}
              processingError={pet.processingError}
            />
          </div>
          <p><span className="font-medium text-foreground">Created:</span> {formatDate(pet.createdAt)}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/admin/pets")}>Back to pets</Button>
      </div>
    </div>
  );
}
