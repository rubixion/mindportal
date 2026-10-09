import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Flame, PanelRightOpen, Play, Settings as Gear } from "lucide-react";
import "../panel/styles.css";
import { AnimatedCircularProgressBar } from "../panel/components/ui/animated-circular-progress-bar";
import { Button } from "../panel/components/ui/button";
import { Ollie } from "../panel/components/ollie";
import { send, useNow, useStored } from "../panel/lib/utils";
import { DEFAULT_SESSION, DEFAULT_SETTINGS, DEFAULT_STREAK } from "../shared/defaults";
import { formatCountdown, formatDuration, scoreColor, toDateString } from "../shared/utils";
import type { ActiveSession, DayRecord, Settings, StreakData } from "../shared/types";

// The popup stays small on purpose: glance at today, then open the in-page panel for everything else.
function Popup() {
  const now = useNow();
  const [settings] = useStored<Settings>("settings", DEFAULT_SETTINGS);
  const [session] = useStored<ActiveSession>("session", DEFAULT_SESSION);
  const [streak] = useStored<StreakData>("streak", DEFAULT_STREAK);
  const [dailyData] = useStored<Record<string, DayRecord>>("dailyData", {});
  const [error, setError] = useState("");

  const record = dailyData[toDateString()];
  const score = record?.score ?? 0;

  const openPanel = async () => {
    const r = await send<{ ok: boolean }>({ type: "TOGGLE_PANEL" });
    if (r?.ok) window.close();
    else setError("The panel can't open on this page (Chrome pages and the Web Store are off-limits). Try it on a regular website.");
  };

  if (!settings.onboardingComplete) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <Ollie size={64} />
        <h1 className="text-lg font-bold">Hey, I'm Ollie.</h1>
        <p className="text-sm text-white/60">Let's set up your focus goals. It takes 30 seconds.</p>
        <Button size="cta" className="w-full" onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("src/onboarding/index.html") })}>Get started</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Ollie size={28} />
        <span className="text-[15px] font-bold tracking-tight">MindPortal</span>
        <span className="flex-1" />
        <Button variant="ghost" size="icon" aria-label="Settings and analytics" onClick={() => chrome.runtime.openOptionsPage()}><Gear className="size-4" /></Button>
      </div>

      <div className="mp-card flex items-center gap-4 p-3">
        <AnimatedCircularProgressBar value={score} gaugePrimaryColor={scoreColor(score)} gaugeSecondaryColor="rgb(255 255 255 / 0.08)"
          className="size-16 text-base" label={<span className="font-bold tabular-nums">{score}</span>} />
        <div className="text-sm">
          <div className="font-semibold">{formatDuration(record?.productiveSeconds ?? 0)} focused</div>
          <div className="text-xs text-white/50">goal {formatDuration(settings.dailyGoalMinutes * 60)}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-orange-300"><Flame className="size-3.5" />{streak.current} day streak</div>
        </div>
      </div>

      {session.focusModeActive ? (
        <Button variant="brandOutline" className="w-full" onClick={() => send({ type: "DEACTIVATE_FOCUS_MODE" })}>
          End focus · {formatCountdown(Math.max(0, ((session.focusModeEndTime ?? now) - now) / 1000))}
        </Button>
      ) : (
        <Button variant="brandOutline" className="w-full" onClick={() => send({ type: "ACTIVATE_FOCUS_MODE", minutes: settings.focusModeDefaultMinutes })}>
          <Play className="size-4" /> Focus for {settings.focusModeDefaultMinutes} min
        </Button>
      )}

      <Button size="cta" className="w-full" onClick={openPanel}>
        <PanelRightOpen className="size-4" /> Open MindPortal panel
      </Button>
      {error && <p className="text-xs leading-snug text-orange-300" role="alert">{error}</p>}
      <p className="text-center text-[11px] text-white/35">Notes, lists, calendar & more live in the panel · Alt+M</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
