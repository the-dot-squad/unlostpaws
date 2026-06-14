import { Loader2 } from "lucide-react";

export default function LocaleLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
    </div>
  );
}
