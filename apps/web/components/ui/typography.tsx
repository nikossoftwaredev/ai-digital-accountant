import { cn } from "@/lib/general/utils";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

export const TypographyH1 = ({ className, children, ...props }: TypographyProps) => (
  <h1
    className={cn("scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl", className)}
    {...props}
  >
    {children}
  </h1>
);

export const TypographyH2 = ({ className, children, ...props }: TypographyProps) => (
  <h2
    className={cn("scroll-m-20 text-3xl font-semibold tracking-tight", className)}
    {...props}
  >
    {children}
  </h2>
);

export const TypographyH3 = ({ className, children, ...props }: TypographyProps) => (
  <h3
    className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)}
    {...props}
  >
    {children}
  </h3>
);

export const TypographyH4 = ({ className, children, ...props }: TypographyProps) => (
  <h4
    className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)}
    {...props}
  >
    {children}
  </h4>
);

export const TypographyRegular = ({ className, children, ...props }: TypographyProps) => (
  <p className={cn("leading-7", className)} {...props}>
    {children}
  </p>
);

export const TypographyMedium = ({ className, children, ...props }: TypographyProps) => (
  <p className={cn("leading-7 font-medium", className)} {...props}>
    {children}
  </p>
);

export const TypographySmallReg = ({ className, children, ...props }: TypographyProps) => (
  <p className={cn("text-sm leading-6", className)} {...props}>
    {children}
  </p>
);

export const TypographySmallMedium = ({ className, children, ...props }: TypographyProps) => (
  <p className={cn("text-sm leading-6 font-medium", className)} {...props}>
    {children}
  </p>
);

export const TypographyMiniReg = ({ className, children, ...props }: TypographyProps) => (
  <p className={cn("text-xs leading-5", className)} {...props}>
    {children}
  </p>
);

export const TypographyMiniMedium = ({ className, children, ...props }: TypographyProps) => (
  <p className={cn("text-xs leading-5 font-medium", className)} {...props}>
    {children}
  </p>
);

export const TypographyMono = ({ className, children, ...props }: TypographyProps) => (
  <code className={cn("font-mono text-sm", className)} {...props}>
    {children}
  </code>
);