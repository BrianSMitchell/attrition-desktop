import React from 'react';
import { AppHeader } from './AppHeader/AppHeader';
import { NavigationSidebar } from './NavigationSidebar/NavigationSidebar';
import ModalManager from '../game/ModalManager';
import { useAuth, useServiceState, useServiceActions } from '../../stores/enhancedAppStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const auth = useAuth();
  const services = useServiceState();
  const { getServiceHealth } = useServiceActions();
  
  // Initialize message services with new service architecture
  React.useEffect(() => {
    const health = getServiceHealth();
    // Only initialize if services are ready
    if (services?.isReady && health?.overall === 'healthy') {
      // Message initialization will be handled by service architecture
      console.log('📨 Layout: Services are ready, message system active');
    }
  }, [services?.isReady, getServiceHealth]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation Header */}
      <AppHeader />

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <NavigationSidebar />

        {/* Main Content Area */}
        <main className="game-main">
          {children}
        </main>
      </div>
      <ModalManager empire={auth.empire || null} onUpdate={() => {}} />
    </div>
  );
};

export default Layout;
