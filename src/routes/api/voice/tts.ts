// POST /api/voice/tts — Natural multilingual TTS via ElevenLabs.
// Body: { text: string, language?: "bn"|"en" } → audio/mpeg stream.

import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";

// Voice selection by language. For Bangla we use a voice that handles
// Indic/Bangla phonemes more naturally than the default English-trained Sarah.
// Charlotte — multilingual, warm, good Bangla cadence.
const VOICE_BN = "XB0fDUnXU5powFXDhCwa"; // Charlotte
const VOICE_EN = "EXAVITQu4vr4xnSDxMaL"; // Sarah

export const Route = createFileRoute("/api/voice/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) return new Response("ElevenLabs not configured", { status: 500 });

        let body: { text?: string; language?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const text = (body.text ?? "").trim();
        if (!text) return new Response("Missing text", { status: 400 });
        const clipped = text.length > 4000 ? text.slice(0, 4000) : text;
        const lang = body.language === "en" ? "en" : "bn";
        const voiceId = lang === "bn" ? VOICE_BN : VOICE_EN;

        // eleven_turbo_v2_5 supports `language_code` enforcement, which fixes
        // the common Bangla→Hindi pronunciation drift. Multilingual quality
        // is on par with multilingual_v2 for short conversational replies.
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: clipped,
              model_id: "eleven_turbo_v2_5",
              language_code: lang === "bn" ? "bn" : "en",
              voice_settings: {
                stability: 0.75,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
                speed: 0.95,
              },
            }),
          },
        );
        if (!res.ok || !res.body) {
          const err = await res.text().catch(() => "");
          console.error("[/api/voice/tts] elevenlabs error", res.status, err);
          return new Response("TTS failed", { status: 502 });
        }
        return new Response(res.body, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
