import type { ListedStory } from "@/lib/stories";
import { getDomain } from "@/lib/utils";
import { isRegion, isTopic } from "@/lib/topic-list";

/** The public JSON of the API's objects (no emails, no internal fields). */

export interface StoryJson {
  id: number;
  type: string;
  title: string | null;
  url: string | null;
  domain: string | null;
  text: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  topics: string[];
  region: string | null;
  tags: { slug: string; name: string }[];
  category: { slug: string; name: string } | null;
  points: number;
  comments: number;
  views: number;
  author: { username: string; avatarUrl: string };
  createdAt: string;
  /** The viewer's vote (1, -1 or 0); always 0 for anonymous calls. */
  vote: number;
  links: { web: string; discussion: string; api: string };
}

export function storyJson(story: ListedStory, origin: string): StoryJson {
  const tags = story.tags.map((t) => t.tag);
  return {
    id: story.id,
    type: story.type,
    title: story.title,
    url: story.url,
    domain: story.url ? getDomain(story.url) : null,
    text: story.text,
    excerpt: story.excerpt,
    imageUrl: story.imageUrl,
    topics: tags.map((t) => t.slug).filter((slug) => isTopic(slug)),
    region: tags.map((t) => t.slug).find((slug) => isRegion(slug)) ?? null,
    tags: tags.map((t) => ({ slug: t.slug, name: t.name })),
    category: story.category,
    points: story.points,
    comments: story.commentCount,
    views: story.viewCount,
    author: story.author,
    createdAt: story.createdAt.toISOString(),
    vote: story.vote,
    links: {
      web: `${origin}/publication/${story.id}`,
      discussion: `${origin}/discussions/${story.id}`,
      api: `${origin}/api/v1/stories/${story.id}`,
    },
  };
}

export interface CommentJson {
  id: number;
  storyId: number | null;
  text: string;
  points: number;
  author: { username: string; avatarUrl: string };
  createdAt: string;
}
