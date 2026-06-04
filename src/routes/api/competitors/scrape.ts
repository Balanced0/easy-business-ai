// POST /api/competitors/scrape
//   { competitorId: string, mode?: "scrape"|"crawl", url?: string, limit?: number,
//     includePaths?: string[], excludePaths?: string[] }
// Extracts product/pricing data via Firecrawl /scrape (single page) or
// /crawl (multi-page pagination).
import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  scrapeCompetitorPage,
  crawlCompetitor,
} from "@/lib/competitor-pipeline.server";

type Body = {
  competitorId?: string;
  mode?: "scrape" | "crawl";
  url?: string;
  limit?: number;
  includePaths?: string[];
  excludePaths?: string[];
};

export const Route = createFileRoute("/api/competitors/scrape")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const body = (await request.json().catch(() => ({}))) as Body;
        if (!body.competitorId) {
          return Response.json({ error: "competitorId required" }, { status: 400 });
        }

        // Verify ownership and resolve start URL.
        const { data: comp, error } = await supabaseAdmin
          .from("competitors")
          .select("id, url, user_id")
          .eq("id", body.competitorId)
          .eq("user_id", authed.userId)
          .maybeSingle();
        if (error || !comp) {
          return Response.json({ error: "competitor not found" }, { status: 404 });
        }

        const startUrl = body.url ?? comp.url;
        const mode = body.mode ?? "crawl";

        try {
          const result =
            mode === "scrape"
              ? await scrapeCompetitorPage(authed.userId, comp.id, startUrl)
              : await crawlCompetitor(authed.userId, comp.id, startUrl, {
                  limit: Math.min(Math.max(body.limit ?? 15, 1), 50),
                  includePaths: body.includePaths,
                  excludePaths: body.excludePaths,
                });
          return Response.json({ ok: true, mode, ...result });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/competitors/scrape]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
