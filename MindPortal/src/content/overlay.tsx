import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig, motion, useMotionValue } from "motion/react";
import { ChevronLeft, ChevronRight, Play, Scaling, Square, X } from "lucide-react";
import css from "../panel/styles.css?inline";
import { Panel } from "../panel/Panel";
import { Ollie } from "../panel/components/ollie";
import { Button } from "../panel/components/ui/button";
import { send, useNow, useStored } from "../panel/lib/utils";
import { DEFAULT_SESSION, DEFAULT_SETTINGS } from "../shared/defaults";
import { categorizeDomain, extractDomain, formatCountdown, toDateString } from "../shared/utils";
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

/** "1h 02m 05s" / "2m 05s" / "5s": always shows seconds so the live counters visibly tick. */
const clock = (sec: number) => {
  const t = Math.floor(sec);
  const [h, m, s] = [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60];
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}h ${p(m)}m ${p(s)}s` : m ? `${m}m ${p(s)}s` : `${s}s`;
};

/** Stats / pomodoro / distraction card that sits beside the floating button. */
function FabCard({
  left,
  hidden,
  onCollapse,
}: {
  left: boolean;
  hidden: boolean;
  onCollapse: () => void;
}) {
  const [stored, setSettings, settingsLoaded] = useStored<Settings>("settings", DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const [storedSession] = useStored<ActiveSession>("session", DEFAULT_SESSION);
  const session = { ...DEFAULT_SESSION, ...storedSession };
  const [neutralSites, setNeutralSites, neutralLoaded] = useStored<string[]>("neutralSites", []);
  const [daily] = useStored<Record<string, DayRecord>>("dailyData", {});
  const [stayed, setStayed] = useState(false);
  const now = useNow();

  const domain = extractDomain(location.href);
  const category = categorizeDomain(domain, settings);
  // until the site lists load, every site looks unmarked; don't flash the warning / mark buttons
  const ready = settingsLoaded && neutralLoaded;
  const unmarked = ready && category === "neutral" && !neutralSites.includes(domain);
  const today = daily[toDateString()];
  // the service worker only saves time every ~30s (and on tab switches), so count this tab's
  // unsaved seconds here; capped so a stalled worker can't run the numbers away
  const savedAt = useRef(Date.now());
  useEffect(() => void (savedAt.current = Date.now()), [daily]);
  const live =
    document.visibilityState === "visible" && document.hasFocus()
      ? Math.min(60, (now - savedAt.current) / 1000)
      : 0;
  const focused = (today?.productiveSeconds ?? 0) + (category === "productive" ? live : 0);
  const distracted = (today?.unproductiveSeconds ?? 0) + (category === "unproductive" ? live : 0);
  const remaining =
    session.pomodoroActive && session.pomodoroEndTime
      ? (session.pomodoroEndTime - now) / 1000
      : null;

  const mark = (kind: Kind | null) => {
    const strip = (l: string[]) => l.filter((d) => d !== domain);
    const next = {
      ...settings,
      productiveSites: strip(settings.productiveSites),
      unproductiveSites: strip(settings.unproductiveSites),
    };
    if (kind) next[kind] = [...next[kind], domain];
    setSettings(next);
    setNeutralSites(kind ? strip(neutralSites) : [...strip(neutralSites), domain]);
  };

  const divider = <div className="h-7 w-px shrink-0 bg-white/10" />;
  const chip = "h-6 rounded-md px-2 text-[11px]";
  const collapse = (
    <button
      type="button"
      aria-label="Collapse to just the owl"
      title="Collapse"
      onClick={onCollapse}
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/50 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)"
    >
      {left ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
    </button>
  );

  return (
    <div
      // clicks in the bar shouldn't start dragging the button
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute top-0 flex h-[52px] items-center gap-3 rounded-full border border-(--ollie-cyan)/30 bg-[#15172b] px-2 font-sans whitespace-nowrap text-white shadow-[0_8px_30px_rgba(0,0,0,0.45),0_0_0_4px_var(--ollie-glow)] ${left ? "right-full mr-3" : "left-full ml-3"}`}
      style={hidden ? { display: "none" } : undefined}
    >
      {!left && collapse}
      <Button
        size="icon"
        className="size-9 shrink-0 rounded-full"
        variant={remaining !== null ? "brandOutline" : "brand"}
        aria-label={remaining !== null ? "Stop timer" : "Start timer"}
        title={remaining !== null ? "Stop timer" : "Start timer"}
        onClick={() => send({ type: remaining !== null ? "STOP_POMODORO" : "START_POMODORO" })}
      >
        {remaining !== null ? <Square className="size-3.5" /> : <Play className="size-4" />}
      </Button>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tabular-nums">
          {formatCountdown(remaining ?? settings.pomodoroWorkMinutes * 60)}
        </div>
        <div className="text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase">
          {remaining === null ? "Pomodoro" : session.pomodoroIsBreak ? "Break" : "Focus"}
        </div>
      </div>

      {divider}
      <div className="space-y-0.5 text-[11px] leading-tight text-white/60 tabular-nums">
        <div>
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-green-400" />
          Focused <b className="text-white">{clock(focused)}</b>
        </div>
        <div>
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-red-400" />
          Distracted <b className="text-white">{clock(distracted)}</b>
        </div>
      </div>

      {ready && category === "unproductive" && !stayed && (
        <>
          {divider}
          <div className="text-[11px] leading-tight">
            <div className="font-semibold text-red-300">
              Distracting site. Sure you want to be here?
            </div>
            <div className="text-white/50">{clock(distracted)} distracted today</div>
          </div>
          <Button size="sm" className={chip} onClick={() => history.back()}>
            Leave
          </Button>
          <Button size="sm" variant="brandOutline" className={chip} onClick={() => setStayed(true)}>
            Stay
          </Button>
        </>
      )}

      {unmarked && (
        <>
          {divider}
          <div className="space-y-1">
            <div className="text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase">
              Mark this site
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="brandOutline"
                className={chip}
                onClick={() => mark("unproductiveSites")}
              >
                Distracting
              </Button>
              <Button
                size="sm"
                variant="brandOutline"
                className={chip}
                onClick={() => mark("productiveSites")}
              >
                Focus
              </Button>
              <Button size="sm" variant="brandOutline" className={chip} onClick={() => mark(null)}>
                Neutral
              </Button>
            </div>
          </div>
        </>
      )}
      {left && collapse}
    </div>
  );
}

function Overlay() {
  const [open, setOpen] = useState(false);
  const [settings] = useStored<Settings>("settings", DEFAULT_SETTINGS);
  const [hiddenSites, setHiddenSites] = useStored<string[]>("fabHiddenSites", []);
  const [fabPos, setFabPos, posLoaded] = useStored<Pos>("fabPos", { x: 0, y: 0 });
  const [collapsed, setCollapsed, collapsedLoaded] = useStored<boolean>("fabCollapsed", false);
  const [fabScale, setFabScale, scaleLoaded] = useStored<number>("fabScale", 1);
  const site = location.hostname;
  // wait for the saved position/size/collapsed state so the button doesn't flash its defaults first
  const showFab =
    posLoaded &&
    collapsedLoaded &&
    scaleLoaded &&
    (settings.showOverlayButton ?? true) &&
    !hiddenSites.includes(site);
  const close = useCallback(() => setOpen(false), []);
  const bounds = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  // page zoom (Ctrl +/-); the button is CSS-zoomed by 1/zoom so it keeps its on-screen size and spot.
  // Its own px are then page px * zoom, which is also the unit fabPos is stored in.
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    send<number>({ type: "GET_ZOOM" }).then(
      (z) => typeof z === "number" && setZoom(z),
      () => {}
    );
    const onMsg = (m: { type?: string; zoom?: number }) =>
      void (m?.type === "MP_ZOOM" && m.zoom && setZoom(m.zoom));
    chrome.runtime.onMessage.addListener(onMsg);
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, []);
  const toFab = useCallback(
    (p: { x: number; y: number }) => ({ x: p.x * zoom, y: p.y * zoom }),
    [zoom]
  );
  // the button rests at right-4 (52px wide), so its centre is offset from there by the drag
  const left = innerWidth * zoom - 42 + fabPos.x > (innerWidth * zoom) / 2;

  useEffect(() => {
    x.set(fabPos.x);
    y.set(fabPos.y);
  }, [fabPos, x, y]);
  useEffect(() => scale.set(fabScale), [fabScale, scale]);

  // drag the grip up to grow, down to shrink; the owl scales around its own centre
  const startResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const start = scale.get();
    const move = (ev: PointerEvent) =>
      scale.set(Math.min(1.8, Math.max(0.6, start + ((startY - ev.clientY) * zoom) / 100)));
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      setFabScale(scale.get());
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

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
        <MotionConfig transformPagePoint={toFab}>
          <motion.div
            drag
            dragConstraints={bounds}
            dragMomentum={false}
            dragElastic={0}
            style={{ x, y, scale, zoom: 1 / zoom }}
            onPointerDown={() => (dragged.current = false)}
            onDragStart={() => (dragged.current = true)}
            onDragEnd={() => setFabPos({ x: x.get(), y: y.get() })}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
            <button
              type="button"
              aria-label="Resize. Drag up to grow, down to shrink."
              title="Drag up/down to resize"
              onPointerDown={startResize}
              className="absolute -top-1 -right-1 flex size-5 cursor-ns-resize touch-none items-center justify-center rounded-full border border-white/15 bg-[#0b0b0e] text-white/70 opacity-0 transition-opacity outline-none hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Scaling className="size-3" />
            </button>
            {collapsed && (
              <button
                type="button"
                aria-label="Show focus bar"
                title="Show focus bar"
                onClick={() => setCollapsed(false)}
                // a little tab in the owl's own colours, tucked against its side, so it shows on light and dark pages
                className={`absolute top-1/2 flex h-7 w-4 -translate-y-1/2 cursor-pointer items-center justify-center border border-(--ollie-cyan)/30 bg-[#15172b] text-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.35)] outline-none transition-colors hover:text-white focus-visible:text-white ${left ? "-left-3.5 rounded-l-full border-r-0" : "-right-3.5 rounded-r-full border-l-0"}`}
              >
                {left ? (
                  <ChevronLeft className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            )}
            {/* stays mounted while collapsed so expanding shows it already loaded */}
            <FabCard left={left} hidden={collapsed} onCollapse={() => setCollapsed(true)} />
          </motion.div>
        </MotionConfig>
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
  for (const type of ["keydown", "keyup", "keypress"])
    host.addEventListener(type, (e) => e.stopPropagation());
  document.documentElement.append(host);
  createRoot(mount).render(<Overlay />);
}
