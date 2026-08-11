import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lock } from "lucide-react";
import { __ } from "@wordpress/i18n";
import { POINTBAY_PRO_BUY_URL } from "../../utils/constants";

interface BuyProLockProps {
  children: React.ReactNode;
  /** Short, feature-specific blurb shown in the hover tooltip. */
  feature: string;
  className?: string;
}

/**
 * Wraps a real (but non-functional) preview of a PointBay Pro control.
 * The wrapped content is grayed out and inert — clicks don't reach it —
 * and hovering shows a "Buy Pro" tooltip explaining what unlocking it gets you.
 */
export const BuyProLock: React.FC<BuyProLockProps> = ({
  children,
  feature,
  className = "",
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const hideTimeout = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const show = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.top, left: rect.left + rect.width / 2 });
    }
  };

  const hide = () => {
    hideTimeout.current = window.setTimeout(() => setCoords(null), 150);
  };

  return (
    <div
      ref={wrapRef}
      className={`pointbay-relative pointbay-inline-block ${className}`}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <div
        className="pointbay-opacity-60 pointbay-pointer-events-none pointbay-select-none"
        aria-disabled="true"
      >
        {children}
      </div>
      <Lock
        className="pointbay-absolute -pointbay-top-2 -pointbay-right-2 pointbay-w-3.5 pointbay-h-3.5 pointbay-text-[#8a5cf6] pointbay-bg-white pointbay-rounded-full pointbay-p-0.5 pointbay-shadow"
        aria-hidden="true"
      />
      {coords &&
        createPortal(
          <div
            className="pointbay-fixed pointbay-z-[999999] pointbay-flex pointbay-flex-col pointbay-items-center pointbay-gap-1.5 pointbay-bg-gray-900 pointbay-text-white pointbay-text-xs pointbay-leading-snug pointbay-p-2 pointbay-rounded pointbay-shadow-lg pointbay-min-w-[180px] pointbay-max-w-[220px] pointbay-text-center"
            style={{
              top: coords.top - 10,
              left: coords.left,
              transform: "translate(-50%, -100%)",
            }}
            onPointerEnter={show}
            onPointerLeave={hide}
          >
            <span className="pointbay-font-medium">{feature}</span>
            <a
              href={POINTBAY_PRO_BUY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="pointbay-w-full pointbay-bg-[#8a5cf6] hover:!pointbay-bg-[#7c3aed] pointbay-text-white hover:!pointbay-text-white pointbay-no-underline pointbay-font-bold pointbay-py-1.5 pointbay-px-3 pointbay-rounded pointbay-transition-colors"
            >
              {__("Buy Pro", "pointbay-loyalty-points-referral-rewards-woo")}
            </a>
            <div
              className="pointbay-absolute pointbay-border-[5px] pointbay-border-solid pointbay-border-t-gray-900 pointbay-border-x-transparent pointbay-border-b-transparent"
              style={{ top: "100%", left: "50%", transform: "translateX(-50%)" }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};
