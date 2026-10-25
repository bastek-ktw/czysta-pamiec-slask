import { NextRequest, NextResponse } from "next/server";
import { getAllServicesAdmin, getSettings } from "@/lib/db";
import { updateServicePrice, updateSystemSettings } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [services, settings] = await Promise.all([
      getAllServicesAdmin(),
      getSettings()
    ]);
    return NextResponse.json({ ok: true, data: { services, settings } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

const UpdatePriceSchema = z.object({
  serviceId: z.string(),
  price: z.number().nonnegative()
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdatePriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Nieprawidłowa cena" }, { status: 400 });
    }

    await updateServicePrice(parsed.data.serviceId, parsed.data.price);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
