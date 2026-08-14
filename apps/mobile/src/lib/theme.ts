import { Platform } from "react-native";

export const theme = {
  colors: {
    background: "#fbf7ee",
    surface:    "#f1eadc",
    card:       "#fffdf8",
    border:     "rgba(77,68,54,0.16)",
    borderFocus:"rgba(191,91,43,0.44)",
    text:       "#232a35",
    textMuted:  "#6d6e73",
    textSubtle: "#9a9185",
    primary:    "#bf5b2b",
    primaryText:"#fffaf2",
    primarySoft:"rgba(191,91,43,0.12)",
    accent:     "#dcebdd",
    accentText: "#25413b",
    green:      "#2f8a5f",
    red:        "#c54036",
    amber:      "#a86f1e",
    overlay:    "rgba(35,42,53,0.62)",
  },
  fonts: {
    sans: Platform.select({ ios: "Avenir Next", android: "sans-serif", default: "System" }),
    arabic: Platform.select({ ios: "Geeza Pro", android: "sans-serif", default: "System" }),
    display: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium", default: "System" }),
  },
  radius: { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  shadow: {
    sm: {
      shadowColor: "#31271b",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: "#31271b",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
    lg: {
      shadowColor: "#31271b",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 12,
    },
  },
} as const;
