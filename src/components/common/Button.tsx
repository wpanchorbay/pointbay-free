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
      small: "loyaltybay-px-[8px] loyaltybay-py-[5px]",
      medium: "loyaltybay-px-[12px] loyaltybay-py-[6px]",
      large: "loyaltybay-px-[16px] loyaltybay-py-[10px]",
    };

    const colorClasses = {
      primary: {
        solid:
          "loyaltybay-bg-primary loyaltybay-text-white loyaltybay-border loyaltybay-border-primary hover:loyaltybay-bg-primary-hovered hover:loyaltybay-border-primary-hovered",
        outline:
          "loyaltybay-bg-transparent loyaltybay-border loyaltybay-border-primary loyaltybay-text-primary hover:loyaltybay-bg-primary hover:loyaltybay-text-white",
        ghost:
          "loyaltybay-bg-transparent loyaltybay-text-primary hover:loyaltybay-text-primary-hovered hover:loyaltybay-bg-primary/10",
      },
      secondary: {
        solid:
          "loyaltybay-bg-secondary loyaltybay-text-white loyaltybay-border loyaltybay-border-secondary hover:loyaltybay-bg-secondary-hovered",
        outline:
          "loyaltybay-bg-transparent loyaltybay-border loyaltybay-border-secondary loyaltybay-text-secondary hover:loyaltybay-bg-secondary hover:loyaltybay-text-white",
        ghost:
          "loyaltybay-bg-transparent loyaltybay-text-[#1e1e1e] hover:!loyaltybay-text-primary",
      },
      danger: {
        solid:
          "loyaltybay-bg-red-500 loyaltybay-text-white loyaltybay-border loyaltybay-border-red-500 hover:loyaltybay-bg-red-600 hover:loyaltybay-border-red-600",
        outline:
          "loyaltybay-bg-transparent loyaltybay-border loyaltybay-border-red-500 loyaltybay-text-red-500 hover:loyaltybay-bg-red-500 hover:loyaltybay-text-white",
        ghost:
          "loyaltybay-bg-transparent loyaltybay-text-red-500 hover:loyaltybay-bg-red-500/10",
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
                loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center loyaltybay-gap-[6px]
                loyaltybay-text-default loyaltybay-rounded-[8px] loyaltybay-transition-all loyaltybay-duration-200
                disabled:loyaltybay-opacity-50 disabled:loyaltybay-cursor-not-allowed
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
