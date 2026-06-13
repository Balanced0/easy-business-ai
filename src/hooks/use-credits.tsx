import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyCredits, type MyCredits } from "@/lib/credits.functions";
import { useAuth } from "@/hooks/use-auth";

type CreditsCtx = {
  credits: MyCredits | undefined;
  total: number; // balance + freeQuotaRemaining
  loading: boolean;
  refresh: () => void;
  outOfCreditsOpen: boolean;
  showOutOfCredits: (action?: string, cost?: number) => void;
  hideOutOfCredits: () => void;
  lastInsufficient: { action: string; cost: number } | null;
};

const Ctx = createContext<CreditsCtx | null>(null);

const CREDITS_QUERY_KEY = ["my-credits"] as const;

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const fetchCredits = useServerFn(getMyCredits);
  const qc = useQueryClient();

  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);
  const [lastInsufficient, setLast] = useState<{ action: string; cost: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => fetchCredits(),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: CREDITS_QUERY_KEY });
  }, [qc]);

  const showOutOfCredits = useCallback((action = "chat", cost = 1) => {
    setLast({ action, cost });
    setOutOfCreditsOpen(true);
  }, []);

  const hideOutOfCredits = useCallback(() => setOutOfCreditsOpen(false), []);

  const total = (data?.balance ?? 0) + (data?.freeQuotaRemaining ?? 0);

  const value = useMemo<CreditsCtx>(
    () => ({
      credits: data,
      total,
      loading: isLoading,
      refresh,
      outOfCreditsOpen,
      showOutOfCredits,
      hideOutOfCredits,
      lastInsufficient,
    }),
    [data, total, isLoading, refresh, outOfCreditsOpen, showOutOfCredits, hideOutOfCredits, lastInsufficient],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCredits() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fail-soft: return a no-op shape so components that mount outside the
    // provider (e.g. public pages) don't crash.
    return {
      credits: undefined,
      total: 0,
      loading: false,
      refresh: () => {},
      outOfCreditsOpen: false,
      showOutOfCredits: () => {},
      hideOutOfCredits: () => {},
      lastInsufficient: null,
    } satisfies CreditsCtx;
  }
  return ctx;
}
