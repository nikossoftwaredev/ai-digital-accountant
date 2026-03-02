"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "@/lib/i18n/navigation";

type Step = "credentials" | "totp";

interface LoginFormProps {
  defaultEmail?: string;
  defaultPassword?: string;
}

export const LoginForm = ({ defaultEmail, defaultPassword }: LoginFormProps) => {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState(defaultPassword ?? "");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        totpCode: step === "totp" ? totpCode : "",
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("TotpRequired")) {
          setStep("totp");
          setLoading(false);
          return;
        }
        if (result.error.includes("AccountLocked")) {
          setError(t("rateLimited"));
        } else if (result.error.includes("InvalidTotp")) {
          setError(t("totpError"));
        } else {
          setError(t("loginError"));
        }
        setLoading(false);
        return;
      }

      if (result?.ok) {
        router.push("/admin/dashboard");
      }
    } catch {
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("login")}</CardTitle>
        {step === "totp" && (
          <CardDescription>{t("totpPrompt")}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === "credentials" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="totpCode">{t("totpCode")}</Label>
              <Input
                id="totpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9A-Za-z]*"
                maxLength={8}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Spinner />}
            {!loading && (step === "credentials" ? t("loginButton") : t("confirm"))}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
