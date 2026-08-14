import React, { useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, Animated, StatusBar, Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSession } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "Welcome">;

const BRAND_ICON = require("../../assets/brand/logo.png");

export function WelcomeScreen({ navigation }: P) {
  const { t, i18n } = useTranslation();
  const { data: session, isPending } = useSession();
  const insets = useSafeAreaInsets();
  const rtl = i18n.language?.startsWith("ar");

  // If already signed in, jump straight to tabs
  useEffect(() => {
    if (!isPending && session) {
      navigation.replace("Tabs");
    }
  }, [session, isPending]);

  // Content entrance animations
  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY      = useRef(new Animated.Value(20)).current;
  const titleOp     = useRef(new Animated.Value(0)).current;
  const tagY        = useRef(new Animated.Value(16)).current;
  const tagOp       = useRef(new Animated.Value(0)).current;
  const btnsY       = useRef(new Animated.Value(24)).current;
  const btnsOp      = useRef(new Animated.Value(0)).current;
  const guestOp     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1,   tension: 80,  friction: 8,  useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1,   duration: 500, delay: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(titleY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(tagY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.timing(tagOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(btnsY, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
        Animated.timing(btnsOp, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.timing(guestOp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: insets.bottom + 18 }}>
          <Animated.View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}>
            <View style={{
              width: 56,
              height: 56,
              overflow: "hidden",
            }}>
              <Image source={BRAND_ICON} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: T.colors.text, letterSpacing: 0 }}>skaddosh</Text>
              <Text style={{ fontSize: 11, color: T.colors.textMuted }}>read, write, and publish</Text>
            </View>
          </Animated.View>

          <View style={{ flex: 1, justifyContent: "center" }}>
            <Animated.Text
              style={{
                fontSize: 48,
                lineHeight: 52,
                fontWeight: "900",
                color: T.colors.text,
                letterSpacing: 0,
                marginBottom: 14,
                opacity: titleOp,
                transform: [{ translateY: titleY }],
              }}>
              skaddosh
            </Animated.Text>
            <Animated.Text
              style={{
                maxWidth: 320,
                fontSize: 16,
                color: T.colors.textMuted,
                lineHeight: 25,
                marginBottom: 34,
                writingDirection: rtl ? "rtl" : "ltr",
                opacity: tagOp,
                transform: [{ translateY: tagY }],
              }}>
              {t("auth.heroTagline")}
            </Animated.Text>

            <Animated.View style={{
              borderWidth: 1,
              borderColor: T.colors.border,
              borderRadius: T.radius.xl,
              backgroundColor: T.colors.card,
              padding: 14,
              marginBottom: 20,
              gap: 10,
              opacity: tagOp,
              transform: [{ translateY: tagY }],
              ...T.shadow.sm,
            }}>
              {["Discover multilingual works", "Build a creator portfolio", "Send kudos and messages"].map((item) => (
                <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 22, height: 22, borderRadius: T.radius.full, backgroundColor: T.colors.accent, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: T.colors.accentText, fontWeight: "900", fontSize: 12 }}>✓</Text>
                  </View>
                  <Text style={{ color: T.colors.text, fontSize: 13, fontWeight: "700" }}>{item}</Text>
                </View>
              ))}
            </Animated.View>

            <Animated.View style={{ width: "100%", gap: 10, opacity: btnsOp, transform: [{ translateY: btnsY }] }}>
              <TouchableOpacity
                style={{
                  backgroundColor: T.colors.primary,
                  borderRadius: T.radius.md,
                  paddingVertical: 15,
                  alignItems: "center",
                  ...T.shadow.sm,
                }}
                onPress={() => navigation.navigate("Signup")}
                activeOpacity={0.85}>
                <Text style={{ fontSize: 15, fontWeight: "900", color: T.colors.primaryText, letterSpacing: 0 }}>
                  {t("auth.getStartedFree")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: T.colors.card,
                  borderRadius: T.radius.md,
                  paddingVertical: 15,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: T.colors.border,
                }}
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.75}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: T.colors.text, letterSpacing: 0 }}>
                  {t("common.signIn")}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ marginTop: 24, opacity: guestOp }}>
              <TouchableOpacity onPress={() => navigation.replace("Tabs")} activeOpacity={0.65}>
                <Text style={{ fontSize: 13, color: T.colors.textMuted, textAlign: "center" }}>
                  {t("auth.browseGuest")}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Animated.Text
            style={{
              textAlign: "center",
              fontSize: 10,
              color: T.colors.textSubtle,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              opacity: guestOp,
            }}>
            skaddosh · {new Date().getFullYear()}
          </Animated.Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
