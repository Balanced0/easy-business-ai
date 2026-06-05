import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, User, Database, Upload, Mic, Square, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useLanguage, useT } from "@/hooks/use-language";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({ meta: [{ title: "এআই সহকারী / AI Assistant — EasyBusiness AI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
    t: typeof s.t === "number" ? s.t : undefined,
  }),
  component: AssistantPage,
});

const suggestions = [
  "কোন পণ্যগুলো ট্রেন্ডিং? / Which products are trending?",
  "কী রিস্টক করা উচিত? / What should I restock?",
  "বিক্রয় কেন কমছে? / Why are sales dropping?",
  "প্রতিযোগীদের তুলনায় আমার দাম কেমন? / How do my prices compare to competitors?",
];

function AssistantPage() {
  const [input, setInput] = useState("");
  const [docCount, setDocCount] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { lang } = useLanguage();
  const t = useT();

  useEffect(() => {
    authHeaders().then((h) =>
      fetch("/api/embeddings", { headers: h })
        .then((r) => r.json())
        .then((j) => setDocCount(j.count ?? 0))
        .catch(() => setDocCount(0)),
    );
  }, []);

  const voiceModeRef = useRef(false);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ messages: ms, id }) => ({
        body: { messages: ms, id, language: lang, voice: voiceModeRef.current },
        headers: await authHeaders(),
      }),
    }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const lastHandledKey = useRef<string | null>(null);
  useEffect(() => {
    const q = search.q?.trim();
    if (!q) return;
    const key = `${q}|${search.t ?? ""}`;
    if (lastHandledKey.current === key) return;
    lastHandledKey.current = key;
    console.log("[assistant] auto-send from search param:", q);
    void sendMessage({ text: q });
    navigate({ search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q, search.t]);

  const isLoading = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    const q = text.trim();
    if (!q || isLoading) return;
    void sendMessage({ text: q });
    setInput("");
  };

  // ---- Voice features ----
  const [voiceMode, setVoiceMode] = useState(false);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      try {
        stopAudio();
        setSpeaking(true);
        const headers = await authHeaders();
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`TTS failed (${res.status})`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
        };
        await audio.play();
      } catch (err) {
        console.error("[voice] tts error", err);
        toast.error(lang === "bn" ? "ভয়েস প্লে করা যায়নি" : "Could not play voice");
        setSpeaking(false);
      }
    },
    [lang, stopAudio],
  );

  const startRecording = useCallback(async () => {
    if (recording || transcribing || isLoading) return;
    try {
      stopAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size < 500) {
          toast.error(lang === "bn" ? "কিছু শোনা যায়নি" : "Didn't catch that");
          return;
        }
        setTranscribing(true);
        try {
          const headers = await authHeaders();
          const fd = new FormData();
          fd.append("audio", blob, "speech.webm");
          fd.append("language", lang);
          const res = await fetch("/api/voice/stt", { method: "POST", headers, body: fd });
          if (!res.ok) throw new Error(`STT ${res.status}`);
          const data = (await res.json()) as { text?: string; language?: string };
          const text = (data.text ?? "").trim();
          if (!text) {
            toast.error(lang === "bn" ? "কোনো বাক্য চিহ্নিত হয়নি" : "No speech detected");
            return;
          }
          void sendMessage({ text });
        } catch (err) {
          console.error("[voice] stt error", err);
          toast.error(lang === "bn" ? "স্পিচ বুঝতে পারিনি" : "Could not transcribe");
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (err) {
      console.error("[voice] mic error", err);
      toast.error(lang === "bn" ? "মাইক্রোফোন অ্যাক্সেস নেই" : "Microphone access denied");
    }
  }, [recording, transcribing, isLoading, lang, sendMessage, stopAudio]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  // Auto-speak new assistant messages when voice mode is on and stream is done.
  // English only — skip Bangla messages (TTS for Bangla is disabled).
  useEffect(() => {
    if (!voiceMode) return;
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenIdsRef.current.has(last.id)) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
    if (!text) return;
    spokenIdsRef.current.add(last.id);
    // Detect Bangla characters (U+0980–U+09FF). If present, skip speaking.
    if (/[\u0980-\u09FF]/.test(text)) return;
    void speak(text);
  }, [messages, status, voiceMode, speak]);

  useEffect(() => () => stopAudio(), [stopAudio]);


  const welcomeBn = "হাই! আমি আপনার এআই কমার্স সহকারী। ট্রেন্ড, ইনভেন্টরি, মূল্য বা গ্রাহক সন্তুষ্টি সম্পর্কে জিজ্ঞাসা করুন।";
  const welcomeEn = "Hi! I'm your AI commerce assistant. Ask me about trends, inventory, pricing, or customer sentiment — I'll pull from your store data.";

  return (
    <>
      <DashboardTopbar title="এআই কমার্স সহকারী / AI Commerce Assistant" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card className="flex h-[calc(100vh-9rem)] flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">{t("কমার্স সহকারী / Commerce Assistant")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("Gemini + আপনার স্টোর ডেটা দ্বারা চালিত / Powered by Gemini + your store data")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <div ref={scrollRef} className="h-full space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="text-xs font-medium">{t("সহকারী / Assistant")}</div>
                      <div className="mt-1 text-sm leading-relaxed text-foreground/90">
                        {lang === "bn" ? welcomeBn : welcomeEn}
                      </div>
                    </div>
                  </div>
                )}
                {messages.map((m) => {
                  const text = m.parts
                    .map((p) => (p.type === "text" ? p.text : ""))
                    .join("");
                  return (
                    <div key={m.id} className="flex gap-3">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                          m.role === "assistant"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <Sparkles className="h-3.5 w-3.5" />
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="text-xs font-medium">
                          {m.role === "assistant" ? t("সহকারী / Assistant") : t("আপনি / You")}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                          {text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {status === "submitted" && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 pt-1.5">
                      <div className="text-sm text-muted-foreground">{t("চিন্তা করছি… / Thinking…")}</div>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {error.message || t("কিছু ভুল হয়েছে। আবার চেষ্টা করুন। / Something went wrong. Please try again.")}
                  </div>
                )}
              </div>
            </CardContent>
            <div className="space-y-2 border-t p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Switch
                    id="voice-mode"
                    checked={voiceMode}
                    onCheckedChange={(v) => {
                      setVoiceMode(v);
                      if (!v) stopAudio();
                    }}
                  />
                  <Label htmlFor="voice-mode" className="cursor-pointer text-xs">
                    {voiceMode ? (
                      <span className="flex items-center gap-1"><Volume2 className="h-3.5 w-3.5" /> {t("ভয়েস রেসপন্স চালু / Voice replies on")}</span>
                    ) : (
                      <span className="flex items-center gap-1"><VolumeX className="h-3.5 w-3.5" /> {t("ভয়েস রেসপন্স বন্ধ / Voice replies off")}</span>
                    )}
                  </Label>
                </div>
                {speaking && (
                  <button
                    type="button"
                    onClick={stopAudio}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("থামান / Stop")}
                  </button>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-2"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={
                    recording
                      ? t("শুনছি… ট্যাপ করে থামান / Listening… tap to stop")
                      : transcribing
                      ? t("ট্রান্সক্রাইব করছি… / Transcribing…")
                      : t("আপনার স্টোর সম্পর্কে কিছু জিজ্ঞাসা করুন... / Ask anything about your store...")
                  }
                  className="min-h-[42px] resize-none"
                  rows={1}
                  disabled={isLoading || recording || transcribing}
                />
                <Button
                  type="button"
                  size="icon"
                  variant={recording ? "destructive" : "outline"}
                  className="h-10 w-10 shrink-0"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={isLoading || transcribing}
                  title={t("ভয়েস ইনপুট / Voice input")}
                >
                  {transcribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : recording ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  disabled={isLoading || recording || transcribing || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>

          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {t("নলেজ বেস / Knowledge base")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {docCount === null
                    ? t("লোড হচ্ছে... / Loading...")
                    : docCount === 0
                    ? t("খালি — ডেটা আপলোড করুন / Empty — upload data")
                    : `${docCount} ${t("ডকুমেন্ট ইন্ডেক্স করা / documents indexed")}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/upload">
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    {t("ডেটা আপলোড পেজ / Upload data page")}
                  </Link>
                </Button>
              </CardContent>
            </Card>


            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("প্রস্তাবিত প্রশ্ন / Suggested questions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={isLoading}
                    className="w-full rounded-md border bg-card p-3 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {t(s)}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
