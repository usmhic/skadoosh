import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator, Alert, Animated, StatusBar, Appearance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";
import { languageMeta, supportedLanguages, type AppLanguage } from "@skaddosh/i18n";

type P = NativeStackScreenProps<RootStackParams, "Settings">;
type Tab = "profile" | "preferences" | "notifications" | "privacy";
type Lang = AppLanguage;
type ThemeMode = "system" | "dark" | "light";

const CATEGORIES = [
  "fiction","non-fiction","poetry","intellectual-property",
  "science","philosophy","culture","technology","history","art","music","film",
];

export function SettingsScreen({ navigation }: P) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("profile");
  const utils = trpc.useUtils();

  const { data: meData, isLoading } = trpc.users.me.useQuery();
  const me = meData?.user;
  const settings = meData?.settings;

  const [name, setName]             = useState("");
  const [username, setUsername]     = useState("");
  const [bio, setBio]               = useState("");
  const [website, setWebsite]       = useState("");
  const [location, setLocation]     = useState("");
  const [preferredLang, setPreferredLang] = useState<Lang>(() => {
    const code = i18n.language?.split("-")[0] as Lang | undefined;
    return code && supportedLanguages.includes(code) ? code : "en";
  });
  const [languageOpen, setLanguageOpen] = useState(false);
  const [profilePublic, setProfilePublic] = useState(settings?.profilePublic ?? true);
  const [showKudos, setShowKudos]         = useState(settings?.showKudosBalance ?? true);
  const [emailNotif, setEmailNotif]       = useState(settings?.emailNotifications ?? true);
  const [marketingEmails, setMarketingEmails] = useState(settings?.marketingEmails ?? false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [selectedCats, setSelectedCats]   = useState<string[]>(() => {
    try { return JSON.parse(settings?.contentCategories ?? "[]") as string[]; } catch { return []; }
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setUsername((me as { username?: string }).username ?? "");
    setBio((me as { bio?: string }).bio ?? "");
    setWebsite((me as { website?: string }).website ?? "");
    setLocation((me as { location?: string }).location ?? "");
  }, [me]);

  useEffect(() => {
    if (!settings) return;
    const lang = (settings.preferredLang ?? "en") as Lang;
    setPreferredLang(lang);
    void i18n.changeLanguage(lang);
    setProfilePublic(settings.profilePublic ?? true);
    setShowKudos(settings.showKudosBalance ?? true);
    setEmailNotif(settings.emailNotifications ?? true);
    setMarketingEmails(settings.marketingEmails ?? false);
    try { setSelectedCats(JSON.parse(settings.contentCategories ?? "[]") as string[]); } catch { setSelectedCats([]); }
  }, [settings]);

  const updateProfile  = trpc.users.updateProfile.useMutation({
    onSuccess: () => { void utils.users.me.invalidate(); Alert.alert(t("mobile.saved"), t("mobile.profileUpdated")); },
    onError: (e) => Alert.alert("Error", e.message),
  });
  const updateSettings = trpc.users.updateSettings.useMutation({
    onSuccess: () => { void utils.users.me.invalidate(); Alert.alert(t("mobile.saved"), t("mobile.settingsUpdated")); },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const toggleCat = (cat: string) =>
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "profile", label: t("common.profile") },
    { key: "preferences", label: t("common.preferences") },
    { key: "notifications", label: "Alerts" },
    { key: "privacy", label: t("common.privacy") },
  ];

  const saveSettings = () => updateSettings.mutate({
    preferredLang,
    emailNotifications: emailNotif,
    marketingEmails,
    profilePublic,
    showKudosBalance: showKudos,
    contentCategories: selectedCats,
  });

  const setThemePreference = (mode: ThemeMode) => {
    setThemeMode(mode);
    Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
  };

  const chooseLanguage = (lang: Lang) => {
    setPreferredLang(lang);
    setLanguageOpen(false);
    void i18n.changeLanguage(lang);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.colors.border }}>
        <TouchableOpacity
          style={{ width: 34, height: 34, borderRadius: T.radius.full, backgroundColor: T.colors.surface, borderWidth: 1, borderColor: T.colors.border, alignItems: "center", justifyContent: "center" }}
          onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 16, color: T.colors.text }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700", color: T.colors.text, letterSpacing: -0.2 }}>{t("common.settings")}</Text>
      </View>

      {/* Tab bar */}
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: T.colors.border }}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={{ flex: 1, paddingVertical: 13, alignItems: "center", borderBottomWidth: 2, borderBottomColor: tab === t.key ? T.colors.primary : "transparent" }}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: tab === t.key ? T.colors.text : T.colors.textMuted, letterSpacing: 0.1 }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={T.colors.text} />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={{ padding: 20, gap: 14 }}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}>

          {/* PROFILE TAB */}
          {tab === "profile" && (
            <>
              <Field label={t("common.fullName")}  value={name}     onChange={setName}     placeholder={t("common.fullName")} />
              <Field label={t("common.username")}   value={username} onChange={setUsername} placeholder={t("mobile.usernamePlaceholder")} prefix="@" />
              <Field label={t("common.bio")}        value={bio}      onChange={setBio}      placeholder={t("mobile.bioPlaceholder")} multiline />
              <Field label={t("common.website")}    value={website}  onChange={setWebsite}  placeholder={t("mobile.websitePlaceholder")} />
              <Field label={t("common.location")}   value={location} onChange={setLocation} placeholder={t("mobile.locationPlaceholder")} />
              <SaveButton
                label={updateProfile.isPending ? t("mobile.saving") : t("common.saveProfile")}
                disabled={updateProfile.isPending}
                onPress={() => updateProfile.mutate({ name, username, bio, website, location })}
              />
            </>
          )}

          {/* PREFERENCES TAB */}
          {tab === "preferences" && (
            <>
              <SettingsGroup title="Display">
                <SettingTile
                  title="Theme"
                  description={`Current: ${themeMode === "system" ? "System" : themeMode === "dark" ? "Dark" : "Light"}`}
                  icon="◐"
                  onPress={() => {
                    const next: ThemeMode = themeMode === "system" ? "dark" : themeMode === "dark" ? "light" : "system";
                    setThemePreference(next);
                  }}
                  trailing={<Text style={{ color: T.colors.textMuted, fontSize: 18 }}>›</Text>}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setThemePreference(mode)}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        borderRadius: T.radius.md,
                        borderWidth: 1,
                        borderColor: themeMode === mode ? T.colors.primary : T.colors.border,
                        backgroundColor: themeMode === mode ? T.colors.primarySoft : T.colors.surface,
                        paddingVertical: 10,
                      }}>
                      <Text style={{ color: themeMode === mode ? T.colors.primary : T.colors.textMuted, fontSize: 12, fontWeight: "900", textTransform: "capitalize" }}>{mode}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.lg, backgroundColor: T.colors.card, overflow: "hidden" }}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setLanguageOpen((open) => !open)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                    <View style={{ width: 36, height: 36, borderRadius: T.radius.md, backgroundColor: T.colors.primarySoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: T.colors.border }}>
                      <Text style={{ color: T.colors.primary, fontSize: 12, fontWeight: "900" }}>{languageMeta[preferredLang].short}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: T.colors.text, fontWeight: "800", fontSize: 14 }}>{t("common.interfaceLanguage")}</Text>
                      <Text style={{ color: T.colors.textMuted, fontSize: 12, marginTop: 2 }}>{languageMeta[preferredLang].label}</Text>
                    </View>
                    <Text style={{ color: T.colors.textMuted, fontSize: 16 }}>{languageOpen ? "⌃" : "⌄"}</Text>
                  </TouchableOpacity>
                  {languageOpen ? (
                    <View style={{ borderTopWidth: 1, borderTopColor: T.colors.border, padding: 8, gap: 6 }}>
                      {supportedLanguages.map((code) => (
                        <TouchableOpacity
                          key={code}
                          activeOpacity={0.75}
                          onPress={() => chooseLanguage(code)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderRadius: T.radius.md,
                            paddingHorizontal: 12,
                            paddingVertical: 11,
                            backgroundColor: preferredLang === code ? T.colors.primarySoft : "transparent",
                          }}>
                          <Text style={{ color: preferredLang === code ? T.colors.text : T.colors.textMuted, fontSize: 13, fontWeight: "800" }}>{languageMeta[code].label}</Text>
                          <Text style={{ color: T.colors.textMuted, fontSize: 11, fontWeight: "900" }}>{languageMeta[code].short}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              </SettingsGroup>

              <SettingsGroup title="Reading">
                <SettingTile
                  title="Preferred categories"
                  description={`${selectedCats.length} selected`}
                  icon="#"
                  trailing={<Text style={{ color: T.colors.textMuted, fontSize: 18 }}>›</Text>}
                />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 2 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: T.radius.full,
                        borderWidth: 1,
                        borderColor: selectedCats.includes(cat) ? T.colors.primary : T.colors.border,
                        backgroundColor: selectedCats.includes(cat) ? T.colors.primarySoft : T.colors.surface,
                      }}
                      onPress={() => toggleCat(cat)}
                      activeOpacity={0.7}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: selectedCats.includes(cat) ? T.colors.primary : T.colors.textMuted, textTransform: "capitalize" }}>
                        {cat.replace(/-/g, " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </SettingsGroup>

              <SaveButton
                label={updateSettings.isPending ? t("mobile.saving") : t("common.savePreferences")}
                disabled={updateSettings.isPending}
                onPress={saveSettings}
              />
            </>
          )}

          {/* NOTIFICATIONS TAB */}
          {tab === "notifications" && (
            <>
              <SettingsGroup title="Notifications">
                <SettingTile
                  title="Activity notifications"
                  description="Kudos, comments, portfolio messages, and account updates."
                  icon="!"
                  trailing={<Switch value={emailNotif} onValueChange={setEmailNotif} trackColor={{ false: T.colors.border, true: T.colors.primarySoft }} thumbColor={emailNotif ? T.colors.primary : T.colors.textMuted} />}
                />
                <SettingTile
                  title="Marketing emails"
                  description="Product updates, featured works, and creator announcements."
                  icon="*"
                  trailing={<Switch value={marketingEmails} onValueChange={setMarketingEmails} trackColor={{ false: T.colors.border, true: T.colors.primarySoft }} thumbColor={marketingEmails ? T.colors.primary : T.colors.textMuted} />}
                />
              </SettingsGroup>
              <SaveButton
                label={updateSettings.isPending ? t("mobile.saving") : "Save notifications"}
                disabled={updateSettings.isPending}
                onPress={saveSettings}
              />
            </>
          )}

          {/* PRIVACY TAB */}
          {tab === "privacy" && (
            <>
              <SettingsGroup title="Privacy">
                <SettingTile
                  title={t("mobile.publicProfile")}
                  description={t("mobile.publicProfileDesc")}
                  icon="◎"
                  trailing={<Switch value={profilePublic} onValueChange={setProfilePublic} trackColor={{ false: T.colors.border, true: T.colors.primarySoft }} thumbColor={profilePublic ? T.colors.primary : T.colors.textMuted} />}
                />
                <SettingTile
                  title={t("mobile.showKudosBalance")}
                  description={t("mobile.showKudosBalanceDesc")}
                  icon="K"
                  trailing={<Switch value={showKudos} onValueChange={setShowKudos} trackColor={{ false: T.colors.border, true: T.colors.primarySoft }} thumbColor={showKudos ? T.colors.primary : T.colors.textMuted} />}
                />
              </SettingsGroup>
              <SaveButton
                label={updateSettings.isPending ? t("mobile.saving") : t("common.savePrivacy")}
                disabled={updateSettings.isPending}
                onPress={saveSettings}
              />
            </>
          )}
          <View style={{ height: 20 }} />
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 9 }}>
      <SectionTitle>{title}</SectionTitle>
      <View style={{ gap: 9 }}>{children}</View>
    </View>
  );
}

function SettingTile({
  title,
  description,
  icon,
  trailing,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={{ width: 36, height: 36, borderRadius: T.radius.md, backgroundColor: T.colors.primarySoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: T.colors.border }}>
        <Text style={{ color: T.colors.primary, fontSize: 15, fontWeight: "900" }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: T.colors.text, fontSize: 14, fontWeight: "800" }}>{title}</Text>
        <Text style={{ color: T.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 }}>{description}</Text>
      </View>
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: T.colors.card, borderRadius: T.radius.lg, borderWidth: 1, borderColor: T.colors.border, padding: 14 }}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: T.colors.card, borderRadius: T.radius.lg, borderWidth: 1, borderColor: T.colors.border, padding: 14 }}>
      {content}
    </View>
  );
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <Text style={[{ fontSize: 11, fontWeight: "700", color: T.colors.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }, style]}>
      {children}
    </Text>
  );
}

function SaveButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: disabled ? T.colors.surface : T.colors.text,
        borderRadius: T.radius.md, paddingVertical: 14, alignItems: "center",
        borderWidth: 1, borderColor: disabled ? T.colors.border : "transparent",
        marginTop: 4,
      }}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.8}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: disabled ? T.colors.textMuted : T.colors.primaryText }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChange, placeholder, prefix, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; prefix?: string; multiline?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: T.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {label}
      </Text>
      <View style={{
        flexDirection: "row", alignItems: multiline ? "flex-start" : "center",
        backgroundColor: T.colors.surface, borderRadius: T.radius.md,
        borderWidth: 1, borderColor: focused ? T.colors.borderFocus : T.colors.border,
        paddingHorizontal: 12,
      }}>
        {prefix && <Text style={{ fontSize: 14, color: T.colors.textMuted, paddingVertical: 13 }}>{prefix}</Text>}
        <TextInput
          style={{ flex: 1, fontSize: 14, color: T.colors.text, paddingVertical: 13, minHeight: multiline ? 76 : undefined }}
          placeholder={placeholder}
          placeholderTextColor={T.colors.textSubtle}
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}
