import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session as SupabaseSession, User } from "@supabase/supabase-js";
import type { UserRole } from "./types";

export type ResearchContext = {
  topic?: string;
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

export function useAuth() {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

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
