"use client";

import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { cn } from "@skaddosh/ui/lib/utils";
import { LockIcon, GlobeIcon } from "lucide-react";

export type AccessControlValue = {
  visibility: "public" | "confidential";
  unlockMethod: "request" | "kudos";
  kudosPrice: number;
};

const VISIBILITY_OPTIONS: Array<{
  id: AccessControlValue["visibility"];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "public", label: "Public", description: "Anyone can view this", icon: GlobeIcon },
  { id: "confidential", label: "Confidential", description: "Hidden until unlocked", icon: LockIcon },
];

const UNLOCK_OPTIONS: Array<{
  id: AccessControlValue["unlockMethod"];
  label: string;
  description: string;
}> = [
  { id: "request", label: "Request", description: "Readers ask, you approve each one" },
  { id: "kudos", label: "Kudos", description: "Readers unlock instantly by spending kudos" },
];

export function AccessControlFields({
  value,
  onChange,
}: {
  value: AccessControlValue;
  onChange: (value: AccessControlValue) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Visibility</Label>
        <div className="grid grid-cols-2 gap-2">
          {VISIBILITY_OPTIONS.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ ...value, visibility: id })}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                value.visibility === id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-foreground/25",
              )}
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", value.visibility === id ? "text-primary" : "text-muted-foreground")} />
              <span>
                <span className={cn("block text-sm font-semibold", value.visibility === id && "text-primary")}>{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {value.visibility === "confidential" ? (
        <>
          <div className="space-y-2">
            <Label>Unlock method</Label>
            <div className="grid grid-cols-2 gap-2">
              {UNLOCK_OPTIONS.map(({ id, label, description }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange({ ...value, unlockMethod: id })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-colors",
                    value.unlockMethod === id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/25",
                  )}
                >
                  <span className={cn("block text-sm font-semibold", value.unlockMethod === id && "text-primary")}>{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </button>
              ))}
            </div>
          </div>

          {value.unlockMethod === "kudos" ? (
            <div className="space-y-2">
              <Label htmlFor="kudos-price">Kudos price</Label>
              <Input
                id="kudos-price"
                type="number"
                min={0}
                max={500}
                value={value.kudosPrice}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  onChange({ ...value, kudosPrice: Number.isFinite(next) ? Math.min(500, Math.max(0, next)) : 0 });
                }}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Readers spend this many kudos to unlock instantly.</p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
