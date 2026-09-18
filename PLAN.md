# O'Mbongui Plan

## File Tree

```
src/
├── app/
│   ├── layout.tsx                 # Root layout + theme script
│   ├── page.tsx                   # Top stories
│   ├── newest/page.tsx
│   ├── ask/page.tsx
│   ├── show/page.tsx
│   ├── jobs/page.tsx
│   ├── comments/page.tsx
│   ├── item/[id]/
│   │   └── page.tsx               # Story + threaded comments
│   ├── user/[username]/
│   │   └── page.tsx               # User profile
│   ├── submit/page.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── api/
│       ├── cron/rank/route.ts     # Background ranking sweep
│       └── actions/               # Server actions
│           ├── vote.ts
│           ├── submit.ts
│           ├── comment.ts
│           └── auth.ts
├── lib/
│   ├── site.ts                    # Site constants (O'Mbongui name/tagline)
│   ├── cache.ts                   # Cache wrapper (unstable_cache, tags)
│   ├── ratelimit.ts               # Token-bucket rate limiter (in-memory v1)
│   ├── ranking.ts                 # Gravity formula, pure functions
│   ├── thread.ts                  # Comment thread assembly from flat rows
│   ├── auth.ts                    # Session management, password hashing
│   ├── db.ts                      # Prisma client singleton
│   └── utils.ts                   # Helpers (formatTime, getDomain, etc)
├── components/
│   ├── layout/
│   │   ├── Header.tsx             # Nav + site header
│   │   └── SectionHeader.tsx      # Page title + submit button
│   ├── list/
│   │   ├── StoryRow.tsx           # Rank · vote · title · meta
│   │   ├── VoteButton.tsx         # Upvote arrow (client component)
│   │   ├── MetaItem.tsx           # Author, domain, time, count
│   │   └── Pagination.tsx         # Numbered pages, keyset cursor
│   ├── item/
│   │   ├── CommentThread.tsx      # Indented comments + collapse
│   │   ├── CommentItem.tsx        # Single comment
│   │   └── CommentForm.tsx        # Reply input
│   ├── forms/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── SubmitForm.tsx         # URL vs text, labels above inputs
│   │   └── ProfileForm.tsx
│   └── theme/
│       └── ThemeToggle.tsx        # Light/dark switcher
├── styles/
│   └── globals.css                # Theme tokens, Tailwind overrides
└── __tests__/
    └── ranking.test.ts            # Vitest: gravity formula

prisma/
├── schema.prisma                  # Postgres-compatible SQLite
└── seed.ts                        # ~10 users, ~60 stories, deep threads

scripts/
└── rank.ts                        # Local ranking sweep (dev/testing)

public/
└── favicon.ico
```

## Data Model (Prisma schema outline)

```prisma
model User {
  id            Int       @id @default(autoincrement())
  username      String    @unique
  passwordHash  String
  about         String?
  karma         Int       @default(0)
  shadowBanned  Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  items         Item[]
  votes         Vote[]
  
  @@index([karma])
  @@index([createdAt])
}

model Item {
  id            Int       @id @default(autoincrement())
  type          String    // 'story' | 'comment' | 'ask' | 'show' | 'job'
  title         String?   // Required for stories
  url           String?   // Required for stories
  text          String?   // For comments and text posts
  authorId      Int
  author        User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  
  // Threading
  parentId      Int?      // For comments
  parent        Item?     @relation("Comments", fields: [parentId], references: [id], onDelete: Cascade)
  children      Item[]    @relation("Comments")
  path          String    // Materialized path: "000001.000042.000105"
  depth         Int       // Cached depth
  
  // Voting & ranking
  points        Int       @default(1)
  rankScore     Float     @default(0)
  rankedAt      DateTime  @default(now())
  votes         Vote[]
  
  // Anti-abuse
  flagCount     Int       @default(0)
  deleted       Boolean   @default(false)
  
  // Metadata
  commentCount  Int       @default(0) // Denormalized for stories
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([type, createdAt])
  @@index([parentId])
  @@index([rankScore])
  @@index([authorId])
  @@index([deleted])
  @@fulltext([title, text]) // Optional: for search
}

model Vote {
  id        Int   @id @default(autoincrement())
  userId    Int
  user      User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemId    Int
  item      Item  @relation(fields: [itemId], references: [id], onDelete: Cascade)
  
  @@unique([userId, itemId])
  @@index([userId])
  @@index([itemId])
}
```

## Routes Summary

| Route | Type | Auth | Cache | Purpose |
|-------|------|------|-------|---------|
| `/` | GET | No | 30-60s | Top stories (last 48h) |
| `/newest` | GET | No | 30-60s | Newest stories |
| `/ask` | GET | No | 30-60s | Ask HN stories |
| `/show` | GET | No | 30-60s | Show HN stories |
| `/jobs` | GET | No | 30-60s | Job postings |
| `/comments` | GET | No | 60s | Recent comments |
| `/item/[id]` | GET | No | Per-id + SWR | Story + threaded comments |
| `/user/[username]` | GET | No | 1m | User profile + karma |
| `/submit` | GET | Yes | No | Submission form |
| `/submit` | POST | Yes | No | Create story/ask/show/job |
| `/login` | GET | No | No | Login form |
| `/login` | POST | No | No | Authenticate |
| `/register` | GET | No | No | Registration form |
| `/register` | POST | No | No | Create account |
| `/api/cron/rank` | POST | Secret | No | Recompute `rankScore` |
| `/item/[id]/comment` | POST | Yes | No | Submit comment (server action) |
| `/api/vote` | POST | Yes | No | Submit upvote (server action) |

## Key Implementation Patterns

### Caching Strategy
- **Front pages** (`/`, `/newest`, etc.): Cached HTML output, 30-60s TTL + SWR
- **Item pages**: Cached per-id, revalidate on new comment/vote
- **User pages**: Cached 1m
- **Vote state**: Fetch user's voted-item set separately (small payload) after serving cached shell

### Ranking Sweep
- Runs every 1-2 minutes via `/api/cron/rank` (secret guard)
- Processes stories from last 48h + any item with vote in last 1h
- Updates `rankScore` and `rankedAt` in bulk
- `scripts/rank.ts` for local testing

### Comment Threading
- Adjacency list with materialized `path` string (e.g., "1.42.105")
- Single query: `WHERE path LIKE ? ORDER BY path` returns flat thread
- Pure function in `lib/thread.ts` assembles tree client-side from rows
- Collapse toggle per subtree (client component state)
- Flatten anything past depth ~8

### Auth
- Session stored in `httpOnly` cookie
- `lib/auth.ts` exports: `hashPassword()`, `verifyPassword()`, `createSession()`, `getSession()`
- Credentials-only, no OAuth in v1
- New accounts can't vote until 24h old + karma > 0

### Rate Limiting
- Token bucket in `lib/ratelimit.ts` (in-memory map, keyed by userId)
- N submissions/hour, M comments/hour per user
- Stricter limits for accounts < 24h old
- Swappable interface for Redis later

### Anti-abuse
- `shadowBanned` boolean: items invisible to others, visible to author
- `flagCount` threshold (e.g., 10) auto-hides pending review
- Duplicate-URL detection: redirect upvote to existing story
- No accounts can vote until 24h + karma > 0

## Milestone Order

### Milestone 1: Scaffold & Schema
- Init Next.js App Router + TypeScript + Tailwind
- `prisma/schema.prisma` with indexes
- Theme tokens (light/dark) as CSS custom properties
- Blocking inline script in `<head>` for theme (no flash)
- `prisma/seed.ts`: ~10 users, ~60 stories, varied scores/ages, deep threads
- `lib/site.ts` with O'Mbongui constants
- Test: `npm run build` + `npm test` + `npm run seed`

### Milestone 2: Design System Primitives
- `StoryRow.tsx`: Rank · Vote button · Title · Author · Domain · Time · Comment count
- `VoteButton.tsx`: Client component, upvote arrow (solid when voted)
- `MetaItem.tsx`: Icons + labels (user, domain, time, comments)
- `Header.tsx`: Logo + nav links (top, newest, ask, show, jobs, comments) + theme toggle
- `SectionHeader.tsx`: Page title + "+ Submit" button (right-aligned)
- `Pagination.tsx`: Keyset cursor pagination, "Page N of many"
- `lib/utils.ts`: formatTime, getDomain, etc.
- Test: Render a demo list with Storybook or inline page

### Milestone 3: List Pages & Ranking
- `/page.tsx` (top stories): Fetch top 30 by rankScore, cache 30-60s
- `/newest`, `/ask`, `/show`, `/jobs/page.tsx`: Filter by type
- `/comments/page.tsx`: Recent comments across site
- `lib/ranking.ts`: Gravity formula `(points - 1) / (age_in_hours + 2)^1.8` + tests
- `lib/cache.ts`: `unstable_cache` wrapper with tags + SWR helper
- `/api/cron/rank`: Secret-guarded sweep, recompute rankScore for hot items
- `scripts/rank.ts`: Dev ranking command
- Keyset pagination (cursor on rankScore, id)
- Test: `npm run build` + list pages render + ranking formula passes tests

### Milestone 4: Auth & Voting
- `/login`, `/register` pages + forms
- `lib/auth.ts`: `hashPassword()`, `verifyPassword()`, session cookie
- Server actions: `vote.ts` (one vote per user per item)
- `VoteButton.tsx` client logic: optimistic UI, server action call
- Vote revalidates item page cache
- New accounts: can't vote until 24h + karma > 0
- Test: Auth flow, vote toggle, cache invalidation

### Milestone 5: Item Page & Comments
- `/item/[id]/page.tsx`: Story + metadata + comment form (if authed)
- `lib/thread.ts`: Pure function assembles comment tree from flat rows (path ordering)
- `CommentThread.tsx`: Indented tree with collapse toggle per subtree
- Flatten past depth ~8
- Single query: `WHERE path LIKE ? ORDER BY path`
- Comment form: Text area + submit (server action)
- Test: Render a deep thread, test collapse/expand

### Milestone 6: Submit & User Profiles
- `/submit/page.tsx`: Form with URL vs. text toggle
- Submit form validation: URL must be valid, URL and text can't both be empty/full
- `lib/ratelimit.ts`: Rate limit submissions (N per hour)
- Duplicate-URL detection: redirect upvote to existing story
- `/user/[username]/page.tsx`: Profile (karma, about, submissions, comments)
- `profileForm.tsx`: Edit about field (authed user only)
- Test: Submit flow, duplicate redirect, profile render

### Milestone 7: Anti-abuse
- `shadowBanned` predicate in story queries
- `flagCount` threshold auto-hides (e.g., flagCount >= 10)
- Rate limits on comments (M per hour)
- Test: Shadow ban hides from others, flag threshold works

### Milestone 8: Polish
- Keyboard navigation (arrow keys, / to focus search, j/k to navigate)
- Focus states on all interactive controls
- Responsive down to 375px (mobile-first Tailwind)
- ARIA labels on icon-only buttons
- Test: Responsive viewport, keyboard nav, a11y audits

---

## Build, Test, Deploy

### Local Development
```bash
npm install
npm run dev                # Next.js dev server
npm test                   # Vitest ranking tests
npm run seed              # Populate dev database
npm run rank              # Run ranking sweep once
```

### Before Each Milestone
```bash
npm run build             # Check for TS errors
npm test                  # Ranking tests pass
npm run seed              # Optional: reset data
```

### Production (Vercel)
- Deploy Next.js app as-is
- Cron trigger: `POST /api/cron/rank?secret=...` every 2 min
- Environment variables: `DATABASE_URL`, `CRON_SECRET`
- Cache: default Vercel edge cache (30-60s per tag)

---

## Implementation Notes

- **No component library**: Build primitives directly in `components/`, design control is key.
- **Server components by default**: Only `VoteButton`, `ThemeToggle`, `CommentForm` are client.
- **Tailwind only**: No CSS-in-JS, theme tokens via `:root` custom properties.
- **SQLite → Postgres**: Schema stays Postgres-compatible; `lib/db.ts` is single Prisma client.
- **Swap-friendly abstractions**: `lib/cache.ts`, `lib/ratelimit.ts` behind interfaces for Redis/external later.
- **Path-based comment threading**: Materialized `path` string + `depth` = one query, no N+1.
- **Keyset pagination**: Cursor on (rankScore, id) = cheap deep pages, no OFFSET.
