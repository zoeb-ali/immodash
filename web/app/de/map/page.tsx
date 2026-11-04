import { MapView } from "@/views/MapView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("de", "/map", "Karte", "Mieten, Bezahlbarkeit und Marktenge für alle 400 deutschen Kreise auf einer Karte.");
export default function Page() { return <MapView lang="de" />; }
