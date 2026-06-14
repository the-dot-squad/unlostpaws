import { cn } from "@/lib/utils";

/**
 * Styled table wrapper for admin list views.
 */
export function AdminDataTable({ children, className }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function AdminTableHead({ children }) {
  return (
    <thead className="border-b bg-muted/40">
      <tr>{children}</tr>
    </thead>
  );
}

export function AdminTableTh({ children, className }) {
  return (
    <th className={cn("px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </th>
  );
}

export function AdminTableBody({ children }) {
  return <tbody className="divide-y">{children}</tbody>;
}

export function AdminTableRow({ children, className }) {
  return <tr className={cn("transition-colors hover:bg-muted/30", className)}>{children}</tr>;
}

export function AdminTableTd({ children, className }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function AdminEmptyState({ message, colSpan = 1 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
        {message}
      </td>
    </tr>
  );
}
