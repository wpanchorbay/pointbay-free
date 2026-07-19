import { FC, ReactNode } from "react";

interface SkeletonProps {
  height?: string;
  width?: string;
  borderRadius?: string;
  children?: ReactNode;
  className?: string;
}

const Skeleton: FC<SkeletonProps> = ({
  height,
  width,
  borderRadius,
  children,
  className,
}) => {
  // Helpers to handle arbitrary values safely
  const hClass = height ? (height.includes("[") ? `lb-h-${height}` : `lb-h-[${height}]`) : "";
  const wClass = width ? (width.includes("[") ? `lb-w-${width}` : `lb-w-[${width}]`) : "";
  const rClass = borderRadius ? (borderRadius.includes("[") ? `lb-rounded-${borderRadius}` : `lb-rounded-[${borderRadius}]`) : "lb-rounded-[6px]";

  return (
    <div
      className={`
        lb-block lb-bg-[#e9e9e9] lb-relative lb-overflow-hidden
        lb-animate-shimmer
        ${hClass} ${wClass} ${rClass}
        ${className || ""}
        [&>*]:lb-opacity-0
      `}
    >
      {children}
    </div>
  );
};

export default Skeleton;
