/**
 * Navigation item component
 * Reusable navigation link with consistent styling
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { prefetchRoute } from '../../../utils/prefetch';

export interface NavigationItemProps {
  /** Link destination */
  to: string;
  /** Item label */
  label: string;
  /** Whether this item is active */
  isActive?: boolean;
  /** Optional badge count */
  badgeCount?: number;
  /** Optional click handler for non-Link items */
  onClick?: () => void;
  /** Render as button instead of Link */
  asButton?: boolean;
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  to,
  label,
  isActive = false,
  badgeCount,
  onClick,
  asButton = false
}) => {
  const baseClasses = "block px-3 py-2 rounded text-sm font-medium transition-colors";
  const activeClasses = "bg-gray-700 text-white";
  const inactiveClasses = "text-gray-400 hover:text-white hover:bg-gray-700";
  
  const classes = `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;

  const content = (
    <>
      {label}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </>
  );

  if (asButton) {
    return (
      <button onClick={onClick} className={`w-full text-left ${classes}`}>
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      className={classes}
      onClick={onClick}
      onMouseEnter={() => {
        try {
          if (to && to.startsWith('/')) prefetchRoute(to);
        } catch {}
      }}
    >
      {content}
    </Link>
  );
};