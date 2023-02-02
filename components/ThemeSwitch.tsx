import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // When mounted on client, now we can show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      aria-label="Toggle Dark Mode"
      type="button"
      className="mb-1 mr-6"
      onClick={() =>
        setTheme(
          theme === "dark" || resolvedTheme === "dark" ? "light" : "dark"
        )
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className={`${theme === "dark" ? "text-zinc-50" : "text-zinc-900"}`}
      >
        {mounted && (theme === "dark" || resolvedTheme === "dark") ? (
          <>
            <g clip-path="url(#clip0_461_7572)">
              <path
                d="M12 1.5V4.125M19.4247 4.57533L17.5685 6.4315M22.5 12H19.875M19.4247 19.4247L17.5685 17.5685M12 19.875V22.5M6.4315 17.5685L4.57533 19.4247M4.125 12H1.5M6.4315 6.4315L4.57533 4.57533M16.375 12C16.375 13.1603 15.9141 14.2731 15.0936 15.0936C14.2731 15.9141 13.1603 16.375 12 16.375C10.8397 16.375 9.72688 15.9141 8.90641 15.0936C8.08594 14.2731 7.625 13.1603 7.625 12C7.625 10.8397 8.08594 9.72688 8.90641 8.90641C9.72688 8.08594 10.8397 7.625 12 7.625C13.1603 7.625 14.2731 8.08594 15.0936 8.90641C15.9141 9.72688 16.375 10.8397 16.375 12Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <defs>
              <clipPath id="clip0_461_7572">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </>
        ) : (
          <path
            d="M21.752 15.002C20.5633 15.4975 19.2879 15.7518 18 15.75C12.615 15.75 8.25 11.385 8.25 6.00005C8.25 4.67005 8.516 3.40305 8.998 2.24805C7.22147 2.98916 5.70397 4.2394 4.63663 5.8413C3.56928 7.44321 2.99984 9.32513 3 11.25C3 16.635 7.365 21 12.75 21C14.6749 21.0002 16.5568 20.4308 18.1587 19.3634C19.7606 18.2961 21.0109 16.7786 21.752 15.002Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
};
