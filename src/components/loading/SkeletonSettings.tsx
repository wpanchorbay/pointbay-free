import React from "react";

export const SkeletonSettings: React.FC = () => {
  const SkeleBox = () => (
    <div className="pointbay-mb-8 pointbay-bg-white pointbay-border pointbay-border-gray-200 pointbay-rounded-lg pointbay-overflow-hidden">
      <div className="pointbay-px-6 pointbay-py-5 pointbay-border-b pointbay-border-gray-200">
        <div className="pointbay-h-6 pointbay-bg-gray-200 pointbay-rounded pointbay-w-48 pointbay-mb-2"></div>
        <div className="pointbay-h-4 pointbay-bg-gray-200 pointbay-rounded pointbay-w-96"></div>
      </div>
      <div className="pointbay-px-6 pointbay-py-6 pointbay-flex pointbay-flex-col pointbay-gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="pointbay-flex pointbay-gap-4">
            <div className="pointbay-w-1/3">
              <div className="pointbay-h-5 pointbay-bg-gray-200 pointbay-rounded pointbay-w-32 pointbay-mb-2"></div>
              <div className="pointbay-h-3 pointbay-bg-gray-200 pointbay-rounded pointbay-w-24"></div>
            </div>
            <div className="pointbay-w-2/3">
              <div className="pointbay-h-10 pointbay-bg-gray-200 pointbay-rounded pointbay-w-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pointbay-animate-pulse pointbay-w-full">
      <SkeleBox />
      <SkeleBox />
      <div className="pointbay-h-10 pointbay-bg-gray-200 pointbay-rounded pointbay-w-32 pointbay-mt-8"></div>
    </div>
  );
};
