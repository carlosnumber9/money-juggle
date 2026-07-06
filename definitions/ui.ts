import type * as React from "react";

export type TooltipProps = {
  children: React.ReactNode;
  label: React.ReactNode;
  triggerLabel: string;
  triggerType?: "button" | "submit";
  triggerClassName?: string;
  triggerDisabled?: boolean;
};

export type CardProps = React.ComponentProps<"div"> & {
  size?: "default" | "sm";
};
