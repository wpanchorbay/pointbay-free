import React from "react";

export const SkeletonSettings: React.FC = () => {
  const SkeleBox = () => (
    <div className="lb-mb-8 lb-bg-white lb-border lb-border-gray-200 lb-rounded-lg lb-overflow-hidden">
      <div className="lb-px-6 lb-py-5 lb-border-b lb-border-gray-200">
        <div className="lb-h-6 lb-bg-gray-200 lb-rounded lb-w-48 lb-mb-2"></div>
        <div className="lb-h-4 lb-bg-gray-200 lb-rounded lb-w-96"></div>
      </div>
      <div className="lb-px-6 lb-py-6 lb-flex lb-flex-col lb-gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="lb-flex lb-gap-4">
            <div className="lb-w-1/3">
              <div className="lb-h-5 lb-bg-gray-200 lb-rounded lb-w-32 lb-mb-2"></div>
              <div className="lb-h-3 lb-bg-gray-200 lb-rounded lb-w-24"></div>
            </div>
            <div className="lb-w-2/3">
              <div className="lb-h-10 lb-bg-gray-200 lb-rounded lb-w-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="lb-animate-pulse lb-w-full">
      <SkeleBox />
      <SkeleBox />
      <div className="lb-h-10 lb-bg-gray-200 lb-rounded lb-w-32 lb-mt-8"></div>
    </div>
  );
};
