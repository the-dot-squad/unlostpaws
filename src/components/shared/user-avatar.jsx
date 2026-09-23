"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const SIZES = {
  sm: "size-10 text-xs",
  md: "size-12 text-sm",
  lg: "size-20 text-lg",
};

const BADGE_SIZES = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

const BADGE_ICONS = {
  sm: "size-2.5",
  md: "size-3",
  lg: "size-3.5",
};

/**
 * User profile avatar with initials fallback.
 * Uses a native <img> (via Radix) so OAuth provider URLs work without next/image remote config.
 * Premium members get the same amber ring + sparkles badge as account sidebar/settings.
 */
export function UserAvatar({
  name,
  imageUrl,
  size = "md",
  premium = false,
  verified = false,
  className,
}) {
  const tPremium = useTranslations("premium");
  const showPremium = premium || verified;

  return (
    <div className="relative shrink-0">
      <Avatar
        className={cn(
          SIZES[size],
          showPremium &&
            "ring-2 ring-amber-400/80 ring-offset-2 ring-offset-background dark:ring-amber-400/70",
          className
        )}
      >
        {imageUrl ? <AvatarImage src={imageUrl} alt={name || ""} /> : null}
        <AvatarFallback
          className={cn(
            "font-medium text-muted-foreground",
            showPremium && "bg-amber-500/15 text-amber-900 dark:text-amber-100"
          )}
        >
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {showPremium ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -end-0.5 flex items-center justify-center rounded-full bg-amber-500 text-amber-950 shadow-sm ring-2 ring-background",
            BADGE_SIZES[size]
          )}
          title={tPremium("active.badge")}
          aria-label={tPremium("active.badge")}
        >
          <Sparkles className={BADGE_ICONS[size]} aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
