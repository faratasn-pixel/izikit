import { type InputHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhoneFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  /** Country flag emoji, e.g. "🇧🇯". */
  flag: string;
  /** Dial code, e.g. "+229". Visual only — no country picker in this pass. */
  dialCode: string;
}

export function PhoneField({ label, flag, dialCode, id, className, ...props }: PhoneFieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-medium text-neutral-700">
        {label}
      </label>
      <div className="flex min-h-12 items-center rounded-[10px] border-[1.5px] border-black/[0.08] bg-gray-50 focus-within:border-brand">
        <div className="flex h-full min-h-12 items-center gap-1.5 border-r-[1.5px] border-black/[0.08] py-0 pl-3.5 pr-3 whitespace-nowrap">
          <span className="text-lg leading-none">{flag}</span>
          <span className="text-sm font-medium text-neutral-900">{dialCode}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" aria-hidden />
        </div>
        <input
          id={inputId}
          type="tel"
          className={cn(
            'h-12 flex-1 bg-transparent pl-3 pr-3.5 text-[15px] text-neutral-900 outline-none placeholder:text-gray-400',
            className,
          )}
          {...props}
        />
      </div>
    </div>
  );
}
