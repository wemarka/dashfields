/**
 * workspace-tabs/constants.ts — Shared constants for workspace settings tabs.
 */

export type TabId = "general" | "team" | "brand" | "financials";

export const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "AED", name: "UAE Dirham" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "TND", name: "Tunisian Dinar" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "ZAR", name: "South African Rand" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
];

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const ROLE_COLORS: Record<string, string> = {
  owner: "text-brand bg-brand/10",
  admin: "text-muted-foreground bg-muted",
  member: "text-foreground bg-muted",
  viewer: "text-muted-foreground bg-muted",
};

export const TONE_OPTIONS = ["Professional", "Casual", "Friendly", "Bold", "Inspirational", "Educational"];
export const INDUSTRY_OPTIONS = [
  "E-commerce", "Technology", "Healthcare", "Finance", "Education",
  "Food & Beverage", "Fashion", "Travel", "Real Estate", "Entertainment", "Other",
];
