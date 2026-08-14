import React, { useRef, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Animated, StatusBar, Linking, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { trpc } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import { mobileConfig } from "@/config/mobile-env";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "Studio">;
type StudioTab = "articles" | "projects" | "gallery";

type WorkItem = {
  id: string;
  title: Record<string, string>;
  accentColor?: string;
  type?: string;
  published?: boolean;
  kudosCount?: number;
};

type ProjectItem = {
  id: string;
  title: string;
  accentColor: string;
  status: string;
  tags: string[];
  coverImage?: string | null;
};

type GalleryItem = {
  id: string;
  name: string;
  accentColor: string;
  status: string;
  images: unknown[];
};

function TabBar({ active, onChange }: { active: StudioTab; onChange: (t: StudioTab) => void }) {
  const TABS: Array<{ value: StudioTab; label: string }> = [
    { value: "articles", label: "Articles" },
    { value: "projects", label: "Projects" },
    { value: "gallery", label: "Gallery" },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6, flexDirection: "row" }}
    >
      {TABS.map((tab) => (
        <Pressable
          key={tab.value}
          onPress={() => onChange(tab.value)}
          style={{
            borderRadius: T.radius.md,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: active === tab.value ? T.colors.text : T.colors.card,
            borderWidth: 1,
            borderColor: active === tab.value ? T.colors.text : T.colors.border,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: active === tab.value ? T.colors.primaryText : T.colors.textMuted }}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function WorkRow({ item: w, index, onPress }: { item: WorkItem; index: number; onPress: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = Math.min(index * 45, 280);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const accent = w.accentColor ?? "#6366f1";
  const title  = w.title.en ?? w.title.ar ?? "Untitled";

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: T.colors.card, marginHorizontal: 16, marginTop: 8, borderRadius: T.radius.lg, borderWidth: 1, borderColor: T.colors.border, padding: 14 }}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 12 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }).start()}
        activeOpacity={1}
      >
        <View style={{ width: 36, height: 36, borderRadius: T.radius.md, backgroundColor: `${accent}18`, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${accent}28` }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: accent }}>{title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: T.colors.text, marginBottom: 2 }} numberOfLines={1}>{title}</Text>
          <Text style={{ fontSize: 11, color: T.colors.textMuted, textTransform: "capitalize" }}>
            {w.type} · {w.kudosCount ?? 0} Kudos
          </Text>
        </View>
        <View style={{ borderRadius: T.radius.full, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: w.published ? "rgba(34,197,94,0.10)" : T.colors.surface, borderWidth: 1, borderColor: w.published ? "rgba(34,197,94,0.22)" : T.colors.border }}>
          <Text style={{ fontSize: 9, fontWeight: "800", color: w.published ? T.colors.green : T.colors.textMuted }}>{w.published ? "Published" : "Draft"}</Text>
        </View>
        <Text style={{ fontSize: 16, color: T.colors.textMuted }}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ProjectRow({ item: p, index, onPress }: { item: ProjectItem; index: number; onPress: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = Math.min(index * 45, 280);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: T.colors.card, marginHorizontal: 16, marginTop: 8, borderRadius: T.radius.lg, borderWidth: 1, borderColor: T.colors.border, padding: 14 }}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 12 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }).start()}
        activeOpacity={1}
      >
        <View style={{ width: 36, height: 36, borderRadius: T.radius.md, backgroundColor: `${p.accentColor}18`, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${p.accentColor}28` }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: p.accentColor }}>{(p.title || "P").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: T.colors.text, marginBottom: 2 }} numberOfLines={1}>{p.title || "Untitled project"}</Text>
          <Text style={{ fontSize: 11, color: T.colors.textMuted }} numberOfLines={1}>
            {p.tags.slice(0, 3).join(", ") || "No tags"}
          </Text>
        </View>
        <View style={{ borderRadius: T.radius.full, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: p.status === "published" ? "rgba(34,197,94,0.10)" : T.colors.surface, borderWidth: 1, borderColor: p.status === "published" ? "rgba(34,197,94,0.22)" : T.colors.border }}>
          <Text style={{ fontSize: 9, fontWeight: "800", color: p.status === "published" ? T.colors.green : T.colors.textMuted }}>{p.status === "published" ? "Live" : "Draft"}</Text>
        </View>
        <Text style={{ fontSize: 16, color: T.colors.textMuted }}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function GalleryRow({ item: g, index, onPress }: { item: GalleryItem; index: number; onPress: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = Math.min(index * 45, 280);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: T.colors.card, marginHorizontal: 16, marginTop: 8, borderRadius: T.radius.lg, borderWidth: 1, borderColor: T.colors.border, padding: 14 }}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 12 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }).start()}
        activeOpacity={1}
      >
        <View style={{ width: 36, height: 36, borderRadius: T.radius.md, backgroundColor: `${g.accentColor}18`, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${g.accentColor}28` }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: g.accentColor }}>{(g.name || "G").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: T.colors.text, marginBottom: 2 }} numberOfLines={1}>{g.name || "Untitled collection"}</Text>
          <Text style={{ fontSize: 11, color: T.colors.textMuted }}>
            {g.images.length} photo{g.images.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={{ borderRadius: T.radius.full, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: g.status === "published" ? "rgba(34,197,94,0.10)" : T.colors.surface, borderWidth: 1, borderColor: g.status === "published" ? "rgba(34,197,94,0.22)" : T.colors.border }}>
          <Text style={{ fontSize: 9, fontWeight: "800", color: g.status === "published" ? T.colors.green : T.colors.textMuted }}>{g.status === "published" ? "Published" : "Draft"}</Text>
        </View>
        <Text style={{ fontSize: 16, color: T.colors.textMuted }}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function EmptySection({ icon, title, message, onPress, cta }: { icon: string; title: string; message: string; onPress: () => void; cta: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32, paddingVertical: 48 }}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontWeight: "700", color: T.colors.text }}>{title}</Text>
      <Text style={{ fontSize: 13, color: T.colors.textMuted, textAlign: "center", lineHeight: 22 }}>{message}</Text>
      <TouchableOpacity
        style={{ marginTop: 8, backgroundColor: T.colors.text, borderRadius: T.radius.md, paddingHorizontal: 24, paddingVertical: 11 }}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: T.colors.primaryText }}>{cta}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SkeletonList() {
  return (
    <View style={{ padding: 16, gap: 8 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ height: 68, borderRadius: T.radius.lg, backgroundColor: T.colors.card, borderWidth: 1, borderColor: T.colors.border, opacity: 0.6 }} />
      ))}
    </View>
  );
}

export function StudioScreen({ navigation }: P) {
  const [activeTab, setActiveTab] = useState<StudioTab>("articles");

  const { data: worksData,    isPending: worksPending    } = trpc.works.mine.useQuery();
  const { data: projectsData, isPending: projectsPending } = trpc.projects.mine.useQuery();
  const { data: galleryData,  isPending: galleryPending  } = trpc.gallery.mine.useQuery();

  const works    = (worksData    ?? []) as WorkItem[];
  const projects = (projectsData ?? []) as ProjectItem[];
  const gallery  = (galleryData  ?? []) as GalleryItem[];

  const publishedWorks    = works.filter((w) => w.published).length;
  const publishedProjects = projects.filter((p) => p.status === "published").length;
  const totalKudos        = works.reduce((s, w) => s + (w.kudosCount ?? 0), 0);

  const headerFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const openWebEditor = (path: string) => {
    void Linking.openURL(`${mobileConfig.apiBaseUrl}${path}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Animated.View style={{ opacity: headerFade, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: T.colors.text, letterSpacing: -0.7 }}>Studio</Text>
            <Text style={{ fontSize: 12, color: T.colors.textMuted, marginTop: 2 }}>
              {publishedWorks} articles · {publishedProjects} projects · {totalKudos} Kudos
            </Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: T.colors.text, borderRadius: T.radius.md, paddingHorizontal: 14, paddingVertical: 9 }}
            onPress={() => navigation.navigate("NewContent")}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 15, color: T.colors.primaryText, fontWeight: "700" }}>+</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: T.colors.primaryText }}>New</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Articles */}
      {activeTab === "articles" ? (
        worksPending ? (
          <SkeletonList />
        ) : works.length === 0 ? (
          <EmptySection
            icon="◌"
            title="No articles yet"
            message="Start writing your first article."
            cta="Create article"
            onPress={() => navigation.navigate("NewContent")}
          />
        ) : (
          <FlatList
            data={works}
            keyExtractor={(w) => w.id}
            contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <WorkRow item={item} index={index} onPress={() => navigation.navigate("Editor", { workId: item.id })} />
            )}
          />
        )
      ) : null}

      {/* Projects */}
      {activeTab === "projects" ? (
        projectsPending ? (
          <SkeletonList />
        ) : projects.length === 0 ? (
          <EmptySection
            icon="◈"
            title="No projects yet"
            message="Showcase what you've built. Add your first project from the web studio."
            cta="Open web studio"
            onPress={() => openWebEditor("/studio")}
          />
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <ProjectRow
                item={item}
                index={index}
                onPress={() => openWebEditor(`/studio/projects/${item.id}`)}
              />
            )}
          />
        )
      ) : null}

      {/* Gallery */}
      {activeTab === "gallery" ? (
        galleryPending ? (
          <SkeletonList />
        ) : gallery.length === 0 ? (
          <EmptySection
            icon="⬡"
            title="No collections yet"
            message="Create a photo gallery collection from the web studio."
            cta="Open web studio"
            onPress={() => openWebEditor("/studio")}
          />
        ) : (
          <FlatList
            data={gallery}
            keyExtractor={(g) => g.id}
            contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <GalleryRow
                item={item}
                index={index}
                onPress={() => openWebEditor(`/studio/gallery/${item.id}`)}
              />
            )}
          />
        )
      ) : null}
    </SafeAreaView>
  );
}
