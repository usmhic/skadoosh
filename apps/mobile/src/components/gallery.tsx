import React from "react";
import { Image, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { theme as T } from "@/lib/theme";

export const MEDIUM_LABEL: Record<string, string> = {
  art: "Art",
  design: "Design",
  software: "Software",
  music: "Music",
  writing: "Writing",
  film: "Film",
  games: "Games",
  photography: "Photography",
  research: "Research",
  other: "Other",
};

/** Small round "K" mark. Hot is ember, cold is glacier, neutral is ink. */
export function KudosMark({ temp, size = 16 }: { temp?: "hot" | "cold"; size?: number }) {
  const color = temp === "hot" ? T.colors.hot : temp === "cold" ? T.colors.cold : T.colors.text;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: T.colors.primaryText, fontSize: size * 0.55, fontWeight: "800", fontStyle: "italic" }}>K</Text>
    </View>
  );
}

export function VerifiedMark({ verified, size = 14 }: { verified?: boolean; size?: number }) {
  if (!verified) return null;
  return (
    <View
      accessibilityLabel="Verified creator"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: T.colors.verified,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontSize: size * 0.7, fontWeight: "900", lineHeight: size }}>✓</Text>
    </View>
  );
}

export function Pill({
  label,
  active,
  onPress,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      disabled={!onPress}
      style={{
        height: 36,
        paddingHorizontal: 14,
        borderRadius: T.radius.full,
        borderWidth: 1,
        borderColor: active ? T.colors.primary : T.colors.border,
        backgroundColor: active ? T.colors.primary : "transparent",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? T.colors.primaryText : T.colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Cover image, or a calm generated cover from the accent colour and the first letter of the title. */
export function Cover({
  image,
  accent,
  title,
  medium,
  ratio = 4 / 3,
  radius = T.radius.xl,
}: {
  image?: string | null;
  accent: string;
  title: string;
  medium?: string;
  ratio?: number;
  radius?: number;
}) {
  return (
    <View style={{ aspectRatio: ratio, borderRadius: radius, overflow: "hidden", backgroundColor: T.colors.surface }}>
      {image ? (
        <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, backgroundColor: accent, justifyContent: "space-between", padding: 18 }}>
          <View style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.14)" }} />
          <View style={{ position: "absolute", left: -30, bottom: -60, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(0,0,0,0.10)" }} />
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
            {MEDIUM_LABEL[medium ?? "other"] ?? "Other"}
          </Text>
          <Text style={{ color: "#fff", fontFamily: T.fonts.display, fontSize: 56, lineHeight: 60 }}>
            {(title.trim()[0] ?? "·").toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ marginTop: 32, marginBottom: 12 }}>
      <Text style={{ fontFamily: T.fonts.display, fontSize: 26, color: T.colors.text }}>{children}</Text>
      {hint ? <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: T.colors.textMuted }}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "solid",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "solid" | "outline";
}) {
  const solid = variant === "solid";
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={{
        height: 48,
        borderRadius: T.radius.full,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: solid ? T.colors.primary : "transparent",
        borderWidth: solid ? 0 : 1,
        borderColor: T.colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: solid ? T.colors.primaryText : T.colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String((error as { message: string }).message);
  return "Something went wrong.";
}
