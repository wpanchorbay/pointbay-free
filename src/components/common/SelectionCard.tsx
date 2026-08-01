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
        pointbay-relative pointbay-p-[20px] pointbay-rounded-[8px] pointbay-transition-all pointbay-duration-200
        pointbay-flex pointbay-items-start pointbay-gap-[10px]
        ${
          isDisabled
            ? "pointbay-bg-gray-50 pointbay-border pointbay-border-gray-200 pointbay-cursor-not-allowed"
            : "pointbay-cursor-pointer"
        }
        ${
          !isDisabled && selected
            ? "pointbay-bg-primary pointbay-border pointbay-border-primary pointbay-shadow-sm pointbay-shadow-primary/20"
            : !isDisabled
            ? "pointbay-bg-white pointbay-border pointbay-border-gray-100 hover:pointbay-border-gray-300"
            : ""
        }
        ${classNames?.root || ""}
      `}
    >
      <div className={`pointbay-mt-1 ${classNames?.iconWrapper || ""}`}>
        <div
          className={`
            pointbay-w-5 pointbay-h-5 pointbay-rounded-full pointbay-border-2 pointbay-flex pointbay-items-center pointbay-justify-center
            ${
              isDisabled
                ? "pointbay-border-gray-300 pointbay-bg-gray-100"
                : ""
            }
            ${
              !isDisabled && selected
                ? "pointbay-border-white"
                : !isDisabled
                ? "pointbay-border-gray-300"
                : ""
            }
            ${classNames?.circle || ""}
        `}
        >
          {!isDisabled && selected && (
            <div
              className={`pointbay-w-2.5 pointbay-h-2.5 pointbay-bg-white pointbay-rounded-full ${
                classNames?.dot || ""
              }`}
            />
          )}
        </div>
      </div>
      <div className={classNames?.textWrapper || ""}>
        <h3
          className={`pointbay-text-[15px] pointbay-leading-[24px] pointbay-font-[700] pointbay-mb-1 ${
            !isDisabled && selected
              ? "pointbay-text-white"
              : "pointbay-text-gray-900"
          } ${isDisabled ? "!pointbay-text-gray-400" : ""} ${
            classNames?.title || ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`pointbay-text-[13px] pointbay-leading-[20px] ${
            !isDisabled && selected
              ? "pointbay-text-blue-100"
              : "pointbay-text-gray-500"
          } ${isDisabled ? "!pointbay-text-gray-400" : ""} ${
            classNames?.description || ""
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
};
