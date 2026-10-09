// 21st.dev wensity/date-picker, adapted for MindPortal:
// - single-date mode only, reusing our trimmed wensity Calendar
// - base-ui Popover swapped for an inline popup (a portal to document.body would escape the overlay's shadow root and lose its styles)
// - time row gains an "All day" option; tabler -> lucide; Ollie colours
import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn, usePopup } from "@/lib/utils";
import { Dropdown } from "@/components/ui/dropdown";
import { timeRange } from "../../../shared/events";

export interface DatePreset {
  label: string;
  getValue: () => Date;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const formatDate = (d: Date) => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function inDays(n: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + n);
  return d;
}

const DEFAULT_PRESETS: DatePreset[] = [
  { label: "Today", getValue: () => inDays(0) },
  { label: "Tomorrow", getValue: () => inDays(1) },
  { label: "This weekend", getValue: () => inDays((6 - new Date().getDay() + 7) % 7) },
  { label: "Next Monday", getValue: () => inDays(((1 - new Date().getDay() + 7) % 7) || 7) },
  { label: "In a week", getValue: () => inDays(7) },
];


const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${i % 12 || 12} ${i < 12 ? "AM" : "PM"}` }));
const minuteItems = (current: number) =>
  Array.from({ length: 12 }, (_, i) => i * 5)
    .concat(current % 5 ? [current] : [])
    .sort((a, b) => a - b)
    .map((i) => ({ value: String(i), label: String(i).padStart(2, "0") }));

function HourMinute({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(":").map(Number);
  const set = (hh: number, mm: number) => onChange(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="w-10 text-white/45">{label}</span>
      <Dropdown size="sm" label={`${label} hour`} value={String(h)} onChange={(v) => set(Number(v), m!)}
        items={HOURS} className="w-[74px]" />
      <span className="text-white/40">:</span>
      <Dropdown size="sm" label={`${label} minute`} value={String(m)} onChange={(v) => set(h!, Number(v))}
        items={minuteItems(m!)} className="w-[58px]" />
    </div>
  );
}

/** Start/end "HH:MM", or "" for all day. */
function TimePicker({ start, end, onChange }: { start: string; end: string; onChange: (start: string, end: string) => void }) {
  return (
    <div className="space-y-2 border-t border-white/10 pt-2.5">
      <div className="flex items-center gap-1.5">
        <Clock className="size-3.5 shrink-0 text-white/40" />
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/70">
          <input type="checkbox" className="accent-(--ollie-cyan)" checked={!start}
            onChange={(e) => (e.target.checked ? onChange("", "") : onChange("09:00", "10:00"))} />
          All day
        </label>
      </div>
      {start && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 pl-5">
          <HourMinute label="Starts" value={start} onChange={(v) => onChange(v, end)} />
          <HourMinute label="Ends" value={end || start} onChange={(v) => onChange(start, v)} />
        </div>
      )}
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  time,
  endTime = "",
  onTimeChange,
  hasEvent,
  presets = DEFAULT_PRESETS,
  className,
}: {
  value: Date;
  onChange: (d: Date) => void;
  /** "HH:MM" or "" for all day. Omit the time props to hide the time row. */
  time?: string;
  endTime?: string;
  onTimeChange?: (start: string, end: string) => void;
  hasEvent?: (key: string) => boolean;
  presets?: DatePreset[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  usePopup(open);
  const root = React.useRef<HTMLDivElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);

  // the picker can open near the bottom of the scrolling panel, so bring it fully into view
  React.useEffect(() => {
    if (open) requestAnimationFrame(() => popup.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }, [open]);
  const hasTime = time !== undefined && !!onTimeChange;

  // click outside / Escape closes (composedPath so it works inside a shadow root)
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !e.composedPath().includes(root.current)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const label = formatDate(value) + (hasTime ? ` · ${timeRange({ time: time!, endTime })}` : "");

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition-colors",
          "hover:border-white/20 focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)/60",
          open && "border-(--ollie-cyan)/60",
        )}
      >
        <span className="truncate">{label}</span>
        <CalendarDays className="size-4 shrink-0 text-white/45" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popup}
            role="dialog"
            aria-label="Choose a date"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-x-0 top-full z-50 mt-1.5 min-w-[272px] origin-top rounded-2xl border border-white/10 bg-[#121218] p-3 shadow-[0_18px_48px_-12px_rgba(0,0,0,0.7)]"
          >
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onChange(p.getValue());
                    if (!hasTime) setOpen(false);
                  }}
                  className="cursor-pointer rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)/60"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="space-y-2.5">
              <Calendar
                selected={value}
                onSelect={(d) => {
                  onChange(d);
                  if (!hasTime) setOpen(false);
                }}
                hasEvent={hasEvent}
                className="border-0 bg-transparent p-0"
              />
              {hasTime && <TimePicker start={time!} end={endTime} onChange={onTimeChange!} />}
            </div>
            {hasTime && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2.5 w-full cursor-pointer rounded-lg bg-(--ollie-cyan) py-1.5 text-xs font-bold text-black hover:bg-(--ollie-cyan)/90"
              >
                Done
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
