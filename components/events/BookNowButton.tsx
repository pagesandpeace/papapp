"use client";

import { useEffect, useState } from "react";
import AuthPromptModal from "@/components/ui/AuthPromptModal";

export default function BookNowButton({
  eventId,
  slug,
}: {
  eventId: string;
  slug: string;
}) {
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // -----------------------------
  // CHECK LOGIN STATUS
  // -----------------------------
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
const res = await fetch("/api/me", {
  cache: "no-store",
  credentials: "include",
});
        const me = await res.json();
        if (!active) return;
        setLoggedIn(Boolean(me?.id));
      } catch {
        setLoggedIn(false);
      }
    }

    checkSession();
    window.addEventListener("pp:auth-updated", checkSession);
    return () => {
      active = false;
      window.removeEventListener("pp:auth-updated", checkSession);
    };
  }, []);

  // -----------------------------
  // CLICK HANDLER
  // -----------------------------
  const handleBookNow = async () => {
    setLoading(true);

const res = await fetch("/api/me", {
  cache: "no-store",
  credentials: "include",
});
    const me = await res.json();

    if (!me?.id) {
      setShowAuthPrompt(true);
      setLoading(false);
      return;
    }

    const checkoutRes = await fetch("/api/events/start-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ eventId, slug }),   // ⭐ SEND SLUG TOO
    });

    if (!checkoutRes.ok) {
      alert("Something went wrong starting checkout.");
      setLoading(false);
      return;
    }

    const data = await checkoutRes.json();
    window.location.href = data.url;
  };

  return (
    <>
      <button
        onClick={handleBookNow}
        disabled={loading}
        className="bg-[var(--accent)] text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
      >
        {loading
          ? "Loading…"
          : loggedIn
          ? "Proceed to Checkout"
          : "Book Now"}
      </button>

      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        callbackURL={`/events/${slug}`}     // ⭐ after login return to slug page
      />
    </>
  );
}
