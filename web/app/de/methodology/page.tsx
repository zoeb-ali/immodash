import { MethodologyView } from "@/views/MethodologyView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("de", "/methodology", "So funktioniert's", "Die Datenpipeline, Modelle und Prüfungen hinter ImmoDash, erklärt.");
export default function Page() { return <MethodologyView lang="de" />; }
