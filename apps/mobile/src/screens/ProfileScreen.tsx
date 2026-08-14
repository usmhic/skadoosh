import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Animated,
  StatusBar,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { getAuthCookie, useSession, signOut } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import { mobileConfig } from "@/config/mobile-env";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "Tabs">;

type ProfileTab = "articles" | "gallery" | "projects" | "story";

/* ────────────────────────────── small atoms ──────────────────────────────── */

function KudosMark({ size = 12 }: { size?: number }) {
  const box = size + 8;
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: box / 2,
        borderWidth: 1,
        borderColor: T.colors.amber,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size,
          lineHeight: size + 2,
          fontWeight: "900",
          fontStyle: "italic",
          color: T.colors.amber,
        }}
      >
        K
      </Text>
    </View>
  );
}

function StatPill({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={{ alignItems: "center", minWidth: 56 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          color: T.colors.text,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 10, color: T.colors.textMuted, marginTop: 1 }}>
        {label}
      </Text>
    </View>
  );
}

function ActionRow({
  label,
  sub,
  onPress,
  danger = false,
}: {
  label: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: T.colors.card,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: T.colors.border,
          borderRadius: T.radius.md,
        }}
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            tension: 200,
            friction: 14,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 200,
            friction: 14,
          }).start()
        }
        activeOpacity={1}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: danger ? T.colors.red : T.colors.text,
            }}
          >
            {label}
          </Text>
          {sub ? (
            <Text
              style={{ fontSize: 12, color: T.colors.textMuted, marginTop: 1 }}
            >
              {sub}
            </Text>
          ) : null}
        </View>
        {!danger && (
          <Text style={{ fontSize: 16, color: T.colors.textMuted }}>›</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─────────────────────────────── main screen ─────────────────────────────── */

export function ProfileScreen({ navigation }: P) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string } | undefined;

  const [activeTab, setActiveTab] = useState<ProfileTab>("articles");
  const [purchaseAmount, setPurchaseAmount] = useState(25);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [portfolioEnabled, setPortfolioEnabled] = useState(true);

  const { data: meData, refetch: refetchMe } = trpc.users.me.useQuery(
    undefined,
    { enabled: !!session },
  );
  const { data: portfolioData } = trpc.portfolios.mine.useQuery(undefined, {
    enabled: !!session,
  });
  const { data: worksData } = trpc.works.mine.useQuery(undefined, {
    enabled: !!session,
  });
  const { data: projectsData } = trpc.projects.mine.useQuery(undefined, {
    enabled: !!session && activeTab === "projects",
  });
  const { data: galleryData } = trpc.gallery.mine.useQuery(undefined, {
    enabled: !!session && activeTab === "gallery",
  });
  const updateSettings = trpc.users.updateSettings.useMutation({
    onSuccess: () => {
      void refetchMe();
    },
  });

  const me = meData?.user as
    | {
        name?: string;
        email?: string;
        bio?: string;
        location?: string;
        username?: string;
        kudosBalance?: number;
        image?: string | null;
      }
    | undefined;
  const settings = meData?.settings;
  const portfolio = portfolioData?.exists ? portfolioData.portfolio : null;
  const works = worksData ?? [];
  const projects = (projectsData ?? []) as Array<{
    id: string;
    title: string;
    accentColor: string;
    status: string;
    tags: string[];
  }>;
  const gallery = (galleryData ?? []) as Array<{
    id: string;
    name: string;
    accentColor: string;
    status: string;
    images: unknown[];
  }>;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (settings) setPortfolioEnabled(settings.portfolioEnabled ?? true);
  }, [settings]);

  const startKudosCheckout = async () => {
    setCheckoutPending(true);
    setCheckoutError("");
    try {
      const authCookie = getAuthCookie();
      const res = await fetch(mobileConfig.kudosCheckoutUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authCookie ? { Cookie: authCookie } : {}),
        },
        body: JSON.stringify({ amount: purchaseAmount }),
      });
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !payload.url)
        throw new Error(payload.error ?? "Unable to open checkout.");
      await Linking.openURL(payload.url);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Unable to open checkout.",
      );
    } finally {
      setCheckoutPending(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You can sign back in at any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  /* not signed in */
  if (!session) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: T.colors.background,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
          gap: 20,
        }}
      >
        <StatusBar barStyle="dark-content" />
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: T.radius.xl,
            backgroundColor: T.colors.surface,
            borderWidth: 1,
            borderColor: T.colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 28 }}>◇</Text>
        </View>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: T.colors.text,
            textAlign: "center",
          }}
        >
          Welcome to skaddosh
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: T.colors.textMuted,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          Sign in to view your profile and manage your work.
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: T.colors.primary,
            borderRadius: T.radius.md,
            paddingHorizontal: 32,
            paddingVertical: 14,
            width: "100%",
            alignItems: "center",
          }}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: T.colors.primaryText,
            }}
          >
            {t("common.signIn")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
          <Text style={{ fontSize: 14, color: T.colors.textMuted }}>
            {t("common.noAccount")}{" "}
            <Text style={{ color: T.colors.text, fontWeight: "600" }}>
              {t("common.signUp")}
            </Text>
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "??";
  const username = me?.username;
  const kudosBalance = me?.kudosBalance ?? 0;
  const publishedCount = works.filter(
    (w) => (w as { published?: boolean }).published,
  ).length;
  const totalKudos = works.reduce(
    (s, w) => s + ((w as { kudosCount?: number }).kudosCount ?? 0),
    0,
  );
  const customDomain = portfolio?.customization.customDomain;

  const TABS: Array<{ value: ProfileTab; label: string }> = [
    { value: "articles", label: "Articles" },
    { value: "gallery", label: "Gallery" },
    { value: "projects", label: "Projects" },
    { value: "story", label: "Story" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + Info ── */}
        <Animated.View
          style={{
            alignItems: "center",
            paddingTop: 36,
            paddingBottom: 20,
            paddingHorizontal: 24,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              backgroundColor: T.colors.surface,
              borderWidth: 1,
              borderColor: T.colors.border,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              overflow: "hidden",
              ...T.shadow.md,
            }}
          >
            {me?.image ? (
              <Image
                source={{ uri: me.image }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={{
                  fontSize: 34,
                  fontWeight: "700",
                  color: T.colors.text,
                }}
              >
                {initials}
              </Text>
            )}
          </View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: T.colors.text,
              letterSpacing: -0.5,
              textAlign: "center",
            }}
          >
            {user?.name}
          </Text>
          {username ? (
            <Text
              style={{
                fontSize: 12,
                color: T.colors.textMuted,
                marginTop: 3,
                fontFamily: "monospace",
              }}
            >
              @{username}
            </Text>
          ) : null}
          {me?.bio ? (
            <Text
              style={{
                fontSize: 13,
                color: T.colors.textMuted,
                marginTop: 10,
                textAlign: "center",
                lineHeight: 20,
                maxWidth: 280,
              }}
            >
              {me.bio}
            </Text>
          ) : null}

          {/* Stats row */}
          <View
            style={{
              flexDirection: "row",
              gap: 20,
              marginTop: 20,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: T.colors.border,
              width: "100%",
            }}
          >
            <StatPill value={works.length} label="works" />
            <View style={{ width: 1, backgroundColor: T.colors.border }} />
            <StatPill value={publishedCount} label="published" />
            <View style={{ width: 1, backgroundColor: T.colors.border }} />
            <StatPill value={totalKudos} label="Kudos" />
            <View style={{ width: 1, backgroundColor: T.colors.border }} />
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <KudosMark size={10} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: T.colors.amber,
                  letterSpacing: -0.3,
                }}
              >
                {kudosBalance}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Tab bar ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 4,
            gap: 6,
            flexDirection: "row",
          }}
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.value}
              onPress={() => setActiveTab(tab.value)}
              style={{
                borderRadius: T.radius.md,
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor:
                  activeTab === tab.value ? T.colors.text : T.colors.card,
                borderWidth: 1,
                borderColor:
                  activeTab === tab.value ? T.colors.text : T.colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color:
                    activeTab === tab.value
                      ? T.colors.primaryText
                      : T.colors.textMuted,
                }}
              >
                {tab.value === "story" ? "✦ " : ""}
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ height: 16 }} />

        {/* ── Tab content ── */}
        {activeTab === "articles" ? (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: T.radius.md,
                borderWidth: 1,
                borderColor: T.colors.border,
                paddingVertical: 11,
                backgroundColor: T.colors.card,
              }}
              onPress={() => navigation.navigate("NewContent")}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: T.colors.text,
                  fontWeight: "700",
                }}
              >
                +
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: T.colors.text,
                }}
              >
                New article
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                alignItems: "center",
                paddingVertical: 11,
                borderRadius: T.radius.md,
                backgroundColor: T.colors.text,
              }}
              onPress={() => navigation.navigate("Studio")}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: T.colors.primaryText,
                }}
              >
                Open Studio
              </Text>
            </TouchableOpacity>
            {works.length === 0 ? (
              <View
                style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}
              >
                <Text style={{ fontSize: 32 }}>◌</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: T.colors.text,
                  }}
                >
                  No articles yet
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: T.colors.textMuted,
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  Your published reads will appear here.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {activeTab === "gallery" ? (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <TouchableOpacity
              style={{
                alignItems: "center",
                paddingVertical: 11,
                borderRadius: T.radius.md,
                backgroundColor: T.colors.text,
              }}
              onPress={() => navigation.navigate("Studio")}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: T.colors.primaryText,
                }}
              >
                Open Studio Gallery
              </Text>
            </TouchableOpacity>
            {gallery.length === 0 ? (
              <View
                style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}
              >
                <Text style={{ fontSize: 32 }}>⬡</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: T.colors.text,
                  }}
                >
                  No collections yet
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: T.colors.textMuted,
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  Create photo collections in your Studio.
                </Text>
              </View>
            ) : (
              gallery.map((g) => (
                <View
                  key={g.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: T.colors.card,
                    borderRadius: T.radius.md,
                    borderWidth: 1,
                    borderColor: T.colors.border,
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: T.radius.md,
                      backgroundColor: `${g.accentColor}18`,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: `${g.accentColor}28`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: g.accentColor,
                      }}
                    >
                      {(g.name || "G").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: T.colors.text,
                      }}
                      numberOfLines={1}
                    >
                      {g.name || "Untitled"}
                    </Text>
                    <Text style={{ fontSize: 11, color: T.colors.textMuted }}>
                      {g.images.length} photos
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: T.radius.full,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      backgroundColor:
                        g.status === "published"
                          ? "rgba(34,197,94,0.10)"
                          : T.colors.surface,
                      borderWidth: 1,
                      borderColor:
                        g.status === "published"
                          ? "rgba(34,197,94,0.22)"
                          : T.colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "800",
                        color:
                          g.status === "published"
                            ? T.colors.green
                            : T.colors.textMuted,
                      }}
                    >
                      {g.status === "published" ? "Published" : "Draft"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeTab === "projects" ? (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <TouchableOpacity
              style={{
                alignItems: "center",
                paddingVertical: 11,
                borderRadius: T.radius.md,
                backgroundColor: T.colors.text,
              }}
              onPress={() => navigation.navigate("Studio")}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: T.colors.primaryText,
                }}
              >
                Open Studio Projects
              </Text>
            </TouchableOpacity>
            {projects.length === 0 ? (
              <View
                style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}
              >
                <Text style={{ fontSize: 32 }}>◈</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: T.colors.text,
                  }}
                >
                  No projects yet
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: T.colors.textMuted,
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  Add your projects from the Studio tab.
                </Text>
              </View>
            ) : (
              projects.map((p) => (
                <View
                  key={p.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: T.colors.card,
                    borderRadius: T.radius.md,
                    borderWidth: 1,
                    borderColor: T.colors.border,
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: T.radius.md,
                      backgroundColor: `${p.accentColor}18`,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: `${p.accentColor}28`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: p.accentColor,
                      }}
                    >
                      {(p.title || "P").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: T.colors.text,
                      }}
                      numberOfLines={1}
                    >
                      {p.title || "Untitled"}
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: T.colors.textMuted }}
                      numberOfLines={1}
                    >
                      {p.tags.slice(0, 3).join(", ") || "No tags"}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: T.radius.full,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      backgroundColor:
                        p.status === "published"
                          ? "rgba(34,197,94,0.10)"
                          : T.colors.surface,
                      borderWidth: 1,
                      borderColor:
                        p.status === "published"
                          ? "rgba(34,197,94,0.22)"
                          : T.colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "800",
                        color:
                          p.status === "published"
                            ? T.colors.green
                            : T.colors.textMuted,
                      }}
                    >
                      {p.status === "published" ? "Live" : "Draft"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeTab === "story" ? (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {/* Premium label */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: "rgba(245,158,11,0.10)",
                borderRadius: T.radius.md,
                borderWidth: 1,
                borderColor: "rgba(245,158,11,0.20)",
              }}
            >
              <Text style={{ fontSize: 11, color: "rgba(245,158,11,1)" }}>
                ✦
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "rgba(245,158,11,0.9)",
                }}
              >
                Story — Premium Feature
              </Text>
            </View>

            {portfolio ? (
              <>
                <View
                  style={{
                    backgroundColor: T.colors.card,
                    borderRadius: T.radius.lg,
                    borderWidth: 1,
                    borderColor: T.colors.border,
                    padding: 16,
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: T.colors.text,
                    }}
                  >
                    {portfolio.displayName ?? user?.name}
                  </Text>
                  {portfolio.prompt ? (
                    <Text
                      style={{
                        fontSize: 13,
                        color: T.colors.textMuted,
                        lineHeight: 20,
                      }}
                    >
                      {portfolio.prompt}
                    </Text>
                  ) : null}
                  {customDomain ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(
                          `https://${customDomain.replace(/^https?:\/\//, "")}`,
                        )
                      }
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: T.colors.text,
                          fontWeight: "600",
                          textDecorationLine: "underline",
                        }}
                      >
                        {customDomain.replace(/^https?:\/\//, "")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={{
                    alignItems: "center",
                    paddingVertical: 13,
                    borderRadius: T.radius.md,
                    backgroundColor: T.colors.text,
                  }}
                  onPress={() =>
                    navigation.navigate("Portfolio", {
                      username: portfolio.username,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: T.colors.primaryText,
                    }}
                  >
                    Visit Story ↗
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    alignItems: "center",
                    paddingVertical: 11,
                    borderRadius: T.radius.md,
                    borderWidth: 1,
                    borderColor: T.colors.border,
                    backgroundColor: T.colors.card,
                  }}
                  onPress={() =>
                    navigation.navigate("EditPortfolio", {
                      username: portfolio.username,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: T.colors.text,
                    }}
                  >
                    Edit Story Builder
                  </Text>
                </TouchableOpacity>

                {/* Visibility toggle */}
                <View
                  style={{
                    backgroundColor: T.colors.card,
                    borderRadius: T.radius.md,
                    borderWidth: 1,
                    borderColor: T.colors.border,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: T.colors.text,
                      }}
                    >
                      Show Story on profile
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: T.colors.textMuted,
                        marginTop: 2,
                      }}
                    >
                      Visible to visitors on your public profile.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      borderRadius: T.radius.full,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      backgroundColor: portfolioEnabled
                        ? T.colors.text
                        : T.colors.surface,
                      borderWidth: 1,
                      borderColor: portfolioEnabled
                        ? T.colors.text
                        : T.colors.border,
                    }}
                    onPress={() => {
                      const next = !portfolioEnabled;
                      setPortfolioEnabled(next);
                      updateSettings.mutate({ portfolioEnabled: next });
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 11,
                        color: portfolioEnabled
                          ? T.colors.primaryText
                          : T.colors.textMuted,
                      }}
                    >
                      {portfolioEnabled ? "On" : "Off"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View
                style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}
              >
                <Text style={{ fontSize: 36 }}>✦</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: T.colors.text,
                  }}
                >
                  No Story yet
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: T.colors.textMuted,
                    textAlign: "center",
                    lineHeight: 20,
                    maxWidth: 240,
                  }}
                >
                  Create your dedicated Story site — experience, education,
                  skills, and a contact form.
                </Text>
                <TouchableOpacity
                  style={{
                    marginTop: 8,
                    borderRadius: T.radius.md,
                    borderWidth: 1,
                    borderColor: T.colors.border,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    backgroundColor: T.colors.card,
                  }}
                  onPress={() =>
                    navigation.navigate("EditPortfolio", undefined)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: T.colors.text,
                    }}
                  >
                    Set up Story Builder
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {/* ── Hot Kudos purchase ── */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 24,
            backgroundColor: T.colors.card,
            borderRadius: T.radius.xl,
            borderWidth: 1,
            borderColor: T.colors.border,
            padding: 18,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: T.colors.text,
                }}
              >
                Hot Kudos
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: T.colors.textMuted,
                  marginTop: 2,
                }}
              >
                Spend on reads you love
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <KudosMark />
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: T.colors.amber,
                }}
              >
                {kudosBalance}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[25, 100, 250].map((amount) => (
              <TouchableOpacity
                key={amount}
                onPress={() => setPurchaseAmount(amount)}
                style={{
                  flex: 1,
                  borderRadius: T.radius.md,
                  borderWidth: 1,
                  borderColor:
                    purchaseAmount === amount ? T.colors.text : T.colors.border,
                  backgroundColor:
                    purchaseAmount === amount
                      ? T.colors.text
                      : T.colors.surface,
                  paddingVertical: 9,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color:
                      purchaseAmount === amount
                        ? T.colors.primaryText
                        : T.colors.textMuted,
                  }}
                >
                  {amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {checkoutError ? (
            <Text style={{ color: T.colors.red, fontSize: 12 }}>
              {checkoutError}
            </Text>
          ) : null}
          <TouchableOpacity
            style={{
              backgroundColor: checkoutPending
                ? T.colors.textMuted
                : T.colors.text,
              borderRadius: T.radius.md,
              paddingVertical: 11,
              alignItems: "center",
            }}
            disabled={checkoutPending}
            onPress={startKudosCheckout}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: T.colors.primaryText,
              }}
            >
              {checkoutPending ? "Opening..." : `Buy ${purchaseAmount} Kudos`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick links ── */}
        <View style={{ marginHorizontal: 16, marginTop: 20, gap: 8 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: T.colors.textMuted,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Account
          </Text>
          <ActionRow
            label="Settings"
            sub="Name, username, bio, language"
            onPress={() => navigation.navigate("Settings")}
          />
          {username ? (
            <ActionRow
              label="Public Profile"
              sub={`skaddosh/@${username}`}
              onPress={() =>
                Linking.openURL(`${mobileConfig.apiBaseUrl}/${username}`)
              }
            />
          ) : null}
          <ActionRow
            label="Inbox"
            sub="Messages from your Story site"
            onPress={() => navigation.navigate("Inbox")}
          />
          <ActionRow label="Sign out" danger onPress={confirmSignOut} />
        </View>

        <View style={{ height: 32 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
