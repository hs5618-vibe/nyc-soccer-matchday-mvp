import { ReactNode } from "react";

interface SectionHeaderProps {
  children: ReactNode;
  subtitle?: string;
}

export default function SectionHeader({ children, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900">{children}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}