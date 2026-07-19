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
      className={`lb-w-full lb-py-6 ${classNames?.root || ""}`}
    >
      <div
        className={`lb-flex lb-justify-between lb-items-start lb-relative ${
          classNames?.container || ""
        }`}
      >
        {/* Background Grey Line */}
        {/* Positioned with left-16 and right-16 (4rem) to start/end at the center of the first/last circles (w-32 items) */}
        <div
          className={`lb-absolute lb-top-5 lb-left-16 lb-right-16 lb-h-[2px] lb-bg-gray-200 lb-z-0 ${
            classNames?.backgroundLine || ""
          }`}
        >
          {/* Foreground Green Line */}
          <div
            className={`lb-h-full lb-bg-green-500 lb-transition-all lb-duration-500 lb-ease-out ${
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
              className={`lb-flex lb-flex-col lb-items-center lb-relative lb-z-10 lb-w-32  ${
                classNames?.stepContainer || ""
              }`}
            >
              <div
                onClick={isCompleted ? () => setStep(stepNum) : undefined}
                className={`
                  lb-w-10 lb-h-10 lb-rounded-full lb-flex lb-items-center lb-justify-center
                  lb-transition-colors lb-duration-300 lb-border-2
                  ${
                    isCompleted
                      ? "lb-cursor-pointer"
                      : "lb-cursor-not-allowed"
                  }
                  ${
                    isCompleted || isActive
                      ? "lb-bg-green-500 lb-border-green-500 lb-text-white"
                      : "lb-bg-gray-300 lb-border-gray-300 lb-text-white"
                  }
                  ${classNames?.stepCircle || ""}
                `}
              >
                {isCompleted ? (
                  <svg
                    className="lb-w-6 lb-h-6"
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
                  <span className="lb-text-sm lb-font-bold">
                    {stepNum.toString().padStart(2, "0")}
                  </span>
                )}
              </div>
              <div
                className={`lb-mt-3 lb-text-xs lb-font-bold lb-text-center lb-transition-colors ${
                  isActive || isCompleted
                    ? "lb-text-gray-900"
                    : "lb-text-gray-500"
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
