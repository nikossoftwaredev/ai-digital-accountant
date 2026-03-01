import { ReactNode } from "react";

export interface BasePageProps {
  params: Promise<{
    locale: string;
  }>;
}

export interface BaseLayoutProps extends BasePageProps {
  children?: ReactNode;
}
