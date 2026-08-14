import React, { useState } from "react";
import { Linking, View, Text, TouchableOpacity, ScrollView, Image, StatusBar, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { trpc } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "Portfolio">;

function Pill({ label }: { label: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.full, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ color: T.colors.textMuted, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function EmptyImage() {
  return (
    <View style={{ height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: T.colors.surface }}>
      <Text style={{ color: T.colors.textMuted, fontSize: 12 }}>No image</Text>
    </View>
  );
}

export function PortfolioScreen({ navigation, route }: P) {
  const username = route.params?.username;
  const mine = trpc.portfolios.mine.useQuery(undefined, { enabled: !username });
  const byUsername = trpc.portfolios.byUsername.useQuery({ username: username || "" }, { enabled: !!username });
  const profile = username
    ? byUsername.data
    : mine.data?.exists
      ? { ...mine.data.portfolio, works: mine.data.works }
      : null;
  const loading = username ? byUsername.isPending : mine.isPending;
  const [search, setSearch] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("Project inquiry");
  const [contactBody, setContactBody] = useState("");
  const [sent, setSent] = useState(false);
  const searchQuery = search.trim();
  const portfolioSearch = trpc.portfolios.searchPublic.useQuery(
    { username: profile?.username || username || "", query: searchQuery || "portfolio" },
    { enabled: Boolean(profile?.username && searchQuery.length >= 2) },
  );
  const submitContact = trpc.portfolios.submitContact.useMutation({
    onSuccess: () => {
      setSent(true);
      setContactName("");
      setContactEmail("");
      setContactBody("");
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ color: T.colors.textMuted }}>Loading portfolio...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ color: T.colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" }}>No portfolio yet</Text>
        <Text style={{ color: T.colors.textMuted, fontSize: 13, lineHeight: 21, textAlign: "center", marginTop: 8 }}>
          Create your skaddosh portfolio to publish story, experience, education, skills, contact, and analytics.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("EditPortfolio", {})}
          style={{ marginTop: 18, backgroundColor: T.colors.primary, borderRadius: T.radius.md, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: T.colors.primaryText, fontWeight: "800" }}>Edit Portfolio</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const content = profile.content;
  const cfg = content.siteConfig;
  const accent = profile.customization?.accentColor || T.colors.primary;
  const timeline = content.timeline || [];
  const research = content.research || [];
  const hobbies = content.hobbies || [];
  const visibleSections = (profile.customization?.visibleSections?.length
    ? profile.customization.visibleSections
    : ["about", "articles", "contact"]
  ).filter((section) => ["about", "articles", "contact"].includes(section));
  const isVisible = (section: string) => visibleSections.includes(section as never);
  const works = profile.works ?? [];
  const sendContact = () => {
    setSent(false);
    submitContact.mutate({
      username: profile.username,
      kind: "contact",
      subject: contactSubject,
      from: { name: contactName, email: contactEmail },
      body: contactBody,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingVertical: 8, paddingRight: 12 }}>
            <Text style={{ color: T.colors.textMuted }}>‹ Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <View style={{ width: 34, height: 34, borderRadius: T.radius.md, backgroundColor: accent, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>{cfg.initials || profile.displayName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: T.colors.text, fontSize: 13, fontWeight: "900" }}>{profile.displayName}</Text>
              <Text numberOfLines={1} style={{ color: T.colors.textMuted, fontSize: 10 }}>skaddosh/portfolio/{profile.username}</Text>
            </View>
          </View>
          {!username || username === mine.data?.portfolio.username ? (
            <TouchableOpacity onPress={() => navigation.navigate("EditPortfolio", { username: profile.username })}>
              <Text style={{ color: T.colors.text, fontWeight: "700" }}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ minHeight: 420, justifyContent: "center", gap: 22 }}>
          <View style={{
            width: 72,
            height: 72,
            borderRadius: T.radius.xl,
            backgroundColor: accent,
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>{cfg.initials || profile.displayName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={{ color: T.colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>
              {cfg.location || `@${profile.username}`}
            </Text>
            <Text style={{ color: T.colors.text, fontSize: 48, lineHeight: 50, fontWeight: "900", letterSpacing: -2, marginTop: 12 }}>
              {cfg.firstName || profile.displayName}
            </Text>
            {cfg.lastName ? (
              <Text style={{ color: T.colors.textMuted, fontSize: 48, lineHeight: 50, fontWeight: "300", fontStyle: "italic", letterSpacing: -2 }}>
                {cfg.lastName}
              </Text>
            ) : null}
            <Text style={{ color: T.colors.textMuted, fontSize: 15, lineHeight: 24, marginTop: 16 }}>
              {cfg.tagline || profile.prompt}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            <View style={{ borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, borderRadius: T.radius.xl, padding: 12, gap: 8, ...T.shadow.sm }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search story, research, articles, timeline..."
              placeholderTextColor={T.colors.textMuted}
              style={{
                minHeight: 46,
                borderRadius: T.radius.md,
                borderWidth: 1,
                borderColor: T.colors.border,
                backgroundColor: T.colors.background,
                color: T.colors.text,
                paddingHorizontal: 14,
              }}
            />
            {searchQuery.length >= 2 ? (
              <View style={{ gap: 8 }}>
                {portfolioSearch.data?.results.length ? portfolioSearch.data.results.map((result) => (
                  <TouchableOpacity
                    key={`${result.type}-${result.href}-${result.title}`}
                    onPress={() => {
                      if (result.href.startsWith("http")) Linking.openURL(result.href);
                    }}
                    style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, backgroundColor: T.colors.card, padding: 12 }}>
                    <Text style={{ color: T.colors.text, fontWeight: "800" }}>{result.title}</Text>
                    <Text style={{ color: T.colors.textMuted, fontSize: 11, marginTop: 3 }}>{result.type}</Text>
                    <Text style={{ color: T.colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>{result.description || "Open result"}</Text>
                  </TouchableOpacity>
                )) : (
                  <Text style={{ color: T.colors.textMuted, fontSize: 12 }}>{portfolioSearch.isFetching ? "Searching..." : "No matching items yet."}</Text>
                )}
              </View>
            ) : null}
            </View>
          </View>
          <View style={{ height: 260, borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: T.colors.border }}>
            {content.heroImage.url || cfg.avatar ? (
              <Image source={{ uri: content.heroImage.url || cfg.avatar }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <EmptyImage />
            )}
          </View>
        </View>

        {isVisible("about") ? (
        <Section title={content.aboutStory.whoAmI.title || "About"} eyebrow={content.aboutStory.whoAmI.label}>
          <Text style={{ color: T.colors.textMuted, fontSize: 14, lineHeight: 23 }}>{content.aboutStory.whoAmI.body}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            {content.aboutStory.whatIDo.pillars.map((pillar) => <Pill key={pillar.k} label={`${pillar.k}: ${pillar.v}`} />)}
          </View>
        </Section>
        ) : null}

        {isVisible("articles") && works.length ? (
          <Section title="Published work" eyebrow="03 - Articles">
            <View style={{ gap: 10 }}>
              {works.map((work: any) => (
                <TouchableOpacity
                  key={work.id}
                  onPress={() => navigation.navigate("Read", { workId: work.id })}
                  style={{ borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, borderRadius: T.radius.lg, padding: 16 }}>
                  <Text style={{ color: work.accentColor || accent, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" }}>{work.type}</Text>
                  <Text style={{ color: T.colors.text, fontSize: 17, fontWeight: "800", marginTop: 8 }}>
                    {work.title?.en || work.title?.ar || "Untitled"}
                  </Text>
                  <Text style={{ color: T.colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 6 }}>{work.tag?.en || work.tag?.ar || ""}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>
        ) : null}

        {isVisible("about") && timeline.length ? (
          <Section title="Journey" eyebrow="03 - Timeline">
            <View style={{ gap: 10 }}>
              {timeline.map((item) => (
                <View key={item.id} style={{ borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, borderRadius: T.radius.lg, padding: 16 }}>
                  <Text style={{ color: accent, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" }}>{item.year} · {item.type}</Text>
                  <Text style={{ color: T.colors.text, fontSize: 17, fontWeight: "800", marginTop: 8 }}>{item.title}</Text>
                  <Text style={{ color: T.colors.textMuted, fontSize: 12, marginTop: 3 }}>{item.org}</Text>
                  <Text style={{ color: T.colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 6 }}>{item.description}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {isVisible("about") && research.length ? (
          <Section title="Research" eyebrow="04 - Research">
            <View style={{ gap: 10 }}>
              {research.map((item) => (
                <View key={item.id} style={{ borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, borderRadius: T.radius.lg, padding: 16 }}>
                  <Text style={{ color: accent, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" }}>{item.field || item.status}</Text>
                  <Text style={{ color: T.colors.text, fontSize: 17, fontWeight: "800", marginTop: 8 }}>{item.title}</Text>
                  <Text style={{ color: T.colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 6 }}>{item.description}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {hobbies.length ? (
          <Section title="Off the clock" eyebrow="05 - Human layer">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {hobbies.map((item) => (
                <View key={item.id} style={{ width: "47%", borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, borderRadius: T.radius.lg, padding: 14 }}>
                  <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                  <Text style={{ color: T.colors.text, fontSize: 15, fontWeight: "800", marginTop: 8 }}>{item.title}</Text>
                  <Text style={{ color: T.colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{item.description}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {isVisible("contact") ? (
        <Section title="Start a conversation" eyebrow="06 - Contact">
          <View style={{ gap: 10, borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.card, borderRadius: T.radius.lg, padding: 16 }}>
            {cfg.email ? (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${cfg.email}`)}>
                <Text style={{ color: accent, fontWeight: "800" }}>{cfg.email}</Text>
              </TouchableOpacity>
            ) : null}
            <ContactField label="Name" value={contactName} onChange={setContactName} />
            <ContactField label="Email" value={contactEmail} onChange={setContactEmail} />
            <ContactField label="Subject" value={contactSubject} onChange={setContactSubject} />
            <ContactField label="Message" value={contactBody} onChange={setContactBody} multiline />
            {sent ? <Text style={{ color: T.colors.green, fontSize: 12 }}>Message saved to the portfolio inbox.</Text> : null}
            {submitContact.error ? <Text style={{ color: T.colors.red, fontSize: 12 }}>{submitContact.error.message}</Text> : null}
            <TouchableOpacity
              disabled={submitContact.isPending || !contactName || !contactEmail || !contactBody}
              onPress={sendContact}
              style={{ backgroundColor: T.colors.primary, borderRadius: T.radius.md, padding: 14, alignItems: "center", opacity: submitContact.isPending || !contactName || !contactEmail || !contactBody ? 0.6 : 1 }}>
              <Text style={{ color: T.colors.primaryText, fontWeight: "900" }}>{submitContact.isPending ? "Sending..." : "Send message"}</Text>
            </TouchableOpacity>
          </View>
        </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingTop: 42 }}>
      <Text style={{ color: T.colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>
        {eyebrow}
      </Text>
      <Text style={{ color: T.colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -1, marginBottom: 14 }}>{title}</Text>
      {children}
    </View>
  );
}

function ContactField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: T.colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 92 : 44,
          borderRadius: T.radius.md,
          borderWidth: 1,
          borderColor: T.colors.border,
          backgroundColor: T.colors.background,
          color: T.colors.text,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          fontSize: 14,
        }}
        placeholderTextColor={T.colors.textMuted}
      />
    </View>
  );
}
