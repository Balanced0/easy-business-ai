// GET /api/analytics — returns analytics computed from the authenticated user's
// uploaded data. Returns hasData=false with empty arrays when nothing is uploaded.

import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";
import { computeAnalyticsForUser } from "@/lib/data-pipeline.server";

export const Route = createFileRoute("/api/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });
        const analytics = await computeAnalyticsForUser(authed.userId);
        return Response.json(analytics);
      },
    },
  },
});
