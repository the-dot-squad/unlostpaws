import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadObject } from "@/lib/storage/s3";
import { ALLOWED_IMAGE_MIMES, validateImageBuffer } from "@/lib/storage/images";
import { enforceUploadRateLimits } from "@/lib/rate-limit";
import { rejectCrossSiteRequest } from "@/lib/request-metadata";

export async function POST(request) {
  const blocked = rejectCrossSiteRequest(request);
  if (blocked) return blocked;

  const session = await getSession();
  if (!session || session.user.banned) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const key = formData.get("key");

  if (!file || !key || typeof key !== "string") {
    return NextResponse.json({ error: "Missing file or key" }, { status: 400 });
  }

  const prefix = key.split("/")[0] || "listings";
  const rateCheck = await enforceUploadRateLimits({
    userId: session.user.id,
    prefix,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.error }, { status: rateCheck.status });
  }

  if (!key.includes(`/${session.user.id}/`)) {
    return NextResponse.json({ error: "Invalid upload key" }, { status: 403 });
  }

  const contentType = file.type || "application/octet-stream";
  if (contentType !== "application/octet-stream" && !ALLOWED_IMAGE_MIMES.includes(contentType)) {
    return NextResponse.json({ error: "invalid_image_type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeCheck = validateImageBuffer(buffer, contentType);
  if (!mimeCheck.ok) {
    return NextResponse.json({ error: mimeCheck.reason }, { status: 400 });
  }

  const { publicUrl } = await uploadObject({
    key,
    body: buffer,
    contentType: mimeCheck.mime,
  });

  return NextResponse.json({ publicUrl, key });
}
