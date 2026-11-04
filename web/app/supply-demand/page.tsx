import { SupplyDemandView } from "@/views/SupplyDemandView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("en", "/supply-demand", "Supply & demand", "Where population growth meets a lack of empty flats: the tightest and slackest housing markets in Germany.");
export default function Page() { return <SupplyDemandView lang="en" />; }
