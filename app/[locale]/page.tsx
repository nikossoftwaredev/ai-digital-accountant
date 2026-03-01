import { getTranslations, setRequestLocale } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeSwitcher } from "@/components/examples/ThemeSwitcher";
import { LoginButton } from "@/components/examples/login-button";
import { LanguageSwitcher } from "@/components/examples/language-switcher";
import { TodoList } from "@/components/examples/todo-list";
import { BasePageProps } from "@/types/page-props";
import {
  Shield,
  Database,
  Palette,
  Languages,
  Sparkles,
  Github,
  CreditCard,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

const Home = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("HomePage");
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-end px-4">
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <LoginButton />
          </div>
        </div>
      </header>
      <main className="flex flex-col items-center gap-8 max-w-4xl w-full mx-auto p-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Next.js Full-Stack Starter
          </h1>
          <p className="text-muted-foreground text-lg">
            Production-ready template with authentication, database, i18n, and more
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button variant="outline" asChild>
              <a
                href="https://github.com/nikossoftwaredev/next-auth-intl-prisma-starter"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <Github className="size-4" />
                View on GitHub
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://github.com/nikossoftwaredev/next-auth-intl-prisma-starter/generate"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <Sparkles className="size-4" />
                Use Template
              </a>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                NextAuth.js
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Secure authentication with Google OAuth. Easy to extend with other providers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5" />
                Prisma + Supabase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Type-safe database with Prisma ORM connected to Supabase PostgreSQL.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="size-5" />
                next-intl
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Internationalization support with English and Greek locales.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-5" />
                Theme Switching
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Dark and light mode support with next-themes and system preference detection.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5" />
                shadcn/ui
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Beautiful, accessible components built with Radix UI and Tailwind CSS.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="size-5" />
                Admin Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Full admin dashboard with sidebar navigation, mock data pages for Users, Settings, and Expenses.
              </p>
              <Button asChild size="sm">
                <Link href="/admin" className="gap-2">
                  <LayoutDashboard className="size-3.5" />
                  Open Admin
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="size-5" />
                  Stripe Payments
                </CardTitle>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Coming Soon
                </span>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-sm text-muted-foreground">
                Accept payments, manage subscriptions, and handle billing with Stripe integration.
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Todo Demo Section */}
        {session?.user ? (
          <TodoList />
        ) : (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Try the Todo Demo</CardTitle>
              <CardDescription>
                Sign in with your Google account to see a working example of database integration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Once you&apos;re signed in, you&apos;ll be able to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Create and manage your personal todo list</li>
                <li>Mark todos as complete</li>
                <li>Edit and delete your todos</li>
                <li>All your data is private and secure in Supabase</li>
              </ul>
              <div className="mt-6">
                <LoginButton />
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
};

export default Home;
