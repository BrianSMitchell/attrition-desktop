import React from 'react';
import { Location, formatNumber } from '@game/shared';
import { DebrisIndicator } from './DebrisIndicator';
import styles from './AsteroidInfo.module.css';

interface AsteroidInfoProps {
  location: Location;
  onRecycle?: () => void;
  className?: string;
}

export const AsteroidInfo: React.FC<AsteroidInfoProps> = ({
  location,
  onRecycle,
  className = ''
}) => {
  if (location.type !== 'asteroid') return null;

  const { resources } = location.properties!;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Asteroid {location.coord}
        </h3>
        <DebrisIndicator location={location} size="small" />
      </div>

      <div className={styles.resources}>
        <div className={styles.resource}>
          <span className={styles.label}>Metal:</span>
          <span className={styles.value}>{formatNumber(resources.metal)}</span>
        </div>
        <div className={styles.resource}>
          <span className={styles.label}>Energy:</span>
          <span className={styles.value}>{formatNumber(resources.energy)}</span>
        </div>
      </div>

      {location.debris && (
        <div className={styles.debrisSection}>
          <h4 className={styles.sectionTitle}>Debris Field</h4>
          <div className={styles.debrisInfo}>
            <div className={styles.stat}>
              <span className={styles.label}>Current Amount:</span>
              <span className={styles.value}>
                {formatNumber(location.debris.amount)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.label}>Generation Rate:</span>
              <span className={styles.value}>
                {location.debris.generationRate}/sec
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.label}>Active Recyclers:</span>
              <span className={styles.value}>
                {location.debris.recyclers.length}
              </span>
            </div>
          </div>

          {onRecycle && (
            <button
              className={styles.recycleButton}
              onClick={onRecycle}
            >
              Deploy Recycler
            </button>
          )}
        </div>
      )}
    </div>
  );
};