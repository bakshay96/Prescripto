"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { TypingLang } from "../utils/transliteration";

export type ThemeId = "dark" | "light" | "govblue" | "highcontrast" | "indigo" | "forest" | "sunset";
export type Lang = "mr" | "en" | "hi";
export type FontSizeScale = 0.9 | 1.0 | 1.15; // A-, A, A+

export interface ThemeTokens {
  id: ThemeId;
  label: string;
  emoji: string;
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  badgeBg?: string;
  badgeText?: string;
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  dark: {
    id: "dark", label: "Dark", emoji: "🌑",
    bg: "#020617", surface: "#0f172a", card: "#0f172a",
    border: "#1e293b", text: "#f8fafc", textMuted: "#64748b",
    accent: "#c41e3a", accentText: "#fff",
    inputBg: "#020617", inputBorder: "#1e293b", inputText: "#f8fafc",
  },
  light: {
    id: "light", label: "Light", emoji: "☀️",
    bg: "#f8fafc", surface: "#ffffff", card: "#ffffff",
    border: "#e2e8f0", text: "#0f172a", textMuted: "#475569",
    accent: "#c41e3a", accentText: "#fff",
    inputBg: "#ffffff", inputBorder: "#cbd5e1", inputText: "#0f172a",
  },
  govblue: {
    id: "govblue", label: "UX4G Gov", emoji: "🏛️",
    bg: "#0b192c", surface: "#1e3e62", card: "#1e3e62",
    border: "#005691", text: "#ffffff", textMuted: "#90caf9",
    accent: "#ff671f", accentText: "#fff",
    inputBg: "#0b192c", inputBorder: "#005691", inputText: "#ffffff",
    badgeBg: "#046a38", badgeText: "#ffffff",
  },
  highcontrast: {
    id: "highcontrast", label: "High Contrast", emoji: "👁️",
    bg: "#000000", surface: "#111111", card: "#111111",
    border: "#ffff00", text: "#ffff00", textMuted: "#00ffff",
    accent: "#ffff00", accentText: "#000",
    inputBg: "#000000", inputBorder: "#ffff00", inputText: "#ffff00",
  },
  indigo: {
    id: "indigo", label: "Indigo", emoji: "🔵",
    bg: "#0f0e2b", surface: "#1a1850", card: "#1e1c5a",
    border: "#312e81", text: "#e0e7ff", textMuted: "#a5b4fc",
    accent: "#6366f1", accentText: "#fff",
    inputBg: "#0f0e2b", inputBorder: "#312e81", inputText: "#e0e7ff",
  },
  forest: {
    id: "forest", label: "Forest", emoji: "🌿",
    bg: "#052e16", surface: "#14532d", card: "#166534",
    border: "#166534", text: "#ecfdf5", textMuted: "#6ee7b7",
    accent: "#10b981", accentText: "#fff",
    inputBg: "#052e16", inputBorder: "#166534", inputText: "#ecfdf5",
  },
  sunset: {
    id: "sunset", label: "Sunset", emoji: "🌅",
    bg: "#1c0a00", surface: "#431407", card: "#7c2d12",
    border: "#9a3412", text: "#fff7ed", textMuted: "#fdba74",
    accent: "#f97316", accentText: "#fff",
    inputBg: "#1c0a00", inputBorder: "#9a3412", inputText: "#fff7ed",
  },
};

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeTokens;
  setTheme: (id: ThemeId) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  typingLang: TypingLang;
  setTypingLang: (tl: TypingLang) => void;
  fontSizeScale: FontSizeScale;
  setFontSizeScale: (fs: FontSizeScale) => void;
  prescriptionColor: string;
  setPrescriptionColor: (c: string) => void;
  isFullViewMode: boolean;
  toggleFullViewMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: "dark",
  theme: THEMES.dark,
  setTheme: () => {},
  lang: "mr",
  setLang: () => {},
  typingLang: "E",
  setTypingLang: () => {},
  fontSizeScale: 1.0,
  setFontSizeScale: () => {},
  prescriptionColor: "#1a237e",
  setPrescriptionColor: () => {},
  isFullViewMode: false,
  toggleFullViewMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("dark");
  const [lang, setLangState] = useState<Lang>("mr");
  const [typingLang, setTypingLangState] = useState<TypingLang>("E");
  const [fontSizeScale, setFontSizeScaleState] = useState<FontSizeScale>(1.0);
  const [prescriptionColor, setPrescriptionColorState] = useState("#1a237e");
  const [isFullViewMode, setIsFullViewMode] = useState(false);

  const toggleFullViewMode = useCallback(() => {
    setIsFullViewMode((prev) => !prev);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("prescripto_theme_v4") as ThemeId | null;
    if (saved && THEMES[saved]) setThemeId(saved);

    const savedLang = localStorage.getItem("prescripto_lang") as Lang | null;
    if (savedLang) setLangState(savedLang);

    const savedTyping = localStorage.getItem("prescripto_typing_lang") as TypingLang | null;
    if (savedTyping) setTypingLangState(savedTyping);

    const savedFont = localStorage.getItem("prescripto_font_scale");
    if (savedFont) setFontSizeScaleState(parseFloat(savedFont) as FontSizeScale);

    const savedColor = localStorage.getItem("prescripto_rx_color");
    if (savedColor) setPrescriptionColorState(savedColor);
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    if (typeof window !== "undefined") localStorage.setItem("prescripto_theme_v4", id);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("prescripto_lang", l);
  }, []);

  const setTypingLang = useCallback((tl: TypingLang) => {
    setTypingLangState(tl);
    if (typeof window !== "undefined") localStorage.setItem("prescripto_typing_lang", tl);
  }, []);

  const setFontSizeScale = useCallback((fs: FontSizeScale) => {
    setFontSizeScaleState(fs);
    if (typeof window !== "undefined") localStorage.setItem("prescripto_font_scale", fs.toString());
  }, []);

  const setPrescriptionColor = useCallback((c: string) => {
    setPrescriptionColorState(c);
    if (typeof window !== "undefined") localStorage.setItem("prescripto_rx_color", c);
  }, []);

  return (
    <ThemeContext.Provider value={{
      themeId,
      theme: THEMES[themeId],
      setTheme,
      lang,
      setLang,
      typingLang,
      setTypingLang,
      fontSizeScale,
      setFontSizeScale,
      prescriptionColor,
      setPrescriptionColor,
      isFullViewMode,
      toggleFullViewMode,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
