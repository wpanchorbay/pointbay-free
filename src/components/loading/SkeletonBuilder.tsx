import React from "react";

export const SkeletonBuilder: React.FC = () => {
  return (
    <div className="lb-animate-pulse lb-flex lb-flex-col lg:lb-flex-row lb-gap-6 lb-items-start lb-w-full">
      {/* Left side */}
      <div className="lb-w-full lb-flex lb-flex-col lb-gap-6">
        {/* Title Input */}
        <div className="lb-h-[50px] lb-bg-gray-200 lb-rounded-md lb-w-full"></div>
        
        {/* Assignment rules container */}
        <div className="lb-h-[100px] lb-bg-gray-200 lb-rounded-lg lb-w-full"></div>
        
        {/* Fields header */}
        <div>
          <div className="lb-h-6 lb-bg-gray-200 lb-rounded lb-w-32 lb-mb-2"></div>
          <div className="lb-h-4 lb-bg-gray-200 lb-rounded lb-w-64"></div>
        </div>

        {/* Fields list */}
        <div className="lb-border lb-border-gray-200 lb-rounded-lg lb-p-4">
           {Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="lb-h-12 lb-bg-gray-100 lb-rounded-md lb-w-full lb-mb-2 lb-flex lb-items-center lb-px-4">
                <div className="lb-h-4 lb-w-4 lb-bg-gray-200 lb-rounded lb-mr-4"></div>
                <div className="lb-h-4 lb-w-32 lb-bg-gray-200 lb-rounded lb-mr-auto"></div>
                <div className="lb-h-4 lb-w-24 lb-bg-gray-200 lb-rounded"></div>
             </div>
           ))}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="lg:lb-w-[320px] lb-w-full lb-flex-shrink-0">
        <div className="lb-h-[500px] lb-bg-gray-200 lb-rounded-lg lb-w-full"></div>
      </div>
    </div>
  );
};
