import { CitiesView } from "@/views/CitiesView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("en", "/cities", "Cities", "Rent profiles for 37 German cities: asking rents, trends, affordability and forecasts.");
export default function Page() { return <CitiesView lang="en" />; }
