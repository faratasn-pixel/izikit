import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Téléphone', 'Vérification', 'Nouveau mot de passe'] as const;

interface ResetStepIndicatorProps {
  /** 1-indexed active step, matching the Banani "Password Reset" flow. */
  activeStep: 1 | 2 | 3;
}

/**
 * Shared step row for the forgot/reset-password flow (Banani screens
 * "Password Reset" / "SMS Verification" / "New Password"). Steps before
 * `activeStep` render as done (checkmark), the current step as active, the
 * rest as inactive.
 */
export function ResetStepIndicator({ activeStep }: ResetStepIndicatorProps) {
  return (
    <div className="mb-9 flex items-center">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < activeStep;
        const active = step === activeStep;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done || active ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : step}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium whitespace-nowrap sm:inline',
                  done || active ? 'text-brand' : 'text-gray-400',
                )}
              >
                {label}
              </span>
            </div>
            {step < STEPS.length && (
              <div className={cn('mx-2.5 h-px flex-1', done ? 'bg-brand' : 'bg-black/[0.08]')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
