import React, { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  size?: "small" | "medium" | "large";
  color?: "primary" | "secondary" | "danger";
  variant?: "solid" | "outline" | "ghost";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      size = "medium",
      color = "primary",
      variant = "solid",
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      small: "lb-px-[8px] lb-py-[5px]",
      medium: "lb-px-[12px] lb-py-[6px]",
      large: "lb-px-[16px] lb-py-[10px]",
    };

    const colorClasses = {
      primary: {
        solid:
          "lb-bg-primary lb-text-white lb-border lb-border-primary hover:lb-bg-primary-hovered hover:lb-border-primary-hovered",
        outline:
          "lb-bg-transparent lb-border lb-border-primary lb-text-primary hover:lb-bg-primary hover:lb-text-white",
        ghost:
          "lb-bg-transparent lb-text-primary hover:lb-text-primary-hovered hover:lb-bg-primary/10",
      },
      secondary: {
        solid:
          "lb-bg-secondary lb-text-white lb-border lb-border-secondary hover:lb-bg-secondary-hovered",
        outline:
          "lb-bg-transparent lb-border lb-border-secondary lb-text-secondary hover:lb-bg-secondary hover:lb-text-white",
        ghost:
          "lb-bg-transparent lb-text-[#1e1e1e] hover:!lb-text-primary",
      },
      danger: {
        solid:
          "lb-bg-red-500 lb-text-white lb-border lb-border-red-500 hover:lb-bg-red-600 hover:lb-border-red-600",
        outline:
          "lb-bg-transparent lb-border lb-border-red-500 lb-text-red-500 hover:lb-bg-red-500 hover:lb-text-white",
        ghost:
          "lb-bg-transparent lb-text-red-500 hover:lb-bg-red-500/10",
      },
    };

    // Safely access nested properties
    const variantClasses =
      colorClasses[color]?.[variant] ?? colorClasses.primary.solid;
    const finalSizeClass = sizeClasses[size] ?? sizeClasses.medium;

    return (
      <button
        ref={ref}
        className={`
                lb-flex lb-items-center lb-justify-center lb-gap-[6px]
                lb-text-default lb-rounded-[8px] lb-transition-all lb-duration-200
                disabled:lb-opacity-50 disabled:lb-cursor-not-allowed
                ${finalSizeClass} 
                ${variantClasses} 
                ${className}
            `}
        {...props}
      >
        {children}
      </button>
    );
  },
);

export default Button;
