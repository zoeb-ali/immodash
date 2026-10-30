# 0008 – Street map for the city rent grids

**Status:** accepted · 2026-10

## Context
The 100 m rent grid on city pages was a canvas scaled to the container width. On wide screens it was taller than
the screen, needed scrolling, and had no streets, so readers could not tell where they were.

## Options considered
- **Keep the canvas, cap its height**: no streets, still hard to read.
- **Leaflet with raster tiles**: familiar, but raster tiles blur on zoom and need a tile provider with limits.
- **MapLibre GL with vector tiles from OpenFreeMap**: free, no API key, sharp at every zoom, light and dark styles,
  street names drawn above the rent colours. Chosen.

## Decision
- `web/components/RentMap.tsx`: MapLibre GL (BSD-3), styles `positron` (light) and `dark` from
  tiles.openfreemap.org; fixed height `clamp(360px, 62svh, 640px)`; cooperative gestures so the page still scrolls.
- Grid cells stay in EPSG:3035 in the data; `web/lib/laea.ts` converts them to WGS84 in the browser (EPSG formulas,
  checked against pyproj to about 1 cm), so no proj4 dependency and no change to the published files.
- If the basemap cannot load, the grid is drawn on a plain background. The map loads only when scrolled near.

## Consequences
City pages depend on a free third-party tile service for the streets (not for the data). Attribution
(OpenFreeMap, OpenMapTiles, OpenStreetMap) is shown on the map and in the figure source. MapLibre adds about
230 KB gzipped, loaded on city pages only.
