import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { getObject, hasS3Backend, isS3Storage } from "@/lib/storage/s3";
import { imageContentTypeFromExtension } from "@/lib/storage/images";
import { isDev } from "@/config/env";

const ALLOWED_PREFIXES = ["listings/", "pets/", "content/", "dev/"];

async function readLocalUploadByBasename(key) {
  const filePath = path.join(process.cwd(), "public", "uploads", path.basename(key));
  const body = await readFile(filePath);
  return { body, contentType: imageContentTypeFromExtension(path.extname(key).slice(1)) };
}

async function serveMedia(key) {
  if (key.includes("..") || key.includes("\\")) {
    if (isDev) console.warn("[media] rejected traversal:", key);
    return null;
  }

  if (!ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    if (isDev) console.warn("[media] rejected prefix:", key);
    return null;
  }

  try {
    const result = await getObject(key);
    if (isDev) console.info("[media] ok:", key, result.body.length, "bytes");
    return result;
  } catch (err) {
    if (isDev) {
      console.warn("[media] miss:", key, {
        error: err?.message || String(err),
        isS3Storage: isS3Storage(),
        hasS3Backend: hasS3Backend(),
      });
    }

    if (isS3Storage()) {
      try {
        return await readLocalUploadByBasename(key);
      } catch {
        return null;
      }
    }

    return null;
  }
}

function toResponse({ body, contentType }) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function GET(_request, { params }) {
  const { path: segments } = await params;
  const key = segments.map((segment) => decodeURIComponent(segment)).join("/");

  const result = await serveMedia(key);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return toResponse(result);
}

/** HEAD for image size probes in admin UI. */
export async function HEAD(_request, { params }) {
  const { path: segments } = await params;
  const key = segments.map((segment) => decodeURIComponent(segment)).join("/");

  const result = await serveMedia(key);
  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Length": String(result.body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
