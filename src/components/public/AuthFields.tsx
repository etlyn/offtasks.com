import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/components/ui/utils";
import { getPasswordChecklist } from "@/utils/auth";

export const authInputClassName =
  "h-12 w-full rounded-2xl border border-[#cfe3dd] bg-white px-4 text-[15px] text-[#123532] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition placeholder:text-[#84a09a] focus:border-[#134E4A]/40 focus:ring-4 focus:ring-[#99F6E4]/35 disabled:cursor-not-allowed disabled:opacity-60";

interface AuthTextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  labelAction?: ReactNode;
  rightSlot?: ReactNode;
}

export const AuthTextInput = ({
  label,
  helperText,
  labelAction,
  rightSlot,
  className,
  id,
  ...props
}: AuthTextInputProps) => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="text-sm font-semibold text-[#244642]">
        {label}
      </Label>
      {labelAction ? (
        <div className="text-sm">{labelAction}</div>
      ) : helperText ? (
        <p className="text-xs font-medium text-[#6e8a84]">{helperText}</p>
      ) : null}
    </div>

    <div className="relative">
      <input
        id={id}
        className={cn(authInputClassName, rightSlot ? "pr-12" : "", className)}
        {...props}
      />
      {rightSlot ? (
        <div className="absolute inset-y-0 right-3 flex items-center">
          {rightSlot}
        </div>
      ) : null}
    </div>
  </div>
);

interface AuthPasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  labelAction?: ReactNode;
}

export const AuthPasswordInput = ({
  label,
  helperText,
  labelAction,
  ...props
}: AuthPasswordInputProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <AuthTextInput
      {...props}
      label={label}
      helperText={helperText}
      labelAction={labelAction}
      type={visible ? "text" : "password"}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="inline-flex size-8 items-center justify-center rounded-full text-[#5f7c76] transition hover:bg-[#edf8f4] hover:text-[#123532]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="size-4.5" />
          ) : (
            <Eye className="size-4.5" />
          )}
        </button>
      }
    />
  );
};

interface PasswordChecklistProps {
  password: string;
}

export const PasswordChecklist = ({ password }: PasswordChecklistProps) => {
  const checklist = getPasswordChecklist(password);

  return (
    <div className="rounded-2xl border border-[#d9ece6] bg-[#f4fbf8] p-4">
      <p className="text-sm font-semibold text-[#123532]">Password guidance</p>
      <div className="mt-3 grid gap-2">
        {checklist.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 text-sm text-[#5a7671]"
          >
            {item.satisfied ? (
              <CheckCircle2 className="size-4 text-[#0f766e]" />
            ) : (
              <Circle className="size-4 text-[#8aa5a0]" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
