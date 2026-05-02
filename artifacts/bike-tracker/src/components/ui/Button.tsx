import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, children, disabled, ...props },
    ref
  ) => {
    const variants = {
      primary: "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)]",
      secondary: "bg-secondary text-secondary-foreground shadow-[0_0_15px_rgba(0,119,255,0.3)] hover:shadow-[0_0_25px_rgba(0,119,255,0.5)]",
      accent: "bg-accent text-accent-foreground font-bold shadow-[0_0_15px_rgba(255,204,0,0.3)] hover:shadow-[0_0_25px_rgba(255,204,0,0.5)]",
      outline: "border-2 border-border bg-transparent hover:border-foreground text-foreground",
      ghost: "bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white",
      danger: "bg-status-replace text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm font-semibold",
      md: "h-12 px-6 text-base font-bold",
      lg: "h-14 px-8 text-lg font-bold uppercase tracking-wider",
      icon: "h-12 w-12 flex items-center justify-center rounded-xl",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(
          "relative flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 overflow-hidden",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </motion.button>
    );
  }
);
Button.displayName = "Button";
