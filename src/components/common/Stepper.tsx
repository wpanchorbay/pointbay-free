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
      className={`loyaltybay-w-full loyaltybay-py-6 ${classNames?.root || ""}`}
    >
      <div
        className={`loyaltybay-flex loyaltybay-justify-between loyaltybay-items-start loyaltybay-relative ${
          classNames?.container || ""
        }`}
      >
        {/* Background Grey Line */}
        {/* Positioned with left-16 and right-16 (4rem) to start/end at the center of the first/last circles (w-32 items) */}
        <div
          className={`loyaltybay-absolute loyaltybay-top-5 loyaltybay-left-16 loyaltybay-right-16 loyaltybay-h-[2px] loyaltybay-bg-gray-200 loyaltybay-z-0 ${
            classNames?.backgroundLine || ""
          }`}
        >
          {/* Foreground Green Line */}
          <div
            className={`loyaltybay-h-full loyaltybay-bg-green-500 loyaltybay-transition-all loyaltybay-duration-500 loyaltybay-ease-out ${
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
              className={`loyaltybay-flex loyaltybay-flex-col loyaltybay-items-center loyaltybay-relative loyaltybay-z-10 loyaltybay-w-32  ${
                classNames?.stepContainer || ""
              }`}
            >
              <div
                onClick={isCompleted ? () => setStep(stepNum) : undefined}
                className={`
                  loyaltybay-w-10 loyaltybay-h-10 loyaltybay-rounded-full loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center
                  loyaltybay-transition-colors loyaltybay-duration-300 loyaltybay-border-2
                  ${
                    isCompleted
                      ? "loyaltybay-cursor-pointer"
                      : "loyaltybay-cursor-not-allowed"
                  }
                  ${
                    isCompleted || isActive
                      ? "loyaltybay-bg-green-500 loyaltybay-border-green-500 loyaltybay-text-white"
                      : "loyaltybay-bg-gray-300 loyaltybay-border-gray-300 loyaltybay-text-white"
                  }
                  ${classNames?.stepCircle || ""}
                `}
              >
                {isCompleted ? (
                  <svg
                    className="loyaltybay-w-6 loyaltybay-h-6"
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
                  <span className="loyaltybay-text-sm loyaltybay-font-bold">
                    {stepNum.toString().padStart(2, "0")}
                  </span>
                )}
              </div>
              <div
                className={`loyaltybay-mt-3 loyaltybay-text-xs loyaltybay-font-bold loyaltybay-text-center loyaltybay-transition-colors ${
                  isActive || isCompleted
                    ? "loyaltybay-text-gray-900"
                    : "loyaltybay-text-gray-500"
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
