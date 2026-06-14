"use client";

import { useTranslations } from "next-intl";
import { Camera, PawPrint, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_ICONS = {
  details: PawPrint,
  location: MapPin,
  photos: Camera,
};

const STEP_POINTS = 3;

/**
 * Left sidebar: step progress and contextual guide as one flat flow.
 */
export function CreateListingSidebar({ steps, currentStep, labels }) {
  const t = useTranslations("listings");
  const tGuide = useTranslations("listings.stepGuide");
  const stepKey = steps[currentStep];
  const StepIcon = STEP_ICONS[stepKey] || Camera;

  return (
    <aside className="flex flex-col gap-6 border-b bg-primary/5 p-6 md:border-b-0 md:border-e md:p-8">
      <nav aria-label="Progress" className="space-y-3">
        <ol className="flex w-full items-center">
          {steps.map((key, index) => {
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;
            const isLast = index === steps.length - 1;
            const Icon = STEP_ICONS[key] || Camera;

            return (
              <li key={key} className={cn("flex items-center", !isLast && "min-w-0 flex-1")}>
                <div className="flex min-w-0 flex-col items-center gap-1.5">
                  <div
                    title={labels[key]}
                    aria-label={labels[key]}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-all md:size-9",
                      isComplete && "border-primary bg-primary text-primary-foreground",
                      isCurrent && "border-primary bg-background text-primary ring-4 ring-primary/15",
                      !isComplete && !isCurrent && "border-muted-foreground/25 bg-background text-muted-foreground"
                    )}
                  >
                    {isComplete ? <Check className="size-3.5 md:size-4" /> : <Icon className="size-3.5 md:size-4" />}
                  </div>
                  <span
                    className={cn(
                      "max-w-[4.5rem] truncate text-center text-[10px] leading-tight md:max-w-none",
                      isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {labels[key]}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "mx-1.5 mb-5 h-0.5 min-w-3 flex-1 rounded-full md:mx-2",
                      index < currentStep ? "bg-primary" : "bg-border"
                    )}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-center text-[11px] text-muted-foreground">
          {t("stepOf", { current: currentStep + 1, total: steps.length })}
        </p>
      </nav>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <StepIcon className="size-5 shrink-0" aria-hidden />
            <h2 className="text-base font-bold leading-snug md:text-lg">{tGuide(`${stepKey}.title`)}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{tGuide(`${stepKey}.description`)}</p>
        </div>

        <ul className="space-y-2.5">
          {Array.from({ length: STEP_POINTS }, (_, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>{tGuide(`${stepKey}.point${i + 1}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] text-muted-foreground/80">{tGuide("footer")}</p>
    </aside>
  );
}
