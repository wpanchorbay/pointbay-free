import React from "react";

export const SkeletonBuilder: React.FC = () => {
  return (
    <div className="loyaltybay-animate-pulse loyaltybay-flex loyaltybay-flex-col lg:loyaltybay-flex-row loyaltybay-gap-6 loyaltybay-items-start loyaltybay-w-full">
      {/* Left side */}
      <div className="loyaltybay-w-full loyaltybay-flex loyaltybay-flex-col loyaltybay-gap-6">
        {/* Title Input */}
        <div className="loyaltybay-h-[50px] loyaltybay-bg-gray-200 loyaltybay-rounded-md loyaltybay-w-full"></div>
        
        {/* Assignment rules container */}
        <div className="loyaltybay-h-[100px] loyaltybay-bg-gray-200 loyaltybay-rounded-lg loyaltybay-w-full"></div>
        
        {/* Fields header */}
        <div>
          <div className="loyaltybay-h-6 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-32 loyaltybay-mb-2"></div>
          <div className="loyaltybay-h-4 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-64"></div>
        </div>

        {/* Fields list */}
        <div className="loyaltybay-border loyaltybay-border-gray-200 loyaltybay-rounded-lg loyaltybay-p-4">
           {Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="loyaltybay-h-12 loyaltybay-bg-gray-100 loyaltybay-rounded-md loyaltybay-w-full loyaltybay-mb-2 loyaltybay-flex loyaltybay-items-center loyaltybay-px-4">
                <div className="loyaltybay-h-4 loyaltybay-w-4 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-mr-4"></div>
                <div className="loyaltybay-h-4 loyaltybay-w-32 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-mr-auto"></div>
                <div className="loyaltybay-h-4 loyaltybay-w-24 loyaltybay-bg-gray-200 loyaltybay-rounded"></div>
             </div>
           ))}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="lg:loyaltybay-w-[320px] loyaltybay-w-full loyaltybay-flex-shrink-0">
        <div className="loyaltybay-h-[500px] loyaltybay-bg-gray-200 loyaltybay-rounded-lg loyaltybay-w-full"></div>
      </div>
    </div>
  );
};
