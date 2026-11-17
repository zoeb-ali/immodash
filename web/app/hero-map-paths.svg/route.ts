import { heroSvg } from "@/lib/heroMap";

export const dynamic = "force-static";

/** Same paths without theme colours: inlined on demand so the page's own CSS variables colour it. */
export function GET() {
  return new Response(heroSvg("light", false), { headers: { "Content-Type": "image/svg+xml" } });
}
