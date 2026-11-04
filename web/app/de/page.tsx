import { StoryView } from "@/views/StoryView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("de", "/", { absolute: "ImmoDash · Was Wohnen zur Miete in Deutschland wirklich kostet" },
  "Ein interaktiver Leitfaden zu Mieten in Deutschland: wie schnell die Angebotsmieten in 37 Städten steigen, was eine Wohnung im Verhältnis zum örtlichen Einkommen kostet, wo der Markt am engsten ist, und ein Ausblick auf 12 Monate. Jede Woche neu aus offenen Daten erstellt.");

export default function Page() {
  return <StoryView lang="de" />;
}
