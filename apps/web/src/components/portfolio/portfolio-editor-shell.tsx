"use client";

import dynamic from "next/dynamic";

export const PortfolioEditorShell = dynamic(
  () => import("./portfolio-editor-page").then((module) => module.PortfolioEditorPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    ),
  },
);
