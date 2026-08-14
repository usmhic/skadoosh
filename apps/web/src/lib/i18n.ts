"use client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "@skaddosh/i18n";

if (!i18n.isInitialized) {
  void i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      compatibilityJSON: "v4",
    });
}

export { i18n };
