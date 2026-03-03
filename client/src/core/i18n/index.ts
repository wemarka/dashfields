import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ar from "./ar.json";

const savedLang = localStorage.getItem("dashfields-lang") ?? "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: savedLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

// Apply RTL direction on init
applyDirection(savedLang);

export function applyDirection(lang: string) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

export function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
  localStorage.setItem("dashfields-lang", lang);
  applyDirection(lang);
}

export default i18n;
