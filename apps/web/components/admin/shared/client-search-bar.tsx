"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/general/utils";
import type { ClientRow } from "@/server_actions/clients";

interface ClientSearchBarProps {
  clients: ClientRow[];
  selectedClientId: string;
  onSelect: (clientId: string) => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-blue-100 text-blue-700", "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700", "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
};

const currencyFormatter = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" });
const formatCurrency = (amount: number): string => currencyFormatter.format(amount);

export const ClientSearchBar = ({ clients, selectedClientId, onSelect }: ClientSearchBarProps) => {
  const t = useTranslations("Admin.debts");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.afm.includes(q)
    );
  }, [clients, query]);

  const handleSelect = (clientId: string) => {
    onSelect(clientId);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  if (selectedClient && !open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="flex w-full items-center gap-3 rounded-lg border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", getAvatarColor(selectedClient.name))}>
          {getInitials(selectedClient.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{selectedClient.name}</div>
          <div className="text-sm text-muted-foreground">{selectedClient.afm}</div>
        </div>
        {Number(selectedClient.totalDebts) > 0 && (
          <span className="text-sm font-medium text-destructive">
            {formatCurrency(Number(selectedClient.totalDebts))}
          </span>
        )}
        <X className="size-4 shrink-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onSelect(""); }} />
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={t("searchClientPlaceholder")}
          className="pl-10 pr-10 h-12 text-base"
        />
        {query && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(client.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent",
                  client.id === selectedClientId && "bg-accent"
                )}
              >
                <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", getAvatarColor(client.name))}>
                  {getInitials(client.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{client.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{client.afm}</span>
                </div>
                <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                  {client.status === "ACTIVE" ? t("statusActive") : client.status === "PENDING" ? t("statusPending") : t("statusError")}
                </Badge>
                {Number(client.totalDebts) > 0 && (
                  <span className="text-xs font-medium text-destructive">
                    {formatCurrency(Number(client.totalDebts))}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-4 text-center text-sm text-muted-foreground shadow-lg">
          {t("noClientFound")}
        </div>
      )}
    </div>
  );
};
