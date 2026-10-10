import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, useMotionValue } from "motion/react";
import { Play, Square, Timer, X } from "lucide-react";
import css from "../panel/styles.css?inline";
import { Panel } from "../panel/Panel";
import { Ollie } from "../panel/components/ollie";
import { Button } from "../panel/components/ui/button";
import { send, useNow, useStored } from "../panel/lib/utils";
import { DEFAULT_SESSION, DEFAULT_SETTINGS } from "../shared/defaults";
import { categorizeDomain, extractDomain, formatCountdown, formatDuration, toDateString } from "../shared/utils";
import type { ActiveSession, DayRecord, Settings } from "../shared/types";

const bus = new EventTarget();
export const togglePanel = () => bus.dispatchEvent(new Event("toggle"));

/**
 * Shadow-DOM-safe Tailwind:
 * - rem -> px so pages that change the root font-size can't shrink the panel
 * - @property registrations are ignored inside shadow roots, so their initial values are set on every element instead
 */
function shadowCss(src: string): string {
  const initials: string[] = [];
  const body = src
    .replace(/@property\s+(--[\w-]+)\s*\{([^}]*)\}/g, (_, name: string, decl: string) => {
      const init = /initial-value:\s*([^;]+)/.exec(decl)?.[1]?.trim();
      if (init !== undefined) initials.push(`${name}:${init}`);
      return "";
    })
    .replace(/(-?\d*\.?\d+)rem\b/g, (_, n: string) => `${parseFloat(n) * 16}px`);
  // in the base layer: unlayered, these would beat every utility that sets a --tw-* var
  return `${body}\n@layer base{*,::before,::after,::backdrop{${initials.join(";")}}}`;
}

type Pos = { x: number; y: number };
type Kind = "productiveSites" | "unproductiveSites";

/** Stats / pomodoro / distraction card that sits beside the floating button. */
function FabCard({ left, up }: { left: boolean; up: boolean }) {
  const [stored, setSettings] = useStored<Settings>("settings", DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const [storedSession] = useStored<ActiveSession>("session", DEFAULT_SESSION);
  const session = { ...DEFAULT_SESSION, ...storedSession };
  const [neutralSites, setNeutralSites] = useStored<string[]>("neutralSites", []);
  const [daily] = useStored<Record<string, DayRecord>>("dailyData", {});
  const [stayed, setStayed] = useState(false);
  const now = useNow();

  const domain = extractDomain(location.href);
  const category = categorizeDomain(domain, settings);
  const unmarked = category === "neutral" && !neutralSites.includes(domain);
  const today = daily[toDateString()];
  const remaining = session.pomodoroActive && session.pomodoroEndTime ? (session.pomodoroEndTime - now) / 1000 : null;

  const mark = (kind: Kind | null) => {
    const strip = (l: string[]) => l.filter((d) => d !== domain);
    const next = { ...settings, productiveSites: strip(settings.productiveSites), unproductiveSites: strip(settings.unproductiveSites) };
    if (kind) next[kind] = [...next[kind], domain];
    setSettings(next);
    setNeutralSites(kind ? strip(neutralSites) : [...strip(neutralSites), domain]);
  };

  return (
    <div
      // clicks in the card shouldn't start dragging the button
      onPointerDown={(e) => e.stopPropagation()}
      className={`mp-card absolute w-64 space-y-3 p-3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.45)] ${left ? "right-full mr-3" : "left-full ml-3"} ${up ? "bottom-0" : "top-0"}`}
    >
      {category === "unproductive" && !stayed && (
        <div className="space-y-2 rounded-xl border border-red-400/25 bg-red-400/10 p-2.5">
          <p className="text-sm font-semibold text-red-200">This site is distracting. Are you sure you want to be here?</p>
          <p className="text-xs text-red-200/70">Time distracted today: {formatDuration(today?.unproductiveSeconds ?? 0)}</p>
          <div className="grid grid-cols-2 gap-1.5">
            <Button size="sm" onClick={() => history.back()}>Leave</Button>
            <Button size="sm" variant="brandOutline" onClick={() => setStayed(true)}>I'm sure</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Timer className="size-4 text-(--ollie-cyan)" />
        <span className="text-lg font-bold tabular-nums">{formatCountdown(remaining ?? settings.pomodoroWorkMinutes * 60)}</span>
        {remaining !== null && <span className="mp-label">{session.pomodoroIsBreak ? "Break" : "Focus"}</span>}
        <Button
          size="sm"
          className="ml-auto"
          variant={remaining !== null ? "brandOutline" : "brand"}
          onClick={() => send({ type: remaining !== null ? "STOP_POMODORO" : "START_POMODORO" })}
        >
          {remaining !== null ? <><Square className="size-3.5" /> Stop</> : <><Play className="size-3.5" /> Start timer</>}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="rounded-lg bg-green-400/10 px-2 py-1.5 text-green-200">Focused<div className="text-sm font-semibold">{formatDuration(today?.productiveSeconds ?? 0)}</div></div>
        <div className="rounded-lg bg-red-400/10 px-2 py-1.5 text-red-200">Not focused<div className="text-sm font-semibold">{formatDuration(today?.unproductiveSeconds ?? 0)}</div></div>
      </div>

      {unmarked && (
        <div className="space-y-1.5 border-t border-white/10 pt-2.5">
          <span className="mp-label">Mark {domain} as</span>
          <div className="grid grid-cols-3 gap-1.5">
            <Button size="sm" variant="brandOutline" onClick={() => mark("unproductiveSites")}>Distracting</Button>
            <Button size="sm" variant="brandOutline" onClick={() => mark("productiveSites")}>Focus</Button>
            <Button size="sm" variant="brandOutline" onClick={() => mark(null)}>Neutral</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Overlay() {
  const [open, setOpen] = useState(false);
  const [settings] = useStored<Settings>("settings", DEFAULT_SETTINGS);
  const [hiddenSites, setHiddenSites] = useStored<string[]>("fabHiddenSites", []);
  const [fabPos, setFabPos] = useStored<Pos>("fabPos", { x: 0, y: 0 });
  const site = location.hostname;
  const showFab = (settings.showOverlayButton ?? true) && !hiddenSites.includes(site);
  const close = useCallback(() => setOpen(false), []);
  const bounds = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    x.set(fabPos.x);
    y.set(fabPos.y);
  }, [fabPos, x, y]);

  useEffect(() => {
    const t = () => setOpen((o) => !o);
    bus.addEventListener("toggle", t);
    return () => bus.removeEventListener("toggle", t);
  }, []);

  return (
    <>
      {/* viewport-sized box that the button and panel are dragged within */}
      <div ref={bounds} className="pointer-events-none fixed inset-2" />
      {showFab && !open && (
        <motion.div
          drag
          dragConstraints={bounds}
          dragMomentum={false}
          dragElastic={0}
          style={{ x, y }}
          onPointerDown={() => (dragged.current = false)}
          onDragStart={() => (dragged.current = true)}
          onDragEnd={() => setFabPos({ x: x.get(), y: y.get() })}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="group fixed right-4 bottom-4 size-[52px] touch-none"
        >
          <button
            type="button"
            aria-label="Open MindPortal (Alt+M). Drag to move."
            title="MindPortal (Alt+M) · drag to move"
            onClick={() => !dragged.current && setOpen(true)}
            className="flex size-full cursor-pointer items-center justify-center rounded-full border border-(--ollie-cyan)/30 bg-[#15172b] shadow-[0_8px_30px_rgba(0,0,0,0.45),0_0_0_4px_var(--ollie-glow)] outline-none transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)"
          >
            <Ollie size={30} />
          </button>
          <button
            type="button"
            aria-label={`Hide the MindPortal button on ${site}`}
            title={`Hide on ${site} (bring it back in Settings)`}
            onClick={() => setHiddenSites((all) => [...all, site])}
            className="absolute -top-1 -left-1 flex size-5 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#0b0b0e] text-white/70 opacity-0 transition-opacity outline-none hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X className="size-3" />
          </button>
          {/* the button rests at right-4 bottom-4 (52px), so its centre is offset from there by the drag */}
          <FabCard left={innerWidth - 42 + fabPos.x > innerWidth / 2} up={innerHeight - 42 + fabPos.y > innerHeight / 2} />
        </motion.div>
      )}
      <Panel open={open} onClose={close} bounds={bounds} />
    </>
  );
}

let mounted = false;

export function mountOverlay() {
  if (mounted) return;
  mounted = true;
  // a host left behind by a previous (reloaded) version of the extension is dead, so replace it
  document.querySelector("mindportal-overlay")?.remove();
  const host = document.createElement("mindportal-overlay");
  host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = shadowCss(css);
  const mount = document.createElement("div");
  shadow.append(style, mount);
  // keep typing in the panel from triggering the page's own keyboard shortcuts
  for (const type of ["keydown", "keyup", "keypress"]) host.addEventListener(type, (e) => e.stopPropagation());
  document.documentElement.append(host);
  createRoot(mount).render(<Overlay />);
}
