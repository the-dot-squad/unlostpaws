import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: 20,
  nav: 32,
  md: 44,
  lg: 56,
};

export function AppLogo({ size = "sm", className }) {
  const px = typeof size === "number" ? size : (SIZES[size] ?? SIZES.sm);

  return (
    <Image
      src="/logo-compressed.png"
      alt=""
      width={px}
      height={px}
      className={cn("shrink-0", className)}
      aria-hidden
      priority
      unoptimized
    />
  );
}
