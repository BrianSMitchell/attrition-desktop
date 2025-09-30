import * as React from "react";
import { useUpdate, formatBytes, formatSpeed } from "../../contexts/UpdateContext";
import { useUIActions } from '../../stores/enhancedAppStore';

/**
 * UpdateNotification Component
 * 
 * Displays update notifications, download progress, and install prompts
 * Shows as an overlay when updates are available or downloading
 */
const UpdateNotification: React.FC = () => {
  const { state, downloadUpdate, installUpdate, dismissUpdate, checkForUpdates } = useUpdate();
  const { addToast } = useUIActions();
  const [isMinimized, setIsMinimized] = React.useState(false);

  // Don't render anything if no update is available and not checking
  if (!state.updateAvailable && !state.checkingForUpdate && !state.downloadProgress && !state.updateDownloaded) {
    return null;
  }

  // Handle download button click
  const handleDownload = async () => {
    try {
      await downloadUpdate();
      addToast({ type: "info", message: "Update download started..." });
    } catch (error) {
      addToast({ 
        type: "error", 
        message: `Failed to start download: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  // Handle install button click
  const handleInstall = async () => {
    try {
      await installUpdate();
      addToast({ type: "info", message: "Installing update and restarting..." });
    } catch (error) {
      addToast({ 
        type: "error", 
        message: `Failed to install update: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    dismissUpdate();
    addToast({ type: "info", message: "Update dismissed. You can check for updates later in settings." });
  };

  // Render checking state
  if (state.checkingForUpdate && !state.updateAvailable) {
    return (
      <div className="fixed top-16 right-4 z-40 bg-gray-800/95 border border-gray-600 rounded-lg shadow-xl p-4 max-w-sm">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <span className="text-gray-200">Checking for updates...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className="fixed top-16 right-4 z-40 bg-red-900/90 border border-red-600 rounded-lg shadow-xl p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-400 mt-0.5"></div>
          <div className="flex-1">
            <h4 className="font-medium text-red-100">Update Error</h4>
            <p className="text-sm text-red-200 mt-1">{state.error}</p>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => checkForUpdates()}
                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                Retry
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render download progress
  if (state.downloadProgress) {
    const progress = state.downloadProgress;
    const progressPercent = Math.round(progress.percent);

    if (isMinimized) {
      return (
        <div className="fixed top-16 right-4 z-40 bg-blue-900/90 border border-blue-600 rounded-lg shadow-xl p-3">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-blue-600 rounded">
              <div 
                className="h-full bg-blue-400 rounded transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-blue-100 text-sm">{progressPercent}%</span>
            <button
              onClick={() => setIsMinimized(false)}
              className="text-blue-300 hover:text-blue-100 text-sm"
              title="Expand"
            >
              ↗
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed top-16 right-4 z-40 bg-blue-900/90 border border-blue-600 rounded-lg shadow-xl p-4 max-w-sm">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-blue-100">Downloading Update</h4>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-blue-300 hover:text-blue-100 text-sm"
            title="Minimize"
          >
            −
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-blue-800 rounded-full h-2.5 mb-2">
          <div 
            className="bg-blue-400 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        
        {/* Progress Details */}
        <div className="flex justify-between text-sm text-blue-200 mb-2">
          <span>{progressPercent}%</span>
          <span>{formatBytes(progress.transferred)} / {formatBytes(progress.total)}</span>
        </div>
        
        {/* Download Speed */}
        <div className="text-xs text-blue-300">
          {formatSpeed(progress.bytesPerSecond)}
        </div>
      </div>
    );
  }

  // Render update ready to install
  if (state.updateDownloaded) {
    return (
      <div className="fixed top-16 right-4 z-40 bg-green-900/90 border border-green-600 rounded-lg shadow-xl p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-400 mt-0.5"></div>
          <div className="flex-1">
            <h4 className="font-medium text-green-100">Update Ready!</h4>
            <p className="text-sm text-green-200 mt-1">
              {state.updateInfo?.version && `Version ${state.updateInfo.version} `}
              has been downloaded and is ready to install.
            </p>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors font-medium"
              >
                Restart & Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render update available
  if (state.updateAvailable) {
    return (
      <div className="fixed top-16 right-4 z-40 bg-orange-900/90 border border-orange-600 rounded-lg shadow-xl p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-400 mt-0.5"></div>
          <div className="flex-1">
            <h4 className="font-medium text-orange-100">Update Available</h4>
            {state.updateInfo && (
              <div className="text-sm text-orange-200 mt-1">
                <p><strong>Version:</strong> {state.updateInfo.version}</p>
                {state.updateInfo.releaseDate && (
                  <p><strong>Released:</strong> {new Date(state.updateInfo.releaseDate).toLocaleDateString()}</p>
                )}
              </div>
            )}
            
            {/* Release Notes Preview */}
            {state.updateInfo?.releaseNotes && (
              <details className="mt-2">
                <summary className="text-xs text-orange-300 cursor-pointer hover:text-orange-100">
                  What's New
                </summary>
                <div className="mt-1 text-xs text-orange-200 max-h-32 overflow-y-auto">
                  {state.updateInfo.releaseNotes}
                </div>
              </details>
            )}
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleDownload}
                className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors font-medium"
              >
                Download
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UpdateNotification;
