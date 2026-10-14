import { ApiError, endpoint, fromRefusal, json, preflight, readBody, siteOrigin, stringField } from "@/lib/api/http";
import { requireCaller } from "@/lib/api/keys";
import { listDiscussions } from "@/lib/discussions";
import { publishStory } from "@/lib/publish";

/** GET /api/v1/discussions?type=article|libre: conversations in progress, latest activity first. */
export const GET = endpoint(async (request) => {
  const type = new URL(request.url).searchParams.get("type");
  if (type !== null && type !== "article" && type !== "libre") throw new ApiError("validation", "type doit valoir : article, libre.");
  const origin = siteOrigin(request);
  const discussions = await listDiscussions(type ?? undefined);
  return json({
    data: discussions.map((d) => ({
      id: d.id,
      kind: d.kind,
      title: d.title,
      url: d.url,
      imageUrl: d.imageUrl,
      messages: d.messages,
      lastActivityAt: d.lastAt.toISOString(),
      lastMessage: d.last,
      participants: d.participants,
      links: { web: `${origin}/discussions/${d.id}`, api: `${origin}/api/v1/discussions/${d.id}` },
    })),
  });
});

/** POST /api/v1/discussions  { title, text }: opens a free-topic conversation. */
export const POST = endpoint(async (request) => {
  const caller = await requireCaller(request);
  const body = await readBody(request);
  const result = await publishStory(caller, {
    type: "ask",
    title: stringField(body, "title", { required: true, max: 500 })!,
    text: stringField(body, "text", { required: true, max: 20000 }),
  });
  if (!result.ok) throw fromRefusal(result);
  const origin = siteOrigin(request);
  return json({ data: { id: result.itemId, links: { web: `${origin}/discussions/${result.itemId}`, api: `${origin}/api/v1/discussions/${result.itemId}` } } }, 201);
});

export const OPTIONS = preflight;
