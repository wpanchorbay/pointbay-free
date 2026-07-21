import React from "react";

export const SkeletonSettings: React.FC = () => {
  const SkeleBox = () => (
    <div className="loyaltybay-mb-8 loyaltybay-bg-white loyaltybay-border loyaltybay-border-gray-200 loyaltybay-rounded-lg loyaltybay-overflow-hidden">
      <div className="loyaltybay-px-6 loyaltybay-py-5 loyaltybay-border-b loyaltybay-border-gray-200">
        <div className="loyaltybay-h-6 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-48 loyaltybay-mb-2"></div>
        <div className="loyaltybay-h-4 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-96"></div>
      </div>
      <div className="loyaltybay-px-6 loyaltybay-py-6 loyaltybay-flex loyaltybay-flex-col loyaltybay-gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="loyaltybay-flex loyaltybay-gap-4">
            <div className="loyaltybay-w-1/3">
              <div className="loyaltybay-h-5 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-32 loyaltybay-mb-2"></div>
              <div className="loyaltybay-h-3 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-24"></div>
            </div>
            <div className="loyaltybay-w-2/3">
              <div className="loyaltybay-h-10 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="loyaltybay-animate-pulse loyaltybay-w-full">
      <SkeleBox />
      <SkeleBox />
      <div className="loyaltybay-h-10 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-32 loyaltybay-mt-8"></div>
    </div>
  );
};
