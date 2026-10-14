import { fetchPublic } from "../link-preview";

export interface ImageSize {
  width: number;
  height: number;
  type: "png" | "jpeg" | "gif" | "webp" | "avif";
}

/**
 * Width and height from the first bytes of an image file, without decoding it.
 * Covers PNG, JPEG, GIF, WebP (lossy, lossless, extended) and AVIF.
 */
export function imageSize(buf: Buffer): ImageSize | null {
  if (buf.length < 24) return null;

  // PNG: signature, then the IHDR chunk.
  if (buf.readUInt32BE(0) === 0x89504e47 && buf.toString("ascii", 12, 16) === "IHDR") {
    return { type: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF87a / GIF89a: logical screen size, little-endian.
  if (buf.toString("ascii", 0, 3) === "GIF") {
    return { type: "gif", width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP: RIFF....WEBP then VP8 / VP8L / VP8X.
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP" && buf.length >= 30) {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { type: "webp", width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return { type: "webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { type: "webp", width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
    return null;
  }

  // JPEG: walk the segments up to a Start Of Frame marker.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0xff) {
        i += marker === 0xff ? 1 : 2;
        continue;
      }
      const length = buf.readUInt16BE(i + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { type: "jpeg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + length;
    }
    return null;
  }

  // AVIF / HEIF: an "ftyp" box, then the image spatial extent ("ispe") property.
  if (buf.toString("ascii", 4, 8) === "ftyp" && /avif|avis|heic|mif1/.test(buf.toString("ascii", 8, 12))) {
    const at = buf.indexOf("ispe");
    if (at > 0 && at + 16 <= buf.length) return { type: "avif", width: buf.readUInt32BE(at + 8), height: buf.readUInt32BE(at + 12) };
    return null;
  }

  return null;
}

const PROBE_BYTES = 96 * 1024; // the size is in the first bytes, except for JPEGs with a large EXIF block
const cache = new Map<string, ImageSize | null>();

/** Reads just enough of a public image to know its size; null when unreadable or not an image. */
export async function probeImage(url: string): Promise<ImageSize | null> {
  if (cache.has(url)) return cache.get(url)!;
  const res = await fetchPublic(url, {
    accept: /^image\//i,
    binary: true,
    maxBytes: PROBE_BYTES,
    acceptHeader: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
  });
  const size = res.ok && res.bytes ? imageSize(res.bytes) : null;
  if (cache.size > 1000) cache.delete(cache.keys().next().value as string);
  cache.set(url, size);
  return size;
}

/**
 * Whether to keep a picture we already have: yes when it is big, and also when its
 * size can't be read from the server (some hosts block robots but serve browsers;
 * the browser then shows the topic's cover itself if the picture turns out small).
 */
export async function worthKeeping(url: string | null): Promise<boolean> {
  if (!url) return false;
  const size = await probeImage(url);
  return size === null || isBigCover(size);
}

/** A picture good enough to be a story's cover: large and not a thin banner or tall poster. */
export function isBigCover(size: { width: number; height: number } | null): boolean {
  if (!size || !size.width || !size.height) return false;
  const ratio = size.width / size.height;
  return size.width >= 560 && size.height >= 280 && ratio >= 0.9 && ratio <= 3;
}
