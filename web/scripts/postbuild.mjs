// Post-processing of the static export (runs after `next build`, see package.json):
//  1. FE-1: German pages get <html lang="de"> in the delivered HTML, not only after a script runs. Next.js has one
//     root layout for both languages, so the attribute is rewritten here for everything under /de.
//  2. SEC-1: every page gets a Content-Security-Policy <meta> that allows exactly the inline scripts on that page
//     (by SHA-256), so injected script cannot run. The HTTP headers in vercel.json add the rest (frame-ancestors,
//     nosniff, ...), which a <meta> cannot set.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname;
const TILE_HOST = "https://tiles.openfreemap.org";

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith(".html")) yield p;
  }
}

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let pages = 0, german = 0, hashes = 0;
for (const file of htmlFiles(OUT)) {
  let html = readFileSync(file, "utf8");
  const rel = relative(OUT, file).split(sep).join("/");
  if (rel === "de.html" || rel.startsWith("de/")) {
    html = html.replace(/<html lang="en"/, '<html lang="de"');
    german++;
  }
  const sums = new Set();
  for (const m of html.matchAll(INLINE_SCRIPT)) {
    if (m[1].length === 0) continue;
    sums.add(`'sha256-${createHash("sha256").update(m[1], "utf8").digest("base64")}'`);
  }
  hashes += sums.size;
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${[...sums].join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${TILE_HOST}`,
    "font-src 'self' data:",
    `connect-src 'self' ${TILE_HOST}`,
    "worker-src 'self' blob:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  html = html.replace(/<head>/, `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`);
  writeFileSync(file, html);
  pages++;
}
console.log(`postbuild: ${pages} pages, ${german} set to lang="de", ${hashes} inline scripts pinned by hash`);
