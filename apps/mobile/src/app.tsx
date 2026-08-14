import React, { useState } from "react";
import { Text, TextInput } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { theme as T } from "@/lib/theme";
import { AppNavigator } from "@/navigation";
import "@/lib/i18n";

type ComponentWithDefaultProps = {
  defaultProps?: { style?: unknown; placeholderTextColor?: string };
};

function applyDefaultStyle(component: unknown, style: object, extraProps: Record<string, unknown> = {}) {
  const target = component as ComponentWithDefaultProps;
  target.defaultProps = {
    ...target.defaultProps,
    ...extraProps,
    style: [style, target.defaultProps?.style].filter(Boolean),
  };
}

applyDefaultStyle(Text, { fontFamily: T.fonts.sans, color: T.colors.text });
applyDefaultStyle(TextInput, { fontFamily: T.fonts.sans, color: T.colors.text }, {
  placeholderTextColor: T.colors.textSubtle,
});

export default function App() {
  const [qc] = useState(() => new QueryClient());
  return (
    <trpc.Provider client={trpcClient} queryClient={qc}>
      <QueryClientProvider client={qc}>
        <AppNavigator />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
