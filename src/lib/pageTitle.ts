import { useEffect } from "react";

const SITE_TITLE = "Offtasks: calendar, notes and goals";

/** Names the browser tab after the page on screen; the landing page keeps the site's own title. */
export function usePageTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} | Offtasks` : SITE_TITLE;
    return () => {
      document.title = SITE_TITLE;
    };
  }, [page]);
}
