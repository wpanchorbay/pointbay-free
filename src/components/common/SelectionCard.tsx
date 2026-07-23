import React from "react";

interface SelectionCardProps {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
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
  onMouseEnter,
  onMouseLeave,
  classNames,
}) => {
  const isDisabled = disabled;

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
