import { env } from "@/config/env";

export async function GET() {
  const clientId = env.auth.microsoft.clientId;
  if (!clientId) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json(
    {
      associatedApplications: [{ applicationId: clientId }],
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
