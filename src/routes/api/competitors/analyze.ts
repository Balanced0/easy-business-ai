// POST /api/competitors/analyze
// Body: { query: string, myPrice?: number, currency?: string }
// Returns ranked competitor products with semantic similarity + price comparison.
import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import { analyzeCompetitors } from "@/lib/competitor-analyze.server";
import { chargeCredits, refundCredits, InsufficientCreditsError, insufficientCreditsResponse } from "@/lib/credits.server";

const FX: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, INR: 0.012, BDT: 0.0085,
  CAD: 0.73, AUD: 0.66, JPY: 0.0067, CNY: 0.14,
};

type Body = {
  query?: string;
  myPrice?: number;
  currency?: string;
};

export const Route = createFileRoute("/api/competitors/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const body = (await request.json().catch(() => ({}))) as Body;
        const query = (body.query ?? "").trim();
        if (!query) {
          return Response.json({ error: "query required" }, { status: 400 });
        }

        let myPriceUsd: number | undefined;
        if (typeof body.myPrice === "number" && body.myPrice > 0) {
          const cur = (body.currency ?? "USD").toUpperCase();
          const rate = FX[cur] ?? 1;
          myPriceUsd = body.myPrice * rate;
        }

        try {
          await chargeCredits(authed.userId, "competitor_analyze", { query });
        } catch (err) {
          if (err instanceof InsufficientCreditsError) return insufficientCreditsResponse(err);
          throw err;
        }

        try {
          const result = await analyzeCompetitors(query, { myPriceUsd });
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/competitors/analyze]", msg);
          await refundCredits(authed.userId, "competitor_analyze", { error: msg });
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
