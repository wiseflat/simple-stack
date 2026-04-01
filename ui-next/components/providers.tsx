"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";

const TIME_ZONE = "Europe/Paris";

type ProvidersProps = {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
};

export function Providers({ children, locale, messages }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={TIME_ZONE}>
      <RootProvider
        theme={{
          attribute: "class",
          enableSystem: true,
          defaultTheme: "system",
        }}
      >
        {children}
      </RootProvider>
    </NextIntlClientProvider>
  );
}
