import React, { useState } from 'react';
import { useEnhancedNotifications } from '../ui/EnhancedMessageContainer';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  requestId?: string;
  details?: Array<{ field?: string; message: string; code?: string }>;
  metadata?: Record<string, any>;
}

const MigrationTestPage: React.FC = () => {
  const [responses, setResponses] = useState<Array<{ endpoint: string; response: any }>>([]);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError, showWarning, showInfo } = useEnhancedNotifications();

  const callApi = async (endpoint: string, method = 'GET', body?: any) => {
    setLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`/api/test${endpoint}`, options);
      const data: ApiResponse = await response.json();
      
      setResponses(prev => [{ endpoint: `${method} ${endpoint}`, response: data }, ...prev.slice(0, 9)]);
      
      // Show notification based on response
      if (data.success) {
        showSuccess(`API call successful: ${endpoint}`, { category: 'system' });
      } else {
        showError(`API call failed: ${data.error}`, { category: 'system' });
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setResponses(prev => [{ endpoint: `${method} ${endpoint}`, response: { error: errorMsg, success: false } }, ...prev.slice(0, 9)]);
      showError(`Network error: ${errorMsg}`, { category: 'system' });
    } finally {
      setLoading(false);
    }
  };

  const testNotifications = () => {
    showInfo('This is a test info message', { category: 'system' });
    
    setTimeout(() => {
      showSuccess('Building construction completed!', { 
        category: 'building',
        context: { buildingType: 'Metal Mine', location: 'Planet A1' }
      });
    }, 1000);
    
    setTimeout(() => {
      showWarning('Resource levels are getting low', { 
        category: 'resource',
        context: { credits: 150, threshold: 200 }
      });
    }, 2000);
    
    setTimeout(() => {
      showError('Fleet movement failed', { 
        category: 'fleet',
        persistent: true,
        context: { fleetId: 'fleet-123', reason: 'Insufficient fuel' }
      });
    }, 3000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Migration Test Page</h1>
      <p className="text-gray-600 mb-8">
        This page demonstrates the new enhanced API response patterns and message system.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* API Test Controls */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">API Response Tests</h2>
          
          <div className="space-y-2">
            <button
              onClick={() => callApi('/hello')}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Test Success Response (/hello)
            </button>
            
            <button
              onClick={() => callApi('/error')}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Test Error Response (/error)
            </button>
            
            <button
              onClick={() => callApi('/validate', 'POST', {})}
              disabled={loading}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Test Validation Error (/validate - empty)
            </button>
            
            <button
              onClick={() => callApi('/validate', 'POST', { name: 'Test User', email: 'test@example.com' })}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Test Validation Success (/validate - valid)
            </button>
            
            <button
              onClick={() => callApi('/game-data')}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Test Game Data (/game-data)
            </button>
            
            <button
              onClick={() => callApi('/old-format')}
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Test Old Format (/old-format)
            </button>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Notification Tests</h3>
            <button
              onClick={testNotifications}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Test Enhanced Notifications
            </button>
          </div>
        </div>
        
        {/* API Responses Display */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent API Responses</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {responses.length === 0 ? (
              <p className="text-gray-500 italic">No API calls made yet</p>
            ) : (
              responses.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="font-medium text-sm text-gray-600 mb-2">
                    {item.endpoint}
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(item.response, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Testing Instructions</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Click the API test buttons to see different response formats</li>
          <li>• Check the browser console for detailed logging</li>
          <li>• Notice enhanced notifications appear in the top-left corner</li>
          <li>• Compare the old vs new API response structures</li>
          <li>• Persistent error messages require manual dismissal</li>
        </ul>
      </div>
    </div>
  );
};

export default MigrationTestPage;