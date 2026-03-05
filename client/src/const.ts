// const.ts — Manus OAuth removed. Auth is handled entirely by Supabase.

/** Redirect unauthenticated users to the Supabase-powered login page */
export const getLoginUrl = (returnPath?: string): string => {
  if (returnPath && returnPath !== "/login") {
    return `/login?next=${encodeURIComponent(returnPath)}`;
  }
  return "/login";
};
