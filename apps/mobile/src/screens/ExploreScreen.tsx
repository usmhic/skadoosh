import React, { useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";
import { Cover, KudosMark, MEDIUM_LABEL, Pill, VerifiedMark } from "@/components/gallery";

type Mode = "for-you" | "following" | "rising" | "backing" | "collab" | "new-voices";
const MODES: Array<{ value: Mode; label: string }> = [
  { value: "for-you", label: "For you" },
  { value: "rising", label: "Rising" },
  { value: "backing", label: "Seeking backers" },
  { value: "collab", label: "Open to collaborators" },
  { value: "new-voices", label: "New voices" },
  { value: "following", label: "Following" },
];
const LANG_ORDER = ["ar", "en", "fr", "es"] as const;

function workTitle(title: Record<string, string>) {
  const lang = LANG_ORDER.find((code) => title[code]?.trim()) ?? "en";
  return { text: title[lang] ?? "", rtl: lang === "ar" };
}

/** The gallery: original work by verified people, filtered by medium. */
export function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>("for-you");
  const [medium, setMedium] = useState<string | undefined>(undefined);
  const feed = trpc.discover.feed.useQuery({ mode, medium: medium as never, limit: 40 });
  const mediums = trpc.discover.mediums.useQuery();
  const visibleMediums = (mediums.data ?? []).filter((m) => m.medium !== "other" && m.count > 0);
  const modes = MODES.filter((m) => m.value !== "following" || session);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.colors.background }}>
      <FlatList
        data={feed.data?.items ?? []}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              <Text style={{ fontFamily: T.fonts.display, fontSize: 40, lineHeight: 44, color: T.colors.text }}>
                Original work,{"\n"}made by people.
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: T.colors.textMuted }}>
                Appreciate it, back it early, license it, or help make it.
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 20 }}>
              <Pill label="All" active={!medium} onPress={() => setMedium(undefined)} />
              {visibleMediums.map((m) => (
                <Pill key={m.medium} label={MEDIUM_LABEL[m.medium] ?? m.medium} active={medium === m.medium} onPress={() => setMedium(m.medium)} />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingVertical: 16 }}>
              {modes.map((m) => (
                <TouchableOpacity key={m.value} onPress={() => setMode(m.value)} accessibilityRole="button" accessibilityState={{ selected: mode === m.value }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: mode === m.value ? "700" : "500",
                      color: mode === m.value ? T.colors.text : T.colors.textMuted,
                      borderBottomWidth: 2,
                      borderBottomColor: mode === m.value ? T.colors.text : "transparent",
                      paddingBottom: 4,
                    }}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          feed.isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={T.colors.text} />
          ) : (
            <Text style={{ textAlign: "center", marginTop: 40, color: T.colors.textMuted }}>Nothing here yet.</Text>
          )
        }
        renderItem={({ item }) => {
          const isProject = item.kind === "project";
          const title = isProject ? { text: item.title || "Untitled project", rtl: false } : workTitle(item.title);
          const subtitle = isProject ? item.pitch : item.tag.en || Object.values(item.tag).find(Boolean) || "";
          const itemMedium = isProject ? item.medium : "writing";
          const seeking = isProject && (item.stage === "idea" || item.stage === "making") && item.backingGoal > 0;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={title.text}
              onPress={() =>
                isProject ? navigation.navigate("Project", { projectId: item.id }) : navigation.navigate("Read", { workId: item.id })
              }
              style={{ paddingHorizontal: 20, marginBottom: 28 }}
            >
              <Cover image={isProject ? item.coverImage : null} accent={item.accentColor} title={title.text} medium={itemMedium} />
              {seeking ? (
                <View style={{ marginTop: 10, height: 4, borderRadius: 2, backgroundColor: T.colors.coldSoft, overflow: "hidden" }}>
                  <View
                    style={{
                      height: 4,
                      width: `${Math.min(100, Math.round((item.coldKudosTotal / Math.max(1, item.backingGoal)) * 100))}%`,
                      backgroundColor: T.colors.cold,
                    }}
                  />
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 12, gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: title.rtl ? T.fonts.arabic : T.fonts.display,
                      fontSize: 22,
                      color: T.colors.text,
                      textAlign: title.rtl ? "right" : "left",
                      writingDirection: title.rtl ? "rtl" : "ltr",
                    }}
                    numberOfLines={2}
                  >
                    {title.text}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: T.colors.text }}>{item.creator.name}</Text>
                    <VerifiedMark verified={item.creator.verified} size={12} />
                    <Text style={{ fontSize: 12, color: T.colors.textMuted }}>· {MEDIUM_LABEL[itemMedium ?? "other"]}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <KudosMark size={14} />
                  <Text style={{ fontSize: 12, color: T.colors.textMuted }}>{isProject ? item.kudosReceived : item.kudosCount}</Text>
                </View>
              </View>
              {subtitle ? (
                <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: T.colors.textMuted }} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
