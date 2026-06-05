import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Users,
  TrendingUp,
  MessageSquare,
  Info,
  BarChart3,
  Upload,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useT } from "@/hooks/use-language";

const items = [
  { title: "ড্যাশবোর্ড / Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "ডেটা আপলোড / Upload Data", url: "/upload", icon: Upload },
  { title: "ইনভেন্টরি / Inventory", url: "/inventory", icon: Package },
  { title: "প্রতিযোগী / Competitors", url: "/competitors", icon: TrendingUp },
  { title: "গ্রাহক / Customers", url: "/customers", icon: Users },
  { title: "এআই সহকারী / AI Assistant", url: "/assistant", icon: MessageSquare },
  { title: "সম্পর্কে / About", url: "/about", icon: Info },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useT();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center justify-start gap-2 px-2 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">ইজিবিজনেস</span>
            <span className="text-xs text-muted-foreground">EasyBusiness AI</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("ওয়ার্কস্পেস / Workspace")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.title)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
