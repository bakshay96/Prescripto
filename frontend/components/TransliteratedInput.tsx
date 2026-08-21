"use client";

import React, { useState, useRef } from "react";
import { useTheme } from "./ThemeContext";
import {
  TypingLang,
  transliterateWord,
  getAllCandidates,
  getWordCandidates,
  WordCandidates,
  DEVANAGARI_VELANTI,
  DEVANAGARI_UKAR,
  DEVANAGARI_MATRAS,
  DEVANAGARI_MODIFIERS,
  DEVANAGARI_VOWELS,
  DEVANAGARI_QUICK_CONSONANTS,
  MultiLangCandidate,
} from "../utils/transliteration";

export interface TransliteratedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  showBadge?: boolean;
}

export interface TransliteratedTextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  showBadge?: boolean;
}

// ── Language Pill Badge ────────────────────────────────────────────────────────

function LangBadge({ lang }: { lang: TypingLang }) {
  const colors: Record<TypingLang, string> = {
    M: "linear-gradient(135deg,#ff671f,#c41e3a)",
    H: "linear-gradient(135deg,#005691,#046a38)",
    E: "linear-gradient(135deg,#1e3a5f,#2563eb)",
  };
  const labels: Record<TypingLang, string> = {
    M: "मराठी",
    H: "हिंदी",
    E: "ENG",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 6px",
        borderRadius: 4,
        background: colors[lang],
        color: "#fff",
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: "0.3px",
        marginRight: 2,
      }}
    >
      {labels[lang]}
    </span>
  );
}

// ── Google Input Tools-style Candidate Suggestion Bar ─────────────────────────

function CandidateSuggestionBar({
  candidates,
  currentWord,
  onPickCandidate,
  isDark,
}: {
  candidates: MultiLangCandidate[];
  currentWord: string;
  onPickCandidate: (text: string) => void;
  isDark: boolean;
}) {
  if (!candidates || candidates.length === 0 || !currentWord) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: "calc(100% + 2px)",
        zIndex: 99999,
        width: "max-content",
        maxWidth: "90vw",
        background: isDark ? "#0f172a" : "#ffffff",
        border: `1.5px solid ${isDark ? "#334155" : "#cbd5e1"}`,
        borderRadius: 12,
        boxShadow: isDark
          ? "0 8px 30px rgba(0,0,0,0.6)"
          : "0 4px 20px rgba(0,0,0,0.15)",
        overflow: "hidden",
        fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "5px 10px 4px",
          fontSize: 9,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: isDark ? "#64748b" : "#94a3b8",
          borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        ⚡ Suggestions for <span style={{ color: isDark ? "#fbbf24" : "#d97706", fontStyle: "italic" }}>"{currentWord}"</span>
        <span style={{ marginLeft: "auto", opacity: 0.5, fontSize: 8 }}>Press Space to apply first</span>
      </div>

      {/* Candidate Chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 4,
          padding: "6px 8px",
        }}
      >
        {candidates.map((cand, idx) => (
          <button
            key={`${cand.lang}-${cand.text}-${idx}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onPickCandidate(cand.text);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 11px",
              borderRadius: 8,
              border: `1.5px solid ${
                cand.lang === "M"
                  ? "rgba(255,103,31,0.3)"
                  : cand.lang === "H"
                  ? "rgba(0,86,145,0.3)"
                  : isDark ? "#334155" : "#e2e8f0"
              }`,
              background:
                idx === 0
                  ? cand.lang === "M"
                    ? "rgba(255,103,31,0.15)"
                    : cand.lang === "H"
                    ? "rgba(0,86,145,0.15)"
                    : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
                  : "transparent",
              cursor: "pointer",
              transition: "all 0.1s",
              boxShadow: idx === 0 ? "0 0 0 1.5px rgba(255,103,31,0.4)" : "none",
            }}
          >
            <LangBadge lang={cand.lang} />
            <span
              style={{
                fontSize: 14,
                fontWeight: idx === 0 ? 900 : 700,
                color: isDark ? "#f1f5f9" : "#0f172a",
                fontFamily: "'Noto Sans Devanagari', system-ui",
              }}
            >
              {cand.text}
            </span>
            {idx === 0 && (
              <span
                style={{
                  fontSize: 8,
                  padding: "1px 4px",
                  borderRadius: 3,
                  background: "#ff671f",
                  color: "#fff",
                  fontWeight: 900,
                }}
              >
                ↵
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Devanagari Mini Keyboard (Matras) ─────────────────────────────────────────

function DevanagariMiniKeyboard({
  onInsertChar,
  isDark,
  onClose,
}: {
  onInsertChar: (char: string) => void;
  isDark: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"matras" | "vowels" | "consonants">("matras");
  const btnStyle = {
    padding: "4px 8px",
    borderRadius: 6,
    background: isDark ? "#1e293b" : "#f1f5f9",
    color: isDark ? "#ffffff" : "#0f172a",
    border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer" as const,
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: "calc(100% + 50px)",
        zIndex: 99998,
        width: 360,
        maxWidth: "92vw",
        background: isDark ? "#090d16" : "#ffffff",
        border: `1px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
        borderRadius: 12,
        padding: 10,
        boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
        fontFamily: "'Noto Sans Devanagari', 'Inter', Arial, sans-serif",
      }}
    >
      {/* Tab Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["matras", "vowels", "consonants"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                border: "none",
                background: activeTab === tab ? "#ff671f" : "transparent",
                color: activeTab === tab ? "#ffffff" : isDark ? "#94a3b8" : "#475569",
                fontSize: 9,
                fontWeight: 800,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              {tab === "matras" ? "मात्रा" : tab === "vowels" ? "स्वर" : "व्यंजन"}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: isDark ? "#64748b" : "#94a3b8", fontSize: 12, cursor: "pointer" }}>✕</button>
      </div>

      {activeTab === "matras" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#ff671f", marginBottom: 4 }}>वेलांटी (Velanti):</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {DEVANAGARI_VELANTI.map((m) => (
                <button key={m.name} type="button" onMouseDown={(e) => { e.preventDefault(); onInsertChar(m.char); }} title={m.name} style={btnStyle}>{m.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#ff671f", marginBottom: 4 }}>उकार (Ukar):</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {DEVANAGARI_UKAR.map((m) => (
                <button key={m.name} type="button" onMouseDown={(e) => { e.preventDefault(); onInsertChar(m.char); }} title={m.name} style={btnStyle}>{m.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#ff671f", marginBottom: 4 }}>मात्रा व अनुस्वार:</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[...DEVANAGARI_MATRAS, ...DEVANAGARI_MODIFIERS].map((m) => (
                <button key={m.name} type="button" onMouseDown={(e) => { e.preventDefault(); onInsertChar(m.char); }} title={m.name} style={btnStyle}>{m.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeTab === "vowels" && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {DEVANAGARI_VOWELS.map((v) => (
            <button key={v} type="button" onMouseDown={(e) => { e.preventDefault(); onInsertChar(v); }} style={btnStyle}>{v}</button>
          ))}
        </div>
      )}
      {activeTab === "consonants" && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxHeight: 120, overflowY: "auto" }}>
          {DEVANAGARI_QUICK_CONSONANTS.map((c) => (
            <button key={c} type="button" onMouseDown={(e) => { e.preventDefault(); onInsertChar(c); }} style={{ ...btnStyle, fontSize: 12 }}>{c}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Common hook: shared transliteration logic ─────────────────────────────────

function useTransliterator(
  value: string,
  onChange: (val: string) => void,
  typingLang: TypingLang
) {
  const [candidates, setCandidates] = useState<MultiLangCandidate[]>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [showKeyboard, setShowKeyboard] = useState(false);

  const updateCandidatesFromText = (text: string, cursorPos: number) => {
    const textBefore = text.slice(0, cursorPos);
    const words = textBefore.split(/\s+/);
    const lastWord = words[words.length - 1] || "";

    if (lastWord.length >= 1 && /^[a-zA-Z]+$/.test(lastWord)) {
      setCurrentWord(lastWord);
      setCandidates(getAllCandidates(lastWord));
    } else {
      setCurrentWord("");
      setCandidates([]);
    }
  };

  const commitCurrentWord = (
    lang: TypingLang,
    separator: string = " "
  ): string | null => {
    if (!currentWord || !/^[a-zA-Z]+$/.test(currentWord)) return null;

    const primaryCandidate = candidates.find((c) => c.lang === lang);
    const transliterated = primaryCandidate?.text || transliterateWord(currentWord, lang);

    if (!transliterated || transliterated === currentWord) return null;

    const lastIdx = value.lastIndexOf(currentWord);
    if (lastIdx === -1) return null;

    return value.slice(0, lastIdx) + transliterated + separator;
  };

  const pickCandidate = (candidateText: string): string => {
    if (!currentWord) return value + candidateText;

    const lastIdx = value.lastIndexOf(currentWord);
    if (lastIdx !== -1) {
      return value.slice(0, lastIdx) + candidateText + " ";
    }
    return value + " " + candidateText;
  };

  return {
    candidates,
    currentWord,
    showKeyboard,
    setShowKeyboard,
    updateCandidatesFromText,
    commitCurrentWord,
    pickCandidate,
    clearCandidates: () => { setCurrentWord(""); setCandidates([]); },
  };
}

// ── TransliteratedInput ───────────────────────────────────────────────────────

export function TransliteratedInput({
  value,
  onChange,
  showBadge = false,
  className = "",
  style = {},
  placeholder,
  ...props
}: TransliteratedInputProps) {
  const { typingLang, themeId } = useTheme();
  const isDark = themeId !== "light";
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    candidates,
    currentWord,
    showKeyboard,
    setShowKeyboard,
    updateCandidatesFromText,
    commitCurrentWord,
    pickCandidate,
    clearCandidates,
  } = useTransliterator(value, onChange, typingLang);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (typingLang !== "E") {
      const cursor = e.target.selectionStart ?? newValue.length;
      updateCandidatesFromText(newValue, cursor);
      setShowKeyboard(true);
    } else {
      clearCandidates();
      setShowKeyboard(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typingLang === "E") return;

    if (e.key === " " || e.key === "Enter") {
      const committed = commitCurrentWord(typingLang, e.key === " " ? " " : "");
      if (committed !== null) {
        e.preventDefault();
        onChange(committed);
        clearCandidates();
      }
    }
  };

  const handleInsertChar = (char: string) => {
    onChange(value + char);
    inputRef.current?.focus();
  };

  const handlePickCandidate = (candidateText: string) => {
    onChange(pickCandidate(candidateText));
    clearCandidates();
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const devnagariFontStyle = typingLang !== "E"
    ? { fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, Arial, sans-serif" }
    : {};

  const defaultPlaceholder =
    typingLang === "M"
      ? "मराठी लिहा — type 'gajanan' + Space…"
      : typingLang === "H"
      ? "हिंदी लिखें — type 'namaste' + Space…"
      : "Type in English…";

  return (
    <div style={{ position: "relative", width: "100%", display: "inline-block" }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (typingLang !== "E") setShowKeyboard(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            clearCandidates();
          }, 150);
        }}
        placeholder={placeholder ?? defaultPlaceholder}
        className={className}
        style={{ ...devnagariFontStyle, ...style }}
        {...props}
      />

      {/* Live Suggestion Bar (Google Input Tools-style) */}
      {typingLang !== "E" && candidates.length > 0 && currentWord && (
        <CandidateSuggestionBar
          candidates={candidates}
          currentWord={currentWord}
          onPickCandidate={handlePickCandidate}
          isDark={isDark}
        />
      )}

      {/* Matra Mini Keyboard (shown on focus when no candidates active) */}
      {typingLang !== "E" && showKeyboard && !currentWord && (
        <DevanagariMiniKeyboard
          isDark={isDark}
          onInsertChar={handleInsertChar}
          onClose={() => setShowKeyboard(false)}
        />
      )}
    </div>
  );
}

// ── TransliteratedTextArea ────────────────────────────────────────────────────

export function TransliteratedTextArea({
  value,
  onChange,
  showBadge = false,
  className = "",
  style = {},
  placeholder,
  rows = 3,
  ...props
}: TransliteratedTextAreaProps) {
  const { typingLang, themeId } = useTheme();
  const isDark = themeId !== "light";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    candidates,
    currentWord,
    showKeyboard,
    setShowKeyboard,
    updateCandidatesFromText,
    commitCurrentWord,
    pickCandidate,
    clearCandidates,
  } = useTransliterator(value, onChange, typingLang);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (typingLang !== "E") {
      const cursor = e.target.selectionStart ?? newValue.length;
      updateCandidatesFromText(newValue, cursor);
      setShowKeyboard(true);
    } else {
      clearCandidates();
      setShowKeyboard(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (typingLang === "E") return;

    if (e.key === " " || e.key === "Enter") {
      const committed = commitCurrentWord(typingLang, e.key === " " ? " " : "");
      if (committed !== null) {
        e.preventDefault();
        onChange(committed);
        clearCandidates();
      }
    }
  };

  const handleInsertChar = (char: string) => {
    onChange(value + char);
    textareaRef.current?.focus();
  };

  const handlePickCandidate = (candidateText: string) => {
    onChange(pickCandidate(candidateText));
    clearCandidates();
    setTimeout(() => textareaRef.current?.focus(), 10);
  };

  const devnagariFontStyle = typingLang !== "E"
    ? { fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, Arial, sans-serif" }
    : {};

  const defaultPlaceholder =
    typingLang === "M"
      ? "मराठी सूचना लिहा — type in English + Space to convert…"
      : typingLang === "H"
      ? "हिंदी सलाह लिखें — type in English + Space to convert…"
      : "Type notes in English…";

  return (
    <div style={{ position: "relative", width: "100%", display: "inline-block" }}>
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (typingLang !== "E") setShowKeyboard(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            clearCandidates();
          }, 150);
        }}
        placeholder={placeholder ?? defaultPlaceholder}
        className={className}
        style={{ ...devnagariFontStyle, ...style }}
        {...props}
      />

      {/* Live Suggestion Bar */}
      {typingLang !== "E" && candidates.length > 0 && currentWord && (
        <CandidateSuggestionBar
          candidates={candidates}
          currentWord={currentWord}
          onPickCandidate={handlePickCandidate}
          isDark={isDark}
        />
      )}

      {/* Matra Mini Keyboard */}
      {typingLang !== "E" && showKeyboard && !currentWord && (
        <DevanagariMiniKeyboard
          isDark={isDark}
          onInsertChar={handleInsertChar}
          onClose={() => setShowKeyboard(false)}
        />
      )}
    </div>
  );
}
