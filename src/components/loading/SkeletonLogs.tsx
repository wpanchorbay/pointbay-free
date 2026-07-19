import React from "react";

export const SkeletonLogs: React.FC = () => {
  return (
    <div className="lb-animate-pulse lb-bg-gray-900 lb-rounded-lg lb-overflow-hidden lb-shadow-sm lb-w-full">
      <div className="lb-p-4 lb-bg-gray-800 lb-border-b lb-border-gray-700 lb-flex lb-justify-between lb-items-center">
        <div className="lb-h-3 lb-bg-gray-600 lb-rounded lb-w-24"></div>
      </div>
      <div className="lb-p-4 lb-h-[400px]">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="lb-h-3 lb-bg-gray-700 lb-rounded lb-mb-3" style={{ width: `${Math.random() * 40 + 40}%` }}></div>
        ))}
      </div>
    </div>
  );
};
