"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Copy, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/lib/i18n/navigation";
import {
  changePassword,
  confirmTotp,
  disableTotp,
  saveProfileSettings,
  setupTotp,
} from "@/server_actions/settings";
import type { SettingsData } from "@/server_actions/settings";

// ── Schemas ──────────────────────────────────────────────────────

const profileFormSchema = z.object({
  officeName: z.string().optional().or(z.literal("")),
  officeAddress: z.string().optional().or(z.literal("")),
  officePhone: z.string().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

// ── Props ────────────────────────────────────────────────────────

interface ProfileSettingsFormProps {
  settings: SettingsData;
}

// ── Component ────────────────────────────────────────────────────

export const ProfileSettingsForm = ({ settings }: ProfileSettingsFormProps) => {
  const t = useTranslations("Admin.settings");
  const router = useRouter();

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(settings.totpEnabled);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // ── Profile form ──────────────────────────────────────────────

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      officeName: settings.officeName ?? "",
      officeAddress: settings.officeAddress ?? "",
      officePhone: settings.officePhone ?? "",
    },
  });

  const onProfileSubmit = async (values: ProfileFormValues) => {
    const result = await saveProfileSettings(values);
    if (!result.success) {
      profileForm.setError("root", { message: result.error });
      return;
    }
    toast.success(t("saved"));
  };

  // ── Password form ─────────────────────────────────────────────

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    const result = await changePassword(values);
    if (!result.success) {
      passwordForm.setError("root", { message: result.error });
      return;
    }
    passwordForm.reset();
    toast.success(t("saved"));
  };

  // ── 2FA handlers ──────────────────────────────────────────────

  const handleEnable2FA = useCallback(async () => {
    setTotpLoading(true);
    setTotpError(null);
    const result = await setupTotp();
    setTotpLoading(false);

    if (!result.success) {
      setTotpError(result.error ?? "Failed");
      return;
    }

    setTotpUri(result.uri ?? null);
  }, []);

  const handleConfirmTotp = useCallback(async () => {
    if (!totpCode || totpCode.length !== 6) return;

    setTotpLoading(true);
    setTotpError(null);
    const result = await confirmTotp(totpCode);
    setTotpLoading(false);

    if (!result.success) {
      setTotpError(result.error ?? "Invalid code");
      return;
    }

    setTotpEnabled(true);
    setTotpUri(null);
    setTotpCode("");
    setBackupCodes(result.backupCodes ?? null);
  }, [totpCode]);

  const handleDisable2FA = useCallback(async () => {
    setDisableLoading(true);
    setDisableError(null);
    const result = await disableTotp(disablePassword);
    setDisableLoading(false);

    if (!result.success) {
      setDisableError(result.error ?? "Failed");
      return;
    }

    setTotpEnabled(false);
    setDisableDialogOpen(false);
    setDisablePassword("");
    router.refresh();
    toast.success(t("saved"));
  }, [disablePassword, router, t]);

  const handleCopyBackupCodes = useCallback(() => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join("\n"));
      toast.success("Copied");
    }
  }, [backupCodes]);

  // Build QR code URL from TOTP URI using Google Charts API
  const qrCodeUrl = totpUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`
    : null;

  return (
    <div className="space-y-6">
      {/* Office info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="space-y-4"
            >
              {profileForm.formState.errors.root && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.root.message}
                </p>
              )}

              <FormField
                control={profileForm.control}
                name="officeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("officeName")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="officeAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("officeAddress")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="officePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("officePhone")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
              >
                {profileForm.formState.isSubmitting ? "..." : t("save")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Password change */}
      <Card>
        <CardHeader>
          <CardTitle>{t("changePassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4"
            >
              {passwordForm.formState.errors.root && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.root.message}
                </p>
              )}

              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("currentPassword")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("newPassword")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting ? "..." : t("save")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            {t("twoFactor")}
          </CardTitle>
          <CardDescription>{t("twoFactorDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current status */}
          <div className="flex items-center gap-2">
            {totpEnabled ? (
              <>
                <ShieldCheck className="size-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  2FA Enabled
                </span>
              </>
            ) : (
              <>
                <ShieldOff className="size-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  2FA Disabled
                </span>
              </>
            )}
          </div>

          {/* Enable/disable button */}
          {!totpUri && !backupCodes && (
            <>
              {totpEnabled ? (
                <Button
                  variant="destructive"
                  onClick={() => setDisableDialogOpen(true)}
                >
                  {t("disable2FA")}
                </Button>
              ) : (
                <Button onClick={handleEnable2FA} disabled={totpLoading}>
                  {totpLoading ? "..." : t("enable2FA")}
                </Button>
              )}
            </>
          )}

          {totpError && (
            <p className="text-sm text-destructive">{totpError}</p>
          )}

          {/* QR Code setup */}
          {totpUri && qrCodeUrl && (
            <div className="space-y-4">
              <div className="flex justify-center rounded-lg border bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="2FA QR Code"
                  width={200}
                  height={200}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Enter the 6-digit code from your authenticator app
                </label>
                <div className="flex gap-2">
                  <Input
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="max-w-[200px] font-mono"
                  />
                  <Button
                    onClick={handleConfirmTotp}
                    disabled={totpLoading || totpCode.length !== 6}
                  >
                    {totpLoading ? "..." : t("save")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Backup codes display (one-time) */}
          {backupCodes && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="size-4" />
                <span className="text-sm font-medium">
                  Save these backup codes - they will not be shown again
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code) => (
                  <div
                    key={code}
                    className="rounded bg-white px-3 py-1.5 text-center dark:bg-amber-900/50"
                  >
                    {code}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyBackupCodes}
              >
                <Copy className="size-4" />
                Copy codes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disable 2FA dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("disable2FA")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {disableError && (
              <p className="text-sm text-destructive">{disableError}</p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("currentPassword")}
              </label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDisableDialogOpen(false);
                setDisablePassword("");
                setDisableError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={disableLoading || !disablePassword}
            >
              {disableLoading ? "..." : t("disable2FA")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
