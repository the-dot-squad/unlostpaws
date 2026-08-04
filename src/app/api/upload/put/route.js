import { NextResponse } from "next/server";
import { uploadObject } from "@/lib/storage/s3";
import { ALLOWED_IMAGE_MIMES, validateImageBuffer } from "@/lib/storage/images";
import { processAvatarBuffer } from "@/lib/storage/avatar";
import { enforceUploadRateLimits } from "@/lib/rate-limit";
import {
  requireActiveSessionForApi,
  upsertPendingUpload,
} from "@/lib/api/upload-route";

export async function POST(request) {
  const auth = await requireActiveSessionForApi(request);
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;

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

  let uploadBody = buffer;
  let uploadContentType = mimeCheck.mime;
  let uploadKey = key;

  if (prefix === "avatars") {
    const processed = await processAvatarBuffer(buffer);
    uploadBody = processed.buffer;
    uploadContentType = processed.contentType;
    uploadKey = key.replace(/\.[^.]+$/, `.${processed.extension}`);
  }

  const { publicUrl } = await uploadObject({
    key: uploadKey,
    body: uploadBody,
    contentType: uploadContentType,
  });

  try {
    await upsertPendingUpload({
      key: uploadKey,
      url: publicUrl,
      userId: session.user.id,
      prefix,
    });
  } catch (err) {
    console.error("Failed to track direct upload in DB:", err);
  }

  return NextResponse.json({ publicUrl, key: uploadKey });
}
