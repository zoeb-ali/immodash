// Plain-language definitions shown when a reader hovers or taps a dotted term.
export const GLOSSARY = {
  "asking-rent": {
    term: "Asking rent",
    def: "The cold rent landlords ask for in new listings, per square metre. It is what you would pay if you signed a lease today, not what existing tenants pay.",
    de: { term: "Angebotsmiete", def: "Die Kaltmiete, die Vermieter in neuen Inseraten verlangen, pro Quadratmeter. Das zahlen Sie, wenn Sie heute einen Vertrag unterschreiben, nicht das, was Bestandsmieter zahlen." },
  },
  "cold-rent": {
    term: "Cold rent (Kaltmiete)",
    def: "Rent without heating, water and other running costs (Nebenkosten). Those usually add roughly 2 to 3 € per m² on top.",
    src: "dmb2025",
    de: { term: "Kaltmiete", def: "Miete ohne Heizung, Wasser und andere Nebenkosten. Die kommen meist mit etwa 2 bis 3 € pro m² obendrauf." },
  },
  "contract-rent": {
    term: "Existing contract rent",
    def: "The average rent people actually paid on their current leases in May 2022, counted in the national census (Zensus 2022). Older leases are often much cheaper than new ones.",
    src: "bbsr-rents",
    de: { term: "Bestandsmiete", def: "Die durchschnittliche Miete, die Haushalte im Mai 2022 tatsächlich in ihren laufenden Verträgen zahlten, erfasst im Zensus 2022. Ältere Verträge sind oft deutlich günstiger als neue." },
  },
  kreis: {
    term: "Kreis",
    def: "A German district. There are 400: 294 rural districts (Landkreise) and 106 cities that form their own district (kreisfreie Städte), such as Berlin, Munich or Bielefeld.",
    de: { term: "Kreis", def: "Ein deutscher Kreis. Es gibt 400: 294 Landkreise und 106 kreisfreie Städte wie Berlin, München oder Bielefeld." },
  },
  vacancy: {
    term: "Market-active vacancy",
    def: "The share of flats in apartment buildings that stood empty and could be rented, from the 2022 census. Housing research usually puts the vacancy a market needs for normal moving at 2 to 3%.",
    src: "saxony2022",
    de: { term: "Marktaktiver Leerstand", def: "Der Anteil der Wohnungen in Mehrfamilienhäusern, die leer standen und vermietet werden konnten, laut Zensus 2022. Die Wohnungsforschung setzt den für normale Umzüge nötigen Leerstand meist bei 2 bis 3 % an." },
  },
  "rent-burden": {
    term: "Rent burden (asking rent)",
    def: "Today's asking rent for a 60 m² flat as a share of the disposable (after-tax) income of two average residents. Two caveats: income is from the latest available year (2023), and per-resident income averages over everyone, children and pensioners included. Lower is more affordable.",
    de: { term: "Mietbelastung (Angebotsmiete)", def: "Heutige Angebotsmiete für eine 60-m²-Wohnung als Anteil am verfügbaren Einkommen (nach Steuern) von zwei durchschnittlichen Einwohnern. Zwei Einschränkungen: Das Einkommen stammt aus dem letzten verfügbaren Jahr (2023), und das Pro-Kopf-Einkommen mittelt über alle, auch Kinder und Rentner. Niedriger heißt bezahlbarer." },
  },
  "rent-burden-census": {
    term: "Rent burden (2022 census rents)",
    def: "The average rent existing tenants paid in May 2022 for 60 m², as a share of two average residents' disposable income. It compares districts on the same footing, but sits below the burden at today's asking rents.",
    de: { term: "Mietbelastung (Zensusmieten 2022)", def: "Die Durchschnittsmiete, die Bestandsmieter im Mai 2022 für 60 m² zahlten, als Anteil am verfügbaren Einkommen zweier durchschnittlicher Einwohner. Sie vergleicht Kreise auf gleicher Grundlage, liegt aber unter der Belastung zu heutigen Angebotsmieten." },
  },
  affordability: {
    term: "Affordability index",
    def: "100 means the typical German Kreis. 150 means rent takes a third less of local income than typical; 50 means it takes twice as much.",
    de: { term: "Erschwinglichkeitsindex", def: "100 entspricht dem typischen deutschen Kreis. 150 heißt, die Miete nimmt ein Drittel weniger vom örtlichen Einkommen als typisch; 50 heißt, sie nimmt doppelt so viel." },
  },
  "days-on-market": {
    term: "Days on market",
    def: "How long a rental listing stays online before it disappears, averaged over the last four quarters. Fewer days means more competition for each flat.",
    de: { term: "Vermarktungsdauer", def: "Wie lange ein Mietinserat online bleibt, bevor es verschwindet, gemittelt über die letzten vier Quartale. Weniger Tage bedeuten mehr Konkurrenz um jede Wohnung." },
  },
  "supply-demand": {
    term: "Supply-demand index",
    def: "Compares population growth (demand) with empty flats (supply). Above +1 the market is tight: people are moving in and almost nothing is free. Below −1 it is slack.",
    src: "bgb556d",
    de: { term: "Angebot-Nachfrage-Index", def: "Vergleicht Bevölkerungswachstum (Nachfrage) mit leeren Wohnungen (Angebot). Über +1 ist der Markt angespannt: Menschen ziehen zu und fast nichts ist frei. Unter −1 ist er entspannt." },
  },
  forecast: {
    term: "Forecast range",
    def: "The model gives a most likely value and an 80% range for a named target month: in back-tests over 2015 to 2026, about 8 out of 10 real outcomes fell inside a range like this one. Few of those years saw falling rents, so the model rarely predicts a fall.",
    de: { term: "Prognosespanne", def: "Das Modell liefert für einen genannten Zielmonat einen wahrscheinlichsten Wert und eine 80-%-Spanne: Im Backtest 2015 bis 2026 lagen etwa 8 von 10 echten Ergebnissen in einer solchen Spanne. In wenigen dieser Jahre fielen die Mieten, daher sagt das Modell selten einen Rückgang voraus." },
  },
  premium: {
    term: "Asking rent vs. 2022 leases",
    def: "How far today's median asking rent per m² lies above the average rent of all existing contracts in May 2022. It is not the price change of one flat: it mixes four years of rent growth, a different mix of flats, and old leases that were rarely raised.",
    de: { term: "Angebotsmiete ggü. Bestand 2022", def: "Wie weit die heutige mittlere Angebotsmiete pro m² über der Durchschnittsmiete aller laufenden Verträge im Mai 2022 liegt. Das ist nicht die Preisänderung einer Wohnung: Es mischt vier Jahre Mietanstieg, eine andere Mischung von Wohnungen und alte Verträge, die selten erhöht wurden." },
  },
  anomaly: {
    term: "Unusual month",
    def: "A month where the city's quality-adjusted rent index moved far more than the other cities did, judged against its own previous two years, and the move did not reverse the next month. A prompt to look closer, not proof of a price change.",
    src: "iglewicz1993",
    de: { term: "Auffälliger Monat", def: "Ein Monat, in dem sich der qualitätsbereinigte Mietindex einer Stadt viel stärker bewegt hat als in den anderen Städten, gemessen an ihren eigenen letzten zwei Jahren, und die Bewegung im Folgemonat nicht zurückging. Ein Anlass, genauer hinzusehen, kein Beweis für eine Preisänderung." },
  },
  greix: {
    term: "GREIX",
    def: "The German Real Estate Index from the Kiel Institute for the World Economy. It tracks asking rents from listings in 37 large cities, adjusted for flat size and quality.",
    src: "greix-rent",
    de: { term: "GREIX", def: "Der German Real Estate Index des Kiel Instituts für Weltwirtschaft. Er erfasst Angebotsmieten aus Inseraten in 37 Großstädten, bereinigt um Größe und Qualität der Wohnung." },
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
export type GlossaryEntry = { term: string; def: string; src?: string; de: { term: string; def: string } };
// One name per measure (UX-1): "rent-burden" is always today's asking rent, "rent-burden-census" always 2022 census rents.
