import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import type { LookupFunction } from "node:net";

/**
 * Server-side link preview: checks that a submitted URL is reachable and reads
 * its Open Graph / <meta> tags. Requests only go to public addresses (checked
 * at connect time, so DNS rebinding can't point us at internal services).
 */

export type PreviewFailure =
  | "invalid" // not an http(s) URL
  | "blocked" // resolves to a private/internal address
  | "not_found" // domain doesn't exist, or the page is 404/410
  | "server_error" // 5xx
  | "restricted" // site exists but refuses us (401/403/429…)
  | "timeout"
  | "unreachable"; // connection refused, TLS error, too many redirects…

export interface LinkPreview {
  url: string; // final URL after redirects
  domain: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export type PreviewResult =
  | { ok: true; preview: LinkPreview }
  | { ok: false; reason: PreviewFailure; status?: number };

const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 512 * 1024; // metadata lives in <head>; no need for more
const USER_AGENT = "Mozilla/5.0 (compatible; TechCGBot/1.0; +link-preview)";

/* ---------- Address checks ---------- */

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
}

const PRIVATE_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, incl. cloud metadata 169.254.169.254
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

export function isPublicIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const value = ipv4ToInt(ip);
    return !PRIVATE_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (value & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    if (lower === "::" || lower === "::1") return false;
    if (/^f[cd]/.test(lower)) return false; // unique local fc00::/7
    if (/^fe[89ab]/.test(lower)) return false; // link-local fe80::/10
    if (lower.startsWith("ff")) return false; // multicast
    if (lower.startsWith("64:ff9b:")) return false; // NAT64 can reach IPv4 internals
    return true;
  }
  return false;
}

class BlockedAddressError extends Error {}

/** DNS lookup used for the actual connection: refuses non-public addresses. */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    const allowed = list.filter((a) => isPublicIp(a.address));
    if (allowed.length === 0) {
      return callback(new BlockedAddressError(`Blocked address for ${hostname}`), "", 4);
    }
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, allowed);
    callback(null, allowed[0].address, allowed[0].family);
  });
};

/* ---------- Fetching ---------- */

export function normalizeUrl(input: string): URL | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname.includes(".") && !net.isIP(url.hostname)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

interface RawResponse {
  status: number;
  location?: string;
  contentType: string;
  body: string;
}

function request(url: URL): Promise<RawResponse> {
  // A literal IP in the URL never goes through DNS, so check it here.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && !isPublicIp(host)) {
    return Promise.reject(new BlockedAddressError(`Blocked address ${host}`));
  }

  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "fr,en;q=0.8",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "");
        const location = res.headers.location;

        // Only HTML bodies of successful responses are worth reading.
        if (status >= 300 || !/html/i.test(contentType)) {
          res.resume();
          return resolve({ status, location, contentType, body: "" });
        }

        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
        const stream =
          encoding === "gzip" ? res.pipe(zlib.createGunzip())
          : encoding === "deflate" ? res.pipe(zlib.createInflate())
          : encoding === "br" ? res.pipe(zlib.createBrotliDecompress())
          : res;

        const chunks: Buffer[] = [];
        let size = 0;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          req.destroy();
          resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8") });
        };
        stream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
          size += chunk.length;
          if (size >= MAX_HTML_BYTES || /<\/head>/i.test(chunk.toString("latin1"))) finish();
        });
        stream.on("end", finish);
        stream.on("error", (err) => (done ? undefined : reject(err)));
      }
    );
    req.on("timeout", () => req.destroy(new Error("ETIMEDOUT")));
    req.on("error", reject);
    req.end();
  });
}

function classifyError(err: unknown): PreviewFailure {
  if (err instanceof BlockedAddressError) return "blocked";
  const code = (err as NodeJS.ErrnoException)?.code ?? (err as Error)?.message;
  if (code === "ENOTFOUND" || code === "EAI_NONAME" || code === "EAI_NODATA") return "not_found";
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") return "timeout";
  return "unreachable";
}

/* ---------- Parsing ---------- */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function clean(value: string | undefined, max: number): string | null {
  if (!value) return null;
  const text = decodeEntities(value).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function attributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

function absoluteHttpUrl(value: string | null | undefined, base: URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(decodeEntities(value.trim()), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Reads title, description, image and site name from a page's HTML. */
export function parseMetadata(html: string, pageUrl: URL): LinkPreview {
  const head = html.slice(0, MAX_HTML_BYTES);
  const meta: Record<string, string> = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(m[0]);
    const key = (attrs.property || attrs.name || "").toLowerCase();
    if (key && attrs.content !== undefined && !(key in meta)) meta[key] = attrs.content;
  }

  let icon: string | undefined;
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(m[0]);
    const rel = (attrs.rel || "").toLowerCase();
    if (rel.includes("apple-touch-icon")) icon = attrs.href;
    else if (!icon && rel.split(/\s+/).includes("icon")) icon = attrs.href;
  }

  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  return {
    url: pageUrl.toString(),
    domain: pageUrl.hostname.replace(/^www\./, ""),
    title: clean(meta["og:title"] ?? meta["twitter:title"] ?? titleTag, 200),
    description: clean(meta["og:description"] ?? meta["twitter:description"] ?? meta["description"], 300),
    image: absoluteHttpUrl(
      meta["og:image:secure_url"] ?? meta["og:image"] ?? meta["og:image:url"] ?? meta["twitter:image"] ?? meta["twitter:image:src"] ?? icon,
      pageUrl
    ),
    siteName: clean(meta["og:site_name"] ?? meta["application-name"], 80),
  };
}

/* ---------- Entry point ---------- */

const cache = new Map<string, { at: number; result: PreviewResult }>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;

export async function getLinkPreview(input: string): Promise<PreviewResult> {
  const start = normalizeUrl(input);
  if (!start) return { ok: false, reason: "invalid" };

  const key = start.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  const result = await resolvePreview(start);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), result });
  return result;
}

async function resolvePreview(start: URL): Promise<PreviewResult> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: RawResponse;
    try {
      res = await request(url);
    } catch (err) {
      return { ok: false, reason: classifyError(err) };
    }

    if (res.status >= 300 && res.status < 400 && res.location) {
      const next = normalizeUrl(new URL(res.location, url).toString());
      if (!next) return { ok: false, reason: "unreachable" };
      url = next;
      continue;
    }
    if (res.status === 404 || res.status === 410) return { ok: false, reason: "not_found", status: res.status };
    if (res.status >= 500) return { ok: false, reason: "server_error", status: res.status };
    if (res.status >= 400) return { ok: false, reason: "restricted", status: res.status };

    // 2xx: the page exists. Non-HTML (PDF, image…) still gets a domain-only card.
    if (!res.body) {
      return {
        ok: true,
        preview: {
          url: url.toString(),
          domain: url.hostname.replace(/^www\./, ""),
          title: decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "") || null,
          description: null,
          image: /^image\//i.test(res.contentType) ? url.toString() : null,
          siteName: null,
        },
      };
    }
    return { ok: true, preview: parseMetadata(res.body, url) };
  }
  return { ok: false, reason: "unreachable" };
}
