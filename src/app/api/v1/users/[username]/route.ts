import { prisma } from "@/lib/db";
import { avatarUrl } from "@/lib/gravatar";
import { publiclyVisible } from "@/lib/content-status";
import { ApiError, endpoint, ok, preflight, siteOrigin } from "@/lib/api/http";

/** GET /api/v1/users/{username}: a member's public profile (their stories: /stories?author=…). */
export const GET = endpoint<{ username: string }>(async (request, { params }) => {
  const { username } = await params;
  if (!/^[\w.-]{1,40}$/.test(username)) throw new ApiError("not_found", "Membre introuvable.");
  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, banned: false, shadowBanned: false },
    select: { id: true, username: true, email: true, about: true, karma: true, createdAt: true },
  });
  if (!user) throw new ApiError("not_found", "Membre introuvable.");
  const [stories, comments] = await Promise.all([
    prisma.item.count({ where: { authorId: user.id, type: { not: "comment" }, ...publiclyVisible() } }),
    prisma.item.count({ where: { authorId: user.id, type: "comment", ...publiclyVisible() } }),
  ]);
  const origin = siteOrigin(request);
  return ok({
    username: user.username,
    avatarUrl: avatarUrl(user.email, user.username),
    about: user.about,
    karma: user.karma,
    stories,
    comments,
    createdAt: user.createdAt.toISOString(),
    links: { web: `${origin}/profil/${user.username}`, stories: `${origin}/api/v1/stories?author=${encodeURIComponent(user.username)}&scope=all` },
  });
});

export const OPTIONS = preflight;
