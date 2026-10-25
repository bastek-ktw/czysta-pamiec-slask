import { getServices, getSettings } from "@/lib/db";
import { BookingWizard } from "@/components/BookingWizard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [services, settings] = await Promise.all([
    getServices(),
    getSettings()
  ]);

  return <BookingWizard initialServices={services} settings={settings} />;
}
