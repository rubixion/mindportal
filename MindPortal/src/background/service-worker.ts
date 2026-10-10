import {
  getStorage,
  saveSession,
  saveStreak,
  saveDayRecord,
  getTodayRecord,
  savePetState,
  awardXP,
  addIntentionRecord,
  addToDelayQueue,
  clearDelayQueue,
} from "../shared/storage";
import {
  toDateString,
  extractDomain,
  categorizeDomain,
  computeScore,
  areConsecutiveDays,
  focusXP,
} from "../shared/utils";
import { nextReminder, timeRange } from "../shared/events";
import type { ActiveSession, CalEvent, DayRecord, Note, SavedPage, StreakData } from "../shared/types";

// Alarm names
const ALARM_TICK = "mp_tick";
const ALARM_MIDNIGHT = "mp_midnight";
const ALARM_BREAK_REMINDER = "mp_break_reminder";
const ALARM_POMODORO = "mp_pomodoro";
const ALARM_FOCUS_MODE = "mp_focus_mode";
const ALARM_EVENT = "mp_event_";

// ─── Overlay panel: toggle, calendar reminders, quick capture ────────────────

/** Toggles the in-page panel, injecting the content script first into tabs opened before install. */
async function togglePanel(tabId?: number): Promise<boolean> {
  if (tabId === undefined) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tabId = tab?.id;
  }
  if (tabId === undefined) return false;
  try {
    await chrome.tabs.sendMessage(tabId, { type: "MP_TOGGLE_PANEL" });
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content/content-script.js"] });
      await chrome.tabs.sendMessage(tabId, { type: "MP_TOGGLE_PANEL" });
      return true;
    } catch {
      return false; // chrome:// pages, the Web Store, etc.
    }
  }
}

/** One alarm per future event that has a time and a reminder. */
async function syncEventAlarms() {
  const { events } = await chrome.storage.local.get("events");
  const existing = (await chrome.alarms.getAll()).filter((a) => a.name.startsWith(ALARM_EVENT));
  await Promise.all(existing.map((a) => chrome.alarms.clear(a.name)));
  // one alarm per event: its next reminder (repeating events reschedule after each one fires)
  for (const e of (events as CalEvent[] | undefined) ?? []) {
    const when = nextReminder(e, Date.now());
    if (when) chrome.alarms.create(ALARM_EVENT + e.id, { when });
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes["events"]) void syncEventAlarms();
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-panel") void togglePanel(tab?.id);
});

const newId = () => crypto.randomUUID();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "mp_save_selection" && info.selectionText) {
    const { notesV2 } = await chrome.storage.local.get("notesV2");
    const note: Note = {
      id: newId(),
      title: `Clip: ${tab?.title ?? "web page"}`.slice(0, 120),
      body: info.selectionText,
      pinned: false,
      updated: Date.now(),
      ...(tab?.url ? { url: tab.url } : {}),
    };
    await chrome.storage.local.set({ notesV2: [note, ...((notesV2 as Note[] | undefined) ?? [])] });
  } else if (info.menuItemId === "mp_save_link" || info.menuItemId === "mp_save_page") {
    const url = info.menuItemId === "mp_save_link" ? info.linkUrl : (info.pageUrl ?? tab?.url);
    if (!url) return;
    const title = info.menuItemId === "mp_save_link" ? (info.selectionText ?? url) : (tab?.title ?? url);
    const { saved } = await chrome.storage.local.get("saved");
    const list = (saved as SavedPage[] | undefined) ?? [];
    if (!list.some((p) => p.url === url)) {
      await chrome.storage.local.set({ saved: [{ id: newId(), title, url, added: Date.now() }, ...list] });
    }
  }
});

// ─── Install / Startup ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (_details) => {
  await setupAlarms();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "mp_save_selection", title: "Save selection to MindPortal notes", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "mp_save_link", title: "Save link to MindPortal", contexts: ["link"] });
    chrome.contextMenus.create({ id: "mp_save_page", title: "Save page to MindPortal", contexts: ["page"] });
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await setupAlarms();
  await checkMidnightReset();
});

async function setupAlarms() {
  await chrome.alarms.clearAll();
  await syncEventAlarms();

  // Tick every 10 seconds to flush accumulated time
  chrome.alarms.create(ALARM_TICK, { periodInMinutes: 10 / 60 });

  // Midnight reset — fires at next midnight
  scheduleMidnightAlarm();
}

function scheduleMidnightAlarm() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 5, 0); // 00:00:05 next day
  chrome.alarms.create(ALARM_MIDNIGHT, { when: midnight.getTime() });
}

// ─── Tab Tracking ─────────────────────────────────────────────────────────────

let trackingDomain: string | null = null;
let trackingStart: number | null = null;

async function getCurrentActiveDomain(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.url) return null;
    const url = tab.url;
    if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:")) {
      return null;
    }
    return extractDomain(url);
  } catch {
    return null;
  }
}

async function flushCurrentDomain(now: number) {
  if (!trackingDomain || !trackingStart) return;
  const elapsed = Math.floor((now - trackingStart) / 1000);
  if (elapsed <= 0) return;

  const { settings, session, dailyData } = await getStorage();

  // Check if focus mode has expired
  if (session.focusModeActive && session.focusModeEndTime && now > session.focusModeEndTime) {
    await deactivateFocusMode();
  }

  const today = toDateString();
  const record: DayRecord = dailyData[today] ?? {
    date: today,
    productiveSeconds: 0,
    unproductiveSeconds: 0,
    neutralSeconds: 0,
    siteBreakdown: {},
    pomodoroSessionsCompleted: 0,
    goalMet: false,
    score: 0,
  };

  const category = categorizeDomain(trackingDomain, settings);
  if (category === "productive") {
    record.productiveSeconds += elapsed;
  } else if (category === "unproductive") {
    record.unproductiveSeconds += elapsed;
  } else {
    record.neutralSeconds += elapsed;
  }

  // Update site breakdown
  record.siteBreakdown[trackingDomain] = (record.siteBreakdown[trackingDomain] ?? 0) + elapsed;

  // Recompute score and goal
  record.score = computeScore(
    record.productiveSeconds,
    record.unproductiveSeconds,
    settings.dailyGoalMinutes,
    settings.unproductiveCapMinutes
  );
  record.goalMet =
    record.productiveSeconds >= settings.dailyGoalMinutes * 60 &&
    record.unproductiveSeconds <= settings.unproductiveCapMinutes * 60;

  await saveDayRecord(record);
  await updateBadge(record.score);
  await checkBreakReminder(now, settings.breakReminderMinutes, category);
}

async function updateBadge(score: number) {
  const { session } = await getStorage();
  if (session.pomodoroActive && session.pomodoroEndTime) {
    const remaining = Math.max(0, Math.ceil((session.pomodoroEndTime - Date.now()) / 1000));
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const label = m > 0 ? `${m}m` : `${s}s`;
    await chrome.action.setBadgeText({ text: label });
    await chrome.action.setBadgeBackgroundColor({ color: session.pomodoroIsBreak ? "#4ade80" : "#6982d8" });
  } else if (session.focusModeActive) {
    await chrome.action.setBadgeText({ text: "🔒" });
    await chrome.action.setBadgeBackgroundColor({ color: "#f87171" });
  } else {
    const label = score > 0 ? `${score}` : "";
    await chrome.action.setBadgeText({ text: label });
    const color = score >= 70 ? "#4ade80" : score >= 40 ? "#fb923c" : "#f87171";
    await chrome.action.setBadgeBackgroundColor({ color });
  }
}

async function checkBreakReminder(
  now: number,
  breakReminderMinutes: number,
  currentCategory: string
) {
  if (breakReminderMinutes <= 0 || currentCategory !== "productive") return;
  const { session } = await getStorage();
  const elapsed = (now - session.lastBreakTime) / 1000 / 60;
  if (elapsed >= breakReminderMinutes) {
    chrome.notifications.create("break_reminder", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
      title: "Time for a break!",
      message: `You've been focused for ${Math.round(elapsed)} minutes. Step away for a few minutes.`,
    });
    const updatedSession: ActiveSession = { ...session, lastBreakTime: now };
    await saveSession(updatedSession);
  }
}

// ─── Tab / Window Event Listeners ─────────────────────────────────────────────

async function onTabChange() {
  const now = Date.now();
  await flushCurrentDomain(now);
  const domain = await getCurrentActiveDomain();
  trackingDomain = domain;
  trackingStart = domain ? now : null;

  // Persist to session
  const { session } = await getStorage();
  await saveSession({ ...session, currentDomain: domain, domainStartTime: domain ? now : null });
}

chrome.tabs.onActivated.addListener(onTabChange);
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo) => {
  if (changeInfo.status === "complete") await onTabChange();
});
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    const now = Date.now();
    await flushCurrentDomain(now);
    trackingDomain = null;
    trackingStart = null;
  } else {
    await onTabChange();
  }
});

// ─── Alarm Handler ────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const now = Date.now();

  if (alarm.name === ALARM_TICK) {
    await flushCurrentDomain(now);
    if (trackingDomain) trackingStart = now;
    await updateBadge(0);
  }

  if (alarm.name === ALARM_MIDNIGHT) {
    await checkMidnightReset();
    scheduleMidnightAlarm();
  }

  if (alarm.name === ALARM_POMODORO) {
    await handlePomodoroEnd();
  }

  if (alarm.name === ALARM_FOCUS_MODE) {
    await deactivateFocusMode();
  }

  if (alarm.name.startsWith(ALARM_EVENT)) {
    const { events } = await chrome.storage.local.get("events");
    const ev = ((events as CalEvent[] | undefined) ?? []).find((e) => ALARM_EVENT + e.id === alarm.name);
    if (ev) {
      const before = ev.remindBefore ?? 0;
      const lead = !ev.time ? (before >= 1440 ? "Tomorrow" : "Today") : before === 0 ? "Starting now" : before >= 1440 ? "Tomorrow" : before >= 60 ? `In ${before / 60} hour${before > 60 ? "s" : ""}` : `In ${before} minutes`;
      chrome.notifications.create(`${alarm.name}_${Date.now()}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
        title: ev.title,
        message: `${lead} · ${timeRange(ev)}${ev.location ? ` · ${ev.location}` : ""}`,
      });
    }
    await syncEventAlarms(); // schedule the next repeat
  }

  if (alarm.name === ALARM_BREAK_REMINDER) {
    // Handled inline in checkBreakReminder
  }
});

// ─── Midnight Reset / Streak Update ───────────────────────────────────────────

async function checkMidnightReset() {
  const today = toDateString();
  const { streak, dailyData, settings } = await getStorage();
  const yesterday = toDateString(new Date(Date.now() - 86_400_000));

  const yesterdayRecord = dailyData[yesterday];
  if (!yesterdayRecord) return;

  const newStreak: StreakData = { ...streak };

  if (yesterdayRecord.goalMet) {
    if (areConsecutiveDays(streak.lastProductiveDate, yesterday) || streak.lastProductiveDate === "") {
      newStreak.current = streak.current + 1;
    } else if (
      settings.gracePeriodEnabled &&
      areConsecutiveDays(streak.lastProductiveDate, toDateString(new Date(Date.now() - 172_800_000)))
    ) {
      newStreak.current = streak.current + 1;
    } else {
      newStreak.current = 1;
    }
    newStreak.lastProductiveDate = yesterday;
    newStreak.longest = Math.max(newStreak.current, streak.longest);
  } else {
    if (!settings.gracePeriodEnabled || streak.current === 0) {
      newStreak.current = 0;
    }
  }

  await saveStreak(newStreak);

  if (!dailyData[today]) {
    await saveDayRecord({
      date: today,
      productiveSeconds: 0,
      unproductiveSeconds: 0,
      neutralSeconds: 0,
      siteBreakdown: {},
      pomodoroSessionsCompleted: 0,
      goalMet: false,
      score: 0,
    });
  }
}

// ─── Pomodoro ─────────────────────────────────────────────────────────────────

/** Pays XP for the work minutes of the current pomodoro so far. Returns the updated session. */
async function creditPomodoro(session: ActiveSession, now = Date.now()): Promise<ActiveSession> {
  if (!session.pomodoroActive || session.pomodoroIsBreak || !session.pomodoroStartTime || !session.pomodoroEndTime) return session;
  const xp = focusXP(session.pomodoroStartTime, now, session.pomodoroEndTime, session.xpCreditedUntil);
  if (xp > 0) await awardXP(xp);
  return { ...session, xpCreditedUntil: Math.max(session.xpCreditedUntil, Math.min(now, session.pomodoroEndTime)) };
}

/** Pays XP for the focus-mode minutes so far. Returns the updated session. */
async function creditFocus(session: ActiveSession, now = Date.now()): Promise<{ session: ActiveSession; xp: number }> {
  if (!session.focusModeActive || !session.focusModeStartTime || !session.focusModeEndTime) return { session, xp: 0 };
  const xp = focusXP(session.focusModeStartTime, now, session.focusModeEndTime, session.xpCreditedUntil);
  if (xp > 0) await awardXP(xp);
  return { session: { ...session, xpCreditedUntil: Math.max(session.xpCreditedUntil, Math.min(now, session.focusModeEndTime)) }, xp };
}

async function handlePomodoroEnd(skipped = false) {
  const storage = await getStorage();
  const settings = storage.settings;
  let session = storage.session;
  const record = await getTodayRecord(settings);

  if (session.pomodoroIsBreak) {
    chrome.notifications.create("pomodoro_work_start", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
      title: "Break over — time to focus!",
      message: "Your break is done. Start your next Pomodoro session.",
    });
    const updatedSession: ActiveSession = { ...session, pomodoroActive: false, pomodoroEndTime: null };
    await saveSession(updatedSession);
  } else {
    // skipping a work block early still pays for the minutes worked, but doesn't count as a finished pomodoro
    const finished = !skipped || (session.pomodoroEndTime !== null && Date.now() >= session.pomodoroEndTime - 1_000);
    session = await creditPomodoro(session);
    const newSessionCount = session.pomodoroSessionCount + (finished ? 1 : 0);
    const isLongBreak = newSessionCount % 4 === 0;
    const breakMinutes = isLongBreak
      ? settings.pomodoroLongBreakMinutes
      : settings.pomodoroShortBreakMinutes;

    if (finished) {
      record.pomodoroSessionsCompleted += 1;
      await saveDayRecord(record);
    }

    chrome.notifications.create("pomodoro_break_start", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
      title: isLongBreak ? "Great work! Long break time." : "Session complete! Take a short break.",
      message: `${isLongBreak ? "Long" : "Short"} break: ${breakMinutes} minutes. You've completed ${newSessionCount} session${newSessionCount !== 1 ? "s" : ""} today.`,
    });

    const endTime = Date.now() + breakMinutes * 60 * 1000;
    const updatedSession: ActiveSession = {
      ...session,
      pomodoroActive: true,
      pomodoroEndTime: endTime,
      pomodoroStartTime: null,
      pomodoroIsBreak: true,
      pomodoroSessionCount: newSessionCount,
      lastBreakTime: Date.now(),
    };
    await saveSession(updatedSession);
    chrome.alarms.create(ALARM_POMODORO, { when: endTime });
  }
}

// ─── Message Handlers (from popup / content) ─────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // the overlay cancels out page zoom so the floating button keeps its size and spot
  if (message?.type === "GET_ZOOM") {
    if (sender.tab?.id === undefined) return false;
    chrome.tabs.getZoom(sender.tab.id).then(sendResponse, () => sendResponse(1));
    return true;
  }
  handleMessage(message).then(sendResponse).catch((err) => {
    console.error("MindPortal message error:", err);
    sendResponse({ error: String(err) });
  });
  return true; // async response
});

chrome.tabs.onZoomChange.addListener(({ tabId, newZoomFactor }) => {
  chrome.tabs.sendMessage(tabId, { type: "MP_ZOOM", zoom: newZoomFactor }).catch(() => {});
});

async function handleMessage(message: Record<string, unknown>): Promise<unknown> {
  const { type } = message;

  if (type === "START_POMODORO") {
    const storage = await getStorage();
    const settings = storage.settings;
    // restarting mid-block pays for what was done so far, then starts fresh
    const session = await creditPomodoro(storage.session);
    const minutes = (message["minutes"] as number | undefined) ?? settings.pomodoroWorkMinutes;
    const workMs = minutes * 60 * 1000;
    const now = Date.now();
    const endTime = now + workMs;
    await chrome.alarms.clear(ALARM_POMODORO);
    chrome.alarms.create(ALARM_POMODORO, { when: endTime });
    await saveSession({
      ...session,
      pomodoroActive: true,
      pomodoroStartTime: now,
      pomodoroEndTime: endTime,
      pomodoroIsBreak: false,
    });
    return { ok: true };
  }

  if (type === "PAUSE_POMODORO") {
    const session = await creditPomodoro((await getStorage()).session);
    await chrome.alarms.clear(ALARM_POMODORO);
    await saveSession({ ...session, pomodoroActive: false, pomodoroEndTime: null, pomodoroStartTime: null });
    return { ok: true };
  }

  if (type === "SKIP_POMODORO") {
    await chrome.alarms.clear(ALARM_POMODORO);
    await handlePomodoroEnd(true);
    return { ok: true };
  }

  if (type === "STOP_POMODORO") {
    const session = await creditPomodoro((await getStorage()).session);
    await chrome.alarms.clear(ALARM_POMODORO);
    await saveSession({
      ...session,
      pomodoroActive: false,
      pomodoroStartTime: null,
      pomodoroEndTime: null,
      pomodoroIsBreak: false,
      pomodoroSessionCount: 0,
    });
    return { ok: true };
  }

  if (type === "ACTIVATE_FOCUS_MODE") {
    const storage = await getStorage();
    const settings = storage.settings;
    const { session } = await creditFocus(storage.session);
    const minutes = (message["minutes"] as number | undefined) ?? settings.focusModeDefaultMinutes;
    const intention = (message["intention"] as string | undefined) ?? "";
    const now = Date.now();
    const endTime = now + minutes * 60 * 1000;
    await chrome.alarms.clear(ALARM_FOCUS_MODE);
    chrome.alarms.create(ALARM_FOCUS_MODE, { when: endTime });
    await saveSession({ ...session, focusModeActive: true, focusModeStartTime: now, focusModeEndTime: endTime, intention });
    if (intention) {
      await addIntentionRecord({
        text: intention,
        date: toDateString(),
        startTime: Date.now(),
      });
    }
    return { ok: true };
  }

  if (type === "DEACTIVATE_FOCUS_MODE") {
    await deactivateFocusMode();
    return { ok: true };
  }

  if (type === "DISMISS_SITE_TODAY") {
    const { addDismissedSite } = await import("../shared/storage");
    await addDismissedSite(message["domain"] as string);
    return { ok: true };
  }

  if (type === "TOGGLE_PANEL") {
    return { ok: await togglePanel() };
  }

  if (type === "OPEN_OPTIONS") {
    await chrome.runtime.openOptionsPage();
    return { ok: true };
  }

  if (type === "GET_STORAGE") {
    return getStorage();
  }

  if (type === "TAB_CHANGED") {
    await onTabChange();
    return { ok: true };
  }

  if (type === "FEED_PET") {
    const storage = await getStorage();
    const today = toDateString();
    const todayRecord = storage.dailyData[today];
    const productiveSecs = todayRecord?.productiveSeconds ?? 0;

    if (storage.pet.lastFedDate === today) {
      return { ok: false, reason: "already_fed" };
    }
    if (productiveSecs < 20 * 60) {
      return { ok: false, reason: "not_enough_work", needed: 20 - Math.floor(productiveSecs / 60) };
    }

    const newPet = {
      lastFedDate: today,
      totalFeedCount: storage.pet.totalFeedCount + 1,
    };
    await savePetState(newPet);
    await awardXP(10);
    return { ok: true, pet: newPet };
  }

  if (type === "SAVE_SETTINGS") {
    const { saveSettings } = await import("../shared/storage");
    await saveSettings(message["settings"] as import("../shared/types").Settings);
    return { ok: true };
  }

  if (type === "SET_INTENTION") {
    const { session } = await getStorage();
    const intention = (message["intention"] as string | undefined) ?? "";
    await saveSession({ ...session, intention });
    return { ok: true };
  }

  if (type === "ADD_DELAY_QUEUE") {
    const domain = message["domain"] as string;
    await addToDelayQueue(domain);
    return { ok: true };
  }

  if (type === "CLEAR_DELAY_QUEUE") {
    await clearDelayQueue();
    return { ok: true };
  }

  return { error: "Unknown message type" };
}

async function deactivateFocusMode() {
  const storage = await getStorage();
  const { delayQueue } = storage;
  await chrome.alarms.clear(ALARM_FOCUS_MODE);
  if (!storage.session.focusModeActive) return; // already ended (alarm and tick can both get here)
  // XP from the minutes actually focused, not a flat reward per session
  const { session, xp } = await creditFocus(storage.session);
  await saveSession({ ...session, focusModeActive: false, focusModeStartTime: null, focusModeEndTime: null, intention: "" });

  // Open any queued sites the user flagged during focus
  if (delayQueue.length > 0) {
    for (const domain of delayQueue) {
      await chrome.tabs.create({ url: `https://${domain}`, active: false });
    }
    await clearDelayQueue();
  }

  chrome.notifications.create("focus_mode_end", {
    type: "basic",
    iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
    title: xp > 0 ? `Focus session complete. +${xp} XP` : "Focus session ended.",
    message: (session.intention ? `You were working on: ${session.intention}. ` : "Distracting sites are unblocked. ") +
      (xp > 0 ? "" : "Sessions under 5 minutes don't earn XP."),
  });
}
