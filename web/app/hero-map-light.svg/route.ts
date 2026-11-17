import { heroSvg } from "@/lib/heroMap";

export const dynamic = "force-static";

export function GET() {
  return new Response(heroSvg("light"), { headers: { "Content-Type": "image/svg+xml" } });
}
