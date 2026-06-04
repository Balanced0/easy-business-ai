// POST /api/competitors/discover  { query: string, limit?: number }
// Discovers competitors via Firecrawl /search and stores them.
import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import { discoverCompetitors } from "@/lib/competitor-pipeline.server";

export const Route = createFileRoute("/api/competitors/discover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const body = (await request.json().catch(() => ({}))) as {
          query?: string;
          limit?: number;
        };
        const query = body.query?.trim();
        if (!query || query.length < 2) {
          return Response.json({ error: "query required" }, { status: 400 });
        }
        try {
          const competitors = await discoverCompetitors(
            authed.userId,
            query,
            Math.min(Math.max(body.limit ?? 10, 1), 25),
          );
          return Response.json({ ok: true, count: competitors.length, competitors });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/competitors/discover]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
