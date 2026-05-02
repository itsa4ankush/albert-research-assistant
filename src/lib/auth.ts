import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session as SupabaseSession, User } from "@supabase/supabase-js";
import type { UserRole } from "./types";

const DEMO_SESSION_KEY = "albert.demo.session";
const DEMO_PROFILE_KEY = "albert.demo.profile";

export const ADMIN_EMAIL = "admin@albert.com";
export const ADMIN_PASSWORD = "admin";

export type AuthUser = Pick<User, "id" | "email"> & Partial<User>;

type DemoSession = {
  demo: true;
  user: AuthUser;
  createdAt: number;
};

const DEMO_USER: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: ADMIN_EMAIL,
};

export type ResearchContext = {
  topic?: string;
  technology?: string;
  industry?: string;
  background?: string;
  problem?: string;
  outcome?: string;
  other?: string;
};

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole | null;
  interests: string[] | null;
  onboarded: boolean;
  research_context: ResearchContext | null;
};

function dispatchDemoStorage(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

function readDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    return null;
  }
}

export function isDemoUser(user: AuthUser | null | undefined) {
  return user?.email?.toLowerCase() === ADMIN_EMAIL;
}

export function getDemoProfile(): Profile {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(DEMO_PROFILE_KEY);
      if (raw) return JSON.parse(raw) as Profile;
    } catch {
      // Fall through to the default profile.
    }
  }
  return {
    id: DEMO_USER.id,
    email: ADMIN_EMAIL,
    display_name: "Admin",
    role: "researcher",
    interests: null,
    onboarded: false,
    research_context: null,
  };
}

export function saveDemoProfile(patch: Partial<Profile>) {
  if (typeof window === "undefined") return getDemoProfile();
  const next = { ...getDemoProfile(), ...patch };
  window.localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(next));
  dispatchDemoStorage(DEMO_PROFILE_KEY);
  return next;
}

export function signInDemo() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      DEMO_SESSION_KEY,
      JSON.stringify({ demo: true, user: DEMO_USER, createdAt: Date.now() })
    );
    dispatchDemoStorage(DEMO_SESSION_KEY);
  }
  return getDemoProfile();
}

function clearDemoAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_SESSION_KEY);
  dispatchDemoStorage(DEMO_SESSION_KEY);
}

export function useAuth() {
  const [session, setSession] = useState<SupabaseSession | DemoSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // CRITICAL: subscribe BEFORE getSession()
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (!sess) setProfile(null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setHydrated(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch profile when user changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("id, email, display_name, role, interests, onboarded, research_context")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile((data as Profile | null) ?? null);
        setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, interests, onboarded, research_context")
      .eq("id", user.id)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
    return (data as Profile | null) ?? null;
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  return {
    session,
    user,
    profile,
    hydrated,
    profileLoading,
    isAuthenticated: !!session,
    refreshProfile,
    signOut,
  };
}
