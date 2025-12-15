export const dynamic = "force-dynamic";
export const revalidate = 0;

import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import BookNowButton from "@/components/events/BookNowButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Event {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  short_description: string | null;
  description: string | null;
  date: string;
  capacity: number;
  price_pence: number;
  image_url: string | null;
}

interface Params {
  slug: string;
}

interface CategoryLink {
  category_id: string;
}

interface EventCategory {
  id: string;
  name: string;
}

interface Booking {
  cancelled: boolean | null;
}

export default async function EventDetailPage(props: { params: Promise<Params> }) {
  // ⭐ Correct required syntax for Next.js 15
  const { slug } = await props.params;

  const supabase = await supabaseServer();

  /* ------------------------------------------
     1. Fetch event by slug
  ------------------------------------------- */
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single<Event>();

  if (!event || eventErr) {
    console.error("❌ Event not found:", eventErr);
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Event Not Found
          </h1>
          <Link href="/events" className="text-accent underline">
            ← Back to Events
          </Link>
        </div>
      </main>
    );
  }

  const eventId = event.id;

  /* ------------------------------------------
     2. Fetch categories
  ------------------------------------------- */
  const { data: categoryLinksRaw } = await supabase
    .from("event_category_links")
    .select("category_id")
    .eq("event_id", eventId);

  const categoryLinks: CategoryLink[] = categoryLinksRaw ?? [];
  const categoryIds = categoryLinks.map((c) => c.category_id);

  let categories: EventCategory[] = [];
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from("event_categories")
      .select("*")
      .in("id", categoryIds);

    categories = cats ?? [];
  }

  /* ------------------------------------------
     3. Fetch bookings
  ------------------------------------------- */
  const { data: bookingsRaw } = await supabase
    .from("event_bookings")
    .select("cancelled")
    .eq("event_id", eventId);

  const bookings: Booking[] = bookingsRaw ?? [];
  const activeBookings = bookings.filter((b) => !b.cancelled).length;

  const remainingSeats = event.capacity - activeBookings;
  const soldOut = remainingSeats <= 0;

  /* ------------------------------------------
     4. Format date
  ------------------------------------------- */
  const formattedDate = new Date(event.date).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ------------------------------------------
     5. Render
  ------------------------------------------- */
  return (
    <main className="bg-background min-h-screen pb-20 font-[Montserrat]">
      {/* HERO */}
      <div className="relative w-full h-[55vh] min-h-80">
        <Image
          src={event.image_url || "/coming_soon.svg"}
          alt={event.title}
          fill
          className="object-cover object-center"
          priority
        />

        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

        <h1 className="absolute bottom-8 left-8 text-white text-4xl font-extrabold drop-shadow-xl tracking-tight">
          {event.title}
        </h1>
      </div>

      {/* CONTENT */}
      <div className="max-w-3xl mx-auto px-6 mt-12 space-y-10">
        {event.subtitle && (
          <p className="text-xl text-foreground/80 italic text-center">
            {event.subtitle}
          </p>
        )}

        {event.short_description && (
          <p className="text-center text-foreground/80 text-lg leading-relaxed max-w-2xl mx-auto">
            {event.short_description}
          </p>
        )}

        {/* CATEGORIES */}
        {categories.length > 0 && (
          <section className="bg-white border border-accent/10 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Categories
            </h2>

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge key={c.id} color="yellow">
                  {c.name}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* DETAILS */}
        <section className="space-y-6 text-foreground/90 text-lg">
          <div className="border-b border-muted pb-4">
            <strong className="text-foreground block mb-1">Date & Time</strong>
            {formattedDate}
          </div>

          <div className="border-b border-muted pb-4">
            <strong className="text-foreground block mb-1">Price</strong>
            £{(event.price_pence / 100).toFixed(2)}
          </div>

          <div className="border-b border-muted pb-4">
            <strong className="text-foreground block mb-1">Availability</strong>

            {soldOut ? (
              <span className="text-red-600 font-semibold">Sold Out</span>
            ) : remainingSeats <= 5 ? (
              <span className="text-amber-600 font-semibold">
                Limited seats available
              </span>
            ) : (
              <span className="text-green-700 font-semibold">Seats available</span>
            )}
          </div>

          {event.description && (
            <div className="pt-2">
              <strong className="text-foreground block mb-2">About This Event</strong>
              <p className="leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="bg-white border border-accent/10 rounded-2xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">
            Book Your Place
          </h2>

          <p className="text-foreground/70 mb-6">Reserve your seat now.</p>

          {soldOut ? (
            <Button variant="neutral" size="lg" disabled className="w-full opacity-60">
              Sold Out
            </Button>
          ) : (
            // ⭐ FIX: Pass slug too
            <BookNowButton eventId={event.id} slug={event.slug} />
          )}

          <Link
            href="/dashboard/legal/event-booking-terms"
            className="mt-4 block text-accent underline text-sm hover:opacity-80"
          >
            Booking Terms & Conditions
          </Link>
        </section>
      </div>
    </main>
  );
}
