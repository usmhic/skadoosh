import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Animated, StatusBar, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import { SEED_WORKS, SEED_CREATOR } from "../../../../packages/db/src/seed-data";
import type { RootStackParams } from "@/navigation";
import { supportedLanguages, type AppLanguage } from "@skaddosh/i18n";

type P = NativeStackScreenProps<RootStackParams, "Read">;
type Lang = AppLanguage;
const LANG_ORDER: Lang[] = ["ar", "en", "fr", "es"];
const LANG_LABEL: Record<Lang, string> = { ar: "Arabic", en: "English", fr: "French", es: "Spanish" };

function KudosMark({ size = 12, color = T.colors.amber }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderWidth: 1, borderColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size, lineHeight: size + 2, fontWeight: "900", fontStyle: "italic", color }}>K</Text>
    </View>
  );
}

const IMAGE_BLOCK_RE = /^!\[([^\]]*)\]\((\S+)\)$/;

function BodyBlock({ block, rtl, accent }: { block: string; rtl: boolean; accent: string }) {
  const image = block.match(IMAGE_BLOCK_RE);
  if (image) {
    const [, alt, src] = image;
    return (
      <View style={{ borderRadius: T.radius.lg, overflow: "hidden", borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.surface, marginBottom: 20 }}>
        <Image source={{ uri: src }} style={{ width: "100%", height: 220 }} resizeMode="cover" />
        {alt ? (
          <Text style={{ padding: 10, fontSize: 12, color: T.colors.textMuted, textAlign: rtl ? "right" : "left" }}>{alt}</Text>
        ) : null}
      </View>
    );
  }

  if (block.startsWith("—") || block.startsWith("«")) {
    return (
      <View style={{
        borderRadius: T.radius.md, padding: 16, marginBottom: 20,
        backgroundColor: `${accent}10`,
        borderLeftWidth: rtl ? 0 : 3, borderRightWidth: rtl ? 3 : 0,
        borderLeftColor: accent, borderRightColor: accent,
      }}>
        <Text style={{ fontSize: rtl ? 18 : 17, fontStyle: "italic", color: T.colors.textMuted, textAlign: rtl ? "right" : "left", lineHeight: rtl ? 38 : 32 }}>
          {block}
        </Text>
      </View>
    );
  }

  const parts = block.split(/(\*[^*]+\*)/g);
  return (
    <Text style={{ fontSize: rtl ? 19 : 17, color: T.colors.text, marginBottom: 20, textAlign: rtl ? "right" : "left", lineHeight: rtl ? 40 : 32 }}>
      {parts.map((part, j) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <Text key={j} style={{ color: accent, fontWeight: "700" }}>{part.slice(1, -1)}</Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

export function ReadScreen({ route, navigation }: P) {
  const { t, i18n } = useTranslation();
  const { workId } = route.params;
  const lang = (supportedLanguages.includes(i18n.language?.split("-")[0] as Lang)
    ? i18n.language.split("-")[0]
    : "en") as Lang;
  const [kudosDone, setKudosDone] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [commentText, setCommentText] = useState("");
  const rtl = lang === "ar";

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const { data: session } = useSession();
  const { data: work, isLoading } = trpc.works.byId.useQuery({ id: workId });
  const { data: summaryData, isFetching: summaryLoading } = trpc.works.summarize.useQuery({ workId, lang }, { enabled: showSummary });
  const { data: kudosHistory, refetch: refetchKudos } = trpc.works.getKudos.useQuery({ workId, limit: 40 });
  const { data: comments, refetch: refetchComments } = trpc.works.getComments.useQuery({ workId, limit: 30 });
  const seed = SEED_WORKS.find(w => w.id === workId);
  const sendKudos = trpc.works.sendKudos.useMutation({
    onSuccess: () => {
      setKudosDone(true);
      setReviewText("");
      void refetchKudos();
      Alert.alert(`${t("read.thankYou")} ✨`);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });
  const addComment = trpc.works.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      void refetchComments();
      Alert.alert("Comment posted", "Your comment is now part of the conversation.");
    },
    onError: (e) => Alert.alert("Could not post comment", e.message),
  });

  const w = work ?? (seed ? {
    ...seed,
    title: seed.title as Record<string, string>,
    tag: seed.tag as Record<string, string>,
    kudosCount: 0,
    creator: { name: SEED_CREATOR.name, username: SEED_CREATOR.username },
  } : null);
  if (!w) return <View style={{ flex: 1, backgroundColor: T.colors.background }} />;

  const workBody = work as Partial<{
    bodyAr: string;
    bodyEn: string;
    bodyFr: string;
    bodyEs: string;
    tags: string[];
    kudosCount: number;
  }> | undefined;
  const titlesByLang = w.title as Record<string, string>;
  const bodyByLang: Record<Lang, string> = {
    ar: workBody?.bodyAr ?? seed?.bodyAr ?? "",
    en: workBody?.bodyEn ?? seed?.bodyEn ?? "",
    fr: workBody?.bodyFr ?? (seed as { bodyFr?: string } | undefined)?.bodyFr ?? "",
    es: workBody?.bodyEs ?? (seed as { bodyEs?: string } | undefined)?.bodyEs ?? "",
  };
  const originalLang = LANG_ORDER.find((code) => bodyByLang[code]?.trim() || titlesByLang[code]?.trim()) ?? lang;
  const translatedLangs = LANG_ORDER.filter((code) => code !== originalLang && Boolean(bodyByLang[code]?.trim()));
  const hasSelectedTranslation = lang !== originalLang && Boolean(bodyByLang[lang]?.trim());
  const title  = titlesByLang[originalLang] ?? titlesByLang.en ?? "Untitled";
  const translatedTitle = hasSelectedTranslation ? titlesByLang[lang] : "";
  const body   = bodyByLang[originalLang] || bodyByLang.en || "";
  const translatedBody = hasSelectedTranslation ? bodyByLang[lang] : "";
  const accent = (w as { accentColor?: string }).accentColor ?? "#6366f1";
  const paras  = body.trim().split(/\n{2,}/).filter(Boolean);
  const translatedParas = translatedBody.trim().split(/\n{2,}/).filter(Boolean);
  const originalRtl = originalLang === "ar";
  const tags   = workBody?.tags ?? (seed as { tags?: string[] } | undefined)?.tags ?? [];
  const kudosCount = typeof (w as { kudosCount?: number }).kudosCount === "number"
    ? (w as { kudosCount: number }).kudosCount
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.colors.border }}>
        <TouchableOpacity
          style={{ width: 34, height: 34, borderRadius: T.radius.full, backgroundColor: T.colors.surface, borderWidth: 1, borderColor: T.colors.border, alignItems: "center", justifyContent: "center" }}
          onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: T.colors.text }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Text style={{ color: T.colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>{lang}</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={T.colors.text} size="large" />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 28, paddingBottom: 72 }}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}>

          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
            {/* Accent + type */}
            <View style={{ alignSelf: rtl ? "flex-end" : "flex-start", backgroundColor: `${accent}22`, borderRadius: T.radius.full, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 18 }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: accent, textTransform: "uppercase", letterSpacing: 1.2 }}>
                {(w as { type?: string }).type} · Original {LANG_LABEL[originalLang]}
              </Text>
            </View>
            {translatedLangs.length ? (
              <View style={{ alignSelf: rtl ? "flex-end" : "flex-start", backgroundColor: T.colors.primarySoft, borderRadius: T.radius.full, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12, borderWidth: 1, borderColor: T.colors.border }}>
                <Text style={{ fontSize: 9, fontWeight: "900", color: T.colors.primary, textTransform: "uppercase", letterSpacing: 1 }}>
                  Translated into {translatedLangs.map((code) => LANG_LABEL[code]).join(", ")}
                </Text>
              </View>
            ) : null}

            {/* Title */}
            <Text style={{ fontSize: originalRtl ? 28 : 26, fontWeight: "800", color: T.colors.text, textAlign: originalRtl ? "right" : "left", marginBottom: 6, letterSpacing: -0.5, lineHeight: originalRtl ? 44 : 36 }}>
              {title}
            </Text>
            {translatedTitle ? (
              <Text style={{ fontSize: 17, color: T.colors.primary, textAlign: lang === "ar" ? "right" : "left", marginBottom: 14, fontStyle: "italic" }}>
                {LANG_LABEL[lang]} translation: {translatedTitle}
              </Text>
            ) : null}

            {/* Creator row */}
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <View style={{ width: 26, height: 26, borderRadius: T.radius.full, backgroundColor: `${accent}30`, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: accent }}>
                  {(w as { creator?: { name: string } }).creator?.name?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: T.colors.textMuted }}>
                {(w as { creator?: { name: string } }).creator?.name}
              </Text>
              <Text style={{ fontSize: 11, color: T.colors.textSubtle }}>·</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <KudosMark size={8} color={T.colors.textSubtle} />
                <Text style={{ fontSize: 11, color: T.colors.textSubtle }}>{kudosCount} Cold</Text>
              </View>
            </View>

            {/* Tags */}
            {tags.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {tags.map((t: string) => (
                  <View key={t} style={{ backgroundColor: T.colors.surface, borderRadius: T.radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: T.colors.border }}>
                    <Text style={{ fontSize: 10, color: T.colors.textMuted, textTransform: "capitalize", letterSpacing: 0.3 }}>{t.replace(/-/g, " ")}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* AI Summary toggle */}
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.colors.surface, borderRadius: T.radius.md, borderWidth: 1, borderColor: T.colors.border, padding: 13, marginBottom: 16 }}
              onPress={() => setShowSummary(s => !s)}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 15 }}>✨</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: T.colors.text, flex: 1 }}>
                {showSummary ? t("read.hideSummary") : t("read.aiSummary")}
              </Text>
              <Text style={{ fontSize: 11, color: T.colors.textMuted }}>{showSummary ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {showSummary && (
              <View style={{ backgroundColor: `${accent}08`, borderRadius: T.radius.md, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: `${accent}28` }}>
                {summaryLoading ? (
                  <ActivityIndicator color={accent} size="small" />
                ) : (
                  <Text style={{ fontSize: 14, color: T.colors.text, lineHeight: 24, textAlign: rtl ? "right" : "left" }}>
                    {summaryData?.summary ?? t("read.notFound")}
                  </Text>
                )}
              </View>
            )}

            <View style={{ height: 1, backgroundColor: T.colors.border, marginVertical: 24 }} />

            {/* Body paragraphs */}
            {paras.map((p, i) => (
              <BodyBlock key={i} block={p} rtl={originalRtl} accent={accent} />
            ))}
            {translatedParas.length ? (
              <View style={{ borderTopWidth: 1, borderTopColor: T.colors.border, marginTop: 8, paddingTop: 22 }}>
                <View style={{ alignSelf: lang === "ar" ? "flex-end" : "flex-start", backgroundColor: T.colors.primarySoft, borderRadius: T.radius.full, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 }}>
                  <Text style={{ color: T.colors.primary, fontSize: 11, fontWeight: "900" }}>{LANG_LABEL[lang]} translation</Text>
                </View>
                {translatedParas.map((p, i) => (
                  <BodyBlock key={i} block={p} rtl={lang === "ar"} accent={accent} />
                ))}
              </View>
            ) : null}

            {/* Cold Kudos section */}
            <View style={{ borderRadius: T.radius.xl, borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, padding: 20, marginTop: 16, ...T.shadow.sm }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: T.colors.text, marginBottom: 4, textAlign: rtl ? "right" : "left" }}>
                {t("read.enjoyed")}
              </Text>
              <Text style={{ fontSize: 12, color: T.colors.textMuted, marginBottom: 16, textAlign: rtl ? "right" : "left" }}>
                {t("read.sendKudosHint")}
              </Text>
              <TextInput
                style={{
                  backgroundColor: T.colors.surface, borderRadius: T.radius.md,
                  borderWidth: 1, borderColor: T.colors.border,
                  padding: 12, fontSize: 14, color: T.colors.text,
                  minHeight: 68, marginBottom: 14,
                  textAlign: rtl ? "right" : "left",
                }}
                placeholder={t("read.reviewPlaceholder")}
                placeholderTextColor={T.colors.textSubtle}
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                maxLength={280}
              />
              {kudosDone ? (
                <Text style={{ color: T.colors.green, fontWeight: "700", textAlign: rtl ? "right" : "left", fontSize: 14 }}>
                  ✓ {t("read.thankYou")}
                </Text>
              ) : (
                <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 8 }}>
                  {([1, 2, 3, 5] as const).map(amt => (
                    <TouchableOpacity
                      key={amt}
                      style={{
                        flex: 1, alignItems: "center", borderRadius: T.radius.md,
                        borderWidth: 1, borderColor: T.colors.border,
                        backgroundColor: T.colors.surface, padding: 10,
                        opacity: !session ? 0.4 : 1,
                      }}
                      onPress={() => Alert.alert(
                        `Send ${amt} kudos?`,
                        `This will spend ${amt} token${amt === 1 ? "" : "s"} from your balance.`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Confirm Kudos", onPress: () => sendKudos.mutate({ workId, amount: amt, message: reviewText.trim() || undefined }) },
                        ],
                      )}
                      disabled={sendKudos.isPending || !session}
                      activeOpacity={0.7}>
                      <View style={{ flexDirection: "row", gap: 3, marginBottom: 5 }}>
                        {Array.from({ length: Math.min(amt, 3) }).map((_, index) => <KudosMark key={index} size={9} />)}
                      </View>
                      <Text style={{ fontSize: 10, color: T.colors.textMuted, fontWeight: "600" }}>{amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!session ? (
                <Text style={{ marginTop: 12, fontSize: 12, color: T.colors.textMuted, textAlign: rtl ? "right" : "left" }}>
                  {t("read.signInToKudos")}
                </Text>
              ) : null}
            </View>

            {/* Comments */}
            <View style={{ borderRadius: T.radius.xl, borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, padding: 20, marginTop: 16, ...T.shadow.sm }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: T.colors.text, marginBottom: 4, textAlign: rtl ? "right" : "left" }}>
                Comments
              </Text>
              <Text style={{ fontSize: 12, color: T.colors.textMuted, marginBottom: 14, textAlign: rtl ? "right" : "left" }}>
                Spend 3 kudos to leave a thoughtful note, just like on web.
              </Text>
              <TextInput
                style={{
                  backgroundColor: T.colors.surface,
                  borderRadius: T.radius.md,
                  borderWidth: 1,
                  borderColor: T.colors.border,
                  padding: 12,
                  fontSize: 14,
                  color: T.colors.text,
                  minHeight: 78,
                  marginBottom: 12,
                  textAlign: rtl ? "right" : "left",
                }}
                placeholder="Add a comment..."
                placeholderTextColor={T.colors.textSubtle}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                disabled={!session || addComment.isPending || !commentText.trim()}
                onPress={() => addComment.mutate({ workId, body: commentText.trim() })}
                style={{
                  backgroundColor: T.colors.primary,
                  borderRadius: T.radius.md,
                  paddingVertical: 12,
                  alignItems: "center",
                  opacity: !session || addComment.isPending || !commentText.trim() ? 0.55 : 1,
                }}>
                <Text style={{ color: T.colors.primaryText, fontWeight: "900" }}>
                  {addComment.isPending ? "Posting..." : "Post comment"}
                </Text>
              </TouchableOpacity>
              {!session ? (
                <Text style={{ marginTop: 10, fontSize: 12, color: T.colors.textMuted, textAlign: rtl ? "right" : "left" }}>
                  Sign in to comment.
                </Text>
              ) : null}
              <View style={{ gap: 10, marginTop: 18 }}>
                {comments?.length ? comments.map((comment) => (
                  <View key={comment.id} style={{ backgroundColor: T.colors.surface, borderRadius: T.radius.md, padding: 14, borderWidth: 1, borderColor: T.colors.border }}>
                    <Text style={{ color: T.colors.text, fontWeight: "800", fontSize: 13 }}>
                      {comment.author?.name ?? t("common.anonymous")}
                    </Text>
                    <Text style={{ color: T.colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
                      {comment.body}
                    </Text>
                  </View>
                )) : (
                  <Text style={{ fontSize: 13, color: T.colors.textMuted, textAlign: "center", paddingVertical: 10 }}>
                    No comments yet.
                  </Text>
                )}
              </View>
            </View>

            {/* Kudos activity */}
            <View style={{ marginTop: 20, gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: T.colors.text, letterSpacing: 0.2 }}>
                {t("read.kudosActivity")}
              </Text>
              {kudosHistory && kudosHistory.length > 0 ? kudosHistory.map((k) => (
                <View key={k.id} style={{ backgroundColor: T.colors.card, borderRadius: T.radius.md, padding: 14, borderWidth: 1, borderColor: T.colors.border }}>
                  <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: k.message ? 8 : 0 }}>
                    <Text style={{ fontSize: 12, color: T.colors.textMuted }}>
                      {k.giver?.name ?? t("common.anonymous")}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <KudosMark size={8} />
                      <Text style={{ fontSize: 11, color: T.colors.amber, fontWeight: "700" }}>{k.amount} Cold</Text>
                    </View>
                  </View>
                  {k.message ? (
                    <Text style={{ fontSize: 14, color: T.colors.text, lineHeight: 22, textAlign: rtl ? "right" : "left" }}>
                      {k.message}
                    </Text>
                  ) : null}
                </View>
              )) : (
                <Text style={{ fontSize: 13, color: T.colors.textMuted, textAlign: "center", paddingVertical: 20 }}>
                  {t("read.noKudosYet")}
                </Text>
              )}
            </View>
          </Animated.View>
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}
