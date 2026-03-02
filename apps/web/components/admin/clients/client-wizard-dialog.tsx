"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Hash,
  IdCard,
  KeyRound,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Search,
  User,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/server_actions/clients";

// ── Form schema (same as ClientFormDialog) ───────────────────────

const clientFormSchema = z.object({
  name: z.string().min(1),
  afm: z.string().regex(/^\d{9}$/),
  amka: z.string().regex(/^\d{11}$/).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

// ── Types ────────────────────────────────────────────────────────

type WizardStep = "credentials" | "review";
type LookupStatus = "idle" | "loading" | "success" | "failed";

interface LookupResult {
  firstName: string;
  lastName: string;
  firstNameLatin: string;
  lastNameLatin: string;
  afm: string;
  amka: string;
}

interface ClientWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ── Component ────────────────────────────────────────────────────

export const ClientWizardDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: ClientWizardDialogProps) => {
  const t = useTranslations("Admin.clients");

  // Step state
  const [step, setStep] = useState<WizardStep>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [lookupError, setLookupError] = useState("");
  const [autoFetched, setAutoFetched] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      afm: "",
      amka: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Reset everything when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("credentials");
      setUsername("");
      setPassword("");
      setLookupStatus("idle");
      setLookupError("");
      setAutoFetched(false);
      form.reset();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [open, form]);

  const handleLookup = useCallback(async () => {
    if (!username || !password) return;
    setLookupStatus("loading");
    setLookupError("");

    try {
      const res = await fetch("/api/clients/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxisnetUsername: username,
          taxisnetPassword: password,
        }),
      });

      if (!res.ok) {
        setLookupStatus("failed");
        setLookupError(t("lookupFailed"));
        return;
      }

      const { jobId } = await res.json();

      // Poll for result
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/clients/lookup/${jobId}/status`,
          );
          const statusData = await statusRes.json();

          if (statusData.status === "completed") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            const data = statusData.data as LookupResult;

            // Populate form
            form.reset({
              name: `${data.firstName} ${data.lastName}`,
              afm: data.afm,
              amka: data.amka,
              email: "",
              phone: "",
              notes: "",
            });
            setAutoFetched(true);
            setLookupStatus("success");
            setStep("review");
          } else if (statusData.status === "failed") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setLookupStatus("failed");
            setLookupError(statusData.error || t("lookupFailed"));
          }
        } catch {
          // Continue polling on network errors
        }
      }, 2000);

      // Timeout after 90 seconds
      setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setLookupStatus("failed");
          setLookupError(t("lookupFailed"));
        }
      }, 90_000);
    } catch {
      setLookupStatus("failed");
      setLookupError(t("lookupFailed"));
    }
  }, [username, password, form, t]);

  const handleSkip = () => {
    setAutoFetched(false);
    form.reset({
      name: "",
      afm: "",
      amka: "",
      email: "",
      phone: "",
      notes: "",
    });
    setStep("review");
  };

  const handleSubmit = async (values: ClientFormValues) => {
    const result = await createClient({
      ...values,
      taxisnetUsername: username,
      taxisnetPassword: password,
    });
    if (!result.success) {
      form.setError("root", { message: result.error });
      return;
    }
    onSuccess();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleClose();
        }}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{t("wizardTitle")}</DialogTitle>
          <button
            type="button"
            onClick={handleClose}
            className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        {step === "credentials" && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {t("stepCredentialsDesc")}
            </p>

            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <FileText className="size-3.5" /> {t("taxisnetUsername")}
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={lookupStatus === "loading"}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <KeyRound className="size-3.5" /> {t("taxisnetPassword")}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={lookupStatus === "loading"}
                  className="mt-1"
                />
              </div>
            </div>

            {lookupStatus === "loading" && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                {t("lookingUp")}
              </div>
            )}

            {lookupStatus === "failed" && (
              <p className="text-destructive text-sm">{lookupError}</p>
            )}

            {lookupStatus === "success" && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="size-4" />
                {t("lookupSuccess")}
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                disabled={lookupStatus === "loading"}
                className="text-muted-foreground"
              >
                {t("skipLookup")}
              </Button>
              <Button
                type="button"
                onClick={handleLookup}
                disabled={
                  !username || !password || lookupStatus === "loading"
                }
              >
                {lookupStatus === "loading" ? (
                  <Spinner />
                ) : (
                  <>
                    <Search className="mr-1 size-4" /> {t("lookup")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "review" && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {form.formState.errors.root && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.root.message}
                </p>
              )}

              {autoFetched && (
                <Badge variant="secondary" className="mb-2">
                  {t("autoFetched")}
                </Badge>
              )}

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
                        readOnly={autoFetched}
                        className={autoFetched ? "bg-muted" : ""}
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
                        readOnly={autoFetched}
                        className={autoFetched ? "bg-muted" : ""}
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
                        readOnly={autoFetched}
                        className={autoFetched ? "bg-muted" : ""}
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <MessageSquare className="inline size-3.5" />{" "}
                      {t("notes")}
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("credentials")}
                >
                  <ArrowLeft className="mr-1 size-4" /> {t("cancel")}
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Spinner /> : t("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
