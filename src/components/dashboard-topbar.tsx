import { Search, LogOut, Moon, Sun, ChevronDown, Zap } from "lucide-react";
import { NotificationsPopover } from "@/components/notifications-popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, useT, SUPPORTED_LOCALES, LOCALE_META, type LocaleKey } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useCredits } from "@/hooks/use-credits";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type KeyboardEvent } from "react";

export function DashboardTopbar({ title }: { title: string }) {
  const { theme, toggleTheme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(/\s+/)
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const goProfile = () => navigate({ to: "/profile" });

  const runSearch = () => {
    const q = query.trim();
    console.log("[topbar] search submit:", q);
    if (!q) return;
    navigate({ to: "/dashboard", search: { q, t: Date.now() } });
    setQuery("");
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  };


  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger />
      <h1 className="text-sm font-semibold">{t(title)}</h1>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={runSearch}
            className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            aria-label={t("খুঁজুন / Search")}
          >
            <Search className="h-4 w-4" />
          </button>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={t("পণ্য, SKU খুঁজুন... / Search products, SKUs...")}
            className="h-9 w-64 pl-8"
          />
        </div>

        <CreditsBadge />

        <LocaleSwitcher />

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={toggleTheme}
          title={t("থিম পরিবর্তন / Toggle theme")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <NotificationsPopover />
        <button
          type="button"
          onClick={goProfile}
          title={t("প্রোফাইল / Profile")}
          aria-label={t("প্রোফাইল / Profile")}
          className="rounded-full ring-offset-background transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLogout} title={t("লগ আউট / Sign out")}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

function CreditsBadge() {
  const { total, loading } = useCredits();
  const t = useT();
  const low = total <= 10;
  return (
    <Link
      to="/billing"
      title={t("এআই ক্রেডিট / AI credits")}
      className={`hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition hover:bg-accent ${
        low
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-border bg-muted/40 text-foreground"
      }`}
    >
      <Zap className="h-3.5 w-3.5" />
      <span className="tabular-nums">{loading ? "—" : total.toLocaleString()}</span>
    </Link>
  );
}

function LocaleSwitcher() {
  const { locale, setLocale } = useLanguage();
  const meta = LOCALE_META[locale as LocaleKey] ?? LOCALE_META.en;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 px-2.5">
          <span className="text-base leading-none">{meta.flag}</span>
          <span className="text-xs font-medium">{meta.nativeLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LOCALES.map((code) => {
          const m = LOCALE_META[code];
          const isActive = m.active;
          return (
            <DropdownMenuItem
              key={code}
              disabled={!isActive}
              onSelect={(e) => {
                if (!isActive) {
                  e.preventDefault();
                  return;
                }
                setLocale(code);
              }}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{m.flag}</span>
                <span className={isActive ? "" : "text-muted-foreground"}>{m.nativeLabel}</span>
              </span>
              {!isActive && <span className="text-[10px] text-muted-foreground">soon</span>}
              {isActive && code === locale && <span className="text-[10px] text-primary">●</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

