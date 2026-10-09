import { useEffect, type ComponentType, type RefObject } from "react";
import { AnimatePresence, motion, useDragControls, useMotionValue } from "motion/react";
import { Bookmark, CalendarDays, Globe, GripVertical, ListChecks, NotebookPen, Repeat, Settings as Gear, Sun, X } from "lucide-react";
import { ExpandableTabs, type ExpandableTab } from "@/components/ui/expandable-tabs";
import { Button } from "@/components/ui/button";
import { Ollie } from "@/components/ollie";
import { useStored } from "@/lib/utils";
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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
          style={{ x, y }}
          onDragEnd={() => setPos({ x: x.get(), y: y.get() })}
          className="fixed right-3 top-3 h-[min(780px,calc(100vh-24px))] w-[400px] max-w-[calc(100vw-24px)]"
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
            title="Drag to move · double-click to reset"
            onPointerDown={(e) => { if (!(e.target as HTMLElement).closest("button")) drag.start(e); }}
            onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest("button")) setPos({ x: 0, y: 0 }); }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
