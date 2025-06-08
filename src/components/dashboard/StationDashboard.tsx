import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, BarChart3, Fuel, Receipt, TrendingUp } from 'lucide-react';
import FuelRecordForm from './FuelRecordForm';
import ExpenseForm from './ExpenseForm';
import DailySummary from './DailySummary';
import { StockManagement } from './StockManagement';
import { FuelRecordsProvider } from '@/contexts/FuelRecordsContext';

interface Station {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

const StationDashboard = () => {
  const [station, setStation] = useState<Station | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDebugInfo('No authenticated user found');
        return;
      }

      console.log('Current user:', user.id);

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        setDebugInfo(`Profile error: ${profileError.message}`);
      } else if (profileData) {
        setProfile(profileData);
        console.log('Profile loaded:', profileData);
      }

      // Load user's assigned station
      const { data: userStation, error: userStationError } = await supabase
        .from('user_stations')
        .select('station_code')
        .eq('user_id', user.id)
        .single();

      if (userStationError) {
        console.error('User station error:', userStationError);
        setDebugInfo(`User station error: ${userStationError.message}`);
      } else if (userStation) {
        console.log('User station data:', userStation);
        
        // Load station details
        const { data: stationData, error: stationError } = await supabase
          .from('stations')
          .select('*')
          .eq('id', userStation.station_code)
          .single();

        if (stationError) {
          console.error('Station error:', stationError);
          setDebugInfo(`Station error: ${stationError.message}. Looking for station with id: ${userStation.station_code}`);
        } else if (stationData) {
          setStation(stationData);
          console.log('Station loaded:', stationData);
        } else {
          setDebugInfo(`No station found with id: ${userStation.station_code}`);
        }
      } else {
        setDebugInfo('No station assignment found for this user');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setDebugInfo(`Unexpected error: ${error}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load user data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Station Assigned</CardTitle>
            <CardDescription>
              You are not assigned to any station. Please contact the administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {debugInfo && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                <strong>Debug Info:</strong> {debugInfo}
              </div>
            )}
            <Button onClick={handleLogout} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
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
                {station.name} Station
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {profile?.full_name} ({profile?.role})
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
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="fuel-records" className="flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Fuel Records
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Stock
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <DailySummary stationId={station.id} />
          </TabsContent>

          <TabsContent value="fuel-records">
            <FuelRecordForm stationId={station.id} />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenseForm stationId={station.id} />
          </TabsContent>

          <TabsContent value="stock">
            <FuelRecordsProvider>
              <StockManagement stationId={station.id} />
            </FuelRecordsProvider>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StationDashboard;
