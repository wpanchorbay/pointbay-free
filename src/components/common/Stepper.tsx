import React, { Dispatch, SetStateAction } from "react";

interface StepperProps {
  steps: string[];
  currentStep: number;
  setStep: (step: number) => void | Dispatch<SetStateAction<number>>;
  classNames?: {
    root?: string;
    container?: string;
    backgroundLine?: string;
    progressLine?: string;
    stepContainer?: string;
    stepCircle?: string;
    stepLabel?: string;
  };
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  setStep,
  classNames,
}) => {
  // Calculate width percentage for the green progress line
  // Total segments = steps.length - 1
  // If currentStep is 1, progress is 0%
  // If currentStep is 2, progress covers the first segment
  const progressPercentage = Math.max(
    0,
    Math.min(100, ((currentStep - 1) / (steps.length - 1)) * 100),
  );

  return (
    <div
      className={`pointbay-w-full pointbay-py-6 ${classNames?.root || ""}`}
    >
      <div
        className={`pointbay-flex pointbay-justify-between pointbay-items-start pointbay-relative ${
          classNames?.container || ""
        }`}
      >
        {/* Background Grey Line */}
        {/* Positioned with left-16 and right-16 (4rem) to start/end at the center of the first/last circles (w-32 items) */}
        <div
          className={`pointbay-absolute pointbay-top-5 pointbay-left-16 pointbay-right-16 pointbay-h-[2px] pointbay-bg-gray-200 pointbay-z-0 ${
            classNames?.backgroundLine || ""
          }`}
        >
          {/* Foreground Green Line */}
          <div
            className={`pointbay-h-full pointbay-bg-green-500 pointbay-transition-all pointbay-duration-500 pointbay-ease-out ${
              classNames?.progressLine || ""
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <div
              key={step}
              className={`pointbay-flex pointbay-flex-col pointbay-items-center pointbay-relative pointbay-z-10 pointbay-w-32  ${
                classNames?.stepContainer || ""
              }`}
            >
              <div
                onClick={isCompleted ? () => setStep(stepNum) : undefined}
                className={`
                  pointbay-w-10 pointbay-h-10 pointbay-rounded-full pointbay-flex pointbay-items-center pointbay-justify-center
                  pointbay-transition-colors pointbay-duration-300 pointbay-border-2
                  ${
                    isCompleted
                      ? "pointbay-cursor-pointer"
                      : "pointbay-cursor-not-allowed"
                  }
                  ${
                    isCompleted || isActive
                      ? "pointbay-bg-green-500 pointbay-border-green-500 pointbay-text-white"
                      : "pointbay-bg-gray-300 pointbay-border-gray-300 pointbay-text-white"
                  }
                  ${classNames?.stepCircle || ""}
                `}
              >
                {isCompleted ? (
                  <svg
                    className="pointbay-w-6 pointbay-h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="pointbay-text-sm pointbay-font-bold">
                    {stepNum.toString().padStart(2, "0")}
                  </span>
                )}
              </div>
              <div
                className={`pointbay-mt-3 pointbay-text-xs pointbay-font-bold pointbay-text-center pointbay-transition-colors ${
                  isActive || isCompleted
                    ? "pointbay-text-gray-900"
                    : "pointbay-text-gray-500"
                } ${classNames?.stepLabel || ""}`}
              >
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
