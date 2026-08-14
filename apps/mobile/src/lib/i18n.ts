import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import { resources, supportedLanguages, type AppLanguage } from "@skaddosh/i18n";

const rawDevice = (getLocales()[0]?.languageCode ?? "en").toLowerCase();
const deviceLang = (supportedLanguages.includes(rawDevice as AppLanguage) ? rawDevice : "en") as AppLanguage;

I18nManager.allowRTL(true);

if (!i18n.isInitialized) {
  void i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: deviceLang,
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      compatibilityJSON: "v4",
    });
}

export { i18n };
