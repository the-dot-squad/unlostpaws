/**
 * Small listing thumbnail — uses native img to avoid Next optimizer issues with /api/media.
 */
export function ListingThumb({ url, className = "size-10" }) {
  if (!url) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className={`relative overflow-hidden rounded-md border bg-muted ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="size-full object-cover" loading="lazy" />
    </div>
  );
}
