import { NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import { createPresignedUpload } from "@/lib/storage/s3";
import { validate, presignUploadSchema } from "@/lib/validation";
import { enforceUploadRateLimits, recordListingUploadPresign } from "@/lib/rate-limit";
import {
  requireActiveSessionForApi,
  trackPendingUpload,
} from "@/lib/api/upload-route";

export async function POST(request) {
  const auth = await requireActiveSessionForApi(request);
  if (auth instanceof NextResponse) return auth;
  const { session } = auth;

  const body = await request.json();
  const parsed = validate(presignUploadSchema, body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { contentType, extension, prefix } = parsed.data;

  const rateCheck = await enforceUploadRateLimits({
    userId: session.user.id,
    prefix,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.error }, { status: rateCheck.status });
  }

  const result = await createPresignedUpload({
    userId: session.user.id,
    contentType,
    extension,
    prefix,
  });

  try {
    await trackPendingUpload({
      key: result.key,
      url: result.publicUrl,
      userId: session.user.id,
      prefix,
    });
  } catch (err) {
    console.error("Failed to track presigned upload in DB:", err);
  }

  await recordListingUploadPresign(session.user.id, prefix);

  return NextResponse.json(result);
}
