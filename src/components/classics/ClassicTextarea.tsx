import React from "react";

interface ClassicTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  description?: string;
  className?: string;
}

export const ClassicTextarea: React.FC<ClassicTextareaProps> = ({
  description,
  className = "",
  ...props
}) => {
  return (
    <div className="loyaltybay-w-full">
      <textarea
        className={`loyaltybay-w-full loyaltybay-p-3 loyaltybay-border loyaltybay-border-gray-300 loyaltybay-rounded-md loyaltybay-text-[14px] ${className}`}
        {...props}
      />
      {description && (
        <p className="description loyaltybay-mt-1 loyaltybay-text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
};
