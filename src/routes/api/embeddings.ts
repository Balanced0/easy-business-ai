// POST /api/embeddings
// Body: { documents: KnowledgeDoc[] } OR { seed: true }
// Returns: { inserted: number }
//
// Used to populate the vector store. Calling with { seed: true } will
// (re)load the demo ecommerce knowledge base from sample data.

import { createFileRoute } from "@tanstack/react-router";
import { buildSeedDocuments } from "@/lib/seed-data";
import { upsertDocuments, type KnowledgeDoc } from "@/lib/embeddings.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Body = { documents?: KnowledgeDoc[]; seed?: boolean; reset?: boolean };

export const Route = createFileRoute("/api/embeddings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body = {};
        try {
          body = (await request.json()) as Body;
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        try {
          if (body.reset) {
            await supabaseAdmin
              .from("knowledge_documents")
              .delete()
              .neq("id", "00000000-0000-0000-0000-000000000000");
          }

          const docs = body.seed
            ? buildSeedDocuments()
            : (body.documents ?? []);

          if (docs.length === 0) {
            return Response.json(
              { error: "No documents provided. Pass { seed: true } or documents[]." },
              { status: 400 },
            );
          }

          const result = await upsertDocuments(docs);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/embeddings] error:", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
      GET: async () => {
        const { count, error } = await supabaseAdmin
          .from("knowledge_documents")
          .select("*", { count: "exact", head: true });
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ count: count ?? 0 });
      },
    },
  },
});
