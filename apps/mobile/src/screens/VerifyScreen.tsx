import React from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { trpc } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import { PrimaryButton, VerifiedMark, errorMessage } from "@/components/gallery";

const PROMISES = [
  "Our verification partner checks a photo ID and a quick selfie. It takes about two minutes.",
  "We never see or store your document or photo. We only keep the result and the country that issued the ID.",
  "Your profile shows a small Verified mark. Your identity details are never shown to anyone.",
];

/** Opens the provider's hosted flow in the system browser, then re-checks the result. */
export function VerifyScreen() {
  const status = trpc.identity.status.useQuery(undefined, {
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 4000 : false),
  });
  const start = trpc.identity.start.useMutation({
    onSuccess: async ({ url }) => {
      await WebBrowser.openBrowserAsync(url);
      await status.refetch();
    },
    onError: (e) => Alert.alert("Couldn't start verification", errorMessage(e)),
  });
  const data = status.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontFamily: T.fonts.display, fontSize: 38, lineHeight: 42, color: T.colors.text }}>
          Show you&apos;re a real person.
        </Text>
        <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 22, color: T.colors.textMuted }}>
          skaddosh is for original work made by people. Verifying lets you publish projects, sell licences, and share in revenue
          with collaborators. Exploring and giving Kudos never needs it.
        </Text>
        {PROMISES.map((line) => (
          <Text key={line} style={{ marginTop: 14, fontSize: 14, lineHeight: 21, color: T.colors.text }}>
            🔒 {line}
          </Text>
        ))}

        <View style={{ marginTop: 28, borderRadius: T.radius.xl, padding: 20, backgroundColor: T.colors.card, borderWidth: 1, borderColor: T.colors.border }}>
          {status.isLoading ? (
            <ActivityIndicator color={T.colors.text} />
          ) : !data?.provider ? (
            <Text style={{ color: T.colors.textMuted }}>Verification isn&apos;t switched on here yet.</Text>
          ) : data.status === "verified" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <VerifiedMark verified size={18} />
              <Text style={{ fontWeight: "600", color: T.colors.text }}>You&apos;re verified. Thank you.</Text>
            </View>
          ) : data.status === "pending" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={T.colors.text} />
              <Text style={{ flex: 1, color: T.colors.text }}>Waiting for the result. This updates by itself.</Text>
            </View>
          ) : (
            <>
              {data.status === "rejected" ? (
                <Text style={{ marginBottom: 12, color: T.colors.textMuted }}>
                  The last attempt didn&apos;t go through. Good light and an unexpired ID usually fix it.
                </Text>
              ) : null}
              <PrimaryButton label={start.isPending ? "Opening…" : "Verify with Veriff"} disabled={start.isPending} onPress={() => start.mutate()} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
