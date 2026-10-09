import { useState } from "react";
import { Check, Flame, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, habitStreak, localDate, uid, useStored } from "@/lib/utils";
import type { Habit } from "../../shared/types";

const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d;
  });

export function Habits() {
  const [habits, setHabits] = useStored<Habit[]>("habits", []);
  const [name, setName] = useState("");
  const week = lastDays(7);

  const toggle = (id: string, day: string) =>
    setHabits((all) => all.map((h) => (h.id !== id ? h : { ...h, days: h.days.includes(day) ? h.days.filter((d) => d !== day) : [...h.days, day] })));

  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setHabits((all) => [...all, { id: uid(), name: name.trim(), days: [] }]);
        setName("");
      }}>
        <input className="mp-input" placeholder="New habit, e.g. Read 20 minutes" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0" aria-label="Add habit"><Plus className="size-4" /></Button>
      </form>

      {habits.length === 0 && <p className="py-8 text-center text-sm text-white/40">Build a habit one tick at a time.</p>}

      {habits.map((h) => {
        const streak = habitStreak(h.days);
        return (
          <div key={h.id} className="mp-card group space-y-3 p-3">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{h.name}</span>
              <span className="inline-flex items-center gap-1 text-xs text-orange-300"><Flame className="size-3" />{streak}</span>
              <button type="button" aria-label={`Delete ${h.name}`} onClick={() => setHabits((all) => all.filter((x) => x.id !== h.id))}
                className="cursor-pointer rounded p-1 text-white/30 opacity-0 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"><Trash2 className="size-3.5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {week.map((d) => {
                const key = localDate(d);
                const on = h.days.includes(key);
                const isToday = key === localDate();
                return (
                  <button key={key} type="button" aria-pressed={on} aria-label={`${h.name} on ${d.toDateString()}`} onClick={() => toggle(h.id, key)}
                    className={cn("flex cursor-pointer flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] transition-colors",
                      on ? "bg-(--ollie-cyan) text-black" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.08]",
                      isToday && !on && "ring-1 ring-(--ollie-cyan)/50")}>
                    {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                    {on ? <Check className="size-3" /> : <span className="text-[11px] tabular-nums">{d.getDate()}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
