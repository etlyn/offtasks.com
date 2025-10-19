import { type ReactNode } from "react";
import { LogoWordmark } from "@/components/LogoWordmark";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export const AuthLayout = ({
  children,
  title,
  subtitle,
  rightAction,
}: AuthLayoutProps) => (
  <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12">
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-4">
        <LogoWordmark width={140} height={36} />
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-2xl sm:p-8">
        <div className="space-y-6">{children}</div>
      </div>

      {rightAction ? (
        <div className="mt-6 flex justify-center">{rightAction}</div>
      ) : null}
    </div>
  </div>
);
