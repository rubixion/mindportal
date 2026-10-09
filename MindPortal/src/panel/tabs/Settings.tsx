import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { download, useStored } from "@/lib/utils";
import { DEFAULT_SETTINGS } from "../../shared/defaults";
import type { Settings as S } from "../../shared/types";

type NumKey = { [K in keyof S]: S[K] extends number ? K : never }[keyof S];

export function Settings() {
  const [stored, setStored] = useStored<S>("settings", DEFAULT_SETTINGS);
  const s = { ...DEFAULT_SETTINGS, ...stored };
  const [confirmReset, setConfirmReset] = useState(false);
  const [hiddenSites, setHiddenSites] = useStored<string[]>("fabHiddenSites", []);
  const set = (p: Partial<S>) => setStored({ ...s, ...p, onboardingComplete: true });

  const num = (key: NumKey, label: string, min: number, max: number, hint?: string) => (
    <NumField key={key} label={label} hint={hint} min={min} max={max} value={s[key]} onCommit={(v) => set({ [key]: v } as Partial<S>)} />
  );

  const toggle = (key: "pomodoroAutoFocusMode" | "gracePeriodEnabled" | "showOverlayButton", label: string) => (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="flex-1 text-[13px] text-white/75">{label}</span>
      <Switch checked={!!s[key]} onCheckedChange={(c) => set({ [key]: c })} />
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="mp-card space-y-3">
        <span className="mp-label">You</span>
        <input className="mp-input" placeholder="Your name (optional)" value={s.userName} maxLength={40} onChange={(e) => set({ userName: e.target.value })} />
      </div>

      <div className="mp-card space-y-3">
        <span className="mp-label">Daily goals</span>
        {num("dailyGoalMinutes", "Focus goal", 10, 600, "minutes on focus sites")}
        {num("unproductiveCapMinutes", "Distraction cap", 0, 480, "minutes on distracting sites")}
        {toggle("gracePeriodEnabled", "Allow one missed day without losing my streak")}
      </div>

      <div className="mp-card space-y-3">
        <span className="mp-label">When I open a distracting site</span>
        <SegmentedControl label="Warning mode" className="w-full" value={s.warningMode}
          onValueChange={(v) => set({ warningMode: v as S["warningMode"] })}
          options={[{ value: "warn", label: "Warn" }, { value: "countdown", label: "Countdown" }, { value: "block", label: "Block" }]} />
        {s.warningMode === "countdown" && num("countdownSeconds", "Countdown length", 1, 30, "seconds")}
      </div>

      <div className="mp-card space-y-3">
        <span className="mp-label">Focus & pomodoro</span>
        {num("focusModeDefaultMinutes", "Default focus session", 5, 480, "minutes")}
        {num("pomodoroWorkMinutes", "Pomodoro", 5, 90, "minutes")}
        {num("pomodoroShortBreakMinutes", "Short break", 1, 30, "minutes")}
        {num("pomodoroLongBreakMinutes", "Long break", 5, 60, "minutes")}
        {num("breakReminderMinutes", "Break reminder", 0, 240, "minutes of focus, 0 = off")}
        {toggle("pomodoroAutoFocusMode", "Block distractions during pomodoros")}
      </div>

      <div className="mp-card space-y-3">
        <span className="mp-label">Panel</span>
        {toggle("showOverlayButton", "Show the floating owl button on pages")}
        {hiddenSites.length > 0 && (
          <div className="flex items-center gap-2 text-[12px] text-white/55">
            <span className="flex-1">Hidden on {hiddenSites.length} site{hiddenSites.length === 1 ? "" : "s"}: {hiddenSites.slice(0, 2).join(", ")}{hiddenSites.length > 2 ? "…" : ""}</span>
            <Button size="sm" variant="brandOutline" onClick={() => setHiddenSites([])}>Show everywhere</Button>
          </div>
        )}
        <Button size="sm" variant="ghost" className="w-full" onClick={() => chrome.storage.local.set({ fabPos: { x: 0, y: 0 }, panelPos: { x: 0, y: 0 } })}>
          Reset button & panel position
        </Button>
        <p className="text-[11px] text-white/35">Drag the owl or the panel header to move them. Hover the owl and click × to hide it on that site. Alt+M always opens the panel.</p>
      </div>

      <div className="mp-card space-y-2">
        <span className="mp-label">Your data</span>
        <p className="text-[12px] text-white/45">Everything is stored only in this browser.</p>
        <Button variant="brandOutline" className="w-full" onClick={async () =>
          download(`mindportal-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await chrome.storage.local.get(null), null, 2), "application/json")}>
          <Download className="size-4" /> Export backup (JSON)
        </Button>
        {confirmReset ? (
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" onClick={() => chrome.storage.local.clear().then(() => setConfirmReset(false))}>Yes, erase everything</Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="destructive" className="w-full" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="size-4" /> Reset all data
          </Button>
        )}
      </div>
    </div>
  );
}

/** Number input that only clamps + saves on blur/Enter, so typing "120" isn't clamped at "1". */
function NumField({ label, hint, min, max, value, onCommit }: { label: string; hint?: string; min: number; max: number; value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(v)) onCommit(Math.min(max, Math.max(min, Math.round(v))));
    setDraft(null);
  };
  return (
    <label className="flex items-center gap-3">
      <span className="flex-1 text-[13px] text-white/75">
        {label}
        {hint && <span className="block text-[11px] text-white/35">{hint}</span>}
      </span>
      <input type="number" className="mp-input w-20 text-right tabular-nums" min={min} max={max} value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />
    </label>
  );
}
