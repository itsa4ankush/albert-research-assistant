import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, type UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

const searchSchema = z.object({
  role: z.enum(["student", "phd", "pm", "researcher"]).optional(),
});

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please enter a valid email" })
  .max(255);

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in or log in — Albert" },
      {
        name: "description",
        content: "Sign in to Albert with a one-time code sent to your email.",
      },
    ],
  }),
  validateSearch: searchSchema,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        // No magic link redirect needed — the user enters the OTP code
        shouldCreateUser: true,
      },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Code sent. Check your email.");
    setStep("otp");
  };

  const verifyCode = async (codeToVerify?: string) => {
    const c = codeToVerify ?? code;
    if (c.length !== 6) return;
    setVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: c,
      type: "email",
    });
    if (error || !data.session) {
      setVerifying(false);
      toast.error(error?.message ?? "Invalid code, try again.");
      return;
    }

    // If a role came in via search, persist it on the profile (best-effort)
    if (search.role && data.user) {
      await supabase
        .from("profiles")
        .update({ role: search.role as UserRole })
        .eq("id", data.user.id);
    }

    // Look up onboarding status
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.user!.id)
      .maybeSingle();

    setVerifying(false);
    navigate({ to: profile?.onboarded ? "/dashboard" : "/onboarding" });
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-6">
      <div className="w-full">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
          {step === "email" ? "Sign in or log in" : "Check your inbox"}
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
          {step === "email" ? "Welcome to Albert." : "Enter your code."}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {step === "email"
            ? "We'll email you a 6-digit code — no password needed."
            : `We sent a code to ${email}.`}
        </p>

        {search.role && step === "email" && (
          <p className="mt-4 inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            Continuing as <span className="ml-1 font-semibold text-foreground">{ROLE_LABELS[search.role as UserRole]}</span>
          </p>
        )}

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-10 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@example.com"
                required
                maxLength={255}
              />
            </div>
            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-coral text-accent-foreground hover:bg-coral/90"
              size="lg"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" /> Send code
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="mt-10 space-y-6">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (v.length === 6) verifyCode(v);
              }}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <Button
              onClick={() => verifyCode()}
              disabled={verifying || code.length !== 6}
              className="w-full bg-coral text-accent-foreground hover:bg-coral/90"
              size="lg"
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Verify and continue →"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setCode("");
                setStep("email");
              }}
              className="block w-full text-center text-sm text-muted-foreground underline decoration-coral underline-offset-4 hover:text-foreground"
            >
              Use a different email
            </button>
          </div>
        )}

        <p className="mt-10 text-xs text-muted-foreground">
          By continuing you agree this is a hackathon demo.{" "}
          <Link to="/" className="underline decoration-coral">
            Back home
          </Link>
        </p>
      </div>
    </main>
  );
}
