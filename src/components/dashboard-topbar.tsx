import { Search, Bell, LogOut, Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage, useT } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useState, type KeyboardEvent } from "react";

export function DashboardTopbar({ title }: { title: string }) {
  const { lang, toggleLang } = useLanguage();
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

        <button
          onClick={toggleLang}
          className="flex h-8 items-center overflow-hidden rounded-md border text-xs"
        >
          <span className={`px-2 py-1 rounded-xl ${lang === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>বাং</span>
          <span className={`px-2 py-1 rounded-xl ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>En</span>
        </button>
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
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
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
