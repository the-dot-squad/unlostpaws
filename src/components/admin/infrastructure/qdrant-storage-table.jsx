/**
 * Qdrant collection stats table for the admin stats page.
 */
export function QdrantStorageTable({ collections }) {
  if (!collections.length) {
    return <p className="text-sm text-muted-foreground">No collections found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-2 text-start text-xs font-medium uppercase text-muted-foreground">
              Collection
            </th>
            <th className="px-4 py-2 text-end text-xs font-medium uppercase text-muted-foreground">
              Points
            </th>
            <th className="px-4 py-2 text-end text-xs font-medium uppercase text-muted-foreground">
              Vectors
            </th>
            <th className="px-4 py-2 text-end text-xs font-medium uppercase text-muted-foreground">
              Dims
            </th>
            <th className="px-4 py-2 text-end text-xs font-medium uppercase text-muted-foreground">
              Segments
            </th>
            <th className="px-4 py-2 text-start text-xs font-medium uppercase text-muted-foreground">
              Distance
            </th>
            <th className="px-4 py-2 text-start text-xs font-medium uppercase text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {collections.map((col) => (
            <tr key={col.name} className="hover:bg-muted/20">
              <td className="px-4 py-2 font-mono text-xs">{col.name}</td>
              <td className="px-4 py-2 text-end tabular-nums">{col.points.toLocaleString()}</td>
              <td className="px-4 py-2 text-end tabular-nums">{col.vectors.toLocaleString()}</td>
              <td className="px-4 py-2 text-end tabular-nums">{col.vectorSize}</td>
              <td className="px-4 py-2 text-end tabular-nums">{col.segments}</td>
              <td className="px-4 py-2 capitalize">{col.distance?.toLowerCase()}</td>
              <td className="px-4 py-2 capitalize">{col.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
