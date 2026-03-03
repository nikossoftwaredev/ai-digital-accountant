"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ── Insurance purpose options (from EFKA portal) ─────────────────

export const INSURANCE_CERT_OPTIONS = [
  { value: "flagEkkath", label: "Είσπραξη Εκκαθαρισμένων Απαιτήσεων ποσού άνω των 3.000€ ανά εκκαθαρισμένη απαίτηση" },
  { value: "flagAthl", label: "Απόκτηση Αθλητή" },
  { value: "flagDaneio", label: "Σύναψη ή ανανέωση συμβάσεων δανείων άνω των 6.000€" },
  { value: "flagMetab", label: "Μεταβίβαση ακινήτων λόγω πώλησης, γονικής παροχής ή δωρεάς" },
  { value: "flagEstate", label: "Σύσταση εμπράγματου δικαιώματος επί ακινήτου" },
  { value: "flagCar", label: "Μεταβίβαση αυτοκινήτου ΔΧ" },
  { value: "flagFysDaneio", label: "Μεταβίβαση μεταχειρισμένων επαγγελματικών αυτοκινήτων, σκαφών, αεροσκαφών κ.λπ." },
  { value: "flagDimopr", label: "Συμμετοχή εργολήπτη σε δημοπρασία τεχνικού έργου" },
  { value: "flagPromith", label: "Συμμετοχή σε διαγωνισμούς ανάληψης δημοσίων έργων ή προμηθειών" },
  { value: "flagXrhmatod", label: "Συμμετοχή ως μέλος σε Κοινοπραξία ή εταίρος σε Ο.Ε, Ε.Ε, Ε.Π.Ε." },
  { value: "flagNotary", label: "Σύνταξη συμβολαιογραφικού προσυμφώνου με τον εργολάβο" },
  { value: "flagLegal", label: "Κάθε νόμιμη χρήση (ειδικές διατάξεις πέραν Ν. 4611/2019)" },
] as const;

// ── Types ────────────────────────────────────────────────────────

interface InsuranceCertFormProps {
  value: string;
  onChange: (value: string) => void;
  selectLabel?: string;
  searchLabel?: string;
  emptyLabel?: string;
}

// ── Component ────────────────────────────────────────────────────

export const InsuranceCertForm = ({
  value,
  onChange,
  selectLabel = "Επιλέξτε σκοπό",
  searchLabel = "Αναζήτηση...",
  emptyLabel = "Δεν βρέθηκε σκοπός",
}: InsuranceCertFormProps) => {
  const [open, setOpen] = useState(false);

  const selectedOption = INSURANCE_CERT_OPTIONS.find((o) => o.value === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{selectLabel}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto w-full justify-between text-left font-normal"
          >
            <span className="line-clamp-2">
              {selectedOption?.label ?? selectLabel}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchLabel} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              {INSURANCE_CERT_OPTIONS.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="text-sm">{option.label}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
