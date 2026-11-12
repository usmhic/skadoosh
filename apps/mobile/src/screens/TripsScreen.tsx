import React from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import { mobileConfig } from "@/config/mobile-env";
import type { RootStackParams } from "@/navigation";
import { PrimaryButton, SectionTitle, errorMessage } from "@/components/gallery";
import { RouteSketch } from "@/components/route-sketch";
import { formatDistance, formatDuration, TRAVEL_MODE_INFO } from "@skaddosh/api/trips";

type Card = {
  id: string;
  title: string;
  mode: keyof typeof TRAVEL_MODE_INFO;
  accentColor: string;
  stopCount: number;
  days: number;
  from: string | null;
  to: string | null;
  points: Array<{ lat: number; lng: number }>;
  geometry: Array<[number, number]> | null;
  distance: number | null;
  duration: number | null;
  straightLineDistance: number;
  owner: { name: string } | null;
};

export function TripsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { data: session } = useSession();
  const mine = trpc.trips.mine.useQuery(undefined, { enabled: Boolean(session) });
  const explore = trpc.trips.explore.useQuery({ limit: 24 });
  const create = trpc.trips.create.useMutation({
    // Planning (search, map pins, reordering) happens in the full-screen web planner.
    onSuccess: ({ id }) => void WebBrowser.openBrowserAsync(`${mobileConfig.apiBaseUrl}/trips/${id}`).then(() => mine.refetch()),
    onError: (e) => Alert.alert("Couldn't start a trip", errorMessage(e)),
  });

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={mine.isRefetching || explore.isRefetching} onRefresh={() => void Promise.all([mine.refetch(), explore.refetch()])} />}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: T.colors.primary }}>Trips</Text>
        <Text style={{ marginTop: 4, fontFamily: T.fonts.display, fontSize: 34, lineHeight: 38, color: T.colors.text }}>
          Plan the journey behind the work.
        </Text>
        <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 22, color: T.colors.textMuted }}>
          Routes, stops, and days for field trips, tours, and sketching rides.
        </Text>
        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            label={create.isPending ? "Starting…" : "Plan a trip"}
            disabled={create.isPending}
            onPress={() => (session ? create.mutate({}) : navigation.navigate("Login"))}
          />
        </View>

        {session ? (
          <>
            <SectionTitle>Your trips</SectionTitle>
            {mine.isLoading ? <ActivityIndicator color={T.colors.text} /> : null}
            {mine.data?.length === 0 ? <Text style={{ color: T.colors.textMuted }}>No trips yet.</Text> : null}
            {mine.data?.map((trip) => <TripCard key={trip.id} trip={trip as Card} onPress={() => navigation.navigate("Trip", { tripId: trip.id })} />)}
          </>
        ) : null}

        <SectionTitle>From the community</SectionTitle>
        {explore.isLoading ? <ActivityIndicator color={T.colors.text} /> : null}
        {explore.data?.map((trip) => <TripCard key={trip.id} trip={trip as Card} onPress={() => navigation.navigate("Trip", { tripId: trip.id })} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function TripCard({ trip, onPress }: { trip: Card; onPress: () => void }) {
  const distance = trip.distance ?? (trip.stopCount > 1 ? trip.straightLineDistance : null);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={trip.title}
      style={{ marginBottom: 18, borderRadius: T.radius.xl, borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, overflow: "hidden" }}
    >
      <RouteSketch points={trip.points} geometry={trip.geometry} accent={trip.accentColor} height={150} numbered={false} />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: T.colors.textMuted }}>
          {TRAVEL_MODE_INFO[trip.mode].label}
        </Text>
        <Text style={{ marginTop: 4, fontFamily: T.fonts.display, fontSize: 20, color: T.colors.text }} numberOfLines={2}>
          {trip.title}
        </Text>
        {trip.from ? (
          <Text style={{ marginTop: 4, fontSize: 13, color: T.colors.textMuted }} numberOfLines={1}>
            {trip.to ? `${trip.from} → ${trip.to}` : trip.from}
          </Text>
        ) : null}
        <Text style={{ marginTop: 8, fontSize: 12, color: T.colors.textMuted }}>
          {distance != null ? `${trip.distance == null ? "~" : ""}${formatDistance(distance)} · ` : ""}
          {trip.duration != null ? `${formatDuration(trip.duration)} · ` : ""}
          {trip.stopCount} stops{trip.days > 1 ? ` · ${trip.days} days` : ""}
          {trip.owner ? ` · ${trip.owner.name}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
