import { setRequestLocale, getTranslations } from "next-intl/server";
import { Clock, Flag, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero } from "@/components/marketing/page-hero";
import { ContentBody } from "@/components/marketing/content-page";
import { ContactForm } from "@/components/marketing/contact-form";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.contact" });

  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("heroSubtitle"),
    path: "contact",
  });
}

export default async function ContactPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.contact");

  return (
    <>
      <PageHero title={t("title")} subtitle={t("heroSubtitle")} icon={Mail} />

      <ContentBody wide>
        <div className="grid gap-8 lg:grid-cols-5">
          <Card className="border-border/60 bg-card shadow-sm lg:col-span-3">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="size-5" aria-hidden />
              </div>
              <CardTitle className="mt-4">{t("formTitle")}</CardTitle>
              <CardDescription>{t("formDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm />
            </CardContent>
          </Card>

          <aside className="flex flex-col gap-4 lg:col-span-2">
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Clock className="size-4" aria-hidden />
                  </div>
                  <CardTitle className="text-base">{t("responseTitle")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{t("response")}</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Flag className="size-4" aria-hidden />
                  </div>
                  <CardTitle className="text-base">{t("reportTitle")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{t("report")}</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </ContentBody>
    </>
  );
}
