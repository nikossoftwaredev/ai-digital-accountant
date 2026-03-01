import { Loader2 } from "lucide-react";

import { cn } from "@/lib/general/utils";

interface SpinnerProps {
  className?: string;
}

export const Spinner = ({ className }: SpinnerProps) => {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
};
