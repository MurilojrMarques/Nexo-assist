import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type InputFieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  labelAction?: ReactNode;
  trailing?: ReactNode;
};

export function InputField({
  id,
  label,
  icon: Icon,
  error,
  labelAction,
  trailing,
  className = "",
  ...inputProps
}: InputFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13.5px] font-medium text-ink">
          {label}
        </label>
        {labelAction}
      </div>

      <div
        className={`group flex h-11 items-center gap-2.5 rounded-lg bg-white pr-2 pl-3.5 outline focus-within:shadow-none focus-within:outline-[1.5px] ${
          error
            ? "outline-danger"
            : "shadow-[0_1px_2px_#1b24310a] outline-ink/12 focus-within:outline-primary"
        }`}
      >
        <Icon
          aria-hidden="true"
          className={`size-4 shrink-0 ${error ? "text-danger" : "text-muted group-focus-within:text-link"}`}
        />
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-full min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-muted/70 ${className}`}
          {...inputProps}
        />
        {trailing}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
