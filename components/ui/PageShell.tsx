import { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export default function PageShell({ children, maxWidth = "lg" }: PageShellProps) {
  const widthClasses = {
    sm: "max-w-2xl",
    md: "max-w-3xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  return (
    <div className={`${widthClasses[maxWidth]} mx-auto px-4 sm:px-6 py-8`}>
      {children}
    </div>
  );
}