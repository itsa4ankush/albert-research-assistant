import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePaper } from "@/lib/store";
import type { Paper, ResearchDatabaseRow } from "@/lib/types";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Review of literature",
  "Results discussion",
  "Hypothesis framework",
  "Idea",
  "Methodology",
  "Background",
];

function blankRecord(title: string): ResearchDatabaseRow {
  return {
    paperTitle: title,
    summary: "",
    methodologySummary: "",
    researchApproach: "",
    outcome: "",
    researchAlignment: "",
    relevanceScore: null,
    comments: "",
    customTags: [],
  };
}

export function AddCustomTagDialog({
  open,
  onOpenChange,
  papers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  papers: Paper[];
}) {
  const [paperId, setPaperId] = useState<string>("");
  const [tag, setTag] = useState("");

  const reset = () => {
    setPaperId("");
    setTag("");
  };

  const submit = () => {
    const trimmed = tag.trim();
    if (!paperId) return toast.error("Pick a paper first.");
    if (!trimmed) return toast.error("Enter a tag.");
    const paper = papers.find((p) => p.id === paperId);
    if (!paper) return;
    const record = paper.researchRecord ?? blankRecord(paper.title);
    if (record.customTags.includes(trimmed)) {
      toast.info("Tag already added to this paper.");
      return;
    }
    updatePaper(paperId, {
      researchRecord: { ...record, customTags: [...record.customTags, trimmed] },
    });
    toast.success(`Added "${trimmed}".`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add custom tag</DialogTitle>
          <DialogDescription>
            Tag a paper with a chapter or theme — e.g. review of literature,
            results discussion, hypothesis framework. Saved into the research
            database row for that paper.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Paper</Label>
            <Select value={paperId} onValueChange={setPaperId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a paper" />
              </SelectTrigger>
              <SelectContent>
                {papers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag-input">Custom tag</Label>
            <Input
              id="tag-input"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. Review of literature"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTag(s)}
                  className="rounded-full border border-border bg-paper-deep/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-paper-deep"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-coral text-accent-foreground hover:bg-coral/90"
            onClick={submit}
          >
            Add tag
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
