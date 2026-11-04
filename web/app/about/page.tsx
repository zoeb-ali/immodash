import { AboutView } from "@/views/AboutView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("en", "/about", "About", "Why ImmoDash exists: from growing up in Mumbai to looking for a flat in Germany, and turning rent into numbers anyone can check.");
export default function Page() { return <AboutView lang="en" />; }
