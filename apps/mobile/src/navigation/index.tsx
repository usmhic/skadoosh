import React, { useRef, useEffect } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { HomeScreen } from "@/screens/HomeScreen";
import { ReadScreen } from "@/screens/ReadScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { SignupScreen } from "@/screens/SignupScreen";
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen";
import { StudioScreen } from "@/screens/StudioScreen";
import { EditorScreen } from "@/screens/EditorScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { WelcomeScreen } from "@/screens/WelcomeScreen";
import { VerifyEmailScreen } from "@/screens/VerifyEmailScreen";
import { PortfolioScreen } from "@/screens/PortfolioScreen";
import { EditPortfolioScreen } from "@/screens/EditPortfolioScreen";
import { InboxScreen } from "@/screens/InboxScreen";
import { NewContentScreen } from "@/screens/NewContentScreen";
import { theme as T } from "@/lib/theme";

export type RootStackParams = {
  Welcome: undefined;
  Tabs: undefined;
  Read: { workId: string };
  Login: undefined;
  Signup: { role?: string } | undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email: string };
  Studio: undefined;
  NewContent: undefined;
  Editor: { workId: string };
  Creator: { username: string };
  Portfolio: { username?: string } | undefined;
  EditPortfolio: { username?: string } | undefined;
  Inbox: undefined;
  Settings: undefined;
};

type TabsParams = {
  Discover: undefined;
  Studio: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabsParams>();

const SKADDOSH_NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: T.colors.background,
    card: T.colors.card,
    border: T.colors.border,
    text: T.colors.text,
    notification: T.colors.primary,
    primary: T.colors.primary,
  },
};

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Studio: { active: "\u2726", inactive: "\u2727" },
  Discover: { active: "⌕", inactive: "⌕" },
  Profile: { active: "◎", inactive: "◎" },
};

function TabItem({
  route,
  focused,
  label,
  onPress,
}: {
  route: string;
  focused: boolean;
  label: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.85)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.45)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1 : 0.85,
        useNativeDriver: true,
        tension: 160,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.45,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 52,
        alignItems: "center",
        justifyContent: "center",
      }}
      activeOpacity={0.7}
    >
      <Animated.View
        style={{
          alignItems: "center",
          gap: 4,
          transform: [{ scale }],
          opacity,
        }}
      >
        <View
          style={{
            width: 34,
            height: 28,
            borderRadius: T.radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: focused ? T.colors.accent : "transparent",
            borderWidth: focused ? 1 : 0,
            borderColor: focused ? T.colors.border : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: focused ? T.colors.accentText : T.colors.textMuted,
            }}
          >
            {TAB_ICONS[route]?.[focused ? "active" : "inactive"] ?? "●"}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 10,
            fontWeight: focused ? "800" : "600",
            color: focused ? T.colors.text : T.colors.textMuted,
            letterSpacing: 0,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: T.colors.card,
        borderTopWidth: 1,
        borderTopColor: T.colors.border,
        paddingBottom: insets.bottom,
        paddingTop: 10,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]!;
        const focused = state.index === index;
        const label =
          (options.tabBarLabel as string | undefined) ??
          options.title ??
          route.name;
        return (
          <TabItem
            key={route.key}
            route={route.name}
            focused={focused}
            label={label}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented)
                navigation.navigate(route.name);
            }}
          />
        );
      })}
    </View>
  );
}

function Tabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Discover"
        component={HomeScreen as React.ComponentType<any>}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Studio"
        component={StudioScreen as React.ComponentType<any>}
        options={{ tabBarLabel: "Studio" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen as React.ComponentType<any>}
        options={{ tabBarLabel: t("common.profile") }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={SKADDOSH_NAV_THEME}>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: { backgroundColor: T.colors.background },
          headerTintColor: T.colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: T.colors.background },
          animation: "default",
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Tabs"
          component={Tabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Read"
          component={ReadScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false, animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false, animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VerifyEmail"
          component={VerifyEmailScreen}
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen
          name="Studio"
          component={StudioScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="NewContent"
          component={NewContentScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Editor"
          component={EditorScreen}
          options={{ title: "Edit" }}
        />
        <Stack.Screen
          name="Portfolio"
          component={PortfolioScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditPortfolio"
          component={EditPortfolioScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Inbox"
          component={InboxScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
