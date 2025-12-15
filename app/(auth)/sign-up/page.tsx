"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("callbackURL") || "/cart";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    console.log("🔵 Starting signup", { email, name });

    // 1️⃣ Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?callbackURL=${encodeURIComponent(
          callbackURL
        )}`,
        data: {
          name, // save name in metadata too (optional)
        },
      },
    });

    console.log("🟢 Supabase signup response:", { data, error });

    if (error) {
      console.error("❌ AUTH SIGNUP ERROR:", error);
      alert(error.message);
      setLoading(false);
      return;
    }

    // 2️⃣ Wait for Supabase session (fixes race condition)
    await new Promise((r) => setTimeout(r, 200));
    const { data: sess } = await supabase.auth.getSession();
    console.log("🟣 Session now:", sess);

    // 3️⃣ Insert profile into public.users ONLY if session exists
    if (data.user && sess.session) {
      console.log("📌 Inserting profile row:", {
        id: data.user.id,
        email,
        name,
        role: "customer",
        auth_provider: "credentials",
      });

      const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        email,
        name,
        image: null,
        role: "customer",
        auth_provider: "credentials",
      });

      if (insertError) {
        console.error("❌ PROFILE INSERT ERROR:", insertError);
        alert("Profile insert failed: " + insertError.message);
        setLoading(false);
        return;
      }

      console.log("✅ Profile insert succeeded!");
    } else {
      console.warn("⚠️ No session yet — skipping profile insert");
    }

    alert("Check your email inbox to confirm your account!");
    setLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?callbackURL=${encodeURIComponent(
          callbackURL
        )}`,
      },
    });

    if (error) alert(error.message);
    setGoogleLoading(false);
  }

  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-semibold text-[#111]">Create your account</h1>

      {/* GOOGLE BUTTON */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="
          w-full flex items-center justify-center gap-3
          py-3 bg-white rounded-lg
          border border-[#D6C28B]
          hover:bg-[#f1ede4]
          transition
        "
      >
        <Image src="/google_logo.svg" width={20} height={20} alt="Google" />
        <span>{googleLoading ? "Connecting…" : "Sign up with Google"}</span>
      </button>

      {/* DIVIDER */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#e4ddd5]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#FAF6F1] text-[#6b665d]">
            or continue with email
          </span>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSignUp} className="space-y-4">
        <input
          type="text"
          placeholder="Full name"
          required
          className="border border-[#ccc4bc] p-3 w-full rounded-lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email address"
          required
          className="border border-[#ccc4bc] p-3 w-full rounded-lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          required
          className="border border-[#ccc4bc] p-3 w-full rounded-lg"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
