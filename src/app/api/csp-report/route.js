import { NextResponse } from "next/server";
import { isProd } from "@/config/env";

const MAX_BODY_BYTES = 8_192;

/** Accept browser CSP violation reports (report-uri / report-to). */
export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  if (
    !contentType.includes("application/csp-report") &&
    !contentType.includes("application/json")
  ) {
    return new NextResponse(null, { status: 415 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  try {
    const payload = JSON.parse(raw);
    const report = payload["csp-report"] ?? payload;
    const summary = {
      documentUri: report["document-uri"] || report.documentURI,
      violatedDirective: report["violated-directive"] || report.violatedDirective,
      blockedUri: report["blocked-uri"] || report.blockedURI,
      sourceFile: report["source-file"] || report.sourceFile,
      lineNumber: report["line-number"] || report.lineNumber,
    };

    if (isProd) {
      console.warn("[csp-report]", JSON.stringify(summary));
    } else {
      console.info("[csp-report]", summary);
    }
  } catch {
    if (isProd) {
      console.warn("[csp-report] invalid payload");
    }
  }

  return new NextResponse(null, { status: 204 });
}
