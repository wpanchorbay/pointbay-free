import { CircleQuestionMark, CircleQuestionMarkIcon } from "lucide-react";
import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface ClassicTooltipProps {
  tip: string;
  className?: string;
}

/**
 * Renders the WooCommerce-native help tip icon.
 * Implements a pure React Portal tooltip instead of relying on
 * WooCommerce's bundled jQuery (tipTip) which fails on dynamically rendered React nodes.
 */
export const ClassicTooltip: React.FC<ClassicTooltipProps> = ({
  tip,
  className = "",
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);

  const updateCoords = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  };
  return (
    <>
      <span
        ref={iconRef}

        onPointerEnter={(e) => {
          updateCoords();
          setVisible(true);
        }}
        onPointerLeave={(e) => {
          setVisible(false);
        }}
        onFocus={(e) => {
          updateCoords();
          setVisible(true);
        }}
        onBlur={(e) => {
          setVisible(false);
        }}
        tabIndex={0}
        className={`loyaltybay-cursor-help loyaltybay-inline-flex loyaltybay-items-center loyaltybay-justify-center loyaltybay-w-[16px] loyaltybay-h-[16px] loyaltybay-rounded-full loyaltybay-bg-[#72777c] hover:loyaltybay-bg-[#50575e] loyaltybay-text-white loyaltybay-transition-colors loyaltybay-ml-1 ${className}`}
      >
        <CircleQuestionMarkIcon />
      </span>
      {visible &&
        createPortal(
          <div
            className="loyaltybay-fixed loyaltybay-z-[999999] loyaltybay-bg-[#333] loyaltybay-text-white loyaltybay-px-2 loyaltybay-py-1 loyaltybay-rounded loyaltybay-text-xs loyaltybay-leading-snug loyaltybay-max-w-[200px] loyaltybay-text-center loyaltybay-pointer-events-none loyaltybay-shadow-sm"
            style={{
              top: coords.top,
              left: coords.left,
              transform: "translate(-50%, -100%)",
            }}
          >
            {tip}
            <div
              className="loyaltybay-absolute loyaltybay-border-[5px] loyaltybay-border-solid loyaltybay-border-t-[#333] loyaltybay-border-x-transparent loyaltybay-border-b-transparent"
              style={{
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
};
