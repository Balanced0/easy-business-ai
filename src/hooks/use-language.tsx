import { createContext, useContext, useState, useCallback } from "react";

type Lang = "bn" | "en";

const LanguageContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}>({
  lang: "bn",
  setLang: () => {},
  toggleLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lang") as Lang | null;
      if (stored === "bn" || stored === "en") return stored;
    }
    return "bn";
  });

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem("lang", next);
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "bn" ? "en" : "bn"));
  }, [setLang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  const { lang } = useContext(LanguageContext);
  return (text: string): string => {
    if (!text || typeof text !== "string") return text;
    const idx = text.indexOf(" / ");
    if (idx === -1) return text;
    if (lang === "bn") return text.slice(0, idx).trim();
    return text.slice(idx + 3).trim();
  };
}
