import { useState } from "react";
import { Flame, Play, Pause, SkipForward, Square, Lock, Timer, CalendarDays, ListChecks } from "lucide-react";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Ollie } from "@/components/ollie";
import { localDate, send, useNow, useStored } from "@/lib/utils";
import { DEFAULT_SESSION, DEFAULT_SETTINGS, DEFAULT_STREAK, DEFAULT_PET } from "../../shared/defaults";
import { formatCountdown, formatDuration, scoreColor, toDateString } from "../../shared/utils";
import { occursOn, timeLabel } from "../../shared/events";
import type { ActiveSession, CalEvent, DayRecord, OllieMood, Settings, StreakData, PetState, TodoList } from "../../shared/types";

const MESSAGES: Record<OllieMood, string> = {
  happy: "Nice rhythm. Keep it going.",
  proud: "Look at you go. Proud of you!",
  focused: "Heads down. I'll keep watch.",
  hungry: "Do 20 minutes of focus and feed me?",
  sleepy: "Fresh day. Pick one thing to start.",
  worried: "Drifting a bit. One small focus block?",
  sad: "Tomorrow's a clean slate.",
};

export function Today() {
  const now = useNow();
  const [settings] = useStored<Settings>("settings", DEFAULT_SETTINGS);
  const [session] = useStored<ActiveSession>("session", DEFAULT_SESSION);
  const [streak] = useStored<StreakData>("streak", DEFAULT_STREAK);
  const [pet] = useStored<PetState>("pet", DEFAULT_PET);
  const [dailyData] = useStored<Record<string, DayRecord>>("dailyData", {});
  const [xp] = useStored("xp", 0);
  const [level] = useStored("level", 1);
  const [events] = useStored<CalEvent[]>("events", []);
  const [lists] = useStored<TodoList[]>("lists", []);
  const [picked, setPicked] = useState<string | null>(null);
  const [intention, setIntention] = useState("");
  const [toast, setToast] = useState("");

  const s = { ...DEFAULT_SETTINGS, ...settings };
  // settings load async, so default to the saved focus length until the user picks one
  const minutes = picked ?? String(s.focusModeDefaultMinutes);
  const lengths = [...new Set([15, 25, 45, 60, 90, Number(minutes)])].sort((a, b) => a - b).slice(0, 6);
  const ss = { ...DEFAULT_SESSION, ...session };
  const record = dailyData[toDateString()];
  const productive = record?.productiveSeconds ?? 0;
  const score = record?.score ?? 0;
  const today = toDateString();

  const mood: OllieMood = ss.focusModeActive || (ss.pomodoroActive && !ss.pomodoroIsBreak)
    ? "focused"
    : score >= 80 ? "proud"
    : score >= 50 ? "happy"
    : productive > 0 && score < 30 ? "worried"
    : pet.lastFedDate !== today && productive === 0 ? "hungry"
    : productive === 0 ? "sleepy" : "happy";

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const feed = async () => {
    const r = await send<{ ok: boolean; reason?: string; needed?: number }>({ type: "FEED_PET" });
    if (r.ok) flash("Yum! +10 XP");
    else if (r.reason === "already_fed") flash("Ollie's already full today.");
    else flash(`${r.needed ?? 20} more focus minutes to earn a snack.`);
  };

  const todayKey = localDate();
  const todaysEvents = events.filter((e) => occursOn(e, todayKey)).sort((a, b) => a.time.localeCompare(b.time));
  const openTasks = lists.reduce((n, l) => n + l.items.filter((i) => !i.done).length, 0);

  const focusLeft = ss.focusModeEndTime ? Math.max(0, (ss.focusModeEndTime - now) / 1000) : 0;
  const pomoLeft = ss.pomodoroEndTime ? Math.max(0, (ss.pomodoroEndTime - now) / 1000) : 0;
  const topSites = Object.entries(record?.siteBreakdown ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const xpNeeded = level * 100;

  return (
    <div className="space-y-3">
      {/* score + stats */}
      <div className="mp-card flex items-center gap-4">
        <AnimatedCircularProgressBar
          value={score}
          gaugePrimaryColor={scoreColor(score)}
          gaugeSecondaryColor="rgb(255 255 255 / 0.08)"
          className="size-[76px] text-lg"
          label={<span className="font-bold tabular-nums text-white">{score}</span>}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-white">
            {greeting}{s.userName ? `, ${s.userName}` : ""}
          </div>
          <div className="mt-1 text-xs text-white/50">
            {formatDuration(productive)} focused of {formatDuration(s.dailyGoalMinutes * 60)} goal
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-orange-300"><Flame className="size-3.5" />{streak.current} day streak</span>
            <span className="text-white/40">Lv {level}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10" aria-label={`${xp} of ${xpNeeded} XP`}>
            <div className="h-full rounded-full bg-(--ollie-cyan)" style={{ width: `${Math.min(100, (xp / xpNeeded) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Ollie */}
      <div className="mp-card flex items-center gap-3 py-3">
        <Ollie mood={mood} size={44} />
        <p className="flex-1 text-[13px] leading-snug text-white/75" aria-live="polite">{toast || MESSAGES[mood]}</p>
        <Button size="sm" variant="brandOutline" onClick={feed} disabled={pet.lastFedDate === today}>
          {pet.lastFedDate === today ? "Fed ✓" : "Feed"}
        </Button>
      </div>

      {/* focus mode */}
      <div className="mp-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="mp-label inline-flex items-center gap-1.5"><Lock className="size-3" /> Focus mode</span>
          {ss.focusModeActive && <span className="text-xs text-(--ollie-cyan)">Distractions blocked</span>}
        </div>
        {ss.focusModeActive ? (
          <>
            <div className="text-center text-4xl font-bold tabular-nums tracking-tight text-white" aria-live="polite">{formatCountdown(focusLeft)}</div>
            {ss.intention && <p className="text-center text-[13px] text-white/60">Working on: <em className="text-white/85">{ss.intention}</em></p>}
            <Button variant="brandOutline" className="w-full" onClick={() => send({ type: "DEACTIVATE_FOCUS_MODE" })}>End session</Button>
          </>
        ) : (
          <>
            <input className="mp-input" placeholder="What will you work on?" value={intention} onChange={(e) => setIntention(e.target.value)} maxLength={120} />
            <SegmentedControl
              label="Session length"
              className="w-full"
              value={minutes}
              onValueChange={setPicked}
              options={lengths.map((m) => ({ value: String(m), label: `${m}m` }))}
            />
            <Button size="cta" className="w-full" onClick={() => send({ type: "ACTIVATE_FOCUS_MODE", minutes: Number(minutes), intention })}>
              <Play className="size-4" /> Start focus
            </Button>
            <p className="text-center text-[11px] text-white/35">1 XP per focused minute · 1.5× for finishing · 5 min minimum</p>
          </>
        )}
      </div>

      {/* pomodoro */}
      <div className="mp-card">
        <div className="flex items-center justify-between">
          <span className="mp-label inline-flex items-center gap-1.5"><Timer className="size-3" /> Pomodoro</span>
          <span className="text-xs text-white/40">{record?.pomodoroSessionsCompleted ?? 0} done today</span>
        </div>
        {ss.pomodoroActive ? (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-2xl font-bold tabular-nums text-white">{formatCountdown(pomoLeft)}</div>
              <div className={ss.pomodoroIsBreak ? "text-xs text-green-300" : "text-xs text-(--ollie-cyan)"}>{ss.pomodoroIsBreak ? "Break" : "Focus"} · session {ss.pomodoroSessionCount + 1}</div>
            </div>
            <Button size="icon" variant="ghost" aria-label="Pause" onClick={() => send({ type: "PAUSE_POMODORO" })}><Pause className="size-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Skip" onClick={() => send({ type: "SKIP_POMODORO" })}><SkipForward className="size-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Stop" onClick={() => send({ type: "STOP_POMODORO" })}><Square className="size-4" /></Button>
          </div>
        ) : (
          <Button variant="brandOutline" className="mt-3 w-full" onClick={() => send({ type: "START_POMODORO" })}>
            <Play className="size-4" /> Start {s.pomodoroWorkMinutes}-minute pomodoro
          </Button>
        )}
      </div>

      {/* at a glance */}
      <div className="mp-card space-y-2">
        <span className="mp-label">Today at a glance</span>
        <div className="flex items-center gap-2 text-[13px] text-white/75">
          <CalendarDays className="size-4 text-(--ollie-cyan)" />
          {todaysEvents.length ? todaysEvents.map((e) => `${e.time ? timeLabel(e.time) + " " : ""}${e.title}`).join(" · ") : "Nothing on the calendar"}
        </div>
        <div className="flex items-center gap-2 text-[13px] text-white/75">
          <ListChecks className="size-4 text-(--ollie-cyan)" />
          {openTasks ? `${openTasks} open task${openTasks === 1 ? "" : "s"}` : "All tasks done"}
        </div>
      </div>

      {topSites.length > 0 && (
        <div className="mp-card space-y-2">
          <span className="mp-label">Top sites today</span>
          {topSites.map(([domain, secs]) => (
            <div key={domain} className="flex items-center gap-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate text-white/75">{domain}</span>
              <span className="tabular-nums text-white/45">{formatDuration(secs)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
