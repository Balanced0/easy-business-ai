import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, User, Database, Loader2 } from "lucide-react";
import { useLanguage, useT } from "@/hooks/use-language";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({ meta: [{ title: "এআই সহকারী / AI Assistant — EasyBusiness AI" }] }),
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
  const [seedCount, setSeedCount] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { lang } = useLanguage();
  const t = useT();

  useEffect(() => {
    fetch("/api/embeddings")
      .then((r) => r.json())
      .then((j) => setSeedCount(j.count ?? 0))
      .catch(() => setSeedCount(0));
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true, reset: true }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Seed failed");
      toast.success(
        lang === "bn"
          ? `নলেজ বেস তৈরি হয়েছে (${j.inserted} ডকুমেন্ট)`
          : `Knowledge base built (${j.inserted} documents)`,
      );
      setSeedCount(j.inserted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSeeding(false);
    }
  };

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    const q = text.trim();
    if (!q || isLoading) return;
    void sendMessage({ text: q });
    setInput("");
  };

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
            <div className="border-t p-3">
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
                  placeholder={t("আপনার স্টোর সম্পর্কে কিছু জিজ্ঞাসা করুন... / Ask anything about your store...")}
                  className="min-h-[42px] resize-none"
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  disabled={isLoading || !input.trim()}
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
                  {seedCount === null
                    ? t("লোড হচ্ছে... / Loading...")
                    : seedCount === 0
                    ? t("খালি — সিড করুন / Empty — seed it")
                    : `${seedCount} ${t("ডকুমেন্ট ইন্ডেক্স করা / documents indexed")}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleSeed}
                  disabled={seeding}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {seeding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {seedCount && seedCount > 0
                    ? t("পুনরায় সিড / Re-seed")
                    : t("নলেজ বেস তৈরি করুন / Build knowledge base")}
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
      </main>
    </>
  );
}
