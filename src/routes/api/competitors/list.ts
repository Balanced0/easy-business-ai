// GET /api/competitors/list — returns competitors + recent products for the user.
import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/competitors/list")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        const { data: competitors, error: e1 } = await supabaseAdmin
          .from("competitors")
          .select("*")
          .eq("user_id", authed.userId)
          .order("created_at", { ascending: false });
        if (e1) return Response.json({ error: e1.message }, { status: 500 });

        const { data: products, error: e2 } = await supabaseAdmin
          .from("competitor_products")
          .select("*")
          .eq("user_id", authed.userId)
          .order("scraped_at", { ascending: false })
          .limit(200);
        if (e2) return Response.json({ error: e2.message }, { status: 500 });

        return Response.json({
          competitors: (competitors ?? []).map((competitor) => ({
            ...competitor,
            status:
              typeof competitor.description === "string" && competitor.description.length > 0
                ? "unstructured_data"
                : "structured_data",
            raw_snippet: competitor.description,
          })),
          products: products ?? [],
        });
      },
    },
  },
});
