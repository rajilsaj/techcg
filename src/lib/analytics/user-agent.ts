/** Small, dependency-free user-agent parser: enough for visit statistics. */

export interface ParsedUserAgent {
  browser: string | null;
  browserVer: string | null;
  os: string | null;
  osVer: string | null;
  device: "desktop" | "mobile" | "tablet" | "bot";
  isBot: boolean;
}

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor|uptime|headless|lighthouse|pingdom|curl|wget|python-requests|httpclient|axios|node-fetch|go-http|java\//i;

// Order matters: Edge/Opera/Samsung identify as Chrome too, Chrome identifies as Safari.
const BROWSERS: [string, RegExp][] = [
  ["Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/],
  ["Opera", /(?:OPR|Opera)\/([\d.]+)/],
  ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
  ["Yandex", /YaBrowser\/([\d.]+)/],
  ["UC Browser", /UCBrowser\/([\d.]+)/],
  ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
  ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
  ["Safari", /Version\/([\d.]+).*Safari\//],
];

const major = (version: string | undefined) => version?.split(".").slice(0, 2).join(".") ?? null;

export function parseUserAgent(ua: string): ParsedUserAgent {
  const isBot = BOT.test(ua);

  let browser: string | null = null;
  let browserVer: string | null = null;
  for (const [name, re] of BROWSERS) {
    const m = ua.match(re);
    if (m) {
      browser = name;
      browserVer = major(m[1]);
      break;
    }
  }

  let os: string | null = null;
  let osVer: string | null = null;
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Windows NT ([\d.]+)/))) {
    os = "Windows";
    osVer = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7" }[m[1]] ?? m[1];
  } else if ((m = ua.match(/(?:iPhone|iPad|iPod).*? OS ([\d_]+)/))) {
    os = "iOS";
    osVer = major(m[1].replace(/_/g, "."));
  } else if ((m = ua.match(/Android ([\d.]+)/))) {
    os = "Android";
    osVer = major(m[1]);
  } else if ((m = ua.match(/Mac OS X ([\d_.]+)/))) {
    os = "macOS";
    osVer = major(m[1].replace(/_/g, "."));
  } else if (/CrOS/.test(ua)) {
    os = "ChromeOS";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  const tablet = /iPad|Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua));
  const mobile = !tablet && /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/.test(ua);

  return {
    browser,
    browserVer,
    os,
    osVer,
    device: isBot ? "bot" : tablet ? "tablet" : mobile ? "mobile" : "desktop",
    isBot,
  };
}
