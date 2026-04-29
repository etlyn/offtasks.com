import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogoWordmark } from "@/components/LogoWordmark";
import { cn } from "@/components/ui/utils";

interface PublicSiteShellProps {
  children: ReactNode;
  actionSlot?: ReactNode;
  className?: string;
}

export const PublicSiteShell = ({
  children,
  actionSlot,
  className,
}: PublicSiteShellProps) => (
  <div className="relative min-h-screen overflow-hidden bg-[#f3fbf8] text-[#123532]">
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(243,251,248,0.86)_52%,rgba(236,247,243,1)_100%)]" />
    <div className="absolute inset-0 bg-[linear-gradient(rgba(19,78,74,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(19,78,74,0.045)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
    <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#99F6E4]/60 blur-[90px] animate-[float-slow_18s_ease-in-out_infinite]" />
    <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-[#c7fff3]/70 blur-[110px] animate-[float-slow_22s_ease-in-out_infinite]" />
    <div className="absolute bottom-0 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-[#134E4A]/10 blur-[120px]" />

    <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between py-6 sm:py-8">
        <Link
          to="/"
          className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-[0_16px_32px_-24px_rgba(9,48,43,0.4)] backdrop-blur-xl transition hover:bg-white"
          aria-label="Offtasks home"
        >
          <LogoWordmark width={138} height={34} />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">{actionSlot}</div>
      </header>

      <div className={cn("flex-1", className)}>{children}</div>
    </div>
  </div>
);
