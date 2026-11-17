import React from "react";
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
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
import { formatDistance, type TravelModeKey } from "@skaddosh/api/trips";

type Card = {
  id: string;
  title: string;
  mode: TravelModeKey;
  accentColor: string;
  cover: string | null;
  photoCount: number;
  stopCount: number;
  from: string | null;
  to: string | null;
  points: Array<{ lat: number; lng: number }>;
  geometry: Array<[number, number]> | null;
  distance: number | null;
  straightLineDistance: number;
  owner: { name: string } | null;
};

export function TravelScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { data: session } = useSession();
  const mine = trpc.trips.mine.useQuery(undefined, { enabled: Boolean(session) });
  const explore = trpc.trips.explore.useQuery({ limit: 24 });
  const create = trpc.trips.create.useMutation({
    // Adding places and photos happens in the full-screen web editor.
    onSuccess: ({ id }) => void WebBrowser.openBrowserAsync(`${mobileConfig.apiBaseUrl}/travel/${id}`).then(() => mine.refetch()),
    onError: (e) => Alert.alert("Couldn't start a collection", errorMessage(e)),
  });

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={mine.isRefetching || explore.isRefetching} onRefresh={() => void Promise.all([mine.refetch(), explore.refetch()])} />}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: T.colors.primary }}>Travel collections</Text>
        <Text style={{ marginTop: 4, fontFamily: T.fonts.display, fontSize: 34, lineHeight: 38, color: T.colors.text }}>
          The places behind the work.
        </Text>
        <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 22, color: T.colors.textMuted }}>
          Photos and stories pinned where they were made.
        </Text>
        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            label={create.isPending ? "Starting…" : "New collection"}
            disabled={create.isPending}
            onPress={() => (session ? create.mutate({}) : navigation.navigate("Login"))}
          />
        </View>

        {session ? (
          <>
            <SectionTitle>Your collections</SectionTitle>
            {mine.isLoading ? <ActivityIndicator color={T.colors.text} /> : null}
            {mine.data?.length === 0 ? <Text style={{ color: T.colors.textMuted }}>No travel collections yet.</Text> : null}
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
      {trip.cover ? (
        <Image source={{ uri: trip.cover }} style={{ width: "100%", aspectRatio: 4 / 3 }} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <RouteSketch points={trip.points} geometry={trip.geometry} accent={trip.accentColor} height={180} numbered={false} />
      )}
      <View style={{ padding: 16 }}>
        <Text style={{ fontFamily: T.fonts.display, fontSize: 20, color: T.colors.text }} numberOfLines={2}>
          {trip.title}
        </Text>
        {trip.from ? (
          <Text style={{ marginTop: 4, fontSize: 13, color: T.colors.textMuted }} numberOfLines={1}>
            {trip.to ? `${trip.from} → ${trip.to}` : trip.from}
          </Text>
        ) : null}
        <Text style={{ marginTop: 8, fontSize: 12, color: T.colors.textMuted }}>
          {trip.stopCount} places
          {trip.photoCount ? ` · ${trip.photoCount} photos` : ""}
          {distance != null ? ` · ${formatDistance(distance)}` : ""}
          {trip.owner ? ` · ${trip.owner.name}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
