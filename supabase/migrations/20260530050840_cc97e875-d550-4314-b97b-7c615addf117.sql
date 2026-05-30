create extension if not exists vector;

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  title text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index knowledge_documents_embedding_idx
  on public.knowledge_documents
  using hnsw (embedding vector_cosine_ops);

create index knowledge_documents_source_type_idx
  on public.knowledge_documents (source_type);

grant select on public.knowledge_documents to anon, authenticated;
grant all on public.knowledge_documents to service_role;

alter table public.knowledge_documents enable row level security;

create policy "Knowledge documents are readable by everyone"
  on public.knowledge_documents
  for select
  using (true);

create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int default 5,
  filter_source_types text[] default null
)
returns table (
  id uuid,
  source_type text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.source_type,
    d.title,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.knowledge_documents d
  where d.embedding is not null
    and (filter_source_types is null or d.source_type = any(filter_source_types))
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_documents(vector, int, text[]) to anon, authenticated, service_role;