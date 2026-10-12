import { describe, expect, it } from "vitest";
import { getLinkPreview, isPublicIp, normalizeUrl, parseMetadata } from "@/lib/link-preview";

describe("isPublicIp", () => {
  it("rejects private, loopback, link-local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });

  it("accepts public addresses", () => {
    for (const ip of ["8.8.8.8", "104.18.38.10", "172.32.0.1", "2606:4700::1111"]) {
      expect(isPublicIp(ip), ip).toBe(true);
    }
  });
});

describe("normalizeUrl", () => {
  it("only accepts http(s) URLs with a real hostname and no credentials", () => {
    expect(normalizeUrl("https://exemple.com/a#b")?.toString()).toBe("https://exemple.com/a");
    expect(normalizeUrl("ftp://exemple.com")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("http://localhost:3000")).toBeNull();
    expect(normalizeUrl("https://user:pass@exemple.com")).toBeNull();
    expect(normalizeUrl("pas une url")).toBeNull();
  });
});

describe("getLinkPreview", () => {
  it("refuses internal addresses without making a request", async () => {
    expect(await getLinkPreview("http://127.0.0.1/admin")).toEqual({ ok: false, reason: "blocked" });
    expect(await getLinkPreview("http://169.254.169.254/latest/meta-data")).toEqual({ ok: false, reason: "blocked" });
  });
});

describe("parseMetadata", () => {
  const page = new URL("https://www.exemple.com/article/1");

  it("prefers Open Graph tags and resolves relative image URLs", () => {
    const html = `<html><head>
      <title>Titre HTML</title>
      <meta property="og:title" content="Titre &amp; OG">
      <meta content="Une description" property='og:description'>
      <meta property="og:image" content="/img/cover.jpg">
      <meta property="og:site_name" content="Exemple">
    </head></html>`;
    expect(parseMetadata(html, page)).toEqual({
      url: "https://www.exemple.com/article/1",
      domain: "exemple.com",
      title: "Titre & OG",
      description: "Une description",
      image: "https://www.exemple.com/img/cover.jpg",
      siteName: "Exemple",
    });
  });

  it("falls back to <title>, meta description and the icon", () => {
    const html = `<head><title>
      Page   simple </title><meta name="description" content="Desc"><link rel="icon" href="/favicon.png"></head>`;
    const preview = parseMetadata(html, page);
    expect(preview.title).toBe("Page simple");
    expect(preview.description).toBe("Desc");
    expect(preview.image).toBe("https://www.exemple.com/favicon.png");
  });

  it("drops non-http image URLs", () => {
    const html = `<meta property="og:image" content="javascript:alert(1)">`;
    expect(parseMetadata(html, page).image).toBeNull();
  });
});
