import { NextRequest, NextResponse } from "next/server";
import { CreateOrderSchema, createOrderAtomic } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json(
        { ok: false, error: errorMsg },
        { status: 400 }
      );
    }

    const order = await createOrderAtomic(parsed.data);

    return NextResponse.json(
      {
        ok: true,
        data: order
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/orders error:", err);

    const isSlotFull = err.message && (
      err.message.includes("zarezerwowany") ||
      err.message.includes("zajęty") ||
      err.message.includes("max 2/h")
    );

    return NextResponse.json(
      {
        ok: false,
        error: err.message || "Błąd zapisu zamówienia"
      },
      { status: isSlotFull ? 409 : 500 }
    );
  }
}
