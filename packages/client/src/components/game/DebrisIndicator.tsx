import React, { useEffect, useRef, useState } from 'react';
import { Location, formatNumber } from '@game/shared';
import { useGameStore } from '../../stores/gameStore';
import styles from './DebrisIndicator.module.css';

interface DebrisIndicatorProps {
  location: Location;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

export const DebrisIndicator: React.FC<DebrisIndicatorProps> = ({
  location,
  size = 'medium',
  showDetails = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState(false);
  const animationFrameRef = useRef<number>();

  // Get empire info to highlight our recyclers
  const currentEmpire = useGameStore(state => state.currentEmpire);

  // Animation state
  const debrisParticles = useRef<Array<{
    x: number;
    y: number;
    speed: number;
    angle: number;
    size: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas size
    const sizes = {
      small: 32,
      medium: 48,
      large: 64,
    };
    const canvasSize = sizes[size];
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // Initialize particles
    const particleCount = Math.min(
      20,
      Math.ceil((location.debris?.amount || 0) / 100)
    );

    debrisParticles.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvasSize,
      y: Math.random() * canvasSize,
      speed: 0.2 + Math.random() * 0.3,
      angle: Math.random() * Math.PI * 2,
      size: 1 + Math.random() * 2,
    }));

    // Animation function
    const animate = () => {
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Draw debris particles
      ctx.fillStyle = '#777';
      debrisParticles.current.forEach(particle => {
        // Update position
        particle.x += Math.cos(particle.angle) * particle.speed;
        particle.y += Math.sin(particle.angle) * particle.speed;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvasSize;
        if (particle.x > canvasSize) particle.x = 0;
        if (particle.y < 0) particle.y = canvasSize;
        if (particle.y > canvasSize) particle.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Show collection effect if recyclers are present
      if (location.debris?.recyclers.length) {
        ctx.strokeStyle = '#4a9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          canvasSize / 2,
          canvasSize / 2,
          canvasSize / 3,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [location.debris?.amount, size]);

  if (!location.debris) return null;

  const { amount, generationRate, recyclers } = location.debris;
  const ourRecyclerCount = recyclers.filter(
    (r: { empireId: string }) => r.empireId === currentEmpire?._id
  ).length;

  return (
    <div
      className={styles.container}
      data-size={size}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        title="Debris field"
      />

      {showDetails && hover && (
        <div className={styles.tooltip}>
          <div className={styles.title}>Debris Field</div>
          <div className={styles.stat}>
            Amount: {formatNumber(amount)}
            <span className={styles.rate}>
              (+{generationRate}/sec)
            </span>
          </div>
          {recyclers.length > 0 && (
            <div className={styles.recyclers}>
              <div>Active Recyclers: {recyclers.length}</div>
              {ourRecyclerCount > 0 && (
                <div className={styles.ours}>
                  Your Recyclers: {ourRecyclerCount}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};