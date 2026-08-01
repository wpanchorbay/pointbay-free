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
  const hClass = height ? (height.includes("[") ? `pointbay-h-${height}` : `pointbay-h-[${height}]`) : "";
  const wClass = width ? (width.includes("[") ? `pointbay-w-${width}` : `pointbay-w-[${width}]`) : "";
  const rClass = borderRadius ? (borderRadius.includes("[") ? `pointbay-rounded-${borderRadius}` : `pointbay-rounded-[${borderRadius}]`) : "pointbay-rounded-[6px]";

  return (
    <div
      className={`
        pointbay-block pointbay-bg-[#e9e9e9] pointbay-relative pointbay-overflow-hidden
        pointbay-animate-shimmer
        ${hClass} ${wClass} ${rClass}
        ${className || ""}
        [&>*]:pointbay-opacity-0
      `}
    >
      {children}
    </div>
  );
};

export default Skeleton;
