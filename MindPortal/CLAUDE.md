# MindPortal — notes for Claude

Chrome MV3 focus extension. Features and install steps: [README.md](README.md). Users, brand voice, design principles: [PRODUCT.md](PRODUCT.md) (calm, encouraging, no guilt; Ollie the owl is the mascot).

## Build & check

- `npm run build`: two Vite builds into `dist/` (load `dist/` unpacked at `chrome://extensions`, then reload after every build).
  - `vite.config.mts`: service worker, popup, options (ES modules).
  - `vite.content.config.mts`: content script as one IIFE (content scripts can't be modules), bundles React and the panel.
- `npx tsc --noEmit -p .`: the only errors should be the pre-existing ones in `tests/` (vitest `expect` typing). Filter with `| grep "^src"`.
- `npx vitest run`: unit tests for the pure logic in `src/shared`.
- `npm run icons`: re-renders `src/assets/logo.svg` (`logo-small.svg` for 16px) into `src/assets/icons/*.png` via headless Chrome. **Not** part of the build; the PNGs are kept in the repo. The old generator painted a purple square, so never bring that back.
- Not a git repo.

## Layout

- `src/background/service-worker.ts`: time tracking, pomodoro/focus alarms, badge, notifications, context menus. `handleMessage` handles `{type}` messages (`START_POMODORO`, `STOP_POMODORO`, `GET_STORAGE`, `TOGGLE_PANEL`, ...). `GET_ZOOM` is handled in the listener itself because it needs `sender.tab`. `tabs.onZoomChange` pushes `MP_ZOOM` to the tab.
- `src/content/content-script.ts`: full-screen warning/block overlay for distracting sites (plain DOM). It also mounts the React overlay.
- `src/content/overlay.tsx`: floating owl button (FAB) and the **focus bar** (`FabCard`) next to it, inside a shadow root. It also mounts the in-page `Panel`.
- `src/panel/`: the in-page panel. Tabs are in `tabs/` (Today, Notes, Lists, Agenda/calendar, Habits, Saved, Sites, Settings). `components/ui/` holds 21st.dev/shadcn components.
- `src/popup/popup.tsx`: the small toolbar popup.
- `src/shared/`: types, defaults, storage helpers, pure utils (scoring, XP, dates, recurring events).

## State

- Everything is in `chrome.storage.local`. In React, use `useStored(key, fallback)` from `src/panel/lib/utils.ts`. It syncs across tabs and returns `[value, set, loaded]`.
  - **Gotcha:** until `loaded` is true, the value is the fallback. Gate UI that would flash on it (the FAB waits for pos/scale/collapsed; `FabCard` waits for settings + `neutralSites` before showing the warning and mark buttons).
- Keys: `settings`, `session`, `dailyData` (keyed by **UTC** `toDateString()`), `streak`, `pet`, `xp`, `level`, `notesV2`, `lists`, `events`, `habits`, `saved`, `neutralSites`, and these FAB keys:
  - `fabPos`: in FAB units, see Zoom below
  - `fabScale`: 0.6–1.8
  - `fabCollapsed`
  - `fabHiddenSites`: keyed by `location.hostname`, so it includes `www.`
- Site categories: `settings.productiveSites` / `settings.unproductiveSites`. Anything else is neutral. `neutralSites` only records "user explicitly said neutral", so the focus bar stops asking. The Sites tab's Neutral button does not write it yet.
- Time is flushed by the service worker on tab change and on a ~30s alarm. The focus bar interpolates unsaved seconds client-side (capped at 60s) so its counters tick live.

## Floating owl / focus bar

- Bar: a 52px-tall pill, the same height as the owl. It holds the pomodoro start/stop and countdown, live Focused/Distracted, the distracting-site warning (text only) and "Mark this site" (Distracting/Focus/Neutral). It flips to whichever side of the owl has room.
- It collapses with a chevron into an owl-only state, and a small navy tab on the owl's side expands it. `FabCard` stays mounted while collapsed (hidden with inline `display:none`) so expanding doesn't flash.
- Hover the owl to see two controls:
  - top-left **X**: hides the owl on this site. It can be restored from the popup ("Show floating button on …") or from the Settings tab.
  - top-right **resize grip**: drag up/down to change the size.
- **Zoom:** the FAB gets `zoom: 1/pageZoom`, so Ctrl +/- doesn't change its size or position. Motion's drag is corrected with `MotionConfig transformPagePoint` (page px × zoom). The full Panel still scales with page zoom.

## Conventions

- **UI components come from 21st.dev only** (user rule; use the `21st` MCP). Composing the existing `components/ui/*` is fine. Don't invent new visual components without asking.
- Palette (`src/panel/styles.css`):
  - near-black backgrounds
  - `--ollie-cyan` rgb(100,130,210) as the accent
  - FAB/bar surface `#15172b` with a `--ollie-cyan/30` border
  - amber `#f5a623` for the beak
  - **No purple.** `font-sans` (Inter) must be set explicitly inside the shadow root.
- Tailwind v4 inside a shadow DOM: `shadowCss()` in `overlay.tsx` converts rem to px and inlines `@property` initials. Avoid conflicting display utilities (`hidden` + `flex`); use an inline style.
- The user prefers minimal diffs (ponytail style) and `ponytail:` comments for deliberate shortcuts.
