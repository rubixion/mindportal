import { useMemo, useState } from "react";
import { Bell, BellOff, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { localDate, parseLocalDate, uid, useStored } from "@/lib/utils";
import type { CalEvent } from "../../shared/types";

/** Pre-filled Google Calendar "new event" link, for people who want it in their real calendar too. */
function googleLink(e: CalEvent) {
  const d = e.date.replaceAll("-", "");
  let dates = `${d}/${localDate(new Date(parseLocalDate(e.date).getTime() + 86_400_000)).replaceAll("-", "")}`;
  if (e.time) {
    const [h, m] = e.time.split(":").map(Number);
    const start = parseLocalDate(e.date);
    start.setHours(h!, m!);
    const end = new Date(start.getTime() + 3_600_000);
    const fmt = (x: Date) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    dates = `${fmt(start)}/${fmt(end)}`;
  }
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${dates}`;
}

export function Agenda() {
  const [events, setEvents] = useStored<CalEvent[]>("events", []);
  const [selected, setSelected] = useState(new Date());
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [remind, setRemind] = useState(true);

  const key = localDate(selected);
  const eventDates = useMemo(() => new Set(events.map((e) => e.date)), [events]);
  const dayEvents = events.filter((e) => e.date === key).sort((a, b) => a.time.localeCompare(b.time));
  const todayKey = localDate();
  const upcoming = events
    .filter((e) => e.date > todayKey)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);

  const add = () => {
    const t = title.trim();
    if (!t) return;
    setEvents((all) => [...all, { id: uid(), title: t, date: key, time, remind: remind && !!time }]);
    setTitle("");
    setTime("");
  };

  const row = (e: CalEvent, showDate = false) => (
    <li key={e.id} className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
      <span className="w-12 shrink-0 text-xs tabular-nums text-(--ollie-cyan)">
        {showDate ? parseLocalDate(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : e.time || "All day"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-white/85">{e.title}</span>
      {e.remind && <Bell className="size-3 shrink-0 text-white/35" aria-label="Reminder on" />}
      <a href={googleLink(e)} target="_blank" rel="noreferrer" aria-label="Add to Google Calendar" title="Add to Google Calendar"
        className="rounded p-1 text-white/30 opacity-0 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"><ExternalLink className="size-3.5" /></a>
      <button type="button" aria-label={`Delete ${e.title}`} onClick={() => setEvents((all) => all.filter((x) => x.id !== e.id))}
        className="cursor-pointer rounded p-1 text-white/30 opacity-0 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"><Trash2 className="size-3.5" /></button>
    </li>
  );

  return (
    <div className="space-y-3">
      <Calendar selected={selected} onSelect={setSelected} eventDates={eventDates} />

      <div className="mp-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="mp-label">{selected.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
          {key !== todayKey && <button type="button" className="cursor-pointer text-xs text-(--ollie-cyan) hover:underline" onClick={() => setSelected(new Date())}>Today</button>}
        </div>
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input className="mp-input" placeholder="Add an event" value={title} onChange={(e) => setTitle(e.target.value)} />
          {/* picker and the month view above share the selected day */}
          <DatePicker value={selected} onChange={setSelected} time={time} onTimeChange={setTime} eventDates={eventDates} />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-9 shrink-0" aria-pressed={remind && !!time} disabled={!time}
              title={time ? "Notify me at this time" : "Pick a time to get a reminder"} onClick={() => setRemind(!remind)}>
              {remind && time ? <Bell className="size-4 text-(--ollie-cyan)" /> : <BellOff className="size-4" />}
              {remind && time ? "Remind me" : "No reminder"}
            </Button>
            <Button type="submit" className="flex-1"><Plus className="size-4" /> Add event</Button>
          </div>
        </form>
        {dayEvents.length ? <ul>{dayEvents.map((e) => row(e))}</ul> : <p className="py-2 text-center text-sm text-white/40">Nothing planned.</p>}
      </div>

      {upcoming.length > 0 && (
        <div className="mp-card">
          <span className="mp-label">Coming up</span>
          <ul className="mt-2">{upcoming.map((e) => row(e, true))}</ul>
        </div>
      )}
    </div>
  );
}
