"use client";

import { useTranslations } from "next-intl";
import { resolveAttributeLabel } from "@/config/pet-attributes";

/**
 * Renders a stored color/breed value: catalog key → localized label, else as-is (custom or legacy).
 *
 * @param {object} props
 * @param {string} [props.value]
 * @param {"colors" | "breeds"} props.namespace
 * @param {string} [props.className]
 * @param {string} [props.fallback=""]
 */
export function AttributeLabel({ value, namespace, className, fallback = "" }) {
  const t = useTranslations(namespace);
  if (!value) return fallback ? <span className={className}>{fallback}</span> : null;
  const label = resolveAttributeLabel(value, t);
  return <span className={className}>{label}</span>;
}
