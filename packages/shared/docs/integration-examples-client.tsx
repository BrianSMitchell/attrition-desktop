// Client-side integration examples for React components and notification system
// These examples show how to integrate the new @game/shared message system
// into existing React components and services

import React, { useEffect, useState, useCallback } from 'react';
import {
  // Message system
  GameMessage,
  processMessageTemplate,
  createMessage,
  createSystemMessage,
  EMPIRE_MESSAGES,
  BUILDING_MESSAGES,
  AUTH_MESSAGES,
  FLEET_MESSAGES,
  
  // API response handling
  isSuccessResponse,
  isErrorResponse,
  EnhancedApiResponse
} from '@game/shared';

// =============================================================================
// 1. ENHANCED NOTIFICATION HOOK
// =============================================================================

// Enhanced notification hook that integrates with the new message system
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<GameMessage[]>([]);
  
  // Show a message using the new system
  const showMessage = useCallback((message: GameMessage) => {
    setNotifications(prev => [...prev, message]);
    
    // Auto-dismiss if not persistent
    if (!message.persistent && message.timeout) {
      setTimeout(() => {
        dismissMessage(message.id);
      }, message.timeout);
    }
  }, []);

  // Show message from template
  const showTemplateMessage = useCallback((
    template: any, 
    variables: Record<string, any>, 
    context?: any
  ) => {
    const message = processMessageTemplate(template, variables, context);
    showMessage(message);
    return message;
  }, [showMessage]);

  // Show system message
  const showSystemMessage = useCallback((
    severity: 'success' | 'error' | 'warning' | 'info',
    text: string,
    options?: { persistent?: boolean; timeout?: number }
  ) => {
    const message = createSystemMessage(severity, text, options);
    showMessage(message);
    return message;
  }, [showMessage]);

  // Dismiss message
  const dismissMessage = useCallback((messageId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== messageId));
  }, []);

  // Clear all messages
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Filter messages by severity
  const getMessagesBySeverity = useCallback((severity: string) => {
    return notifications.filter(n => n.severity === severity);
  }, [notifications]);

  return {
    notifications,
    showMessage,
    showTemplateMessage,
    showSystemMessage,
    dismissMessage,
    clearAll,
    getMessagesBySeverity
  };
};

// =============================================================================
// 2. MESSAGE TOAST COMPONENT (ENHANCED)
// =============================================================================

interface MessageToastProps {
  message: GameMessage;
  onDismiss: (id: string) => void;
}

export const EnhancedMessageToast: React.FC<MessageToastProps> = ({ 
  message, 
  onDismiss 
}) => {
  // Auto-dismiss logic
  useEffect(() => {
    if (!message.persistent && message.timeout) {
      const timer = setTimeout(() => {
        onDismiss(message.id);
      }, message.timeout);
      
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  // Severity-based styling
  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'success': return 'bg-green-500 border-green-600';
      case 'error': return 'bg-red-500 border-red-600';
      case 'warning': return 'bg-yellow-500 border-yellow-600';
      case 'info': return 'bg-blue-500 border-blue-600';
      case 'debug': return 'bg-gray-500 border-gray-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const handleActionClick = (action: any) => {
    // Handle message actions (navigate, call API, etc.)
    console.log('Action clicked:', action);
    // Implementation depends on your routing/state management
  };

  return (
    <div 
      className={`
        relative p-4 rounded-lg border-l-4 text-white shadow-lg
        transition-all duration-300 ease-in-out
        ${getSeverityClass(message.severity)}
      `}
    >
      {/* Close button for persistent messages */}
      {message.persistent && (
        <button
          onClick={() => onDismiss(message.id)}
          className="absolute top-2 right-2 text-white hover:text-gray-200"
        >
          ×
        </button>
      )}

      {/* Message content */}
      <div className="pr-6">
        <p className="font-semibold">{message.message}</p>
        
        {message.description && (
          <p className="text-sm opacity-90 mt-1">{message.description}</p>
        )}

        {/* Context information */}
        {message.context?.locationCoord && (
          <p className="text-xs opacity-75 mt-1">
            Location: {message.context.locationCoord}
          </p>
        )}

        {/* Message actions */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 space-x-2">
            {message.actions.map(action => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`
                  px-3 py-1 rounded text-xs font-medium
                  ${action.type === 'primary' ? 'bg-white text-gray-800' : 
                    action.type === 'danger' ? 'bg-red-600' : 'bg-gray-600'}
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar for timed messages */}
      {!message.persistent && message.timeout && (
        <div className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-30 rounded-b-lg">
          <div 
            className="h-full bg-white rounded-b-lg transition-all duration-linear"
            style={{
              animation: `shrink ${message.timeout}ms linear`,
            }}
          />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 3. BUILDING CONSTRUCTION COMPONENT WITH MESSAGING
// =============================================================================

interface BuildingConstructionProps {
  empireId: string;
  locationCoord: string;
  onConstructionStarted?: (building: any) => void;
}

export const BuildingConstruction: React.FC<BuildingConstructionProps> = ({
  empireId,
  locationCoord,
  onConstructionStarted
}) => {
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showTemplateMessage, showSystemMessage } = useNotifications();

  const handleStartConstruction = async () => {
    if (!selectedBuilding) {
      showSystemMessage(
        'warning',
        'Please select a building type first',
        { timeout: 3000 }
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/buildings/construct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          locationCoord,
          buildingType: selectedBuilding
        })
      });

      const apiResponse: EnhancedApiResponse = await response.json();

      if (isSuccessResponse(apiResponse)) {
        const { building, message } = apiResponse.data;
        
        // Show the message that came from the server
        if (message) {
          showMessage(message);
        } else {
          // Fallback to creating our own message
          showTemplateMessage(
            BUILDING_MESSAGES.CONSTRUCTION_STARTED,
            {
              buildingName: building.displayName,
              locationCoord,
              constructionTime: building.constructionTimeMinutes
            },
            { empireId, locationCoord }
          );
        }

        onConstructionStarted?.(building);
        setSelectedBuilding('');

      } else if (isErrorResponse(apiResponse)) {
        // Handle different error types
        if (apiResponse.errorCode === 'INSUFFICIENT_RESOURCES') {
          showSystemMessage(
            'error',
            'Not enough credits to build this structure',
            { persistent: true }
          );
        } else if (apiResponse.errorCode === 'TECH_REQUIREMENTS_NOT_MET') {
          showSystemMessage(
            'error',
            'Technology requirements not met for this building',
            { persistent: true }
          );
        } else {
          showSystemMessage(
            'error',
            apiResponse.error || 'Failed to start construction',
            { persistent: true }
          );
        }
      }

    } catch (error) {
      showSystemMessage(
        'error',
        'Network error. Please check your connection.',
        { persistent: true }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Construct Building</h3>
      
      <div className="space-y-4">
        <select
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value)}
          className="w-full p-2 bg-gray-700 rounded"
          disabled={isLoading}
        >
          <option value="">Select building type...</option>
          <option value="metal_mine">Metal Mine</option>
          <option value="energy_plant">Energy Plant</option>
          <option value="factory">Factory</option>
          <option value="research_lab">Research Lab</option>
        </select>

        <button
          onClick={handleStartConstruction}
          disabled={isLoading || !selectedBuilding}
          className={`
            w-full py-2 px-4 rounded font-semibold
            ${isLoading || !selectedBuilding
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isLoading ? 'Starting Construction...' : 'Start Construction'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// 4. FLEET MANAGEMENT WITH REAL-TIME MESSAGES
// =============================================================================

export const FleetManagement: React.FC<{ empireId: string }> = ({ empireId }) => {
  const [fleets, setFleets] = useState<any[]>([]);
  const { showTemplateMessage } = useNotifications();

  // Socket.IO integration for real-time messages
  useEffect(() => {
    const socket = getSocket();
    
    // Listen for fleet-related messages
    socket.on('game:message', (message: GameMessage) => {
      if (message.category === 'fleet') {
        showMessage(message);
      }
    });

    // Listen for fleet updates
    socket.on('fleet:departed', (data: any) => {
      showTemplateMessage(
        FLEET_MESSAGES.FLEET_DEPARTED,
        {
          fleetName: data.fleetName,
          destination: data.destination,
          travelTime: data.travelTime
        },
        { empireId }
      );
    });

    socket.on('fleet:arrived', (data: any) => {
      showTemplateMessage(
        FLEET_MESSAGES.FLEET_ARRIVED,
        {
          fleetName: data.fleetName,
          destination: data.destination
        },
        { empireId }
      );
    });

    return () => {
      socket.off('game:message');
      socket.off('fleet:departed');
      socket.off('fleet:arrived');
    };
  }, [empireId, showTemplateMessage]);

  const handleFleetMove = async (fleetId: string, destination: string) => {
    try {
      const response = await fetch('/api/fleets/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ fleetId, destination })
      });

      const apiResponse: EnhancedApiResponse = await response.json();

      if (!isSuccessResponse(apiResponse)) {
        showSystemMessage(
          'error',
          apiResponse.error || 'Failed to move fleet',
          { persistent: true }
        );
      }
      // Success message will come via Socket.IO

    } catch (error) {
      showSystemMessage(
        'error',
        'Network error while moving fleet',
        { persistent: true }
      );
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Fleet Management</h2>
      
      {fleets.map(fleet => (
        <div key={fleet.id} className="p-4 bg-gray-800 rounded-lg">
          <h3 className="font-semibold">{fleet.name}</h3>
          <p className="text-sm text-gray-400">Status: {fleet.status}</p>
          
          {fleet.status === 'idle' && (
            <button
              onClick={() => handleFleetMove(fleet.id, 'A00:10:20:05')}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Move Fleet
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// 5. API SERVICE WITH ENHANCED ERROR HANDLING
// =============================================================================

// Enhanced API service that uses the new response patterns
class EnhancedApiService {
  private baseUrl = '/api';
  private notifications = useNotifications();

  async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<EnhancedApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
          ...options.headers
        },
        ...options
      });

      const apiResponse: EnhancedApiResponse<T> = await response.json();

      // Handle rate limiting
      if (apiResponse.rateLimit) {
        console.log('Rate limit info:', apiResponse.rateLimit);
      }

      // Show error messages automatically
      if (isErrorResponse(apiResponse)) {
        this.handleApiError(apiResponse);
      }

      return apiResponse;

    } catch (error) {
      const networkError = {
        success: false,
        statusCode: 0,
        errorCode: 'NETWORK_ERROR' as any,
        error: 'Network error occurred',
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`
      } as EnhancedApiResponse<T>;

      this.handleApiError(networkError);
      return networkError;
    }
  }

  private handleApiError(response: any) {
    const { errorCode, error, details } = response;
    
    // Create appropriate error message based on error code
    let message = error;
    let severity: 'error' | 'warning' = 'error';
    
    switch (errorCode) {
      case 'TOKEN_EXPIRED':
        message = 'Your session has expired. Please log in again.';
        severity = 'warning';
        // Redirect to login
        break;
      case 'RATE_LIMIT_EXCEEDED':
        message = 'Too many requests. Please wait a moment before trying again.';
        severity = 'warning';
        break;
      case 'NETWORK_ERROR':
        message = 'Network error. Please check your connection.';
        break;
      default:
        message = error || 'An unexpected error occurred';
    }

    this.notifications.showSystemMessage(severity, message, {
      persistent: severity === 'error',
      timeout: severity === 'warning' ? 5000 : undefined
    });
  }

  // Specific API methods
  async getEmpire(empireId: string) {
    return this.request<any>(`/empire/${empireId}`);
  }

  async startConstruction(locationCoord: string, buildingType: string) {
    return this.request<any>('/buildings/construct', {
      method: 'POST',
      body: JSON.stringify({ locationCoord, buildingType })
    });
  }

  async getBuildings(locationCoord?: string, page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(locationCoord && { locationCoord })
    });
    
    return this.request<any>(`/buildings?${params}`);
  }
}

// =============================================================================
// 6. MESSAGE CONTAINER COMPONENT
// =============================================================================

export const MessageContainer: React.FC = () => {
  const { notifications, dismissMessage } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map(message => (
        <EnhancedMessageToast
          key={message.id}
          message={message}
          onDismiss={dismissMessage}
        />
      ))}
    </div>
  );
};

// =============================================================================
// 7. SOCKET.IO INTEGRATION HOOK
// =============================================================================

export const useSocketMessages = (empireId?: string) => {
  const { showMessage } = useNotifications();

  useEffect(() => {
    const socket = getSocket();

    // Generic message handler
    const handleGameMessage = (message: GameMessage) => {
      showMessage(message);
    };

    // Specific event handlers
    const handleEmpireUpdate = (data: any) => {
      showTemplateMessage(
        EMPIRE_MESSAGES.RESOURCES_UPDATED,
        {
          creditsGained: data.creditsGained,
          totalCredits: data.totalCredits
        },
        { empireId }
      );
    };

    // Register listeners
    socket.on('game:message', handleGameMessage);
    socket.on('empire:updated', handleEmpireUpdate);

    // Join empire room
    if (empireId) {
      socket.emit('empire:join', { empireId });
    }

    return () => {
      socket.off('game:message', handleGameMessage);
      socket.off('empire:updated', handleEmpireUpdate);
      
      if (empireId) {
        socket.emit('empire:leave', { empireId });
      }
    };
  }, [empireId, showMessage]);
};

// =============================================================================
// 8. HELPER FUNCTIONS
// =============================================================================

// Mock functions that would be implemented in your app
function getToken(): string {
  return localStorage.getItem('authToken') || '';
}

function getSocket(): any {
  // Return your Socket.IO client instance
  return null;
}

// CSS for animations
const styles = `
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
`;

// Example usage in App component:
export const ExampleApp: React.FC = () => {
  const empireId = 'empire_123';
  
  // Initialize socket message handling
  useSocketMessages(empireId);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <style>{styles}</style>
      
      {/* Your app content */}
      <BuildingConstruction 
        empireId={empireId} 
        locationCoord="A00:10:20:05" 
      />
      
      <FleetManagement empireId={empireId} />
      
      {/* Message container for notifications */}
      <MessageContainer />
    </div>
  );
};