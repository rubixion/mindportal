// Ollie's 21st.dev/shadcn button (from ollie-frontend), Slot/asChild dropped: nothing here needs it.
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        ghost: "text-white/70 hover:bg-white/[0.06] hover:text-white",
        destructive: "border border-red-400/25 bg-red-400/10 text-red-300 hover:bg-red-400/20",
        brand: "bg-(--ollie-cyan) font-bold text-black shadow-sm shadow-black/5 hover:bg-(--ollie-cyan)/90 active:scale-[0.98]",
        brandOutline: "border border-white/15 font-bold text-white hover:bg-white/[0.05] active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        icon: "h-8 w-8",
        cta: "h-11 rounded-xl px-6",
      },
    },
    defaultVariants: { variant: "brand", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button type={type} className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);
Button.displayName = "Button";
