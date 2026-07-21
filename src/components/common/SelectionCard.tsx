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
        loyaltybay-relative loyaltybay-p-[20px] loyaltybay-rounded-[8px] loyaltybay-transition-all loyaltybay-duration-200
        loyaltybay-flex loyaltybay-items-start loyaltybay-gap-[10px]
        ${
          isDisabled
            ? "loyaltybay-bg-gray-50 loyaltybay-border loyaltybay-border-gray-200 loyaltybay-cursor-not-allowed"
            : "loyaltybay-cursor-pointer"
        }
        ${
          !isDisabled && selected
            ? "loyaltybay-bg-primary loyaltybay-border loyaltybay-border-primary loyaltybay-shadow-sm loyaltybay-shadow-primary/20"
            : !isDisabled
            ? "loyaltybay-bg-white loyaltybay-border loyaltybay-border-gray-100 hover:loyaltybay-border-gray-300"
            : ""
        }
        ${classNames?.root || ""}
      `}
    >
      {/* Badges */}
      {isPro && (
        <div
          className="loyaltybay-absolute loyaltybay-top-3 loyaltybay-right-3"
          title="Upgrade to Pro"
        >
          <LockKeyhole className="loyaltybay-w-5 loyaltybay-h-5 loyaltybay-text-[#f02a74]" />
        </div>
      )}
      {isComingSoon && (
        <div className="loyaltybay-absolute loyaltybay-top-3 loyaltybay-right-3">
          <span className="loyaltybay-bg-pink-100 loyaltybay-text-pink-600 loyaltybay-px-2 loyaltybay-py-0.5 loyaltybay-rounded-full loyaltybay-text-[10px] loyaltybay-font-bold loyaltybay-uppercase loyaltybay-flex loyaltybay-items-center loyaltybay-gap-1">
            <Hourglass className="loyaltybay-w-3 loyaltybay-h-3" />
            Soon
          </span>
        </div>
      )}

      <div className={`loyaltybay-mt-1 ${classNames?.iconWrapper || ""}`}>
        <div
          className={`
            loyaltybay-w-5 loyaltybay-h-5 loyaltybay-rounded-full loyaltybay-border-2 loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center
            ${
              isDisabled
                ? "loyaltybay-border-gray-300 loyaltybay-bg-gray-100"
                : ""
            }
            ${
              !isDisabled && selected
                ? "loyaltybay-border-white"
                : !isDisabled
                ? "loyaltybay-border-gray-300"
                : ""
            }
            ${classNames?.circle || ""}
        `}
        >
          {!isDisabled && selected && (
            <div
              className={`loyaltybay-w-2.5 loyaltybay-h-2.5 loyaltybay-bg-white loyaltybay-rounded-full ${
                classNames?.dot || ""
              }`}
            />
          )}
        </div>
      </div>
      <div className={classNames?.textWrapper || ""}>
        <h3
          className={`loyaltybay-text-[15px] loyaltybay-leading-[24px] loyaltybay-font-[700] loyaltybay-mb-1 ${
            !isDisabled && selected
              ? "loyaltybay-text-white"
              : "loyaltybay-text-gray-900"
          } ${isDisabled ? "!loyaltybay-text-gray-400" : ""} ${
            classNames?.title || ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`loyaltybay-text-[13px] loyaltybay-leading-[20px] ${
            !isDisabled && selected
              ? "loyaltybay-text-blue-100"
              : "loyaltybay-text-gray-500"
          } ${isDisabled ? "!loyaltybay-text-gray-400" : ""} ${
            classNames?.description || ""
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
};
