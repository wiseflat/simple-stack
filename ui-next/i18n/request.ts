import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const supportedLocales = ["fr", "en", "es", "sk"] as const;
type Locale = (typeof supportedLocales)[number];

function resolveLocale(raw: string | null | undefined): Locale {
  const candidate = raw?.split(",")[0]?.split("-")[0]?.trim().toLowerCase();
  if (candidate && (supportedLocales as readonly string[]).includes(candidate)) {
    return candidate as Locale;
  }
  return "fr";
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const acceptLanguage = headerStore.get("accept-language");

  const locale = resolveLocale(localeCookie ?? acceptLanguage);
  const messagesModule = await import(`../messages/${locale}.json`);

  return {
    locale,
    messages: messagesModule.default,
    timeZone: "Europe/Paris",
  };
});
