/**
 * Resource display component
 * Shows empire resources with icons and formatting
 */

import React from 'react';

export interface ResourceDisplayProps {
  /** Resource name */
  name: string;
  /** Resource value */
  value: number;
  /** Resource icon (emoji or component) */
  icon: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const ResourceDisplay: React.FC<ResourceDisplayProps> = ({
  value,
  icon,
  className = ""
}) => {
  return (
    <div className={`flex items-center space-x-1 text-sm ${className}`}>
      <span>{icon}</span>
      <span>{value.toLocaleString()}</span>
    </div>
  );
};