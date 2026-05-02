import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Navbar() {
  const { isAuthenticated, hydrated, profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const onAuthRoute = location.pathname === "/login";

  // Authenticated routes have their own sidebar layout — don't render the top nav.
  const inAppShell =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/onboarding") ||
    location.pathname.startsWith("/research-context") ||
    location.pathname.startsWith("/papers/");
  if (inAppShell) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const displayName =
    profile?.display_name ||
    user?.email?.split("@")[0] ||
    "";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="group flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-coral text-accent-foreground font-display text-lg font-bold">
            A
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">
            Albert
          </span>
          <span className="ml-1 hidden text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            · research alignment engine
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {hydrated && isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground sm:inline"
                activeProps={{ className: "text-foreground" }}
              >
                Library
              </Link>
              {displayName && (
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {displayName}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />
                Log out
              </Button>
            </>
          ) : !onAuthRoute && hydrated ? (
            <Button asChild size="sm" className="bg-coral text-accent-foreground hover:bg-coral/90">
              <Link to="/login">Sign up or Log in</Link>
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
