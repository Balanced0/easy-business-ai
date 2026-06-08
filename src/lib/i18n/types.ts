// Supported locales for the EasyBusiness AI app.
// 'en' and 'bn' are active. Others are scaffolded for future rollout.
export const SUPPORTED_LOCALES = ["en", "bn", "hi", "ms", "ta", "th"] as const;
export type LocaleKey = (typeof SUPPORTED_LOCALES)[number];

export const ACTIVE_LOCALES: LocaleKey[] = ["en", "bn"];

export type LocaleMeta = {
  code: LocaleKey;
  label: string;
  nativeLabel: string;
  flag: string;
  active: boolean;
};

export const LOCALE_META: Record<LocaleKey, LocaleMeta> = {
  en: { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧", active: true },
  bn: { code: "bn", label: "Bangla", nativeLabel: "বাংলা", flag: "🇧🇩", active: true },
  hi: { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳", active: false },
  ms: { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu", flag: "🇲🇾", active: false },
  ta: { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", flag: "🇮🇳", active: false },
  th: { code: "th", label: "Thai", nativeLabel: "ภาษาไทย", flag: "🇹🇭", active: false },
};

// Keys for the typed translation map. Add new keys here and provide values in
// every locale file under src/lib/i18n/<locale>.ts.
export type TranslationKey =
  | "common.save"
  | "common.cancel"
  | "common.loading"
  | "common.back"
  | "common.search"
  | "common.connect"
  | "common.connected"
  | "common.comingSoon"
  | "nav.dashboard"
  | "nav.upload"
  | "nav.inventory"
  | "nav.competitors"
  | "nav.customers"
  | "nav.assistant"
  | "nav.privacy"
  | "nav.about"
  | "nav.pricing"
  | "nav.integrations"
  | "nav.workspace"
  | "nav.company"
  | "profile.currency"
  | "profile.currencyHelp"
  | "integrations.title"
  | "integrations.subtitle"
  | "integrations.darazTitle"
  | "integrations.darazSellerId"
  | "integrations.darazApiKey"
  | "integrations.darazRegion"
  | "integrations.testConnection"
  | "integrations.testSuccess"
  | "integrations.saveAndSync";

export type TranslationMap = Record<TranslationKey, string>;
