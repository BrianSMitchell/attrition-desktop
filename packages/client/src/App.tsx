import * as React from 'react';
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { NetworkProvider } from './contexts/NetworkContext';
import { SyncProvider } from './contexts/SyncContext';
import ConnectionBanner from './components/layout/ConnectionBanner';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/game/Dashboard';
import Layout from './components/layout/Layout';
import GalaxyPage from './components/game/GalaxyPage';
import PlanetPage from './components/game/PlanetPage';
import BasesPage from './components/game/BasesPage';
import BasePage from './components/game/BasePage';
import HelpPage from './components/help/HelpPage';
import FleetPage from './components/game/FleetPage';
import MessagesPage from './components/game/MessagesPage';
import PerformancePage from './components/admin/PerformancePage';
import { ToastProvider, ToastViewport } from './contexts/ToastContext';
import { UpdateProvider } from './contexts/UpdateContext';
import SyncFeedback from './components/ui/SyncFeedback';
import UpdateNotification from './components/ui/UpdateNotification';
import MessageToast from './components/ui/MessageToast';

const isDesktop = typeof window !== 'undefined' && (((window as any).desktop) || window.location.protocol === 'file:');
const RouterComponent = isDesktop ? HashRouter : BrowserRouter;

function App() {
  const isAuthed = useAuthStore((s) => s.getIsAuthed());
  const isLoading = useAuthStore((s) => s.isLoading);
  // Backward-compat shim for existing ternaries that check `user ? ... : ...`
  const user = isAuthed ? ({} as any) : null;

  // Listen for global auth:unauthorized to immediately clear auth state (prevents redirect oscillation)
  React.useEffect(() => {
    const handler = () => {
      try {
        useAuthStore.getState().unauthorize();
      } catch {}
    };
    window.addEventListener('auth:unauthorized' as any, handler);
    return () => {
      window.removeEventListener('auth:unauthorized' as any, handler);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="game-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading Attrition...</p>
        </div>
      </div>
    );
  }

  return (
    <NetworkProvider>
      <ToastProvider>
        <UpdateProvider>
          <SyncProvider>
            <RouterComponent>
              <ConnectionBanner />
              <ToastViewport />
              <UpdateNotification />
              <SyncFeedback />
              <MessageToast />
            <div className="game-container">
            <Routes>
              {/* Public routes */}
              <Route 
                path="/login" 
                element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
              />
              <Route 
                path="/register" 
                element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
              />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  user ? (
                    <Layout>
                      <Dashboard />
                    </Layout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              <Route 
                path="/galaxy" 
                element={
                  user ? (
                    <Layout>
                      <GalaxyPage />
                    </Layout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              <Route 
                path="/bases" 
                element={
                  user ? (
                    <Layout>
                      <BasesPage />
                    </Layout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              <Route 
                path="/help" 
                element={
                  user ? (
                    <Layout>
                      <HelpPage />
                    </Layout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              <Route 
                path="/planet/:coord" 
                element={
                  user ? (
                    <Layout>
                      <PlanetPage />
                    </Layout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              <Route
                path="/base/:coord"
                element={
                  user ? (
                    <Layout>
                      <BasePage />
                    </Layout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route 
                path="/fleets/:id" 
                element={
                  user ? (
                    <Layout>
                      <FleetPage />
                    </Layout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              <Route 
                path="/messages" 
                element={
                  user ? (
                    <Layout>
                      <MessagesPage />
                    </Layout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              <Route 
                path="/admin/performance" 
                element={
                  user ? (
                    <Layout>
                      <PerformancePage />
                    </Layout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />

              {/* Default redirect */}
              <Route 
                path="/" 
                element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
              />
              
              {/* Catch all */}
              <Route 
                path="*" 
                element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
              />
            </Routes>
          </div>
        </RouterComponent>
          </SyncProvider>
        </UpdateProvider>
      </ToastProvider>
    </NetworkProvider>
  );
}

export default App;
