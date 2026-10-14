import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isPubliclyVisible } from "@/lib/content-status";
import { chatMessages, type ChatMessage } from "@/lib/discussions";
import { avatarUrl } from "@/lib/gravatar";
import { getDomain } from "@/lib/utils";
import { DiscussionsBar } from "@/components/discussions/DiscussionsBar";
import { ChatComposer, ChatLive } from "@/components/discussions/ChatComposer";
import { CoverImage } from "@/components/media/CoverImage";
import { TopicCover, coverTopic } from "@/components/media/TopicCover";
import { Avatar } from "@/components/user/Avatar";
import { formatRelativeTime, t } from "@/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getThread(id: string) {
  const threadId = Number(id);
  if (!Number.isInteger(threadId) || threadId <= 0) return null;
  const thread = await prisma.item.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      type: true,
      title: true,
      url: true,
      text: true,
      imageUrl: true,
      status: true,
      publishAt: true,
      createdAt: true,
      authorId: true,
      author: { select: { username: true, email: true, shadowBanned: true } },
      tags: { select: { tag: { select: { slug: true } } } },
    },
  });
  if (!thread || thread.type === "comment" || !isPubliclyVisible(thread) || thread.author.shadowBanned) return null;
  return thread;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const thread = await getThread((await params).id);
  return { title: thread ? `${thread.title ?? "Discussion"} · En discussion` : "En discussion" };
}

/** Same author within 5 minutes: one group, the name and picture shown once. */
const sameGroup = (a: ChatMessage | undefined, b: ChatMessage) =>
  !!a && a.username === b.username && b.createdAt.getTime() - a.createdAt.getTime() < 5 * 60 * 1000;

const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Brazzaville" });
const dayFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Brazzaville" });
/** « Mercredi 14 octobre ». */
const day = { format: (date: Date) => dayFormat.format(date).replace(/^./, (c) => c.toUpperCase()) };

export default async function DiscussionPage({ params }: PageProps) {
  const thread = await getThread((await params).id);
  if (!thread) notFound();
  const session = await getSession();

  const messages = await chatMessages(thread.id, session?.userId ?? null);
  // A free topic's own text is its opening message.
  if (thread.type === "ask" && thread.text) {
    messages.unshift({
      id: -thread.id,
      text: thread.text,
      createdAt: thread.createdAt,
      username: thread.author.username,
      avatarUrl: avatarUrl(thread.author.email, thread.author.username),
      mine: session?.userId === thread.authorId,
    });
  }

  const title = thread.title ?? t("common.untitled");
  const domain = thread.url ? getDomain(thread.url) : null;
  const topic = <TopicCover topic={coverTopic(thread.tags.map((x) => x.tag.slug), title)} className="h-16 w-16 shrink-0 rounded-xl" />;

  return (
    <>
      <DiscussionsBar />
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-3xl flex-col px-4 pt-4 sm:px-6">
        <Link href="/discussions" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-secondary hover:text-accent hover:no-underline">
          <ArrowLeft size={15} aria-hidden />
          {t("discussions.all")}
        </Link>

        {/* What the conversation is about */}
        <header className="mt-4 flex items-start gap-4 rounded-2xl border border-border p-4">
          {thread.type === "ask" ? (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <MessagesSquare size={26} aria-hidden />
            </span>
          ) : thread.imageUrl ? (
            <CoverImage src={thread.imageUrl} className="h-16 w-16 shrink-0 rounded-xl" fallback={topic} />
          ) : (
            topic
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              {thread.type === "ask" ? t("discussions.kind.libre") : t("discussions.kind.article")}
              {thread.type === "ask" && <span className="normal-case tracking-normal"> · {t("discussions.openedBy", { username: thread.author.username })}</span>}
            </p>
            <h1 className="mt-1 text-lg font-semibold leading-snug text-text sm:text-xl">{title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {thread.url && (
                <a
                  href={thread.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-open={thread.id}
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  {t("discussions.readArticle")} <ArrowUpRight size={14} aria-hidden />
                  <span className="font-normal text-text-secondary">{domain}</span>
                </a>
              )}
              <Link href={`/publication/${thread.id}`} className="text-text-secondary hover:text-accent">
                {t("discussions.publication")}
              </Link>
            </p>
          </div>
        </header>

        {/* Messages */}
        <ol aria-label="Messages" className="flex-1 py-6">
          {messages.length === 0 && (
            <li className="flex flex-col items-center py-16 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-bg-secondary text-text-secondary">
                <MessagesSquare size={24} aria-hidden />
              </span>
              <p className="mt-4 font-semibold text-text">{t("discussions.firstTitle")}</p>
              <p className="mt-1 text-sm text-text-secondary">{t("discussions.firstText")}</p>
            </li>
          )}
          {messages.map((m, i) => {
            const previous = messages[i - 1];
            const grouped = sameGroup(previous, m);
            const newDay = !previous || day.format(previous.createdAt) !== day.format(m.createdAt);
            return (
              <li key={m.id}>
                {newDay && (
                  <p className="my-4 text-center text-xs font-medium text-text-secondary">
                    <span className="rounded-full bg-bg-secondary px-3 py-1">{day.format(m.createdAt)}</span>
                  </p>
                )}
                <div className={`flex items-end gap-2 ${m.mine ? "flex-row-reverse" : ""} ${grouped && !newDay ? "mt-1" : "mt-4"}`}>
                  {m.mine ? null : grouped && !newDay ? (
                    <span className="w-8 shrink-0" />
                  ) : (
                    <Link href={`/profil/${m.username}`} className="shrink-0" aria-label={m.username}>
                      <Avatar src={m.avatarUrl} size={32} />
                    </Link>
                  )}
                  <div className={`flex max-w-[85%] flex-col sm:max-w-[75%] ${m.mine ? "items-end" : "items-start"}`}>
                    {!m.mine && (!grouped || newDay) && (
                      <Link href={`/profil/${m.username}`} className="mb-1 ml-3 text-xs font-semibold text-text-secondary hover:text-accent">
                        {m.username}
                      </Link>
                    )}
                    <p
                      className={`whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed ${
                        m.mine ? "rounded-br-md bg-accent text-white" : "rounded-bl-md bg-bg-secondary text-text"
                      }`}
                    >
                      {m.text}
                    </p>
                    <time dateTime={m.createdAt.toISOString()} title={formatRelativeTime(m.createdAt)} className="mx-3 mt-1 text-[11px] text-text-secondary">
                      {time.format(m.createdAt)}
                    </time>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <ChatLive count={messages.length} />
        <ChatComposer threadId={thread.id} isLoggedIn={!!session} />
        <div id="chat-end" />
      </div>
    </>
  );
}
