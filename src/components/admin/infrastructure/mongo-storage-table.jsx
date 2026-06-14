import { formatBytes } from "@/lib/format";

/**
 * MongoDB collection footprint table — collStats per tracked collection.
 */
export function MongoStorageTable({ collections }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-2 text-start text-xs font-medium uppercase text-muted-foreground">
              Collection
            </th>
            <th className="px-4 py-2 text-end text-xs font-medium uppercase text-muted-foreground">
              Documents
            </th>
            <th className="px-4 py-2 text-end text-xs font-medium uppercase text-muted-foreground">
              Data size
            </th>
            <th className="px-4 py-2 text-end text-xs font-medium uppercase text-muted-foreground">
              Storage
            </th>
            <th className="px-4 py-2 text-end text-xs font-medium uppercase text-muted-foreground">
              Avg doc
            </th>
            <th className="px-4 py-2 text-end text-xs font-medium uppercase text-muted-foreground">
              Indexes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {collections.map((col) => (
            <tr key={col.name} className="hover:bg-muted/20">
              <td className="px-4 py-2 font-mono text-xs">{col.name}</td>
              <td className="px-4 py-2 text-end tabular-nums">{col.count.toLocaleString()}</td>
              <td className="px-4 py-2 text-end tabular-nums">{formatBytes(col.size)}</td>
              <td className="px-4 py-2 text-end tabular-nums">{formatBytes(col.storageSize)}</td>
              <td className="px-4 py-2 text-end tabular-nums">{formatBytes(col.avgObjSize)}</td>
              <td className="px-4 py-2 text-end tabular-nums">{col.indexes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
