import { describe, expect, it } from "vitest";
import { imageSize, isBigCover } from "@/lib/scraper/image-size";
import { articleParagraphs, chooseCover, imageCandidates, summaryFrom } from "@/lib/scraper/article";
import { coverTopic } from "@/components/media/TopicCover";

function png(width: number, height: number): Buffer {
  const b = Buffer.alloc(33);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(0x0d0a1a0a, 4);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

function jpeg(width: number, height: number): Buffer {
  // SOI, an APP0 segment, then SOF0 with the size.
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.from("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const sof = Buffer.alloc(19);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof]);
}

function gif(width: number, height: number): Buffer {
  const b = Buffer.alloc(26);
  b.write("GIF89a", 0, "ascii");
  b.writeUInt16LE(width, 6);
  b.writeUInt16LE(height, 8);
  return b;
}

function webpVp8x(width: number, height: number): Buffer {
  const b = Buffer.alloc(30);
  b.write("RIFF", 0, "ascii");
  b.write("WEBP", 8, "ascii");
  b.write("VP8X", 12, "ascii");
  b.writeUIntLE(width - 1, 24, 3);
  b.writeUIntLE(height - 1, 27, 3);
  return b;
}

describe("imageSize", () => {
  it("reads PNG, JPEG, GIF and WebP dimensions from the first bytes", () => {
    expect(imageSize(png(1200, 630))).toEqual({ type: "png", width: 1200, height: 630 });
    expect(imageSize(jpeg(800, 450))).toEqual({ type: "jpeg", width: 800, height: 450 });
    expect(imageSize(gif(16, 16))).toEqual({ type: "gif", width: 16, height: 16 });
    expect(imageSize(webpVp8x(1600, 900))).toEqual({ type: "webp", width: 1600, height: 900 });
    expect(imageSize(Buffer.from("<html>not an image</html>"))).toBeNull();
  });

  it("calls only large, landscape-ish pictures a cover", () => {
    expect(isBigCover({ width: 1200, height: 630 })).toBe(true);
    expect(isBigCover({ width: 1000, height: 1000 })).toBe(true);
    expect(isBigCover({ width: 300, height: 200 })).toBe(false); // thumbnail
    expect(isBigCover({ width: 1200, height: 200 })).toBe(false); // banner
    expect(isBigCover({ width: 600, height: 1200 })).toBe(false); // poster
    expect(isBigCover(null)).toBe(false);
  });
});

const PAGE = `<html><head>
<meta property="og:image" content="/img/logo.png">
<meta property="og:image:width" content="200"><meta property="og:image:height" content="200">
<script type="application/ld+json">{"@type":"NewsArticle","image":{"@type":"ImageObject","url":"https://cdn.example/cover.jpg","width":1200,"height":675}}</script>
</head><body>
<nav><p>Accueil · Rubriques · Contact et tout le reste du menu du site qui n'est pas un article</p></nav>
<article>
  <p>Par Jean</p>
  <p>La startup congolaise Kelasi a lancé mardi à Brazzaville une plateforme d'apprentissage en ligne pour les lycéens.</p>
  <img src="/icons/share.svg" width="16" height="16">
  <img srcset="https://cdn.example/a-480.jpg 480w, https://cdn.example/a-1600.jpg 1600w" src="https://cdn.example/a-480.jpg">
  <p>Le service, gratuit pendant trois mois, couvre les mathématiques, la physique et le français avec des vidéos courtes.</p>
  <p>Abonnez-vous à notre newsletter</p>
</article>
<footer><p>© 2026 Exemple. Tous droits réservés, reproduction interdite sans autorisation écrite.</p></footer>
</body></html>`;

describe("article extraction", () => {
  it("keeps the article's prose, without menus, bylines, notices or footer", () => {
    const paragraphs = articleParagraphs(PAGE);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toMatch(/^La startup congolaise Kelasi/);
  });

  it("builds a summary from the opening paragraphs, cut at a sentence end", () => {
    const summary = summaryFrom(articleParagraphs(PAGE))!;
    expect(summary).toMatch(/^La startup congolaise/);
    expect(summary.length).toBeLessThanOrEqual(400);
    expect(summaryFrom([])).toBeNull();
    const long = summaryFrom(["Phrase un assez longue pour compter. ".repeat(20)], 200)!;
    expect(long.endsWith(".")).toBe(true);
    expect(long.length).toBeLessThanOrEqual(200);
  });

  it("lists picture candidates: declared sizes, JSON-LD, largest srcset; skips icons", () => {
    const candidates = imageCandidates(PAGE, new URL("https://www.example.cg/article"));
    expect(candidates.map((c) => c.url)).toEqual(["https://cdn.example/cover.jpg", "https://cdn.example/a-1600.jpg"]);
    expect(candidates[0]).toMatchObject({ source: "jsonld", width: 1200, height: 675 });
    expect(candidates[1]).toMatchObject({ source: "content", width: 1600 });
  });

  it("finds no cover when the page only offers small pictures (no download needed)", async () => {
    const result = await chooseCover([{ url: "https://cdn.example/thumb.jpg", width: 150, height: 150, source: "og" }]);
    expect(result).toEqual({ cover: null, coverCheck: "too_small" });
    expect(await chooseCover([])).toEqual({ cover: null, coverCheck: "none" });
  });
});

describe("coverTopic", () => {
  it("picks AI from the text, else the story's meta tag, else Tech", () => {
    expect(coverTopic(["startups"], "OpenAI ouvre un bureau à Lagos")).toBe("ia");
    expect(coverTopic(["tech"], "L'intelligence artificielle au service des agriculteurs")).toBe("ia");
    expect(coverTopic(["startups", "tech"], "Kelasi lève 1 M$")).toBe("startups");
    expect(coverTopic(["tech", "evenements"], "Salon du numérique à Brazzaville")).toBe("evenements");
    expect(coverTopic(["entrepreneurs"], "Portrait d'une fondatrice")).toBe("entrepreneurs");
    expect(coverTopic([], "Fibre optique : nouveau câble")).toBe("tech");
    // "ia" inside words is not AI.
    expect(coverTopic(["tech"], "La Namibie inaugure un média social")).toBe("tech");
  });
});
