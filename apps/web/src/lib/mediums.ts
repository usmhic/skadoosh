import {
  AppWindowIcon,
  BookOpenTextIcon,
  CameraIcon,
  ClapperboardIcon,
  Gamepad2Icon,
  MicroscopeIcon,
  MusicIcon,
  PaletteIcon,
  PenToolIcon,
  ShapesIcon,
  type LucideIcon,
} from "lucide-react";
import type { Medium } from "@skaddosh/db/schema";

export const MEDIUM_INFO: Record<Medium, { label: string; icon: LucideIcon }> = {
  art: { label: "Art", icon: PaletteIcon },
  design: { label: "Design", icon: PenToolIcon },
  software: { label: "Software", icon: AppWindowIcon },
  music: { label: "Music", icon: MusicIcon },
  writing: { label: "Writing", icon: BookOpenTextIcon },
  film: { label: "Film", icon: ClapperboardIcon },
  games: { label: "Games", icon: Gamepad2Icon },
  photography: { label: "Photography", icon: CameraIcon },
  research: { label: "Research", icon: MicroscopeIcon },
  other: { label: "Other", icon: ShapesIcon },
};

export function mediumLabel(medium: string | null | undefined) {
  return MEDIUM_INFO[(medium ?? "other") as Medium]?.label ?? "Other";
}
