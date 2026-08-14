"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StudioHero, StudioMain } from "@/components/studio/studio-page-shell";
import { CreateItemDialog } from "@/components/studio/create-item-dialog";

export default function NewContentPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) router.replace("/studio");
  }, [open, router]);

  return (
    <>
      <StudioHero title="Create new" description="Choose what you'd like to add." />
      <StudioMain wide>
        <CreateItemDialog open={open} onOpenChange={setOpen} />
      </StudioMain>
    </>
  );
}
