import React, { useEffect, useState } from 'react';
import { 
  GameMessage,
  MessageSeverity,
  MessageCategory,
  isGameMessage,
  validateGameMessage
} from '@game/shared';

interface EnhancedMessageContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  maxMessages?: number;
  autoHideDelay?: number;
}

interface DisplayMessage extends GameMessage {
  displayId: string;
  addedAt: number;
}

export const EnhancedMessageContainer: React.FC<EnhancedMessageContainerProps> = ({
  position = 'top-right',
  maxMessages = 5,
  autoHideDelay = 5000
}) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);

  // Function to add a new message
  const addMessage = (message: GameMessage) => {
    const displayMessage: DisplayMessage = {
      ...message,
      displayId: `enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: Date.now()
    };

    setMessages(prev => {
      const newMessages = [displayMessage, ...prev];
      // Limit the number of messages displayed
      return newMessages.slice(0, maxMessages);
    });

    // Auto-hide non-persistent messages
    if (!message.persistent && autoHideDelay > 0) {
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.displayId !== displayMessage.displayId));
      }, message.timeout || autoHideDelay);
    }
  };

  // Function to remove a message
  const removeMessage = (displayId: string) => {
    setMessages(prev => prev.filter(m => m.displayId !== displayId));
  };

  // Listen for socket messages (optional, for real-time messages)
  useEffect(() => {
    // This would be connected to socket in a real implementation
    // For now, we'll expose the addMessage function globally for testing
    (window as any).addEnhancedMessage = addMessage;
    
    return () => {
      delete (window as any).addEnhancedMessage;
    };
  }, []);

  // Position classes
  const positionClasses = {
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2'
  };

  // Severity styling
  const getSeverityStyles = (severity: MessageSeverity) => {
    switch (severity) {
      case 'success':
        return 'bg-green-600 border-green-500 text-white';
      case 'error':
        return 'bg-red-600 border-red-500 text-white';
      case 'warning':
        return 'bg-yellow-600 border-yellow-500 text-white';
      case 'info':
        return 'bg-blue-600 border-blue-500 text-white';
      default:
        return 'bg-gray-600 border-gray-500 text-white';
    }
  };

  // Category icon
  const getCategoryIcon = (category: MessageCategory) => {
    switch (category) {
      case 'building':
        return '🏗️';
      case 'fleet':
        return '🚀';
      case 'combat':
        return '⚔️';
      case 'research':
        return '🔬';
      case 'resource':
        return '💰';
      case 'trade':
        return '🛒';
      case 'diplomacy':
        return '🤝';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className={`${positionClasses[position]} z-50 space-y-2 max-w-sm`}>
      {messages.map((message) => (
        <div
          key={message.displayId}
          className={`
            relative rounded-lg shadow-lg p-4 border
            animate-in slide-in-from-right duration-300
            ${getSeverityStyles(message.severity)}
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getCategoryIcon(message.category)}</span>
              <span className="text-sm font-medium capitalize">
                {message.category} {message.severity}
              </span>
            </div>
            {!message.persistent && (
              <button
                onClick={() => removeMessage(message.displayId)}
                className="text-white/70 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Message content */}
          <div className="text-sm mb-3">
            {message.message}
          </div>

          {/* Context information */}
          {message.context && Object.keys(message.context).length > 0 && (
            <div className="text-xs opacity-80 border-t border-white/20 pt-2 mt-2">
              {Object.entries(message.context).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {message.actions && message.actions.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {message.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    if (action.handler) {
                      action.handler();
                    }
                    if (action.dismissAfterAction) {
                      removeMessage(message.displayId);
                    }
                  }}
                  className={`
                    px-3 py-1 text-xs rounded transition-colors font-medium
                    ${action.style === 'primary' 
                      ? 'bg-white bg-opacity-20 hover:bg-opacity-30' 
                      : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Persistent message close button */}
          {message.persistent && (
            <button
              onClick={() => removeMessage(message.displayId)}
              className="absolute top-2 right-2 text-white/70 hover:text-white"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// Hook for using the enhanced notification system
export const useEnhancedNotifications = () => {
  const addMessage = (message: GameMessage) => {
    // Validate the message
    const validation = validateGameMessage(message);
    if (!validation.success) {
      console.warn('Invalid game message:', validation.error);
      return;
    }

    // Add to container
    if ((window as any).addEnhancedMessage) {
      (window as any).addEnhancedMessage(message);
    }
  };

  const showSuccess = (message: string, options?: Partial<GameMessage>) => {
    addMessage({
      id: `success-${Date.now()}`,
      message,
      severity: 'success',
      category: options?.category || 'system',
      timestamp: new Date().toISOString(),
      persistent: false,
      timeout: 5000,
      ...options
    });
  };

  const showError = (message: string, options?: Partial<GameMessage>) => {
    addMessage({
      id: `error-${Date.now()}`,
      message,
      severity: 'error',
      category: options?.category || 'system',
      timestamp: new Date().toISOString(),
      persistent: options?.persistent ?? true, // Errors are persistent by default
      ...options
    });
  };

  const showWarning = (message: string, options?: Partial<GameMessage>) => {
    addMessage({
      id: `warning-${Date.now()}`,
      message,
      severity: 'warning',
      category: options?.category || 'system',
      timestamp: new Date().toISOString(),
      persistent: false,
      timeout: 7000,
      ...options
    });
  };

  const showInfo = (message: string, options?: Partial<GameMessage>) => {
    addMessage({
      id: `info-${Date.now()}`,
      message,
      severity: 'info',
      category: options?.category || 'system',
      timestamp: new Date().toISOString(),
      persistent: false,
      timeout: 5000,
      ...options
    });
  };

  return {
    addMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default EnhancedMessageContainer;