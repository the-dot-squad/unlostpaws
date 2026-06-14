import { env, assertProductionSecrets } from "@/config/env";

export async function register() {
  if (env.runtime === "nodejs") {
    assertProductionSecrets();
  }
}
