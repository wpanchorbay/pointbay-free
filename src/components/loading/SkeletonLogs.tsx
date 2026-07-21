import React from "react";

export const SkeletonLogs: React.FC = () => {
  return (
    <div className="loyaltybay-animate-pulse loyaltybay-bg-gray-900 loyaltybay-rounded-lg loyaltybay-overflow-hidden loyaltybay-shadow-sm loyaltybay-w-full">
      <div className="loyaltybay-p-4 loyaltybay-bg-gray-800 loyaltybay-border-b loyaltybay-border-gray-700 loyaltybay-flex loyaltybay-justify-between loyaltybay-items-center">
        <div className="loyaltybay-h-3 loyaltybay-bg-gray-600 loyaltybay-rounded loyaltybay-w-24"></div>
      </div>
      <div className="loyaltybay-p-4 loyaltybay-h-[400px]">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="loyaltybay-h-3 loyaltybay-bg-gray-700 loyaltybay-rounded loyaltybay-mb-3" style={{ width: `${Math.random() * 40 + 40}%` }}></div>
        ))}
      </div>
    </div>
  );
};
