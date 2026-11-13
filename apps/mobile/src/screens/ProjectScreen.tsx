import React, { useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";
import { Cover, KudosMark, MEDIUM_LABEL, PrimaryButton, SectionTitle, VerifiedMark, errorMessage } from "@/components/gallery";

type P = NativeStackScreenProps<RootStackParams, "Project">;
type Tier = "personal" | "commercial" | "exclusive";
const GIVE_AMOUNTS = [1, 2, 3, 5];
const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

export function ProjectScreen({ route, navigation }: P) {
  const { projectId } = route.params;
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const project = trpc.projects.publicById.useQuery({ id: projectId });
  const offers = trpc.licenses.offers.useQuery({ projectId });
  const contributors = trpc.contributors.list.useQuery({ projectId });
  const [amount, setAmount] = useState(3);
  const [message, setMessage] = useState("");
  const [tier, setTier] = useState<Tier | null>(null);

  const give = trpc.projects.giveKudos.useMutation({
    onSuccess: async () => {
      setMessage("");
      Alert.alert("Thank you", "Your Kudos are on their way to the creator.");
      await Promise.all([utils.projects.publicById.invalidate({ id: projectId }), utils.kudos.wallet.invalidate()]);
    },
    onError: (e) => Alert.alert("Couldn't give Kudos", errorMessage(e)),
  });

  if (project.isLoading) return <ActivityIndicator style={{ flex: 1 }} color={T.colors.text} />;
  const p = project.data;
  if (!p) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.colors.background }}>
        <Text style={{ color: T.colors.textMuted }}>This project isn&apos;t available.</Text>
      </SafeAreaView>
    );
  }
  const isOwner = session?.user.id === p.creator.id;
  const requireSignIn = () => navigation.navigate("Login");

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: T.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Cover image={p.coverImage} accent={p.accentColor} title={p.title} medium={p.medium} ratio={16 / 11} />
        <Text style={{ marginTop: 18, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: T.colors.textMuted }}>
          {MEDIUM_LABEL[p.medium] ?? "Other"} · {p.stage}
        </Text>
        <Text style={{ marginTop: 6, fontFamily: T.fonts.display, fontSize: 36, lineHeight: 40, color: T.colors.text }}>{p.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: T.colors.text }}>by {p.creator.name}</Text>
          <VerifiedMark verified={p.creator.verified} />
        </View>
        {p.pitch ? <Text style={{ marginTop: 14, fontFamily: T.fonts.serif, fontSize: 18, lineHeight: 28, color: T.colors.text }}>{p.pitch}</Text> : null}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          <Stat label="Kudos" value={p.backing.kudosReceived} />
          <Stat label="Backers" value={p.backing.backersCount} />
          {p.backing.goal > 0 ? <Stat label="Backed" value={`${p.backing.cold}/${p.backing.goal}`} temp="cold" /> : null}
        </View>

        {!p.locked && p.description ? (
          <>
            <SectionTitle>Story</SectionTitle>
            <Text style={{ fontFamily: T.fonts.serif, fontSize: 17, lineHeight: 28, color: T.colors.text }}>{p.description}</Text>
          </>
        ) : null}

        {!isOwner ? (
          <>
            <SectionTitle hint="A thank-you that goes to the creator. It never buys a share of the work.">Appreciate</SectionTitle>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {GIVE_AMOUNTS.map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setAmount(n)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: amount === n }}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: T.radius.md,
                    borderWidth: 1,
                    borderColor: amount === n ? T.colors.hot : T.colors.border,
                    backgroundColor: amount === n ? T.colors.hotSoft : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: T.colors.text }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={message}
              onChangeText={setMessage}
              maxLength={280}
              placeholder="Say what you liked (optional)"
              placeholderTextColor={T.colors.textSubtle}
              style={{ marginTop: 10, borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, padding: 12, color: T.colors.text }}
            />
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                label={give.isPending ? "Giving…" : `Give ${amount} Kudos`}
                disabled={give.isPending}
                onPress={() => (session ? give.mutate({ projectId, amount, message: message.trim() || undefined }) : requireSignIn())}
              />
            </View>
          </>
        ) : null}

        {offers.data?.offers.length ? (
          <>
            <SectionTitle hint="Permission to use the work, with plain terms and a certificate. It doesn't transfer ownership.">
              License
            </SectionTitle>
            {offers.data.offers.map((o) => (
              <View key={o.tier} style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.lg, padding: 16, marginBottom: 10, backgroundColor: T.colors.card }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontFamily: T.fonts.display, fontSize: 22, color: T.colors.text }}>{o.label}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <KudosMark size={14} />
                    <Text style={{ fontWeight: "700", color: T.colors.text }}>{o.priceKudos}</Text>
                  </View>
                </View>
                <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: T.colors.textMuted }}>{o.summary}</Text>
                {o.allows.map((line) => (
                  <Text key={line} style={{ marginTop: 6, fontSize: 13, color: T.colors.text }}>
                    <Text style={{ color: T.colors.verified }}>✓ </Text>
                    {line}
                  </Text>
                ))}
                {!isOwner ? (
                  <View style={{ marginTop: 12 }}>
                    <PrimaryButton variant="outline" label={`Get ${o.label} licence`} onPress={() => (session ? setTier(o.tier) : requireSignIn())} />
                  </View>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {contributors.data ? (
          <>
            <SectionTitle hint="Every credit and share here was agreed by both people.">People behind it</SectionTitle>
            <Row name={p.creator.name} detail="Creator" value={pct(contributors.data.creatorKeepsBps)} />
            {contributors.data.contributors.map((c) => (
              <Row
                key={c.id}
                name={c.person.name}
                verified={c.person.verified}
                detail={`${c.role}${c.coOwner ? " · co-owner" : ""}`}
                value={c.splitBps ? pct(c.splitBps) : "Credit"}
              />
            ))}
          </>
        ) : null}

        <Text style={{ marginTop: 28, fontSize: 12, lineHeight: 18, color: T.colors.textSubtle }}>
          Giving or backing never grants ownership. Licences grant permission to use; ownership and income shares come only from
          agreements the creator signs.
        </Text>
      </ScrollView>

      {tier ? <BuyLicense projectId={projectId} tier={tier} onClose={() => setTier(null)} /> : null}
    </SafeAreaView>
  );
}

function Stat({ label, value, temp }: { label: string; value: number | string; temp?: "cold" }) {
  return (
    <View style={{ flex: 1, borderRadius: T.radius.lg, padding: 12, backgroundColor: temp === "cold" ? T.colors.coldSoft : T.colors.surface }}>
      <Text style={{ fontFamily: T.fonts.display, fontSize: 22, color: T.colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: T.colors.textMuted }}>{label}</Text>
    </View>
  );
}

function Row({ name, detail, value, verified }: { name: string; detail: string; value: string; verified?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.colors.border }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: T.colors.text }}>{name}</Text>
          <VerifiedMark verified={verified} size={12} />
        </View>
        <Text style={{ fontSize: 12, color: T.colors.textMuted }}>{detail}</Text>
      </View>
      <Text style={{ fontWeight: "700", color: T.colors.text }}>{value}</Text>
    </View>
  );
}

function BuyLicense({ projectId, tier, onClose }: { projectId: string; tier: Tier; onClose: () => void }) {
  const utils = trpc.useUtils();
  const preview = trpc.licenses.preview.useQuery({ projectId, tier });
  const [agreed, setAgreed] = useState(false);
  const buy = trpc.licenses.buy.useMutation({
    onSuccess: async (result) => {
      await Promise.all([utils.kudos.wallet.invalidate(), utils.licenses.mine.invalidate()]);
      onClose();
      Alert.alert("Licence issued", `Certificate ${result.certificateCode}. You'll find it under Kudos.`);
    },
  });

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background, padding: 20 }}>
        <Text style={{ fontFamily: T.fonts.display, fontSize: 30, color: T.colors.text }}>Licence terms</Text>
        <ScrollView style={{ flex: 1, marginTop: 12, borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.lg, padding: 14, backgroundColor: T.colors.card }}>
          {preview.isLoading ? (
            <ActivityIndicator color={T.colors.text} />
          ) : (
            <Text style={{ fontFamily: T.fonts.serif, fontSize: 14, lineHeight: 22, color: T.colors.text }}>{preview.data?.text}</Text>
          )}
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 }}>
          <Switch value={agreed} onValueChange={setAgreed} accessibilityLabel="I agree to these terms" />
          <Text style={{ flex: 1, fontSize: 13, color: T.colors.text }}>I&apos;ve read these terms and agree to them.</Text>
        </View>
        {buy.error ? <Text style={{ marginTop: 10, color: T.colors.red }}>{errorMessage(buy.error)}</Text> : null}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton variant="outline" label="Cancel" onPress={onClose} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label={buy.isPending ? "Buying…" : "Buy licence"} disabled={!agreed || buy.isPending} onPress={() => buy.mutate({ projectId, tier })} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
