import React, { useEffect, useState } from "react";

interface TopProgressBarProps {
  isSaving: boolean;
}

export const TopProgressBar: React.FC<TopProgressBarProps> = ({ isSaving }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSaving) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          const jump = Math.random() * 10;
          return prev + jump;
        });
      }, 300);
    } else {
      setProgress(100);
      const timeout = setTimeout(() => {
        setProgress(0);
      }, 500); // Wait for transition to finish before resetting

      return () => clearTimeout(timeout);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSaving]);

  if (!isSaving && progress === 0) return null;

  return (
    <div className="pointbay-fixed pointbay-top-0 pointbay-left-0 pointbay-w-full pointbay-h-[3px] pointbay-z-[99999] pointbay-pointer-events-none">
      <div
        className="pointbay-h-full pointbay-bg-[#2271b1] pointbay-transition-all pointbay-duration-300 pointbay-ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  );
};
