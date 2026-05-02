import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";

const ADMIN_EMAIL = "admin@albert.com";
const ADMIN_PASSWORD = "admin";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Albert" },
      { name: "description", content: "Sign in to Albert." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      toast.error("Invalid credentials. Use admin@albert.com / admin");
      return;
    }

    setLoading(true);

    // Try to sign in; if the account doesn't exist yet, create it.
    let { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (error) {
      const signUp = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      if (signUp.error || !signUp.data.session) {
        // Retry sign-in (covers the case where the user exists but signUp returned no session)
        const retry = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });
        if (retry.error || !retry.data.session) {
          setLoading(false);
          toast.error(retry.error?.message ?? signUp.error?.message ?? "Sign-in failed");
          return;
        }
        data = retry.data;
      } else {
        data = signUp.data;
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.user!.id)
      .maybeSingle();

    setLoading(false);
    navigate({ to: profile?.onboarded ? "/dashboard" : "/onboarding" });
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-6">
      <div className="w-full">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
          Sign in
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
          Welcome to Albert.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Use <span className="font-mono text-foreground">admin@albert.com</span> /{" "}
          <span className="font-mono text-foreground">admin</span>.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@albert.com"
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-coral text-accent-foreground hover:bg-coral/90"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" /> Sign in
              </>
            )}
          </Button>
        </form>

        <p className="mt-10 text-xs text-muted-foreground">
          Hackathon demo.{" "}
          <Link to="/" className="underline decoration-coral">
            Back home
          </Link>
        </p>
      </div>
    </main>
  );
}
