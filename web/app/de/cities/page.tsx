import { CitiesView } from "@/views/CitiesView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("de", "/cities", "Städte", "Mietprofile für 37 deutsche Städte: Angebotsmieten, Trends, Bezahlbarkeit und Prognosen.");
export default function Page() { return <CitiesView lang="de" />; }
