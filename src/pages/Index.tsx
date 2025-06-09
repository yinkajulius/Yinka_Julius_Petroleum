import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';
import StationDashboard from '@/components/dashboard/StationDashboard';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, loading } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        setCheckingAdmin(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'admin') {
          navigate('/admin', { replace: true });
        }
        setCheckingAdmin(false);
      }
    };
    checkAdmin();
  }, [user, navigate]);

  if (loading || checkingAdmin) {
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
