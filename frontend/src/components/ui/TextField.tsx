import { type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Rendered to the right of the label, e.g. a "forgot password?" link. */
  labelSlot?: ReactNode;
  /** Rendered inside the field, right-aligned (e.g. show/hide password toggle). */
  trailing?: ReactNode;
}

export function TextField({ label, labelSlot, trailing, id, className, ...props }: TextFieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="text-[13px] font-medium text-neutral-700">
          {label}
        </label>
        {labelSlot}
      </div>
      <div className="flex min-h-12 items-center rounded-[10px] border-[1.5px] border-black/[0.08] bg-gray-50 focus-within:border-brand">
        <input
          id={inputId}
          className={cn(
            'h-12 flex-1 bg-transparent px-3.5 text-[15px] text-neutral-900 outline-none placeholder:text-gray-400',
            className,
          )}
          {...props}
        />
        {trailing && <div className="flex items-center px-3.5 text-gray-400">{trailing}</div>}
      </div>
    </div>
  );
}
