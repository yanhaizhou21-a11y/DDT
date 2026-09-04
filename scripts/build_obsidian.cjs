const fs = require('fs');
const path = require('path');

const obsidianDir = path.join(__dirname, '..', 'obsidian');
if (!fs.existsSync(obsidianDir)) {
  fs.mkdirSync(obsidianDir, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Project-Tracker-Visual-Analytics.md
// ─────────────────────────────────────────────────────────────────────────────
const projectTrackerMd = `# Project Tracker — Visual Analytics & Contextual Logging

## 1. Overview & Architecture

The **Project Tracker** module in DDT (Daily Dashboard Tracker) is a local-first multi-domain tracking engine designed for developers, designers, video editors, and game creators. It combines high-density activity tracking, milestone workflows, and flexible output metrics.

### Supported Domain Archetypes
1. **Software Development (\`software\`)**: Code commits, pull requests, features, bugs, refactors.
2. **Game Development (\`game_dev\`)**: Levels, mechanics, VFX/shaders, sound design, playtests.
3. **Graphic Design (\`graphic_design\`)**: Revisions, exports, branding, concepts, assets.
4. **Photography & Videography (\`video_photo\`)**: Timeline cuts, color grades, photo culls, renders.

---

## 2. Interactive Visualization Switcher

The activity dashboard includes an interactive **Segmented Radio Switcher** in the 12-Month Activity card header, allowing users to toggle between two visualization paradigms:

- **Heatmap View (\`GithubGraph\`)**:
  - Renders a 52-week Dot-Ledger / GitHub-style contribution grid with 4 discrete activity intensity tiers.
  - Features wave animation transitions, tooltip hovering, and dynamic color scaling calibrated to theme tokens (\`--ledger-blue\`, \`--card\`, \`--rule\`).

- **Charts & Bars View (\`ProjectActivityChart\`)**:
  - Dynamic time-range filtering: **30-Day Discrete Output** vs. **12-Month Monthly Rollup**.
  - Interactive hover cards reporting date, exact item volume, and active status.
  - Domain-calibrated charting archetypes:

### Domain-Calibrated Charting Archetypes

| Domain | Chart Archetype | Visual Design & Features |
|---|---|---|
| **Software & Game Dev** | \`pattern_timeline\` | **Patterned Velocity Timeline**: Features an SVG textured diagonal pattern background (\`#chart-diagonal-pattern\`), horizontal reference gridlines, cubic-bezier area fill, trajectory line with dot markers, and active day counters. Perfect for tracking engineering sprints and build velocity. |
| **Graphic Design & Video/Photo** | \`bar_squares\` | **Stacked Output Bar Graph**: Features discrete vertical column bars where daily output is represented as discrete rounded block tokens. Directly reflects physical creative deliverables (assets, revisions, graded clips, culls) produced per day. |

---

## 3. Contextual Progress Input Engine

For manual projects (non-GitHub linked), the logging card dynamically adapts to the selected project's domain, replacing generic number steppers with domain-specific quick action buttons:

### Quick Log Actions by Domain
- **Graphic Design**:
  - \`+1 Design Revision\`
  - \`+1 Asset Export\`
  - \`+1 Concept / Mockup\`
  - \`+1 Final Delivery\`
- **Video & Photography**:
  - \`+1 Clip Edited\`
  - \`+1 Photo Culled\`
  - \`+1 Color Grade\`
  - \`+1 Render / Export\`
- **Software Engineering**:
  - \`+1 Feature Shipped\`
  - \`+1 Bug Fixed\`
  - \`+1 Code Review\`
  - \`+1 Doc / Refactor\`
- **Game Development**:
  - \`+1 Level / Scene Built\`
  - \`+1 Shader / VFX Polished\`
  - \`+1 Mechanic Scripted\`
  - \`+1 Playtest Passed\`

### Contextual Note / Label Tracking
Users can attach an optional note/label to any log entry (e.g., *"Logo v2 SVG export"*, *"Cut trailer intro"*, *"Fixed physics collision bug"*).
- When a note is provided, the backend records a discrete activity entry to \`project_activity (project_id, date, count, note)\`.
- The Recent Activity feed displays these notes as distinct badges alongside date and count tokens.

---

## 4. GitHub Sync Mode

When a project is linked to a GitHub repository (\`owner/repo\`):
- Commits are fetched from GitHub's REST API and cached locally in SQLite.
- Manual logging is disabled to ensure zero duplicate activity counting.
- Latest commit message, SHA hash, author, and branch status are previewed in the card.

---

## 5. Database Schema & Data Models

### Table \`projects\`
\`\`\`sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  domain_type TEXT NOT NULL DEFAULT 'software',
  status TEXT NOT NULL DEFAULT 'in_progress',
  github_repo TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
\`\`\`

### Table \`project_activity\`
\`\`\`sql
CREATE TABLE IF NOT EXISTS project_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proj_act_pid_date ON project_activity(project_id, date);
\`\`\`
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Journal-Templates-and-Rich-Text.md
// ─────────────────────────────────────────────────────────────────────────────
const journalMd = `# Journal Templates & Rich Text Editor

## 1. Overview

The **Daily Journal** module in DDT provides a daily reflection, documentation, and drafting ledger with markdown support, autosave, and structured templates.

---

## 2. Journal Templates System

Users can open the **Templates Modal** at any time to insert structured templates:

1. **Daily Journal & Reflection (\`daily\`)**:
   - Structured morning intentions
   - Daily highlights and work output
   - Reflections and adjustments
   - Daily gratitude
2. **Email / Client Update (\`email\`)**:
   - Recipient and subject line formatting
   - Executive summary
   - Completed deliverables bullet list
   - Next steps, feedback checkboxes, and sign-off
3. **Project Progress Update (\`progress\`)**:
   - Milestone and sprint status
   - Shipped deliverables
   - Blockers and impediments
   - Priorities for tomorrow
4. **Meeting & Debrief Notes (\`meeting\`)**:
   - Topic and attendees
   - Key discussion points
   - Decisions agreed upon
   - Action items with owners and due dates

### Smart Insertion Logic
When applying a template to a date that already contains text:
- **Append to Bottom**: Inserts a thematic divider (\`---\`) and appends the template below existing notes.
- **Replace Entire Entry**: Replaces the full entry with the new template layout.

---

## 3. Typography & Styling Engine

To resolve unstyled markdown rendering caused by Tailwind Preflight resets, DDT implements custom theme-aware typography rules in \`packages/web/src/index.css\` (\`.journal-prose\`, \`.prose\`) and explicit component mappings in \`ReactMarkdown\`:

- **Headings (\`h1\`, \`h2\`, \`h3\`)**: Fraunces serif font with thematic bottom borders and calibrated letter spacing.
- **Lists (\`ul\`, \`ol\`)**: Disc bullets and decimal counters styled with \`--ledger-blue\` markers.
- **Blockquotes (\`blockquote\`)**: Thick \`--ledger-blue\` left border with paper-tint background and italic styling.
- **Code & Pre (\`code\`, \`pre\`)**: Monospace code blocks with double-bezel borders and syntax-ready container.
- **Checkboxes**: Interactive GFM task list checkboxes styled with accent color.
- **Dividers (\`hr\`)**: Subtle horizontal ledger rules.

---

## 4. Debounced Autosave Architecture

- Editor changes trigger an autosave timer (~1.2s debounce after the last keystroke).
- Status indicator transitions between:
  - \`saved\`: Green check badge
  - \`saving\`: Gold spinning indicator
  - \`unsaved\`: Error fallback state
- Instant manual save accessible via **Ctrl+S** or the header Save button.
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. System-Architecture.md
// ─────────────────────────────────────────────────────────────────────────────
const architectureMd = `# DDT (Daily Dashboard Tracker) — System Architecture

## 1. Architectural Principles

DDT is built on the following foundational tenets:
- **Local-First & Single-User**: All data lives locally on the user's machine in an embedded SQLite database (\`ddt.db\`). Zero telemetry, zero cloud lock-in.
- **Monorepo Structure**: Managed via PNPM workspaces:
  - \`packages/server\`: Express REST API, SQLite database, Drizzle ORM schema and migrations.
  - \`packages/web\`: React 18, Vite, Tailwind CSS, Motion (Framer Motion v13), React Aria Components.
  - \`packages/cli\`: Command-line tool for dashboard inspection and background tasks.
- **Thematic Consistency**: Built around an editorial financial ledger aesthetic (Fraunces serif headers, double-bezel cards, custom paper/ink CSS variables, and transitions.dev motion tokens).

---

## 2. API Endpoints Map

### Project Tracker (\`/api/projects\`)
- \`GET /api/projects\`: List all projects with aggregated today's count and total volume.
- \`POST /api/projects\`: Create a new project.
- \`GET /api/projects/:id\`: Get detailed project ledger, 12-month activity timeline, and GitHub status.
- \`PUT /api/projects/:id\`: Update project metadata (name, domain, status, GitHub repo).
- \`DELETE /api/projects/:id\`: Delete project and cascade delete all activity logs.
- \`POST /api/projects/:id/activity\`: Record discrete activity counter with optional note.
- \`DELETE /api/projects/:id/activity/:activityId\`: Remove a specific activity log entry.

### Daily Journal (\`/api/journal\`)
- \`GET /api/journal/entries\`: List past journal summaries with word counts and previews.
- \`GET /api/journal/heatmap\`: Daily activity status for date pickers and dot ledger.
- \`GET /api/journal/:date\`: Fetch full content for a specific date.
- \`PUT /api/journal/:date\`: Upsert journal content with autosave timestamp.
- \`DELETE /api/journal/:date\`: Delete entry for a specific date.

### Daily Activity Recap & Discord Webhook (\`/api/recap\`)
- \`GET /api/recap?date=YYYY-MM-DD\`: Aggregates activity across 6 modules (Projects, Journal, Nutrition, Games, Media, Kanban) and pre-computes an authentic Discord Rich Embed payload.
- \`POST /api/recap/discord\`: Validates webhook URL, dispatches rich embed to Discord via Node native \`fetch\`, handles rate limits (\`429\`), and optionally persists webhook URL in SQLite \`settings\`.
- \`GET /api/recap/settings\`: Fetches the stored Discord webhook configuration (with masked token).
- \`POST /api/recap/settings\`: Updates and stores the Discord webhook URL safely in SQLite.

---

## 3. Technology Stack Reference

- **Language**: TypeScript 5.7 (full end-to-end type safety)
- **Frontend**: React 18, Vite 6, Tailwind CSS 3.4, Motion 13, Lucide React, React Markdown, Remark GFM
- **Backend**: Node.js, Express, Drizzle ORM, better-sqlite3
- **Styling**: Theme-aware CSS variables (\`ledger\`, \`kinetic\`, \`cyberpunk\`, \`matcha\`)
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3b. Discord-Daily-Recap-Webhook.md
// ─────────────────────────────────────────────────────────────────────────────
const discordRecapMd = `# Discord Daily Activity Recap — Webhook Integration

## 1. Overview & Vision

The **Discord Daily Recap** integration allows DDT users to broadcast a comprehensive, editorial summary of their daily productivity and leisure across Discord with one click. Whether keeping an accountability channel updated or archiving personal milestones in a private server, DDT formats the entire day's output into a pixel-perfect, rich Discord Embed.

---

## 2. Multi-Module Aggregation Pipeline

When a user selects a date (defaults to today, with previous/next day and calendar jumps), DDT's backend aggregates activity across 6 core modules:

1. **Projects Tracker**:
   - Total commits or output count per active project.
   - Domain-specific units (\`commits\`, \`revisions\`, \`clips\`, \`levels\`, etc.).
   - Discrete activity notes (e.g., *"Exported trailer cut v2"*).
2. **Daily Journal**:
   - Word count & estimated reading time.
   - First 280 characters excerpt / morning intentions.
3. **Nutrition & Food**:
   - Total meals logged.
   - Calorie & macro summaries (Protein, Carbs, Fat) if tracked.
4. **Gaming & Leisure**:
   - Games played and hours spent.
   - Platform & status tags.
5. **Watchlist & Media**:
   - Movies, TV episodes, or anime watched with ratings.
6. **Kanban Tasks**:
   - Tasks completed on the selected date.

---

## 3. Discord Rich Embed Specification

The backend constructs an authentic Discord Embed adhering to Discord API v10 webhook specifications:

\`\`\`json
{
  "username": "DDT Daily Journal",
  "avatar_url": "https://raw.githubusercontent.com/yanhaizhou21-a11y/DDT/main/assets/ddt-icon.png",
  "embeds": [
    {
      "title": "📋 DDT Activity Recap — Friday, Sep 4, 2026",
      "description": "Daily productivity & leisure dispatch from DDT Ledger.\\n\\n> 💡 *\\"Shipped project tracker charts and refined morning writing.*\\"",
      "color": 3098712,
      "fields": [
        {
          "name": "🚀 Projects & Output (2 active)",
          "value": "• **Botani Seed Website**: 5 commits (*\"Implemented bar chart toggles\"*)\\n• **Brand Identity**: 3 revisions",
          "inline": false
        },
        {
          "name": "📓 Daily Journal",
          "value": "• **Words**: 482 words (~2 min read)\\n• **Preview**: *Focus was sharp today after early workout...*",
          "inline": true
        },
        {
          "name": "🍱 Nutrition & Calories",
          "value": "• **Meals**: 3 logged\\n• **Total**: 2,150 kcal",
          "inline": true
        }
      ],
      "footer": {
        "text": "DDT • Daily Dashboard Tracker • Local-first Ledger",
        "icon_url": "https://raw.githubusercontent.com/yanhaizhou21-a11y/DDT/main/assets/ddt-icon.png"
      },
      "timestamp": "2026-09-04T14:30:00.000Z"
    }
  ]
}
\`\`\`

- **Embed Color**: Integer \`3098712\` (\`0x2F4858\`), perfectly matching DDT's Financial Ledger blue accent.
- **Custom Quote Note**: If the user inputs an optional intro quote or note, it is rendered in Discord markdown blockquote format (\`> 💡 ...\`).

---

## 4. Frontend Discord Chat Simulation

To deliver an exceptional developer and user experience (\`/impeccable\`), the \`DiscordRecapModal\` features an authentic Discord Dark Mode interface:
- Background: \`#313338\` with message hover highlight \`#2b2d31\`.
- Identity: Bot avatar, bold username \`DDT Daily Journal\`, and blurple \`BOT\` badge (\`#5865F2\`).
- Embed Container: Left vertical colored border (\`#2F4858\`), dark embed card background (\`#2B2D31\`), and title link.
- Field Layout: 2-column inline grid for compact metrics, full-width fields for rich multi-item lists.
- Interactive Toolbar: Date picker, previous/next day buttons, custom intro note input, copy payload JSON button, and dispatch button with live loading & status states.

---

## 5. Security & Privacy Safeguards

- **Local Storage**: Webhook URLs can be securely persisted in DDT's local SQLite \`settings\` table without cloud transmission.
- **Masked Token Presentation**: The UI masks sensitive webhook tokens (\`https://discord.com/api/webhooks/123456789/••••••••\`) with an unmask toggle.
- **Strict Protocol Validation**: Only official Discord webhook domains are permitted (\`discord.com/api/webhooks\` or \`discordapp.com/api/webhooks\`).
- **Zero Third-Party SDKs**: Uses Node.js native \`fetch\` per the \`/ponytail\` standard for maximum efficiency and zero dependency bloat.
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. DDT-Architecture.canvas
// ─────────────────────────────────────────────────────────────────────────────
const ddtArchitectureCanvas = {
  nodes: [
    {
      id: "node-header",
      type: "text",
      text: "# DDT (Daily Dashboard Tracker)\n## System Architecture Overview\n*Local-first personal ledger with multi-domain tracking & rich markdown journaling*",
      x: 350,
      y: -180,
      width: 580,
      height: 120,
      color: "5"
    },
    {
      id: "node-frontend",
      type: "text",
      text: "### 🖥️ Frontend Web App (`packages/web`)\n- **Framework:** React 18 + Vite + TypeScript\n- **Styling:** Tailwind CSS + Theme-aware CSS Variables\n- **Motion:** Framer Motion (Motion v13)\n- **Components:** React Aria Components & Lucide React\n- **State/Routing:** Local React state, custom tab router",
      x: 20,
      y: 0,
      width: 380,
      height: 250,
      color: "4"
    },
    {
      id: "node-projects-module",
      type: "text",
      text: "### 🚀 Project Tracker Module\n- **Multi-Domain:** Software, Game Dev, Design, Photo/Video\n- **Visualization:** Heatmap (`GithubGraph`) & Charts (`ProjectActivityChart`)\n- **Contextual Logging:** Domain-specific quick actions (`+1 Revision`, `+1 Clip`, etc.)\n- **Activity Notes:** Discrete note & label logging\n- **GitHub Integration:** Commit syncing and caching",
      x: 440,
      y: 0,
      width: 400,
      height: 250,
      color: "5"
    },
    {
      id: "node-journal-module",
      type: "text",
      text: "### 📓 Daily Journal Module\n- **Editor:** Markdown with Split/Write/Preview modes\n- **Autosave:** Debounced autosave (~1.2s)\n- **Templates:** Daily Reflection, Email Draft, Progress Update, Meeting Notes\n- **Smart Insertion:** Append to Bottom vs Replace\n- **Typography:** Fully styled `.journal-prose` & custom ReactMarkdown elements",
      x: 880,
      y: 0,
      width: 380,
      height: 250,
      color: "3"
    },
    {
      id: "node-backend",
      type: "text",
      text: "### ⚙️ Backend API Server (`packages/server`)\n- **Runtime:** Node.js + Express\n- **Binding:** Localhost only (`127.0.0.1:4000`)\n- **Routes:**\n  - `/api/projects`: CRUD, activity logging, GitHub sync\n  - `/api/journal`: Entries list, date fetch, autosave\n  - `/api/food`, `/api/games`, `/api/watchlist`, `/api/kanban`",
      x: 230,
      y: 330,
      width: 420,
      height: 260,
      color: "2"
    },
    {
      id: "node-database",
      type: "text",
      text: "### 💾 SQLite Embedded Database (`ddt.db`)\n- **ORM:** Drizzle ORM (`better-sqlite3`)\n- **Tables:**\n  - `projects` & `project_activity` (with `note` column)\n  - `journal_entries`\n  - `food_logs`, `games`, `watchlist`, `kanban_cards`\n- **Migrations:** Embedded SQLite `ALTER TABLE` migrations on startup",
      x: 720,
      y: 330,
      width: 420,
      height: 260,
      color: "1"
    },
    {
      id: "node-cli",
      type: "text",
      text: "### 💻 CLI (`packages/cli`)\n- Direct terminal commands for DDT inspection\n- Database stats and management",
      x: 20,
      y: 330,
      width: 170,
      height: 180,
      color: "6"
    },
    {
      id: "node-discord",
      type: "text",
      text: "### 💬 Discord Webhook Recap (`/api/recap`)\n- **Daily Aggregator:** Projects, Journal, Food, Games, Media, Kanban\n- **Live Discord Preview:** Pixel-perfect `#313338` chat simulation\n- **Embed Payload:** Rich embed with color `0x2F4858`, custom quote & activity badges\n- **Security:** Masked SQLite token storage, zero client leaks",
      x: 1200,
      y: 330,
      width: 400,
      height: 260,
      color: "3"
    },
    {
      id: "node-external",
      type: "text",
      text: "### 🌐 External Services & APIs\n- **GitHub API:** Fetches live repository commits\n- **Discord API:** Webhook POST dispatches (`discord.com/api/webhooks`)\n- **Local Filesystem:** `data/ddt.db` SQLite storage",
      x: 470,
      y: 670,
      width: 420,
      height: 150,
      color: "6"
    }
  ],
  edges: [
    {
      id: "edge-web-to-projects",
      fromNode: "node-frontend",
      fromSide: "right",
      toNode: "node-projects-module",
      toSide: "left",
      label: "Renders"
    },
    {
      id: "edge-web-to-journal",
      fromNode: "node-frontend",
      fromSide: "right",
      toNode: "node-journal-module",
      toSide: "left",
      label: "Renders"
    },
    {
      id: "edge-projects-to-backend",
      fromNode: "node-projects-module",
      fromSide: "bottom",
      toNode: "node-backend",
      toSide: "top",
      label: "/api/projects"
    },
    {
      id: "edge-journal-to-backend",
      fromNode: "node-journal-module",
      fromSide: "bottom",
      toNode: "node-backend",
      toSide: "top",
      label: "/api/journal"
    },
    {
      id: "edge-cli-to-backend",
      fromNode: "node-cli",
      fromSide: "right",
      toNode: "node-backend",
      toSide: "left",
      label: "Commands"
    },
    {
      id: "edge-backend-to-db",
      fromNode: "node-backend",
      fromSide: "right",
      toNode: "node-database",
      toSide: "left",
      label: "Drizzle Queries"
    },
    {
      id: "edge-backend-to-discord",
      fromNode: "node-backend",
      fromSide: "right",
      toNode: "node-discord",
      toSide: "left",
      label: "Dispatches Recap"
    },
    {
      id: "edge-backend-to-external",
      fromNode: "node-backend",
      fromSide: "bottom",
      toNode: "node-external",
      toSide: "top",
      label: "External APIs"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Project-Tracker-Workflow.canvas
// ─────────────────────────────────────────────────────────────────────────────
const projectWorkflowCanvas = {
  nodes: [
    {
      id: "node-step1",
      type: "text",
      text: "### 1. Select Project & Domain\n- Super-header or Project Grid Card\n- Domain Detection:\n  - 💻 `software`\n  - 🎮 `game_dev`\n  - 🎨 `graphic_design`\n  - 🎬 `video_photo`",
      x: 0,
      y: 0,
      width: 320,
      height: 200,
      color: "5"
    },
    {
      id: "node-step2",
      type: "text",
      text: "### 2. Visualization Switcher\n- Segmented Radio Toggle:\n  - 🟩 **Heatmap:** 52-week Dot-Ledger grid\n  - 📊 **Charts & Bars:** Domain-calibrated SVG chart",
      x: 400,
      y: -100,
      width: 350,
      height: 200,
      color: "3"
    },
    {
      id: "node-step3-heatmap",
      type: "text",
      text: "### 3a. Heatmap Mode (`GithubGraph`)\n- 12-month rolling contribution calendar\n- 4 discrete intensity tiers\n- Wave animation with tooltip inspection",
      x: 830,
      y: -220,
      width: 360,
      height: 180,
      color: "4"
    },
    {
      id: "node-step3-chart",
      type: "text",
      text: "### 3b. Charts Mode (`ProjectActivityChart`)\n- **Software & Game Dev:** Diagonal patterned timeline curve with milestone gridlines\n- **Graphic Design & Video/Photo:** Discrete `BarSquares` column bars\n- Range toggle: 30-Day discrete vs 12-Month rollup",
      x: 830,
      y: 0,
      width: 400,
      height: 220,
      color: "4"
    },
    {
      id: "node-step4-input",
      type: "text",
      text: "### 4. Output Logging Engine\n- Checks if GitHub repo is linked:\n  - **Linked:** Displays live commit stream, disables manual log\n  - **Unlinked:** Activates domain contextual logger",
      x: 400,
      y: 300,
      width: 350,
      height: 200,
      color: "2"
    },
    {
      id: "node-step5-contextual",
      type: "text",
      text: "### 5. Contextual Actions & Notes\n- Quick buttons (e.g. `+1 Design Revision`, `+1 Clip Edited`)\n- Custom count stepper\n- Optional note input (e.g. *\"Logo v2 SVG export\"*)\n- Instant feedback toast notice",
      x: 830,
      y: 300,
      width: 380,
      height: 220,
      color: "1"
    },
    {
      id: "node-step6-persistence",
      type: "text",
      text: "### 6. SQLite Persistence (`project_activity`)\n- `POST /api/projects/:id/activity`\n- Saves count, date, and `note` column\n- Auto-aggregates daily metrics & updates cached totals",
      x: 400,
      y: 600,
      width: 350,
      height: 200,
      color: "6"
    },
    {
      id: "node-step7-recent",
      type: "text",
      text: "### 7. Recent Activity Ledger\n- Chronological log of recent discrete entries\n- Displays note chips alongside counters\n- One-click deletion with immediate recalculation",
      x: 0,
      y: 400,
      width: 320,
      height: 220,
      color: "5"
    }
  ],
  edges: [
    {
      id: "edge-1-to-2",
      fromNode: "node-step1",
      fromSide: "right",
      toNode: "node-step2",
      toSide: "left",
      label: "Select View"
    },
    {
      id: "edge-2-to-3a",
      fromNode: "node-step2",
      fromSide: "top",
      toNode: "node-step3-heatmap",
      toSide: "left",
      label: "Heatmap"
    },
    {
      id: "edge-2-to-3b",
      fromNode: "node-step2",
      fromSide: "right",
      toNode: "node-step3-chart",
      toSide: "left",
      label: "Charts & Bars"
    },
    {
      id: "edge-1-to-4",
      fromNode: "node-step1",
      fromSide: "bottom",
      toNode: "node-step4-input",
      toSide: "left",
      label: "Log Output"
    },
    {
      id: "edge-4-to-5",
      fromNode: "node-step4",
      fromSide: "right",
      toNode: "node-step5-contextual",
      toSide: "left",
      label: "User Input"
    },
    {
      id: "edge-5-to-6",
      fromNode: "node-step5-contextual",
      fromSide: "bottom",
      toNode: "node-step6-persistence",
      toSide: "right",
      label: "API Save"
    },
    {
      id: "edge-6-to-7",
      fromNode: "node-step6-persistence",
      fromSide: "left",
      toNode: "node-step7-recent",
      toSide: "bottom",
      label: "Updates Feed"
    },
    {
      id: "edge-7-to-1",
      fromNode: "node-step7-recent",
      fromSide: "top",
      toNode: "node-step1",
      toSide: "bottom",
      label: "Updates Totals"
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Write All Files
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(obsidianDir, 'Project-Tracker-Visual-Analytics.md'), projectTrackerMd, 'utf8');
fs.writeFileSync(path.join(obsidianDir, 'Journal-Templates-and-Rich-Text.md'), journalMd, 'utf8');
fs.writeFileSync(path.join(obsidianDir, 'Discord-Daily-Recap-Webhook.md'), discordRecapMd, 'utf8');
fs.writeFileSync(path.join(obsidianDir, 'System-Architecture.md'), architectureMd, 'utf8');
fs.writeFileSync(path.join(obsidianDir, 'DDT-Architecture.canvas'), JSON.stringify(ddtArchitectureCanvas, null, 2), 'utf8');
fs.writeFileSync(path.join(obsidianDir, 'Project-Tracker-Workflow.canvas'), JSON.stringify(projectWorkflowCanvas, null, 2), 'utf8');

console.log('Successfully generated all Obsidian documentation and canvas files!');
