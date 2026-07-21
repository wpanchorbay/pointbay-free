import React from "react";

export const SkeletonAddonList: React.FC = () => {
  const skeletonRows = Array.from({ length: 5 }, (_, i) => i);

  return (
    <>
      {skeletonRows.map((index) => (
        <tr key={index} className="loyaltybay-border-b loyaltybay-border-gray-200 loyaltybay-animate-pulse">
          <td className="loyaltybay-p-2">
            <div className="loyaltybay-w-4 loyaltybay-h-4 loyaltybay-bg-gray-200 loyaltybay-rounded"></div>
          </td>
          <td className="loyaltybay-p-2">
            <div className="loyaltybay-h-4 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-3/4"></div>
            <div className="loyaltybay-h-3 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-1/2 loyaltybay-mt-2"></div>
          </td>
          <td className="loyaltybay-p-2">
            <div className="loyaltybay-h-4 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-6"></div>
          </td>
          <td className="loyaltybay-p-2">
            <div className="loyaltybay-h-4 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-1/3"></div>
          </td>
          <td className="loyaltybay-p-2">
            <div className="loyaltybay-h-5 loyaltybay-bg-gray-200 loyaltybay-rounded loyaltybay-w-12"></div>
          </td>
        </tr>
      ))}
    </>
  );
};
