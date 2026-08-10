import * as React from "react"
import { cn } from "@/lib/utils"

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "secondary" | "destructive" | "outline"
}) {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
    secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
    destructive: "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90",
    outline: "text-foreground",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
