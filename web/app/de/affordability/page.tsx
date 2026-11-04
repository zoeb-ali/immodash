import { AffordabilityView } from "@/views/AffordabilityView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("de", "/affordability", "Kann ich mir das leisten?", "Finden Sie die deutschen Kreise, in denen Ihr Mietbudget reicht, und sehen Sie, wo die Miete den größten Teil des örtlichen Einkommens nimmt.");
export default function Page() { return <AffordabilityView lang="de" />; }
