import type { Metadata } from "next";
import { TripPlanner } from "@/components/trips/trip-planner";

export const metadata: Metadata = { title: "Trip" };

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <TripPlanner tripId={tripId} />;
}
