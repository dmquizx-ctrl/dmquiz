import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[-0.01em] ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.65)] hover:-translate-y-0.5 hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-600 hover:shadow-[0_12px_24px_-8px_rgba(37,99,235,0.7)]",
        destructive: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_8px_20px_-8px_rgba(225,29,72,0.6)] hover:-translate-y-0.5 hover:from-rose-600 hover:to-red-700 hover:shadow-lg",
        outline: "border border-slate-200/90 bg-white/85 text-slate-700 shadow-[0_4px_12px_-8px_rgba(15,23,42,0.4)] hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md",
        secondary: "border border-slate-200/90 bg-slate-100 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-md",
        ghost: "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
        link: "text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
