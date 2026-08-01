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
    <div className="pointbay-w-full">
      <textarea
        className={`pointbay-w-full pointbay-p-3 pointbay-border pointbay-border-gray-300 pointbay-rounded-md pointbay-text-[14px] ${className}`}
        {...props}
      />
      {description && (
        <p className="description pointbay-mt-1 pointbay-text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
};
