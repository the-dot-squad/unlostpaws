import { NextResponse } from "next/server";
import { connectDB } from "@/config/db";
import { OwnedPet } from "@/models/owned-pet";
import { upsertOwnedPetVector } from "@/lib/qdrant";
import { assessOwnedPetSafety } from "@/lib/intelligence/safety/assess-content-safety";

/**
 * @param {object} body
 */
export async function processOwnedPetCallback(body) {
  const {
    ownedPetId,
    images,
    embeddingModel,
    workerVersion,
    runtime,
    executionProvider,
    modelPrecision,
    safetyModel,
    errors = [],
  } = body;

  if (!ownedPetId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await connectDB();

  // Common metadata to store on all result paths
  const telemetry = {
    worker: {
      version: workerVersion || "",
      runtime: runtime || "",
      executionProvider: executionProvider || "",
      precision: modelPrecision || "",
      safetyModel: safetyModel || "",
    },
  };

  if (!images?.length) {
    await OwnedPet.findByIdAndUpdate(ownedPetId, {
      processingStatus: "failed",
      processingError: errors.map((e) => e.error).join("; ") || "Processing failed",
      ...telemetry,
    });
    return NextResponse.json({ success: false, failed: true });
  }

  const safety = await assessOwnedPetSafety(images);
  if (!safety.ok) {
    await OwnedPet.findByIdAndUpdate(ownedPetId, {
      processingStatus: "failed",
      processingError: safety.error || "Content safety check failed",
      ...telemetry,
    });
    return NextResponse.json({ success: false, failed: true, contentBlocked: true });
  }

  const img = images[0];
  if (!img?.embedding?.length) {
    await OwnedPet.findByIdAndUpdate(ownedPetId, {
      processingStatus: "failed",
      processingError: errors.map((e) => e.error).join("; ") || "No embedding produced",
      ...telemetry,
    });
    return NextResponse.json({ success: false, failed: true });
  }

  const pet = await OwnedPet.findById(ownedPetId).select("userId name petType status").lean();
  if (!pet) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }

  const modelId = embeddingModel || "";

  await upsertOwnedPetVector({
    ownedPetId,
    vector: img.embedding,
    payload: {
      userId: pet.userId,
      status: pet.status,
      petType: pet.petType,
      embeddingModel: modelId,
      name: pet.name,
    },
  });

  await OwnedPet.findByIdAndUpdate(ownedPetId, {
    embeddingModel: modelId,
    hasEmbedding: true,
    processingStatus: "ready",
    processingError: errors.length ? errors.map((e) => `${e.url}: ${e.error}`).join("; ") : "",
    ...telemetry,
  });

  return NextResponse.json({
    success: true,
    partialErrors: errors.length > 0,
  });
}
