import * as React from "react";
import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderCircleIcon
      role="status"
      aria-label="Cargando"
      className={cn("size-5 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
