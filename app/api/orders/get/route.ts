import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  total: string | number;
  status: string;
  created_at: string;
  stripe_receipt_url?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_card_brand?: string | null;
  stripe_last4?: string | null;
  paid_at?: string | null;
};

type ItemRow = {
  quantity: number;
  price: string | number;
  products: { name: string | null } | { name: string | null }[] | null;
};

export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer();

    const orderId = new URL(req.url).searchParams.get("id");
    if (!orderId) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    // Load order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single<OrderRow>();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Load items + product join
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select(
        `
        quantity,
        price,
        products(name)
      `
      )
      .eq("order_id", orderId)
      .returns<ItemRow[]>();

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const safeItems = items.map((it) => {
      const product =
        Array.isArray(it.products) ? it.products[0] : it.products;

      return {
        productName: product?.name ?? "Unknown Product",
        quantity: it.quantity,
        price: Number(it.price),
      };
    });

    return NextResponse.json({
      order: {
        ...order,
        total: Number(order.total),
        items: safeItems,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
