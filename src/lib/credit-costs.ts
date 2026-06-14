// Shared flat cost table for every AI action. Used by both server enforcement
// and client-side UI to preview how much an action will cost.
//
// Keep this list in sync with reasons accepted by the spend_credits SQL function.
export const CREDIT_COSTS = {
  chat: 1,
  voice_tts: 2,
  voice_stt: 1,
  competitor_analyze: 5,
  competitor_discover: 3,
  competitor_scrape: 2,
  embedding: 1,
  dashboard_summary: 2,
  scan_extract: 3, // per page; reflects vision-model cost
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export const FREE_MONTHLY_QUOTA = 100;

// Human-readable label used in audit log / billing UI.
export const ACTION_LABELS: Record<CreditAction, { en: string; bn: string }> = {
  chat: { en: "AI Assistant message", bn: "এআই সহকারী মেসেজ" },
  voice_tts: { en: "Voice reply (text → speech)", bn: "ভয়েস রিপ্লাই" },
  voice_stt: { en: "Voice transcription", bn: "ভয়েস ট্রান্সক্রিপশন" },
  competitor_analyze: { en: "Competitor analysis", bn: "প্রতিযোগী বিশ্লেষণ" },
  competitor_discover: { en: "Competitor discovery", bn: "প্রতিযোগী খোঁজ" },
  competitor_scrape: { en: "Competitor scrape", bn: "প্রতিযোগী স্ক্র্যাপ" },
  embedding: { en: "Data indexing", bn: "ডেটা ইন্ডেক্সিং" },
  dashboard_summary: { en: "Dashboard summary", bn: "ড্যাশবোর্ড সারসংক্ষেপ" },
  scan_extract: { en: "Handwriting scan (per page)", bn: "হাতের লেখা স্ক্যান (প্রতি পেজ)" },
};
