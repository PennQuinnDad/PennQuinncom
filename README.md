# PennQuinn.com

A custom family blog for Penn and Quinn (born March 3, 2009). Migrated from WordPress, now running as a small but full-featured Node/React app with an admin interface, media library, video gallery, and one-command deploys.

**Live site:** https://pennquinn.com

---

## Overview

This is a single-author personal blog with **~750 posts** going back to 2009. It started life on WordPress; the data was migrated into a Postgres-backed app with the same URL structure preserved. The app does what a small CMS does — render posts, host images and videos, support an admin to write new ones — but built from scratch with modern tooling so it's fast, easy to extend, and cheap to run (~$25/month all-in).

Notable bits:

- **Rich post bodies** with auto-embedding of Vimeo and YouTube URLs, sanitized HTML, and gallery support for both images and videos.
- **Click-to-play video grids** so a post with 10+ videos shows as thumbnails and pops them open in a lightbox — instead of preloading a wall of iframes.
- **"Said by Penn / Said by Quinn" quote cards** — posts tagged that way render with a styled gradient card on the home grid, no extra effort by the author.
- **Quick Video Post** — paste a Vimeo URL, the admin auto-fetches the title, thumbnail, and upload date, and creates a publish-ready post in one click.
- **One-command deploy** (`npm run deploy`) that builds locally, syncs the server's git checkout + node_modules, runs schema migrations, swaps the bundle, restarts the service, and verifies the public URL.

---

## Tech stack

### Frontend
| | |
|---|---|
| **React 18** + **TypeScript** | Component framework |
| **Vite** | Dev server + production bundler |
| **wouter** | Tiny client-side router (~1KB) |
| **TanStack Query** | Server state / data fetching |
| **Tailwind CSS** | Styling |
| **shadcn/ui** + **Radix primitives** | Accessible UI components (Dialog, Popover, Command, etc.) |
| **DOMPurify** | HTML sanitization for post content |
| **lucide-react** | Icons |

### Backend
| | |
|---|---|
| **Node.js** + **TypeScript** | Runtime |
| **Express 5** | HTTP server |
| **Drizzle ORM** + **drizzle-zod** | Type-safe DB access and schema validation |
| **PostgreSQL** | Data store (posts, media, sessions) |
| **express-session** + **connect-pg-simple** | Admin auth session storage |
| **multer** | File uploads |
| **esbuild** (via `tsx`) | Server bundling to a single `dist/index.cjs` |

### Hosting
| | |
|---|---|
| **AWS Lightsail** (Node.js Bitnami blueprint, us-west-2) | App server + Postgres |
| **Cloudflare** | DNS, TLS, CDN |
| **systemd** | Process supervision |
| **Bitnami Apache** | Reverse proxy on the box (80/443 → Node :3000) |

### Tooling
| | |
|---|---|
| **drizzle-kit** | Schema migrations (`npm run db:push`) |
| **tsx** | TypeScript execution / build entry |

---

## Architecture

```
        ┌─────────────┐
        │   Visitor   │
        └──────┬──────┘
               │ HTTPS
               ▼
        ┌─────────────┐    DNS A: pennquinn.com → Cloudflare
        │  Cloudflare │       proxy to origin: 35.162.150.115
        └──────┬──────┘
               │
               ▼  443
   ┌──────────────────────────────────────┐
   │  Lightsail instance (pennquinn-web)  │
   │  ┌────────────────────────────────┐  │
   │  │   Bitnami Apache (httpd)       │  │  reverse proxy
   │  └──────────┬─────────────────────┘  │
   │             ▼ :3000                  │
   │  ┌────────────────────────────────┐  │
   │  │   pennquinn.service (systemd)  │  │  node dist/index.cjs
   │  │   = Express app + Vite assets  │  │  (CWD: /home/bitnami/PennQuinncom)
   │  └──────────┬─────────────────────┘  │
   │             │                        │
   └─────────────┼────────────────────────┘
                 │ private VPC
                 ▼
        ┌─────────────────────┐
        │  Lightsail Postgres │  posts, media, sessions
        └─────────────────────┘
```

The Express server serves both the API (`/api/posts`, `/api/media/upload`, `/api/vimeo/:id`, etc.) and the built React assets out of `dist/public/`. Same process, single port.

---

## Features

### For visitors

- **Home page** — All posts in a responsive grid, with:
  - Full-text search across title, content, categories, and tags
  - Filter by **tag** (multi-select combobox)
  - Filter by **year**
  - Pagination (24 posts per page)
  - Post cards show featured image, video thumbnail, or quote-card styling
  - "Shuffle" button to surface a random post
- **Post pages** — Sanitized HTML rendering, auto-embedded Vimeo and YouTube URLs in responsive containers, image galleries, and clickable video galleries with a lightbox player. Keyboard navigation between posts (← / →).
- **Video posts** — Posts with Vimeo or YouTube content, or a "Video" category, get a play-button overlay on their card.
- **Quote posts** — Posts tagged `Said by Penn` or `Said by Quinn` render as gradient quote cards on the home grid (blue for Penn, green for Quinn) with the kid's age at the time of the post.

### For admins (logged in)

- **Manage Posts** dashboard with search, filtering by visual content (has image / missing image / all), and sortable columns.
- **Create / edit / delete** any post.
- **Quick Video Post** — paste a Vimeo URL, the server fetches the title, thumbnail, and upload date via Vimeo's oEmbed and v2 APIs, and creates a publish-ready post (with the Vimeo thumbnail set as the featured image) in one click.
- **Post editor:**
  - Raw HTML body with inline Vimeo URL → iframe helper
  - Featured image (URL, library picker, or upload)
  - Image Gallery (grid display below the post body)
  - Video Gallery (Vimeo URLs → click-to-play thumbnail grid + lightbox)
  - Categories and Tags as multi-select dropdowns with create-new-on-the-fly and removable badges
  - Slug, post date, and an "Edit on date" calendar
  - "View post" button to open the live page in a new tab
- **Media Library** — list all uploaded media, search, filter, drag-and-drop multi-select for inserting into posts.
- **Image upload modal** — direct file upload, automatic dimension extraction.

---

## Local development

```bash
# Clone and install
git clone https://github.com/PennQuinnDad/PennQuinncom.git
cd PennQuinncom
npm install

# Create .env (any local Postgres works; for prod values ask Eric)
cat > .env <<'ENV'
DATABASE_URL=postgresql://user:pass@localhost:5432/pennquinn
SESSION_SECRET=any-long-random-string
ADMIN_PASSWORD=whatever-you-want-locally
NODE_ENV=development
PORT=3000
ENV

# Apply schema
npm run db:push

# Start the Express server (serves API + Vite assets)
npm run dev

# OR: run the Vite dev server separately for hot reload
npm run dev:client     # vite dev on :5000 with HMR
```

`npm run dev` runs the Express server with `tsx`, so TypeScript edits hot-reload via Vite's middleware. Visit http://localhost:3000.

To log in as admin locally, go to `/admin` — the login form uses `ADMIN_PASSWORD` from your `.env`.

---

## Deployment

```bash
npm run deploy
```

That's it. The script in [`scripts/deploy.sh`](scripts/deploy.sh) does everything end-to-end: builds locally, syncs the server's git checkout, runs `npm ci` and `db:push` on the server, scp's the new `dist/` over, atomic-swaps it with the previous bundle, restarts the systemd service, and verifies both `localhost:3000` and the public URL.

If anything goes wrong, the script prints a one-line rollback command (just swaps `dist.previous` back).

For full infrastructure documentation — instance layout, paths, the swap requirement, the `DATABASE_URL` extraction quirk, and the manual fallback methods — see [DEPLOY-LIGHTSAIL.md](DEPLOY-LIGHTSAIL.md).

---

## Repository structure

```
.
├── client/                  React + Vite app
│   └── src/
│       ├── pages/           Home, Post, Admin, Login, MediaLibrary
│       ├── components/      App-level components (Header, MediaPicker, TagCombobox, …)
│       │   └── ui/          shadcn/Radix primitives (Button, Dialog, Command, …)
│       ├── lib/             posts.ts (API client), vimeo.ts, queryClient.ts, utils
│       └── hooks/           useAuth, useToast, …
├── server/                  Express app
│   ├── index.ts             Entry point (loads dotenv, starts server)
│   ├── routes.ts            All API routes
│   ├── storage.ts           Drizzle-based DB access layer
│   ├── auth/                Session + admin password auth
│   ├── db.ts                Drizzle client
│   ├── static.ts            Static asset serving (prod) / Vite middleware (dev)
│   └── migrate-data.ts      One-shot WordPress import (runs on first boot if DB empty)
├── shared/                  Code shared by client + server
│   ├── schema.ts            Drizzle table definitions + zod schemas (single source of truth)
│   └── models/auth.ts       Shared auth types
├── scripts/                 Operational scripts
│   ├── deploy.sh            One-command production deploy
│   ├── analyze-images.cjs   Reports on missing/oversized images
│   ├── create-media-table.cjs   One-time media migration
│   └── extract-video-thumbnails.cjs   Backfill thumbnails for old video posts
├── script/                  Build entry
│   └── build.ts             Builds client (Vite) + server (esbuild → dist/index.cjs)
├── _archive/                WordPress migration archives (preserved for reference)
├── DEPLOY-LIGHTSAIL.md      Infra docs (paths, supervisor, swap, secrets, deploy methods)
├── drizzle.config.ts        Drizzle Kit config (DATABASE_URL from env)
├── vite.config.ts           Vite config (output to dist/public/)
└── package.json             Scripts: dev, dev:client, build, start, check, db:push, deploy
```

---

## Database

Two tables, both defined in [`shared/schema.ts`](shared/schema.ts):

**`posts`**
- `id`, `title`, `slug` (unique), `date`, `content` (HTML), `excerpt`, `status`, `type`
- `categories` (text[]), `tags` (text[])
- `featuredImage` (single URL)
- `galleryImages` (text[]) — image gallery URLs
- `galleryVideos` (text[]) — Vimeo URLs/IDs for the click-to-play video grid

**`media`**
- `id`, `filename`, `originalName`, `url`, `mimeType`, `size`
- `width`, `height`, `uploadedAt`, `takenAt`, `alt`

There's no junction table for post-media — posts reference media by URL embedded in `content`, `featuredImage`, `galleryImages`, or `galleryVideos`.

Sessions live in a third table managed by `connect-pg-simple` (auto-created on first run).

Schema changes: edit `shared/schema.ts`, then `npm run deploy` (which calls `db:push` on the server) — Drizzle diffs the schema and applies the SQL.

---

## A note on origin

This project started in 2024 to replace an aging WordPress install. The migration preserved every URL slug, every post date, every categorization, and the entire `/uploads/` media tree. If you find a 2009 post with a broken link or a video that no longer plays, that's almost certainly a pre-migration artifact — not a bug introduced by the rewrite.

---

## License

MIT (per `package.json`). Source is open; family content is the family's.
