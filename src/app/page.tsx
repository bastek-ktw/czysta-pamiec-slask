import { getServices, getSettings } from "@/lib/db";
import { LuxuryMemorialExperience } from "@/components/LuxuryMemorialExperience";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [services, settings] = await Promise.all([
    getServices(),
    getSettings()
  ]);

  return <LuxuryMemorialExperience initialServices={services} settings={settings} />;
}
