import { cache } from "react";
import { cookies, headers } from "next/headers";
import { detectLocale, LOCALE_COOKIE, makeT, type Locale, type T } from "./index";

/** Resolved once per request; safe to call from any server component or action. */
export const getLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return detectLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    country: headerStore.get("x-vercel-ip-country"),
    acceptLanguage: headerStore.get("accept-language"),
  });
});

export async function getT(): Promise<T> {
  return makeT(await getLocale());
}
