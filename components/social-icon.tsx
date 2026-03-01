"use client";

import { cn } from "@/lib/general/utils";

const COLOR_CLASSES: Record<string, string> = {
  instagram: "bg-pink-500/10 hover:bg-pink-500/20 text-pink-500",
  youtube: "bg-red-500/10 hover:bg-red-500/20 text-red-500",
  spotify: "bg-green-500/10 hover:bg-green-500/20 text-green-500",
  facebook: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-500",
  twitter: "bg-sky-500/10 hover:bg-sky-500/20 text-sky-500",
  tiktok: "bg-neutral-500/10 hover:bg-neutral-500/20 text-neutral-900 dark:text-neutral-100",
  linkedin: "bg-blue-600/10 hover:bg-blue-600/20 text-blue-600",
};

interface SocialIconProps {
  url: string;
  icon: React.ReactNode;
  color: string;
  isMobile?: boolean;
  className?: string;
}

const SocialIcon = ({
  url,
  icon,
  color,
  isMobile = false,
  className,
}: SocialIconProps) => {
  const colorClasses =
    COLOR_CLASSES[color] ?? "bg-primary/10 hover:bg-primary/20 text-primary";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-center rounded-md transition-all duration-300 hover:scale-110 hover:shadow-lg",
        isMobile ? "h-10 w-10" : "h-12 w-12",
        colorClasses,
        className,
      )}
    >
      {icon}
    </a>
  );
};

export { SocialIcon, COLOR_CLASSES };
export type { SocialIconProps };
