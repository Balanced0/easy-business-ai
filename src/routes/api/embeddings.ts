// POST /api/embeddings  — authenticated, scoped to caller.
// GET  /api/embeddings  — returns count for caller.
import { createFileRoute } from "@tanstack/react-router";
import { upsertDocuments, type KnowledgeDoc } from "@/lib/embeddings.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAuthedUser } from "@/lib/auth-route.server";

type Body = { documents?: KnowledgeDoc[]; reset?: boolean };

export const Route = createFileRoute("/api/embeddings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        let body: Body = {};
        try { body = (await request.json()) as Body; }
        catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }

        try {
          if (body.reset) {
            await supabaseAdmin.from("knowledge_documents").delete().eq("user_id", authed.userId);
          }
          const docs = body.documents ?? [];
          if (docs.length === 0) {
            return Response.json({ error: "No documents. Upload a CSV/XLSX from the Upload page or pass documents[]." }, { status: 400 });
          }
          const result = await upsertDocuments(docs, authed.userId);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          console.error("[/api/embeddings] error:", err);
          return Response.json({ error: "Failed to index documents. Please try again." }, { status: 500 });
        }
      },
      GET: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const { count, error } = await supabaseAdmin
          .from("knowledge_documents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", authed.userId);
        if (error) {
          console.error("[/api/embeddings] count error", error);
          return Response.json({ error: "Could not read document count." }, { status: 500 });
        }
        return Response.json({ count: count ?? 0 });
      },
    },
  },
});
