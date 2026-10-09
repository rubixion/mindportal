// 21st.dev wensity/calendar, trimmed to single-select + event dots (the only modes MindPortal uses),
// framer-motion -> motion/react, tabler -> lucide, coloured for Ollie.
import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isSameDay(a?: Date, b?: Date) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function buildMonthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const navBtn =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-white/50 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)/60";

export function Calendar({
  selected,
  onSelect,
  eventDates,
  className,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  /** Dates (YYYY-MM-DD local) with an event dot. */
  eventDates: Set<string>;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const [month, setMonthState] = React.useState(() => startOfDay(selected));
  const [view, setView] = React.useState<"days" | "months">("days");
  const [direction, setDirection] = React.useState(1);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const pendingFocus = React.useRef<Date | null>(null);

  React.useEffect(() => {
    if (!pendingFocus.current) return;
    const key = pendingFocus.current.toDateString();
    pendingFocus.current = null;
    (gridRef.current?.querySelector(`[data-date-key="${key}"]`) as HTMLElement | null)?.focus();
  }, [month]);

  // follow the selection when it's moved from outside (e.g. a "Today" button)
  React.useEffect(() => {
    setMonthState((m) => (isSameMonth(m, selected) ? m : new Date(selected.getFullYear(), selected.getMonth(), 1)));
  }, [selected]);

  const setMonth = (next: Date, dir: number) => {
    setDirection(dir);
    setMonthState(next);
  };

  const grid = React.useMemo(() => buildMonthGrid(month), [month]);
  const focusable = isSameMonth(selected, month) ? selected : isSameMonth(today, month) ? today : new Date(month.getFullYear(), month.getMonth(), 1);
  const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <div className={cn("w-full select-none rounded-2xl border border-(--border) bg-(--card) p-3", className)}>
      <div className="sr-only" aria-live="polite">{`${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}`}</div>
      <div className="mb-2 flex items-center justify-between gap-1">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1), -1)} className={navBtn}>
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Show month picker"
          onClick={() => setView(view === "days" ? "months" : "days")}
          className={cn(
            "cursor-pointer rounded-[10px] px-2 py-1 text-[13px] font-medium tracking-[-0.01em] text-white outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)/60",
            view === "months" && "bg-white/[0.06]",
          )}
        >
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </button>
        <button type="button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1), 1)} className={navBtn}>
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          {view === "days" ? (
            <motion.div
              key={`${month.getFullYear()}-${month.getMonth()}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction * 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -12 }}
              transition={{ duration: reduced ? 0.12 : 0.18, ease: EASE_OUT }}
            >
              <div className="mb-1 grid grid-cols-7">
                {WEEKDAYS.map((l) => (
                  <div key={l} className="flex h-7 items-center justify-center text-[11px] font-medium text-white/40">{l}</div>
                ))}
              </div>
              <div
                ref={gridRef}
                role="grid"
                className="grid grid-cols-7 gap-y-0.5"
                onKeyDown={(e) => {
                  const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                  if (!(e.key in deltas)) return;
                  e.preventDefault();
                  const target = new Date((e.target as HTMLElement).dataset["date"] ?? "");
                  target.setDate(target.getDate() + deltas[e.key]!);
                  if (!isSameMonth(target, month)) {
                    pendingFocus.current = target;
                    setMonth(new Date(target.getFullYear(), target.getMonth(), 1), target < month ? -1 : 1);
                    return;
                  }
                  (gridRef.current?.querySelector(`[data-date-key="${target.toDateString()}"]`) as HTMLElement | null)?.focus();
                }}
              >
                {grid.map((date) => {
                  const outside = !isSameMonth(date, month);
                  const isSel = isSameDay(date, selected);
                  const isToday = isSameDay(date, today);
                  const hasEvent = eventDates.has(keyOf(date));
                  return (
                    <div key={date.toISOString()} role="gridcell" aria-selected={isSel || undefined} className="relative flex h-8 items-center justify-center">
                      <button
                        type="button"
                        aria-label={date.toDateString() + (hasEvent ? ", has events" : "")}
                        data-date={date.toISOString()}
                        data-date-key={date.toDateString()}
                        tabIndex={isSameDay(date, focusable) ? 0 : -1}
                        onClick={() => onSelect(date)}
                        className={cn(
                          "relative flex size-8 cursor-pointer items-center justify-center rounded-full text-[13px] tabular-nums outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)/60",
                          outside ? "text-white/25" : "text-white/85",
                          !isSel && "hover:bg-white/[0.06]",
                          isSel && "bg-(--ollie-cyan) font-semibold text-black",
                          isToday && !isSel && "border border-(--ollie-cyan)/50 font-semibold",
                        )}
                      >
                        {date.getDate()}
                        {hasEvent && <span className={cn("absolute bottom-0.5 size-1 rounded-full", isSel ? "bg-black/70" : "bg-(--ollie-cyan)")} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="months"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
              className="grid grid-cols-3 gap-1 py-1"
            >
              {MONTH_NAMES.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setMonth(new Date(month.getFullYear(), i, 1), 1);
                    setView("days");
                  }}
                  className={cn(
                    "flex h-10 cursor-pointer items-center justify-center rounded-[10px] text-[13px] text-white/85 outline-none transition-colors hover:bg-white/[0.06]",
                    i === month.getMonth() && "bg-(--ollie-cyan) text-black",
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
