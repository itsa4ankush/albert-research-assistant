import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { parsePdf, chunkText } from "@/lib/pdf";
import { savePaper, updatePaper } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { analyzePaper, fetchPaperFromUrl } from "@/server/watsonx.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Link2, FileUp } from "lucide-react";
import { toast } from "sonner";

export function UploadPaperDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [url, setUrl] = useState("");

  const ctx = profile?.research_context ?? {};

  // Run AI analysis after the paper is saved; non-blocking from the user's POV.
  const runAnalysis = async (id: string, title: string, text: string) => {
    try {
      const result = await analyzePaper({
        data: {
          title,
          text: text.slice(0, 30000),
          researchContext: ctx,
        },
      });
      updatePaper(id, {
        relevanceScore: result.relevance,
        tags: result.tags,
        excerpt: result.excerpt,
        keywords: result.keywords,
        analyzing: false,
      });
    } catch (err) {
      console.error("analyzePaper error", err);
      updatePaper(id, { analyzing: false });
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("PDF is larger than 20 MB.");
      return;
    }
    setBusy(true);
    try {
      const parsed = await parsePdf(file);
      const id = crypto.randomUUID();
      savePaper({
        id,
        title: parsed.inferredTitle,
        filename: file.name,
        uploadedAt: Date.now(),
        pageCount: parsed.pageCount,
        fullText: parsed.fullText,
        chunks: parsed.chunks,
        analyzing: true,
      });
      toast.success(`Added "${parsed.inferredTitle.slice(0, 40)}…"`);
      onOpenChange(false);
      navigate({ to: "/dashboard" });
      // Fire-and-forget AI analysis
      void runAnalysis(id, parsed.inferredTitle, parsed.fullText);
    } catch (err) {
      console.error(err);
      toast.error("Could not read that PDF.");
    } finally {
      setBusy(false);
    }
  };

  const handleUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      // basic URL sanity
      new URL(trimmed);
    } catch {
      toast.error("Please paste a valid URL (including https://).");
      return;
    }
    setBusy(true);
    try {
      const result = await fetchPaperFromUrl({ data: { url: trimmed } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.kind === "pdf") {
        // Decode base64 to a File and parse client-side with pdfjs
        const bin = atob(result.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], result.filename, { type: "application/pdf" });
        await handleFile(file);
        setUrl("");
        return;
      }

      // HTML page → store the extracted text as a "paper"
      const { fullText, chunks } = chunkText(result.text);
      const id = crypto.randomUUID();
      savePaper({
        id,
        title: result.title,
        filename: trimmed,
        sourceUrl: trimmed,
        uploadedAt: Date.now(),
        pageCount: 1,
        fullText,
        chunks,
        analyzing: true,
      });
      toast.success(`Added "${result.title.slice(0, 40)}…"`);
      setUrl("");
      onOpenChange(false);
      navigate({ to: "/dashboard" });
      void runAnalysis(id, result.title, fullText);
    } catch (err) {
      console.error(err);
      toast.error("Could not fetch that URL.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add a paper</DialogTitle>
          <DialogDescription>
            Paste a link to a paper or upload a PDF. Albert will read it and score
            its relevance to your research.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">
              <Link2 className="mr-1 h-4 w-4" />
              Paste URL
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <FileUp className="mr-1 h-4 w-4" />
              Upload PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="mt-4 space-y-3">
            <Label htmlFor="paper-url">Paper URL</Label>
            <Input
              id="paper-url"
              type="url"
              placeholder="https://arxiv.org/abs/2310.06825"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Works with arXiv, direct PDF links, and most article pages.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={handleUrl}
                disabled={busy || !url.trim()}
                className="bg-coral text-accent-foreground hover:bg-coral/90"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch paper"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="pdf" className="mt-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
                drag
                  ? "border-coral bg-coral/5"
                  : "border-border bg-paper-deep/40 hover:border-foreground/40"
              } ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className="font-display text-3xl">
                {busy ? "Reading…" : "Drop a PDF here"}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                or click to choose a file (max 20 MB)
              </p>
            </label>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
