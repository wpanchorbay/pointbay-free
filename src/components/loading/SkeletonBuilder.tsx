import React from "react";

export const SkeletonBuilder: React.FC = () => {
  return (
    <div className="pointbay-animate-pulse pointbay-flex pointbay-flex-col lg:pointbay-flex-row pointbay-gap-6 pointbay-items-start pointbay-w-full">
      {/* Left side */}
      <div className="pointbay-w-full pointbay-flex pointbay-flex-col pointbay-gap-6">
        {/* Title Input */}
        <div className="pointbay-h-[50px] pointbay-bg-gray-200 pointbay-rounded-md pointbay-w-full"></div>
        
        {/* Assignment rules container */}
        <div className="pointbay-h-[100px] pointbay-bg-gray-200 pointbay-rounded-lg pointbay-w-full"></div>
        
        {/* Fields header */}
        <div>
          <div className="pointbay-h-6 pointbay-bg-gray-200 pointbay-rounded pointbay-w-32 pointbay-mb-2"></div>
          <div className="pointbay-h-4 pointbay-bg-gray-200 pointbay-rounded pointbay-w-64"></div>
        </div>

        {/* Fields list */}
        <div className="pointbay-border pointbay-border-gray-200 pointbay-rounded-lg pointbay-p-4">
           {Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="pointbay-h-12 pointbay-bg-gray-100 pointbay-rounded-md pointbay-w-full pointbay-mb-2 pointbay-flex pointbay-items-center pointbay-px-4">
                <div className="pointbay-h-4 pointbay-w-4 pointbay-bg-gray-200 pointbay-rounded pointbay-mr-4"></div>
                <div className="pointbay-h-4 pointbay-w-32 pointbay-bg-gray-200 pointbay-rounded pointbay-mr-auto"></div>
                <div className="pointbay-h-4 pointbay-w-24 pointbay-bg-gray-200 pointbay-rounded"></div>
             </div>
           ))}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="lg:pointbay-w-[320px] pointbay-w-full pointbay-flex-shrink-0">
        <div className="pointbay-h-[500px] pointbay-bg-gray-200 pointbay-rounded-lg pointbay-w-full"></div>
      </div>
    </div>
  );
};
