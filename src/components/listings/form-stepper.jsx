import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal step indicator for multi-step forms.
 */
export function FormStepper({ steps, currentStep, labels }) {
  return (
    <nav aria-label="Progress" className="mb-6">
      <ol className="flex items-center gap-2">
        {steps.map((key, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li key={key} className="flex flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    isComplete && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary",
                    !isComplete && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="size-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    "hidden w-full truncate text-center text-xs sm:block",
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {labels[key]}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mb-5 h-0.5 flex-1",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-center text-sm font-medium sm:hidden">{labels[steps[currentStep]]}</p>
    </nav>
  );
}
