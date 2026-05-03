import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { isDemoUser, saveDemoProfile, useAuth, type ResearchContext } from "@/lib/auth";
import { upsertResearcher } from "@/lib/csv-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Albert" },
      { name: "description", content: "Tell Albert about your research." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, hydrated, profileLoading, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [ctx, setCtx] = useState<ResearchContext>(profile?.research_context ?? {});
  const [saving, setSaving] = useState(false);

  // Returning user: if onboarded AND research context exists, skip onboarding entirely.
  useEffect(() => {
    if (!hydrated || profileLoading || !profile) return;
    const hasCtx =
      !!profile.research_context &&
      Object.values(profile.research_context).some((v) => (v ?? "").trim?.());
    if (profile.onboarded && hasCtx) {
      navigate({ to: "/dashboard" });
    }
  }, [hydrated, profileLoading, profile, navigate]);

  // Hydrate local state when profile loads
  useEffect(() => {
    if (profile) {
      setName((n) => n || profile.display_name || "");
      setCtx((c) => (Object.keys(c).length ? c : profile.research_context ?? {}));
    }
  }, [profile]);

  const finish = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Please add your name first.");
      return;
    }
    setSaving(true);
    if (isDemoUser(user)) {
      saveDemoProfile({
        display_name: name.trim(),
        research_context: ctx,
        onboarded: true,
      });
      setSaving(false);
      await refreshProfile();
      navigate({ to: "/dashboard" });
      return;
    }
    upsertResearcher({
      id: user.id,
      email: user.email ?? null,
      display_name: name.trim(),
      role: profile?.role ?? null,
      interests: profile?.interests ?? null,
      onboarded: true,
      research_context: ctx,
    });
    setSaving(false);
    await refreshProfile();
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
        Get started
      </p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
        Tell Albert about your research.
      </h1>
      <p className="mt-3 text-muted-foreground">
        A short brief helps Albert connect each paper to what you actually care
        about. All fields except your name are optional.
      </p>

      <div className="mt-10 space-y-5">
        <div className="space-y-2">
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

        <Field
          label="Thesis or research topic"
          placeholder="e.g. Self-supervised representation learning for medical imaging"
          value={ctx.topic ?? ""}
          onChange={(v) => setCtx((c) => ({ ...c, topic: v }))}
        />
        <Field
          label="Technology"
          placeholder="e.g. Transformers, PyTorch, diffusion models, CRISPR"
          value={ctx.technology ?? ""}
          onChange={(v) => setCtx((c) => ({ ...c, technology: v }))}
        />
        <Field
          label="Industry"
          placeholder="e.g. Healthcare, fintech, climate tech, education"
          value={ctx.industry ?? ""}
          onChange={(v) => setCtx((c) => ({ ...c, industry: v }))}
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

      <div className="mt-10">
        <Button
          className="bg-coral text-accent-foreground hover:bg-coral/90"
          size="lg"
          onClick={finish}
          disabled={saving || !name.trim()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue →"}
        </Button>
      </div>
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
