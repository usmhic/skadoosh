import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { theme as T } from "@/lib/theme";

export function StudioWorkflowHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.colors.border, gap: 7 }}>
      <TouchableOpacity onPress={onBack} style={{ alignSelf: "flex-start", paddingVertical: 2 }}>
        <Text style={{ color: T.colors.textMuted }}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={{ color: T.colors.text, fontSize: 24, fontWeight: "900" }}>{title}</Text>
      <Text style={{ color: T.colors.textMuted, fontSize: 13, lineHeight: 20 }}>{description}</Text>
    </View>
  );
}

export function WorkflowSteps({ steps }: { steps: readonly string[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {steps.map((step, index) => (
        <View
          key={step}
          style={{
            width: "48%",
            borderWidth: 1,
            borderColor: T.colors.border,
            backgroundColor: T.colors.card,
            borderRadius: T.radius.md,
            padding: 10,
          }}>
          <Text style={{ color: T.colors.textMuted, fontSize: 10, fontWeight: "900" }}>Step {index + 1}</Text>
          <Text style={{ color: T.colors.text, fontSize: 12, fontWeight: "900", marginTop: 3 }}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

export function StudioPrimaryAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        backgroundColor: disabled ? T.colors.surface : T.colors.text,
        borderRadius: T.radius.md,
        padding: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: disabled ? T.colors.border : "transparent",
      }}>
      <Text style={{ color: disabled ? T.colors.textMuted : T.colors.primaryText, fontWeight: "900" }}>{label}</Text>
    </TouchableOpacity>
  );
}
