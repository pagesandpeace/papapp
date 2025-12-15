import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ------------------------------------------------------
// Stripe client
// ------------------------------------------------------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});

// ------------------------------------------------------
// Supabase (Service Role)
// ------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ------------------------------------------------------
// Read raw body for Stripe signature verification
// ------------------------------------------------------
async function readRawBody(stream: ReadableStream | null): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // ------------------------------------------------------
  // Verify Stripe event
  // ------------------------------------------------------
  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req.body as ReadableStream);
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: unknown) {
  const message =
    err instanceof Error ? err.message : "Unknown Stripe webhook error";

  return NextResponse.json(
    { error: `Invalid signature: ${message}` },
    { status: 400 }
  );
}


  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const amount = (session.amount_total ?? 0) / 100;

  // ------------------------------------------------------
  // STRIPE PAYMENT DETAILS
  // ------------------------------------------------------
  let receipt_url = null;
  let card_brand = null;
  let last4 = null;
  let paid_at = null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  if (paymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    const charge = pi.latest_charge as Stripe.Charge;
    receipt_url = charge?.receipt_url ?? null;
    card_brand = charge?.payment_method_details?.card?.brand ?? null;
    last4 = charge?.payment_method_details?.card?.last4 ?? null;
    paid_at = charge?.created
      ? new Date(charge.created * 1000).toISOString()
      : null;
  }

  // ------------------------------------------------------
  // IDEMPOTENCY CHECK
  // ------------------------------------------------------
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  // ------------------------------------------------------
  // PROCESS PRODUCT ORDER
  // ------------------------------------------------------
  if (metadata.kind === "product") {
    const rawItems = metadata.items;
    const userId = metadata.userId;

    if (!rawItems || !userId) {
      console.error("❌ Missing product metadata");
      return NextResponse.json({ received: true });
    }

    // Parse metadata string
    const items = rawItems.split(",").map((entry) => {
      const [productId, name, qtyStr, priceStr] = entry.split("|");
      return {
        product_id: productId,
        name,
        quantity: Number(qtyStr),
        price_pence: Number(priceStr),
      };
    });

    // 1. Insert order
    const { data: order } = await supabase
      .from("orders")
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        total: amount,
        status: "completed",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_receipt_url: receipt_url,
        stripe_card_brand: card_brand,
        stripe_last4: last4,
        paid_at,
      })
      .select()
      .single();

    // 2. Insert order_items & update stock
    for (const item of items) {
      await supabase.from("order_items").insert({
        id: crypto.randomUUID(),
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price_pence / 100,
      });

      const { data: prod } = await supabase
        .from("products")
        .select("inventory_count")
        .eq("id", item.product_id)
        .single();

      if (prod) {
        await supabase
          .from("products")
          .update({
            inventory_count: Math.max(
              0,
              Number(prod.inventory_count) - item.quantity
            ),
          })
          .eq("id", item.product_id);
      }
    }

    return NextResponse.json({ received: true });
  }

  // ------------------------------------------------------
  // PROCESS EVENT BOOKING
  // ------------------------------------------------------
  if (metadata.kind === "event") {
    const { userId, eventId } = metadata;

    if (!userId || !eventId) {
      console.error("❌ Missing metadata for event");
      return NextResponse.json({ received: true });
    }

    // Insert event booking
    await supabase.from("event_bookings").insert({
      id: crypto.randomUUID(),
      event_id: eventId,
      user_id: userId,
      paid: true,
      cancelled: false,
      email:
        session.customer_details?.email ?? session.customer_email ?? null,
      name: session.customer_details?.name ?? null,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    });

    // Insert order entry
    await supabase.from("orders").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      total: amount,
      status: "completed",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_receipt_url: receipt_url,
      stripe_card_brand: card_brand,
      stripe_last4: last4,
      paid_at,
    });

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
