# PRD — DDT (Daily Dashboard Tracker)

**Audience for this doc:** AI coding agents (Claude Code or similar) implementing this project. Every section is written to be actionable without further clarification. If something is ambiguous, the agent should default to the "Decision" called out inline rather than asking.

---

## 1. Product summary

DDT is a **local-first, single-user, self-hosted personal dashboard**. It runs on `localhost` only, has no multi-user auth, no cloud sync, and no telemetry. It is installed and launched via `npx ddt` or `npm i -g ddt && ddt`, which boots a local server and opens the browser to it. All data lives in a single SQLite file on the user's machine.

**Non-goals (explicitly out of scope for v1):**
- Multi-user accounts, login, or auth of any kind
- Cloud hosting, sync across devices, or a hosted SaaS version
- Mobile app (responsive web is enough)
- Real-time collaboration
- Notifications/reminders (v2 candidate)

---

## 2. Modules

### 2.1 Dev Tracker (GitHub)
- User pastes a **GitHub Personal Access Token** (fine-grained, scopes: `repo` read, `read:user`) into Settings. See §5 for key handling.
- Fetch and display a **contribution heatmap** (GitHub-style calendar, last 12 months) via GitHub's GraphQL `contributionsCollection` query.
- List of repos with recent commit activity (REST v3, per-repo commit list), showing: repo name, last commit message, last commit time, commit count in period.
- Manual refresh button + background refresh on app load, capped by a cache TTL (see §6).
- **Acceptance:** heatmap renders correctly for a real token within 3s on cached data, <10s cold; invalid/missing token shows a clear inline error, not a crash.

### 2.2 Watchlist (movies/shows)
- Search TMDB for a title, add it to one of three lists: **Watching / Want to watch / Watched**.
- If the title has an upcoming theatrical release date, show a **due-date badge** ("In theaters Sep 12") and sort "Want to watch" by soonest release date first.
- Show poster art (from TMDB) on every list card.
- User can also add a title manually with no TMDB match (freeform entry, no poster).
- **Acceptance:** adding a title from search populates poster + release date automatically; manual entries work with just a title.

### 2.3 Kanban / Todo
- Default columns: `Backlog`, `In Progress`, `Done` — user can rename/add/remove columns.
- Cards: title, optional description, optional due date, optional tag/color.
- Drag-and-drop reordering within and across columns (dnd-kit).
- This is the general-purpose "work" board — not GitHub-specific.
- **Acceptance:** drag-and-drop persists new column/order to DB immediately (optimistic UI + write-through).

### 2.4 Daily Journal
- One entry per calendar day, markdown text area, autosave (debounced, ~1.5s after last keystroke).
- Calendar/list view to jump to past entries; today's entry always accessible from the dashboard home.
- **Acceptance:** navigating away and back preserves unsaved-but-debounced text; no data loss on autosave failure (show a "not saved" indicator if the write fails).

### 2.5 Food Log
- Manual entries: item name, meal tag (breakfast/lunch/dinner/snack), "eaten" vs "want to eat" state, timestamp.
- Simple daily list view, grouped by meal tag.
- No nutrition API in v1 (Open Food Facts integration is a v2 candidate, flagged in §8).
- **Acceptance:** can log an item in under 3 clicks/taps from the dashboard home.

### 2.6 Game Log
- Manual entries: game name, hours played, date. Optional cover art via RAWG API (user's own free RAWG key, same pattern as GitHub/TMDB keys).
- Daily/weekly summary: total hours, top game this week.
- **Acceptance:** entering hours updates the weekly summary chart without a page reload.

### 2.7 Dashboard Home
- Single landing page aggregating: today's GitHub contribution square, today's journal entry (or prompt to write one), next 2 kanban cards due, upcoming theater releases (next 7 days), today's food/game log quick-add.
- This is the "single pane of glass" view — everything else lives behind its own tab/route.

---

## 3. API key handling (per user decision)

**Decision: no backend-managed secrets, no `.env` file editing required from the user.** All third-party API keys (GitHub PAT, TMDB key, RAWG key) are entered by the user directly in the app's **Settings** screen, at first-run or any time after.

- Keys are stored in the local SQLite DB, in a dedicated `settings` table, **never in plaintext logs**, never sent anywhere except directly to the respective third-party API (GitHub/TMDB/RAWG) from the local backend process.
- Backend acts as a thin proxy for these calls (so the key never has to touch the browser's network tab / is not exposed client-side), but the key itself originates from and is edited by the user, not baked into the package.
- Each integration is **optional and independently toggleable** — the app must be fully usable (kanban, journal, food, game log) with zero API keys configured. Missing-key state shows a "Connect GitHub" / "Connect TMDB" card instead of the widget, not an error.
- No key is ever bundled, defaulted, or fetched from a remote config. If a key is invalid, the specific integration shows a scoped error; it never crashes the rest of the dashboard.

---

## 4. Data model (SQLite, via Drizzle ORM)

Suggested tables — agent should refine column types but keep these entities:

| Table | Key columns |
|---|---|
| `settings` | key (text, pk), value (text) — stores API keys, theme, column config |
| `journal_entries` | date (text, pk, YYYY-MM-DD), content (text markdown), updated_at |
| `kanban_columns` | id, name, position |
| `kanban_cards` | id, column_id (fk), title, description, due_date, tag, position |
| `watchlist_items` | id, title, tmdb_id (nullable), poster_path (nullable), status (watching/want/watched), release_date (nullable) |
| `food_entries` | id, item_name, meal_tag, status (eaten/want), logged_at |
| `game_entries` | id, game_name, hours, cover_url (nullable), logged_at |
| `github_cache` | key (text, pk — e.g. "contributions:2026"), payload (json text), fetched_at |

---

## 5. Non-functional requirements

- **Local-only binding:** server binds to `127.0.0.1`, never `0.0.0.0`. No requirement, ever, to expose this on a LAN/internet in v1.
- **Zero required external services:** app boots and is usable with zero configuration beyond `npx ddt`.
- **Startup time:** cold start (first run, DB migration) under 5s on a typical laptop.
- **Data portability:** the SQLite file location must be documented and easy to back up (e.g. `~/.ddt/data.db`), and ideally a "Export all data as JSON" button in Settings.
- **No telemetry, no analytics, no external calls except the user's own configured API keys.**

---

## 6. Caching strategy

- Third-party API responses (GitHub contributions, TMDB search/details) cached in SQLite with a `fetched_at` timestamp.
- Default TTLs: GitHub contributions 1 hour, GitHub repo list 15 min, TMDB search results 24h (release dates don't change minute-to-minute).
- Manual "Refresh" action in the UI bypasses cache.
- No Redis, no external cache layer — SQLite is enough at this scale.

---

## 7. Distribution

- Published to npm as `ddt`, with `bin: { "ddt": "./dist/cli.js" }`.
- `npx ddt` and `npm i -g ddt && ddt` must both work with identical behavior.
- CLI responsibilities: run pending DB migrations → start local server → open default browser to `http://localhost:<port>` (default port with fallback if occupied).
- Source repo remains clonable/buildable independently for contributors (`pnpm install && pnpm dev`).

---

## 8. Build phases (suggested order for the coding agent)

1. **Scaffold:** monorepo (pnpm workspaces), CLI entry point that boots an empty server + empty React shell, confirm `npx`-style local run works end to end before building any feature.
2. **Core data layer:** SQLite + Drizzle schema + migrations for all tables in §4.
3. **Kanban + Journal + Food + Game log** (no external APIs — validates the full stack works with zero integrations).
4. **Settings screen + key storage** (§3), including the "integration not configured" empty states.
5. **GitHub integration** (heatmap + repo list).
6. **TMDB integration** (search, watchlist, theater due-dates).
7. **RAWG integration** (optional cover art for game log).
8. **Dashboard home** aggregation view (last, since it depends on every other module existing).
9. **v2 candidates (not built now, just noted):** Open Food Facts nutrition lookup, notifications/reminders, data export/import polish, dark/light theme toggle.

---

## 9. Acceptance summary (definition of done for v1)

- `npx ddt` on a clean machine results in a working dashboard in under 60 seconds, no manual config file editing.
- All 6 modules function fully offline/without any API key configured, except the 3 features that are inherently third-party-data-dependent (heatmap, poster art, cover art) — those degrade to a "connect" prompt, not a crash.
- No data leaves the machine except direct calls to GitHub/TMDB/RAWG using the user's own keys.
