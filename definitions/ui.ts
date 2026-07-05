import type * as React from "react";

export type TooltipProps = {
  children: React.ReactNode;
  label: React.ReactNode;
  triggerLabel: string;
  triggerClassName?: string;
};

export type CardProps = React.ComponentProps<"div"> & {
  size?: "default" | "sm";
};
