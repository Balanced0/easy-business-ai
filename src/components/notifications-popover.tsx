import { Bell, CheckCheck, Package, TrendingUp, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/use-language";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  icon: "stock" | "trend" | "ai" | "alert";
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const SEED: Notif[] = [
  {
    id: "n1",
    icon: "stock",
    title: "কম স্টক সতর্কতা / Low stock alert",
    body: "৩টি পণ্যের স্টক ১০-এর নিচে নেমে এসেছে। / 3 products dropped below 10 units.",
    time: "5m",
    read: false,
  },
  {
    id: "n2",
    icon: "trend",
    title: "বিক্রয় বৃদ্ধি / Sales spike",
    body: "গত ২৪ ঘন্টায় বিক্রয় ১৮% বেড়েছে। / Sales up 18% in the last 24h.",
    time: "1h",
    read: false,
  },
  {
    id: "n3",
    icon: "ai",
    title: "নতুন AI ইনসাইট / New AI insight",
    body: "প্রতিযোগী মূল্য বিশ্লেষণ প্রস্তুত। / Competitor pricing analysis is ready.",
    time: "3h",
    read: false,
  },
  {
    id: "n4",
    icon: "alert",
    title: "ডেটা সিঙ্ক / Data sync",
    body: "সর্বশেষ আপলোড সফলভাবে প্রক্রিয়া হয়েছে। / Latest upload processed successfully.",
    time: "1d",
    read: true,
  },
];

const STORAGE_KEY = "eb_notifications_v1";

function loadNotifs(): Notif[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Notif[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED;
    return parsed;
  } catch {
    return SEED;
  }
}

function saveNotifs(n: Notif[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
  } catch {
    /* noop */
  }
}

function IconFor({ kind }: { kind: Notif["icon"] }) {
  const base = "h-4 w-4";
  switch (kind) {
    case "stock":
      return <Package className={cn(base, "text-amber-500")} />;
    case "trend":
      return <TrendingUp className={cn(base, "text-emerald-500")} />;
    case "ai":
      return <Sparkles className={cn(base, "text-primary")} />;
    case "alert":
      return <AlertTriangle className={cn(base, "text-rose-500")} />;
  }
}

export function NotificationsPopover() {
  const t = useT();
  const [items, setItems] = useState<Notif[]>(SEED);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(loadNotifs());
  }, []);

  useEffect(() => {
    saveNotifs(items);
  }, [items]);

  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const markAllRead = () => setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  const markRead = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={t("নোটিফিকেশন / Notifications")}
          title={t("নোটিফিকেশন / Notifications")}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-semibold">{t("নোটিফিকেশন / Notifications")}</div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={markAllRead}
            disabled={unread === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t("সব পঠিত / Mark all read")}
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {t("কোনো নোটিফিকেশন নেই / No notifications")}
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full gap-3 border-b px-3 py-2.5 text-left transition hover:bg-muted/60",
                  !n.read && "bg-primary/5"
                )}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <IconFor kind={n.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
