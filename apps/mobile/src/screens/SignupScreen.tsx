import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  Animated, StatusBar, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { authClient, signInWithGoogle, signInWithApple } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "Signup">;
const BRAND_ICON = require("../../assets/brand/logo.png");

export function SignupScreen({ navigation }: P) {
  const { t } = useTranslation();
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [ssoLoading, setSsoLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError]           = useState("");
  const [nameFocused, setNameFocused]   = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused]       = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  async function submit() {
    if (!name || !email || pw.length < 8) return;
    setLoading(true);
    setError("");
    const res = await authClient.signUp.email({ name, email, password: pw });
    setLoading(false);
    if (res.error) setError(res.error.message ?? t("auth.signUpFailed"));
    else navigation.replace("VerifyEmail", { email });
  }

  async function handleGoogle() {
    setSsoLoading("google"); setError("");
    try { await signInWithGoogle(); }
    catch (e: any) { setError(e.message ?? t("auth.googleSignInFailed")); }
    finally { setSsoLoading(null); }
  }

  async function handleApple() {
    setSsoLoading("apple"); setError("");
    try { await signInWithApple(); }
    catch (e: any) { setError(e.message ?? t("auth.appleSignInFailed")); }
    finally { setSsoLoading(null); }
  }

  const inputStyle = (focused: boolean) => ({
    backgroundColor: T.colors.surface,
    borderWidth: 1,
    borderColor: focused ? T.colors.borderFocus : T.colors.border,
    borderRadius: T.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: T.colors.text,
    marginBottom: 16,
  });

  const canSubmit = name.length > 0 && email.length > 0 && pw.length >= 8 && !loading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Brand mark */}
            <View style={{ alignItems: "center", marginBottom: 48 }}>
              <View style={{
                width: 56, height: 56, borderRadius: T.radius.lg,
                alignItems: "center", justifyContent: "center",
                marginBottom: 20,
              }}>
                <Image source={BRAND_ICON} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
              </View>
              <Text style={{ fontSize: 24, fontWeight: "700", color: T.colors.text, letterSpacing: -0.5, marginBottom: 6 }}>
                {t("auth.createAccountTitle")}
              </Text>
              <Text style={{ fontSize: 14, color: T.colors.textMuted, textAlign: "center" }}>
                {t("auth.createAccountSubtitle")}
              </Text>
            </View>

            {/* Error banner */}
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

            {/* Name */}
            <Text style={{ fontSize: 12, fontWeight: "600", color: T.colors.textMuted, marginBottom: 7, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {t("common.fullName")}
            </Text>
            <TextInput
              style={inputStyle(nameFocused)}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              placeholderTextColor={T.colors.textSubtle}
              placeholder={t("auth.fullNamePlaceholder")}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              returnKeyType="next"
            />

            {/* Email */}
            <Text style={{ fontSize: 12, fontWeight: "600", color: T.colors.textMuted, marginBottom: 7, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {t("common.email")}
            </Text>
            <TextInput
              style={inputStyle(emailFocused)}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholderTextColor={T.colors.textSubtle}
              placeholder={t("auth.emailPlaceholder")}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              returnKeyType="next"
            />

            {/* Password */}
            <Text style={{ fontSize: 12, fontWeight: "600", color: T.colors.textMuted, marginBottom: 7, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {t("common.password")}
            </Text>
            <View style={{ position: "relative", marginBottom: 28 }}>
              <TextInput
                style={[inputStyle(pwFocused), { marginBottom: 0 }]}
                value={pw}
                onChangeText={setPw}
                secureTextEntry={!showPw}
                placeholderTextColor={T.colors.textSubtle}
                placeholder={t("auth.passwordMin")}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <TouchableOpacity
                style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}
                onPress={() => setShowPw(s => !s)}>
                <Text style={{ fontSize: 13, color: T.colors.textMuted }}>{showPw ? t("common.hide") : t("common.show")}</Text>
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={{
                backgroundColor: canSubmit ? T.colors.primary : T.colors.surface,
                borderRadius: T.radius.md,
                paddingVertical: 15,
                alignItems: "center",
                borderWidth: 1,
                borderColor: canSubmit ? "transparent" : T.colors.border,
                ...T.shadow.sm,
              }}
              onPress={submit}
              disabled={!canSubmit}
              activeOpacity={0.8}>
              <Text style={{
                fontSize: 15, fontWeight: "700",
                color: canSubmit ? T.colors.primaryText : T.colors.textMuted,
              }}>
                {loading ? t("auth.creatingAccount") : t("common.signUp")}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 28, gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: T.colors.border }} />
              <Text style={{ fontSize: 11, color: T.colors.textSubtle, letterSpacing: 0.5 }}>{t("common.orContinueWith")}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: T.colors.border }} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                borderRadius: T.radius.md, paddingVertical: 14, borderWidth: 1,
                borderColor: T.colors.border, backgroundColor: T.colors.surface,
                marginBottom: 10, ...T.shadow.sm,
              }}
              onPress={handleGoogle}
              disabled={!!ssoLoading}
              activeOpacity={0.75}>
              <Text style={{ fontSize: 17 }}>G</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: T.colors.text }}>
                {ssoLoading === "google" ? t("common.opening") : t("common.continueWithGoogle")}
              </Text>
            </TouchableOpacity>

            {/* Apple — iOS only */}
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                  borderRadius: T.radius.md, paddingVertical: 14, borderWidth: 1,
                  borderColor: T.colors.border, backgroundColor: T.colors.surface,
                  marginBottom: 24, ...T.shadow.sm,
                }}
                onPress={handleApple}
                disabled={!!ssoLoading}
                activeOpacity={0.75}>
                <Text style={{ fontSize: 17 }}>🍎</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: T.colors.text }}>
                  {ssoLoading === "apple" ? t("common.opening") : t("common.continueWithApple")}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{ alignItems: "center", paddingVertical: 6 }}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 13, color: T.colors.textMuted }}>
                {t("common.haveAccount")} <Text style={{ fontWeight: "700", color: T.colors.text }}>{t("common.signIn")}</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}
              onPress={() => navigation.navigate("ForgotPassword")}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 12, color: T.colors.textMuted }}>
                {t("common.forgotPassword")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
