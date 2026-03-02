"use client";

import { SessionProvider } from "next-auth/react";
import { AbstractIntlMessages,NextIntlClientProvider } from "next-intl";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";

type Props = {
  children: React.ReactNode;
  messages: AbstractIntlMessages;
  locale: string;
};

export const Providers = ({ children, messages, locale }: Props) => {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
};
