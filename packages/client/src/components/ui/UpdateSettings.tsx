import * as React from "react";
import { useUpdate } from "../../contexts/UpdateContext";
import { useUIActions } from '../../stores/enhancedAppStore';
import { LAYOUT_CLASSES } from '../constants/css-constants';

/**
 * UpdateSettings Component
 * 
 * Allows users to control update preferences and manually check for updates
 * Can be integrated into a settings panel or help page
 */
const UpdateSettings: React.FC = () => {
  const { state, checkForUpdates, setAutoCheck } = useUpdate();
  const { addToast } = useUIActions();
  const [isChecking, setIsChecking] = React.useState(false);

  // Check if we're running in desktop environment
  const isDesktop = typeof window !== 'undefined' && (window as any).desktop?.updater;

  if (!isDesktop) {
    return (
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-200 mb-2">App Updates</h3>
        <p className="text-sm text-gray-400">
          Update functionality is only available in the desktop version of Attrition.
        </p>
      </div>
    );
  }

  const handleManualCheck = async () => {
    console.log('[UpdateSettings] Manual check button clicked');
    setIsChecking(true);
    try {
      console.log('[UpdateSettings] Starting manual check...');
      await checkForUpdates();
      console.log('[UpdateSettings] checkForUpdates completed');

      // Query status immediately to provide feedback without relying on stale state
      try {
        const desktop = (window as any).desktop;
        console.log('[UpdateSettings] Querying update status...');
        const statusResp = await desktop.updater.getStatus();
        console.log('[UpdateSettings] Status response:', statusResp);
        
        if (statusResp?.success) {
          const st = statusResp.status || {};
          console.log('[UpdateSettings] Status details:', st);
          
          if (st.updateAvailable) {
            addToast({ type: 'info', message: 'Update found! Check the notification to download.' });
          } else if (!st.error) {
            addToast({ type: 'success', message: "You're running the latest version!" });
          }
        } else {
          console.warn('[UpdateSettings] Status check failed:', statusResp?.error);
          addToast({ type: 'warning', message: statusResp?.error || 'Failed to get update status' });
        }
      } catch (e) {
        console.warn('[UpdateSettings] Failed to read updater status after check', e);
        addToast({ type: 'warning', message: 'Could not verify update status' });
      }
    } catch (error) {
      console.error('[UpdateSettings] Manual check failed:', error);
      addToast({ 
        type: 'error', 
        message: `Failed to check for updates: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      console.log('[UpdateSettings] Manual check completed, resetting checking state');
      setIsChecking(false);
    }
  };

  const handleAutoCheckToggle = (enabled: boolean) => {
    setAutoCheck(enabled);
    addToast({ 
      type: "success", 
      message: `Automatic update checks ${enabled ? 'enabled' : 'disabled'}` 
    });
  };

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-medium text-gray-200 mb-2">App Updates</h3>
      
      {/* Current Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Status:</span>
          <span className="text-gray-200">
            {state.updateAvailable 
              ? "Update available" 
              : state.checkingForUpdate 
                ? "Checking..." 
                : "Up to date"
            }
          </span>
        </div>
        
        {state.lastChecked && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Last checked:</span>
            <span className="text-gray-200">
              {state.lastChecked.toLocaleString()}
            </span>
          </div>
        )}
        
        {state.updateInfo && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Available version:</span>
            <span className="text-green-400">{state.updateInfo.version}</span>
          </div>
        )}
      </div>

      {/* Manual Check Button */}
      <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
        <div>
          <p className="text-sm font-medium text-gray-200">Manual Check</p>
          <p className="text-xs text-gray-400">Check for updates immediately</p>
        </div>
        <button
          onClick={handleManualCheck}
          disabled={isChecking || state.checkingForUpdate}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            isChecking || state.checkingForUpdate
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isChecking || state.checkingForUpdate ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <span>Checking...</span>
            </div>
          ) : (
            'Check Now'
          )}
        </button>
      </div>

      {/* Auto-check Setting */}
      <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
        <div>
          <p className="text-sm font-medium text-gray-200">Automatic Updates</p>
          <p className="text-xs text-gray-400">
            Automatically check for updates every hour
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={state.autoCheckEnabled}
            onChange={(e) => handleAutoCheckToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Update Progress/Status */}
      {state.downloadProgress && (
        <div className="border-t border-gray-600 pt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Downloading update:</span>
            <span className="text-blue-400">{Math.round(state.downloadProgress.percent)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.downloadProgress.percent}%` }}
            ></div>
          </div>
        </div>
      )}

      {state.updateDownloaded && (
        <div className="border-t border-gray-600 pt-4">
          <div className="flex items-center space-x-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm">Update ready to install</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            The update will be installed when you restart the application.
          </p>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="border-t border-gray-600 pt-4">
          <div className="flex items-center space-x-2 text-red-400">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-sm">Update Error</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{state.error}</p>
        </div>
      )}

      {/* Information */}
      <div className="border-t border-gray-600 pt-4">
        <p className="text-xs text-gray-500">
          Updates are downloaded and verified automatically. The application will only restart 
          when you choose to install an update.
        </p>
      </div>
    </div>
  );
};

export default UpdateSettings;

