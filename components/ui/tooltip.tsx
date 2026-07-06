"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import type { TooltipProps } from "@/definitions";
import { cn } from "@/lib/utils";

function Tooltip({
  children,
  label,
  triggerLabel,
  triggerType = "button",
  triggerClassName,
  triggerDisabled = false
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delay={150} closeDelay={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          type={triggerType}
          aria-label={triggerLabel}
          disabled={triggerDisabled}
          closeOnClick={false}
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70",
            triggerClassName
          )}
        >
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner
            side="bottom"
            sideOffset={8}
            className="z-50"
          >
            <TooltipPrimitive.Popup className="max-w-64 rounded-md bg-popover px-3 py-2 text-sm leading-relaxed text-popover-foreground shadow-md ring-1 ring-border">
              {label}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip };
