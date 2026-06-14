import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

async function getHandler() {
  const auth = await getAuth();
  return toNextJsHandler(auth);
}

export async function GET(request) {
  const handler = await getHandler();
  return handler.GET(request);
}

export async function POST(request) {
  const handler = await getHandler();
  return handler.POST(request);
}
