/**
 * formatRelativeTime — converts a Unix timestamp (ms) to a short relative string.
 * Uses the i18n keys under aiAgent.time.* for localised output.
 * Works with both "ar" and "en" locales.
 */
export function formatRelativeTime(
  timestamp: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const now  = Date.now();
  const diff = now - timestamp;           // ms elapsed

  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);

  if (minutes < 1)   return t("aiAgent.time.justNow");
  if (minutes < 60)  return t("aiAgent.time.minutesAgo", { count: minutes });
  if (hours   < 24)  return t("aiAgent.time.hoursAgo",   { count: hours });
  if (days    === 1) return t("aiAgent.time.yesterday");
  return t("aiAgent.time.daysAgo", { count: days });
}
