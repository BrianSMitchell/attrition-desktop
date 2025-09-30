import React from 'react';
import { Navigate } from 'react-router-dom';
import Login from './Login';
import { useAuth } from '../../stores/enhancedAppStore';
import { useServiceAuth } from '../../hooks/useServiceIntegration';

/**
 * Login component test - now simplified since migration is complete
 * This component now just redirects to the main login or dashboard
 */
const LoginMigrationTest: React.FC = () => {
  const legacyAuth = useAuth();
  const serviceAuth = useServiceAuth();
  
  // If user is authenticated in either system, redirect to dashboard
  const isAuthenticated = legacyAuth.user || serviceAuth.isAuthenticated;
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Since migration is complete, just render the Login component
  return <Login />;
};

export default LoginMigrationTest;
