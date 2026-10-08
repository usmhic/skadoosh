import {
  ArchiveIcon,
  ClapperboardIcon,
  FeatherIcon,
  Gamepad2Icon,
  LightbulbIcon,
  MusicIcon,
  PaletteIcon,
  QuoteIcon,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  feather: FeatherIcon,
  quote: QuoteIcon,
  lightbulb: LightbulbIcon,
  palette: PaletteIcon,
  music: MusicIcon,
  gamepad: Gamepad2Icon,
  clapperboard: ClapperboardIcon,
  archive: ArchiveIcon,
};

export function CircleIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? FeatherIcon;
  return <Icon className={className} />;
}
