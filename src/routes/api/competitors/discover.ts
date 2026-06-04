// POST /api/competitors/discover  { seedUrl?: string, seedUrls?: string[], limit?: number }
// Crawl-driven discovery: starts from one or more seed URLs (category pages
// or curated ecommerce entry points), extracts product links and outbound
// domains, and builds the competitor list from what it finds. No /search.
import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import { discoverFromSeeds } from "@/lib/competitor-pipeline.server";

type Body = {
  seedUrl?: string;
  seedUrls?: string[];
  query?: string; // legacy clients — treated as seedUrl if it looks like a URL
  limit?: number;
};

function normalizeSeeds(b: Body): string[] {
  const raw: string[] = [];
  if (Array.isArray(b.seedUrls)) raw.push(...b.seedUrls);
  if (b.seedUrl) raw.push(b.seedUrl);
  if (b.query) raw.push(b.query);
  const out: string[] = [];
  for (const s of raw) {
    const v = s?.trim();
    if (!v) continue;
    try {
      const u = new URL(v.startsWith("http") ? v : `https://${v}`);
      out.push(u.toString());
    } catch {
      /* skip non-URLs */
    }
  }
  return Array.from(new Set(out));
}

export const Route = createFileRoute("/api/competitors/discover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const body = (await request.json().catch(() => ({}))) as Body;
        const seeds = normalizeSeeds(body);
        if (seeds.length === 0) {
          return Response.json(
            { error: "seedUrl required (a valid http(s) URL)" },
            { status: 400 },
          );
        }
        try {
          const { competitors, productsInserted, statuses, debug } =
            await discoverFromSeeds(authed.userId, seeds, {
              limit: Math.min(Math.max(body.limit ?? 25, 1), 100),
            });
          return Response.json({
            ok: true,
            count: competitors.length,
            productsInserted,
            competitors,
            statuses,
            debug,
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
