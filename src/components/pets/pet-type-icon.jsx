import { PET_TYPE_ICONS } from "@/config/pet-type-icons";
import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

const FALLBACK_ICON = PawPrint;

export function PetTypeIcon({ type, className }) {
  const Icon = PET_TYPE_ICONS[type] ?? FALLBACK_ICON;
  return <Icon className={cn("size-4 shrink-0", className)} aria-hidden />;
}
