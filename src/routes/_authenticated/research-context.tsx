import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type ResearchContext } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/research-context")({
  head: () => ({
    meta: [
      { title: "Research context — Albert" },
      { name: "description", content: "Update the research context Albert uses to tailor answers." },
    ],
  }),
  component: ResearchContextPage,
});

function ResearchContextPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [ctx, setCtx] = useState<ResearchContext>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.research_context) setCtx(profile.research_context);
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ research_context: ctx })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Research context saved.");
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-coral">
        Your research
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        Edit research context
      </h1>
      <p className="mt-3 text-muted-foreground">
        Albert uses this brief whenever you ask questions about a paper.
      </p>

      <div className="mt-8 space-y-5">
        <Field label="Thesis or research topic" value={ctx.topic ?? ""} onChange={(v) => setCtx((c) => ({ ...c, topic: v }))} />
        <Field label="Context / background" value={ctx.background ?? ""} onChange={(v) => setCtx((c) => ({ ...c, background: v }))} />
        <Field label="Problem you're solving" value={ctx.problem ?? ""} onChange={(v) => setCtx((c) => ({ ...c, problem: v }))} />
        <Field label="Expected outcome" value={ctx.outcome ?? ""} onChange={(v) => setCtx((c) => ({ ...c, outcome: v }))} />
        <Field label="Other comments" value={ctx.other ?? ""} onChange={(v) => setCtx((c) => ({ ...c, other: v }))} />
      </div>

      <div className="mt-10 flex gap-3">
        <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })} disabled={saving}>
          Cancel
        </Button>
        <Button
          className="bg-coral text-accent-foreground hover:bg-coral/90"
          size="lg"
          onClick={save}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 2000))}
        rows={3}
      />
    </div>
  );
}
