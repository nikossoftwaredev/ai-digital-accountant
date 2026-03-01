import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { TypographyH3, TypographyRegular } from "@/components/ui/typography";
import { Link } from "@/lib/i18n/navigation";

interface ErrorPageProps {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}

export const ErrorPage = ({
  title,
  description,
  backHref = "/",
  backLabel = "Go back home",
}: ErrorPageProps) => {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center gap-2 pb-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <TypographyH3>{title}</TypographyH3>
        </CardHeader>
        <CardContent>
          <TypographyRegular className="text-muted-foreground">
            {description}
          </TypographyRegular>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
