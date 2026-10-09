// 21st.dev rjcuff2000/expandable-tabs (easeUI, MIT), coloured for Ollie.
import { motion } from "motion/react";
import { type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SPRING_LAYOUT = { type: "spring", duration: 0.22, bounce: 0 } as const;

export interface ExpandableTab {
  id: string;
  label: string;
  icon: ReactNode;
}

const NAV_KEYS = new Set(["ArrowRight", "ArrowLeft", "Home", "End"]);

export function ExpandableTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: ExpandableTab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!NAV_KEYS.has(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    // inside a shadow root, document.activeElement is the host, so ask the root
    const active = (event.currentTarget.getRootNode() as Document | ShadowRoot).activeElement;
    const index = buttons.indexOf(active as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]!.focus();
    buttons[next]!.click();
  };

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn("inline-flex items-center gap-0.5 rounded-full bg-white/[0.04] p-1 shadow-[0_0_0_1px_var(--border)]", className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={tab.label}
            title={tab.label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className="relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)/60"
          >
            {active ? (
              <motion.span
                layoutId="mp-tabs-indicator"
                transition={SPRING_LAYOUT}
                className="absolute inset-0 rounded-full bg-(--ollie-cyan)/15 shadow-[0_0_0_1px_rgb(100_130_210/0.35)]"
              />
            ) : null}
            <span className={cn("relative z-10 flex shrink-0 items-center", active ? "text-(--ollie-cyan)" : "text-white/50 hover:text-white/80")}>
              {tab.icon}
            </span>
            <motion.span
              initial={false}
              animate={{ width: active ? "auto" : 0, opacity: active ? 1 : 0 }}
              transition={SPRING_LAYOUT}
              className="relative z-10 overflow-hidden whitespace-nowrap text-white"
            >
              {tab.label}
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
