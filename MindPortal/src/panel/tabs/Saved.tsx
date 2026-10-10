import { useState } from "react";
import { BookmarkPlus, Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid, usePopup, useStored } from "@/lib/utils";
import { extractDomain } from "../../shared/utils";
import type { SavedPage } from "../../shared/types";

export function Saved() {
  const [pages, setPages] = useStored<SavedPage[]>("saved", []);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  // so Escape cancels the edit instead of closing the panel
  usePopup(editing !== null);
  const rename = (id: string, title: string) => {
    setPages((all) => all.map((x) => (x.id === id ? { ...x, title: title.trim() || x.url } : x)));
    setEditing(null);
  };
  const here = pages.some((p) => p.url === location.href);

  const ql = q.toLowerCase();
  const shown = pages.filter((p) => !ql || p.title.toLowerCase().includes(ql) || p.url.toLowerCase().includes(ql));

  return (
    <div className="space-y-3">
      <Button size="cta" className="w-full" disabled={here}
        onClick={() => setPages((all) => [{ id: uid(), title: document.title || location.href, url: location.href, added: Date.now() }, ...all])}>
        <BookmarkPlus className="size-4" /> {here ? "This page is saved" : "Save this page for later"}
      </Button>
      {pages.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input className="mp-input pl-9" placeholder="Search saved pages" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      {pages.length === 0 && <p className="py-8 text-center text-sm text-white/40">Your reading list is empty. Tip: right-click any link → Save to MindPortal.</p>}
      <ul className="space-y-2">
        {shown.map((p) => (
          <li key={p.id} className="group flex items-center gap-2 rounded-xl border border-(--border) bg-(--card) p-3">
            {editing === p.id ? (
              <input
                autoFocus
                aria-label="Title"
                className="mp-input min-w-0 flex-1 py-1.5"
                defaultValue={p.title}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => editing === p.id && rename(p.id, e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename(p.id, e.currentTarget.value);
                  if (e.key === "Escape") {
                    // reset first: if removing the input fires blur, it saves the original title
                    e.currentTarget.value = p.title;
                    setEditing(null);
                  }
                }}
              />
            ) : (
              <a href={p.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white group-hover:text-(--ollie-cyan)">{p.title}</div>
                <div className="truncate text-[11px] text-white/35">{extractDomain(p.url)} · {new Date(p.added).toLocaleDateString()}</div>
              </a>
            )}
            <button type="button" aria-label={`Rename ${p.title}`} onClick={() => setEditing(p.id)}
              className="cursor-pointer rounded p-1 text-white/30 hover:text-white"><Pencil className="size-3.5" /></button>
            <button type="button" aria-label={`Remove ${p.title}`} onClick={() => setPages((all) => all.filter((x) => x.id !== p.id))}
              className="cursor-pointer rounded p-1 text-white/30 hover:text-white"><Trash2 className="size-3.5" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
