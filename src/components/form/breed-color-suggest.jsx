"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { getBreedKeys, getColorKeys } from "@/config/pet-attributes";
import { SuggestCombobox } from "@/components/form/suggest-combobox";

/**
 * Color hybrid suggest — shared palette for all pet types.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.id]
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 */
export function ColorSuggest({
  value,
  onChange,
  id = "color",
  required,
  disabled,
  placeholder,
  className,
}) {
  const t = useTranslations("colors");
  const options = useMemo(
    () => getColorKeys().map((key) => ({ value: key, label: t(key) })),
    [t]
  );

  return (
    <SuggestCombobox
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  );
}

/**
 * Breed hybrid suggest — options filtered by pet type.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.petType]
 * @param {string} [props.id]
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 */
export function BreedSuggest({
  value,
  onChange,
  petType,
  id = "breed",
  required,
  disabled,
  placeholder,
  className,
}) {
  const t = useTranslations("breeds");
  const options = useMemo(() => {
    return getBreedKeys(petType).map((key) => ({ value: key, label: t(key) }));
  }, [petType, t]);

  return (
    <SuggestCombobox
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  );
}
