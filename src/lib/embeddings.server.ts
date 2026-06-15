// Server-only helpers for generating text embeddings via Google Gemini
// (directly — no Lovable AI Gateway) and running similarity search against
// the knowledge_documents table.
//
// We use `gemini-embedding-001` with outputDimensionality=1536 to match the
// existing pgvector schema (vector(1536)).

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveUserGateway } from "@/lib/ai-gateway.server";

const EMBED_DIM = 1536;
const EMBED_MODEL = "gemini-embedding-001";

async function embedWithKey(apiKey: string, inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  // Google's batchEmbedContents endpoint.
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=` +
    encodeURIComponent(apiKey);
  const body = {
    requests: inputs.map((text) => ({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBED_DIM,
    })),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[embeddings] Gemini error", res.status, txt.slice(0, 300));
    throw new Error(`Embedding request failed (${res.status})`);
  }
  const json = (await res.json()) as { embeddings?: Array<{ values: number[] }> };
  const out = (json.embeddings ?? []).map((e) => e.values);
  if (out.length !== inputs.length) throw new Error("Embedding count mismatch");
  return out;
}

/**
 * Embed text on behalf of a specific user (uses their BYOK key if set,
 * otherwise the server GEMINI_API_KEY).
 */
export async function embedTextForUser(userId: string, input: string | string[]): Promise<number[][]> {
  const inputs = Array.isArray(input) ? input : [input];
  const gw = await resolveUserGateway(userId);
  return embedWithKey(gw.apiKey, inputs);
}

export type KnowledgeDoc = {
  source_type: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export async function upsertDocuments(docs: KnowledgeDoc[], userId: string) {
  if (docs.length === 0) return { inserted: 0 };
  const embeddings = await embedTextForUser(userId, docs.map((d) => d.content));
  const rows = docs.map((d, i) => ({
    user_id: userId,
    source_type: d.source_type,
    title: d.title ?? null,
    content: d.content,
    metadata: (d.metadata ?? {}) as unknown as never,
    embedding: embeddings[i] as unknown as string,
  }));

  const { error, count } = await supabaseAdmin
    .from("knowledge_documents")
    .insert(rows as never, { count: "exact" });
  if (error) {
    console.error("[embeddings] insert failed", error);
    throw new Error("Failed to save knowledge documents.");
  }
  return { inserted: count ?? rows.length };
}

export type MatchedDoc = {
  id: string;
  source_type: string;
  title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export async function searchSimilar(
  query: string,
  userId: string,
  opts: { matchCount?: number; sourceTypes?: string[] } = {},
): Promise<MatchedDoc[]> {
  const [embedding] = await embedTextForUser(userId, query);
  const { data, error } = await supabaseAdmin.rpc("match_documents", {
    query_embedding: embedding as unknown as string,
    match_count: opts.matchCount ?? 6,
    filter_source_types: (opts.sourceTypes ?? undefined) as unknown as string[],
    filter_user_id: userId,
  });
  if (error) {
    console.error("[embeddings] match_documents failed", error);
    throw new Error("Similarity search failed");
  }
  return (data ?? []) as MatchedDoc[];
}
