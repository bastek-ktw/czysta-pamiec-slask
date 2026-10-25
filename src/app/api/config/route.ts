import { NextResponse } from "next/server";
import { getServices, getSettings } from "@/lib/db";
import cemeteries from "@/data/cemeteries.json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [services, settings] = await Promise.all([
      getServices(),
      getSettings()
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        services,
        settings: {
          blikPhone: settings.blikPhone,
          blikRecipient: settings.blikRecipient,
          promoCode: settings.promoCode,
          promoDiscountPercent: settings.promoDiscountPercent,
          multiGraveDiscountPercent: settings.multiGraveDiscountPercent,
          bannerText: settings.bannerText,
          stripeEnabled: settings.stripeEnabled
        },
        cemeteries
      }
    });
  } catch (err: any) {
    console.error("GET /api/config error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Błąd pobierania konfiguracji" },
      { status: 500 }
    );
  }
}
