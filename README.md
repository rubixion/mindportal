# MindPortal

A focus companion for Chrome (Manifest V3). It adds an in-page panel for notes, lists, a calendar, habits, and saved pages, and it tracks focus time, warns you on distracting sites, and keeps streaks. Ollie the owl rewards momentum rather than punishing slip-ups.

The extension lives in [`MindPortal/`](MindPortal/).

## Features

| Feature | What it does |
|---|---|
| **In-page panel** | Open it from the floating Ollie button, **Alt+M**, or the toolbar popup. It has tabs for Today, Notes, Lists, Agenda (calendar), Habits, Saved, Sites, and Settings. |
| **Quick capture** | Right-click to save a text selection to Notes, or a link or page to Saved. Calendar events with a time get a notification reminder. |
| **Time tracking** | Counts time on productive, unproductive, and neutral sites, and pauses when the computer is idle. It resets at midnight. |
| **Site warnings** | Shows a full-page overlay when you open an unproductive site. There are three modes: Countdown (a 5-second pause), Warn Only, and Hard Block. |
| **Focus mode and Pomodoro** | Focus mode blocks unproductive sites for a set time. The Pomodoro timer runs 25/5/15-minute cycles in the background with Chrome Alarms, and the toolbar badge shows the countdown. |
| **XP** | Each focus block earns 1 XP per minute (blocks under 5 minutes earn nothing), and 1.5× if you finish the block. |
| **Goals and streaks** | Set a daily productive target (default 120 min) and an unproductive cap (default 30 min). Meeting the goal extends your streak, with a one-day grace period. |
| **Break reminders** | Sends a notification after a set number of minutes of continuous productive work. |
| **Analytics** | The options page has Chart.js bar, pie, and line charts, plus a 90-day streak calendar. |

## Install

```bash
cd MindPortal
npm install
npm run build
```

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked** and select `MindPortal/dist/`

## Development

```bash
npm run dev        # rebuild on save
npm run build      # production build into dist/
npm test           # Vitest unit tests
npm run lint       # ESLint
npm run format     # Prettier
```

## Project structure

```
MindPortal/
├── manifest.json            MV3 manifest
├── src/
│   ├── background/          service worker: tab tracking, alarms, streaks, Pomodoro, context menus
│   ├── content/             content script and the warning overlay
│   ├── panel/               the in-page React panel (tabs/, components/)
│   ├── popup/               toolbar popup
│   ├── options/             settings page and analytics charts
│   └── shared/              types, storage wrappers, defaults, scoring and XP helpers
├── tests/                   Vitest tests (scoring, XP, habits, events, utils)
└── scripts/generate-icons.js
```

## Daily score

`score = (productiveMin / goalMin) × 70 + (1 − unproductiveMin / capMin) × 30`

The score is clamped to 0–100 and shown on the badge. It's green at 70 or above, orange at 40 or above, and red below 40.

## Default site lists

- **Productive:** github.com, docs.google.com, notion.so, stackoverflow.com, coursera.org, leetcode.com, figma.com, and more
- **Unproductive:** youtube.com, reddit.com, x.com, instagram.com, tiktok.com, netflix.com, twitch.tv, and more

You can edit both lists in the **Sites** tab.

## Data and privacy

Everything is stored locally in `chrome.storage.local`, and nothing is sent to a server. The options page can export a JSON backup or reset all data.
