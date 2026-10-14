import { endpoint, fromRefusal, json, preflight, readBody, siteOrigin, stringField } from "@/lib/api/http";
import { apiCaller, requireCaller } from "@/lib/api/keys";
import { storiesFromQuery, storyById } from "@/lib/api/stories";
import { publishStory } from "@/lib/publish";

/** GET /api/v1/stories: the site's lists (sort, topic, region, search…), cursor-paginated. */
export const GET = endpoint(async (request) => {
  const caller = await apiCaller(request);
  const { data, meta } = await storiesFromQuery(new URL(request.url).searchParams, caller, siteOrigin(request));
  return json({ data, meta });
});

/** POST /api/v1/stories: publish a link or a text (signed-in member or API key). */
export const POST = endpoint(async (request) => {
  const caller = await requireCaller(request);
  const body = await readBody(request);
  const categoryId = body.categoryId;
  const result = await publishStory(caller, {
    type: stringField(body, "type", { max: 10 }) ?? "story",
    title: stringField(body, "title", { required: true, max: 500 })!,
    url: stringField(body, "url", { max: 2000 }),
    text: stringField(body, "text", { max: 20000 }),
    categoryId: typeof categoryId === "number" ? categoryId : null,
    tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string").join(",") : stringField(body, "tags", { max: 300 }),
  });
  if (!result.ok) throw fromRefusal(result);
  const story = await storyById(result.itemId, caller, siteOrigin(request));
  return json({ data: story, meta: { duplicate: result.duplicate } }, result.duplicate ? 200 : 201);
});

export const OPTIONS = preflight;
