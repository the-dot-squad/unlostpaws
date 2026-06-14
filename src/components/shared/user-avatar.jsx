"use client";

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

/**
 * User profile avatar with initials fallback.
 * Uses a native <img> (via Radix) so OAuth provider URLs work without next/image remote config.
 */
export function UserAvatar({ name, imageUrl, size = "md", className }) {
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {imageUrl ? <AvatarImage src={imageUrl} alt={name || ""} /> : null}
      <AvatarFallback className="font-medium text-muted-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
