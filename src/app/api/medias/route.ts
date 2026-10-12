import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { MEDIA_MAX_BYTES, MEDIA_TYPES, isBlobConfigured } from "@/lib/media";
import { slugify } from "@/lib/taxonomy";

/**
 * POST /api/medias (multipart, field "file"): uploads an image to Vercel Blob
 * and adds it to the media library. Admins only.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  if (!isBlobConfigured()) {
    return NextResponse.json({ error: "Le stockage Vercel Blob n'est pas configuré." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (!(MEDIA_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "Format non pris en charge (JPEG, PNG, WebP, GIF ou AVIF)." }, { status: 415 });
  }
  if (file.size > MEDIA_MAX_BYTES) return NextResponse.json({ error: "Image trop lourde (4 Mo maximum)." }, { status: 413 });

  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const month = new Date().toISOString().slice(0, 7).replace("-", "/");
  const blob = await put(`medias/${month}/${base}.${extension}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  const media = await prisma.media.create({
    data: {
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      size: file.size,
      alt: String(form?.get("alt") ?? "").trim().slice(0, 200),
      uploadedById: session.userId,
    },
    select: { id: true, url: true },
  });
  await logActivity(session.userId, "media.upload", `Image « ${file.name} » ajoutée à la médiathèque`, { type: "media", id: media.id });

  return NextResponse.json(media, { status: 201 });
}
