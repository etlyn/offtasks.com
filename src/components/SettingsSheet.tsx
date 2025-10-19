import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function SettingsSheet({ isOpen, onClose, isDark, onToggleTheme }: SettingsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Manage your preferences and app configuration
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Appearance Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Appearance
            </h3>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode" className="font-['Poppins',_sans-serif] text-[14px]">
                  Dark Mode
                </Label>
                <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500 dark:text-zinc-400">
                  Toggle dark theme on or off
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={isDark}
                onCheckedChange={onToggleTheme}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Keyboard Shortcuts Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Keyboard Shortcuts
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-700 dark:text-zinc-300">
                  Quick add task
                </p>
                <kbd className="px-[8px] py-[4px] bg-zinc-200 dark:bg-zinc-700 rounded-[4px] text-[12px] font-['Poppins',_sans-serif]">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              About
            </h3>
            
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2">
              <p className="font-['Poppins',_sans-serif] text-[14px] text-zinc-900 dark:text-zinc-100">
                offtasks
              </p>
              <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500 dark:text-zinc-400">
                A simple and elegant task management app
              </p>
              <p className="font-['Poppins',_sans-serif] text-[12px] text-zinc-500 dark:text-zinc-400">
                Version 1.0.0
              </p>
            </div>
          </div>
          
          <Separator />
          
          {/* Data Section */}
          <div className="space-y-4">
            <h3 className="font-['Poppins',_sans-serif] text-[14px] text-zinc-600 dark:text-zinc-400">
              Data
            </h3>
            
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <p className="font-['Poppins',_sans-serif] text-[12px] text-amber-700 dark:text-amber-400">
                💾 All your tasks are stored locally in your browser. Clearing your browser data will delete all tasks.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
