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
        className={`pointbay-cursor-help pointbay-inline-flex pointbay-items-center pointbay-justify-center pointbay-w-[16px] pointbay-h-[16px] pointbay-rounded-full pointbay-bg-[#72777c] hover:pointbay-bg-[#50575e] pointbay-text-white pointbay-transition-colors pointbay-ml-1 ${className}`}
      >
        <CircleQuestionMarkIcon />
      </span>
      {visible &&
        createPortal(
          <div
            className="pointbay-fixed pointbay-z-[999999] pointbay-bg-[#333] pointbay-text-white pointbay-px-2 pointbay-py-1 pointbay-rounded pointbay-text-xs pointbay-leading-snug pointbay-max-w-[200px] pointbay-text-center pointbay-pointer-events-none pointbay-shadow-sm"
            style={{
              top: coords.top,
              left: coords.left,
              transform: "translate(-50%, -100%)",
            }}
          >
            {tip}
            <div
              className="pointbay-absolute pointbay-border-[5px] pointbay-border-solid pointbay-border-t-[#333] pointbay-border-x-transparent pointbay-border-b-transparent"
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
