import { AffordabilityView } from "@/views/AffordabilityView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("en", "/affordability", "Can I afford it?", "Find the German districts where your rent budget works, and see where rent takes the biggest share of local income.");
export default function Page() { return <AffordabilityView lang="en" />; }
