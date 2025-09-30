/**
 * Layout wrapper with enhanced ServiceProvider
 * Provides new service architecture to Layout and its child components
 */

import React from 'react';
import { ServiceProvider } from '../ServiceMigrationWrapper';
import Layout from './Layout';

interface LayoutWithServicesProps {
  children: React.ReactNode;
}

export const LayoutWithServices: React.FC<LayoutWithServicesProps> = ({ children }) => {
  return (
    <ServiceProvider
      enableMonitoring={process.env.NODE_ENV === 'development'}
      fallback={
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-lg">Loading game services...</p>
            <p className="text-sm text-gray-400 mt-2">This may take a moment on first load</p>
          </div>
        </div>
      }
    >
      <Layout>
        {children}
      </Layout>
    </ServiceProvider>
  );
};
