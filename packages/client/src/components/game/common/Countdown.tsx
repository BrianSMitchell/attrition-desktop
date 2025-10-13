import React from 'react';

import { TIMEOUTS } from '@shared/constants/magic-numbers';
function formatHMS(msRemaining: number): string {
  const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return `${h}:${mm}:${ss}`;
}

export const Countdown: React.FC<{ arrival?: string | Date | null; className?: string }>
  = ({ arrival, className }) => {
  const [, setTick] = React.useState(0);
  const target = arrival ? new Date(arrival).getTime() : null;

  React.useEffect(() => {
    if (!target) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1000000), TIMEOUTS.ONE_SECOND);
    return () => window.clearInterval(id);
  }, [target]);

  if (!target) return <></>;
  const remaining = target - Date.now();
  if (remaining <= 0) return <span className={className}>0:00:00</span>;
  return <span className={className}>{formatHMS(remaining)}</span>;
};