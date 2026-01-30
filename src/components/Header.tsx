import svgPaths from "../imports/svg-gcwartiq9w";
import { ProfileMenu } from "./ProfileMenu";

interface HeaderProps {
  totalCompleted: number;
  totalTasks: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  advancedMode?: boolean;
  hideCompleted?: boolean;
  onToggleAdvancedMode?: () => void;
  onToggleHideCompleted?: (value: boolean) => void;
  onOpenSearch?: () => void;
  onViewQuickView?: () => void;
  onViewCompleted: () => void;
  onViewAnalytics?: () => void;
  onViewHistory: () => void;
  onViewStats: () => void;
  onViewSettings: () => void;
  userEmail?: string;
  userName?: string;
}

export function Header({
  totalCompleted,
  totalTasks,
  isDark,
  onToggleTheme,
  onLogout,
  advancedMode,
  hideCompleted,
  onToggleAdvancedMode,
  onToggleHideCompleted,
  onOpenSearch,
  onViewQuickView,
  onViewCompleted,
  onViewAnalytics,
  userEmail,
  userName,
}: HeaderProps) {
  return (
    <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm box-border content-stretch flex items-center justify-between px-[40px] md:px-[80px] py-[16px] w-full border-b-[0.5px] border-zinc-300 dark:border-zinc-700/50 transition-colors duration-300 shadow-none dark:shadow-sm">
      <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0">
        <div className="relative shrink-0 size-[32px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
            <g>
              <path d={svgPaths.p9c53700} fill="#99F6E4" />
              <path d={svgPaths.p79ae300} fill="#134E4A" />
              <g>
                <rect fill="#FAFAFA" height="24.0802" rx="5.07009" width="24.814" x="3.58887" y="3.08118" />
                <path
                  clipRule="evenodd"
                  d={svgPaths.p32a3f280}
                  fill="#134E4A"
                  fillRule="evenodd"
                />
              </g>
            </g>
          </svg>
        </div>
      </div>

      <button
        onClick={onViewCompleted}
        className="content-stretch flex gap-[8px] items-center relative shrink-0 hover:opacity-70 transition-opacity group"
        title="View completed tasks"
      >
        <div className="relative shrink-0 size-[24px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
            <g>
              <path
                d={svgPaths.p31a5d180}
                stroke={isDark ? "#F4F4F5" : "#18181B"}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.2"
              />
            </g>
          </svg>
        </div>
        <p className="font-['Poppins',_sans-serif] leading-[1.4] not-italic relative shrink-0 text-[16px] text-nowrap text-right text-zinc-900 dark:text-zinc-100 whitespace-pre">
          {totalCompleted} of {totalTasks}{" "}
        </p>
      </button>

      <div className="content-stretch flex gap-[16px] items-center justify-end relative shrink-0">
        <button
          onClick={onToggleTheme}
          className="hidden md:block relative shrink-0 size-[24px] hover:scale-110 active:scale-95 transition-transform duration-200"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
              <g clipPath="url(#clip0_1_901)">
                <path
                  d={svgPaths.p3e505380}
                  stroke="#FAFAFA"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </g>
              <defs>
                <clipPath id="clip0_1_901">
                  <rect fill="white" height="24" width="24" />
                </clipPath>
              </defs>
            </svg>
          ) : (
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
              <g>
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  stroke="#18181B"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </g>
            </svg>
          )}
        </button>
        
        <ProfileMenu 
          onLogout={onLogout}
          totalCompleted={totalCompleted}
          totalTasks={totalTasks}
          onViewQuickView={onViewQuickView}
          onViewCompleted={onViewCompleted}
          onViewAnalytics={onViewAnalytics}
          onOpenSearch={onOpenSearch}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          advancedMode={advancedMode}
          hideCompleted={hideCompleted}
          onToggleAdvancedMode={onToggleAdvancedMode}
          onToggleHideCompleted={onToggleHideCompleted}
          userEmail={userEmail}
          userName={userName}
        />
      </div>
    </div>
  );
}
