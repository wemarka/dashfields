/**
 * WizardProgressBar.tsx — Step progress indicator for the campaign wizard.
 */
import { cn } from "@/core/lib/utils";
import { Check } from "lucide-react";
import { STEP_ORDER, STEP_LABELS, type WizardStep } from "./types";

interface Props {
  currentStep: WizardStep;
}

const VISIBLE_STEPS: WizardStep[] = [
  "discovery",
  "brand_assets",
  "creative_review",
  "content_plan",
  "budget_review",
  "preview",
  "confirmed",
];

export function WizardProgressBar({ currentStep }: Props) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="w-full px-6 py-4 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Connecting line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-neutral-800 z-0" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600 z-0 transition-all duration-500"
            style={{
              width: `${(Math.max(0, VISIBLE_STEPS.indexOf(currentStep)) / (VISIBLE_STEPS.length - 1)) * 100}%`,
            }}
          />

          {VISIBLE_STEPS.map((step, idx) => {
            const stepIdx = STEP_ORDER.indexOf(step);
            const isCompleted = stepIdx < currentIdx;
            const isCurrent = step === currentStep || (step === "generating" && currentStep === "generating");
            const isActive = isCompleted || isCurrent;

            return (
              <div key={step} className="flex flex-col items-center gap-1.5 z-10">
                {/* Circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                    isCompleted
                      ? "bg-red-500 text-white shadow-md shadow-red-200"
                      : isCurrent
                        ? "bg-red-500 text-white shadow-lg shadow-red-300 scale-110"
                        : "bg-neutral-800 text-neutral-500 border border-neutral-700",
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] font-medium text-center leading-tight max-w-[60px] hidden sm:block",
                    isActive ? "text-red-600" : "text-neutral-500",
                  )}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
