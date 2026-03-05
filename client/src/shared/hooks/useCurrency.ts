/**
 * useCurrency.ts
 * Central hook for currency formatting across the app.
 * Reads the active workspace's currency from WorkspaceContext.
 */
import { useWorkspace } from "@/core/contexts/WorkspaceContext";

// ─── Currency symbol map ──────────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  SAR: "﷼",
  AED: "د.إ",
  KWD: "د.ك",
  BHD: "BD",
  OMR: "﷼",
  QAR: "﷼",
  JOD: "JD",
  EGP: "E£",
  MAD: "MAD",
  TND: "DT",
  LYD: "LD",
  DZD: "DA",
  IQD: "IQD",
  SYP: "SP",
  LBP: "L£",
  YER: "﷼",
  SDG: "SDG",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  CAD: "CA$",
  AUD: "A$",
  CHF: "CHF",
  TRY: "₺",
  BRL: "R$",
  MXN: "MX$",
  KRW: "₩",
  SGD: "S$",
  HKD: "HK$",
  NOK: "kr",
  SEK: "kr",
  DKK: "kr",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RUB: "₽",
  ZAR: "R",
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  TZS: "TSh",
  UGX: "USh",
  ETB: "Br",
  XOF: "CFA",
  XAF: "FCFA",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency;
}

/**
 * Format a monetary amount using the workspace currency.
 * Uses Intl.NumberFormat for locale-aware formatting.
 * @param amount  Numeric value
 * @param currency  ISO 4217 currency code (e.g. "USD", "SAR")
 * @param decimals  Number of decimal places (default 2)
 */
export function formatMoney(amount: number, currency: string, decimals = 2): string {
  const symbol = getCurrencySymbol(currency);
  // Use Intl.NumberFormat for proper locale-aware number formatting
  const currentLang = typeof localStorage !== "undefined" ? (localStorage.getItem("dashfields-lang") ?? "en") : "en";
  const locale = currentLang === "ar" ? "ar-SA" : "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  // For Arabic currencies that go after the amount
  const postfixCurrencies = ["SAR", "AED", "KWD", "BHD", "OMR", "QAR", "JOD", "EGP", "IQD", "SYP", "LBP", "YER", "SDG", "MAD", "TND", "LYD", "DZD"];
  if (postfixCurrencies.includes(currency.toUpperCase())) {
    return `${formatted} ${symbol}`;
  }
  return `${symbol}${formatted}`;
}

/**
 * Hook that returns a formatMoney function bound to the active workspace currency.
 * Falls back to USD if no workspace is active.
 */
export function useCurrency() {
  const { workspaceFinancials } = useWorkspace();
  const currency = workspaceFinancials?.currency ?? "USD";
  const targetRoas = parseFloat(workspaceFinancials?.targetRoas ?? "3.0") || 3.0;
  const monthlyBudget = workspaceFinancials?.monthlyBudget
    ? parseFloat(workspaceFinancials.monthlyBudget)
    : null;

  return {
    currency,
    symbol: getCurrencySymbol(currency),
    targetRoas,
    monthlyBudget,
    /** Format a number as money in the workspace currency */
    fmt: (amount: number, decimals = 2) => formatMoney(amount, currency, decimals),
    /** Format a number as money with 0 decimals */
    fmtInt: (amount: number) => formatMoney(amount, currency, 0),
  };
}
