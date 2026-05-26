import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
