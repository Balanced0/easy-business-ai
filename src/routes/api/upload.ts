// POST /api/upload — multipart form: kind=<sales|inventory|products|reviews|orders>, file=<csv|xlsx>
// Parses, validates, inserts into the user's tables, and generates embeddings.

import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import {
  ingestRows,
  parseFileBuffer,
  buildDocumentsFromBatch,
  UPLOAD_KINDS,
  type UploadKind,
} from "@/lib/data-pipeline.server";
import { upsertDocuments } from "@/lib/embeddings.server";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
        }

        const kind = String(form.get("kind") ?? "") as UploadKind;
        const file = form.get("file");
        if (!UPLOAD_KINDS.includes(kind)) {
          return Response.json({ error: `Invalid kind. Use one of: ${UPLOAD_KINDS.join(", ")}` }, { status: 400 });
        }
        if (!(file instanceof File)) {
          return Response.json({ error: "Missing file" }, { status: 400 });
        }
        if (file.size > 10 * 1024 * 1024) {
          return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
        }

        let rows: Record<string, unknown>[];
        try {
          const buf = await file.arrayBuffer();
          rows = await parseFileBuffer(file.name, buf);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Failed to parse file" },
            { status: 400 },
          );
        }

        const result = await ingestRows({
          userId: authed.userId,
          kind,
          filename: file.name,
          rawRows: rows,
        });
        if (!result.ok) {
          return Response.json({ error: "Validation failed", details: result.errors }, { status: 422 });
        }

        // Best-effort embedding generation.
        let embedded = 0;
        try {
          const docs = buildDocumentsFromBatch(kind, rows);
          if (docs.length > 0) {
            const r = await upsertDocuments(docs, authed.userId);
            embedded = r.inserted;
          }
        } catch (err) {
          console.warn("[/api/upload] embedding step skipped:", err);
        }

        return Response.json({
          ok: true,
          kind,
          filename: file.name,
          rowsInserted: result.result.rowCount,
          batchId: result.result.batchId,
          embedded,
        });
      },
    },
  },
});
