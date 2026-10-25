import { NextRequest, NextResponse } from "next/server";
import { getAllOrders, updateOrderStatus } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orders = await getAllOrders();
    return NextResponse.json({ ok: true, data: orders });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

const UpdateStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(["pending_blik", "paid", "assigned", "in_progress", "completed", "cancelled"])
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Nieprawidłowe dane" }, { status: 400 });
    }

    await updateOrderStatus(parsed.data.orderId, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
