import React from "react";

// Icons
const LockKeyhole = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="16" r="1" />
    <rect x="3" y="10" width="18" height="12" rx="2" />
    <path d="M7 10V7a5 5 0 0 1 10 0v3" />
  </svg>
);

const Hourglass = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
  </svg>
);

interface SelectionCardProps {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: "buy_pro" | "coming_soon";
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  classNames?: {
    root?: string;
    iconWrapper?: string;
    circle?: string;
    dot?: string;
    textWrapper?: string;
    title?: string;
    description?: string;
  };
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  title,
  description,
  selected,
  onClick,
  icon,
  disabled,
  variant,
  onMouseEnter,
  onMouseLeave,
  classNames,
}) => {
  const isPro = variant === "buy_pro";
  const isComingSoon = variant === "coming_soon";
  const isDisabled = disabled || isPro || isComingSoon;

  return (
    <div
      onClick={() => !isDisabled && onClick()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        lb-relative lb-p-[20px] lb-rounded-[8px] lb-transition-all lb-duration-200
        lb-flex lb-items-start lb-gap-[10px]
        ${
          isDisabled
            ? "lb-bg-gray-50 lb-border lb-border-gray-200 lb-cursor-not-allowed"
            : "lb-cursor-pointer"
        }
        ${
          !isDisabled && selected
            ? "lb-bg-primary lb-border lb-border-primary lb-shadow-sm lb-shadow-primary/20"
            : !isDisabled
            ? "lb-bg-white lb-border lb-border-gray-100 hover:lb-border-gray-300"
            : ""
        }
        ${classNames?.root || ""}
      `}
    >
      {/* Badges */}
      {isPro && (
        <div
          className="lb-absolute lb-top-3 lb-right-3"
          title="Upgrade to Pro"
        >
          <LockKeyhole className="lb-w-5 lb-h-5 lb-text-[#f02a74]" />
        </div>
      )}
      {isComingSoon && (
        <div className="lb-absolute lb-top-3 lb-right-3">
          <span className="lb-bg-pink-100 lb-text-pink-600 lb-px-2 lb-py-0.5 lb-rounded-full lb-text-[10px] lb-font-bold lb-uppercase lb-flex lb-items-center lb-gap-1">
            <Hourglass className="lb-w-3 lb-h-3" />
            Soon
          </span>
        </div>
      )}

      <div className={`lb-mt-1 ${classNames?.iconWrapper || ""}`}>
        <div
          className={`
            lb-w-5 lb-h-5 lb-rounded-full lb-border-2 lb-flex lb-items-center lb-justify-center
            ${
              isDisabled
                ? "lb-border-gray-300 lb-bg-gray-100"
                : ""
            }
            ${
              !isDisabled && selected
                ? "lb-border-white"
                : !isDisabled
                ? "lb-border-gray-300"
                : ""
            }
            ${classNames?.circle || ""}
        `}
        >
          {!isDisabled && selected && (
            <div
              className={`lb-w-2.5 lb-h-2.5 lb-bg-white lb-rounded-full ${
                classNames?.dot || ""
              }`}
            />
          )}
        </div>
      </div>
      <div className={classNames?.textWrapper || ""}>
        <h3
          className={`lb-text-[15px] lb-leading-[24px] lb-font-[700] lb-mb-1 ${
            !isDisabled && selected
              ? "lb-text-white"
              : "lb-text-gray-900"
          } ${isDisabled ? "!lb-text-gray-400" : ""} ${
            classNames?.title || ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`lb-text-[13px] lb-leading-[20px] ${
            !isDisabled && selected
              ? "lb-text-blue-100"
              : "lb-text-gray-500"
          } ${isDisabled ? "!lb-text-gray-400" : ""} ${
            classNames?.description || ""
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
};
