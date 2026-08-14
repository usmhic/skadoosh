"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { i18n } from "@/lib/i18n";
import { languageMeta, supportedLanguages, type AppLanguage } from "@skaddosh/i18n";

const STORAGE_KEY = "skaddosh_lang";
const VALID = supportedLanguages;

export const SITE_LANGS = VALID.map((code) => ({
  code,
  label: languageMeta[code].label,
  short: languageMeta[code].short,
}));

const LangContext = createContext<{ lang: AppLanguage; setLang: (l: AppLanguage) => void }>({
  lang: "en",
  setLang: () => {},
});

function detectBrowserLanguage(): AppLanguage {
  if (typeof navigator === "undefined") return "en";
  const candidates = [navigator.language, ...Array.from(navigator.languages ?? [])];
  for (const candidate of candidates) {
    const code = candidate.split("-")[0]?.toLowerCase() as AppLanguage | undefined;
    if (code && VALID.includes(code)) return code;
  }
  return "en";
}

function applyLanguage(l: AppLanguage) {
  document.documentElement.lang = l;
  document.documentElement.dir = languageMeta[l].rtl ? "rtl" : "ltr";
  void i18n.changeLanguage(l);
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
    if (saved && VALID.includes(saved)) {
      setLangState(saved);
      applyLanguage(saved);
      return;
    }
    const browserLang = detectBrowserLanguage();
    setLangState(browserLang);
    applyLanguage(browserLang);
  }, []);

  const setLang = (l: AppLanguage) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    applyLanguage(l);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
