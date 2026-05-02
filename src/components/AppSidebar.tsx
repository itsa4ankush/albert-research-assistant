import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Library, MessageSquare, Pencil, LogOut } from "lucide-react";

const NAV = [
  { title: "Library", url: "/dashboard", icon: Library },
  { title: "Chat", url: "/dashboard", icon: MessageSquare, hint: "Open a paper" },
  { title: "Edit context", url: "/research-context", icon: Pencil },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  const isActive = (path: string) => currentPath === path;

  const topic = profile?.research_context?.topic?.trim();
  const technology = profile?.research_context?.technology?.trim();
  const industry = profile?.research_context?.industry?.trim();
  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] : null;
  const displayName =
    profile?.display_name || user?.email?.split("@")[0] || "Researcher";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral text-accent-foreground font-display text-lg font-bold">
            A
          </span>
          {!collapsed && (
            <span className="font-display text-xl font-semibold tracking-tight">
              Albert
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>You</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 pb-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </p>
                {roleLabel && (
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                )}
                <div className="mt-3 space-y-3 rounded-lg border border-border bg-paper-deep/40 p-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Research topic
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs text-foreground/90">
                      {topic || (
                        <span className="text-muted-foreground italic">
                          Not set yet —{" "}
                          <Link to="/research-context" className="underline">
                            add one
                          </Link>
                          .
                        </span>
                      )}
                    </p>
                  </div>
                  {technology && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Technology
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-foreground/90">
                        {technology}
                      </p>
                    </div>
                  )}
                  {industry && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Industry
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-foreground/90">
                        {industry}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
