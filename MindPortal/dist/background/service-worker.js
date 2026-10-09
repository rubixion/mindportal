import { D as DEFAULT_PET, a as DEFAULT_SESSION, b as DEFAULT_STREAK, c as DEFAULT_SETTINGS, t as toDateString, d as areConsecutiveDays, e as categorizeDomain, f as computeScore, g as focusXP, h as extractDomain } from "../chunks/utils-BqUuQEoT.js";
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
async function getStorage() {
  const raw = await chrome.storage.local.get([
    "settings",
    "dailyData",
    "streak",
    "session",
    "dismissedToday",
    "lastDismissedDate",
    "pet",
    "xp",
    "level",
    "intentionHistory",
    "delayQueue"
  ]);
  return {
    settings: { ...DEFAULT_SETTINGS, ...raw["settings"] },
    dailyData: raw["dailyData"] ?? {},
    streak: { ...DEFAULT_STREAK, ...raw["streak"] },
    session: { ...DEFAULT_SESSION, ...raw["session"] },
    dismissedToday: raw["dismissedToday"] ?? [],
    lastDismissedDate: raw["lastDismissedDate"] ?? "",
    pet: { ...DEFAULT_PET, ...raw["pet"] },
    xp: raw["xp"] ?? 0,
    level: raw["level"] ?? 1,
    intentionHistory: raw["intentionHistory"] ?? [],
    delayQueue: raw["delayQueue"] ?? []
  };
}
async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}
async function saveSession(session) {
  await chrome.storage.local.set({ session });
}
async function saveStreak(streak) {
  await chrome.storage.local.set({ streak });
}
async function saveDayRecord(record) {
  const { dailyData } = await chrome.storage.local.get("dailyData");
  const existing = dailyData ?? {};
  existing[record.date] = record;
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = toDateString(cutoff);
  for (const key of Object.keys(existing)) {
    if (key < cutoffStr) delete existing[key];
  }
  await chrome.storage.local.set({ dailyData: existing });
}
async function getTodayRecord(_settings) {
  const today = toDateString();
  const { dailyData } = await chrome.storage.local.get("dailyData");
  const existing = dailyData ?? {};
  return existing[today] ?? {
    date: today,
    productiveSeconds: 0,
    unproductiveSeconds: 0,
    neutralSeconds: 0,
    siteBreakdown: {},
    pomodoroSessionsCompleted: 0,
    goalMet: false,
    score: 0
  };
}
async function addDismissedSite(domain) {
  const today = toDateString();
  const raw = await chrome.storage.local.get(["dismissedToday", "lastDismissedDate"]);
  const lastDate = raw["lastDismissedDate"] ?? "";
  let dismissed = raw["dismissedToday"] ?? [];
  if (lastDate !== today) dismissed = [];
  if (!dismissed.includes(domain)) dismissed.push(domain);
  await chrome.storage.local.set({ dismissedToday: dismissed, lastDismissedDate: today });
}
async function savePetState(pet) {
  await chrome.storage.local.set({ pet });
}
async function awardXP(amount) {
  const raw = await chrome.storage.local.get(["xp", "level"]);
  let xp = (raw["xp"] ?? 0) + Math.max(0, Math.floor(amount));
  const startLevel = raw["level"] ?? 1;
  let level = startLevel;
  while (xp >= level * 100) {
    xp -= level * 100;
    level++;
  }
  await chrome.storage.local.set({ xp, level });
  return { xp, level, leveledUp: level > startLevel };
}
async function addIntentionRecord(record) {
  const raw = await chrome.storage.local.get("intentionHistory");
  const history = raw["intentionHistory"] ?? [];
  history.unshift(record);
  if (history.length > 50) history.splice(50);
  await chrome.storage.local.set({ intentionHistory: history });
}
async function addToDelayQueue(domain) {
  const raw = await chrome.storage.local.get("delayQueue");
  const queue = raw["delayQueue"] ?? [];
  if (!queue.includes(domain)) queue.push(domain);
  await chrome.storage.local.set({ delayQueue: queue });
}
async function clearDelayQueue() {
  await chrome.storage.local.set({ delayQueue: [] });
}
const storage = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  addDismissedSite,
  addIntentionRecord,
  addToDelayQueue,
  awardXP,
  clearDelayQueue,
  getStorage,
  getTodayRecord,
  saveDayRecord,
  savePetState,
  saveSession,
  saveSettings,
  saveStreak
}, Symbol.toStringTag, { value: "Module" }));
function localDate(d = /* @__PURE__ */ new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseLocalDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(key, n) {
  const d = parseLocalDate(key);
  d.setDate(d.getDate() + n);
  return localDate(d);
}
function at(key, time) {
  const d = parseLocalDate(key);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
function occursOn(e, key) {
  if (key < e.date) return false;
  const repeat = e.repeat ?? "none";
  if (repeat === "none") return key === e.date;
  if (repeat === "daily") return true;
  const d = parseLocalDate(key);
  const start = parseLocalDate(e.date);
  switch (repeat) {
    case "weekdays":
      return d.getDay() >= 1 && d.getDay() <= 5;
    case "weekly":
      return d.getDay() === start.getDay();
    case "monthly":
      return d.getDate() === start.getDate();
    case "yearly":
      return d.getMonth() === start.getMonth() && d.getDate() === start.getDate();
  }
}
function nextOccurrence(e, fromKey) {
  let key = fromKey < e.date ? e.date : fromKey;
  if ((e.repeat ?? "none") === "none") return key === e.date ? key : null;
  for (let i = 0; i < 1500; i++, key = addDays(key, 1)) if (occursOn(e, key)) return key;
  return null;
}
const ALL_DAY_REMINDER_TIME = "09:00";
function nextReminder(e, now) {
  if (!e.remind) return null;
  const base = e.time || ALL_DAY_REMINDER_TIME;
  const before = Math.max(0, e.remindBefore ?? 0) * 6e4;
  let key = nextOccurrence(e, localDate(new Date(now - 864e5)));
  for (let i = 0; i < 5 && key; i++) {
    const when = at(key, base) - before;
    if (when > now) return when;
    key = nextOccurrence(e, addDays(key, 1));
  }
  return null;
}
function timeLabel(time) {
  if (!time) return "All day";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
function timeRange(e) {
  if (!e.time) return "All day";
  return e.endTime ? `${timeLabel(e.time)} – ${timeLabel(e.endTime)}` : timeLabel(e.time);
}
const ALARM_TICK = "mp_tick";
const ALARM_MIDNIGHT = "mp_midnight";
const ALARM_BREAK_REMINDER = "mp_break_reminder";
const ALARM_POMODORO = "mp_pomodoro";
const ALARM_FOCUS_MODE = "mp_focus_mode";
const ALARM_EVENT = "mp_event_";
async function togglePanel(tabId) {
  if (tabId === void 0) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tabId = tab?.id;
  }
  if (tabId === void 0) return false;
  try {
    await chrome.tabs.sendMessage(tabId, { type: "MP_TOGGLE_PANEL" });
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content/content-script.js"] });
      await chrome.tabs.sendMessage(tabId, { type: "MP_TOGGLE_PANEL" });
      return true;
    } catch {
      return false;
    }
  }
}
async function syncEventAlarms() {
  const { events } = await chrome.storage.local.get("events");
  const existing = (await chrome.alarms.getAll()).filter((a) => a.name.startsWith(ALARM_EVENT));
  await Promise.all(existing.map((a) => chrome.alarms.clear(a.name)));
  for (const e of events ?? []) {
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
    const note = {
      id: newId(),
      title: `Clip: ${tab?.title ?? "web page"}`.slice(0, 120),
      body: info.selectionText,
      pinned: false,
      updated: Date.now(),
      ...tab?.url ? { url: tab.url } : {}
    };
    await chrome.storage.local.set({ notesV2: [note, ...notesV2 ?? []] });
  } else if (info.menuItemId === "mp_save_link" || info.menuItemId === "mp_save_page") {
    const url = info.menuItemId === "mp_save_link" ? info.linkUrl : info.pageUrl ?? tab?.url;
    if (!url) return;
    const title = info.menuItemId === "mp_save_link" ? info.selectionText ?? url : tab?.title ?? url;
    const { saved } = await chrome.storage.local.get("saved");
    const list = saved ?? [];
    if (!list.some((p) => p.url === url)) {
      await chrome.storage.local.set({ saved: [{ id: newId(), title, url, added: Date.now() }, ...list] });
    }
  }
});
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
  chrome.alarms.create(ALARM_TICK, { periodInMinutes: 10 / 60 });
  scheduleMidnightAlarm();
}
function scheduleMidnightAlarm() {
  const now = /* @__PURE__ */ new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 5, 0);
  chrome.alarms.create(ALARM_MIDNIGHT, { when: midnight.getTime() });
}
let trackingDomain = null;
let trackingStart = null;
async function getCurrentActiveDomain() {
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
async function flushCurrentDomain(now) {
  if (!trackingDomain || !trackingStart) return;
  const elapsed = Math.floor((now - trackingStart) / 1e3);
  if (elapsed <= 0) return;
  const { settings, session, dailyData } = await getStorage();
  if (session.focusModeActive && session.focusModeEndTime && now > session.focusModeEndTime) {
    await deactivateFocusMode();
  }
  const today = toDateString();
  const record = dailyData[today] ?? {
    date: today,
    productiveSeconds: 0,
    unproductiveSeconds: 0,
    neutralSeconds: 0,
    siteBreakdown: {},
    pomodoroSessionsCompleted: 0,
    goalMet: false,
    score: 0
  };
  const category = categorizeDomain(trackingDomain, settings);
  if (category === "productive") {
    record.productiveSeconds += elapsed;
  } else if (category === "unproductive") {
    record.unproductiveSeconds += elapsed;
  } else {
    record.neutralSeconds += elapsed;
  }
  record.siteBreakdown[trackingDomain] = (record.siteBreakdown[trackingDomain] ?? 0) + elapsed;
  record.score = computeScore(
    record.productiveSeconds,
    record.unproductiveSeconds,
    settings.dailyGoalMinutes,
    settings.unproductiveCapMinutes
  );
  record.goalMet = record.productiveSeconds >= settings.dailyGoalMinutes * 60 && record.unproductiveSeconds <= settings.unproductiveCapMinutes * 60;
  await saveDayRecord(record);
  await updateBadge(record.score);
  await checkBreakReminder(now, settings.breakReminderMinutes, category);
}
async function updateBadge(score) {
  const { session } = await getStorage();
  if (session.pomodoroActive && session.pomodoroEndTime) {
    const remaining = Math.max(0, Math.ceil((session.pomodoroEndTime - Date.now()) / 1e3));
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
async function checkBreakReminder(now, breakReminderMinutes, currentCategory) {
  if (breakReminderMinutes <= 0 || currentCategory !== "productive") return;
  const { session } = await getStorage();
  const elapsed = (now - session.lastBreakTime) / 1e3 / 60;
  if (elapsed >= breakReminderMinutes) {
    chrome.notifications.create("break_reminder", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
      title: "Time for a break!",
      message: `You've been focused for ${Math.round(elapsed)} minutes. Step away for a few minutes.`
    });
    const updatedSession = { ...session, lastBreakTime: now };
    await saveSession(updatedSession);
  }
}
async function onTabChange() {
  const now = Date.now();
  await flushCurrentDomain(now);
  const domain = await getCurrentActiveDomain();
  trackingDomain = domain;
  trackingStart = domain ? now : null;
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
    const ev = (events ?? []).find((e) => ALARM_EVENT + e.id === alarm.name);
    if (ev) {
      const before = ev.remindBefore ?? 0;
      const lead = !ev.time ? before >= 1440 ? "Tomorrow" : "Today" : before === 0 ? "Starting now" : before >= 1440 ? "Tomorrow" : before >= 60 ? `In ${before / 60} hour${before > 60 ? "s" : ""}` : `In ${before} minutes`;
      chrome.notifications.create(`${alarm.name}_${Date.now()}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
        title: ev.title,
        message: `${lead} · ${timeRange(ev)}${ev.location ? ` · ${ev.location}` : ""}`
      });
    }
    await syncEventAlarms();
  }
  if (alarm.name === ALARM_BREAK_REMINDER) ;
});
async function checkMidnightReset() {
  const today = toDateString();
  const { streak, dailyData, settings } = await getStorage();
  const yesterday = toDateString(new Date(Date.now() - 864e5));
  const yesterdayRecord = dailyData[yesterday];
  if (!yesterdayRecord) return;
  const newStreak = { ...streak };
  if (yesterdayRecord.goalMet) {
    if (areConsecutiveDays(streak.lastProductiveDate, yesterday) || streak.lastProductiveDate === "") {
      newStreak.current = streak.current + 1;
    } else if (settings.gracePeriodEnabled && areConsecutiveDays(streak.lastProductiveDate, toDateString(new Date(Date.now() - 1728e5)))) {
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
      score: 0
    });
  }
}
async function creditPomodoro(session, now = Date.now()) {
  if (!session.pomodoroActive || session.pomodoroIsBreak || !session.pomodoroStartTime || !session.pomodoroEndTime) return session;
  const xp = focusXP(session.pomodoroStartTime, now, session.pomodoroEndTime, session.xpCreditedUntil);
  if (xp > 0) await awardXP(xp);
  return { ...session, xpCreditedUntil: Math.max(session.xpCreditedUntil, Math.min(now, session.pomodoroEndTime)) };
}
async function creditFocus(session, now = Date.now()) {
  if (!session.focusModeActive || !session.focusModeStartTime || !session.focusModeEndTime) return { session, xp: 0 };
  const xp = focusXP(session.focusModeStartTime, now, session.focusModeEndTime, session.xpCreditedUntil);
  if (xp > 0) await awardXP(xp);
  return { session: { ...session, xpCreditedUntil: Math.max(session.xpCreditedUntil, Math.min(now, session.focusModeEndTime)) }, xp };
}
async function handlePomodoroEnd(skipped = false) {
  const storage2 = await getStorage();
  const settings = storage2.settings;
  let session = storage2.session;
  const record = await getTodayRecord();
  if (session.pomodoroIsBreak) {
    chrome.notifications.create("pomodoro_work_start", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
      title: "Break over — time to focus!",
      message: "Your break is done. Start your next Pomodoro session."
    });
    const updatedSession = { ...session, pomodoroActive: false, pomodoroEndTime: null };
    await saveSession(updatedSession);
  } else {
    const finished = !skipped || session.pomodoroEndTime !== null && Date.now() >= session.pomodoroEndTime - 1e3;
    session = await creditPomodoro(session);
    const newSessionCount = session.pomodoroSessionCount + (finished ? 1 : 0);
    const isLongBreak = newSessionCount % 4 === 0;
    const breakMinutes = isLongBreak ? settings.pomodoroLongBreakMinutes : settings.pomodoroShortBreakMinutes;
    if (finished) {
      record.pomodoroSessionsCompleted += 1;
      await saveDayRecord(record);
    }
    chrome.notifications.create("pomodoro_break_start", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"),
      title: isLongBreak ? "Great work! Long break time." : "Session complete! Take a short break.",
      message: `${isLongBreak ? "Long" : "Short"} break: ${breakMinutes} minutes. You've completed ${newSessionCount} session${newSessionCount !== 1 ? "s" : ""} today.`
    });
    const endTime = Date.now() + breakMinutes * 60 * 1e3;
    const updatedSession = {
      ...session,
      pomodoroActive: true,
      pomodoroEndTime: endTime,
      pomodoroStartTime: null,
      pomodoroIsBreak: true,
      pomodoroSessionCount: newSessionCount,
      lastBreakTime: Date.now()
    };
    await saveSession(updatedSession);
    chrome.alarms.create(ALARM_POMODORO, { when: endTime });
  }
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((err) => {
    console.error("MindPortal message error:", err);
    sendResponse({ error: String(err) });
  });
  return true;
});
async function handleMessage(message) {
  const { type } = message;
  if (type === "START_POMODORO") {
    const storage2 = await getStorage();
    const settings = storage2.settings;
    const session = await creditPomodoro(storage2.session);
    const minutes = message["minutes"] ?? settings.pomodoroWorkMinutes;
    const workMs = minutes * 60 * 1e3;
    const now = Date.now();
    const endTime = now + workMs;
    await chrome.alarms.clear(ALARM_POMODORO);
    chrome.alarms.create(ALARM_POMODORO, { when: endTime });
    await saveSession({
      ...session,
      pomodoroActive: true,
      pomodoroStartTime: now,
      pomodoroEndTime: endTime,
      pomodoroIsBreak: false
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
      pomodoroSessionCount: 0
    });
    return { ok: true };
  }
  if (type === "ACTIVATE_FOCUS_MODE") {
    const storage2 = await getStorage();
    const settings = storage2.settings;
    const { session } = await creditFocus(storage2.session);
    const minutes = message["minutes"] ?? settings.focusModeDefaultMinutes;
    const intention = message["intention"] ?? "";
    const now = Date.now();
    const endTime = now + minutes * 60 * 1e3;
    await chrome.alarms.clear(ALARM_FOCUS_MODE);
    chrome.alarms.create(ALARM_FOCUS_MODE, { when: endTime });
    await saveSession({ ...session, focusModeActive: true, focusModeStartTime: now, focusModeEndTime: endTime, intention });
    if (intention) {
      await addIntentionRecord({
        text: intention,
        date: toDateString(),
        startTime: Date.now()
      });
    }
    return { ok: true };
  }
  if (type === "DEACTIVATE_FOCUS_MODE") {
    await deactivateFocusMode();
    return { ok: true };
  }
  if (type === "DISMISS_SITE_TODAY") {
    const { addDismissedSite: addDismissedSite2 } = await __vitePreload(async () => {
      const { addDismissedSite: addDismissedSite3 } = await Promise.resolve().then(() => storage);
      return { addDismissedSite: addDismissedSite3 };
    }, true ? void 0 : void 0);
    await addDismissedSite2(message["domain"]);
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
    const storage2 = await getStorage();
    const today = toDateString();
    const todayRecord = storage2.dailyData[today];
    const productiveSecs = todayRecord?.productiveSeconds ?? 0;
    if (storage2.pet.lastFedDate === today) {
      return { ok: false, reason: "already_fed" };
    }
    if (productiveSecs < 20 * 60) {
      return { ok: false, reason: "not_enough_work", needed: 20 - Math.floor(productiveSecs / 60) };
    }
    const newPet = {
      lastFedDate: today,
      totalFeedCount: storage2.pet.totalFeedCount + 1
    };
    await savePetState(newPet);
    await awardXP(10);
    return { ok: true, pet: newPet };
  }
  if (type === "SAVE_SETTINGS") {
    const { saveSettings: saveSettings2 } = await __vitePreload(async () => {
      const { saveSettings: saveSettings3 } = await Promise.resolve().then(() => storage);
      return { saveSettings: saveSettings3 };
    }, true ? void 0 : void 0);
    await saveSettings2(message["settings"]);
    return { ok: true };
  }
  if (type === "SET_INTENTION") {
    const { session } = await getStorage();
    const intention = message["intention"] ?? "";
    await saveSession({ ...session, intention });
    return { ok: true };
  }
  if (type === "ADD_DELAY_QUEUE") {
    const domain = message["domain"];
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
  const storage2 = await getStorage();
  const { delayQueue } = storage2;
  await chrome.alarms.clear(ALARM_FOCUS_MODE);
  if (!storage2.session.focusModeActive) return;
  const { session, xp } = await creditFocus(storage2.session);
  await saveSession({ ...session, focusModeActive: false, focusModeStartTime: null, focusModeEndTime: null, intention: "" });
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
    message: (session.intention ? `You were working on: ${session.intention}. ` : "Distracting sites are unblocked. ") + (xp > 0 ? "" : "Sessions under 5 minutes don't earn XP.")
  });
}
