import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, useAuthActions } from './stores/enhancedAppStore';
import { LOADING_MESSAGES } from '@game/shared';
import ConnectionBanner from './components/layout/ConnectionBanner';
import { LayoutWithServices as Layout } from './components/layout/LayoutWithServices';
import { UpdateProvider } from './contexts/UpdateContext';
import SyncFeedback from './components/ui/SyncFeedback';
import UpdateNotification from './components/ui/UpdateNotification';
import MessageToast from './components/ui/MessageToast';
import ToastContainer from './components/ui/ToastContainer';
import { prefetchVendors } from './utils/prefetch';

const Login = lazy(() => import('./components/auth/Login'));
const LoginMigrationTest = lazy(() => import('./components/auth/LoginMigrationTest'));
const Register = lazy(() => import('./components/auth/Register'));
const Dashboard = lazy(() => import('./components/game/Dashboard'));
const GalaxyPage = lazy(() => import('./components/game/GalaxyPage'));
const PlanetPage = lazy(() => import('./components/game/PlanetPage'));
const UniversePage = lazy(() => import('./components/game/UniversePage'));
const BasesPage = lazy(() => import('./components/game/BasesPage'));
const BasePage = lazy(() => import('./components/game/BasePage'));
const HelpPage = lazy(() => import('./components/help/HelpPage'));
const FleetPage = lazy(() => import('./components/game/FleetPage'));
const MessagesPage = lazy(() => import('./components/game/MessagesPage'));
const PerformancePage = lazy(() => import('./components/admin/PerformancePage'));

const isDesktop = typeof window !== 'undefined' && (((window as any).desktop) || window.location.protocol === 'file:');
const RouterComponent = isDesktop ? HashRouter : BrowserRouter;

function App() {
  const auth = useAuth();
  const { clearAuth } = useAuthActions();
  
  // Check both auth state and service readiness
  const isAuthed = auth.user && auth.token;
  // IMPORTANT: Do not gate the entire app on services.isReady.
  // The ServiceProvider inside the Layout handles service initialization and its own fallback UI.
  // Gating here can cause a permanent loading screen if services cleanup runs and never flips isReady.
  const isLoading = auth.isLoading;
  
  const user = isAuthed ? auth.user : null; // Use actual user object instead of empty object

  // Service initialization is now handled by ServiceProvider in Layout
  // This prevents multiple initialization attempts and infinite loops

  // Listen for global auth:unauthorized to immediately clear auth state (prevents redirect oscillation)
  useEffect(() => {
    const handler = () => {
      try {
        clearAuth();
      } catch {}
    };
    window.addEventListener('auth:unauthorized' as any, handler);
    return () => {
      window.removeEventListener('auth:unauthorized' as any, handler);
    };
  }, [clearAuth]);

  if (isLoading) {
    return (
      <div className="game-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">{LOADING_MESSAGES.ATTRITION}</p>
        </div>
      </div>
    );
  }

  // Prefetch a few tiny vendor chunks after first paint to speed up navigation
  useEffect(() => {
    prefetchVendors();
  }, []);

  // Pixi7 POC loader disabled to keep Pixi 6 build stable
  return (
    <UpdateProvider>
      <RouterComponent>
        <ConnectionBanner />
        <ToastContainer />
        <UpdateNotification />
        <SyncFeedback />
        <MessageToast />
        <div className="game-container">
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" replace /> : (
                <Suspense fallback={<div className="p-4 text-center">{LOADING_MESSAGES.DEFAULT}</div>}>
                  <Login />
                </Suspense>
              )}
            />
            <Route 
              path="/register" 
              element={user ? <Navigate to="/dashboard" replace /> : (
                <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                  <Register />
                </Suspense>
              )}
            />
            
            {/* Migration test route - development only */}
            <Route 
              path="/login-test" 
              element={user ? <Navigate to="/dashboard" replace /> : (
                <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                  <LoginMigrationTest />
                </Suspense>
              )}
            />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                user ? (
                  <Layout>
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <Dashboard />
                    </Suspense>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            
            <Route 
              path="/universe" 
              element={
                user ? (
                  <Layout>
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <UniversePage />
                    </Suspense>
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
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <GalaxyPage />
                    </Suspense>
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
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <BasesPage />
                    </Suspense>
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
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <HelpPage />
                    </Suspense>
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
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <PlanetPage />
                    </Suspense>
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
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <BasePage />
                    </Suspense>
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
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <FleetPage />
                    </Suspense>
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
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <MessagesPage />
                    </Suspense>
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
                    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
                      <PerformancePage />
                    </Suspense>
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
    </UpdateProvider>
  );
}

export default App;
