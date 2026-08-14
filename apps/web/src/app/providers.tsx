"use client";

import { ThemeProvider } from "next-themes";
import { TRPCProvider } from "@/lib/trpc/provider";
import { LangProvider } from "@/lib/lang-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TRPCProvider>
        <LangProvider>
          {children}
        </LangProvider>
      </TRPCProvider>
    </ThemeProvider>
  );
}
