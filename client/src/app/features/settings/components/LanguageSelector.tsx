/**
 * settings/components/LanguageSelector.tsx — Language picker.
 */
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/core/i18n";

export function LanguageSelector() {
  const { i18n } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="en">English</option>
        <option value="ar">العربية (Arabic)</option>
      </select>
    </div>
  );
}
