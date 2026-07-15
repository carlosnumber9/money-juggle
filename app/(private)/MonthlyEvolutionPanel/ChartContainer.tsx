import type * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartContainer({
  title,
  description,
  className,
  headerClassName,
  children
}: {
  title: React.ReactNode;
  description: React.ReactNode;
  className?: string;
  headerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("w-full overflow-visible p-0", className)}>
      <CardContent className="p-5 sm:p-6">
        <div className={cn("mb-6 flex flex-col gap-1", headerClassName)}>
          <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
