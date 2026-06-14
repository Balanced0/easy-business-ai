// POST /api/scan/commit — write reviewed rows from a handwriting scan into
// the user's regular data tables (and re-index for the AI assistant).
// Body: { kind, rows: Record<string,string>[] }

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth-route.server";
import { ingestRows, type UploadKind } from "@/lib/data-pipeline.server";

const Body = z.object({
  kind: z.enum(["sales", "inventory", "products", "orders"]),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(500),
  source: z.string().optional(),
});

export const Route = createFileRoute("/api/scan/commit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch (err) {
          return Response.json(
            { error: "Invalid input", detail: err instanceof Error ? err.message : String(err) },
            { status: 400 },
          );
        }

        const result = await ingestRows({
          userId: authed.userId,
          kind: parsed.kind as UploadKind,
          filename: parsed.source ?? "handwritten-scan.json",
          rawRows: parsed.rows,
        });

        if (!result.ok) {
          return Response.json({ error: "Validation failed", details: result.errors }, { status: 400 });
        }
        return Response.json({ ok: true, ...result.result });
      },
    },
  },
});
