"use client";

import { Suspense } from "react";
import { DiscoverySurface } from "@/components/discovery/discovery-surface";

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverySurface basePath="/read" />
    </Suspense>
  );
}
