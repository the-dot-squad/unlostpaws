import { redirect } from "next/navigation";
import { connectDB } from "@/config/db";
import { requireStaffPage } from "@/lib/auth/session";
import { countOpenReportCases } from "@/lib/moderation/report-cases";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { noIndexMetadata } from "@/lib/seo/metadata";
import { inter } from "@/lib/fonts";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import "@/app/globals.css";

export const metadata = noIndexMetadata("Admin");

export default async function AdminLayout({ children }) {
  const session = await requireStaffPage();

  await connectDB();
  const openReports = await countOpenReportCases();

  const navProps = {
    userName: session.user.name,
    userRole: session.user.role,
    badges: { openReports },
  };

  return (
    <html suppressHydrationWarning lang="en" dir="ltr" className={`${inter.variable} ${inter.className} h-full`}>
      <body suppressHydrationWarning className="min-h-full bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex min-h-screen bg-background">
            <div className="hidden md:block">
              <AdminSidebar {...navProps} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
                <AdminMobileNav {...navProps} />
                <span className="text-sm font-semibold">Admin</span>
              </header>

              <main className="flex-1 overflow-auto">
                <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
              </main>
            </div>
          </div>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
