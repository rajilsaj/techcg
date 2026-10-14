import { BOT_NAME, fetchPublic } from "../link-preview";

/*
 * robots.txt: the importer reads only what a site allows its robot to read.
 * Rules for "TechCGBot" win over the "*" group; the longest matching path wins,
 * and Allow wins a tie (Google's reading of the standard).
 */

interface Rule {
  allow: boolean;
  pattern: string;
}

/** The rules that apply to us in a robots.txt file. */
export function robotsRules(text: string, agent = BOT_NAME): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      // Consecutive User-agent lines share one group.
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      // "Disallow:" with nothing after it allows everything: no rule.
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
    }
  }

  const name = agent.toLowerCase();
  const own = groups.filter((g) => g.agents.some((a) => a !== "*" && name.includes(a)));
  const chosen = own.length > 0 ? own : groups.filter((g) => g.agents.includes("*"));
  return chosen.flatMap((g) => g.rules);
}

/** Does `pattern` (with * wildcards and a final $) match the start of `path`? */
function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
}

/** May we read `path` (pathname + search) under these rules? */
export function robotsAllow(rules: Rule[], path: string): boolean {
  let best: Rule | null = null;
  for (const rule of rules) {
    if (!matches(rule.pattern, path)) continue;
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) best = rule;
  }
  return best ? best.allow : true;
}

const cache = new Map<string, { at: number; rules: Rule[] }>();
const CACHE_MS = 6 * 60 * 60 * 1000;

/** Rules of a site, read once every 6 hours. No robots.txt (or an unreadable one) means no restriction. */
async function rulesFor(origin: string): Promise<Rule[]> {
  const hit = cache.get(origin);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rules;
  const res = await fetchPublic(`${origin}/robots.txt`, { accept: /text|octet-stream/i, maxBytes: 256 * 1024, acceptHeader: "text/plain,*/*;q=0.5" });
  const rules = res.ok && res.status === 200 && !/<html/i.test(res.body.slice(0, 500)) ? robotsRules(res.body) : [];
  if (cache.size > 300) cache.clear();
  cache.set(origin, { at: Date.now(), rules });
  return rules;
}

/** May the importer read this address? */
export async function robotsAllowed(input: string | URL): Promise<boolean> {
  try {
    const url = typeof input === "string" ? new URL(input) : input;
    return robotsAllow(await rulesFor(url.origin), url.pathname + url.search);
  } catch {
    return true;
  }
}
