# design.md — DDT visual & interaction design

**Audience:** AI coding agent implementing the frontend. Follow this as the source of truth for tokens, layout, and voice. Do not default to generic dashboard templates (cream+terracotta, near-black+neon-accent, or broadsheet-hairline layouts) — this brief has its own direction below.

---

## 1. Design thesis

DDT is a **personal ledger**, not a corporate analytics dashboard. The subject is one person's own record of their day — commits, a page they're watching, what they ate, what they played. The visual language should feel like a **field notebook / logbook kept by someone who takes their own tracking seriously but not solemnly** — closer to a well-kept paper trail than a SaaS admin panel. Quiet, legible, a little warm, data-dense without being cold.

---

## 2. Token system

**Color** (light mode is default; the app is used most at day's-end review, so it should stay comfortable, not glaring):

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F6F4EE` | app background — warm off-white, not stark white |
| `--ink` | `#232019` | primary text — warm near-black, not pure #000 |
| `--ink-soft` | `#6B6455` | secondary text, timestamps, meta |
| `--ledger-blue` | `#2F4858` | primary accent — deep ink-blue, used for links, active states, the heatmap's darkest cell |
| `--stamp-red` | `#A83A34` | single sparing accent — overdue items, "due in theater" badges, delete actions. Used rarely; this is the one warm risk color, not a background wash |
| `--rule` | `#DDD7C7` | hairline dividers, card borders |
| `--card` | `#FFFDF8` | card surfaces, slightly lifted off `--paper` |

Dark mode (v1.1, not blocking): invert paper/ink, keep `--ledger-blue` and `--stamp-red` roughly as-is, darken `--card`.

**Type:**
- Display / section headers: **Fraunces** (a warm, slightly irregular serif with real personality — used at restraint, section titles only, not body text)
- Body + UI: **Inter** — legible at small sizes for a data-dense dashboard
- Data / monospace (commit hashes, hours, dates in the heatmap tooltip, journal word count): **JetBrains Mono**

Type scale: 12 / 14 / 16 / 20 / 28 / 40px. Section headers at 20–28px in Fraunces, everything else Inter, all tabular/numeric data in JetBrains Mono to visually distinguish "logged facts" from "written words" — this distinction is a deliberate device, not decoration (see §4 in the signature element).

**Layout:**
- Left rail navigation (fixed, ~72px collapsed / 220px expanded on hover or toggle) — module icons + labels: Home, Dev, Projects, Watchlist, Kanban, Journal, Food, Games, Settings.
- Main content area: max-width ~1100px, centered, generous vertical rhythm (24px base spacing unit).
- Cards use 1px `--rule` borders, **no drop shadows** — this is a paper-and-ink aesthetic, not a floating-glass one. Corner radius: 4px (sharp-ish, notebook-like, not pill-shaped).

ASCII layout concept for Dashboard Home:

```
┌──┬─────────────────────────────────────────────┐
│  │  Today — Mon, Aug 24                          │
│N │  ┌───────────────┐ ┌───────────────────────┐  │
│A │  │ GitHub square  │ │ Journal (write today) │  │
│V │  │ today's commit │ │ [quick textarea]       │  │
│  │  └───────────────┘ └───────────────────────┘  │
│  │  ┌──────────────┐ ┌───────────┐ ┌───────────┐ │
│  │  │ Next 2 cards │ │ In theater│ │ Quick log │ │
│  │  │ due          │ │ this week │ │ food/game │ │
│  │  └──────────────┘ └───────────┘ └───────────┘ │
└──┴─────────────────────────────────────────────┘
```

---

## 3. Signature element: the dot-ledger

The GitHub contribution heatmap is the most characteristic artifact in this whole product — so instead of confining it to the Dev module, **its visual grammar (a grid of small squares, shaded by intensity) becomes the app's recurring motif**, reused with different meanings per module:

- Dev module: commits per day (as normal)
- Journal: a filled square = wrote an entry that day, empty = skipped
- Food log: square intensity = number of items logged that day
- Game log: square intensity = hours played that day
- Project Tracker: square intensity = commits that day (repo-linked projects) or logged activity count that day (manual projects) — same component as the Dev module's heatmap, just scoped to one project

Each module's page header includes a small inline strip of this dot-grid for the last ~30 days, using `--ledger-blue` at varying opacity. This is the one place the design "repeats itself on purpose" — it's the thread that makes the app feel like one ledger with several sections, not five unrelated tools bolted together. Do not add this pattern anywhere else in the UI (nav icons, buttons, etc.) — restraint is what makes it read as a signature rather than a texture.

---

## 4. Component notes

- **Kanban cards:** `--card` surface, `--rule` border, tag shown as a small colored dot (not a full pill background — keep it quiet), due date in JetBrains Mono, red (`--stamp-red`) only if overdue.
- **Watchlist cards:** poster left-aligned, title in Inter, "In theaters" badge only appears if a real release date exists and is upcoming — never fabricate a badge.
- **Heatmap tooltip:** monospace date + count, `--ink` on `--card`, appears on hover, no shadow — a 1px border is enough separation from the page.
- **Project status badge:** small pill-free label (text + a dot, matching the tag style on kanban cards, not a filled background) — `--ink-soft` for "Just Started," `--ledger-blue` for "In Progress," and `--ledger-blue` at full opacity with a filled dot for "Ready to Deploy/Deliver/Ship." Never use `--stamp-red` here — that color stays reserved for overdue/destructive states per §2, not for a normal "not started yet" status.
- **Empty states:** every module needs one (no commits yet, no journal entry today, empty kanban). Write these in the interface's own voice per §5 below — never a cartoon illustration, keep it to a short line of text + the relevant action button. This fits the ledger tone: an empty page in a notebook, not a "no results" API-error look.

---

## 5. Copy voice

- Active voice, plain verbs, sentence case. "Write today's entry," not "Submit journal."
- Buttons name the exact result: "Add card," "Log meal," "Connect GitHub" — never "Submit" or "OK."
- Errors state what happened and what to do, without apologizing: "GitHub token rejected — check it has `repo` read access." not "Oops, something went wrong!"
- Empty states are an invitation, not a complaint: "No entry yet today." + a "Write now" button — not "You haven't written anything :(".

---

## 6. Accessibility & quality floor

- Responsive down to a single-column mobile layout (nav collapses to a bottom bar).
- Visible keyboard focus rings using `--ledger-blue`, 2px offset outline — never remove `:focus` outlines without replacing them.
- Respect `prefers-reduced-motion` — the dot-ledger grid can have a subtle fade-in on load, nothing more, and it should be skipped entirely under reduced motion.
- Minimum contrast: body text (`--ink` on `--paper`) exceeds WCAG AA; verify `--ink-soft` on `--paper` also clears AA for small text before shipping.
