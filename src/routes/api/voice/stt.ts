// POST /api/voice/stt — Speech-to-text via ElevenLabs Scribe v2.
// Accepts multipart/form-data with "audio" field. Returns { text, language }.

import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";

export const Route = createFileRoute("/api/voice/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "ElevenLabs not configured" }, { status: 500 });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Invalid form data" }, { status: 400 });
        }
        const audio = form.get("audio");
        const hint = (form.get("language") as string | null)?.trim() || "";
        if (!(audio instanceof Blob)) {
          return Response.json({ error: "Missing audio" }, { status: 400 });
        }

        const apiForm = new FormData();
        apiForm.append("file", audio, "audio.webm");
        apiForm.append("model_id", "scribe_v2");
        apiForm.append("tag_audio_events", "false");
        apiForm.append("diarize", "false");
        // Hint helps Bangla recognition; otherwise let it auto-detect.
        if (hint === "bn") apiForm.append("language_code", "ben");
        else if (hint === "en") apiForm.append("language_code", "eng");

        const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": apiKey },
          body: apiForm,
        });
        if (!res.ok) {
          const err = await res.text();
          console.error("[/api/voice/stt] elevenlabs error", res.status, err);
          return Response.json({ error: "Transcription failed" }, { status: 502 });
        }
        const json = (await res.json()) as {
          text?: string;
          language_code?: string;
        };
        const text = (json.text ?? "").trim();
        const lc = (json.language_code ?? "").toLowerCase();
        const language = lc.startsWith("ben") || lc === "bn" ? "bn" : "en";
        return Response.json({ text, language });
      },
    },
  },
});
