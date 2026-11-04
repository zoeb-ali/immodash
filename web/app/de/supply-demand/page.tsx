import { SupplyDemandView } from "@/views/SupplyDemandView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("de", "/supply-demand", "Angebot & Nachfrage", "Wo Bevölkerungswachstum auf fehlenden Leerstand trifft: die angespanntesten und entspanntesten Wohnungsmärkte in Deutschland.");
export default function Page() { return <SupplyDemandView lang="de" />; }
