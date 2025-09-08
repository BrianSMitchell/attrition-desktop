import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import BaseManagement from './BaseManagement';

const BasesPage: React.FC = () => {
  const { empire, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading bases...</p>
        </div>
      </div>
    );
  }

  if (!empire) {
    return (
      <div className="game-card">
        <div className="text-center">
          <p className="text-gray-300 mb-2">No empire data available.</p>
          <p className="text-gray-500 text-sm">Please create an empire or refresh the page.</p>
        </div>
      </div>
    );
  }

  // BaseManagement currently requires an onUpdate prop in its type, but doesn't consume it.
  // Provide a no-op handler to satisfy typing.
  return <BaseManagement empire={empire} onUpdate={() => {}} />;
};

export default BasesPage;
