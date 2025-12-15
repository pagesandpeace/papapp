// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type GoogleMetadata = {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const callbackURL = url.searchParams.get("callbackURL") || "/dashboard";

  if (!code) return NextResponse.redirect(new URL("/", url));

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          for (const cookie of cookies) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    }
  );

  // Exchange OAuth code → session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("OAuth session exchange failed:", exchangeError);
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  await new Promise((r) => setTimeout(r, 120));

  // Load session user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/sign-in", url));

  // Extract Google metadata
  const meta = (user.user_metadata as GoogleMetadata) || {};

  const googleName =
    meta.full_name ||
    meta.name ||
    user.email ||
    "";

  const googleAvatar =
    meta.avatar_url ||
    meta.picture ||
    null;

  // Check public.users row
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let role = existing?.role ?? "customer";

  if (!existing) {
    const { error: insertErr } = await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      name: googleName,
      image: googleAvatar,
      role: "customer",
      auth_provider: "google",
    });

    if (insertErr) console.error("Profile insert error:", insertErr);
  } else {
    // User exists — update auth_provider if needed
    const newProvider =
      existing.auth_provider === "credentials" ? "both" : existing.auth_provider;

    if (newProvider !== existing.auth_provider) {
      await supabase
        .from("users")
        .update({ auth_provider: newProvider })
        .eq("id", user.id);
    }

    role = existing.role;
  }

  // Admin route
  if (role === "admin") {
    return NextResponse.redirect(new URL("/admin", url));
  }

  return NextResponse.redirect(new URL(callbackURL, url));
}
