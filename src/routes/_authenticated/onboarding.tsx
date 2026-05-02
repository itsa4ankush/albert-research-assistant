import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth, type ResearchContext } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABELS, type UserRole } from "@/lib/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const INTERESTS = [
  "Machine learning",
  "Biology",
  "Physics",
  "Economics",
  "Linguistics",
  "Neuroscience",
  "HCI",
  "Climate",
];

const ROLES: UserRole[] = ["student", "phd", "pm", "researcher"];

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Albert" },
      { name: "description", content: "Quick setup to personalize your Albert experience." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, hydrated, profileLoading, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [role, setRole] = useState<UserRole | undefined>(
    (profile?.role as UserRole | undefined) ?? undefined
  );
  const [picked, setPicked] = useState<string[]>(profile?.interests ?? []);
  const [ctx, setCtx] = useState<ResearchContext>(profile?.research_context ?? {});
  const [saving, setSaving] = useState(false);

  // Returning user: if onboarded AND research context exists, skip onboarding entirely.
  useEffect(() => {
    if (!hydrated || profileLoading || !profile) return;
    const hasCtx = !!profile.research_context && Object.values(profile.research_context).some(v => (v ?? "").trim?.());
    if (profile.onboarded && hasCtx) {
      navigate({ to: "/dashboard" });
    }
  }, [hydrated, profileLoading, profile, navigate]);

  // Hydrate local state when profile loads
  useEffect(() => {
    if (profile) {
      setName((n) => n || profile.display_name || "");
      setRole((r) => r ?? (profile.role as UserRole | undefined) ?? undefined);
      setPicked((p) => (p.length ? p : profile.interests ?? []));
      setCtx((c) => (Object.keys(c).length ? c : profile.research_context ?? {}));
    }
  }, [profile]);

  const finish = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Please add your name first.");
      setStep(0);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        role: role ?? null,
        interests: picked,
        research_context: ctx,
        onboarded: true,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    navigate({ to: "/dashboard" });
  };

  const totalSteps = 4;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? "bg-coral" : "bg-border"
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
            Step 1 of {totalSteps}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
            What should we call you?
          </h1>
          <div className="mt-8 space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              maxLength={100}
            />
          </div>

          <div className="mt-8 space-y-2">
            <Label>I am a…</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const on = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      on
                        ? "border-coral bg-coral/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            className="mt-10 bg-coral text-accent-foreground hover:bg-coral/90"
            size="lg"
            onClick={() => setStep(1)}
            disabled={!name.trim()}
          >
            Next →
          </Button>
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
            Step 2 of {totalSteps}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
            What do you read?
          </h1>
          <p className="mt-3 text-muted-foreground">
            Pick a few — Albert uses this to suggest example questions.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const on = picked.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setPicked((p) =>
                      on ? p.filter((x) => x !== i) : [...p, i]
                    )
                  }
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    on
                      ? "border-coral bg-coral text-accent-foreground"
                      : "border-border bg-card hover:border-foreground/40"
                  }`}
                >
                  {i}
                </button>
              );
            })}
          </div>
          <div className="mt-10 flex gap-3">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              className="bg-coral text-accent-foreground hover:bg-coral/90"
              size="lg"
              onClick={() => setStep(2)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
            Step 3 of {totalSteps}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
            Tell Albert about your research.
          </h1>
          <p className="mt-3 text-muted-foreground">
            A short brief helps Albert connect each paper to what you actually care about. All optional.
          </p>

          <div className="mt-8 space-y-5">
            <Field
              label="Thesis or research topic"
              placeholder="e.g. Self-supervised representation learning for medical imaging"
              value={ctx.topic ?? ""}
              onChange={(v) => setCtx((c) => ({ ...c, topic: v }))}
            />
            <Field
              label="Context / background"
              placeholder="What field are you in? What have you been reading lately?"
              value={ctx.background ?? ""}
              onChange={(v) => setCtx((c) => ({ ...c, background: v }))}
            />
            <Field
              label="Problem you're solving"
              placeholder="The specific question or gap you're trying to address."
              value={ctx.problem ?? ""}
              onChange={(v) => setCtx((c) => ({ ...c, problem: v }))}
            />
            <Field
              label="Expected outcome"
              placeholder="What would a successful answer look like for you?"
              value={ctx.outcome ?? ""}
              onChange={(v) => setCtx((c) => ({ ...c, outcome: v }))}
            />
            <Field
              label="Other comments"
              placeholder="Anything else Albert should keep in mind."
              value={ctx.other ?? ""}
              onChange={(v) => setCtx((c) => ({ ...c, other: v }))}
            />
          </div>

          <div className="mt-10 flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              className="bg-coral text-accent-foreground hover:bg-coral/90"
              size="lg"
              onClick={() => setStep(3)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
            Step 4 of {totalSteps}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
            One more thing.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Bring a PDF on your next stop. Drag-and-drop on the dashboard and
            Albert will read it in a few seconds — entirely in your browser.
          </p>
          <div className="mt-10 flex gap-3">
            <Button variant="ghost" onClick={() => setStep(2)} disabled={saving}>
              Back
            </Button>
            <Button
              className="bg-coral text-accent-foreground hover:bg-coral/90"
              size="lg"
              onClick={finish}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue →"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 2000))}
        placeholder={placeholder}
        rows={3}
      />
    </div>
  );
}
