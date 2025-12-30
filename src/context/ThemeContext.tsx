import React, { createContext, useContext, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

type ThemeColors = {
  bg: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentDark: string;
  tabBg: string;
  headerBg: string;
};

const palettes: Record<ThemeMode, ThemeColors> = {
  light: {
    bg: "#F5F5F5",
    card: "#FFFFFF",
    border: "#E0E0E0",
    text: "#111111",
    muted: "#777777",
    accent: "#08E8DE",
    accentDark: "#06ADA6",
    tabBg: "#FFFFFF",
    headerBg: "#FFFFFF",
  },
  dark: {
    bg: "#000309",
    card: "#061316",
    border: "#06ADA6",
    text: "#EAFDFC",
    muted: "#A5E3E0",
    accent: "#08E8DE",
    accentDark: "#06ADA6",
    tabBg: "#000309",
    headerBg: "#000309",
  },
};

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  colors: ThemeColors;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  const colors = useMemo(() => palettes[theme], [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")),
      colors,
    }),
    [theme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback to light theme if provider not mounted yet
    return {
      theme: "light" as const,
      setTheme: () => {},
      toggle: () => {},
      colors: palettes.light,
    };
  }
  return ctx;
};

