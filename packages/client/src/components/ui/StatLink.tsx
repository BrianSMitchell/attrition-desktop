import * as React from "react";

export interface StatLinkProps {
  onClick: () => void;
  /**
   * Display text for the link button.
   * Defaults to "View breakdown ⟶" to keep header stat cards consistent.
   */
  title?: string;
  /**
   * Optional test id passed through to the underlying button as data-testid.
   */
  dataTestId?: string;
  /**
   * Optional className override/extension if needed by callers.
   */
  className?: string;
}

/**
 * StatLink
 * Small link-style button used in header stat cards to open breakdown modals.
 * Centralizes copy and styling to prevent drift across Area/Energy/Population.
 */
export const StatLink: React.FC<StatLinkProps> = ({
  onClick,
  title = "View breakdown →",
  dataTestId,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={["text-blue-400 hover:text-blue-300 text-xs", className].filter(Boolean).join(" ")}
      {...(dataTestId ? { "data-testid": dataTestId } : {})}
    >
      {title}
    </button>
  );
};

export default StatLink;
