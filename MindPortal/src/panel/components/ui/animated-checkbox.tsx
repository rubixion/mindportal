// 21st.dev tom_ui/animated-checkbox, made controlled and coloured for Ollie.
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const springTransition = { type: "spring" as const, duration: 0.4, bounce: 0.2 };

export function AnimatedCheckbox({
  title,
  checked,
  onCheckedChange,
  className,
}: {
  title: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={cn("flex min-w-0 cursor-pointer select-none items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-(--ollie-cyan)/60 rounded-md", className)}
      onClick={() => onCheckedChange(!checked)}
    >
      <span
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors duration-200",
          checked ? "border-transparent bg-(--ollie-cyan)" : "border-white/30 bg-transparent hover:border-white/50",
        )}
      >
        <svg viewBox="0 0 20 20" className="size-full text-black" aria-hidden>
          <motion.path
            d="M 0 4.5 L 3.182 8 L 10 0"
            fill="transparent"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(5 6)"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ pathLength: { ease: "easeOut", duration: 0.3 }, opacity: { duration: 0 } }}
          />
        </svg>
      </span>
      <span className="relative min-w-0">
        <span className={cn("block break-words text-sm transition-colors duration-200", checked ? "text-white/40" : "text-white/90")}>
          {title}
        </span>
        <motion.span
          aria-hidden
          className="absolute left-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-white/40"
          initial={false}
          animate={{ width: checked ? "100%" : 0, opacity: checked ? 1 : 0 }}
          transition={springTransition}
        />
      </span>
    </button>
  );
}
