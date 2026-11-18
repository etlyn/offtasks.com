import { Check, Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { getPasswordChecklist } from "@/utils/auth";

interface AuthTextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  labelAction?: ReactNode;
  rightSlot?: ReactNode;
}

export const AuthTextInput = ({ label, helperText, labelAction, rightSlot, className = "", id, ...props }: AuthTextInputProps) => (
  <div className="ot-field">
    <div className="ot-label-row">
      <label htmlFor={id} className="ot-label">
        {label}
      </label>
      {labelAction ? <span className="auth-label-action">{labelAction}</span> : helperText ? <span className="ot-label">{helperText}</span> : null}
    </div>
    <div className={rightSlot ? "ot-input-wrap" : undefined}>
      <input id={id} className={`ot-input ${className}`} {...props} />
      {rightSlot}
    </div>
  </div>
);

interface AuthPasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  labelAction?: ReactNode;
}

export const AuthPasswordInput = ({ label, helperText, labelAction, ...props }: AuthPasswordInputProps) => {
  const [visible, setVisible] = useState(false);
  return (
    <AuthTextInput
      {...props}
      label={label}
      helperText={helperText}
      labelAction={labelAction}
      type={visible ? "text" : "password"}
      rightSlot={
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff size={18} strokeWidth={1.8} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.8} aria-hidden="true" />}
        </button>
      }
    />
  );
};

export const PasswordChecklist = ({ password }: { password: string }) => (
  <ul className="auth-checklist" aria-label="Password guidance">
    {getPasswordChecklist(password).map((item) => (
      <li key={item.label} data-met={item.satisfied || undefined}>
        <i aria-hidden="true">{item.satisfied ? <Check size={11} strokeWidth={2.4} /> : null}</i>
        <span>{item.label}</span>
        <span className="ot-visually-hidden">{item.satisfied ? " (met)" : " (not met yet)"}</span>
      </li>
    ))}
  </ul>
);
