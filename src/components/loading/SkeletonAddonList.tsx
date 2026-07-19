import React from "react";

export const SkeletonAddonList: React.FC = () => {
  const skeletonRows = Array.from({ length: 5 }, (_, i) => i);

  return (
    <>
      {skeletonRows.map((index) => (
        <tr key={index} className="lb-border-b lb-border-gray-200 lb-animate-pulse">
          <td className="lb-p-2">
            <div className="lb-w-4 lb-h-4 lb-bg-gray-200 lb-rounded"></div>
          </td>
          <td className="lb-p-2">
            <div className="lb-h-4 lb-bg-gray-200 lb-rounded lb-w-3/4"></div>
            <div className="lb-h-3 lb-bg-gray-200 lb-rounded lb-w-1/2 lb-mt-2"></div>
          </td>
          <td className="lb-p-2">
            <div className="lb-h-4 lb-bg-gray-200 lb-rounded lb-w-6"></div>
          </td>
          <td className="lb-p-2">
            <div className="lb-h-4 lb-bg-gray-200 lb-rounded lb-w-1/3"></div>
          </td>
          <td className="lb-p-2">
            <div className="lb-h-5 lb-bg-gray-200 lb-rounded lb-w-12"></div>
          </td>
        </tr>
      ))}
    </>
  );
};
