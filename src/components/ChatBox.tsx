import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Paper, ChatMessage } from "@/lib/types";
import { getChat, saveChat } from "@/lib/store";
import { pickRelevantChunks } from "@/lib/pdf";
import { askWatsonx } from "@/server/watsonx.functions";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function ChatBox({ paper, suggestions }: { paper: Paper; suggestions: string[] }) {
  const ask = useServerFn(askWatsonx);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(getChat(paper.id));
  }, [paper.id]);

  useEffect(() => {
    saveChat(paper.id, messages);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, paper.id]);

  const send = async (questionOverride?: string) => {
    const question = (questionOverride ?? input).trim();
    if (!question || busy) return;
    setInput("");
    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: question, ts: Date.now() },
    ];
    setMessages(next);
    setBusy(true);

    const contextChunks = pickRelevantChunks(question, paper.chunks, 4);
    const history = next.slice(-6).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await ask({ data: { question, contextChunks, history } });
      const reply: ChatMessage = {
        role: "assistant",
        content: res.error ? `⚠️ ${res.error}` : res.text || "(empty response)",
        ts: Date.now(),
      };
      setMessages((m) => [...m, reply]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ ${msg}`, ts: Date.now() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-soft">
      <div className="border-b border-border px-5 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-coral">
          Chat with Albert
        </p>
        <p className="text-sm text-muted-foreground">
          Grounded in {paper.chunks.length} excerpts
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div>
            <p className="text-sm text-muted-foreground">
              Try one of these to get started:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-full border border-border bg-paper-deep px-3 py-1.5 text-xs hover:border-ink/40"
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-tr-sm bg-coral text-accent-foreground"
                    : "rounded-tl-sm bg-paper-deep text-foreground"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="mb-1 font-display text-xs font-semibold text-coral">
                    Albert
                  </div>
                )}
                {m.content}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-paper-deep px-4 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft" style={{ animationDelay: "120ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        className="flex items-end gap-2 border-t border-border px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Ask anything about this paper…"
          className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-ink/40 focus:outline-none focus:ring-2 focus:ring-coral/30"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !input.trim()}
          className="h-10 w-10 bg-coral text-accent-foreground hover:bg-coral/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
