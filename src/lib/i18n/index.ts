import en from "./en";
import bn from "./bn";
import {
  SUPPORTED_LOCALES,
  ACTIVE_LOCALES,
  LOCALE_META,
  type LocaleKey,
  type TranslationKey,
  type TranslationMap,
} from "./types";

// Translation tables are only populated for active locales. Inactive locales
// fall back to English until their translations land.
const TRANSLATIONS: Record<LocaleKey, TranslationMap | null> = {
  en,
  bn,
  hi: null,
  ms: null,
  ta: null,
  th: null,
};

export function getTranslation(locale: LocaleKey, key: TranslationKey): string {
  const table = TRANSLATIONS[locale] ?? TRANSLATIONS.en!;
  return table[key] ?? TRANSLATIONS.en![key] ?? key;
}

export { SUPPORTED_LOCALES, ACTIVE_LOCALES, LOCALE_META };
export type { LocaleKey, TranslationKey, TranslationMap };
