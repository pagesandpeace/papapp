"use client";

import BookNowButton from "./BookNowButton";

export default function BookNowButtonWrapper({
  eventId,
  slug,
}: {
  eventId: string;
  slug: string;
}) {
  return <BookNowButton eventId={eventId} slug={slug} />;
}
