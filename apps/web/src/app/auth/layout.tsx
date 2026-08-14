import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <BrandMark className="mb-8" />
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
