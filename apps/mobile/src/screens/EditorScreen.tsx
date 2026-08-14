import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import { SEED_WORKS } from "../../../../packages/db/src/seed-data";
import type { RootStackParams } from "@/navigation";
import { languageMeta, supportedLanguages, type AppLanguage } from "@skaddosh/i18n";

type P = NativeStackScreenProps<RootStackParams, "Editor">;
type Lang = AppLanguage;
const BMAP: Record<Lang,"bodyAr"|"bodyEn"|"bodyFr"|"bodyEs"> = {ar:"bodyAr",en:"bodyEn",fr:"bodyFr",es:"bodyEs"};

export function EditorScreen({ route, navigation }: P) {
  const { t, i18n } = useTranslation();
  const { workId } = route.params;
  const seed = SEED_WORKS.find(w => w.id === workId);
  const browserLang = (supportedLanguages.includes(i18n.language?.split("-")[0] as Lang)
    ? i18n.language.split("-")[0]
    : "en") as Lang;
  const [active, setActive] = useState<Lang>(browserLang);
  const [titles, setTitles] = useState<Record<Lang,string>>({ ar:seed?.title.ar??"", en:seed?.title.en??"", fr:seed?.title.fr??"", es:seed?.title.es??"" });
  const [subtitles, setSubtitles] = useState<Record<Lang,string>>({ ar:seed?.tag.ar??"", en:seed?.tag.en??"", fr:seed?.tag.fr??"", es:seed?.tag.es??"" });
  const seedSummary = (seed as { summary?: Record<Lang, string> } | undefined)?.summary;
  const [summaries, setSummaries] = useState<Record<Lang,string>>({ ar:seedSummary?.ar??"", en:seedSummary?.en??"", fr:seedSummary?.fr??"", es:seedSummary?.es??"" });
  const [bodies, setBodies] = useState<Record<Lang,string>>({ ar:seed?.bodyAr??"", en:seed?.bodyEn??"", fr:(seed as { bodyFr?: string } | undefined)?.bodyFr??"", es:(seed as { bodyEs?: string } | undefined)?.bodyEs??"" });
  const [published, setPublished] = useState(Boolean(seed?.published));
  const [accentColor, setAccentColor] = useState(seed?.accentColor ?? T.colors.primary);
  const [tagsCSV, setTagsCSV] = useState(((seed as { tags?: string[] } | undefined)?.tags ?? []).join(", "));
  const [saved, setSaved] = useState(false);
  const rtl = active === "ar";

  const mine = trpc.works.mine.useQuery();
  const work = mine.data?.find((item) => item.id === workId);
  const update = trpc.works.update.useMutation({ onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); } });

  useEffect(() => {
    if (!work) return;
    setTitles({
      ar: work.title.ar ?? "",
      en: work.title.en ?? "",
      fr: work.title.fr ?? "",
      es: work.title.es ?? "",
    });
    setSubtitles({
      ar: work.tag.ar ?? "",
      en: work.tag.en ?? "",
      fr: work.tag.fr ?? "",
      es: work.tag.es ?? "",
    });
    setSummaries({
      ar: work.summary.ar ?? "",
      en: work.summary.en ?? "",
      fr: work.summary.fr ?? "",
      es: work.summary.es ?? "",
    });
    setBodies({
      ar: work.bodyAr ?? "",
      en: work.bodyEn ?? "",
      fr: work.bodyFr ?? "",
      es: work.bodyEs ?? "",
    });
    setPublished(Boolean(work.published));
    setAccentColor(work.accentColor || T.colors.primary);
    setTagsCSV((work.tags ?? []).join(", "));
  }, [work?.id]);

  const wordCount = bodies[active].trim().split(/\s+/).filter(Boolean).length;
  const tags = tagsCSV.split(",").map((tag: string) => tag.trim()).filter(Boolean).slice(0, 8);
  const save = () => update.mutate({
    id: workId,
    titleAr: titles.ar,
    titleEn: titles.en,
    titleFr: titles.fr,
    titleEs: titles.es,
    tagAr: subtitles.ar,
    tagEn: subtitles.en,
    tagFr: subtitles.fr,
    tagEs: subtitles.es,
    summaryAr: summaries.ar,
    summaryEn: summaries.en,
    summaryFr: summaries.fr,
    summaryEs: summaries.es,
    bodyAr: bodies.ar,
    bodyEn: bodies.en,
    bodyFr: bodies.fr,
    bodyEs: bodies.es,
    accentColor,
    published,
    tags,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.colors.border }}>
        <TouchableOpacity
          style={{ width: 34, height: 34, borderRadius: T.radius.full, backgroundColor: T.colors.surface, borderWidth: 1, borderColor: T.colors.border, alignItems: "center", justifyContent: "center" }}
          onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: T.colors.text }}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={{ flex: 1, fontSize: 15, fontWeight: "700", color: T.colors.text, textAlign: rtl ? "right" : "left" }}
          value={titles[active]}
          onChangeText={v => setTitles(t => ({...t, [active]: v}))}
          placeholder={t("mobile.titlePlaceholder")}
          placeholderTextColor={T.colors.textSubtle}
        />
        <TouchableOpacity
          style={{
            backgroundColor: saved ? T.colors.green : T.colors.text,
            borderRadius: T.radius.md, paddingHorizontal: 16, paddingVertical: 8,
            opacity: update.isPending ? 0.6 : 1,
            ...T.shadow.sm,
          }}
          onPress={save}
          disabled={update.isPending}
          activeOpacity={0.8}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: T.colors.primaryText }}>
            {saved ? `✓ ${t("mobile.saved")}` : update.isPending ? t("mobile.saving") : t("mobile.save")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Translation tabs */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.colors.border, alignItems: "center" }}>
        {supportedLanguages.map((code) => (
          <TouchableOpacity
            key={code}
            onPress={() => setActive(code)}
            activeOpacity={0.75}
            style={{
              minWidth: 42,
              alignItems: "center",
              borderRadius: T.radius.full,
              paddingHorizontal: 10,
              paddingVertical: 7,
              backgroundColor: active === code ? T.colors.text : T.colors.surface,
              borderWidth: 1,
              borderColor: active === code ? T.colors.text : T.colors.border,
            }}>
            <Text style={{ color: active === code ? T.colors.primaryText : T.colors.textMuted, fontSize: 11, fontWeight: "900" }}>
              {languageMeta[code].short}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 11, color: T.colors.textMuted }}>Published</Text>
        <Switch value={published} onValueChange={setPublished} trackColor={{ false: T.colors.border, true: T.colors.primarySoft }} thumbColor={published ? T.colors.primary : T.colors.textMuted} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: bodies[active].trim().length > 0 ? T.colors.green : T.colors.border }} />
          <Text style={{ fontSize: 10, color: T.colors.textMuted }}>{wordCount} w</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 10 }} style={{ borderBottomWidth: 1, borderBottomColor: T.colors.border, maxHeight: 92 }}>
        <MetaField label="Subtitle" value={subtitles[active]} onChange={(v) => setSubtitles((current) => ({ ...current, [active]: v }))} width={220} />
        <MetaField label="Summary" value={summaries[active]} onChange={(v) => setSummaries((current) => ({ ...current, [active]: v }))} width={260} />
        <MetaField label="Tags" value={tagsCSV} onChange={setTagsCSV} width={220} />
        <MetaField label="Accent" value={accentColor} onChange={setAccentColor} width={120} />
      </ScrollView>

      {/* Body editor */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <TextInput
          value={bodies[active]}
          onChangeText={v => setBodies(b => ({...b, [active]: v}))}
          multiline
          textAlign={rtl ? "right" : "left"}
          textAlignVertical="top"
          style={{ flex: 1, paddingHorizontal: 22, paddingVertical: 20, fontSize: rtl ? 18 : 17, color: T.colors.text, lineHeight: rtl ? 40 : 32 }}
          placeholder={t("mobile.writeHere")}
          placeholderTextColor={T.colors.textSubtle}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MetaField({ label, value, onChange, width }: { label: string; value: string; onChange: (value: string) => void; width: number }) {
  return (
    <View style={{ width, gap: 5 }}>
      <Text style={{ fontSize: 10, fontWeight: "800", color: T.colors.textMuted, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={{ minHeight: 38, borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, backgroundColor: T.colors.card, color: T.colors.text, paddingHorizontal: 10, fontSize: 13 }}
        placeholderTextColor={T.colors.textSubtle}
      />
    </View>
  );
}
