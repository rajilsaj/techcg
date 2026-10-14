import { endpoint, idParam, ok, preflight, siteOrigin } from "@/lib/api/http";
import { apiCaller } from "@/lib/api/keys";
import { storyById } from "@/lib/api/stories";
import { chatMessages } from "@/lib/discussions";

/**
 * GET /api/v1/discussions/{id}: the publication and its messages, oldest first
 * (the latest 300). Post with POST /api/v1/stories/{id}/comments.
 */
export const GET = endpoint<{ id: string }>(async (request, { params }) => {
  const id = idParam((await params).id);
  const caller = await apiCaller(request);
  const story = await storyById(id, caller, siteOrigin(request));
  const messages = await chatMessages(id, caller?.userId ?? null);
  return ok({
    story,
    messages: messages.map((m) => ({
      id: m.id,
      text: m.text,
      author: { username: m.username, avatarUrl: m.avatarUrl },
      mine: m.mine,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

export const OPTIONS = preflight;
