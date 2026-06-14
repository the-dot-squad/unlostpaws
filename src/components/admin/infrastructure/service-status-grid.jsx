import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";

/**
 * Renders ok / not-configured / error for a single dependency probe.
 */
function StatusIcon({ state }) {
  if (state === "ok") return <CheckCircle2 className="size-4 text-emerald-600" />;
  if (state === "skipped") return <CircleDashed className="size-4 text-muted-foreground" />;
  return <XCircle className="size-4 text-destructive" />;
}

function statusLabel(state) {
  if (state === "ok") return "Connected";
  if (state === "skipped") return "Not configured";
  return "Unreachable";
}

/**
 * Grid of service health cards (MongoDB, Redis, Qdrant).
 */
export function ServiceStatusGrid({ services }) {
  const items = [
    {
      name: "MongoDB",
      detail: services.mongo.label ?? "Primary datastore",
      state: services.mongo.ok ? "ok" : "error",
      note: services.mongo.error,
    },
    {
      name: "Redis",
      detail: services.redis.configured ? "Job queue" : "REDIS_URL not set",
      state: !services.redis.configured ? "skipped" : services.redis.ok ? "ok" : "error",
      note: services.redis.error,
    },
    {
      name: "Qdrant",
      detail: services.qdrant.configured ? "Vector search" : "QDRANT_URL not set",
      state: !services.qdrant.configured ? "skipped" : services.qdrant.ok ? "ok" : "error",
      note: services.qdrant.error,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
            <StatusIcon state={item.state} />
          </CardHeader>
          <CardContent className="space-y-1">
            <Badge
              variant="outline"
              className={cn(
                item.state === "ok" && "border-emerald-200 text-emerald-700",
                item.state === "skipped" && "text-muted-foreground",
                item.state === "error" && "border-destructive/30 text-destructive"
              )}
            >
              {statusLabel(item.state)}
            </Badge>
            <p className="text-xs text-muted-foreground">{item.detail}</p>
            {item.note ? <p className="text-xs text-destructive">{item.note}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
