import type { Metadata } from "next";
import { CityView } from "@/views/CityView";
import { cityMeta, cityParams } from "@/views/cityMeta";

type Props = { params: Promise<{ city: string }> };
export const dynamicParams = false;
export const generateStaticParams = cityParams;
export async function generateMetadata({ params }: Props): Promise<Metadata> { return cityMeta("en", (await params).city); }
export default async function Page({ params }: Props) { return <CityView lang="en" slug={(await params).city} />; }
