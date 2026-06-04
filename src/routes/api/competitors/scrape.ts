// POST /api/competitors/scrape
//   { competitorId: string, url?: string, paginationLimit?: number }
// Scrape-only product extraction: scrapes the start URL with Firecrawl /scrape
// (links + json), then follows up to N paginated URLs from the same host.
import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scrapeCompetitorPage } from "@/lib/competitor-pipeline.server";

type Body = {
  competitorId?: string;
  url?: string;
  paginationLimit?: number;
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

        try {
          const result = await scrapeCompetitorPage(
            authed.userId,
            comp.id,
            startUrl,
            { paginationLimit: body.paginationLimit ?? 5 },
          );
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/competitors/scrape]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
