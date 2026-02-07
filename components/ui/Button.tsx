import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  className?: string;
}

export default function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
}: ButtonProps) {
  const baseClasses = "font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:hover:bg-gray-100",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 disabled:hover:bg-transparent",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
