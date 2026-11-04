import { MethodologyView } from "@/views/MethodologyView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("en", "/methodology", "How it works", "The data pipeline, models and checks behind ImmoDash, explained.");
export default function Page() { return <MethodologyView lang="en" />; }
