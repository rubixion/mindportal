import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, useMotionValue } from "motion/react";
import { X } from "lucide-react";
import css from "../panel/styles.css?inline";
import { Panel } from "../panel/Panel";
import { Ollie } from "../panel/components/ollie";
import { useStored } from "../panel/lib/utils";
import { DEFAULT_SETTINGS } from "../shared/defaults";
import type { Settings } from "../shared/types";

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
