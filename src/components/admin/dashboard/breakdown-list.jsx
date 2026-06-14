import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Simple key/value breakdown card used for type/status distributions.
 */
export function BreakdownList({ title, description, items, renderLabel, emptyMessage = "No data yet" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
            {renderLabel ? renderLabel(item) : <span className="capitalize text-sm">{item._id}</span>}
            <span className="font-semibold tabular-nums">{item.count}</span>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
