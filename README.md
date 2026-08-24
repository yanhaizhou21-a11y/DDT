# DDT — Daily Dashboard Tracker

> **A local-first, single-user, self-hosted personal ledger dashboard.**  
> Runs on `127.0.0.1`, zero cloud dependencies, zero telemetry, all data stored in a single SQLite database on your machine.

---

## ✨ Features & Modules

- 📊 **Dashboard Home:** "Single pane of glass" aggregating today's GitHub contribution square, quick journal writing with autosave, next 2 due kanban cards, upcoming in-theater releases (next 7 days), and quick food/game log shortcuts.
- 🐙 **Dev Tracker (GitHub):** 12-month GitHub GraphQL contribution heatmap with hover tooltips in JetBrains Mono, recent repositories commit feed, and background cache TTL.
- 🎬 **Watchlist:** Search TMDB for movies/shows, organize by Watching / Want to Watch / Watched, automatic theatrical release due badges (`In theaters Sep 12`), and manual entries without TMDB.
- 📋 **Kanban / Todo:** Drag-and-drop task board (`@dnd-kit`) with customizable columns, quiet colored dot tags, monospace due dates with overdue risk badges, and optimistic write-through persistence.
- 📖 **Daily Journal:** Calendar/list view for past entries, live split markdown preview, debounced autosave (~1.5s), save indicator, and monospace word count.
- 🍽️ **Food Log:** Daily meal log grouped by Breakfast, Lunch, Dinner, Snack, eaten vs want toggle, and 30-day dot ledger activity strip.
- 🎮 **Game Log:** Playtime hours tracker with optional RAWG cover art search, all-time and weekly playtime summaries, and top-game-of-the-week highlight.
- ⚙️ **Settings & Portability:** In-app API key manager for GitHub PAT, TMDB, and RAWG with live connection testing, full JSON export & import, and database location display.

---

## 🎨 Visual System & Field Notebook Aesthetic

DDT is designed as a **quiet personal ledger / field logbook**:
- **Palette:** `--paper` (`#F6F4EE`), `--ink` (`#232019`), `--ink-soft` (`#6B6455`), `--ledger-blue` (`#2F4858`), `--stamp-red` (`#A83A34`), `--rule` (`#DDD7C7`), `--card` (`#FFFDF8`).
- **Typography:** **Fraunces** for section titles, **Inter** for UI text, **JetBrains Mono** for numbers, word counts, and dates.
- **Motif:** 30-day **Dot-Ledger** sequential intensity strip embedded in module headers.
- **Surfaces:** 1px hairline borders, 4px corner radius, zero drop shadows.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- pnpm (or npm)

### Installation & Build

```bash
# Install all dependencies across workspaces
pnpm install

# Build all packages (server, web, CLI)
pnpm build
```

### Running Locally

```bash
# Launch via CLI binary (starts server on 127.0.0.1 & opens default browser)
pnpm start

# Or launch development servers:
pnpm dev:server   # Backend API on http://127.0.0.1:3001
pnpm dev:web      # Frontend on http://127.0.0.1:3000
```

---

## 📦 Project Architecture

```
c:\di\DDT\
├── packages/
│   ├── server/      # Express + SQLite (@libsql/client + Drizzle ORM) + API proxies & caching
│   ├── web/         # React 18/19 SPA + Vite + Tailwind CSS + Lucide + @dnd-kit + ReactMarkdown
│   └── cli/         # Standalone executable CLI binary (`bin: { "ddt": "./dist/cli.js" }`)
├── package.json     # Root pnpm workspaces configuration
├── pnpm-workspace.yaml
├── DDT-PRD.md       # Product Requirements Document
├── DDT-design.md    # Design System & Token Specifications
└── README.md
```

---

## 🔒 Privacy & Data Location

- **SQLite Database:** Stored locally at `~/.ddt/data.db` (or custom path via `DDT_DB_PATH` or `--db`).
- **No Cloud Telemetry:** No user tracking, no analytics, no external services required.
- **Third-Party Keys:** GitHub, TMDB, and RAWG keys are stored in the local SQLite database and only used to query the respective APIs from your local machine.
