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
  const hClass = height ? (height.includes("[") ? `loyaltybay-h-${height}` : `loyaltybay-h-[${height}]`) : "";
  const wClass = width ? (width.includes("[") ? `loyaltybay-w-${width}` : `loyaltybay-w-[${width}]`) : "";
  const rClass = borderRadius ? (borderRadius.includes("[") ? `loyaltybay-rounded-${borderRadius}` : `loyaltybay-rounded-[${borderRadius}]`) : "loyaltybay-rounded-[6px]";

  return (
    <div
      className={`
        loyaltybay-block loyaltybay-bg-[#e9e9e9] loyaltybay-relative loyaltybay-overflow-hidden
        loyaltybay-animate-shimmer
        ${hClass} ${wClass} ${rClass}
        ${className || ""}
        [&>*]:loyaltybay-opacity-0
      `}
    >
      {children}
    </div>
  );
};

export default Skeleton;
