// 21st.dev ddoemonn/dropdown, adapted for MindPortal:
// - Ollie colours (dark only, blue check), full-width trigger that shows the chosen option + optional icon
// - outside-click uses composedPath(): inside the overlay's shadow root e.target is retargeted to the host,
//   which made every click count as "outside" and closed the menu before the option registered
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn, usePopup } from "@/lib/utils";

const EASE = [0.23, 1, 0.32, 1] as const;
const EXIT = [0.4, 0, 1, 1] as const;
const CELL = { type: "spring", stiffness: 520, damping: 34, mass: 0.45 } as const;
const NUDGE = { type: "spring", stiffness: 700, damping: 46, mass: 0.5 } as const;
const NONE = { duration: 0 } as const;
const SLIDE = { type: "spring", stiffness: 700, damping: 46, mass: 0.5 } as const;
const OPEN = { type: "spring", stiffness: 620, damping: 38, mass: 0.6 } as const;
const ROW_H = 32;

export type DropdownItem = { value: string; label: string; hint?: string; disabled?: boolean };

function useDropdown({ items, value, onChange, disabled = false }: { items: DropdownItem[]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const uid = useId();
  const listId = `${uid}-list`;
  const itemId = useCallback((i: number) => `${uid}-opt-${i}`, [uid]);
  const selectedIndex = items.findIndex((it) => it.value === value);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  usePopup(open);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const viaKey = useRef(false);
  const buffer = useRef("");
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emit = useRef(onChange);
  emit.current = onChange;

  const step = useCallback(
    (from: number, dir: 1 | -1) => {
      const n = items.length;
      if (n === 0) return -1;
      let i = from;
      for (let k = 0; k < n; k++) {
        i = (i + dir + n) % n;
        if (!items[i]!.disabled) return i;
      }
      return from;
    },
    [items],
  );
  const edge = useCallback((dir: 1 | -1) => step(dir === 1 ? -1 : items.length, dir), [step, items.length]);

  const openMenu = useCallback(
    (index?: number) => {
      if (disabled || items.length === 0) return;
      const usable = selectedIndex >= 0 && !items[selectedIndex]!.disabled;
      viaKey.current = true;
      setActiveIndex(index ?? (usable ? selectedIndex : edge(1)));
      setOpen(true);
    },
    [disabled, items, selectedIndex, edge],
  );

  const close = useCallback((restoreFocus = true) => {
    buffer.current = "";
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const select = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item || item.disabled) return;
      emit.current(item.value);
      close();
    },
    [items, close],
  );

  const typeahead = useCallback(
    (char: string) => {
      if (bufferTimer.current) clearTimeout(bufferTimer.current);
      buffer.current += char.toLowerCase();
      bufferTimer.current = setTimeout(() => (buffer.current = ""), 600);
      const q = buffer.current;
      const n = items.length;
      const from = activeIndex < 0 ? 0 : activeIndex;
      const start = q.length > 1 ? from : from + 1;
      for (let k = 0; k < n; k++) {
        const i = (start + k) % n;
        const it = items[i]!;
        if (!it.disabled && it.label.toLowerCase().startsWith(q)) {
          viaKey.current = true;
          setActiveIndex(i);
          return;
        }
      }
    },
    [items, activeIndex],
  );

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) close(false);
    };
    const onWindowBlur = () => close(false);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !viaKey.current) return;
    viaKey.current = false;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  useEffect(() => () => void (bufferTimer.current && clearTimeout(bufferTimer.current)), []);

  const triggerProps = {
    ref: triggerRef,
    type: "button" as const,
    disabled,
    "aria-haspopup": "listbox" as const,
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
    onClick: () => (open ? close() : openMenu()),
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        openMenu(edge(-1));
      }
    },
  };

  const listProps = {
    ref: listRef,
    id: listId,
    role: "listbox" as const,
    tabIndex: -1,
    "aria-activedescendant": activeIndex >= 0 ? itemId(activeIndex) : undefined,
    onKeyDown: (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        viaKey.current = true;
        setActiveIndex((i) => step(i, e.key === "ArrowDown" ? 1 : -1));
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        viaKey.current = true;
        setActiveIndex(edge(e.key === "Home" ? 1 : -1));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(activeIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation(); // don't also close the panel
        close();
      } else if (e.key === "Tab") {
        e.preventDefault();
        close();
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        typeahead(e.key);
      }
    },
  };

  const getItemProps = useCallback(
    (index: number) => ({
      id: itemId(index),
      role: "option" as const,
      "aria-selected": index === selectedIndex,
      "aria-disabled": items[index]?.disabled ? (true as const) : undefined,
      ref: (el: HTMLLIElement | null) => {
        itemRefs.current[index] = el;
      },
      onPointerMove: () => {
        if (items[index]?.disabled) return;
        viaKey.current = false;
        setActiveIndex(index);
      },
      onClick: () => select(index),
    }),
    [itemId, items, selectedIndex, select],
  );

  return { open, activeIndex, selectedIndex, selectedItem: selectedIndex >= 0 ? items[selectedIndex]! : null, rootRef, triggerProps, listProps, getItemProps };
}

export function Dropdown({
  items,
  value,
  onChange,
  label,
  icon,
  placeholder = "Select an option",
  disabled = false,
  className,
  size = "md",
}: {
  items: DropdownItem[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for the control. */
  label: string;
  icon?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const reduced = useReducedMotion();
  const { open, activeIndex, selectedIndex, selectedItem, rootRef, triggerProps, listProps, getItemProps } = useDropdown({ items, value, onChange, disabled });
  const cell = reduced ? NONE : CELL;

  return (
    <div ref={rootRef} className={cn("relative text-left", className)}>
      <button
        {...triggerProps}
        className={cn(
          "flex w-full cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-lg border bg-black/30 text-left text-white outline-none transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-7 px-2 text-xs" : "h-9 px-3 text-[13px]",
          open ? "border-(--ollie-cyan)/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]" : "border-white/10 hover:border-white/20 focus-visible:border-(--ollie-cyan)/60",
        )}
      >
        <span className="sr-only">{label}: </span>
        {icon && <span className="flex shrink-0 text-white/45" aria-hidden>{icon}</span>}
        <span className={cn("min-w-0 flex-1 truncate", !selectedItem && "text-white/35")}>{selectedItem ? selectedItem.label : placeholder}</span>
        <motion.svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0 text-white/45" initial={false} animate={{ rotate: open ? 180 : 0 }} transition={reduced ? NONE : NUDGE}>
          <path d="M3 4.75 6 7.75 9 4.75" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6, transition: reduced ? NONE : { duration: 0.12, ease: EXIT } }}
            transition={reduced ? NONE : { ...OPEN, opacity: { duration: 0.12, ease: EASE } }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-max min-w-full whitespace-nowrap rounded-[11px] border border-white/10 bg-[#16161d] p-[5px] shadow-[0_2px_12px_rgba(0,0,0,0.6),0_16px_36px_-18px_rgba(0,0,0,0.8)]"
          >
            <ul {...listProps} aria-label={label} className="relative max-h-[216px] overflow-y-auto outline-none [scrollbar-gutter:stable]">
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-8 rounded-[7px] bg-(--ollie-cyan)/15"
                initial={false}
                animate={{ y: activeIndex < 0 ? 0 : activeIndex * ROW_H, opacity: activeIndex < 0 ? 0 : 1 }}
                transition={reduced ? NONE : { ...SLIDE, opacity: { duration: 0.1, ease: EASE } }}
              />
              {items.map((item, i) => {
                const active = i === activeIndex && !item.disabled;
                const picked = i === selectedIndex;
                return (
                  <li
                    key={item.value}
                    {...getItemProps(i)}
                    className={cn(
                      "relative flex h-8 cursor-pointer select-none items-center rounded-[7px] px-2.5 text-[13px]",
                      item.disabled ? "cursor-default text-white/30" : active ? "text-white" : "text-white/75",
                    )}
                  >
                    <span className="relative flex min-w-0 flex-1 items-center gap-3">
                      <span className="truncate">{item.label}</span>
                      {item.hint ? <span className="ml-auto shrink-0 text-[10.5px] text-white/40">{item.hint}</span> : null}
                    </span>
                    <motion.span
                      aria-hidden
                      initial={false}
                      animate={{ opacity: picked ? 1 : 0, scale: picked ? 1 : 0.7 }}
                      transition={cell}
                      className="relative ml-2 flex size-[14px] shrink-0 items-center justify-center text-(--ollie-cyan)"
                    >
                      <svg viewBox="0 0 14 14" className="size-[14px]">
                        <path d="M3 7.4 5.8 10.2 11 4.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
