/** Network and location details of a request, from Vercel's headers. */

export interface RequestInfo {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

/** The client's IP: Vercel sets x-real-ip; x-forwarded-for's first entry otherwise. */
export function clientIp(headers: Headers): string {
  const candidates = [headers.get("x-real-ip"), headers.get("x-forwarded-for")?.split(",")[0], headers.get("x-vercel-forwarded-for")];
  return candidates.map((v) => v?.trim()).find((v) => !!v)?.slice(0, 64) ?? "inconnue";
}

function header(headers: Headers, name: string, max = 100): string | null {
  const raw = headers.get(name);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).slice(0, max); // city names arrive URL-encoded
  } catch {
    return raw.slice(0, max);
  }
}

function coordinate(value: string | null, limit: number): number | null {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

export function requestInfo(headers: Headers): RequestInfo {
  return {
    ip: clientIp(headers),
    country: header(headers, "x-vercel-ip-country", 2),
    region: header(headers, "x-vercel-ip-country-region", 10),
    city: header(headers, "x-vercel-ip-city"),
    postalCode: header(headers, "x-vercel-ip-postal-code", 20),
    latitude: coordinate(headers.get("x-vercel-ip-latitude"), 90),
    longitude: coordinate(headers.get("x-vercel-ip-longitude"), 180),
    timezone: header(headers, "x-vercel-ip-timezone", 60),
  };
}

/** Keeps only an external referring site's origin + path (no query string). */
export function cleanReferrer(referrer: unknown, ownHost: string | null): string | null {
  if (typeof referrer !== "string" || !referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (ownHost && url.host === ownHost) return null; // internal navigation
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return null;
  }
}
