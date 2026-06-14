import { Header } from "@/components/layout/header";

/** Full-viewport map shell — no footer to avoid scroll overlap. */
export default function MapLayout({ children }) {
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="relative min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
