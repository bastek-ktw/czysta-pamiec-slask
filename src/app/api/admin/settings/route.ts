import { NextRequest, NextResponse } from "next/server";
import { updateSystemSettings } from "@/lib/admin";
import { getSettings } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSettingsSchema = z.object({
  blikPhone: z.string().optional(),
  blikRecipient: z.string().optional(),
  bannerText: z.string().optional(),
  adminPin: z.string().optional(),
  promoCode: z.string().optional(),
  promoDiscountPercent: z.number().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Nieprawidłowe dane" }, { status: 400 });
    }

    await updateSystemSettings(parsed.data);
    const updated = await getSettings();
    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
