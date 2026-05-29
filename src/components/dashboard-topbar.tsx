import { Search, Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage, useT } from "@/hooks/use-language";

export function DashboardTopbar({ title }: { title: string }) {
  const { lang, toggleLang } = useLanguage();
  const t = useT();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger />
      <h1 className="text-sm font-semibold">{t(title)}</h1>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("পণ্য, SKU খুঁজুন... / Search products, SKUs...")}
            className="h-9 w-64 pl-8"
          />
        </div>
        <button
          onClick={toggleLang}
          className="flex h-8 items-center overflow-hidden rounded-md border text-xs"
        >
          <span
            className={`px-2 py-1 ${lang === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            বাং
          </span>
          <span
            className={`px-2 py-1 ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            En
          </span>
        </button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">SM</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
