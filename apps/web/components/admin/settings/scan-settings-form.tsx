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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveScanSettings } from "@/server_actions/settings";
import type { SettingsData } from "@/server_actions/settings";

// ── Schema ───────────────────────────────────────────────────────

const scanFormSchema = z.object({
  scanFrequency: z.enum(["MANUAL", "WEEKLY", "MONTHLY"]),
  autoNotify: z.boolean(),
});

type ScanFormValues = z.infer<typeof scanFormSchema>;

// ── Props ────────────────────────────────────────────────────────

interface ScanSettingsFormProps {
  settings: SettingsData;
}

// ── Component ────────────────────────────────────────────────────

export const ScanSettingsForm = ({ settings }: ScanSettingsFormProps) => {
  const t = useTranslations("Admin.settings");

  const form = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: {
      scanFrequency: settings.scanFrequency,
      autoNotify: settings.autoNotify,
    },
  });

  const onSubmit = async (values: ScanFormValues) => {
    const result = await saveScanSettings(values);

    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }

    toast.success(t("saved"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("scanSettings")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <FormField
              control={form.control}
              name="scanFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("scanFrequency")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MANUAL">{t("manual")}</SelectItem>
                      <SelectItem value="WEEKLY">{t("weekly")}</SelectItem>
                      <SelectItem value="MONTHLY">{t("monthly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoNotify"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>{t("autoNotify")}</FormLabel>
                    <FormDescription>{t("autoNotifyDesc")}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "..." : t("save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
