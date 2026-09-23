/** @file Prelude SDK singleton — only instantiate when API token is configured. */

import "server-only";
import Prelude from "@prelude.so/sdk";
import { env } from "@/config/env";

/** @type {InstanceType<typeof Prelude> | null} */
let preludeClient = null;

/** @returns {InstanceType<typeof Prelude>} */
export function getPrelude() {
  if (!env.prelude.configured) {
    throw new Error("Prelude is not configured (PRELUDE_API_TOKEN missing)");
  }
  if (!preludeClient) {
    preludeClient = new Prelude({ apiToken: env.prelude.apiToken });
  }
  return preludeClient;
}

export function isPreludeConfigured() {
  return env.prelude.configured;
}
