import { prisma } from "@/lib/db";
import { avatarUrl } from "@/lib/gravatar";
import { endpoint, ok, preflight } from "@/lib/api/http";
import { requireCaller } from "@/lib/api/keys";

/** GET /api/v1/me: who the key (or session) belongs to. Handy to check a key works. */
export const GET = endpoint(async (request) => {
  const caller = await requireCaller(request);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: caller.userId },
    select: { username: true, email: true, karma: true, isAdmin: true, createdAt: true },
  });
  return ok({
    username: user.username,
    avatarUrl: avatarUrl(user.email, user.username),
    karma: user.karma,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
    authenticatedWith: caller.via === "key" ? "api_key" : "session",
  });
});

export const OPTIONS = preflight;
