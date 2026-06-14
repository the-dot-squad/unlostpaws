"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { publicEnv } from "@/config/public";

export const authClient = createAuthClient({
  baseURL: publicEnv.appUrl,
  plugins: [inferAdditionalFields()],
});

export const { useSession, signIn, signOut } = authClient;
