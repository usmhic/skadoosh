import type { ReactNode } from "react";
import { AuthenticatedShell } from "@/components/authenticated-shell";

export default function InboxLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
