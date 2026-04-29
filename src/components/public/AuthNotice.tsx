import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/utils";

type AuthNoticeTone = "error" | "success" | "info";

interface AuthNoticeProps {
  children: ReactNode;
  tone?: AuthNoticeTone;
}

const toneStyles: Record<AuthNoticeTone, string> = {
  error: "border-[#fecaca] bg-[#fff1f1] text-[#b42318]",
  success: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
  info: "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]",
};

const toneIcons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
} satisfies Record<AuthNoticeTone, typeof AlertCircle>;

export const AuthNotice = ({ children, tone = "info" }: AuthNoticeProps) => {
  const Icon = toneIcons[tone];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6",
        toneStyles[tone],
      )}
    >
      <Icon className="mt-0.5 size-4.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
};
