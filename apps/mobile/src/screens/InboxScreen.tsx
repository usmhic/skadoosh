import React, { useRef, useEffect } from "react";
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import type { RootStackParams } from "@/navigation";

type P = NativeStackScreenProps<RootStackParams, "Inbox">;

function MessageCard({
  message,
  onMarkRead,
  onRemove,
  markPending,
  removePending,
}: {
  message: {
    id: string;
    subject: string;
    from: { name: string; email: string };
    body: string;
    createdAt: number;
    read: boolean;
    kind?: string;
  };
  onMarkRead: () => void;
  onRemove: () => void;
  markPending: boolean;
  removePending: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const date = new Date(message.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: message.read ? T.colors.border : T.colors.borderFocus,
          borderRadius: T.radius.lg,
          backgroundColor: message.read ? T.colors.card : T.colors.primarySoft,
          padding: 14,
          gap: 8,
        }}
      >
        {/* Header row */}
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}
        >
          {!message.read && (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: T.colors.primary,
                marginTop: 5,
                flexShrink: 0,
              }}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: T.colors.text,
                lineHeight: 20,
              }}
            >
              {message.subject}
            </Text>
            <Text
              style={{ fontSize: 11, color: T.colors.textMuted, marginTop: 2 }}
            >
              {message.from.name && message.from.name !== message.from.email
                ? `${message.from.name} · ${message.from.email}`
                : message.from.email}
            </Text>
          </View>
          <Text
            style={{ fontSize: 10, color: T.colors.textMuted, flexShrink: 0 }}
          >
            {date}
          </Text>
        </View>

        {/* Body */}
        <Text
          style={{ fontSize: 13, color: T.colors.textMuted, lineHeight: 20 }}
          numberOfLines={4}
        >
          {message.body}
        </Text>

        {/* Actions */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            paddingTop: 4,
            borderTopWidth: 1,
            borderTopColor: T.colors.border,
          }}
        >
          <TouchableOpacity
            disabled={markPending}
            onPress={onMarkRead}
            activeOpacity={0.7}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "700", color: T.colors.text }}
            >
              {message.read ? "Mark unread" : "Mark read"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={removePending}
            onPress={onRemove}
            activeOpacity={0.7}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "700", color: T.colors.red }}
            >
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export function InboxScreen({ navigation }: P) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const inbox = trpc.portfolios.mine.useQuery(undefined, {
    enabled: !!session,
  });
  const markRead = trpc.portfolios.markInboxRead.useMutation({
    onSuccess: async () => {
      await utils.portfolios.mine.invalidate();
    },
  });
  const removeMessage = trpc.portfolios.removeInboxMessage.useMutation({
    onSuccess: async () => {
      await utils.portfolios.mine.invalidate();
    },
  });
  const clearInbox = trpc.portfolios.clearInbox.useMutation({
    onSuccess: async () => {
      await utils.portfolios.mine.invalidate();
    },
  });

  const messages = inbox.data?.exists ? (inbox.data.portfolio.inbox ?? []) : [];
  const unread = messages.filter((m: { read: boolean }) => !m.read).length;

  const confirmClear = () => {
    Alert.alert(
      "Clear inbox?",
      `This permanently removes all ${messages.length} message${messages.length === 1 ? "" : "s"}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear inbox",
          style: "destructive",
          onPress: () => clearInbox.mutate(),
        },
      ],
    );
  };

  const confirmRemove = (id: string) => {
    Alert.alert(
      "Delete message?",
      "This message will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeMessage.mutate({ id }),
        },
      ],
    );
  };

  if (!session) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: T.colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          gap: 16,
        }}
      >
        <StatusBar barStyle="dark-content" />
        <Text style={{ fontSize: 36 }}>✉</Text>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: T.colors.text,
            textAlign: "center",
          }}
        >
          Sign in to view Inbox
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={{
            backgroundColor: T.colors.primary,
            borderRadius: T.radius.md,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: T.colors.primaryText, fontWeight: "700" }}>
            Sign in
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.background }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: T.colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 15, color: T.colors.textMuted }}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: T.colors.text,
              letterSpacing: -0.3,
            }}
          >
            Inbox
          </Text>
          {unread > 0 ? (
            <Text
              style={{ fontSize: 10, color: T.colors.textMuted, marginTop: 1 }}
            >
              {unread} unread
            </Text>
          ) : (
            <Text
              style={{ fontSize: 10, color: T.colors.textMuted, marginTop: 1 }}
            >
              All caught up
            </Text>
          )}
        </View>
        <TouchableOpacity
          disabled={!messages.length || clearInbox.isPending}
          onPress={confirmClear}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: messages.length ? T.colors.red : T.colors.textMuted,
            }}
          >
            {clearInbox.isPending ? "..." : "Clear"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {inbox.isPending ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                height: 96,
                borderRadius: T.radius.lg,
                backgroundColor: T.colors.card,
                borderWidth: 1,
                borderColor: T.colors.border,
                opacity: 0.7,
              }}
            />
          ))}
        </View>
      ) : inbox.error ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: T.colors.text,
              textAlign: "center",
            }}
          >
            Inbox could not load
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: T.colors.textMuted,
              textAlign: "center",
            }}
          >
            {inbox.error.message}
          </Text>
          <TouchableOpacity
            onPress={() => inbox.refetch()}
            style={{
              backgroundColor: T.colors.primary,
              borderRadius: T.radius.md,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: T.colors.primaryText, fontWeight: "700" }}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : messages.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 44 }}>✉</Text>
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: T.colors.text }}
          >
            No messages
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: T.colors.textMuted,
              textAlign: "center",
              lineHeight: 21,
              maxWidth: 260,
            }}
          >
            Contact requests from your Story site will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {(
            messages as Array<{
              id: string;
              subject: string;
              from: { name: string; email: string };
              body: string;
              createdAt: number;
              read: boolean;
              kind?: string;
            }>
          ).map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              markPending={markRead.isPending}
              removePending={removeMessage.isPending}
              onMarkRead={() =>
                markRead.mutate({ id: message.id, read: !message.read })
              }
              onRemove={() => confirmRemove(message.id)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
