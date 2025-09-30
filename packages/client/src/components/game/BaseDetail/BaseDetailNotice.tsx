/**
 * Base detail notice component
 * Shows success, error, and info messages
 */

import React from 'react';

export interface Notice {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface BaseDetailNoticeProps {
  /** Notice to display */
  notice: Notice | null;
}

export const BaseDetailNotice: React.FC<BaseDetailNoticeProps> = ({ notice }) => {
  if (!notice) return null;

  return (
    <div className="game-card">
      <div 
        data-testid="notice-banner" 
        className={`p-3 rounded-md ${
          notice.type === 'error' 
            ? 'bg-red-900/50 border border-red-700 text-red-200'
            : notice.type === 'success'
            ? 'bg-green-900/50 border border-green-700 text-green-200' 
            : 'bg-blue-900/50 border border-blue-700 text-blue-200'
        }`}
      >
        {notice.message}
      </div>
    </div>
  );
};