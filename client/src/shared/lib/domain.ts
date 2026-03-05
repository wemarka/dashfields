/**
 * domain.ts
 * Utility helpers to detect which domain the app is running on.
 *
 * Domain strategy:
 *   dashfields.com / www.dashfields.com  → Marketing / Landing site only
 *   app.dashfields.com                   → Full application (dashboard, auth, etc.)
 *   localhost / *.manus.computer         → Development (full app)
 */

/** The canonical app subdomain */
export const APP_DOMAIN = "https://app.dashfields.com";
/** The canonical marketing domain */
export const MARKETING_DOMAIN = "https://dashfields.com";

/**
 * Returns true when the current hostname is the marketing domain
 * (dashfields.com or www.dashfields.com).
 */
export function isMarketingDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "dashfields.com" || host === "www.dashfields.com";
}

/**
 * Returns true when the current hostname is the app subdomain
 * (app.dashfields.com) or a development environment.
 */
export function isAppDomain(): boolean {
  return !isMarketingDomain();
}

/**
 * Build a URL that always points to the app subdomain.
 * On development / app domain, returns a relative path.
 * On the marketing domain, returns an absolute URL to app.dashfields.com.
 */
export function appUrl(path: string): string {
  if (isMarketingDomain()) {
    return `${APP_DOMAIN}${path}`;
  }
  return path;
}
