import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, StatusBar, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import { mobileConfig } from "@/config/mobile-env";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "EditPortfolio">;
type Draft = any;
const PORTFOLIO_SECTIONS = ["about", "articles", "contact"] as const;
const CUSTOM_DOMAIN_TARGET = (() => {
  try {
    return new URL(mobileConfig.apiBaseUrl).hostname;
  } catch {
    return "skaddosh";
  }
})();

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function joinCsv(value?: string[]) {
  return (value ?? []).join(", ");
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: T.colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        editable={!disabled}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 92 : 46,
          borderRadius: T.radius.md,
          borderWidth: 1,
          borderColor: T.colors.border,
          backgroundColor: T.colors.background,
          color: T.colors.text,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          fontSize: 14,
          lineHeight: multiline ? 21 : undefined,
          opacity: disabled ? 0.6 : 1,
        }}
        placeholderTextColor={T.colors.textMuted}
      />
    </View>
  );
}

export function EditPortfolioScreen({ navigation, route }: P) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const mine = trpc.portfolios.mine.useQuery(undefined, { enabled: !!session });
  const analytics = trpc.portfolios.analyticsMine.useQuery(undefined, { enabled: !!session });
  const savePortfolio = trpc.portfolios.saveMine.useMutation({
    onSuccess: async (saved) => {
      setDraft((current: Draft) => current ? { ...current, ...saved } : current);
      setStatus("Saved");
      await utils.portfolios.mine.invalidate();
    },
    onError: (error) => setStatus(error.message),
  });

  const [draft, setDraft] = useState<Draft>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (mine.data?.portfolio) {
      setDraft({
        ...mine.data.portfolio,
        username: mine.data.exists ? mine.data.portfolio.username : route.params?.username || mine.data.portfolio.username,
        premium: mine.data.premium,
        published: true,
      });
    }
  }, [mine.data, route.params?.username]);

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ color: T.colors.text, fontSize: 18, fontWeight: "800" }}>Sign in to edit your portfolio.</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={{ marginTop: 18, backgroundColor: T.colors.primary, borderRadius: T.radius.md, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: T.colors.primaryText, fontWeight: "800" }}>Sign in</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (mine.error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ color: T.colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" }}>Portfolio could not load</Text>
        <Text style={{ color: T.colors.textMuted, textAlign: "center" }}>{mine.error.message}</Text>
        <TouchableOpacity onPress={() => mine.refetch()} style={{ backgroundColor: T.colors.primary, borderRadius: T.radius.md, paddingHorizontal: 18, paddingVertical: 12 }}>
          <Text style={{ color: T.colors.primaryText, fontWeight: "900" }}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (mine.isPending || !draft) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ color: T.colors.textMuted }}>Loading editor...</Text>
      </SafeAreaView>
    );
  }

  const content = draft.content;
  const updateDraft = (patch: Partial<Draft>) => setDraft((current: Draft) => current ? { ...current, ...patch } : current);
  const updateContent = (patch: Partial<Draft["content"]>) => updateDraft({ content: { ...content, ...patch } });
  const updateSite = (patch: Partial<Draft["content"]["siteConfig"]>) => updateContent({ siteConfig: { ...content.siteConfig, ...patch } });
  const setResearch = (research: Draft["content"]["research"]) => updateContent({ research });
  const setTimeline = (timeline: Draft["content"]["timeline"]) => updateContent({ timeline });
  const setHobbies = (hobbies: Draft["content"]["hobbies"]) => updateContent({ hobbies });

  const save = () => {
    setStatus("");
    savePortfolio.mutate({
      username: draft.username,
      displayName: draft.displayName,
      prompt: draft.prompt,
      profileType: draft.profileType || "individual",
      published: true,
      customization: {
        themePreset: draft.customization.themePreset || "skaddosh",
        accentColor: draft.customization.accentColor || "#18181b",
        headingFont: draft.customization.headingFont || "Spectral",
        monoFont: draft.customization.monoFont || "Geist Mono",
        heroAlignment: draft.customization.heroAlignment || "left",
        sectionSpacing: draft.customization.sectionSpacing || "balanced",
        cardStyle: draft.customization.cardStyle || "soft",
        visibleSections: [...PORTFOLIO_SECTIONS],
        customDomainRequested: Boolean(draft.customization.customDomainRequested),
        customDomain: draft.customization.customDomain || "",
      },
      content,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.colors.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: T.colors.textMuted }}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: T.colors.text, fontSize: 15, fontWeight: "800" }}>Portfolio Studio</Text>
          <Text style={{ color: T.colors.textMuted, fontSize: 10 }}>skaddosh/portfolio/{draft.username}</Text>
        </View>
        <TouchableOpacity onPress={save} disabled={savePortfolio.isPending}>
          <Text style={{ color: T.colors.text, fontWeight: "800" }}>{savePortfolio.isPending ? "Saving" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {status ? <Text style={{ color: status === "Saved" ? T.colors.green : T.colors.red, fontSize: 12 }}>{status}</Text> : null}

        <Card title="Analytics">
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Metric label="Views" value={analytics.data?.totals.views ?? 0} />
            <Metric label="Clicks" value={analytics.data?.totals.clicks ?? 0} />
            <Metric label="Visitors" value={analytics.data?.totals.uniqueVisitors ?? 0} />
          </View>
          {analytics.data?.topActions.length ? (
            <View style={{ gap: 8 }}>
              {analytics.data.topActions.map((action) => (
                <View key={action.name} style={{ flexDirection: "row", justifyContent: "space-between", borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 10 }}>
                  <Text style={{ color: T.colors.text, fontWeight: "700" }}>{action.name}</Text>
                  <Text style={{ color: T.colors.textMuted }}>{action.total}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: T.colors.textMuted, fontSize: 12 }}>No portfolio analytics yet.</Text>
          )}
        </Card>

        <Card title="Publishing">
          <Field label="Portfolio URL" value={draft.username} onChange={(username) => updateDraft({ username })} />
          <Field label="Display name" value={draft.displayName} onChange={(displayName) => updateDraft({ displayName })} />
          <ChoiceRow
            label="Profile type"
            value={draft.profileType || "individual"}
            options={["individual", "team", "studio", "company", "community"]}
            onChange={(profileType) => updateDraft({ profileType })}
          />
          <Field label="Portfolio promise" value={draft.prompt} onChange={(prompt) => updateDraft({ prompt })} multiline placeholder="A concise promise for the people visiting this portfolio." />
          <Text style={{ color: T.colors.textMuted, fontSize: 12, lineHeight: 18 }}>
            Portfolios publish automatically and focus on story, experience, education, skills, articles, and contact.
          </Text>
        </Card>

        <Card title="Theme">
          <Text style={{ color: T.colors.textMuted, fontSize: 12, lineHeight: 18 }}>
            These controls mirror the web portfolio renderer while staying comfortable on mobile.
          </Text>
          <Field label="Accent color" value={draft.customization.accentColor || "#bf5b2b"} onChange={(accentColor) => updateDraft({ customization: { ...draft.customization, accentColor } })} placeholder="#bf5b2b" />
          <ChoiceRow
            label="Hero alignment"
            value={draft.customization.heroAlignment || "left"}
            options={["left", "center"]}
            onChange={(heroAlignment) => updateDraft({ customization: { ...draft.customization, heroAlignment } })}
          />
          <ChoiceRow
            label="Section spacing"
            value={draft.customization.sectionSpacing || "balanced"}
            options={["compact", "balanced", "airy"]}
            onChange={(sectionSpacing) => updateDraft({ customization: { ...draft.customization, sectionSpacing } })}
          />
          <ChoiceRow
            label="Card style"
            value={draft.customization.cardStyle || "soft"}
            options={["soft", "outline", "elevated"]}
            onChange={(cardStyle) => updateDraft({ customization: { ...draft.customization, cardStyle } })}
          />
        </Card>

        <Card title="Custom domain">
          <Text style={{ color: T.colors.textMuted, fontSize: 12, lineHeight: 18 }}>
            Save a hostname here, then create a CNAME record pointing to {CUSTOM_DOMAIN_TARGET}.
          </Text>
          <Field
            label="Hostname"
            value={draft.customization.customDomain || ""}
            onChange={(customDomain) => updateDraft({
              customization: {
                ...draft.customization,
                customDomain,
                customDomainRequested: Boolean(customDomain && draft.customization.customDomainRequested),
              },
            })}
          />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: draft.customization.customDomain ? 1 : 0.6 }}>
            <Text style={{ color: T.colors.text, fontSize: 14, fontWeight: "700" }}>Request activation</Text>
            <Switch
              disabled={!draft.customization.customDomain}
              value={Boolean(draft.customization.customDomainRequested)}
              trackColor={{ false: T.colors.border, true: T.colors.primarySoft }}
              thumbColor={draft.customization.customDomainRequested ? T.colors.primary : T.colors.textMuted}
              onValueChange={(customDomainRequested) => updateDraft({
                customization: { ...draft.customization, customDomainRequested },
              })}
            />
          </View>
          <Text style={{ color: T.colors.textMuted, fontSize: 11 }}>
            DNS: CNAME this exact hostname to {CUSTOM_DOMAIN_TARGET}.
          </Text>
          <Text style={{ color: T.colors.textMuted, fontSize: 11 }}>
            Public subdomains also work: username.{CUSTOM_DOMAIN_TARGET}.
          </Text>
        </Card>

        <Card title="Identity">
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="First name" value={content.siteConfig.firstName} onChange={(firstName) => updateSite({ firstName, name: `${firstName} ${content.siteConfig.lastName}`.trim() })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Last name" value={content.siteConfig.lastName} onChange={(lastName) => updateSite({ lastName, name: `${content.siteConfig.firstName} ${lastName}`.trim() })} />
            </View>
          </View>
          <Field label="Initials / mark" value={content.siteConfig.initials} onChange={(initials) => updateSite({ initials })} placeholder="AB" />
          <Field label="Location" value={content.siteConfig.location} onChange={(location) => updateSite({ location })} />
          <Field label="Email" value={content.siteConfig.email} onChange={(email) => updateSite({ email })} />
          <Field label="Phone / contact detail" value={content.siteConfig.phone} onChange={(phone) => updateSite({ phone })} />
          <Field label="Tagline / short bio" value={content.siteConfig.tagline} onChange={(tagline) => updateSite({ tagline })} multiline />
          <Field label="Avatar URL" value={content.siteConfig.avatar} onChange={(avatar) => updateSite({ avatar })} />
          <Field label="Hero image URL" value={content.heroImage.url} onChange={(url) => updateContent({ heroImage: { ...content.heroImage, url } })} />
          <Field label="Hero alt text" value={content.heroImage.alt} onChange={(alt) => updateContent({ heroImage: { ...content.heroImage, alt } })} />
          <View style={{ gap: 10 }}>
            <SectionTitle>Social links</SectionTitle>
            {(["github", "linkedin", "instagram"] as const).map((key) => (
              <Field
                key={key}
                label={`${key} URL`}
                value={content.siteConfig.social?.[key] || ""}
                onChange={(value) => updateSite({ social: { ...content.siteConfig.social, [key]: value } })}
              />
            ))}
          </View>
        </Card>

        <Card title="About story">
          <Field label="Who label" value={content.aboutStory.whoAmI.label} onChange={(label) => updateContent({ aboutStory: { ...content.aboutStory, whoAmI: { ...content.aboutStory.whoAmI, label } } })} />
          <Field label="Who title" value={content.aboutStory.whoAmI.title} onChange={(title) => updateContent({ aboutStory: { ...content.aboutStory, whoAmI: { ...content.aboutStory.whoAmI, title } } })} />
          <Field label="Who body" value={content.aboutStory.whoAmI.body} onChange={(body) => updateContent({ aboutStory: { ...content.aboutStory, whoAmI: { ...content.aboutStory.whoAmI, body } } })} multiline />
          <Field label="Story location" value={content.aboutStory.whoAmI.location} onChange={(location) => updateContent({ aboutStory: { ...content.aboutStory, whoAmI: { ...content.aboutStory.whoAmI, location } } })} />
          <Field label="What label" value={content.aboutStory.whatIDo.label} onChange={(label) => updateContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, label } } })} />
          <Field label="What title" value={content.aboutStory.whatIDo.title} onChange={(title) => updateContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, title } } })} />
          <Field label="What body" value={content.aboutStory.whatIDo.body} onChange={(body) => updateContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, body } } })} multiline />
          {(content.aboutStory.whatIDo.pillars || []).map((pillar: any, index: number) => (
            <View key={`${pillar.k}-${index}`} style={{ gap: 8, borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 10 }}>
              <Field label="Pillar title" value={pillar.k} onChange={(k) => updateContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, pillars: content.aboutStory.whatIDo.pillars.map((item: any, i: number) => i === index ? { ...item, k } : item) } } })} />
              <Field label="Pillar detail" value={pillar.v} onChange={(v) => updateContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, pillars: content.aboutStory.whatIDo.pillars.map((item: any, i: number) => i === index ? { ...item, v } : item) } } })} />
              <TouchableOpacity onPress={() => updateContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, pillars: content.aboutStory.whatIDo.pillars.filter((_: any, i: number) => i !== index) } } })}>
                <Text style={{ color: T.colors.red, fontWeight: "800" }}>Remove pillar</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => updateContent({ aboutStory: { ...content.aboutStory, whatIDo: { ...content.aboutStory.whatIDo, pillars: [...content.aboutStory.whatIDo.pillars, { k: "New pillar", v: "" }] } } })}
            style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 14, alignItems: "center" }}>
            <Text style={{ color: T.colors.text, fontWeight: "800" }}>Add pillar</Text>
          </TouchableOpacity>
        </Card>

        <Card title="Timeline">
          {(content.timeline || []).map((item: any, index: number) => (
            <View key={item.id} style={{ gap: 10, borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 12 }}>
              <Field label="Year / period" value={item.year} onChange={(year) => setTimeline(content.timeline.map((entry: any, i: number) => i === index ? { ...entry, year } : entry))} />
              <ChoiceRow label="Type" value={item.type} options={["work", "academic", "project", "award"]} onChange={(type) => setTimeline(content.timeline.map((entry: any, i: number) => i === index ? { ...entry, type } : entry))} />
              <Field label="Title" value={item.title} onChange={(title) => setTimeline(content.timeline.map((entry: any, i: number) => i === index ? { ...entry, title } : entry))} />
              <Field label="Organization / place" value={item.org} onChange={(org) => setTimeline(content.timeline.map((entry: any, i: number) => i === index ? { ...entry, org } : entry))} />
              <Field label="Description" value={item.description} onChange={(description) => setTimeline(content.timeline.map((entry: any, i: number) => i === index ? { ...entry, description } : entry))} multiline />
              <Field label="Tags" value={joinCsv(item.tags)} onChange={(value) => setTimeline(content.timeline.map((entry: any, i: number) => i === index ? { ...entry, tags: splitCsv(value) } : entry))} />
              <Field label="Image URL" value={item.image || ""} onChange={(image) => setTimeline(content.timeline.map((entry: any, i: number) => i === index ? { ...entry, image } : entry))} />
              <TouchableOpacity onPress={() => setTimeline(content.timeline.filter((_: any, i: number) => i !== index))}>
                <Text style={{ color: T.colors.red, fontWeight: "800" }}>Remove milestone</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setTimeline([...(content.timeline || []), { id: `t-${Date.now()}`, year: "2026", type: "project", title: "New milestone", org: "", description: "", tags: [], image: "" }])}
            style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 14, alignItems: "center" }}>
            <Text style={{ color: T.colors.text, fontWeight: "800" }}>Add milestone</Text>
          </TouchableOpacity>
        </Card>

        <Card title="Research / writing / notes">
          {(content.research || []).map((item: any, index: number) => (
            <View key={item.id} style={{ gap: 10, borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 12 }}>
              <Field label="Field / topic" value={item.field} onChange={(field) => setResearch(content.research.map((entry: any, i: number) => i === index ? { ...entry, field } : entry))} />
              <ChoiceRow label="Status" value={item.status} options={["ongoing", "published", "exploratory"]} onChange={(status) => setResearch(content.research.map((entry: any, i: number) => i === index ? { ...entry, status } : entry))} />
              <Field label="Title" value={item.title} onChange={(title) => setResearch(content.research.map((entry: any, i: number) => i === index ? { ...entry, title } : entry))} />
              <Field label="Description" value={item.description} onChange={(description) => setResearch(content.research.map((entry: any, i: number) => i === index ? { ...entry, description } : entry))} multiline />
              <Field label="Collaborators" value={joinCsv(item.collaborators)} onChange={(value) => setResearch(content.research.map((entry: any, i: number) => i === index ? { ...entry, collaborators: splitCsv(value) } : entry))} />
              <TouchableOpacity onPress={() => setResearch(content.research.filter((_: any, i: number) => i !== index))}>
                <Text style={{ color: T.colors.red, fontWeight: "800" }}>Remove item</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setResearch([...(content.research || []), { id: `research-${Date.now()}`, field: "Topic", title: "New item", description: "", collaborators: [], status: "exploratory" }])}
            style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 14, alignItems: "center" }}>
            <Text style={{ color: T.colors.text, fontWeight: "800" }}>Add research item</Text>
          </TouchableOpacity>
        </Card>

        <Card title="Personal layer">
          {(content.hobbies || []).map((item: any, index: number) => (
            <View key={item.id} style={{ gap: 10, borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 12 }}>
              <Field label="Icon / emoji" value={item.emoji} onChange={(emoji) => setHobbies(content.hobbies.map((entry: any, i: number) => i === index ? { ...entry, emoji } : entry))} />
              <Field label="Title" value={item.title} onChange={(title) => setHobbies(content.hobbies.map((entry: any, i: number) => i === index ? { ...entry, title } : entry))} />
              <Field label="Description" value={item.description} onChange={(description) => setHobbies(content.hobbies.map((entry: any, i: number) => i === index ? { ...entry, description } : entry))} multiline />
              <TouchableOpacity onPress={() => setHobbies(content.hobbies.filter((_: any, i: number) => i !== index))}>
                <Text style={{ color: T.colors.red, fontWeight: "800" }}>Remove item</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setHobbies([...(content.hobbies || []), { id: `hobby-${Date.now()}`, emoji: "*", title: "New personal note", description: "" }])}
            style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 14, alignItems: "center" }}>
            <Text style={{ color: T.colors.text, fontWeight: "800" }}>Add personal note</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: T.colors.card, borderRadius: T.radius.xl, borderWidth: 1, borderColor: T.colors.border, padding: 16, gap: 14, ...T.shadow.sm }}>
      <Text style={{ color: T.colors.text, fontSize: 16, fontWeight: "900" }}>{title}</Text>
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ color: T.colors.textMuted, fontSize: 11, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <SectionTitle>{label}</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const active = value === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onChange(option)}
              style={{
                borderRadius: T.radius.full,
                borderWidth: 1,
                borderColor: active ? T.colors.primary : T.colors.border,
                backgroundColor: active ? T.colors.primarySoft : T.colors.background,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}>
              <Text style={{ color: active ? T.colors.primary : T.colors.textMuted, fontSize: 12, fontWeight: "900", textTransform: "capitalize" }}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 12, backgroundColor: T.colors.surface }}>
      <Text style={{ color: T.colors.text, fontSize: 22, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: T.colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}
