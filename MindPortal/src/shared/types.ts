export type PopupSize = "mini" | "normal" | "large";

export type OllieMood = "happy" | "hungry" | "sad" | "focused" | "sleepy" | "worried" | "proud";

export interface IntentionRecord {
  text: string;
  date: string;      // YYYY-MM-DD
  startTime: number; // unix ms
}

export interface Settings {
  userName: string;
  productiveSites: string[];
  unproductiveSites: string[];
  dailyGoalMinutes: number;
  unproductiveCapMinutes: number;
  warningMode: "warn" | "countdown" | "block";
  countdownSeconds: number;
  gracePeriodEnabled: boolean;
  pomodoroWorkMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  pomodoroAutoFocusMode: boolean;
  breakReminderMinutes: number;
  focusModeDefaultMinutes: number;
  onboardingComplete: boolean;
  popupSize: PopupSize;
  animationsEnabled: boolean;
  languageGoal: string;
  showOverlayButton: boolean;
}

export interface PetState {
  lastFedDate: string;
  totalFeedCount: number;
}

export interface DayRecord {
  date: string;
  productiveSeconds: number;
  unproductiveSeconds: number;
  neutralSeconds: number;
  siteBreakdown: Record<string, number>;
  pomodoroSessionsCompleted: number;
  goalMet: boolean;
  score: number;
}

export interface StreakData {
  current: number;
  longest: number;
  lastProductiveDate: string;
}

export interface ActiveSession {
  pomodoroActive: boolean;
  pomodoroEndTime: number | null;
  pomodoroIsBreak: boolean;
  pomodoroSessionCount: number;
  focusModeActive: boolean;
  focusModeEndTime: number | null;
  lastBreakTime: number;
  currentDomain: string | null;
  domainStartTime: number | null;
  intention: string;
}

export interface AppStorage {
  settings: Settings;
  dailyData: Record<string, DayRecord>;
  streak: StreakData;
  session: ActiveSession;
  dismissedToday: string[];
  lastDismissedDate: string;
  pet: PetState;
  xp: number;
  level: number;
  intentionHistory: IntentionRecord[];
  delayQueue: string[];
}

export type SiteCategory = "productive" | "unproductive" | "neutral";

export interface TabTimeEvent {
  domain: string;
  seconds: number;
  category: SiteCategory;
}

// ─── Overlay panel data (all stored in chrome.storage.local) ──────────────────

export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  url?: string;
  updated: number;
}

export interface ListItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoList {
  id: string;
  name: string;
  items: ListItem[];
}

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (local)
  time: string; // HH:MM or ""
  remind: boolean;
}

export interface Habit {
  id: string;
  name: string;
  days: string[]; // YYYY-MM-DD dates completed
}

export interface SavedPage {
  id: string;
  title: string;
  url: string;
  added: number;
}
