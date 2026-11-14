import type { Metadata } from "next";
import { TravelCollection } from "@/components/travel/travel-collection";

export const metadata: Metadata = { title: "Travel collection" };

export default async function TravelCollectionPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <TravelCollection tripId={tripId} />;
}
