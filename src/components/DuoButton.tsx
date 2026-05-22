import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "success" | "danger" | "ghost";

export const DuoButton = React.forwardRef<HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }
>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "duo-btn",
      variant === "primary" && "duo-btn-primary",
      variant === "success" && "duo-btn-success",
      variant === "danger" && "duo-btn-danger",
      variant === "ghost" && "duo-btn-ghost",
      size === "sm" && "text-xs px-3 py-1.5",
      size === "lg" && "text-base px-6 py-3",
      className,
    )}
    {...props}
  />
));
DuoButton.displayName = "DuoButton";
