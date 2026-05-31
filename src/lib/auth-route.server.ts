// Server-only helper: extract authenticated user from a request bearer token,
// for use inside TanStack server routes (which don't use server-fn middleware).

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AuthedUser = {
  userId: string;
  // RLS-respecting client scoped to the user
  supabase: ReturnType<typeof createClient<Database>>;
};

export async function getAuthedUser(request: Request): Promise<AuthedUser | null> {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const client = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });

  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;

  return { userId: data.claims.sub as string, supabase: client };
}
