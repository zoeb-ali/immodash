// Minimal static server for the exported site, used by the Playwright and Lighthouse checks (FE-3).
// It mirrors Vercel: /de serves out/de.html, and every response carries the headers from vercel.json.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("../out/", import.meta.url).pathname;
const PORT = Number(process.env.PORT || 4173);
const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4",
  ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml", ".ico": "image/x-icon" };

function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  for (const c of [clean, `${clean}.html`, join(clean, "index.html")]) {
    const p = join(ROOT, c);
    if (p.startsWith(ROOT) && existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

createServer((req, res) => {
  for (const rule of vercel.headers ?? []) {
    if (new RegExp(`^${rule.source.replace("(.*)", ".*")}$`).test(req.url)) for (const h of rule.headers) res.setHeader(h.key, h.value);
  }
  const file = resolve(req.url === "/" ? "/index.html" : req.url);
  if (!file) {
    res.statusCode = 404;
    res.setHeader("Content-Type", TYPES[".html"]);
    return res.end(existsSync(join(ROOT, "404.html")) ? readFileSync(join(ROOT, "404.html")) : "Not found");
  }
  const body = readFileSync(file);
  const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  res.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream");
  res.setHeader("Accept-Ranges", "bytes");
  if (range) {
    const start = Number(range[1]), end = range[2] ? Number(range[2]) : body.length - 1;
    res.statusCode = 206;
    res.setHeader("Content-Range", `bytes ${start}-${end}/${body.length}`);
    return res.end(body.subarray(start, end + 1));
  }
  res.end(body);
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
