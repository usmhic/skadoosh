import React from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import { mobileConfig } from "@/config/mobile-env";
import type { RootStackParams } from "@/navigation";
import { PrimaryButton, VerifiedMark, errorMessage } from "@/components/gallery";
import { RouteSketch } from "@/components/route-sketch";
import { formatDistance, formatDuration, haversineMeters, planDays, STOP_KIND_INFO, TRAVEL_MODE_INFO } from "@skaddosh/api/trips";

type P = NativeStackScreenProps<RootStackParams, "Trip">;

export function TripScreen({ route, navigation }: P) {
  const { tripId } = route.params;
  const { data: session } = useSession();
  const query = trpc.trips.byId.useQuery({ id: tripId });
  const duplicate = trpc.trips.duplicate.useMutation({
    onSuccess: ({ id }) => navigation.replace("Trip", { tripId: id }),
    onError: (e) => Alert.alert("Couldn't copy this trip", errorMessage(e)),
  });
  const openPlanner = () => void WebBrowser.openBrowserAsync(`${mobileConfig.apiBaseUrl}/trips/${tripId}`).then(() => query.refetch());

  if (query.isLoading) return <ActivityIndicator style={{ flex: 1 }} color={T.colors.text} />;
  const trip = query.data;
  if (!trip) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.colors.background }}>
        <Text style={{ color: T.colors.textMuted }}>This trip isn&apos;t available.</Text>
      </SafeAreaView>
    );
  }

  const days = planDays(trip.stops, trip.route?.legs ?? null);
  const distance = trip.route?.distance ?? (trip.stops.length > 1 ? trip.straightLineDistance : null);
  const legText = (index: number) => {
    const leg = trip.route?.legs[index];
    if (leg) return `${formatDistance(leg.distance)} · ${formatDuration(leg.duration)}`;
    const a = trip.stops[index];
    const b = trip.stops[index + 1];
    return a && b ? `~${formatDistance(haversineMeters(a, b))} in a straight line` : "";
  };

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: T.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <RouteSketch points={trip.stops} geometry={trip.route?.geometry} accent={trip.accentColor} height={230} />
        <Text style={{ marginTop: 18, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: T.colors.textMuted }}>
          {TRAVEL_MODE_INFO[trip.mode].label}
        </Text>
        <Text style={{ marginTop: 4, fontFamily: T.fonts.display, fontSize: 30, lineHeight: 34, color: T.colors.text }}>{trip.title}</Text>
        {trip.owner ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
            <Text style={{ fontSize: 14, color: T.colors.textMuted }}>by {trip.owner.name}</Text>
            <VerifiedMark verified={trip.owner.verified} />
            {trip.project ? <Text style={{ fontSize: 14, color: T.colors.textMuted }}>· {trip.project.title}</Text> : null}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
          <Stat label={trip.route ? "Distance" : "Straight line"} value={distance != null ? formatDistance(distance) : "–"} />
          <Stat label="Travel time" value={trip.route ? formatDuration(trip.route.duration) : "–"} />
          <Stat label="Stops" value={String(trip.stops.length)} />
        </View>
        {trip.summary ? <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 23, color: T.colors.text }}>{trip.summary}</Text> : null}

        <View style={{ marginTop: 16, gap: 10 }}>
          {trip.isOwner ? (
            <PrimaryButton label="Edit in the planner" onPress={openPlanner} />
          ) : (
            <>
              <PrimaryButton label="Open the map" variant="outline" onPress={openPlanner} />
              {session ? (
                <PrimaryButton label={duplicate.isPending ? "Copying…" : "Copy to my trips"} disabled={duplicate.isPending} onPress={() => duplicate.mutate({ id: tripId })} />
              ) : null}
            </>
          )}
        </View>

        {days.map((plan) => (
          <View key={plan.day} style={{ marginTop: 28 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: T.fonts.display, fontSize: 20, color: T.colors.text }}>Day {plan.day}</Text>
              {plan.distance ? <Text style={{ fontSize: 12, color: T.colors.textMuted }}>{formatDistance(plan.distance)} · {formatDuration(plan.duration)}</Text> : null}
            </View>
            {plan.stopIndexes.map((index) => {
              const stop = trip.stops[index]!;
              const end = index === 0 || index === trip.stops.length - 1;
              return (
                <View key={stop.id}>
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 12, padding: 14, borderRadius: T.radius.lg, borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: trip.accentColor, backgroundColor: end ? trip.accentColor : "transparent", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: end ? "#fff" : trip.accentColor }}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: T.colors.text }}>{stop.name}</Text>
                      <Text style={{ fontSize: 12, color: T.colors.textMuted }}>
                        {STOP_KIND_INFO[stop.kind].label}
                        {stop.stayMinutes ? ` · ${stop.stayMinutes >= 720 ? "Overnight" : formatDuration(stop.stayMinutes * 60)}` : ""}
                      </Text>
                      {stop.notes ? <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: T.colors.text }}>{stop.notes}</Text> : null}
                    </View>
                  </View>
                  {index < trip.stops.length - 1 ? (
                    <Text style={{ marginTop: 8, marginLeft: 18, fontSize: 12, color: T.colors.textMuted }}>↓ {legText(index)}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
        <Text style={{ marginTop: 28, fontSize: 11, color: T.colors.textSubtle }}>
          Map data © OpenStreetMap contributors. Routing by openrouteservice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: T.radius.lg, padding: 12, backgroundColor: T.colors.surface }}>
      <Text style={{ fontFamily: T.fonts.display, fontSize: 18, color: T.colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: T.colors.textMuted }}>{label}</Text>
    </View>
  );
}
