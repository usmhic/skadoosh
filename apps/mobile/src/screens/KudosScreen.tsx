import React from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import { mobileConfig } from "@/config/mobile-env";
import type { RootStackParams } from "@/navigation";
import { KudosMark, PrimaryButton, SectionTitle, errorMessage } from "@/components/gallery";

const LEDGER_LABEL: Record<string, string> = {
  opening_balance: "Opening balance",
  signup_grant: "Welcome Kudos",
  weekly_allowance: "Weekly allowance",
  purchase: "Bought a pack",
  give: "Gave Kudos",
  receive: "Received Kudos",
  back: "Backed a project",
  release: "Released at a milestone",
  return: "Return from a project you backed",
  refund: "Thawed back to you",
  unlock_spend: "Unlocked work",
  unlock_earn: "Someone unlocked your work",
  license_spend: "Bought a licence",
  license_earn: "Licence sold",
  contributor_share: "Contributor share",
  export_onchain: "Sent to your wallet",
  export_refund: "Wallet transfer refunded",
  import_onchain: "Brought back from your wallet",
};

export function KudosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { data: session } = useSession();
  const enabled = Boolean(session);
  const utils = trpc.useUtils();
  const wallet = trpc.kudos.wallet.useQuery(undefined, { enabled });
  const history = trpc.kudos.history.useQuery({ limit: 30 }, { enabled });
  const licenses = trpc.licenses.mine.useQuery(undefined, { enabled });
  const identity = trpc.identity.status.useQuery(undefined, { enabled });
  const claim = trpc.kudos.claimWeekly.useMutation({
    onSuccess: () => Promise.all([utils.kudos.wallet.invalidate(), utils.kudos.history.invalidate()]),
    onError: (e) => Alert.alert("Couldn't claim", errorMessage(e)),
  });

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background, padding: 24, justifyContent: "center" }}>
        <Text style={{ fontFamily: T.fonts.display, fontSize: 34, color: T.colors.text }}>Kudos</Text>
        <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 22, color: T.colors.textMuted }}>
          A community currency for appreciating and backing original work. Join to get your welcome Kudos.
        </Text>
        <View style={{ marginTop: 20 }}>
          <PrimaryButton label="Sign in" onPress={() => navigation.navigate("Login")} />
        </View>
      </SafeAreaView>
    );
  }

  const w = wallet.data;
  const refreshing = wallet.isRefetching || history.isRefetching;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void Promise.all([wallet.refetch(), history.refetch(), licenses.refetch(), identity.refetch()])}
          />
        }
      >
        <Text style={{ fontFamily: T.fonts.display, fontSize: 38, color: T.colors.text }}>Kudos</Text>
        {!w ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={T.colors.text} />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Balance temp="hot" value={w.hot} label="Hot · to give and spend" />
              <Balance temp="cold" value={w.cold} label="Cold · backing projects" />
            </View>
            {w.allowance.claimable ? (
              <View style={{ marginTop: 12 }}>
                <PrimaryButton label={`Claim ${w.allowance.amount} weekly Kudos`} disabled={claim.isPending} onPress={() => claim.mutate()} />
              </View>
            ) : null}
          </>
        )}

        {identity.data?.provider && identity.data.status !== "verified" ? (
          <TouchableOpacity
            onPress={() => navigation.navigate("Verify")}
            style={{ marginTop: 20, borderRadius: T.radius.lg, padding: 16, backgroundColor: T.colors.surface }}
          >
            <Text style={{ fontWeight: "700", color: T.colors.text }}>
              {identity.data.status === "pending" ? "Verification in progress" : "Verify your identity"}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: T.colors.textMuted }}>
              Needed to publish, sell licences, and share income with collaborators.
            </Text>
          </TouchableOpacity>
        ) : null}

        {licenses.data?.length ? (
          <>
            <SectionTitle hint="Each one has a certificate anyone can check.">Licences you hold</SectionTitle>
            {licenses.data.map((l) => (
              <TouchableOpacity
                key={l.certificateCode}
                onPress={() => void WebBrowser.openBrowserAsync(`${mobileConfig.apiBaseUrl}/licenses/${l.certificateCode}`)}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.colors.border }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: T.colors.text }}>{l.projectTitle}</Text>
                <Text style={{ fontSize: 12, color: T.colors.textMuted, textTransform: "capitalize" }}>
                  {l.tier} · by {l.creatorName} · {l.certificateCode}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        <SectionTitle hint="Every Kudo that moved, and why.">History</SectionTitle>
        {history.data?.map((h) => (
          <View key={h.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.colors.border }}>
            <KudosMark temp={h.currency} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: T.colors.text }} numberOfLines={1}>
                {LEDGER_LABEL[h.kind] ?? h.kind}
                {h.project ? ` · ${h.project.title}` : ""}
              </Text>
              {h.counterparty ? <Text style={{ fontSize: 12, color: T.colors.textMuted }}>{h.counterparty.name}</Text> : null}
            </View>
            <Text
              style={{
                fontWeight: "700",
                color: h.delta > 0 ? (h.currency === "hot" ? T.colors.hot : T.colors.cold) : T.colors.textMuted,
              }}
            >
              {h.delta > 0 ? "+" : "−"}
              {Math.abs(h.delta)}
            </Text>
          </View>
        ))}
        {history.data?.length === 0 ? <Text style={{ color: T.colors.textMuted }}>No movements yet.</Text> : null}

        <Text style={{ marginTop: 28, fontSize: 12, lineHeight: 18, color: T.colors.textSubtle }}>
          Kudos are a community currency, not an investment. You can also keep them in your own wallet as a token on Base from
          the Kudos page on the web.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Balance({ temp, value, label }: { temp: "hot" | "cold"; value: number; label: string }) {
  return (
    <View style={{ flex: 1, borderRadius: T.radius.xl, padding: 16, backgroundColor: temp === "hot" ? T.colors.hotSoft : T.colors.coldSoft }}>
      <KudosMark temp={temp} size={20} />
      <Text style={{ marginTop: 10, fontFamily: T.fonts.display, fontSize: 36, color: T.colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: T.colors.textMuted }}>{label}</Text>
    </View>
  );
}
