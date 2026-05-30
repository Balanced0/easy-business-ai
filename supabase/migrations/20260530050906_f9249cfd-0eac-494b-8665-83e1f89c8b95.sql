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
security invoker
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

create schema if not exists extensions;
alter extension vector set schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;