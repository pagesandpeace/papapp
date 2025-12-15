"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

export default function StartEventCheckout({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");

    startTransition(async () => {

      // 1. Check login status
      const meRes = await fetch("/api/me", { cache: "no-store" });
      const me = await meRes.json();

      if (!me?.id) {
        router.push(`/sign-in?callbackURL=/dashboard/events/${eventId}`);
        return;
      }

      // 2. Start checkout
      const res = await fetch("/api/events/start-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId }),
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setError("Unable to start checkout. Please try again.");
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition w-full"
      >
        {isPending ? "Starting Checkout..." : "Book Now"}
      </button>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
