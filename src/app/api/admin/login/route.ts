import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/db";
import { z } from "zod";

const LoginSchema = z.object({
  pin: z.string().min(1, "Wymagany PIN")
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Nieprawidłowy PIN" }, { status: 400 });
    }

    const settings = await getSettings();
    const validPin = process.env.ADMIN_PIN || settings.adminPin || "1920";

    if (parsed.data.pin.trim() !== validPin.trim()) {
      return NextResponse.json({ ok: false, error: "Nieprawidłowy PIN dostępowy" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, data: { message: "Zalogowano pomyślnie" } });
    response.cookies.set("admin_session", "authenticated", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 dni
      path: "/"
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
