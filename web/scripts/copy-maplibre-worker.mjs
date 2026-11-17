// MapLibre GL 6 loads its web worker from a file next to the library. Bundlers do not copy that file, so we
// serve it ourselves from /vendor and point the library at it (see components/RentMap.tsx, setWorkerUrl).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json"));
const out = join(process.cwd(), "public", "vendor");
mkdirSync(out, { recursive: true });
copyFileSync(join(dist, "dist", "maplibre-gl-worker.mjs"), join(out, "maplibre-gl-worker.mjs"));
console.log("copied maplibre-gl-worker.mjs to public/vendor/");
