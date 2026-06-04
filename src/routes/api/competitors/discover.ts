// POST /api/competitors/discover  { query: string, maxDomains?, maxProducts? }
// Query-driven discovery: user provides only a product query. The pipeline
// generates seed search URLs against known ecommerce templates, scrapes them
// with Firecrawl /scrape, groups products by domain to infer competitors,
// and expands one level deeper per domain.
import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import { discoverFromQuery } from "@/lib/competitor-pipeline.server";

type Body = {
  query?: string;
  seedUrl?: string; // legacy — treated as query text if non-URL
  maxDomains?: number;
  maxProducts?: number;
};

export const Route = createFileRoute("/api/competitors/discover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const body = (await request.json().catch(() => ({}))) as Body;
        const query = (body.query ?? body.seedUrl ?? "").trim();
        if (!query) {
          return Response.json(
            { error: "query required (e.g. 'wireless earbuds')" },
            { status: 400 },
          );
        }
        try {
          const result = await discoverFromQuery(authed.userId, query, {
            maxDomains: body.maxDomains,
            maxProducts: body.maxProducts,
          });
          return Response.json({
            ok: true,
            count: result.competitors.length,
            productsInserted: result.productsInserted,
            competitors: result.competitors,
            statuses: result.statuses,
            debug: result.debug,
            totals: result.totals,
            category: result.category,
            graph: result.graph,
          });

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/competitors/discover]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
