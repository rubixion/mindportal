import { useState } from "react";
import { Plus, Trash2, X, Eraser } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedCheckbox } from "@/components/ui/animated-checkbox";
import { Button } from "@/components/ui/button";
import { cn, uid, useStored } from "@/lib/utils";
import type { TodoList } from "../../shared/types";

const STARTER: TodoList[] = [{ id: "today", name: "To-do", items: [] }];

export function Lists() {
  const [lists, setLists] = useStored<TodoList[]>("lists", STARTER);
  const [activeId, setActiveId] = useState<string>("");
  const [text, setText] = useState("");
  const [newList, setNewList] = useState<string | null>(null);

  const all = lists.length ? lists : STARTER;
  const list = all.find((l) => l.id === activeId) ?? all[0]!;
  const update = (fn: (l: TodoList) => TodoList) => setLists((ls) => (ls.length ? ls : STARTER).map((l) => (l.id === list.id ? fn(l) : l)));

  const addItem = () => {
    const t = text.trim();
    if (!t) return;
    update((l) => ({ ...l, items: [...l.items, { id: uid(), text: t, done: false }] }));
    setText("");
  };

  const createList = () => {
    const name = newList?.trim();
    if (!name) return setNewList(null);
    const l: TodoList = { id: uid(), name, items: [] };
    setLists((ls) => [...(ls.length ? ls : STARTER), l]);
    setActiveId(l.id);
    setNewList(null);
  };

  const deleteList = () => {
    setLists((ls) => ls.filter((l) => l.id !== list.id));
    setActiveId("");
  };

  const done = list.items.filter((i) => i.done).length;
  const pct = list.items.length ? (done / list.items.length) * 100 : 0;
  const sorted = [...list.items.filter((i) => !i.done), ...list.items.filter((i) => i.done)];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {all.map((l) => (
          <button key={l.id} type="button" onClick={() => setActiveId(l.id)}
            className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors",
              l.id === list.id ? "border-(--ollie-cyan)/50 bg-(--ollie-cyan)/15 text-white" : "border-white/10 text-white/55 hover:text-white")}>
            {l.name} <span className="text-white/35">{l.items.filter((i) => !i.done).length}</span>
          </button>
        ))}
        {newList === null ? (
          <button type="button" onClick={() => setNewList("")} aria-label="New list"
            className="cursor-pointer rounded-full border border-dashed border-white/15 p-1.5 text-white/50 hover:text-white"><Plus className="size-3" /></button>
        ) : (
          <input autoFocus className="mp-input h-7 w-32 py-1 text-xs" placeholder="List name" value={newList}
            onChange={(e) => setNewList(e.target.value)} onBlur={createList}
            onKeyDown={(e) => { if (e.key === "Enter") createList(); if (e.key === "Escape") setNewList(null); }} />
        )}
      </div>

      <div className="mp-card space-y-3">
        <div className="flex items-center gap-2">
          <input className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none" value={list.name}
            aria-label="List name" onChange={(e) => update((l) => ({ ...l, name: e.target.value }))} />
          <span className="text-xs tabular-nums text-white/40">{done}/{list.items.length}</span>
          {all.length > 1 && <Button variant="ghost" size="icon" aria-label="Delete list" onClick={deleteList}><Trash2 className="size-3.5" /></Button>}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-(--ollie-cyan)" animate={{ width: `${pct}%` }} transition={{ type: "spring", duration: 0.4, bounce: 0 }} />
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addItem(); }}>
          <input className="mp-input" placeholder="Add an item and press Enter" value={text} onChange={(e) => setText(e.target.value)} />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" aria-label="Add item"><Plus className="size-4" /></Button>
        </form>
        <ul className="space-y-1">
          <AnimatePresence initial={false}>
            {sorted.map((item) => (
              <motion.li key={item.id} layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                className="group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-white/[0.03]">
                <AnimatedCheckbox className="flex-1" title={item.text} checked={item.done}
                  onCheckedChange={(c) => update((l) => ({ ...l, items: l.items.map((i) => (i.id === item.id ? { ...i, done: c } : i)) }))} />
                <button type="button" aria-label={`Delete ${item.text}`} onClick={() => update((l) => ({ ...l, items: l.items.filter((i) => i.id !== item.id) }))}
                  className="cursor-pointer rounded p-1 text-white/30 opacity-0 transition-opacity hover:text-white group-hover:opacity-100 focus-visible:opacity-100">
                  <X className="size-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {list.items.length === 0 && <p className="py-4 text-center text-sm text-white/40">Empty list. Add the first thing.</p>}
        {done > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => update((l) => ({ ...l, items: l.items.filter((i) => !i.done) }))}>
            <Eraser className="size-3.5" /> Clear {done} completed
          </Button>
        )}
      </div>
    </div>
  );
}
