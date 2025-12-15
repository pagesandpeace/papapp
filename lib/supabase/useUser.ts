"use client";

import { useEffect, useState } from "react";

export interface UserProfile {
  id: string | null;
  email?: string;
  name?: string;
  image?: string | null;
  loyaltyprogram?: boolean;
  loyaltypoints?: number;
  role?: string;
  auth_provider?: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        const json: { user: UserProfile | null } = await res.json();

        if (!mounted) return;

        setUser(json.user ?? null);
        setLoading(false);
      } catch (err) {
        console.error("❌ useUser failed:", err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}
