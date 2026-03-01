import { defineRouting } from "next-intl/routing";

export const SUPPORTED_LOCALES = ["el"] as const;

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: "el",
  localePrefix: "never",
  localeDetection: false,
});