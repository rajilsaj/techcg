import { describe, expect, it } from "vitest";
import { discoverFeeds, looksLikeFeed, parseFeed, scrapeArticleLinks } from "@/lib/importer/parse";
import { canonicalUrl } from "@/lib/importer/run";

const base = new URL("https://www.exemple.com/");

describe("parseFeed", () => {
  it("reads RSS 2.0 items with CDATA, entities, enclosures and images in the description", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
      <language>fr-FR</language>
      <item>
        <title><![CDATA[Rust 2.0 : ce qui change]]></title>
        <link>https://www.exemple.com/actu/rust-2</link>
        <pubDate>Mon, 12 Oct 2026 08:30:00 +0200</pubDate>
        <description><![CDATA[<p>La nouvelle version de <b>Rust</b> arrive.</p><img src="/img/rust.png">]]></description>
      </item>
      <item>
        <title>Go &amp; WebAssembly</title>
        <link>https://www.exemple.com/actu/go-wasm</link>
        <enclosure url="https://cdn.exemple.com/go.jpg" type="image/jpeg" length="1"/>
        <description>Un tutoriel.</description>
      </item>
    </channel></rss>`;
    expect(looksLikeFeed(xml)).toBe(true);
    const feed = parseFeed(xml, base);
    expect(feed.language).toBe("fr");
    expect(feed.articles).toHaveLength(2);
    expect(feed.articles[0]).toMatchObject({
      title: "Rust 2.0 : ce qui change",
      url: "https://www.exemple.com/actu/rust-2",
      summary: "La nouvelle version de Rust arrive.",
      image: "https://www.exemple.com/img/rust.png",
    });
    expect(feed.articles[0].publishedAt?.toISOString()).toBe("2026-10-12T06:30:00.000Z");
    expect(feed.articles[1]).toMatchObject({ title: "Go & WebAssembly", image: "https://cdn.exemple.com/go.jpg" });
  });

  it("reads Atom entries", () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en"><entry>
      <title>Hello</title><link rel="alternate" href="/posts/hello"/><updated>2026-10-01T10:00:00Z</updated>
      <summary>A post about things.</summary></entry></feed>`;
    const feed = parseFeed(xml, base);
    expect(feed.language).toBe("en");
    expect(feed.articles[0]).toMatchObject({ title: "Hello", url: "https://www.exemple.com/posts/hello", summary: "A post about things." });
  });
});

describe("discoverFeeds", () => {
  it("finds advertised RSS and Atom feeds", () => {
    const html = `<head><link rel="alternate" type="application/rss+xml" href="/rss.xml"><link rel="stylesheet" href="/a.css">
      <link rel="alternate" type="application/atom+xml" href="https://www.exemple.com/atom"></head>`;
    expect(discoverFeeds(html, base)).toEqual(["https://www.exemple.com/rss.xml", "https://www.exemple.com/atom"]);
  });
});

describe("scrapeArticleLinks", () => {
  it("keeps same-site headline links and skips navigation and other sites", () => {
    const html = `<nav><a href="/forums/">Les forums de discussion du site entier</a></nav>
      <h2><a href="/actu/12345/intel-annonce-une-nouvelle-puce">Intel annonce une nouvelle puce pour les portables</a></h2>
      <p><a href="https://ailleurs.com/x">Un lien vers un autre site avec un long texte</a></p>
      <a href="/tag/ia">IA</a>
      <article><a href="/actu/12346/linux-6-20">Linux 6.20 est disponible avec de nombreuses nouveautés</a></article>`;
    expect(scrapeArticleLinks(html, base, 10).map((l) => l.url)).toEqual([
      "https://www.exemple.com/actu/12345/intel-annonce-une-nouvelle-puce",
      "https://www.exemple.com/actu/12346/linux-6-20",
    ]);
  });
});

describe("canonicalUrl", () => {
  it("drops tracking parameters and fragments", () => {
    expect(canonicalUrl("https://a.com/x?id=3&utm_source=rss&xtor=RSS-1#top")).toBe("https://a.com/x?id=3");
  });
});
