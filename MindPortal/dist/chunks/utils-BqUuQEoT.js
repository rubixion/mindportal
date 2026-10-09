const DEFAULT_SETTINGS = {
  userName: "",
  productiveSites: [
    "github.com",
    "gitlab.com",
    "docs.google.com",
    "drive.google.com",
    "notion.so",
    "stackoverflow.com",
    "developer.mozilla.org",
    "coursera.org",
    "udemy.com",
    "khanacademy.org",
    "leetcode.com",
    "linear.app",
    "figma.com",
    "vercel.com",
    "netlify.com"
  ],
  unproductiveSites: [
    "youtube.com",
    "reddit.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "tiktok.com",
    "netflix.com",
    "facebook.com",
    "twitch.tv",
    "9gag.com",
    "buzzfeed.com",
    "hulu.com",
    "disneyplus.com"
  ],
  dailyGoalMinutes: 120,
  unproductiveCapMinutes: 30,
  warningMode: "countdown",
  countdownSeconds: 5,
  gracePeriodEnabled: false,
  pomodoroWorkMinutes: 25,
  pomodoroShortBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
  pomodoroAutoFocusMode: false,
  breakReminderMinutes: 50,
  focusModeDefaultMinutes: 30,
  onboardingComplete: false,
  popupSize: "normal",
  animationsEnabled: true,
  languageGoal: "",
  showOverlayButton: true
};
const DEFAULT_PET = {
  lastFedDate: "",
  totalFeedCount: 0
};
const DEFAULT_STREAK = {
  current: 0,
  longest: 0,
  lastProductiveDate: ""
};
const DEFAULT_SESSION = {
  pomodoroActive: false,
  pomodoroEndTime: null,
  pomodoroIsBreak: false,
  pomodoroSessionCount: 0,
  focusModeActive: false,
  focusModeEndTime: null,
  focusModeStartTime: null,
  pomodoroStartTime: null,
  xpCreditedUntil: 0,
  lastBreakTime: Date.now(),
  currentDomain: null,
  domainStartTime: null,
  intention: ""
};
function toDateString(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().slice(0, 10);
}
function extractDomain(input) {
  try {
    const url = input.startsWith("http") ? new URL(input) : new URL("https://" + input);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return input.replace(/^www\./, "").split("/")[0] ?? input;
  }
}
function domainMatchesList(domain, list) {
  const clean = domain.replace(/^www\./, "");
  return list.some((entry) => {
    const cleanEntry = entry.replace(/^www\./, "");
    return clean === cleanEntry || clean.endsWith("." + cleanEntry);
  });
}
function categorizeDomain(domain, settings) {
  if (domainMatchesList(domain, settings.productiveSites)) return "productive";
  if (domainMatchesList(domain, settings.unproductiveSites)) return "unproductive";
  return "neutral";
}
function formatDuration(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds % 3600 / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
function formatCountdown(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function computeScore(productiveSeconds, unproductiveSeconds, goalMinutes, capMinutes) {
  const goalSeconds = goalMinutes * 60;
  const capSeconds = capMinutes * 60;
  const productiveRatio = goalSeconds > 0 ? Math.min(productiveSeconds / goalSeconds, 1) : 1;
  const unproductiveRatio = capSeconds > 0 ? Math.min(unproductiveSeconds / capSeconds, 1) : 0;
  const score = productiveRatio * 70 + (1 - unproductiveRatio) * 30;
  return Math.round(Math.max(0, Math.min(100, score)));
}
function scoreColor(score) {
  if (score >= 70) return "#4ade80";
  if (score >= 40) return "#fb923c";
  return "#f87171";
}
const MIN_XP_MINUTES = 5;
function focusXP(startMs, nowMs, plannedEndMs, creditedUntil = 0) {
  const from = Math.max(startMs, creditedUntil);
  const to = Math.min(nowMs, plannedEndMs);
  const minutes = Math.floor(Math.max(0, to - from) / 6e4);
  if (minutes < MIN_XP_MINUTES) return 0;
  const completed = nowMs >= plannedEndMs - 1e3;
  return completed ? Math.round(minutes * 1.5) : minutes;
}
function areConsecutiveDays(earlier, later) {
  if (!earlier || !later) return false;
  const a = new Date(earlier);
  const b = new Date(later);
  const diff = b.getTime() - a.getTime();
  return diff === 864e5;
}
export {
  DEFAULT_PET as D,
  DEFAULT_SESSION as a,
  DEFAULT_STREAK as b,
  DEFAULT_SETTINGS as c,
  areConsecutiveDays as d,
  categorizeDomain as e,
  computeScore as f,
  focusXP as g,
  extractDomain as h,
  formatDuration as i,
  formatCountdown as j,
  scoreColor as s,
  toDateString as t
};
