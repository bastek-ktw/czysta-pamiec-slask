import { getServices, getSettings } from "@/lib/db";
import { ExpressBookingFlow } from "@/components/ExpressBookingFlow";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [services, settings] = await Promise.all([
    getServices(),
    getSettings()
  ]);

  return <ExpressBookingFlow initialServices={services} settings={settings} />;
}
