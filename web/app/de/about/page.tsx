import { AboutView } from "@/views/AboutView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("de", "/about", "Über", "Warum es ImmoDash gibt: von der Kindheit in Mumbai über die Wohnungssuche in Deutschland bis zu Mietzahlen, die jeder prüfen kann.");
export default function Page() { return <AboutView lang="de" />; }
