
import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';
import StationDashboard from '@/components/dashboard/StationDashboard';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={() => window.location.reload()} />;
  }

  return <StationDashboard />;
};

export default Index;
