import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Animated, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { requestPasswordReset } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: P) {
  const { t } = useTranslation();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);
  const [focused, setFocused] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  async function submit() {
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      });
      if ((res as { error?: { message?: string } }).error) {
        setError((res as { error?: { message?: string } }).error?.message ?? t("auth.genericError"));
      } else {
        setSent(true);
      }
    } catch {
      setError(t("auth.networkError"));
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background, justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}>
        <StatusBar barStyle="dark-content" />
        <View style={{
          width: 72, height: 72, borderRadius: T.radius.xl,
          backgroundColor: "rgba(34,197,94,0.12)",
          borderWidth: 1, borderColor: "rgba(34,197,94,0.25)",
          alignItems: "center", justifyContent: "center",
          marginBottom: 24,
        }}>
          <Text style={{ fontSize: 32 }}>✓</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: T.colors.text, marginBottom: 10, textAlign: "center", letterSpacing: -0.3 }}>
          {t("auth.checkInbox")}
        </Text>
        <Text style={{ fontSize: 14, color: T.colors.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 36 }}>
          {t("auth.forgotSuccessText")}
        </Text>
        <TouchableOpacity
          style={{ borderRadius: T.radius.md, paddingVertical: 14, paddingHorizontal: 28, borderWidth: 1, borderColor: T.colors.border, backgroundColor: T.colors.surface }}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.7}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: T.colors.text }}>← {t("auth.backToSignIn")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TouchableOpacity
              style={{ marginBottom: 32, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6 }}
              onPress={() => navigation.goBack()}>
              <Text style={{ fontSize: 16, color: T.colors.textMuted }}>←</Text>
              <Text style={{ fontSize: 14, color: T.colors.textMuted }}>{t("common.back")}</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: "700", color: T.colors.text, letterSpacing: -0.5, marginBottom: 8 }}>
              {t("auth.resetPasswordTitle")}
            </Text>
            <Text style={{ fontSize: 14, color: T.colors.textMuted, marginBottom: 36, lineHeight: 22 }}>
              {t("auth.resetPasswordSubtitle")}
            </Text>

            {error ? (
              <View style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
                borderRadius: T.radius.md,
                paddingHorizontal: 14, paddingVertical: 10,
                marginBottom: 20,
              }}>
                <Text style={{ fontSize: 13, color: T.colors.red }}>{error}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 12, fontWeight: "600", color: T.colors.textMuted, marginBottom: 7, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {t("common.email")}
            </Text>
            <TextInput
              style={{
                backgroundColor: T.colors.surface,
                borderWidth: 1,
                borderColor: focused ? T.colors.borderFocus : T.colors.border,
                borderRadius: T.radius.md,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: T.colors.text,
                marginBottom: 24,
              }}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholderTextColor={T.colors.textSubtle}
              placeholder={t("auth.emailPlaceholder")}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <TouchableOpacity
              style={{
                backgroundColor: email.length > 0 && !loading ? T.colors.primary : T.colors.surface,
                borderRadius: T.radius.md,
                paddingVertical: 15,
                alignItems: "center",
                borderWidth: 1,
                borderColor: email.length > 0 && !loading ? "transparent" : T.colors.border,
                ...T.shadow.sm,
              }}
              onPress={submit}
              disabled={loading || !email}
              activeOpacity={0.8}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: email.length > 0 && !loading ? T.colors.primaryText : T.colors.textMuted }}>
                {loading ? t("auth.sending") : t("auth.sendReset")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
