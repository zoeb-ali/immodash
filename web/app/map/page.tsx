import { MapView } from "@/views/MapView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("en", "/map", "Map", "Rents, affordability and market tightness for all 400 German districts on one map.");
export default function Page() { return <MapView lang="en" />; }
