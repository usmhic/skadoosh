import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, StatusBar, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StudioPrimaryAction, StudioWorkflowHeader } from "@/components/StudioWorkflow";
import { trpc } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "NewContent">;
const ARTICLE_TYPES = ["article", "essay", "story", "poem", "journal", "script", "novel"] as const;

export function NewContentScreen({ navigation }: P) {
  const utils = trpc.useUtils();
  const [articleType, setArticleType] = useState<typeof ARTICLE_TYPES[number]>("article");
  const [tags, setTags] = useState("");
  const createWork = trpc.works.create.useMutation({
    onSuccess: async ({ id }) => {
      await utils.works.mine.invalidate();
      navigation.replace("Editor", { workId: id });
    },
    onError: (error) => Alert.alert("Could not create article", error.message),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />
      <StudioWorkflowHeader
        title="New article"
        description="Set the basics, then continue into the editor."
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.lg, backgroundColor: T.colors.card, padding: 14, gap: 12 }}>
          <Text style={{ color: T.colors.text, fontSize: 15, fontWeight: "900" }}>Writing type</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ARTICLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setArticleType(type)}
                style={{
                  borderWidth: 1,
                  borderColor: articleType === type ? T.colors.primary : T.colors.border,
                  backgroundColor: articleType === type ? T.colors.primarySoft : T.colors.surface,
                  borderRadius: T.radius.full,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}>
                <Text style={{ color: articleType === type ? T.colors.primary : T.colors.textMuted, fontSize: 12, fontWeight: "800", textTransform: "capitalize" }}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="science, culture, research"
            placeholderTextColor={T.colors.textSubtle}
            style={{ borderWidth: 1, borderColor: T.colors.border, borderRadius: T.radius.md, backgroundColor: T.colors.surface, color: T.colors.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 13 }}
          />
        </View>

        <StudioPrimaryAction
          disabled={createWork.isPending}
          onPress={() => createWork.mutate({
            type: articleType,
            accentColor: T.colors.primary,
            tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
          })}
          label={createWork.isPending ? "Creating..." : "Create draft"}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
