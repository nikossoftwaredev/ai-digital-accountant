"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { saveSmtpSettings } from "@/server_actions/settings";
import type { SettingsData } from "@/server_actions/settings";

// ── Schema ───────────────────────────────────────────────────────

const smtpFormSchema = z.object({
  smtpHost: z.string().optional().or(z.literal("")),
  smtpPort: z.string().optional().or(z.literal("")),
  smtpUsername: z.string().optional().or(z.literal("")),
  smtpPassword: z.string().optional().or(z.literal("")),
});

type SmtpFormValues = z.infer<typeof smtpFormSchema>;

// ── Props ────────────────────────────────────────────────────────

interface SmtpSettingsFormProps {
  settings: SettingsData;
}

// ── Component ────────────────────────────────────────────────────

export const SmtpSettingsForm = ({ settings }: SmtpSettingsFormProps) => {
  const t = useTranslations("Admin.settings");

  const form = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpFormSchema),
    defaultValues: {
      smtpHost: settings.smtpHost ?? "",
      smtpPort: settings.smtpPort?.toString() ?? "",
      smtpUsername: settings.smtpUsername ?? "",
      smtpPassword: "",
    },
  });

  const onSubmit = async (values: SmtpFormValues) => {
    const result = await saveSmtpSettings({
      smtpHost: values.smtpHost,
      smtpPort: values.smtpPort ? Number(values.smtpPort) : 0,
      smtpUsername: values.smtpUsername,
      smtpPassword: values.smtpPassword,
    });

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    form.setValue("smtpPassword", "");
    toast.success(t("saved"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("smtp")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="smtpHost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("smtpHost")}</FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smtpPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("smtpPort")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="587"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="smtpUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("smtpUsername")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="smtpPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("smtpPassword")}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>{t("smtpPasswordHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "..." : t("save")}
              </Button>
              <Button type="button" variant="outline" disabled>
                {t("testConnection")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
