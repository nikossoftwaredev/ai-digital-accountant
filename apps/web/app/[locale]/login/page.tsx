import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/lib/auth/auth";
import { redirect } from "@/lib/i18n/navigation";
import type { BasePageProps } from "@/types/page-props";

const LoginPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getServerSession(authOptions);
  if (session) {
    redirect({ href: "/admin/dashboard", locale });
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <LoginForm
        defaultEmail={process.env.NODE_ENV === "development" ? process.env.DEV_LOGIN_EMAIL : undefined}
        defaultPassword={process.env.NODE_ENV === "development" ? process.env.DEV_LOGIN_PASSWORD : undefined}
      />
    </div>
  );
};

export default LoginPage;
