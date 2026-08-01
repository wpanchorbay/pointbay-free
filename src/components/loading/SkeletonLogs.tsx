import React from "react";

export const SkeletonLogs: React.FC = () => {
  return (
    <div className="pointbay-animate-pulse pointbay-bg-gray-900 pointbay-rounded-lg pointbay-overflow-hidden pointbay-shadow-sm pointbay-w-full">
      <div className="pointbay-p-4 pointbay-bg-gray-800 pointbay-border-b pointbay-border-gray-700 pointbay-flex pointbay-justify-between pointbay-items-center">
        <div className="pointbay-h-3 pointbay-bg-gray-600 pointbay-rounded pointbay-w-24"></div>
      </div>
      <div className="pointbay-p-4 pointbay-h-[400px]">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="pointbay-h-3 pointbay-bg-gray-700 pointbay-rounded pointbay-mb-3" style={{ width: `${Math.random() * 40 + 40}%` }}></div>
        ))}
      </div>
    </div>
  );
};
