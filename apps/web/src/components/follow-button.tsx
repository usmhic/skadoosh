"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { CheckIcon, PlusIcon } from "lucide-react";

export function FollowButton({
  creatorId,
  following,
  signedIn,
  onChanged,
  size = "sm",
}: {
  creatorId: string;
  following: boolean;
  signedIn: boolean;
  onChanged?: () => void;
  size?: "sm" | "default";
}) {
  const mutation = trpc.creators.follow.useMutation({ onSuccess: () => onChanged?.() });

  if (!signedIn) {
    return (
      <Button asChild variant="outline" size={size} className="rounded-full">
        <Link href="/auth/login">
          <PlusIcon className="size-3.5" /> Follow
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant={following ? "outline" : "default"}
      size={size}
      className="rounded-full"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate({ creatorId, following: !following })}
    >
      {following ? <CheckIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
