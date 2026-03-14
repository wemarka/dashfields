import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";

interface FieldErrorProps {
  /** The error message to display. If falsy, renders nothing. */
  message?: string | null;
  /** Optional id — use this as the `aria-describedby` value on the related Input */
  id?: string;
  /** Additional class names */
  className?: string;
}

/**
 * FieldError — inline form field error message.
 *
 * Renders nothing when `message` is falsy, so it's safe to always mount it.
 *
 * Usage:
 * ```tsx
 * import { FieldError } from "@/core/components/ui/field-error";
 *
 * <Input
 *   aria-invalid={!!errors.email}
 *   aria-describedby="email-error"
 *   {...register("email")}
 * />
 * <FieldError id="email-error" message={errors.email?.message} />
 * ```
 */
export function FieldError({ message, id, className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-center gap-1 text-xs font-medium text-[#ef3735] mt-1",
        className
      )}
    >
      <AlertCircle className="w-3 h-3 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
