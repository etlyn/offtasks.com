/** Explicit public pages only. Authentication and planner paths never enter analytics. */
export function screenForPath(pathname: string): string | null {
 const pages: Record<string,string> = {'/':'home','/privacy':'privacy','/privacy-policy':'privacy','/support':'support','/contact':'support','/terms':'terms'};
 return pages[pathname.replace(/\/$/, '') || '/'] ?? null;
}
