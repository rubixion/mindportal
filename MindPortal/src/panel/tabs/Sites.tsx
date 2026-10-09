import { useState } from "react";
import { Plus, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, useStored } from "@/lib/utils";
import { DEFAULT_SETTINGS } from "../../shared/defaults";
import { categorizeDomain, extractDomain } from "../../shared/utils";
import type { Settings } from "../../shared/types";

type Kind = "productiveSites" | "unproductiveSites";

export function Sites() {
  const [stored, setSettings] = useStored<Settings>("settings", DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const domain = extractDomain(location.href);
  const category = categorizeDomain(domain, settings);
  const [draft, setDraft] = useState<Record<Kind, string>>({ productiveSites: "", unproductiveSites: "" });

  const setList = (kind: Kind, list: string[]) => setSettings({ ...settings, [kind]: list });
  const classify = (kind: Kind | null) => {
    const strip = (l: string[]) => l.filter((d) => d !== domain);
    const next = { ...settings, productiveSites: strip(settings.productiveSites), unproductiveSites: strip(settings.unproductiveSites) };
    if (kind) next[kind] = [...next[kind], domain];
    setSettings(next);
  };
  const add = (kind: Kind) => {
    const d = extractDomain(draft[kind].trim().toLowerCase());
    if (d && !settings[kind].includes(d)) setList(kind, [...settings[kind], d]);
    setDraft({ ...draft, [kind]: "" });
  };

  const group = (kind: Kind, title: string, tone: string) => (
    <div className="mp-card space-y-3">
      <span className="mp-label">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {settings[kind].map((d) => (
          <span key={d} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", tone)}>
            {d}
            <button type="button" aria-label={`Remove ${d}`} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => setList(kind, settings[kind].filter((x) => x !== d))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(kind); }}>
        <input className="mp-input" placeholder="example.com" value={draft[kind]} onChange={(e) => setDraft({ ...draft, [kind]: e.target.value })} />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0" variant="brandOutline" aria-label="Add site"><Plus className="size-4" /></Button>
      </form>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="mp-card space-y-3">
        <span className="mp-label">This site</span>
        <div className="truncate text-sm font-medium text-white">{domain}</div>
        <div className="grid grid-cols-3 gap-1.5">
          <Button size="sm" variant={category === "productive" ? "brand" : "brandOutline"} onClick={() => classify("productiveSites")}><ThumbsUp className="size-3.5" /> Focus</Button>
          <Button size="sm" variant={category === "neutral" ? "brand" : "brandOutline"} onClick={() => classify(null)}>Neutral</Button>
          <Button size="sm" variant={category === "unproductive" ? "brand" : "brandOutline"} onClick={() => classify("unproductiveSites")}><ThumbsDown className="size-3.5" /> Distracting</Button>
        </div>
      </div>
      {group("productiveSites", "Focus sites", "border-green-400/25 bg-green-400/10 text-green-200")}
      {group("unproductiveSites", "Distracting sites", "border-red-400/25 bg-red-400/10 text-red-200")}
    </div>
  );
}
