import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "motion/react";
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

function Overlay() {
  const [open, setOpen] = useState(false);
  const [settings] = useStored<Settings>("settings", DEFAULT_SETTINGS);
  const showFab = settings.showOverlayButton ?? true;
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const t = () => setOpen((o) => !o);
    bus.addEventListener("toggle", t);
    return () => bus.removeEventListener("toggle", t);
  }, []);

  return (
    <>
      {showFab && !open && (
        <motion.button
          type="button"
          aria-label="Open MindPortal (Alt+M)"
          title="MindPortal (Alt+M)"
          onClick={() => setOpen(true)}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="fixed right-4 bottom-4 flex size-[52px] cursor-pointer items-center justify-center rounded-full border border-(--ollie-cyan)/30 bg-[#15172b] shadow-[0_8px_30px_rgba(0,0,0,0.45),0_0_0_4px_var(--ollie-glow)] outline-none focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)"
        >
          <Ollie size={30} />
        </motion.button>
      )}
      <Panel open={open} onClose={close} />
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
