import React, { useRef, useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, Animated, StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "VerifyEmail">;

function RipplePulse({ done }: { done: boolean }) {
  const ring1 = useRef(new Animated.Value(1)).current;
  const op1   = useRef(new Animated.Value(0.55)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const op2   = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (done) return;
    const make = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.7, duration: 1800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration: 1800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1,   duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: done ? 0 : (opacity === op1 ? 0.55 : 0.35), duration: 0, useNativeDriver: true }),
          ]),
        ])
      );

    const a1 = make(ring1, op1, 0);
    const a2 = make(ring2, op2, 700);
    a1.start(); a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, [done]);

  const color = done ? "rgba(47,138,95," : "rgba(191,91,43,";

  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 100, height: 100 }}>
      <Animated.View style={{
        position: "absolute", width: 100, height: 100, borderRadius: 50,
        borderWidth: 1.5, borderColor: `${color}0.5)`,
        transform: [{ scale: ring2 }], opacity: op2,
      }} />
      <Animated.View style={{
        position: "absolute", width: 100, height: 100, borderRadius: 50,
        borderWidth: 1.5, borderColor: `${color}0.4)`,
        transform: [{ scale: ring1 }], opacity: op1,
      }} />
      <View style={{
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: done ? "rgba(47,138,95,0.12)" : T.colors.primarySoft,
        borderWidth: 1,
        borderColor: done ? "rgba(47,138,95,0.30)" : T.colors.borderFocus,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 28 }}>{done ? "✓" : "✉"}</Text>
      </View>
    </View>
  );
}

export function VerifyEmailScreen({ navigation, route }: P) {
  const { t } = useTranslation();
  const { email } = route.params;
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  // Entrance anims
  const cardY  = useRef(new Animated.Value(30)).current;
  const cardOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardY,  { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  async function resend() {
    setLoading(true); setError(""); setSent(false);
    try {
      const res = await authClient.sendVerificationEmail({ email, callbackURL: "/" });
      if (res.error) throw new Error(res.error.message ?? t("auth.genericError"));
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? t("auth.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>

          <Animated.View style={{
            width: "100%", alignItems: "center",
            opacity: cardOp, transform: [{ translateY: cardY }],
          }}>

            <RipplePulse done={sent} />

            <Text style={{
              fontSize: 26, fontWeight: "800", color: T.colors.text,
              marginTop: 28, marginBottom: 8, letterSpacing: -0.8,
              textAlign: "center",
            }}>
              {t("auth.checkInbox")}
            </Text>

            <Text style={{
              fontSize: 14, color: T.colors.textMuted, textAlign: "center",
              lineHeight: 22, marginBottom: 6,
            }}>
              {t("auth.verifySentTo")}
            </Text>
            <Text style={{
              fontSize: 14, fontWeight: "600", color: T.colors.primary,
              textAlign: "center", marginBottom: 36,
            }}>
              {email}
            </Text>

            {/* Error */}
            {!!error && (
              <View style={{
                width: "100%", backgroundColor: "rgba(197,64,54,0.10)",
                borderWidth: 1, borderColor: "rgba(197,64,54,0.24)",
                borderRadius: T.radius.sm, padding: 12, marginBottom: 16,
              }}>
                <Text style={{ fontSize: 13, color: T.colors.red, textAlign: "center" }}>{error}</Text>
              </View>
            )}

            {/* Success */}
            {sent && (
              <View style={{
                width: "100%", backgroundColor: "rgba(47,138,95,0.10)",
                borderWidth: 1, borderColor: "rgba(47,138,95,0.22)",
                borderRadius: T.radius.sm, padding: 12, marginBottom: 16,
              }}>
                <Text style={{ fontSize: 13, color: T.colors.green, textAlign: "center" }}>
                  {t("auth.emailSentAgain")}
                </Text>
              </View>
            )}

            {/* Resend button */}
            <TouchableOpacity
              onPress={resend}
              disabled={loading}
              style={{
                width: "100%", backgroundColor: T.colors.card,
                borderRadius: T.radius.md, paddingVertical: 15,
                alignItems: "center", borderWidth: 1,
                borderColor: T.colors.border,
                marginBottom: 14,
              }}
              activeOpacity={0.7}>
              {loading
                ? <ActivityIndicator color={T.colors.text} size="small" />
                : <Text style={{ fontSize: 15, fontWeight: "600", color: T.colors.text }}>
                    {t("auth.resendVerification")}
                  </Text>}
            </TouchableOpacity>

            {/* Back */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.6}>
              <Text style={{ fontSize: 13, color: T.colors.textMuted, letterSpacing: 0 }}>
                ← {t("auth.backToSignIn")}
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
