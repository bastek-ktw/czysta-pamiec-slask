import { NextResponse } from "next/server";
import { ensureDbInitialized, getServices, getSettings, getTimeSlots } from "@/lib/db";
import cemeteries from "@/data/cemeteries.json";

export async function GET() {
  try {
    await ensureDbInitialized();
    const settings = await getSettings();
    const services = await getServices();
    const sampleSlots = await getTimeSlots("2026-10-31");

    return NextResponse.json({
      ok: true,
      data: {
        status: "healthy",
        system: "Czysta Pamięć Górny Śląsk",
        timestamp: new Date().toISOString(),
        settings,
        cemeteriesCount: cemeteries.length,
        servicesCount: services.length,
        slotsCount31Oct: sampleSlots.length,
        samplePackage: services.find(s => s.id === "pkg-vip"),
        specialEditionCandle: services.find(s => s.id === "cd-rucho-special")
      }
    });
  } catch (err: any) {
    console.error("Health check error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message || "Failed health check"
    }, { status: 500 });
  }
}
