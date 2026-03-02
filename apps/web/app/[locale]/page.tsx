import { Building2, LogIn, Search, User } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TypographyH1 } from "@/components/ui/typography";
import { Link } from "@/lib/i18n/navigation";
import type { BasePageProps } from "@/types/page-props";

const Home = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");

  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Search className="size-5 text-primary" />
          hexAIgon
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm">
            <LogIn className="size-4" />
            {t("login")}
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <TypographyH1>{t("title")}</TypographyH1>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* Cards */}
        <div className="mt-12 grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <User className="size-6 text-primary" />
              </div>
              <CardTitle>{t("individuals")}</CardTitle>
              <CardDescription>{t("individualsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full" size="lg" disabled>
                <Search className="size-4" />
                {t("checkDebts")}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("comingSoon")}
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="size-6 text-primary" />
              </div>
              <CardTitle>{t("businesses")}</CardTitle>
              <CardDescription>{t("businessesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full" size="lg" disabled>
                <Search className="size-4" />
                {t("checkDebts")}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("comingSoon")}
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {t("accountant")}{" "}
          <Link href="/login" className="text-primary underline">
            {t("loginHere")}
          </Link>
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} hexAIgon Solutions
      </footer>
    </div>
  );
};

export default Home;
