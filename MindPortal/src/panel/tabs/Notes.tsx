import { useEffect, useState } from "react";
import { ArrowLeft, Download, Link2, Pin, Plus, Search, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, download, uid, useStored } from "@/lib/utils";
import type { Note } from "../../shared/types";

const TEMPLATES: Record<string, string> = {
  "Daily plan": "Top 3 today:\n1. \n2. \n3. \n\nNotes:\n",
  Meeting: "Attendees:\n\nAgenda:\n- \n\nAction items:\n- [ ] \n",
  "Brain dump": "Everything on my mind:\n- ",
  Study: "Topic:\n\nKey ideas:\n- \n\nQuestions:\n- \n",
};

export function Notes() {
  const [notes, setNotes] = useStored<Note[]>("notesV2", []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // one-time migration of the old single-textarea notes
  useEffect(() => {
    chrome.storage.local.get(["notes", "notesV2"]).then((r) => {
      const old = r["notes"];
      if (typeof old === "string" && old.trim() && !r["notesV2"]) {
        setNotes([{ id: uid(), title: "My notes", body: old, pinned: true, updated: Date.now() }]);
      }
    });
  }, [setNotes]);

  const create = (partial: Partial<Note> = {}) => {
    const n: Note = { id: uid(), title: "", body: "", pinned: false, updated: Date.now(), ...partial };
    setNotes((all) => [n, ...all]);
    setOpenId(n.id);
  };
  const patch = (id: string, p: Partial<Note>) =>
    setNotes((all) => all.map((n) => (n.id === id ? { ...n, ...p, updated: Date.now() } : n)));
  const remove = (id: string) => {
    setNotes((all) => all.filter((n) => n.id !== id));
    setOpenId(null);
  };

  const open = notes.find((n) => n.id === openId);
  if (open) {
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Back to notes" onClick={() => setOpenId(null)}><ArrowLeft className="size-4" /></Button>
          <span className="flex-1" />
          <Button variant="ghost" size="icon" aria-label={open.pinned ? "Unpin" : "Pin"} onClick={() => patch(open.id, { pinned: !open.pinned })}>
            <Pin className={cn("size-4", open.pinned && "fill-(--ollie-cyan) text-(--ollie-cyan)")} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Copy note" onClick={() => navigator.clipboard.writeText(`${open.title}\n\n${open.body}`)}><Copy className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Delete note" onClick={() => remove(open.id)}><Trash2 className="size-4" /></Button>
        </div>
        <input
          className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/30 outline-none"
          placeholder="Title"
          value={open.title}
          autoFocus={!open.title}
          onChange={(e) => patch(open.id, { title: e.target.value })}
        />
        {open.url && (
          <a href={open.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate text-xs text-(--ollie-cyan) hover:underline">
            <Link2 className="size-3 shrink-0" /> <span className="truncate">{open.url}</span>
          </a>
        )}
        {!open.body && (
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(TEMPLATES).map((t) => (
              <button key={t} type="button" onClick={() => patch(open.id, { body: TEMPLATES[t]!, title: open.title || t })}
                className="cursor-pointer rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/60 hover:border-white/25 hover:text-white">
                {t}
              </button>
            ))}
          </div>
        )}
        <textarea
          className="mp-input min-h-[300px] flex-1 resize-none leading-relaxed"
          placeholder="Start writing… saves automatically"
          value={open.body}
          onChange={(e) => patch(open.id, { body: e.target.value })}
        />
        <div className="text-right text-[11px] text-white/30">{open.body.trim() ? open.body.trim().split(/\s+/).length : 0} words · saved</div>
      </div>
    );
  }

  const ql = q.toLowerCase();
  const shown = notes
    .filter((n) => !ql || n.title.toLowerCase().includes(ql) || n.body.toLowerCase().includes(ql))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => create()}><Plus className="size-4" /> New note</Button>
        <Button variant="brandOutline" onClick={() => create({ title: document.title, url: location.href })} title="New note linked to this page">
          <Link2 className="size-4" /> This page
        </Button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
        <input className="mp-input pl-9" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {shown.length === 0 && <p className="py-8 text-center text-sm text-white/40">{q ? "No matches." : "No notes yet. Capture a thought."}</p>}
      <div className="space-y-2">
        {shown.map((n) => (
          <button key={n.id} type="button" onClick={() => setOpenId(n.id)}
            className="block w-full cursor-pointer rounded-xl border border-(--border) bg-(--card) p-3 text-left transition-colors hover:border-white/20">
            <div className="flex items-center gap-1.5">
              {n.pinned && <Pin className="size-3 shrink-0 fill-(--ollie-cyan) text-(--ollie-cyan)" />}
              <span className="truncate text-sm font-medium text-white">{n.title || "Untitled"}</span>
              <span className="ml-auto shrink-0 text-[11px] text-white/30">{new Date(n.updated).toLocaleDateString()}</span>
            </div>
            {n.body && <p className="mt-1 line-clamp-2 text-xs text-white/50">{n.body}</p>}
          </button>
        ))}
      </div>
      {notes.length > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() =>
          download("mindportal-notes.md", notes.map((n) => `# ${n.title || "Untitled"}\n${n.url ? n.url + "\n" : ""}\n${n.body}`).join("\n\n---\n\n"), "text/markdown")}>
          <Download className="size-3.5" /> Export all as Markdown
        </Button>
      )}
    </div>
  );
}
