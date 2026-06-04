// POST /api/scrape
// Body: { url: string, sourceType?: string, title?: string }
// Scrapes a URL with Firecrawl, embeds the markdown content, and stores it
// in the vector store. Useful for adding competitor or market trend data
// from real ecommerce pages.

import { createFileRoute } from "@tanstack/react-router";
import { upsertDocuments } from "@/lib/embeddings.server";
import { getAuthedUser } from "@/lib/auth-route.server";

type Body = { url?: string; sourceType?: string; title?: string };

export const Route = createFileRoute("/api/scrape")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const body = (await request.json().catch(() => ({}))) as Body;
        const url = body.url?.trim();
        if (!url || !/^https?:\/\//.test(url)) {
          return Response.json(
            { error: "Provide a valid http(s) url." },
            { status: 400 },
          );
        }

        const key = process.env.FIRECRAWL_API_KEY;
        if (!key) return Response.json({ error: "Firecrawl not configured" }, { status: 500 });

        try {
          // Direct Firecrawl API (no Lovable connector gateway in this project)
          const fcRes = await fetch(
            "https://api.firecrawl.dev/v2/scrape",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
              },
              body: JSON.stringify({
                url,
                formats: ["markdown"],
                onlyMainContent: true,
              }),
            },
          );

          if (!fcRes.ok) {
            const txt = await fcRes.text();
            return Response.json(
              { error: `Firecrawl error (${fcRes.status}): ${txt}` },
              { status: 502 },
            );
          }

          const fcJson = (await fcRes.json()) as {
            data?: { markdown?: string; metadata?: { title?: string } };
            markdown?: string;
            metadata?: { title?: string };
          };
          const markdown =
            fcJson.data?.markdown ?? fcJson.markdown ?? "";
          const pageTitle =
            body.title ??
            fcJson.data?.metadata?.title ??
            fcJson.metadata?.title ??
            url;

          if (!markdown.trim()) {
            return Response.json(
              { error: "Firecrawl returned no markdown content" },
              { status: 502 },
            );
          }

          // Chunk into ~1200-char pieces so each embedding stays focused.
          const chunks = chunkText(markdown, 1200);
          const docs = chunks.map((content, i) => ({
            source_type: body.sourceType ?? "scraped",
            title: `${pageTitle} (part ${i + 1}/${chunks.length})`,
            content,
            metadata: { url, chunk: i, total: chunks.length },
          }));

          const result = await upsertDocuments(docs, authed.userId);
          return Response.json({ ok: true, url, ...result });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/scrape]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});

function chunkText(text: string, size: number): string[] {
  const out: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > size && buf) {
      out.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length > 0 ? out : [text];
}
