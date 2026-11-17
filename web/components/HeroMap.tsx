import { HeroMapHover } from "./HeroMapHover";
import { T } from "./T";
import { HeroMapLink } from "./HeroMapLink";

/** Hero visual: every district coloured by estimated asking rent (real data, not decoration).
 *  The map itself is a static SVG file per theme (FE-2); the tooltip layer loads on first hover. */
export function HeroMap({ lo, hi, rents, names, lang = "en" }: {
  lo: number; hi: number; rents: Record<string, number>; names: Record<string, string>; lang?: "en" | "de";
}) {
  const alt = lang === "de" ? "Karte der 400 Kreise Deutschlands nach geschätzter Angebotsmiete" : "Map of Germany's 400 districts coloured by estimated asking rent";
  return (
    <div className="hero-visual">
      <HeroMapHover rents={rents} names={names} alt={alt} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <div className="legend">
          <span>{lo.toFixed(0)} €</span>
          <span className="bar" style={{ width: 120, background: "linear-gradient(90deg, var(--q1), var(--q2), var(--q3), var(--q4), var(--q5))" }} />
          <span>{hi.toFixed(0)} € <T en="per m²" de="pro m²" /></span>
        </div>
        <HeroMapLink />
      </div>
    </div>
  );
}
