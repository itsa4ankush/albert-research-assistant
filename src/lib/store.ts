import { useEffect, useState, useCallback } from "react";
import type { Session, Paper, ChatMessage } from "./types";

const SESSION_KEY = "albert.session";
const PAPERS_KEY = "albert.papers";
const CHATS_KEY = "albert.chats";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

// --- session ---

export function getSession(): Session | null {
  return read<Session | null>(SESSION_KEY, null);
}

export function setSession(s: Session | null) {
  if (s === null) {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
  } else {
    write(SESSION_KEY, s);
  }
}

export function useSession() {
  const [session, setLocal] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocal(getSession());
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === SESSION_KEY) setLocal(getSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((s: Session | null) => {
    setSession(s);
    setLocal(s);
  }, []);

  return { session, hydrated, setSession: update };
}

// --- papers ---

export function getPapers(): Paper[] {
  return read<Paper[]>(PAPERS_KEY, []);
}

export function savePaper(p: Paper) {
  const all = getPapers();
  const next = [p, ...all.filter((x) => x.id !== p.id)];
  write(PAPERS_KEY, next);
}

export function deletePaper(id: string) {
  write(
    PAPERS_KEY,
    getPapers().filter((p) => p.id !== id)
  );
  const chats = getAllChats();
  delete chats[id];
  write(CHATS_KEY, chats);
}

export function updatePaper(id: string, patch: Partial<Paper>) {
  const all = getPapers();
  const next = all.map((p) => (p.id === id ? { ...p, ...patch } : p));
  write(PAPERS_KEY, next);
}

export function getPaper(id: string): Paper | undefined {
  return getPapers().find((p) => p.id === id);
}

export function usePapers() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPapers(getPapers());
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === PAPERS_KEY) setPapers(getPapers());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { papers, hydrated };
}

// --- chats ---

function getAllChats(): Record<string, ChatMessage[]> {
  return read<Record<string, ChatMessage[]>>(CHATS_KEY, {});
}

export function getChat(paperId: string): ChatMessage[] {
  return getAllChats()[paperId] ?? [];
}

export function saveChat(paperId: string, messages: ChatMessage[]) {
  const all = getAllChats();
  all[paperId] = messages;
  write(CHATS_KEY, all);
}
