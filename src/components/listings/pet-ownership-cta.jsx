import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Plus } from "lucide-react";

/**
 * Soft CTA banner displayed at the end of the listings archive page.
 * Encourages pet owners to pre-register their pet ownership and microchip details
 * for proactive protection and instant AI matching.
 */
export function PetOwnershipCta({
  locale,
  badge,
  title,
  description,
  button,
}) {
  const prefix = `/${locale}`;

  return (
    <Card className="mt-10 md:mt-12 overflow-hidden border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent transition-all duration-300 hover:border-emerald-500/35 dark:from-emerald-500/15 dark:via-emerald-500/5 dark:border-emerald-500/30">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              {badge && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    {badge}
                  </Badge>
                </div>
              )}
              <h3 className="text-lg font-bold text-foreground sm:text-xl">
                {title}
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <Button
            asChild
            size="lg"
            className="shrink-0 bg-emerald-600 font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Link href={`${prefix}/account/pets/new`}>
              <Plus className="mr-1.5 size-4" />
              {button}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
