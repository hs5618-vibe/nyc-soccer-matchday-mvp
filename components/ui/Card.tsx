import { ReactNode } from "react";
import Link from "next/link";

interface CardProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export default function Card({ children, href, onClick, className = "" }: CardProps) {
  const baseClasses = "bg-white border border-gray-200 rounded-xl p-5 transition-all duration-200";
  const interactiveClasses = (href || onClick) 
    ? "hover:border-gray-300 hover:shadow-md cursor-pointer" 
    : "";
  
  const classes = `${baseClasses} ${interactiveClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block ${classes}`}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div onClick={onClick} className={classes}>
        {children}
      </div>
    );
  }

  return <div className={classes}>{children}</div>;
}