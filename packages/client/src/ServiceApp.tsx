import App from './App';
import { ServiceProvider, MigrationDebugPanel } from './components/ServiceMigrationWrapper';
import { ENV_VARS } from '@game/shared';


/**
 * Service-wrapped application with migration support
 * This wrapper provides service integration while maintaining backward compatibility
 */
function ServiceApp() {
  return (
    <ServiceProvider 
      enableMonitoring={true}
      fallback={
        <div className="service-initialization-fallback">
          <div className="game-container flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-lg">Initializing services...</p>
            </div>
          </div>
        </div>
      }
    >
      {/* Original App component unchanged */}
      <App />

      {/* Development tools - only shown in development */}
      {process.env[ENV_VARS.NODE_ENV] === 'development' && (
        <MigrationDebugPanel expanded={false} />
      )}
    </ServiceProvider>
  );
}

export default ServiceApp;