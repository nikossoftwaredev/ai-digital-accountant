"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeSwitcher } from "@/components/examples/ThemeSwitcher";

export const AdminHeader = () => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex h-full w-full items-center gap-3 p-4 sm:gap-4">
        <SidebarTrigger className="max-md:scale-125" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1" />
        <ThemeSwitcher />
      </div>
    </header>
  );
};
