import { useEffect, useState, type ComponentType, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { AnimatePresence, motion, useDragControls, useMotionValue } from "motion/react";
import { Bookmark, CalendarDays, Globe, GripVertical, ListChecks, NotebookPen, Repeat, Settings as Gear, Sun, X } from "lucide-react";
import { ExpandableTabs, type ExpandableTab } from "@/components/ui/expandable-tabs";
import { Button } from "@/components/ui/button";
import { Ollie } from "@/components/ollie";
import { popups, useStored } from "@/lib/utils";
import { Today } from "./tabs/Today";
import { Notes } from "./tabs/Notes";
import { Lists } from "./tabs/Lists";
import { Agenda } from "./tabs/Agenda";
import { Habits } from "./tabs/Habits";
import { Saved } from "./tabs/Saved";
import { Sites } from "./tabs/Sites";
import { Settings } from "./tabs/Settings";

const TABS: ExpandableTab[] = [
  { id: "today", label: "Today", icon: <Sun className="size-4" /> },
  { id: "notes", label: "Notes", icon: <NotebookPen className="size-4" /> },
  { id: "lists", label: "Lists", icon: <ListChecks className="size-4" /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays className="size-4" /> },
  { id: "habits", label: "Habits", icon: <Repeat className="size-4" /> },
  { id: "saved", label: "Saved", icon: <Bookmark className="size-4" /> },
  { id: "sites", label: "Sites", icon: <Globe className="size-4" /> },
];

const DEFAULT_SIZE = { w: 400, h: 780 };
const MIN_SIZE = { w: 320, h: 380 };

const VIEWS: Record<string, ComponentType> = {
  today: Today,
  notes: Notes,
  lists: Lists,
  calendar: Agenda,
  habits: Habits,
  saved: Saved,
  sites: Sites,
  settings: Settings,
};

export function Panel({ open, onClose, bounds }: { open: boolean; onClose: () => void; bounds: RefObject<HTMLDivElement | null> }) {
  const [tab, setTab] = useStored("panelTab", "today");
  const [pos, setPos] = useStored("panelPos", { x: 0, y: 0 });
  const drag = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  useEffect(() => {
    x.set(pos.x);
    y.set(pos.y);
  }, [pos, x, y]);
  const View = VIEWS[tab] ?? Today;

  // resizing: the panel is anchored top-right, so it grows from its left and bottom edges
  const [size, setSize] = useStored("panelSize", DEFAULT_SIZE);
  const [live, setLive] = useState<{ w: number; h: number } | null>(null);
  const cur = live ?? size;

  const startResize = (e: ReactPointerEvent<HTMLDivElement>, horiz: boolean, vert: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { ...cur };
    let latest = start;
    // keep the panel on screen wherever it has been dragged to
    const maxW = innerWidth - 24 + x.get();
    const maxH = innerHeight - 24 - y.get();
    const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(Math.max(v, lo), Math.max(lo, hi)));
    const move = (ev: PointerEvent) => {
      latest = {
        w: horiz ? clamp(start.w + (sx - ev.clientX), MIN_SIZE.w, maxW) : start.w,
        h: vert ? clamp(start.h + (ev.clientY - sy), MIN_SIZE.h, maxH) : start.h,
      };
      setLive(latest);
    };
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      setSize(latest);
      setLive(null);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && popups.open === 0 && onClose();
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mp-panel"
          drag
          dragListener={false}
          dragControls={drag}
          dragConstraints={bounds}
          dragMomentum={false}
          dragElastic={0}
          onDragEnd={() => setPos({ x: x.get(), y: y.get() })}
          className="fixed right-3 top-3"
          style={{ x, y, width: `min(${cur.w}px, calc(100vw - 24px))`, height: `min(${cur.h}px, calc(100vh - 24px))` }}
        >
        <motion.aside
          role="dialog"
          aria-label="MindPortal"
          initial={{ x: "105%" }}
          animate={{ x: 0 }}
          exit={{ x: "105%" }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.08 }}
          className="flex size-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-(--ollie-bg)/95 font-sans text-white shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgb(100_130_210/0.08)] backdrop-blur-xl"
        >
          <header
            className="flex cursor-grab touch-none items-center gap-2 px-4 pt-3.5 pb-2 active:cursor-grabbing"
            title="Drag to move · double-click to reset size and position"
            onPointerDown={(e) => { if (!(e.target as HTMLElement).closest("button")) drag.start(e); }}
            onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest("button")) { setPos({ x: 0, y: 0 }); setSize(DEFAULT_SIZE); } }}
          >
            <GripVertical className="-ml-2 size-3.5 text-white/25" aria-hidden />
            <Ollie size={26} />
            <span className="text-[15px] font-bold tracking-tight">MindPortal</span>
            <span className="flex-1" />
            <Button variant="ghost" size="icon" aria-label="Settings" title="Settings" aria-pressed={tab === "settings"}
              onClick={() => setTab(tab === "settings" ? "today" : "settings")}>
              <Gear className={tab === "settings" ? "size-4 text-(--ollie-cyan)" : "size-4"} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Close panel (Esc)" title="Close (Esc)" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </header>
          <nav className="px-3 pb-2">
            <ExpandableTabs tabs={TABS} value={tab} onChange={setTab} className="w-full justify-between" />
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-1">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="h-full">
              <View />
            </motion.div>
          </div>
        </motion.aside>
          {/* resize handles */}
          <div aria-hidden title="Drag to resize" onPointerDown={(e) => startResize(e, true, false)}
            className="absolute -left-1 top-6 bottom-6 w-2.5 cursor-ew-resize touch-none" />
          <div aria-hidden title="Drag to resize" onPointerDown={(e) => startResize(e, false, true)}
            className="absolute -bottom-1 left-6 right-6 h-2.5 cursor-ns-resize touch-none" />
          <div aria-hidden title="Drag to resize" onPointerDown={(e) => startResize(e, true, true)}
            className="group absolute -bottom-1 -left-1 size-5 cursor-nesw-resize touch-none">
            <span className="absolute bottom-2 left-2 size-2.5 rounded-bl-[5px] border-b-2 border-l-2 border-white/25 transition-colors group-hover:border-(--ollie-cyan)" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
