import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Animated, StatusBar, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import { SEED_WORKS, SEED_CREATOR } from "../../../../packages/db/src/seed-data";
import type { RootStackParams } from "@/navigation";
import { supportedLanguages, type AppLanguage } from "@skaddosh/i18n";

type P = NativeStackScreenProps<RootStackParams, "Tabs">;
type Lang = AppLanguage;
const CATEGORIES = ["fiction","non-fiction","poetry","intellectual-property","science","philosophy","culture","technology"];
const BRAND_ICON = require("../../assets/brand/logo.png");
const LANG_ORDER: Lang[] = ["ar", "en", "fr", "es"];

type WorkItem = {
  id: string;
  title: Record<string, string>;
  tag: Record<string, string>;
  kudosCount: number;
  creator?: { name: string; username: string };
  accentColor?: string;
  tags?: string[];
  type?: string;
};

function WorkCard({ item: w, index, lang, rtl, onPress }: {
  item: WorkItem; index: number; lang: Lang; rtl: boolean; onPress: () => void;
}) {
  const { t } = useTranslation();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = Math.min(index * 55, 400);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 12 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 12 }).start();

  const originalLang = LANG_ORDER.find((code) => w.title[code]?.trim()) ?? "en";
  const translatedTitle = lang !== originalLang ? w.title[lang] : "";
  const title  = w.title[originalLang] ?? w.title.en ?? "";
  const tag    = w.tag[originalLang]   ?? w.tag.en   ?? "";
  const accent = w.accentColor ?? "#6366f1";
  const tags   = w.tags ?? [];

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={{
          backgroundColor: T.colors.card,
          borderRadius: T.radius.xl,
          borderWidth: 1,
          borderColor: T.colors.border,
          marginHorizontal: 16,
          marginTop: 12,
          overflow: "hidden",
          ...T.shadow.sm,
        }}
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}>
        {/* Accent bar */}
        <View style={{ height: 3, backgroundColor: accent }} />
        <View style={{ padding: 16 }}>
          {/* Type badge */}
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <View style={{ backgroundColor: `${accent}22`, borderRadius: T.radius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: accent, textTransform: "uppercase", letterSpacing: 1.2 }}>
                {w.type}
              </Text>
            </View>
            {translatedTitle ? (
              <View style={{ backgroundColor: T.colors.primarySoft, borderRadius: T.radius.full, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: T.colors.border }}>
                <Text style={{ fontSize: 9, fontWeight: "900", color: T.colors.primary, textTransform: "uppercase", letterSpacing: 0.8 }}>Translated</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: T.colors.textMuted, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 9, fontWeight: "900", fontStyle: "italic", color: T.colors.textMuted }}>K</Text>
              </View>
              <Text style={{ fontSize: 11, color: T.colors.textMuted }}>{w.kudosCount} Cold</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={{ fontSize: originalLang === "ar" ? 18 : 16, fontWeight: "700", color: T.colors.text, textAlign: originalLang === "ar" ? "right" : "left", writingDirection: originalLang === "ar" ? "rtl" : "ltr", marginBottom: 3, letterSpacing: -0.2 }} numberOfLines={2}>
            {title}
          </Text>
          {translatedTitle ? (
            <Text style={{ fontSize: 13, color: T.colors.textMuted, textAlign: lang === "ar" ? "right" : "left", writingDirection: lang === "ar" ? "rtl" : "ltr", marginBottom: 6, fontStyle: "italic" }} numberOfLines={1}>
              {translatedTitle}
            </Text>
          ) : null}
          <Text style={{ fontSize: 12, color: T.colors.textMuted, textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr", marginBottom: 10 }} numberOfLines={1}>
            {tag}
          </Text>

          {/* Tags */}
          {tags.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
              {tags.slice(0, 3).map((t: string) => (
                <View key={t} style={{ backgroundColor: T.colors.surface, borderRadius: T.radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: T.colors.border }}>
                  <Text style={{ fontSize: 9, color: T.colors.textMuted, textTransform: "capitalize", letterSpacing: 0.3 }}>{t.replace(/-/g, " ")}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.colors.border }}>
            <View style={{ width: 24, height: 24, borderRadius: T.radius.full, backgroundColor: `${accent}30`, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: accent }}>
                {w.creator?.name?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: T.colors.textMuted, flex: 1, textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }}>{w.creator?.name}</Text>
            <Text style={{ fontSize: 11, color: T.colors.textSubtle }}>{t("mobile.readCta")}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function HomeScreen({ navigation }: P) {
  const { t, i18n } = useTranslation();
  const lang = (supportedLanguages.includes(i18n.language?.split("-")[0] as Lang)
    ? i18n.language.split("-")[0]
    : "en") as Lang;
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [searchFocused, setSearchFocused] = useState(false);
  const [appliedInterest, setAppliedInterest] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const rtl = lang === "ar";
  const { data: session } = useSession();

  const headerFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const { data: meData } = trpc.users.me.useQuery(undefined, { enabled: !!session });
  const { data: portfolioData } = trpc.portfolios.mine.useQuery(undefined, { enabled: !!session });
  const unreadMessages = React.useMemo(() => {
    if (!portfolioData?.exists) return [];
    return (portfolioData.portfolio.inbox ?? []).filter((message) => !message.read).slice(0, 4);
  }, [portfolioData]);
  const interests = React.useMemo(() => {
    try { return JSON.parse(meData?.settings?.contentCategories ?? "[]") as string[]; } catch { return []; }
  }, [meData?.settings?.contentCategories]);

  useEffect(() => {
    if (!appliedInterest && !search && !activeTag && interests.length) {
      setActiveTag(interests[0]);
      setAppliedInterest(true);
    }
  }, [activeTag, appliedInterest, interests, search]);

  const { data, isLoading } = trpc.works.list.useQuery({ limit: 20, search: search || undefined, tag: activeTag });
  const works = (data ?? SEED_WORKS.map(w => ({
    ...w,
    title: w.title as Record<string,string>,
    tag: w.tag as Record<string,string>,
    kudosCount: 0,
    creator: { name: SEED_CREATOR.name, username: SEED_CREATOR.username },
  }))) as WorkItem[];

  const renderItem = useCallback(({ item, index }: { item: WorkItem; index: number }) => (
    <WorkCard
      item={item}
      index={index}
      lang={lang}
      rtl={rtl}
      onPress={() => navigation.navigate("Read", { workId: item.id })}
    />
  ), [lang, rtl, navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Animated.View style={{ opacity: headerFade, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: T.colors.border, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 48, height: 48, overflow: "hidden" }}>
              <Image source={BRAND_ICON} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
            </View>
            <View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: T.colors.text, letterSpacing: -0.8 }}>skaddosh</Text>
              <Text style={{ fontSize: 11, color: T.colors.textMuted, letterSpacing: 0.3 }}>{t("mobile.homeTagline")}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setNotificationsOpen((open) => !open)}
            style={{ width: 36, height: 36, borderRadius: T.radius.full, borderWidth: 1, borderColor: T.colors.border, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: T.colors.text, fontSize: 16 }}>!</Text>
            {unreadMessages.length ? (
              <View style={{ position: "absolute", right: 7, top: 7, width: 7, height: 7, borderRadius: 7, backgroundColor: T.colors.red }} />
            ) : null}
          </TouchableOpacity>
        </View>
        {notificationsOpen ? (
          <View style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, backgroundColor: T.colors.card, padding: 12, gap: 6 }}>
            {unreadMessages.length ? unreadMessages.map((item) => (
              <View key={item.id} style={{ paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: T.colors.primary, paddingLeft: 8 }}>
                <Text style={{ color: T.colors.text, fontSize: 12, fontWeight: "900" }}>{item.subject}</Text>
                <Text style={{ color: T.colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 1 }}>
                  {item.from.name || item.from.email}: {item.body}
                </Text>
              </View>
            )) : (
              <View style={{ paddingVertical: 4 }}>
                <Text style={{ color: T.colors.text, fontSize: 12, fontWeight: "900" }}>No unread notifications</Text>
                <Text style={{ color: T.colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 1 }}>Portfolio inbox messages will appear here when readers contact you.</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: T.colors.text, letterSpacing: -0.2 }}>Discover</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <ActionButton label="New" icon="＋" onPress={() => navigation.navigate("NewContent")} />
            <ActionButton icon="≡" onPress={() => setFiltersOpen((open) => !open)} accessibilityLabel="Advanced Filter" />
          </View>
        </View>
        {searchFocused && search.trim().length >= 2 ? (
          <View style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, backgroundColor: T.colors.card, overflow: "hidden" }}>
            <Text style={{ color: T.colors.textMuted, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }}>Suggestions</Text>
            {works.slice(0, 4).map((item) => {
              const title = item.title.en || item.title.ar || "Untitled";
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setSearchFocused(false);
                    navigation.navigate("Read", { workId: item.id });
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.colors.border }}>
                  <Text style={{ color: T.colors.textMuted, fontSize: 15 }}>⌕</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: T.colors.text, fontSize: 13, fontWeight: "800" }} numberOfLines={1}>{title}</Text>
                    <Text style={{ color: T.colors.textMuted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>{item.type ?? "Work"}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {works.length === 0 ? (
              <Text style={{ color: T.colors.textMuted, fontSize: 12, padding: 12 }}>No suggestions yet.</Text>
            ) : null}
          </View>
        ) : null}

        {/* Search bar */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: T.colors.surface,
          borderRadius: T.radius.md,
          borderWidth: 1,
          borderColor: searchFocused ? T.colors.borderFocus : T.colors.border,
          paddingHorizontal: 12, paddingVertical: 10, gap: 8,
        }}>
          <Text style={{ fontSize: 13, color: T.colors.textMuted }}>⌕</Text>
          <TextInput
            style={{
              flex: 1,
              fontSize: 14,
              color: T.colors.text,
              textAlign: rtl ? "right" : "left",
              writingDirection: rtl ? "rtl" : "ltr",
            }}
            placeholder={t("mobile.searchWorks")}
            placeholderTextColor={T.colors.textSubtle}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 2 }}>
              <Text style={{ fontSize: 13, color: T.colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {filtersOpen ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={c => c}
            contentContainerStyle={{ gap: 6 }}
            renderItem={({ item: cat }) => (
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: T.radius.full,
                  borderWidth: 1,
                  borderColor: activeTag === cat ? T.colors.text : T.colors.border,
                  backgroundColor: activeTag === cat ? T.colors.text : "transparent",
                }}
                onPress={() => setActiveTag(activeTag === cat ? undefined : cat)}
                activeOpacity={0.7}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: activeTag === cat ? T.colors.background : T.colors.textMuted, textTransform: "capitalize", letterSpacing: 0.2 }}>
                  {cat.replace(/-/g, " ")}
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : null}
      </Animated.View>

      {isLoading ? (
        <LoadingList />
      ) : works.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 4 }}>◌</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: T.colors.text }}>{t("mobile.noWorksFound")}</Text>
          <Text style={{ fontSize: 13, color: T.colors.textMuted, textAlign: "center" }}>{t("mobile.tryDifferent")}</Text>
          {(search || activeTag) && (
            <TouchableOpacity
              style={{ marginTop: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: T.radius.md, borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.surface }}
              onPress={() => { setSearch(""); setActiveTag(undefined); setAppliedInterest(true); }}>
              <Text style={{ fontSize: 13, color: T.colors.text, fontWeight: "600" }}>{t("mobile.clearFilters")}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={works}
          keyExtractor={w => w.id}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function ActionButton({ label, icon, onPress, kudos = false, accessibilityLabel }: { label?: string; icon: string; onPress: () => void; kudos?: boolean; accessibilityLabel?: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || label}
      activeOpacity={0.75}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        borderWidth: 1,
        borderColor: T.colors.border,
        backgroundColor: T.colors.card,
        borderRadius: T.radius.md,
        paddingHorizontal: 11,
        paddingVertical: 9,
      }}>
      <View style={{
        width: 18,
        height: 18,
        borderRadius: kudos ? 9 : T.radius.sm,
        borderWidth: kudos ? 1 : 0,
        borderColor: T.colors.text,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Text style={{ color: T.colors.text, fontSize: kudos ? 11 : 14, fontWeight: "900", fontStyle: kudos ? "italic" : "normal" }}>{icon}</Text>
      </View>
      {label ? <Text style={{ color: T.colors.text, fontSize: 12, fontWeight: "800" }}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

function LoadingList() {
  return (
    <View style={{ paddingTop: 16, gap: 12 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={index}
          style={{
            marginHorizontal: 16,
            borderRadius: T.radius.xl,
            borderWidth: 1,
            borderColor: T.colors.border,
            backgroundColor: T.colors.card,
            padding: 16,
            gap: 12,
          }}>
          <View style={{ width: 70, height: 14, borderRadius: T.radius.full, backgroundColor: T.colors.surface }} />
          <View style={{ width: "82%", height: 18, borderRadius: T.radius.sm, backgroundColor: T.colors.surface }} />
          <View style={{ width: "56%", height: 12, borderRadius: T.radius.sm, backgroundColor: T.colors.surface }} />
          <View style={{ height: 1, backgroundColor: T.colors.border, marginTop: 4 }} />
          <View style={{ width: 120, height: 18, borderRadius: T.radius.full, backgroundColor: T.colors.surface }} />
        </View>
      ))}
    </View>
  );
}
