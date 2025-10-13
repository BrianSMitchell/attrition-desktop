import React, { useEffect, useState } from 'react';
import type { Empire, ResearchProject } from '@game/shared';
import { useEnhancedAppStore } from '../../stores/enhancedAppStore';

import { TIMEOUTS, STATUS_CODES } from '@shared/constants/magic-numbers';
interface ResearchUnderwayCardProps {
  empire: Empire;
}

const getResearchIcon = (type: string) => {
  const icons: Record<string, string> = {
    military: '⚔️',
    economic: '💰',
    exploration: '🚀',
  };
  return icons[type] || '🔬';
};

const getResearchColor = (type: string) => {
  const colors: Record<string, string> = {
    military: 'text-red-400',
    economic: 'text-yellow-400',
    exploration: 'text-blue-400',
  };
  return colors[type] || 'text-purple-400';
};

const ResearchUnderwayCard: React.FC<ResearchUnderwayCardProps> = ({ }) => {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced store access for API calls
  const services = useEnhancedAppStore((state) => state.services);
  const gameApi = services?.gameApi;

  const fetchResearch = async () => {
    if (!gameApi.getResearchProjects) {
      setError('Research projects API not available');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await gameApi.getResearchProjects();
      if (res.success) {
        setProjects(res.data?.researchProjects || []);
      } else {
        setError(res.error || 'Failed to load research');
      }
    } catch (err: any) {
      setError('Network error while loading research');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearch();
    // Fetch fresh research data every 60 seconds for real-time updates
    const fetchId = setInterval(() => {
      fetchResearch();
    }, TIMEOUTS.ONE_MINUTE);
    return () => clearInterval(fetchId);
  }, []);

  const active = projects.filter((p) => !p.isCompleted);

  const getProgressPercent = (p: ResearchProject) => {
    if (!p.researchCost || p.researchCost <= 0) return STATUS_CODES.SUCCESS;
    return Math.min(100, (p.researchProgress / p.researchCost) * 100);
  };

  const getETA = (p: ResearchProject) => {
    const remaining = Math.max(0, (p.researchCost || 0) - (p.researchProgress || 0));
    // For now, use a default research rate until we implement the new capacity system
    const perHour = 10; // Default research production
    if (perHour <= 0) return 'Paused (no research production)';
    const hoursRemaining = remaining / perHour;
    if (hoursRemaining < 1) return 'Less than 1 hour';
    if (hoursRemaining < 24) return `${Math.ceil(hoursRemaining)} hours`;
    const days = Math.ceil(hoursRemaining / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  };

  return (
    <div className="game-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">🔬 Research Underway</h3>
        <button
          onClick={fetchResearch}
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
          {error}
        </div>
      )}

      {loading && active.length === 0 ? (
        <div className="flex items-center justify-center h-20 text-gray-400">Loading...</div>
      ) : active.length === 0 ? (
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-gray-300">
          No research underway.
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((project) => {
            const progress = getProgressPercent(project);
            const eta = getETA(project);
            return (
              <div key={project._id} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    {getResearchIcon(project.type)} {project.name}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded ${getResearchColor(project.type)} bg-gray-800`}>
                    {project.type}
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-400 mb-3">{project.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Progress:</span>
                    <span className="text-white">
                      {project.researchProgress.toLocaleString()} / {project.researchCost.toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{progress.toFixed(1)}% complete</span>
                    <span>ETA: {eta}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResearchUnderwayCard;
