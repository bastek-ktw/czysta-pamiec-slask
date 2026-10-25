import { NextRequest, NextResponse } from "next/server";
import { updateSlotCapacity, toggleSlotBlock } from "@/lib/admin";
import { getTimeSlots } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || "2026-10-31";
    const slots = await getTimeSlots(date);
    return NextResponse.json({ ok: true, data: slots });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

const SlotActionSchema = z.object({
  slotId: z.string(),
  action: z.enum(["increase_capacity", "decrease_capacity", "toggle_block"]),
  delta: z.number().optional().default(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SlotActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Nieprawidłowe żądanie" }, { status: 400 });
    }

    if (parsed.data.action === "increase_capacity") {
      await updateSlotCapacity(parsed.data.slotId, 1);
    } else if (parsed.data.action === "decrease_capacity") {
      await updateSlotCapacity(parsed.data.slotId, -1);
    } else if (parsed.data.action === "toggle_block") {
      await toggleSlotBlock(parsed.data.slotId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
