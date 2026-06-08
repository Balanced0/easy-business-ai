import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const SUPPORTED_CURRENCIES = [
  "USD",
  "BDT",
  "INR",
  "GBP",
  "EUR",
  "MYR",
  "SGD",
  "AED",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_META: Record<CurrencyCode, { symbol: string; label: string; locale: string }> = {
  USD: { symbol: "$", label: "US Dollar", locale: "en-US" },
  BDT: { symbol: "৳", label: "Bangladeshi Taka", locale: "bn-BD" },
  INR: { symbol: "₹", label: "Indian Rupee", locale: "en-IN" },
  GBP: { symbol: "£", label: "British Pound", locale: "en-GB" },
  EUR: { symbol: "€", label: "Euro", locale: "en-IE" },
  MYR: { symbol: "RM", label: "Malaysian Ringgit", locale: "ms-MY" },
  SGD: { symbol: "S$", label: "Singapore Dollar", locale: "en-SG" },
  AED: { symbol: "د.إ", label: "UAE Dirham", locale: "en-AE" },
};

// Static FX rates relative to USD. Updated manually — refresh periodically
// from a trusted source (e.g. open.er-api.com). Last updated: 2026-06-08.
export const FX_RATES_USD: Record<CurrencyCode, number> = {
  USD: 1,
  BDT: 117.5,
  INR: 83.4,
  GBP: 0.79,
  EUR: 0.92,
  MYR: 4.7,
  SGD: 1.35,
  AED: 3.67,
};

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  formatCurrency: (amount: number, fromCurrency?: CurrencyCode) => string;
  convert: (amount: number, fromCurrency?: CurrencyCode) => number;
  loading: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return !!value && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

function readStored(): CurrencyCode {
  if (typeof window === "undefined") return "USD";
  const v = window.localStorage.getItem("preferred_currency");
  return isCurrencyCode(v) ? v : "USD";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => readStored());
  const [loading, setLoading] = useState(false);

  // Hydrate from Supabase profile on auth.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("profiles")
      .select("preferred_currency")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const pref = (data as { preferred_currency?: string | null } | null)?.preferred_currency;
        if (isCurrencyCode(pref)) {
          setCurrencyState(pref);
          window.localStorage.setItem("preferred_currency", pref);
        }
      })
      .then(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const setCurrency = useCallback(
    async (code: CurrencyCode) => {
      setCurrencyState(code);
      if (typeof window !== "undefined") window.localStorage.setItem("preferred_currency", code);
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ preferred_currency: code })
        .eq("user_id", user.id);
    },
    [user],
  );

  const convert = useCallback(
    (amount: number, fromCurrency: CurrencyCode = "USD") => {
      if (!Number.isFinite(amount)) return 0;
      const fromRate = FX_RATES_USD[fromCurrency] ?? 1;
      const toRate = FX_RATES_USD[currency] ?? 1;
      const usd = amount / fromRate;
      return usd * toRate;
    },
    [currency],
  );

  const formatCurrency = useCallback(
    (amount: number, fromCurrency: CurrencyCode = "USD") => {
      const converted = convert(amount, fromCurrency);
      const { locale } = CURRENCY_META[currency];
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: Math.abs(converted) < 10 ? 2 : 0,
        }).format(converted);
      } catch {
        const { symbol } = CURRENCY_META[currency];
        return `${symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      }
    },
    [currency, convert],
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, convert, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Safe fallback so consumers outside the provider (e.g. unauth marketing
    // pages) still get a working formatter.
    const formatCurrency = (amount: number) =>
      `$${(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return {
      currency: "USD" as CurrencyCode,
      setCurrency: async () => {},
      formatCurrency,
      convert: (n: number) => n,
      loading: false,
    };
  }
  return ctx;
}
