import React, { useState, useEffect } from 'react';
import { Package, CalendarIcon, Plus, Settings } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StockManagementProps {
  stationId: string;
  date: string;
}

interface Pump {
  id: string;
  pump_number: number;
  product_type: string;
  tank_id: string;
  station_id: string;
  capacity?: number;
  created_at?: string;
}

interface TankGroup {
  tank_id: string;
  product_type: string;
  pumps: Pump[];
  openingStock: number;
  closingStock: number;
  salesVolume: number;
  maxCapacity: number;
}

interface RestockInputs {
  [key: string]: string;
}

interface TankCapacity {
  id: string;
  station_code: string;
  product_type: string;
  capacity: number;
}

export const StockManagement = ({ stationId, date }: StockManagementProps): React.ReactElement => {
  const [tankGroups, setTankGroups] = useState<TankGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockAmounts, setRestockAmounts] = useState<RestockInputs>({});
  const [restockLoading, setRestockLoading] = useState<{ [key: string]: boolean }>({});
  const [showCapacityDialog, setShowCapacityDialog] = useState(false);
  const [selectedTank, setSelectedTank] = useState<string>('');
  const [newCapacity, setNewCapacity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousDay = format(subDays(new Date(date), 1), 'yyyy-MM-dd');
  const { toast } = useToast();
  const [capacities, setCapacities] = useState<TankCapacity[]>([]);

  const productTypes = ['PMS', 'AGO', 'LPG'];

  useEffect(() => {
    fetchPumpsAndStock();
  }, [stationId, date]);

  const handleRestockChange = (tankId: string, value: string) => {
    setRestockAmounts(prev => ({
      ...prev,
      [tankId]: value
    }));
  };

  // Update handleRestock: for each pump in the tank, if today's record exists, update; else, create with correct opening/closing meter
  const handleRestock = async (tankId: string, currentOpeningStock: number, product_type: string) => {
    const restockAmount = parseFloat(restockAmounts[tankId]);
    if (isNaN(restockAmount) || restockAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid restock amount greater than 0",
      });
      return;
    }

    setRestockLoading(prev => ({ ...prev, [tankId]: true }));

    try {
      // Get all pumps for ONLY this tank
      const { data: pumps, error: pumpsError } = await supabase
        .from('pumps')
        .select('id')
        .eq('tank_id', tankId);
      if (pumpsError) throw pumpsError;

      // Calculate new opening stock by adding to current stock
      const newOpeningStock = currentOpeningStock + restockAmount;

      // For each pump in the selected tank, update or insert the record for today
      for (const pump of pumps) {
        // Check if a record exists for this date and pump
        const { data: existingRecord, error: fetchError } = await supabase
          .from('fuel_records')
          .select('id, sales_volume, meter_opening, meter_closing')
          .eq('station_code', stationId)
          .eq('pump_id', pump.id)
          .eq('record_date', date)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
          throw fetchError;
        }

        let error;
        if (existingRecord) {
          // Update existing record's opening stock and meters
          const { error: updateError } = await supabase
            .from('fuel_records')
            .update({
              opening_stock: newOpeningStock,
              closing_stock: Math.max(0, newOpeningStock - (existingRecord.sales_volume || 0)),
              meter_opening: existingRecord.meter_opening || 0,
              meter_closing: existingRecord.meter_closing || 0
            })
            .eq('id', existingRecord.id);
          error = updateError;
        } else {
          // Instead of creating a new record, update the last available record's closing stock only
          const { data: lastRecord, error: lastError } = await supabase
            .from('fuel_records')
            .select('id, closing_stock')
            .eq('station_code', stationId)
            .eq('pump_id', pump.id)
            .lt('record_date', date)
            .order('record_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastError) throw lastError;
          if (lastRecord) {
            const { error: updateLastError } = await supabase
              .from('fuel_records')
              .update({
                closing_stock: newOpeningStock
              })
              .eq('id', lastRecord.id);
            if (updateLastError) throw updateLastError;
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: "No previous record found to update for this pump.",
            });
            continue;
          }
        }
        if (error) throw error;
      }

      // Update the UI immediately for ONLY this tank
      setTankGroups(prevGroups => 
        prevGroups.map(group => 
          group.tank_id === tankId
            ? { 
                ...group, 
                openingStock: newOpeningStock,
                closingStock: Math.max(0, newOpeningStock - group.salesVolume)
              }
          : group
        )
      );

      // Clear the restock input
      setRestockAmounts(prev => ({
        ...prev,
        [tankId]: ''
      }));

      toast({
        title: "Success",
        description: `Successfully added ${restockAmount.toLocaleString()}L to Tank ${tankId}`,
      });
    } catch (error) {
      console.error('Error restocking:', error);
      // Revert the UI update if database save fails
      setTankGroups(prevGroups => 
        prevGroups.map(group => 
          group.tank_id === tankId
            ? { 
                ...group, 
                openingStock: currentOpeningStock,
                closingStock: Math.max(0, currentOpeningStock - group.salesVolume)
              }
          : group
        )
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update tank stock. Please try again.",
      });
    } finally {
      setRestockLoading(prev => ({ ...prev, [tankId]: false }));
    }
  };

  const fetchPreviousDayStock = async (tankId: string) => {
    try {
      // Get the pump ID for this tank
      const { data: pumpData, error: pumpError } = await supabase
        .from('pumps')
        .select('id, product_type')
        .eq('tank_id', tankId)
        .single();
      if (pumpError) throw pumpError;

      // Get today's record
      const { data: todayData, error: todayError } = await supabase
        .from('fuel_records')
        .select('opening_stock, sales_volume, meter_opening, meter_closing, closing_stock')
        .eq('station_code', stationId)
        .eq('pump_id', pumpData.id)
        .eq('record_date', date)
        .single();

      if (!todayError && todayData) {
        return {
          openingStock: todayData.opening_stock,
          salesVolume: todayData.sales_volume || 0,
          closingStock: todayData.closing_stock,
          openingMeter: todayData.meter_opening || 0,
          closingMeter: todayData.meter_closing || 0
        };
      }

      // If no record exists for today, get yesterday's closing stock and meter
      const previousDate = format(subDays(new Date(date), 1), 'yyyy-MM-dd');
      const { data: yesterdayData, error: yesterdayError } = await supabase
        .from('fuel_records')
        .select('closing_stock, meter_closing')
        .eq('station_code', stationId)
        .eq('pump_id', pumpData.id)
        .eq('record_date', previousDate)
        .single();

      if (!yesterdayError && yesterdayData) {
        return {
          openingStock: yesterdayData.closing_stock,
          salesVolume: 0,
          closingStock: yesterdayData.closing_stock,
          openingMeter: yesterdayData.meter_closing || 0,
          closingMeter: yesterdayData.meter_closing || 0
        };
      }

      // If not found, get the most recent previous record (any date before today)
      const { data: lastRecord, error: lastError } = await supabase
        .from('fuel_records')
        .select('closing_stock, meter_closing, record_date')
        .eq('station_code', stationId)
        .eq('pump_id', pumpData.id)
        .lt('record_date', date)
        .order('record_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastError) throw lastError;
      if (lastRecord) {
        return {
          openingStock: lastRecord.closing_stock || 0,
          salesVolume: 0,
          closingStock: lastRecord.closing_stock || 0,
          openingMeter: lastRecord.meter_closing || 0,
          closingMeter: lastRecord.meter_closing || 0
        };
      }

      // If no previous record exists either, return zeros
      return {
        openingStock: 0,
        salesVolume: 0,
        closingStock: 0,
        openingMeter: 0,
        closingMeter: 0
      };
    } catch (error) {
      console.error('Error fetching stock:', error);
      return {
        openingStock: 0,
        salesVolume: 0,
        closingStock: 0,
        openingMeter: 0,
        closingMeter: 0
      };
    }
  };

  const fetchTankCapacity = async (stationCode: string, productType: string) => {
    try {
      const { data, error } = await supabase
        .from('tank_capacities')
        .select('capacity')
        .eq('station_code', stationCode)
        .eq('product_type', productType)
        .single();

      if (error) throw error;
      return data?.capacity || 0;
    } catch (error) {
      console.error('Error fetching tank capacity:', error);
      return 0;
    }
  };

  const fetchPumpsAndStock = async () => {
    try {
      setLoading(true);
      const { data: pumpsData, error: pumpsError } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', stationId);

      if (pumpsError) throw pumpsError;

      // Group pumps by tank_id and calculate max capacity
      const groupedPumps: { [key: string]: Pump[] } = {};
      (pumpsData || []).forEach(pump => {
        if (!groupedPumps[pump.tank_id]) {
          groupedPumps[pump.tank_id] = [];
        }
        groupedPumps[pump.tank_id].push(pump);
      });

      const groupsPromises = Object.entries(groupedPumps).map(async ([tank_id, pumps]) => {
        const stockInfo = await fetchPreviousDayStock(tank_id);
        // Use the first pump's capacity as the tank capacity
        const tankCapacity = pumps[0]?.capacity || 33000;
        
        return {
          tank_id,
          product_type: pumps[0].product_type,
          pumps,
          maxCapacity: tankCapacity,
          ...stockInfo
        };
      });

      const groupsArray = await Promise.all(groupsPromises);
      setTankGroups(groupsArray);
    } catch (error) {
      console.error('Error fetching pumps and stock:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tank data",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTankCapacities = async () => {
    try {
      const { data, error } = await supabase
        .from('tank_capacities')
        .select('*')
        .eq('station_code', stationId);

      if (error) throw error;
      setCapacities(data || []);
    } catch (error) {
      console.error('Error loading tank capacities:', error);
    }
  };

  useEffect(() => {
    loadTankCapacities();
  }, [stationId]);

  const handleCapacitySubmit = async () => {
    if (!selectedTank || !newCapacity) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a tank and enter capacity",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update all pumps connected to this tank
      const { error } = await supabase
        .from('pumps')
        .update({ capacity: parseFloat(newCapacity) })
        .eq('tank_id', selectedTank);

      if (error) throw error;

      // Update the UI immediately
      setTankGroups(prevGroups => 
        prevGroups.map(group => 
          group.tank_id === selectedTank
            ? { ...group, maxCapacity: parseFloat(newCapacity) }
            : group
        )
      );

      // Reset form
      setNewCapacity('');
      setSelectedTank('');
      setShowCapacityDialog(false);

      toast({
        title: "Success",
        description: "Tank capacity updated successfully",
      });
    } catch (error) {
      console.error('Error updating tank capacity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update tank capacity",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excess Calculations section - only visible on the 1st of the month
  const today = new Date(date);
  const isFirstOfMonth = today.getDate() === 1;
  const [realStocks, setRealStocks] = useState<{ [tankId: string]: string }>({});
  const [excessValues, setExcessValues] = useState<{ [tankId: string]: number }>({});

  // Handler for real stock input
  const handleRealStockChange = (tankId: string, value: string, openingStock: number) => {
    setRealStocks(prev => ({ ...prev, [tankId]: value }));
    const real = parseFloat(value);
    setExcessValues(prev => ({ ...prev, [tankId]: isNaN(real) ? 0 : real - openingStock }));
  };

  const handleUpdateOpeningStock = async (tankId: string, realStock: string, product_type: string) => {
    const real = parseFloat(realStock);
    if (isNaN(real)) return;
    // Get the first pump ID for this tank
    const { data: pumpData, error: pumpError } = await supabase
      .from('pumps')
      .select('id')
      .eq('tank_id', tankId)
      .single();
    if (pumpError || !pumpData) return;
    // Update or insert today's record
    const { data: record, error: recordError } = await supabase
      .from('fuel_records')
      .select('id, sales_volume')
      .eq('station_code', stationId)
      .eq('pump_id', pumpData.id)
      .eq('record_date', date)
      .single();
    let saveError;
    if (record) {
      const { error: updateError } = await supabase
        .from('fuel_records')
        .update({
          opening_stock: real,
          closing_stock: Math.max(0, real - (record.sales_volume || 0))
        })
        .eq('id', record.id);
      saveError = updateError;
    } else {
      // Instead of creating a new record, update the last available record's closing stock only
      const { data: lastRecord, error: lastError } = await supabase
        .from('fuel_records')
        .select('id, closing_stock')
        .eq('station_code', stationId)
        .eq('pump_id', pumpData.id)
        .lt('record_date', date)
        .order('record_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update opening stock.'
        });
        return;
      }
      if (lastRecord) {
        const { error: updateLastError } = await supabase
          .from('fuel_records')
          .update({
            closing_stock: real
          })
          .eq('id', lastRecord.id);
        saveError = updateLastError;
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No previous record found to update for this pump.'
        });
        return;
      }
    }
    if (saveError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update opening stock.'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Opening stock updated from real stock.'
      });
      setTankGroups(prev => prev.map(g => g.tank_id === tankId ? { ...g, openingStock: real } : g));
    }
  };

  if (loading) {
    return <div>Loading tanks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center">
        <h2 className="text-2xl font-bold">Tank Management</h2>
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:gap-4">
          <Dialog open={showCapacityDialog} onOpenChange={setShowCapacityDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full md:w-auto">
                <Settings className="h-4 w-4 mr-2" />
                Manage Tank Capacities
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Tank Capacities</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-4">
                  {tankGroups.map((tank) => (
                    <div key={tank.tank_id} className="flex justify-between items-center">
                      <span>Tank {tank.tank_id} ({tank.product_type})</span>
                      <span>{tank.maxCapacity.toLocaleString()}L</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="tank_id">Select Tank</Label>
                    <Select
                      value={selectedTank || ''}
                      onValueChange={setSelectedTank}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tank" />
                      </SelectTrigger>
                      <SelectContent>
                        {tankGroups.map((tank) => (
                          <SelectItem key={tank.tank_id} value={tank.tank_id}>
                            Tank {tank.tank_id} ({tank.product_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (Litres)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(e.target.value)}
                      placeholder="Enter tank capacity"
                    />
                  </div>
                  <Button 
                    onClick={handleCapacitySubmit}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Capacity'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tankGroups.map((tank) => {
          const percentage = tank.maxCapacity ? (tank.closingStock / tank.maxCapacity) * 100 : 0;
          let statusColor = 'bg-blue-500';
          if (percentage <= 20) {
            statusColor = 'bg-red-500';
          } else if (percentage <= 40) {
            statusColor = 'bg-yellow-500';
          }

          return (
            <Card key={tank.tank_id} className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Tank {tank.tank_id}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Product:</span>
                      <span className="font-medium">{tank.product_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Opening Stock:</span>
                      <span className="font-medium">{tank.openingStock.toLocaleString()}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sales Volume:</span>
                      <span className="font-medium">{tank.salesVolume.toLocaleString()}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Closing Stock:</span>
                      <span className="font-medium">{tank.closingStock.toLocaleString()}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tank Capacity:</span>
                      <span className="font-medium">{tank.maxCapacity.toLocaleString()}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Connected Pumps:</span>
                      <span className="font-medium">
                        {tank.pumps.map(p => p.pump_number).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Tank Level Visualization */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tank Level</span>
                      <span className={percentage <= 20 ? 'text-red-500' : percentage <= 40 ? 'text-yellow-500' : 'text-blue-500'}>
                        {Math.round(percentage)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div
                        className={`h-2.5 rounded-full ${statusColor} transition-all duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <div className="flex items-center gap-2 w-full">
                  <Input
                    type="number"
                    placeholder="Enter amount to add"
                    value={restockAmounts[tank.tank_id] || ''}
                    onChange={(e) => handleRestockChange(tank.tank_id, e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleRestock(tank.tank_id, tank.openingStock, tank.product_type)}
                    disabled={restockLoading[tank.tank_id]}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {restockLoading[tank.tank_id] ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {isFirstOfMonth && (
        <div className="my-8 p-6 bg-blue-50 rounded-xl shadow border border-blue-200">
          <h2 className="text-xl font-bold text-blue-800 mb-4">Excess Calculations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tankGroups.map((tank) => (
              <div key={tank.tank_id} className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
                <div className="font-semibold text-gray-800 mb-2">Tank {tank.tank_id} ({tank.product_type})</div>
                <Input
                  type="number"
                  placeholder="Enter Real Stock (L)"
                  value={realStocks[tank.tank_id] || ''}
                  onChange={e => handleRealStockChange(tank.tank_id, e.target.value, tank.openingStock)}
                  className="mb-2 text-center"
                />
                <Button
                  size="sm"
                  className="mb-2"
                  onClick={() => handleUpdateOpeningStock(tank.tank_id, realStocks[tank.tank_id], tank.product_type)}
                >
                  Update as Opening Stock
                </Button>
                <div className="text-sm text-gray-600">Excess:</div>
                <div className={`text-lg font-bold ${excessValues[tank.tank_id] > 0 ? 'text-blue-600' : excessValues[tank.tank_id] < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {typeof excessValues[tank.tank_id] === 'number' && !isNaN(excessValues[tank.tank_id]) ? excessValues[tank.tank_id].toLocaleString() : '--'} L
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
