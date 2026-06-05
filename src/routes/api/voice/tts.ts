// POST /api/voice/tts — Natural multilingual TTS via ElevenLabs.
// Body: { text: string, language?: "bn"|"en" } → audio/mpeg stream.

import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUser } from "@/lib/auth-route.server";

// Voice selection by language. For Bangla we use a voice that handles
// Indic/Bangla phonemes more naturally than the default English-trained Sarah.
// Charlotte — multilingual, warm, good Bangla cadence.
// Use premade voices (available on free plan). language_code on
// eleven_turbo_v2_5 enforces correct Bangla pronunciation regardless of voice.
// English-only TTS. Bangla was removed because library voices with proper
// Bangla pronunciation require a paid ElevenLabs plan, and the multilingual
// premade voices drift toward Hindi phonemes.
const VOICE_EN = "XrExE9yKIg1WjnnlVkGX"; // Matilda — premade, warm & natural

export const Route = createFileRoute("/api/voice/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await getAuthedUser(request);
        if (!authed) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) return new Response("ElevenLabs not configured", { status: 500 });

        let body: { text?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const text = (body.text ?? "").trim();
        if (!text) return new Response("Missing text", { status: 400 });
        const clipped = text.length > 4000 ? text.slice(0, 4000) : text;

        // eleven_multilingual_v2 delivers the most natural, human-like English
        // prosody. Tuned voice_settings prioritize expressiveness over rigidity.
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_EN}/stream?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: clipped,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.4,
                similarity_boost: 0.85,
                style: 0.35,
                use_speaker_boost: true,
                speed: 1.0,
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

