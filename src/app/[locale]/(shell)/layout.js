import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

/** Standard site shell with header and footer. */
export default async function SiteLayout({ children, params }) {
  const { locale } = await params;

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
    </>
  );
}
