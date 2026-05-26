import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, User } from "lucide-react";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — EasyBusiness AI" }] }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; text: string };

const suggestions = [
  "Which products are trending?",
  "What should I restock?",
  "Why are sales dropping?",
  "How do my prices compare to competitors?",
];

const canned: Record<string, string> = {
  "which products are trending?":
    "Top trending SKUs this week: Runner Sneakers (+34%), Canvas Tote Bag (+22%), and Cotton T-Shirt (+18%). Footwear demand is accelerating across the category — consider boosting ad spend on Runner Sneakers.",
  "what should i restock?":
    "Priority restocks based on 7-day demand forecast: Runner Sneakers Size 9 (60 units), Cotton T-Shirt Black M (120 units), Canvas Tote Bag (80 units). Ceramic Mug 350ml is overstocked — hold off and run a small promo instead.",
  "why are sales dropping?":
    "Sales are actually up 12.4% MoM overall. However, electronics revenue dipped 6% last week — likely tied to Competitor B reducing wireless headphone prices by 8%. Recommend a limited-time bundle to defend share.",
  "how do my prices compare to competitors?":
    "You're priced below the 3-competitor average on 4 of 5 tracked products. Wireless Headphones is the exception — you're $5 above Competitor B. Either justify with a value bundle or trim $3 to stay competitive.",
};

function reply(q: string): string {
  const key = q.trim().toLowerCase();
  return (
    canned[key] ??
    "Based on your current data: sales are trending up, inventory has 3 low-stock SKUs that need attention this week, and customer sentiment is 64% positive. Ask me about trending products, restocking, pricing, or sentiment for a more specific answer."
  );
}

function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi! I'm your AI commerce assistant. Ask me about trends, inventory, pricing, or customer sentiment — I'll pull from your store data.",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", text: reply(q) }]);
    }, 450);
  };

  return (
    <>
      <DashboardTopbar title="AI Commerce Assistant" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card className="flex h-[calc(100vh-9rem)] flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Commerce Assistant</CardTitle>
                  <CardDescription className="text-xs">Powered by Gemini + your store data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <div ref={scrollRef} className="h-full space-y-4 overflow-y-auto p-4">
                {messages.map((m, i) => (
                  <div key={i} className="flex gap-3">
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
                        {m.role === "assistant" ? "Assistant" : "You"}
                      </div>
                      <div className="mt-1 text-sm leading-relaxed text-foreground/90">
                        {m.text}
                      </div>
                    </div>
                  </div>
                ))}
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
                  placeholder="Ask anything about your store..."
                  className="min-h-[42px] resize-none"
                  rows={1}
                />
                <Button type="submit" size="icon" className="h-10 w-10 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suggested questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full rounded-md border bg-card p-3 text-left text-sm transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
