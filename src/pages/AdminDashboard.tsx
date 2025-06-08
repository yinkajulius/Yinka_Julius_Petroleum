import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import DailySummary from '@/components/dashboard/DailySummary';
import { StockManagement } from '@/components/dashboard/StockManagement';

interface Station {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

const AdminDashboard = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileError || !profileData) {
        navigate('/');
        return;
      }
      setProfile(profileData);
      if (profileData.role !== 'admin') {
        navigate('/');
        return;
      }
      // Get all stations
      const { data: stationsData, error: stationsError } = await supabase
        .from('stations')
        .select('id, name');
      if (stationsError || !stationsData) {
        setStations([]);
      } else {
        setStations(stationsData);
        setActiveTab(stationsData[0]?.id || '');
      }
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {profile?.full_name} (admin)
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-{stations.length}">
            {stations.map((station) => (
              <TabsTrigger key={station.id} value={station.id} className="flex items-center gap-2">
                {station.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {stations.map((station) => (
            <TabsContent key={station.id} value={station.id}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DailySummary stationId={station.id} date={new Date().toISOString().split('T')[0]} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Tank Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Only admin can edit tanks, so show StockManagement as-is */}
                    <StockManagement stationId={station.id} date={new Date().toISOString().split('T')[0]} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard; 