import React, { useState, useEffect } from 'react';
import { FleetMovement, FleetRecallDTO } from '../../../services/fleetsService';
import NetworkAwareButton from '../../ui/NetworkAwareButton';
import { useUIActions } from '../../../stores/enhancedAppStore';

interface FleetMovementStatusProps {
  movement: FleetMovement;
  fleetName: string;
  onRecall?: (reason?: string) => Promise<{ success: boolean; data?: FleetRecallDTO; error?: string }>;
  onRefresh?: () => void;
  showRecallOption?: boolean;
}

const FleetMovementStatus: React.FC<FleetMovementStatusProps> = ({
  movement,
  fleetName,
  onRecall,
  onRefresh,
  showRecallOption = true
}) => {
  const [timeUntilArrival, setTimeUntilArrival] = useState<number | null>(null);
  const [isRecalling, setIsRecalling] = useState(false);
  const [showRecallForm, setShowRecallForm] = useState(false);
  const [recallReason, setRecallReason] = useState('');
  const { addToast } = useUIActions();

  // Calculate time remaining until arrival
  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (movement.status !== 'travelling' && movement.status !== 'pending') {
        setTimeUntilArrival(null);
        return;
      }

      const now = new Date().getTime();
      const arrivalTime = new Date(movement.estimatedArrivalTime).getTime();
      const remainingMs = arrivalTime - now;

      if (remainingMs <= 0) {
        setTimeUntilArrival(0);
      } else {
        setTimeUntilArrival(remainingMs / (1000 * 60 * 60)); // Convert to hours
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [movement.estimatedArrivalTime, movement.status]);

  const getStatusColor = (status: FleetMovement['status']): string => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'travelling':
        return 'text-blue-400';
      case 'arrived':
        return 'text-green-400';
      case 'recalled':
        return 'text-orange-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: FleetMovement['status']): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'travelling':
        return '🚀';
      case 'arrived':
        return '🎯';
      case 'recalled':
        return '↩️';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const formatTimeRemaining = (hours: number): string => {
    if (hours <= 0) {
      return 'Arriving shortly';
    }

    if (hours < 1) {
      return `${Math.ceil(hours * 60)} minutes`;
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10} hours`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days} day${days > 1 ? 's' : ''} ${remainingHours}h`;
    }
  };

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const handleRecall = async () => {
    if (!onRecall) return;

    setIsRecalling(true);
    try {
      const result = await onRecall(recallReason.trim() || undefined);
      
      if (result.success) {
        addToast({
          type: 'success',
          message: `Fleet "${fleetName}" recall order initiated`
        });
        setShowRecallForm(false);
        setRecallReason('');
        if (onRefresh) onRefresh();
      } else {
        addToast({
          type: 'error',
          message: result.error || 'Failed to recall fleet'
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Network error while recalling fleet'
      });
    } finally {
      setIsRecalling(false);
    }
  };

  const getProgressPercentage = (): number => {
    if (movement.status !== 'travelling') return 0;
    
    const departureTime = new Date(movement.departureTime).getTime();
    const arrivalTime = new Date(movement.estimatedArrivalTime).getTime();
    const now = new Date().getTime();
    
    const totalTime = arrivalTime - departureTime;
    const elapsedTime = now - departureTime;
    
    const progress = (elapsedTime / totalTime) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const canRecall = movement.status === 'travelling' || movement.status === 'pending';

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-empire-gold">
            Fleet Movement Status
          </h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Refresh
            </button>
          )}
        </div>

        {/* Movement Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" title={movement.status}>
              {getStatusIcon(movement.status)}
            </span>
            <div>
              <div className="text-white font-medium">
                Status: <span className={getStatusColor(movement.status)}>
                  {movement.status.charAt(0).toUpperCase() + movement.status.slice(1)}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                Fleet ID: {movement._id}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Origin:</div>
              <div className="text-white font-mono">{movement.originCoord}</div>
            </div>
            <div>
              <div className="text-gray-400">Destination:</div>
              <div className="text-white font-mono">{movement.destinationCoord}</div>
            </div>
            <div>
              <div className="text-gray-400">Departure:</div>
              <div className="text-white">{formatDateTime(movement.departureTime)}</div>
            </div>
            <div>
              <div className="text-gray-400">Expected Arrival:</div>
              <div className="text-white">{formatDateTime(movement.estimatedArrivalTime)}</div>
            </div>
          </div>

          {/* Travel Progress */}
          {movement.status === 'travelling' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">{Math.round(getProgressPercentage())}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              {timeUntilArrival !== null && (
                <div className="text-center text-blue-200 font-medium">
                  {formatTimeRemaining(timeUntilArrival)} remaining
                </div>
              )}
            </div>
          )}

          {/* Movement Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Distance:</div>
              <div className="text-white">{movement.distance.toFixed(2)} units</div>
            </div>
            <div>
              <div className="text-gray-400">Fleet Speed:</div>
              <div className="text-white">{movement.fleetSpeed} u/h</div>
            </div>
            <div>
              <div className="text-gray-400">Travel Time:</div>
              <div className="text-white">{formatTimeRemaining(movement.travelTimeHours)}</div>
            </div>
          </div>

          {/* Actual Arrival Time */}
          {movement.actualArrivalTime && (
            <div className="p-3 bg-green-900/30 border border-green-700 rounded">
              <div className="text-sm text-green-200">
                <div className="font-medium">Actual Arrival:</div>
                <div className="text-green-100 mt-1">{formatDateTime(movement.actualArrivalTime)}</div>
              </div>
            </div>
          )}

          {/* Recall Information */}
          {movement.status === 'recalled' && movement.recallTime && (
            <div className="p-3 bg-orange-900/30 border border-orange-700 rounded">
              <div className="text-sm text-orange-200">
                <div className="font-medium">Recalled:</div>
                <div className="text-orange-100 mt-1">{formatDateTime(movement.recallTime)}</div>
                {movement.recallReason && (
                  <div className="text-orange-300 mt-1">Reason: {movement.recallReason}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recall Option */}
        {showRecallOption && canRecall && onRecall && !showRecallForm && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={() => setShowRecallForm(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Recall Fleet
            </button>
          </div>
        )}

        {/* Recall Form */}
        {showRecallForm && (
          <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recall Reason (Optional)
              </label>
              <input
                type="text"
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
                placeholder="e.g., Emergency return needed"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-orange-500 text-white"
                disabled={isRecalling}
              />
            </div>
            
            <div className="flex gap-3">
              <NetworkAwareButton
                onClick={handleRecall}
                disabled={isRecalling}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {isRecalling ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Recalling...
                  </span>
                ) : (
                  'Confirm Recall'
                )}
              </NetworkAwareButton>
              
              <button
                onClick={() => {
                  setShowRecallForm(false);
                  setRecallReason('');
                }}
                disabled={isRecalling}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetMovementStatus;
