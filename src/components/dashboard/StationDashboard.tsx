import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, BarChart3, Fuel, Receipt, TrendingUp } from 'lucide-react';
import FuelRecordForm from './FuelRecordForm';
import ExpenseForm from './ExpenseForm';
import DailySummary from './DailySummary';
import { StockManagement } from './StockManagement';
import { FuelRecordsProvider } from '@/contexts/FuelRecordsContext';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';
import StaffPage from './StaffPage';

interface Station {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

const tabItems = [
  {
    value: 'fuel-records',
    label: 'Fuel Records',
    icon: <Fuel className="h-4 w-4" />,
  },
  {
    value: 'expenses',
    label: 'Expenses',
    icon: <Receipt className="h-4 w-4" />,
  },
  {
    value: 'stock',
    label: 'Stock',
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    value: 'summary',
    label: 'Summary',
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    value: 'staff',
    label: 'Staff',
    icon: <span className="h-4 w-4">👤</span>,
  },
];

const StationDashboard = () => {
  const [station, setStation] = useState<Station | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTab, setSelectedTab] = useState('fuel-records');
  const { toast } = useToast();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDebugInfo('No authenticated user found');
        setLoading(false);
        return;
      }
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileError) {
        setDebugInfo(`Profile error: ${profileError.message}`);
        setLoading(false);
        return;
      }
      setProfile(profileData);
      // If admin, fetch all stations
      if (profileData.role === 'admin') {
        const { data: stationsData, error: stationsError } = await supabase
          .from('stations')
          .select('*');
        if (stationsError) {
          setDebugInfo('Error loading stations: ' + stationsError.message);
        } else {
          setAllStations(stationsData || []);
        }
        setLoading(false);
        return;
      }
      // If manager, fetch assigned station
      const { data: userStation, error: userStationError } = await supabase
        .from('user_stations')
        .select('station_code')
        .eq('user_id', user.id)
        .maybeSingle();
      if (userStationError) {
        setDebugInfo(`User station error: ${userStationError.message}`);
        setLoading(false);
        return;
      }
      if (userStation && userStation.station_code) {
        const { data: stationData, error: stationError } = await supabase
          .from('stations')
          .select('*')
          .eq('id', userStation.station_code)
          .maybeSingle();
        if (stationError) {
          setDebugInfo(`Station error: ${stationError.message}. Looking for station with id: ${userStation.station_code}`);
        } else if (stationData) {
          setStation(stationData);
        } else {
          setDebugInfo(`No station found with id: ${userStation.station_code}`);
        }
      } else {
        setDebugInfo('No station assignment found for this user');
      }
    } catch (error) {
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
    // Use client-side navigation to the login page instead of reload or hardcoded URL
    window.location.href = '/';
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

  if (profile?.role === 'admin') {
    if (!allStations.length) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No Stations Found</CardTitle>
              <CardDescription>
                No stations are available for admin view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogout} variant="outline" className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    if (!selectedStation) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No Station Selected</CardTitle>
              <CardDescription>
                Please select a station to view the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allStations.map((st) => (
                  <Button key={st.id} onClick={() => setSelectedStation(st)} className="w-full">
                    {st.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    // Show dashboard for selected station (Admin view)
    return (
      <div className="min-h-screen bg-gray-50">
        <SidebarProvider>
          <div className="flex w-full min-h-screen">
            {/* Sidebar - Hidden on mobile, shown on desktop */}
            <Sidebar className="bg-[#1a2341] shadow-lg">
              <SidebarContent className="bg-[#1a2341]">
                <div className="flex items-center gap-2 px-6 pt-8 pb-10">
                  <div className="rounded-full bg-white/10 p-2">
                    <span className="block w-8 h-8 bg-white/20 rounded-full" />
                  </div>
                  <span className="text-white text-lg font-bold tracking-wide">
                    {selectedStation?.name} Station
                  </span>
                </div>
                <SidebarMenu className="flex flex-col flex-1 gap-2 px-2">
                  {tabItems.map(tab => (
                    <SidebarMenuItem key={tab.value}>
                      <SidebarMenuButton
                        isActive={selectedTab === tab.value}
                        onClick={() => setSelectedTab(tab.value)}
                        className={
                          `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                          ${selectedTab === tab.value ? 'bg-white/10 text-white font-semibold shadow' : 'text-white/70 hover:bg-white/5 hover:text-white'}`
                        }
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      <LogOut className="h-5 w-5" />
                      Log Out
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarContent>
            </Sidebar>
            
            {/* Main content area */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Header */}
              <div className="bg-white shadow-sm border-b">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-center py-6">
                    {/* Mobile sidebar trigger */}
                    <div className="md:hidden">
                      <Button variant="ghost" size="sm" asChild>
                        <SidebarTrigger>
                          <Menu className="h-6 w-6 text-blue-600" />
                        </SidebarTrigger>
                      </Button>
                    </div>
                    
                    {/* Desktop spacing */}
                    <div className="hidden md:block" />
                      <div className="-pl-10" >
                          <h1 className="text-2xl font-bold text-gray-900">
                                Admin Dashboard
                              </h1>
                              <p className="text-2xl font-bold text-gray-900">
                                Welcome, {profile?.full_name} (admin)
                              </p>
                      </div> 
                    <div className="flex gap-2">
                      <Button onClick={() => setSelectedStation(null)} variant="secondary">
                        Back to All Stations
                      </Button>
                      
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Content area */}
              <div className="flex-1 p-6">
                <div className="flex justify-end mb-6">
                  {selectedTab !== 'staff' && (
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-48"
                    />
                  )}
                </div>
                  {/* Tab content rendering */}
                <div className="w-full">
                  {selectedTab === 'fuel-records' && (
                    <FuelRecordForm stationId={selectedStation.id} date={selectedDate} isAdmin={profile?.role === 'admin'} />
                  )}
                  {selectedTab === 'expenses' && (
                    <ExpenseForm stationId={selectedStation.id} date={selectedDate} isAdmin={profile?.role === 'admin'} />
                  )}
                  {selectedTab === 'stock' && (
                    <FuelRecordsProvider>
                      <StockManagement stationId={selectedStation.id} date={selectedDate} isAdmin={profile?.role === 'admin'} />
                    </FuelRecordsProvider>
                  )}
                  {selectedTab === 'summary' && (
                    <DailySummary stationId={selectedStation.id} date={selectedDate} />
                  )}
                  {selectedTab === 'staff' && (
                    <StaffPage stationId={selectedStation.id} isAdmin={profile?.role === 'admin'} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarProvider>
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

  // Manager view
  return (
    <div className="min-h-screen bg-gray-50">
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          {/* Sidebar - Hidden on mobile, shown on desktop */}
          <Sidebar className="bg-[#1a2341] shadow-lg">
            <SidebarContent className="bg-[#1a2341]">
              <div className="flex items-center gap-2 px-6 pt-8 pb-10">
                <div className="rounded-full bg-white/10 p-2">
                  <span className="block w-8 h-8 bg-white/20 rounded-full" />
                </div>
                <span className="text-white text-lg font-bold tracking-wide">
                  {station?.name} Station
                </span>
              </div>
              <SidebarMenu className="flex flex-col flex-1 gap-2 px-2">
                {tabItems.map(tab => (
                  <SidebarMenuItem key={tab.value}>
                    <SidebarMenuButton
                      isActive={selectedTab === tab.value}
                      onClick={() => setSelectedTab(tab.value)}
                      className={
                        `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${selectedTab === tab.value ? 'bg-white/10 text-white font-semibold shadow' : 'text-white/70 hover:bg-white/5 hover:text-white'}`
                      }
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    <LogOut className="h-5 w-5" />
                    Log Out
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          
          {/* Main content area */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b">
              <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6">
                  {/* Mobile sidebar trigger */}
                  <div className="md:hidden">
                    <SidebarTrigger>
                      <Button variant="ghost" size="sm">
                        <Menu className="h-6 w-6 text-red-600" />
                      </Button>
                    </SidebarTrigger>
                  </div>
                  
                  {/* Welcome message - hidden on mobile when sidebar trigger is shown */}
                  <div className="hidden md:block">
                    <h1 className="text-lg text-gray-900 font-bold">
                      Welcome, {profile?.full_name} ({profile?.role})
                    </h1>
                  </div>
                  
                  {/* Mobile welcome message - shown when sidebar trigger is visible */}
                  <div className="md:hidden flex-1 text-center">
                    <h1 className="text-lg text-gray-900 font-bold">
                      Welcome, {profile?.full_name}
                    </h1>
                  </div>
                  
                  {/* Empty div for spacing on desktop */}
                  <div className="hidden md:block" />
                </div>
              </div>
            </div>
            
            {/* Content area */}
            <div className="flex-1 p-6">
              <div className="flex justify-end mb-6">
                {selectedTab !== 'staff' && (
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-48"
                  />
                )}
              </div>
              
              {/* Tab content rendering */}
              <div className="w-full">                
                {selectedTab === 'fuel-records' && (
                  <FuelRecordForm stationId={station.id} date={selectedDate} isAdmin={profile?.role === 'admin'} />
                )}
                {selectedTab === 'expenses' && (
                  <ExpenseForm stationId={station.id} date={selectedDate} isAdmin={profile?.role === 'admin'} />
                )}
                {selectedTab === 'stock' && (
                  <FuelRecordsProvider>
                    <StockManagement stationId={station.id} date={selectedDate} isAdmin={profile?.role === 'admin'} />
                  </FuelRecordsProvider>
                )}
                {selectedTab === 'summary' && (
                  <DailySummary stationId={station.id} date={selectedDate} />
                )}
                {selectedTab === 'staff' && (
                  <StaffPage stationId={station.id} isAdmin={profile?.role === 'admin'} />
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default StationDashboard;