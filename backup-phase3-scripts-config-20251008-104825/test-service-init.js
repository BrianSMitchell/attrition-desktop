// Simple test script to debug service initialization
console.log('Starting service initialization test...');

// Mock the required modules
const mockServices = {
  isReady: () => {
    console.log('Checking if services are ready...');
    return true;
  },
  getConnectionManager: () => {
    console.log('Getting connection manager...');
    return {
      on: (event, callback) => {
        console.log(`Setting up event listener for: ${event}`);
        // Simulate immediate callback for testing
        if (event === 'auth-change') {
          setTimeout(() => callback(), 100);
        }
        return () => {};
      }
    };
  }
};

// Mock the service registry
const mockServiceRegistry = {
  initialize: async () => {
    console.log('Initializing service registry...');
    return Promise.resolve();
  },
  getInstance: () => mockServices
};

// Test the initialization
async function testInit() {
  try {
    console.log('Calling initializeServices...');
    await mockServiceRegistry.initialize();
    console.log('Service registry initialized');
    
    const services = mockServiceRegistry.getInstance();
    console.log('Got services instance');
    
    const isReady = services.isReady();
    console.log('Services ready:', isReady);
    
    if (isReady) {
      console.log('Setting up event listeners...');
      const connectionManager = services.getConnectionManager();
      console.log('Got connection manager');
      
      connectionManager.on('auth-change', () => {
        console.log('Auth change event received');
      });
      
      console.log('Event listeners set up successfully');
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testInit();
