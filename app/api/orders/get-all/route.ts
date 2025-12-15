import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();

  // Get logged-in Supabase user
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return NextResponse.json({ orders: [] }, { status: 401 });
  }

  // Single SQL query to fetch user orders + item counts
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      total,
      status,
      created_at,
      stripe_receipt_url,
      order_items:order_items (
        quantity,
        price
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error loading orders:", error);
    return NextResponse.json({ orders: [] }, { status: 500 });
  }

  // Format into a clean view model
  const orders = (data || []).map((order: any) => {
    const items = order.order_items || [];

    return {
      id: order.id,
      total: Number(order.total),
      status: order.status,
      created_at: order.created_at,
      receipt_url: order.stripe_receipt_url,
      itemCount: items.length,
    };
  });

  return NextResponse.json({ orders });
}
