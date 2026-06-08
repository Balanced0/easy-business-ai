import { createContext, useContext, useState, useCallback } from "react";
import {
  getTranslation,
  SUPPORTED_LOCALES,
  ACTIVE_LOCALES,
  LOCALE_META,
  type LocaleKey,
  type TranslationKey,
} from "@/lib/i18n";

// Legacy alias retained for older code paths.
type Lang = "bn" | "en";

const LanguageContext = createContext<{
  lang: Lang;
  locale: LocaleKey;
  setLang: (lang: Lang) => void;
  setLocale: (locale: LocaleKey) => void;
  toggleLang: () => void;
}>({
  lang: "bn",
  locale: "bn",
  setLang: () => {},
  setLocale: () => {},
  toggleLang: () => {},
});

function isLang(value: string | null | undefined): value is Lang {
  return value === "bn" || value === "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("lang");
      if (isLang(stored)) return stored;
    }
    return "bn";
  });

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem("lang", next);
    setLangState(next);
  }, []);

  const setLocale = useCallback((next: LocaleKey) => {
    // Only active locales are switchable; others fall back to English.
    if (next === "bn" || next === "en") {
      localStorage.setItem("lang", next);
      setLangState(next);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === "bn" ? "en" : "bn"));
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, locale: lang, setLang, setLocale, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/**
 * Translate a string. Supports two input shapes for full back-compat:
 * 1. Bilingual literal: "বাংলা / English" — split by " / ".
 * 2. Translation key from src/lib/i18n (e.g. "nav.dashboard") — resolved
 *    through getTranslation() for the current locale.
 */
export function useT() {
  const { lang } = useContext(LanguageContext);
  return (text: string): string => {
    if (!text || typeof text !== "string") return text;
    // Bilingual literal first — preserves the original API exactly.
    const idx = text.indexOf(" / ");
    if (idx !== -1) {
      return lang === "bn" ? text.slice(0, idx).trim() : text.slice(idx + 3).trim();
    }
    // Otherwise treat as a typed translation key.
    return getTranslation(lang, text as TranslationKey);
  };
}

export { SUPPORTED_LOCALES, ACTIVE_LOCALES, LOCALE_META };
export type { LocaleKey };
