import React from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, View } from "react-native";
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
import { formatDistance, haversineMeters, TRAVEL_MODE_INFO } from "@skaddosh/api/trips";

type P = NativeStackScreenProps<RootStackParams, "Trip">;

/** A travel collection: places in order, each with its photos and story. */
export function TripScreen({ route, navigation }: P) {
  const { tripId } = route.params;
  const { data: session } = useSession();
  const query = trpc.trips.byId.useQuery({ id: tripId });
  const duplicate = trpc.trips.duplicate.useMutation({
    onSuccess: ({ id }) => navigation.replace("Trip", { tripId: id }),
    onError: (e) => Alert.alert("Couldn't save a copy", errorMessage(e)),
  });
  const openOnWeb = () => void WebBrowser.openBrowserAsync(`${mobileConfig.apiBaseUrl}/travel/${tripId}`).then(() => query.refetch());

  if (query.isLoading) return <ActivityIndicator style={{ flex: 1 }} color={T.colors.text} />;
  const c = query.data;
  if (!c) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.colors.background }}>
        <Text style={{ color: T.colors.textMuted }}>This collection isn&apos;t available.</Text>
      </SafeAreaView>
    );
  }

  const distance = c.route?.distance ?? (c.stops.length > 1 ? c.straightLineDistance : null);
  const photoCount = c.stops.reduce((t, s) => t + s.photos.length, 0);
  const legText = (index: number) => {
    const leg = c.route?.legs[index];
    if (leg) return formatDistance(leg.distance);
    const a = c.stops[index];
    const b = c.stops[index + 1];
    return a && b ? `~${formatDistance(haversineMeters(a, b))}` : "";
  };

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: T.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {c.cover ? <Image source={{ uri: c.cover }} style={{ width: "100%", aspectRatio: 16 / 10 }} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
        <View style={{ padding: 20 }}>
          <Text style={{ fontFamily: T.fonts.display, fontSize: 30, lineHeight: 34, color: T.colors.text }}>{c.title}</Text>
          {c.owner ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 14, color: T.colors.textMuted }}>by {c.owner.name}</Text>
              <VerifiedMark verified={c.owner.verified} />
              {c.project ? <Text style={{ fontSize: 14, color: T.colors.textMuted }}>· {c.project.title}</Text> : null}
            </View>
          ) : null}
          {c.summary ? <Text style={{ marginTop: 14, fontFamily: T.fonts.serif, fontSize: 17, lineHeight: 26, color: T.colors.text }}>{c.summary}</Text> : null}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
            <Stat label="Places" value={String(c.stops.length)} />
            <Stat label="Photos" value={String(photoCount)} />
            <Stat label={TRAVEL_MODE_INFO[c.mode].label} value={distance != null ? formatDistance(distance) : "–"} />
          </View>

          <View style={{ marginTop: 18 }}>
            <RouteSketch points={c.stops} geometry={c.route?.geometry} accent={c.accentColor} height={200} />
          </View>

          <View style={{ marginTop: 16, gap: 10 }}>
            {c.isOwner ? (
              <PrimaryButton label="Add places and photos" onPress={openOnWeb} />
            ) : (
              <>
                <PrimaryButton label="Open the map" variant="outline" onPress={openOnWeb} />
                {session ? (
                  <PrimaryButton label={duplicate.isPending ? "Saving…" : "Save a copy"} disabled={duplicate.isPending} onPress={() => duplicate.mutate({ id: tripId })} />
                ) : null}
              </>
            )}
          </View>

          {c.stops.map((place, index) => (
            <View key={place.id}>
              <View style={{ marginTop: 18, borderRadius: T.radius.xl, borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 14 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.accentColor, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff" }}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: T.fonts.display, fontSize: 18, color: T.colors.text }}>{place.name}</Text>
                    {place.address && place.address !== place.name ? (
                      <Text style={{ fontSize: 12, color: T.colors.textMuted }} numberOfLines={1}>
                        {place.address}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {place.photos.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 6 }}>
                    {place.photos.map((photo, i) => (
                      <View key={`${photo.url}-${i}`} style={{ width: place.photos.length === 1 ? 320 : 220 }}>
                        <Image source={{ uri: photo.url }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: T.radius.md }} resizeMode="cover" accessibilityLabel={photo.caption || place.name} />
                        {photo.caption ? <Text style={{ marginTop: 4, fontSize: 12, color: T.colors.textMuted }}>{photo.caption}</Text> : null}
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
                {place.story ? (
                  <Text style={{ padding: 14, fontFamily: T.fonts.serif, fontSize: 15, lineHeight: 23, color: T.colors.text }}>{place.story}</Text>
                ) : (
                  <View style={{ height: 8 }} />
                )}
              </View>
              {index < c.stops.length - 1 ? <Text style={{ marginTop: 8, marginLeft: 18, fontSize: 12, color: T.colors.textMuted }}>↓ {legText(index)}</Text> : null}
            </View>
          ))}
          <Text style={{ marginTop: 28, fontSize: 11, color: T.colors.textSubtle }}>Map data © OpenStreetMap contributors. Routing by openrouteservice.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: T.radius.lg, padding: 12, backgroundColor: T.colors.surface }}>
      <Text style={{ fontFamily: T.fonts.display, fontSize: 18, color: T.colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: T.colors.textMuted }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
