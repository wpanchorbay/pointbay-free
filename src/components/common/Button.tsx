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
      small: "pointbay-px-[8px] pointbay-py-[5px]",
      medium: "pointbay-px-[12px] pointbay-py-[6px]",
      large: "pointbay-px-[16px] pointbay-py-[10px]",
    };

    const colorClasses = {
      primary: {
        solid:
          "pointbay-bg-primary pointbay-text-white pointbay-border pointbay-border-primary hover:pointbay-bg-primary-hovered hover:pointbay-border-primary-hovered",
        outline:
          "pointbay-bg-transparent pointbay-border pointbay-border-primary pointbay-text-primary hover:pointbay-bg-primary hover:pointbay-text-white",
        ghost:
          "pointbay-bg-transparent pointbay-text-primary hover:pointbay-text-primary-hovered hover:pointbay-bg-primary/10",
      },
      secondary: {
        solid:
          "pointbay-bg-secondary pointbay-text-white pointbay-border pointbay-border-secondary hover:pointbay-bg-secondary-hovered",
        outline:
          "pointbay-bg-transparent pointbay-border pointbay-border-secondary pointbay-text-secondary hover:pointbay-bg-secondary hover:pointbay-text-white",
        ghost:
          "pointbay-bg-transparent pointbay-text-[#1e1e1e] hover:!pointbay-text-primary",
      },
      danger: {
        solid:
          "pointbay-bg-red-500 pointbay-text-white pointbay-border pointbay-border-red-500 hover:pointbay-bg-red-600 hover:pointbay-border-red-600",
        outline:
          "pointbay-bg-transparent pointbay-border pointbay-border-red-500 pointbay-text-red-500 hover:pointbay-bg-red-500 hover:pointbay-text-white",
        ghost:
          "pointbay-bg-transparent pointbay-text-red-500 hover:pointbay-bg-red-500/10",
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
                pointbay-flex pointbay-items-center pointbay-justify-center pointbay-gap-[6px]
                pointbay-text-default pointbay-rounded-[8px] pointbay-transition-all pointbay-duration-200
                disabled:pointbay-opacity-50 disabled:pointbay-cursor-not-allowed
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
