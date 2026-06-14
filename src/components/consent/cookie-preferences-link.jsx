"use client";

import { Cookie } from "lucide-react";
import { showCookiePreferences } from "@/lib/consent";

/**
 * Footer control that reopens the cookie preferences modal.
 * @param {{ label: string }} props
 */
export function CookiePreferencesLink({ label }) {
  return (
    <button
      type="button"
      data-cc="show-preferencesModal"
      onClick={showCookiePreferences}
      className="group inline-flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      aria-haspopup="dialog"
    >
      <Cookie className="size-4 shrink-0 text-primary/70 transition-colors group-hover:text-primary" />
      <span>{label}</span>
    </button>
  );
}
