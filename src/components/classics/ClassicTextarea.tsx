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
    <div className="lb-w-full">
      <textarea
        className={`lb-w-full lb-p-3 lb-border lb-border-gray-300 lb-rounded-md lb-text-[14px] ${className}`}
        {...props}
      />
      {description && (
        <p className="description lb-mt-1 lb-text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
};
