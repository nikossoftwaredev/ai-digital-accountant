"use client";

import {
  FileText,
  Hash,
  IdCard,
  KeyRound,
  Mail,
  MessageSquare,
  Phone,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ── Props ────────────────────────────────────────────────────────

interface ClientFormFieldsProps {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  form: UseFormReturn<any>;
  /** Field names that should be rendered read-only (e.g. auto-fetched from AADE) */
  readOnlyFields?: string[];
  /** Show taxisnetUsername / taxisnetPassword fields */
  showCredentials?: boolean;
  /** When true, show "leave blank to keep existing" hint on credential fields */
  isEdit?: boolean;
}

// ── Component ────────────────────────────────────────────────────

export const ClientFormFields = ({
  form,
  readOnlyFields = [],
  showCredentials = false,
  isEdit = false,
}: ClientFormFieldsProps) => {
  const t = useTranslations("Admin.clients");

  const isReadOnly = (name: string) => readOnlyFields.includes(name);
  const readOnlyClassName = (name: string) =>
    isReadOnly(name) ? "bg-muted" : "";

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <User className="inline size-3.5" /> {t("name")}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                readOnly={isReadOnly("name")}
                className={readOnlyClassName("name")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="afm"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Hash className="inline size-3.5" /> {t("afm")}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                maxLength={9}
                readOnly={isReadOnly("afm")}
                className={readOnlyClassName("afm")}
              />
            </FormControl>
            <FormDescription>{t("afmValidation")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="amka"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <IdCard className="inline size-3.5" /> {t("amka")}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                maxLength={11}
                readOnly={isReadOnly("amka")}
                className={readOnlyClassName("amka")}
              />
            </FormControl>
            <FormDescription>{t("amkaValidation")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Mail className="inline size-3.5" /> {t("email")}
              </FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Phone className="inline size-3.5" /> {t("phone")}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {showCredentials && (
        <>
          <FormField
            control={form.control}
            name="taxisnetUsername"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <FileText className="inline size-3.5" />{" "}
                  {t("taxisnetUsername")}
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {isEdit && (
                  <FormDescription>
                    {t("taxisnetPasswordHint")}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxisnetPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <KeyRound className="inline size-3.5" />{" "}
                  {t("taxisnetPassword")}
                </FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                {isEdit && (
                  <FormDescription>
                    {t("taxisnetPasswordHint")}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <MessageSquare className="inline size-3.5" /> {t("notes")}
            </FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
