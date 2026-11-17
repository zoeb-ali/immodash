// OPS-5: the public address comes from one place. Set NEXT_PUBLIC_SITE_URL (Vercel project settings) when the
// site moves to a custom domain; everything else (canonical links, sitemap, robots, Open Graph) follows.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://immodash-virid.vercel.app").replace(/\/$/, "");
