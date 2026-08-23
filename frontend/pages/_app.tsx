import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
import { ThemeProvider, useTheme, THEMES } from "../components/ThemeContext";
import UtilityBar from "../components/UtilityBar";
import { GlobalTransliterationFAB } from "../components/GlobalTransliterationFAB";
import SalesBroadcastBanner from "../components/SalesBroadcastBanner";
import "../style.css";

/**
 * Injects CSS custom properties onto <html> so every component
 * automatically responds to theme changes via var(--rx-*) tokens.
 */
function CSSVarInjector() {
  const { theme, themeId } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", themeId);
    // Map theme tokens to CSS custom properties
    root.style.setProperty("--rx-bg", theme.bg);
    root.style.setProperty("--rx-surface", theme.surface);
    root.style.setProperty("--rx-card", theme.card);
    root.style.setProperty("--rx-border", theme.border);
    root.style.setProperty("--rx-text", theme.text);
    root.style.setProperty("--rx-text-muted", theme.textMuted);
    root.style.setProperty("--rx-accent", theme.accent);
    root.style.setProperty("--rx-accent-text", theme.accentText);
    root.style.setProperty("--rx-input-bg", theme.inputBg);
    root.style.setProperty("--rx-input-border", theme.inputBorder);
    root.style.setProperty("--rx-input-text", theme.inputText);
    // Also update the legacy CSS vars used by style.css
    root.style.setProperty("--bg-base", theme.bg);
    root.style.setProperty("--bg-surface", theme.surface);
    root.style.setProperty("--bg-elevated", theme.card);
    root.style.setProperty("--bg-card", theme.card);
    root.style.setProperty("--text-primary", theme.text);
    root.style.setProperty("--text-secondary", theme.textMuted);
    root.style.setProperty("--border-subtle", theme.border);
    root.style.setProperty("--border-default", theme.border);
    root.style.setProperty("--brand-primary", theme.accent);
  }, [theme, themeId]);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {/* Inject CSS vars into <html> on every theme change */}
      <CSSVarInjector />
      {/* Global Sales & Promotional Advertisement Banner */}
      <SalesBroadcastBanner />
      {/* Global always-visible utility bar */}
      <UtilityBar />
      <Component {...pageProps} />
      {/* Global Transliteration FAB — visible on every page */}
      <GlobalTransliterationFAB />
    </ThemeProvider>
  );
}
