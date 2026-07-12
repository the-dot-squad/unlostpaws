import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createPresignedUpload } from "@/lib/storage/s3";
import { validate, presignUploadSchema } from "@/lib/validation";
import { enforceUploadRateLimits, recordListingUploadPresign } from "@/lib/rate-limit";
import { rejectCrossSiteRequest } from "@/lib/request-metadata";
import { connectDB } from "@/config/db";

export async function POST(request) {
  const blocked = rejectCrossSiteRequest(request);
  if (blocked) return blocked;

  await connectDB();

  const session = await getSession();
  const isInactive = session?.user?.status ? session.user.status !== "active" : session?.user?.banned;
  if (!session || isInactive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const { Upload } = await import("@/models/upload");
    await Upload.create({
      key: result.key,
      url: result.publicUrl,
      userId: session.user.id,
      prefix,
      status: "pending",
    });
  } catch (err) {
    console.error("Failed to track presigned upload in DB:", err);
  }

  await recordListingUploadPresign(session.user.id, prefix);

  return NextResponse.json(result);
}
