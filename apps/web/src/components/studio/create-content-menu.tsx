"use client";

import { useState } from "react";
import { Button } from "@skaddosh/ui/components/ui/button";
import { PlusIcon } from "lucide-react";
import { CreateItemDialog } from "./create-item-dialog";

type ContentType = "article" | "project" | "gallery";

export function CreateContentMenu({
  buttonLabel = "New",
  iconOnly = false,
  initialType,
}: {
  buttonLabel?: string;
  iconOnly?: boolean;
  initialType?: ContentType;
}) {
  const [open, setOpen] = useState(false);
  const [startType, setStartType] = useState<ContentType | undefined>(initialType);

  function handleOpen() {
    setStartType(initialType);
    setOpen(true);
  }

  return (
    <>
      <Button
        id={!initialType ? "studio-create-btn" : undefined}
        size={iconOnly ? "icon" : "sm"}
        aria-label="Create new item"
        onClick={handleOpen}
      >
        <PlusIcon className="size-4" />
        {!iconOnly && <span>{buttonLabel}</span>}
      </Button>
      <CreateItemDialog open={open} onOpenChange={setOpen} initialType={startType} />
    </>
  );
}
