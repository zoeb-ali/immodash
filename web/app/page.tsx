import { StoryView } from "@/views/StoryView";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("en", "/", { absolute: "ImmoDash · What renting in Germany really costs" },
  "An interactive guide to German rents: how fast asking rents are rising in 37 cities, what a flat costs against local incomes, where the market is tightest, and a 12-month outlook. Rebuilt every week from open data.");

export default function Page() {
  return <StoryView lang="en" />;
}
