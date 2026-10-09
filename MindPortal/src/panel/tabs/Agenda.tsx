import { useCallback, useState } from "react";
import { Bell, ChevronDown, ExternalLink, MapPin, Pencil, Plus, Repeat as RepeatIcon, StickyNote, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar } from "@/components/ui/calendar";
import { DatePicker } from "@/components/ui/date-picker";
import { Dropdown } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { cn, localDate, parseLocalDate, uid, useStored } from "@/lib/utils";
import { addDays, nextOccurrence, occursOn, REMINDER_OPTIONS, REPEAT_LABELS, timeRange } from "../../shared/events";
import type { CalEvent, Repeat } from "../../shared/types";

const RRULE: Record<Repeat, string> = {
  none: "",
  daily: "RRULE:FREQ=DAILY",
  weekdays: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  weekly: "RRULE:FREQ=WEEKLY",
  monthly: "RRULE:FREQ=MONTHLY",
  yearly: "RRULE:FREQ=YEARLY",
};

/** Pre-filled Google Calendar "new event" link, for people who want it in their real calendar too. */
function googleLink(e: CalEvent) {
  let dates = `${e.date.replaceAll("-", "")}/${addDays(e.date, 1).replaceAll("-", "")}`;
  if (e.time) {
    const fmt = (key: string, t: string) => {
      const d = parseLocalDate(key);
      const [h, m] = t.split(":").map(Number);
      d.setHours(h!, m!);
      return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    };
    const end = e.endTime && e.endTime > e.time ? e.endTime : `${String(Math.min(23, Number(e.time.slice(0, 2)) + 1)).padStart(2, "0")}${e.time.slice(2)}`;
    dates = `${fmt(e.date, e.time)}/${fmt(e.date, end)}`;
  }
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates });
  if (e.location) q.set("location", e.location);
  if (e.notes) q.set("details", e.notes);
  if (e.repeat && e.repeat !== "none") q.set("recur", RRULE[e.repeat]);
  return `https://calendar.google.com/calendar/render?${q}`;
}

const plusHour = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h! >= 23 ? "23:55" : `${String(h! + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

type Draft = Omit<CalEvent, "id" | "date" | "remind"> & { reminder: number };
const EMPTY: Draft = { title: "", time: "", endTime: "", reminder: 0, repeat: "none", location: "", notes: "" };

export function Agenda() {
  const [events, setEvents] = useStored<CalEvent[]>("events", []);
  const [selected, setSelected] = useState(new Date());
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [more, setMore] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const key = localDate(selected);
  const todayKey = localDate();
  const hasEvent = useCallback((k: string) => events.some((e) => occursOn(e, k)), [events]);
  const dayEvents = events.filter((e) => occursOn(e, key)).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = events
    .map((e) => ({ e, on: nextOccurrence(e, addDays(todayKey, 1)) }))
    .filter((x): x is { e: CalEvent; on: string } => !!x.on)
    .sort((a, b) => (a.on + a.e.time).localeCompare(b.on + b.e.time))
    .slice(0, 6);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const setTimes = (start: string, end: string) => {
    // keep the end after the start; default to a one-hour event
    if (start && (!end || end <= start)) end = plusHour(start);
    setDraft((d) => ({ ...d, time: start, endTime: start ? end : "", reminder: !start && d.reminder > 0 && d.reminder < 1440 ? 0 : d.reminder }));
  };

  const reset = () => {
    setDraft(EMPTY);
    setEditingId(null);
    setMore(false);
  };

  const save = () => {
    const title = draft.title.trim();
    if (!title) return;
    const { reminder, ...rest } = draft;
    const fields = {
      ...rest,
      title,
      location: rest.location?.trim(),
      notes: rest.notes?.trim(),
      remind: reminder >= 0,
      remindBefore: Math.max(0, reminder),
    };
    if (editingId) setEvents((all) => all.map((e) => (e.id === editingId ? { ...e, ...fields, date: key } : e)));
    else setEvents((all) => [...all, { id: uid(), date: key, ...fields }]);
    reset();
  };

  const edit = (e: CalEvent) => {
    setEditingId(e.id);
    setSelected(parseLocalDate(e.date));
    setDraft({
      title: e.title,
      time: e.time,
      endTime: e.endTime ?? "",
      reminder: e.remind ? (e.remindBefore ?? 0) : -1,
      repeat: e.repeat ?? "none",
      location: e.location ?? "",
      notes: e.notes ?? "",
    });
    setMore(!!(e.location || e.notes || (e.repeat && e.repeat !== "none")));
  };

  const row = (e: CalEvent, on?: string) => (
    <li key={e.id + (on ?? "")} className={cn("group rounded-lg px-2 py-2 hover:bg-white/[0.03]", editingId === e.id && "bg-(--ollie-cyan)/10")}>
      <div className="flex items-center gap-2">
        <span className="w-[74px] shrink-0 text-[11px] leading-tight tabular-nums text-(--ollie-cyan)">
          {on ? parseLocalDate(on).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : timeRange(e)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-white/85">{e.title}</span>
        {e.repeat && e.repeat !== "none" && <RepeatIcon className="size-3 shrink-0 text-white/35" aria-label={REPEAT_LABELS[e.repeat]} />}
        {e.remind && <Bell className="size-3 shrink-0 text-white/35" aria-label="Reminder on" />}
        <button type="button" aria-label={`Edit ${e.title}`} onClick={() => edit(e)}
          className="cursor-pointer rounded p-1 text-white/30 opacity-0 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"><Pencil className="size-3.5" /></button>
        <a href={googleLink(e)} target="_blank" rel="noreferrer" aria-label="Add to Google Calendar" title="Add to Google Calendar"
          className="rounded p-1 text-white/30 opacity-0 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"><ExternalLink className="size-3.5" /></a>
        <button type="button" aria-label={`Delete ${e.title}`} title={e.repeat && e.repeat !== "none" ? "Delete all repeats" : "Delete"}
          onClick={() => { setEvents((all) => all.filter((x) => x.id !== e.id)); if (editingId === e.id) reset(); }}
          className="cursor-pointer rounded p-1 text-white/30 opacity-0 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"><Trash2 className="size-3.5" /></button>
      </div>
      {(e.location || e.notes || on) && (
        <div className="mt-1 space-y-0.5 pl-[82px] text-[11px] text-white/45">
          {on && <div>{timeRange(e)}</div>}
          {e.location && <div className="flex items-center gap-1 truncate"><MapPin className="size-3 shrink-0" />{e.location}</div>}
          {e.notes && <div className="flex gap-1"><StickyNote className="mt-px size-3 shrink-0" /><span className="line-clamp-2 whitespace-pre-line">{e.notes}</span></div>}
        </div>
      )}
    </li>
  );

  const field = "mp-input py-1.5 text-[13px]";

  return (
    <div className="space-y-3">
      <Calendar selected={selected} onSelect={setSelected} hasEvent={hasEvent} />

      <div className="mp-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="mp-label">{selected.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
          {key !== todayKey && <button type="button" className="cursor-pointer text-xs text-(--ollie-cyan) hover:underline" onClick={() => setSelected(new Date())}>Today</button>}
        </div>

        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <input className="mp-input" placeholder={editingId ? "Event title" : "Add an event"} value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
          {/* the picker and the month view above share the selected day */}
          <DatePicker value={selected} onChange={setSelected} time={draft.time} endTime={draft.endTime ?? ""} onTimeChange={setTimes} hasEvent={hasEvent} />

          <button type="button" aria-expanded={more} onClick={() => setMore(!more)}
            className="flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 text-xs font-medium text-white/55 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)/60">
            <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} />
            More options
            <span className="truncate text-white/30">
              {[draft.repeat !== "none" && REPEAT_LABELS[draft.repeat!], draft.location, draft.notes && "notes"].filter(Boolean).join(" · ")}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {more && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }} className="space-y-2">
                <Dropdown label="Repeat" icon={<RepeatIcon className="size-3.5" />} value={draft.repeat ?? "none"}
                  onChange={(v) => patch({ repeat: v as Repeat })}
                  items={(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => ({ value: r, label: REPEAT_LABELS[r] }))} />
                <Dropdown label="Reminder" icon={<Bell className="size-3.5" />} value={String(draft.reminder)}
                  onChange={(v) => patch({ reminder: Number(v) })}
                  items={REMINDER_OPTIONS.map((o) => ({
                    value: String(o.value),
                    // all-day events remind relative to 9 AM on the day
                    label: !draft.time && o.value === 0 ? "On the day (9 AM)" : !draft.time && o.value === 1440 ? "Day before (9 AM)" : o.label,
                  })).filter((o) => draft.time || ["-1", "0", "1440"].includes(o.value))} />
                <label className="flex items-center gap-2">
                  <MapPin className="size-3.5 shrink-0 text-white/40" />
                  <input className={field} placeholder="Add location" value={draft.location} maxLength={200} onChange={(e) => patch({ location: e.target.value })} />
                </label>
                <label className="flex gap-2">
                  <StickyNote className="mt-2 size-3.5 shrink-0 text-white/40" />
                  <textarea className={cn(field, "min-h-[64px] resize-y")} placeholder="Add notes" value={draft.notes} maxLength={2000} onChange={(e) => patch({ notes: e.target.value })} />
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            {editingId && <Button variant="ghost" onClick={reset}>Cancel</Button>}
            <Button type="submit" className="flex-1">
              {editingId ? <>Save changes</> : <><Plus className="size-4" /> Add event</>}
            </Button>
          </div>
        </form>

        {dayEvents.length ? <ul>{dayEvents.map((e) => row(e))}</ul> : <p className="py-2 text-center text-sm text-white/40">Nothing planned.</p>}
      </div>

      {upcoming.length > 0 && (
        <div className="mp-card">
          <span className="mp-label">Coming up</span>
          <ul className="mt-2">{upcoming.map(({ e, on }) => row(e, on))}</ul>
        </div>
      )}
    </div>
  );
}
