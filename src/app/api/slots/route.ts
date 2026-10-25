import { NextRequest, NextResponse } from "next/server";
import { getTimeSlots } from "@/lib/db";
import { z } from "zod";

const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Wymagany format daty: RRRR-MM-DD")
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const parsed = QuerySchema.safeParse({ date: dateParam });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Nieprawidłowy parametr date" },
        { status: 400 }
      );
    }

    const slots = await getTimeSlots(parsed.data.date);

    return NextResponse.json({
      ok: true,
      data: slots
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (err: any) {
    console.error("GET /api/slots error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Błąd pobierania slotów" },
      { status: 500 }
    );
  }
}
