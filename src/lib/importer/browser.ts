import { existsSync } from "node:fs";
import net from "node:net";
import type { Browser } from "puppeteer-core";
import { USER_AGENT, hostTurn, isPublicIp, normalizeUrl, resolvesToPublic } from "../link-preview";

/*
 * « Navigateur » mode, for sites that build their pages with JavaScript (the HTML
 * the server sends has no articles in it). Pages open in a headless Chromium that
 * says who it is (same TechCGBot user agent, nothing hidden) and only loads what
 * it needs: no images, fonts or videos. One browser per import run.
 *
 * On Vercel the browser comes from @sparticuz/chromium; on a computer, from the
 * installed Chrome (or CHROME_PATH).
 */

const PAGE_TIMEOUT_MS = 20_000;
const MAX_HTML = 3 * 1024 * 1024;
const SKIP_TYPES = new Set(["image", "media", "font"]);

const LOCAL_CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export type RenderResult = { ok: true; url: URL; body: string } | { ok: false; error: string };

export interface Renderer {
  render(url: string): Promise<RenderResult>;
  close(): Promise<void>;
}

async function launch(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  // On Vercel (Linux). A local .env pulled from Vercel also sets VERCEL, hence the platform check.
  if (process.platform === "linux" && (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  }
  const executablePath = LOCAL_CHROME.find((p) => p && existsSync(p));
  if (!executablePath) throw new Error("Chrome introuvable sur cette machine (réglez CHROME_PATH).");
  return puppeteer.launch({ executablePath, headless: true });
}

/** Opens a browser for one import run. Always `close()` it (in a finally). */
export async function openRenderer(): Promise<Renderer> {
  const browser = await launch();
  return {
    async render(input) {
      const start = normalizeUrl(input);
      if (!start || !(await resolvesToPublic(start.hostname))) return { ok: false, error: "adresse non publique" };
      await hostTurn(start.hostname);
      const page = await browser.newPage();
      try {
        await page.setUserAgent(USER_AGENT);
        await page.setExtraHTTPHeaders({ "Accept-Language": "fr,en;q=0.8" });
        await page.setRequestInterception(true);
        page.on("request", (req) => {
          // Pictures, fonts and videos aren't needed to find articles; the importer measures covers itself.
          if (SKIP_TYPES.has(req.resourceType())) return void req.abort();
          // Never let the page reach a private address written as an IP (the site's own name was checked above).
          if (req.url().startsWith("data:")) return void req.continue();
          const url = normalizeUrl(req.url());
          const host = url?.hostname.replace(/^\[|\]$/g, "");
          if (!url || !host || (net.isIP(host) && !isPublicIp(host)) || host === "localhost") return void req.abort();
          void req.continue();
        });
        const response = await page.goto(start.toString(), { waitUntil: "networkidle2", timeout: PAGE_TIMEOUT_MS });
        const status = response?.status() ?? 0;
        if (status === 403 || status === 401 || status === 429) return { ok: false, error: `le site refuse l'accès aux robots (${status})` };
        if (status === 404 || status === 410) return { ok: false, error: `page introuvable (${status})` };
        if (status >= 500) return { ok: false, error: `le site renvoie une erreur (${status})` };
        const body = (await page.content()).slice(0, MAX_HTML);
        const finalUrl = normalizeUrl(page.url());
        if (!finalUrl || !(await resolvesToPublic(finalUrl.hostname))) return { ok: false, error: "adresse non publique" };
        return { ok: true, url: finalUrl, body };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: /timeout/i.test(message) ? "le site ne répond pas (délai dépassé)" : "affichage de la page impossible" };
      } finally {
        await page.close().catch(() => {});
      }
    },
    async close() {
      await browser.close().catch(() => {});
    },
  };
}
