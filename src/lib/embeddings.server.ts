// Server-only helpers for generating text embeddings via the Lovable AI Gateway
// and running similarity search against the knowledge_documents table.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EMBEDDING_MODEL = "openai/text-embedding-3-small"; // 1536 dims (matches schema)
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";

export async function embedText(input: string | string[]): Promise<number[][]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding request failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data.map((d) => d.embedding);
}

export type KnowledgeDoc = {
  source_type: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export async function upsertDocuments(docs: KnowledgeDoc[]) {
  if (docs.length === 0) return { inserted: 0 };
  const embeddings = await embedText(docs.map((d) => d.content));
  const rows = docs.map((d, i) => ({
    source_type: d.source_type,
    title: d.title ?? null,
    content: d.content,
    metadata: d.metadata ?? {},
    embedding: embeddings[i] as unknown as string, // pgvector accepts JS array via PostgREST
  }));

  const { error, count } = await supabaseAdmin
    .from("knowledge_documents")
    .insert(rows, { count: "exact" });
  if (error) throw new Error(`Insert failed: ${error.message}`);
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
  opts: { matchCount?: number; sourceTypes?: string[] } = {},
): Promise<MatchedDoc[]> {
  const [embedding] = await embedText(query);
  const { data, error } = await supabaseAdmin.rpc("match_documents", {
    query_embedding: embedding as unknown as string,
    match_count: opts.matchCount ?? 6,
    filter_source_types: opts.sourceTypes ?? null,
  });
  if (error) throw new Error(`Similarity search failed: ${error.message}`);
  return (data ?? []) as MatchedDoc[];
}
