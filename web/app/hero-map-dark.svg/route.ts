import { heroSvg } from "@/lib/heroMap";

export const dynamic = "force-static";

export function GET() {
  return new Response(heroSvg("dark"), { headers: { "Content-Type": "image/svg+xml" } });
}
