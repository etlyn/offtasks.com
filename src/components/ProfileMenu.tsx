import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LogOut, CheckCircle2, BarChart3, Sun, Moon, LayoutGrid } from "lucide-react";

interface ProfileMenuProps {
  onLogout: () => void;
  onViewQuickView?: () => void;
  onViewCompleted?: () => void;
  onViewAnalytics?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  userEmail?: string;
  userName?: string;
}

const getInitials = (email?: string, name?: string) => {
  if (name && name.trim().length) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  if (email) {
    const handle = email.split("@")[0];
    if (handle.includes(".")) {
      const segments = handle.split(".");
      if (segments.length >= 2) {
        return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
      }
    }
    return handle.slice(0, 2).toUpperCase();
  }

  return "JD";
};

export function ProfileMenu({
  onLogout,
  onViewQuickView,
  onViewCompleted,
  onViewAnalytics,
  isDark,
  onToggleTheme,
  userEmail,
  userName,
}: ProfileMenuProps) {
  const initials = getInitials(userEmail, userName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative shrink-0 size-[44px] rounded-full bg-zinc-700 dark:bg-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-600 border-2 border-zinc-300 dark:border-zinc-600/40 transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm hover:shadow-md dark:shadow-md dark:hover:shadow-lg"
          title="Profile menu"
        >
          <span className="font-['Poppins',_sans-serif] text-[16px] text-white select-none">
            {initials}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel className="font-['Poppins',_sans-serif]">
          <div className="flex flex-col gap-1">
            <span className="text-[14px]">{userName ?? "Member"}</span>
            {userEmail && (
              <span className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate">{userEmail}</span>
            )}
          </div>
        </DropdownMenuLabel>
        
        {/* Mobile-only menu items */}
        <DropdownMenuSeparator className="md:hidden" />
        {onToggleTheme && (
          <DropdownMenuItem 
            onClick={onToggleTheme}
            className="md:hidden font-['Poppins',_sans-serif] cursor-pointer"
          >
            {isDark ? (
              <>
                <Sun className="mr-2 size-4" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="mr-2 size-4" />
                <span>Dark Mode</span>
              </>
            )}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="md:hidden" />
        {onViewQuickView && (
          <DropdownMenuItem 
            onClick={onViewQuickView}
            className="md:hidden font-['Poppins',_sans-serif] cursor-pointer"
          >
            <LayoutGrid className="mr-2 size-4" />
            <span>Quick View</span>
          </DropdownMenuItem>
        )}
        {onViewCompleted && (
          <DropdownMenuItem 
            onClick={onViewCompleted}
            className="md:hidden font-['Poppins',_sans-serif] cursor-pointer"
          >
            <CheckCircle2 className="mr-2 size-4" />
            <span>Completed</span>
          </DropdownMenuItem>
        )}
        {onViewAnalytics && (
          <DropdownMenuItem 
            onClick={onViewAnalytics}
            className="md:hidden font-['Poppins',_sans-serif] cursor-pointer"
          >
            <BarChart3 className="mr-2 size-4" />
            <span>Analytics</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onLogout} 
          className="font-['Poppins',_sans-serif] text-red-600 dark:text-red-500 cursor-pointer focus:text-red-600 dark:focus:text-red-500"
        >
          <LogOut className="mr-2 size-4 text-red-600 dark:text-red-500" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
