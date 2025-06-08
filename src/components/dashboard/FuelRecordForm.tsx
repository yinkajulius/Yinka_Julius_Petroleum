import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Pump {
  id: string;
  pump_number: number;
  product_type: string;
  tank_id: string;
}

interface ProductPrice {
  product_type: string;
  price_per_litre: number;
}

interface FuelRecordFormProps {
  stationId: string;
  date: string;
}

const FuelRecordForm = ({ stationId, date }: FuelRecordFormProps) => {
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [selectedPump, setSelectedPump] = useState<string>('');
  const [meterOpening, setMeterOpening] = useState('');
  const [meterClosing, setMeterClosing] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingPumpSelection, setPendingPumpSelection] = useState<string | null>(null);

  useEffect(() => {
    loadPumps();
    loadPrices();
    loadSavedRecords();
    initializeStockData();
  }, [stationId, date]);

  useEffect(() => {
    console.log('savedRecords updated:', savedRecords);
  }, [savedRecords]);

  const loadPumps = async () => {
    try {
      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', stationId)
        .order('pump_number');

      if (error) throw error;
      setPumps(data || []);
    } catch (error) {
      console.error('Error loading pumps:', error);
    }
  };

  const loadPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('product_prices')
        .select('product_type, price_per_litre')
        .order('effective_date', { ascending: false });

      if (error) throw error;
      
      // Get latest price for each product
      const latestPrices: ProductPrice[] = [];
      const seenProducts = new Set();
      
      data?.forEach(price => {
        if (!seenProducts.has(price.product_type)) {
          latestPrices.push(price);
          seenProducts.add(price.product_type);
        }
      });
      
      setPrices(latestPrices);
    } catch (error) {
      console.error('Error loading prices:', error);
    }
  };

  const sortByPumpNumber = (a: any, b: any) => {
    const pumpNumberA = a.pumps?.pump_number || 0;
    const pumpNumberB = b.pumps?.pump_number || 0;
    return pumpNumberA - pumpNumberB;
  };

  const loadSavedRecords = async () => {
    try {
      // First get the fuel records
      const { data: fuelRecords, error: fuelError } = await supabase
        .from('fuel_records')
        .select('*')
        .eq('station_code', stationId)
        .eq('record_date', date)
        .order('created_at', { ascending: false });

      if (fuelError) throw fuelError;

      // Then get the pump details for each record
      const recordsWithPumpDetails = await Promise.all(
        (fuelRecords || []).map(async (record) => {
          const { data: pumpData } = await supabase
            .from('pumps')
            .select('pump_number, product_type')
            .eq('id', record.pump_id)
            .single();

          return {
            ...record,
            pumps: pumpData
          };
        })
      );

      // Sort records by pump number before setting state
      const sortedRecords = recordsWithPumpDetails.sort(sortByPumpNumber);
      setSavedRecords(sortedRecords);
    } catch (error) {
      console.error('Error loading saved records:', error);
    }
  };

  const loadPreviousDayClosing = async (pumpId: string) => {
    try {
      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 1);
      const formattedPreviousDate = format(previousDate, 'yyyy-MM-dd');

      // Modified query to get all records for the pump from previous day
      const { data, error } = await supabase
        .from('fuel_records')
        .select('meter_closing')
        .eq('station_code', stationId)
        .eq('pump_id', pumpId)
        .eq('record_date', formattedPreviousDate)
        .order('meter_closing', { ascending: false }) // Order by meter_closing in descending order
        .limit(1); // Get only the highest value

      if (error) {
        console.error('Error loading previous day closing:', error);
        return null;
      }

      // Return the highest meter_closing value or null if no records exist
      return data && data.length > 0 ? data[0].meter_closing : null;
    } catch (error) {
      console.error('Error in loadPreviousDayClosing:', error);
      return null;
    }
  };

  const calculateSalesVolume = () => {
    const opening = parseFloat(meterOpening) || 0;
    const closing = parseFloat(meterClosing) || 0;
    return Math.max(0, closing - opening);
  };

  const getProductPrice = (productType: string) => {
    const price = prices.find(p => p.product_type === productType);
    return price?.price_per_litre || 0;
  };

  const handlePumpSelection = async (pumpId: string) => {
    // Find a record for this pump that passes the filter
    const filteredRecord = savedRecords.find(
      record => record.pump_id === pumpId && (record.input_mode !== 'auto' || record.sales_volume > 0)
    );
    const autoZeroRecord = savedRecords.find(
      record => record.pump_id === pumpId && record.input_mode === 'auto' && record.sales_volume === 0
    );

    if (filteredRecord) {
      setPendingPumpSelection(pumpId);
      setShowDialog(true);
      return;
    } else if (autoZeroRecord) {
      // Go straight to edit mode for the auto record with zero sales
      setSelectedPump(pumpId);
      setMeterOpening(autoZeroRecord.meter_opening.toString());
      setMeterClosing(autoZeroRecord.meter_closing.toString());
      setIsEditing(true);
      setEditingRecordId(autoZeroRecord.id);
      return;
    }
    // No record at all, proceed as normal
    setSelectedPump(pumpId);
    const previousClosing = await loadPreviousDayClosing(pumpId);
    if (previousClosing !== null) {
      setMeterOpening(previousClosing.toString());
      toast({
        title: "Info",
        description: "Meter opening has been set to previous day's closing reading.",
      });
    } else {
      setMeterOpening('');
    }
    setMeterClosing('');
    setIsEditing(false);
    setEditingRecordId(null);
  };

  const handleCreateNew = async () => {
    if (pendingPumpSelection) {
      setSelectedPump(pendingPumpSelection);
      const previousClosing = await loadPreviousDayClosing(pendingPumpSelection);
      
      if (previousClosing !== null) {
        setMeterOpening(previousClosing.toString());
        toast({
          title: "Info",
          description: "Meter opening has been set to previous day's closing reading.",
        });
      } else {
        setMeterOpening('');
      }
      
      setMeterClosing('');
      setIsEditing(false);
      setEditingRecordId(null);
    }
    setShowDialog(false);
    setPendingPumpSelection(null);
  };

  const handleUpdate = () => {
    if (pendingPumpSelection) {
      const existingRecord = savedRecords.find(record => record.pump_id === pendingPumpSelection);
      if (existingRecord) {
        setSelectedPump(pendingPumpSelection);
        setMeterOpening(existingRecord.meter_opening.toString());
        setMeterClosing(existingRecord.meter_closing.toString());
        setIsEditing(true);
        setEditingRecordId(existingRecord.id);
      }
    }
    setShowDialog(false);
    setPendingPumpSelection(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPump) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a pump",
      });
      return;
    }

    setLoading(true);

    try {
      const pump = pumps.find(p => p.id === selectedPump);
      if (!pump) throw new Error('Pump not found');

      const salesVolume = calculateSalesVolume();
      const pricePerLitre = getProductPrice(pump.product_type);
      const totalSales = salesVolume * pricePerLitre;

      // Validate meter readings
      if (parseFloat(meterClosing) < parseFloat(meterOpening)) {
        throw new Error('Closing meter reading cannot be less than opening reading');
      }

      let openingStock = 0;
      let existingRecordId = null;

      // First try to get today's record for opening stock
      const { data: todayRecord, error: todayError } = await supabase
        .from('fuel_records')
        .select('*')
        .eq('station_code', stationId)
        .eq('pump_id', selectedPump)
        .eq('record_date', date)
        .single();

      if (todayError && todayError.code !== 'PGRST116') throw todayError;

      if (todayRecord) {
        // Use today's existing opening stock
        openingStock = todayRecord.opening_stock;
        existingRecordId = todayRecord.id;
      } else {
        // If no today's record, get yesterday's closing stock
        const previousDate = new Date(date);
        previousDate.setDate(previousDate.getDate() - 1);
        const formattedPreviousDate = format(previousDate, 'yyyy-MM-dd');

        const { data: yesterdayRecord, error: yesterdayError } = await supabase
          .from('fuel_records')
          .select('closing_stock')
          .eq('station_code', stationId)
          .eq('pump_id', selectedPump)
          .eq('record_date', formattedPreviousDate)
          .single();

        if (yesterdayError && yesterdayError.code !== 'PGRST116') throw yesterdayError;

        // Use yesterday's closing stock as today's opening stock
        openingStock = yesterdayRecord?.closing_stock || 0;
      }

      // Calculate closing stock based on opening stock and sales volume
      const closingStock = Math.max(0, openingStock - salesVolume);

      // Get tomorrow's date
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = format(tomorrow, 'yyyy-MM-dd');

      const record = {
        station_code: stationId,
        pump_id: selectedPump,
        product_type: pump.product_type,
        record_date: date,
        meter_opening: parseFloat(meterOpening) || 0,
        meter_closing: parseFloat(meterClosing) || 0,
        sales_volume: salesVolume,
        price_per_litre: pricePerLitre,
        total_sales: totalSales,
        input_mode: 'manual',
        opening_stock: openingStock,
        closing_stock: closingStock
      };

      let updatedRecord;
      if (existingRecordId) {
        // Update existing record
        const { data, error } = await supabase
          .from('fuel_records')
          .update(record)
          .eq('id', existingRecordId)
          .select()
          .single();

        if (error) throw error;
        updatedRecord = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('fuel_records')
          .insert(record)
          .select()
          .single();

        if (error) throw error;
        updatedRecord = data;
      }

      // Update tomorrow's opening stock AND meter_opening
      const { data: tomorrowRecord, error: tomorrowError } = await supabase
        .from('fuel_records')
        .select('id')
        .eq('station_code', stationId)
        .eq('pump_id', selectedPump)
        .eq('record_date', tomorrowDate)
        .single();

      if (tomorrowError && tomorrowError.code !== 'PGRST116') throw tomorrowError;

      if (tomorrowRecord) {
        // Update tomorrow's opening stock AND meter_opening
        const { error: updateError } = await supabase
          .from('fuel_records')
          .update({
            opening_stock: closingStock,
            meter_opening: parseFloat(meterClosing) || 0
          })
          .eq('id', tomorrowRecord.id);
        if (updateError) throw updateError;
      } else {
        // Create tomorrow's record with opening stock AND meter_opening
        const { error: insertError } = await supabase
          .from('fuel_records')
          .insert({
            station_code: stationId,
            pump_id: selectedPump,
            product_type: pump.product_type,
            record_date: tomorrowDate,
            opening_stock: closingStock,
            meter_opening: parseFloat(meterClosing) || 0,
            meter_closing: 0,
            sales_volume: 0,
            input_mode: 'auto',
            closing_stock: closingStock,
            price_per_litre: 0,
            total_sales: 0
          });
        if (insertError) throw insertError;
      }

      // Create complete record with pump details
      const completeRecord = {
        ...updatedRecord,
        pumps: {
          pump_number: pump.pump_number,
          product_type: pump.product_type
        }
      };

      // Update the state
      setSavedRecords(prevRecords => {
        let newRecords;
        if (existingRecordId) {
          newRecords = prevRecords.map(r => 
            r.id === existingRecordId ? completeRecord : r
          );
        } else {
          newRecords = [completeRecord, ...prevRecords];
        }
        return newRecords.sort(sortByPumpNumber);
      });

      // Reset form
      setSelectedPump('');
      setMeterOpening('');
      setMeterClosing('');
      setIsEditing(false);
      setEditingRecordId(null);

      toast({
        title: "Success",
        description: existingRecordId ? "Record updated successfully" : "Record saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving fuel record:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save fuel record",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('fuel_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      setSavedRecords(prevRecords => 
        prevRecords.filter(record => record.id !== recordId)
      );

      toast({
        title: "Success",
        description: "Record deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete record",
      });
    }
  };

  const selectedPumpData = pumps.find(p => p.id === selectedPump);
  const salesVolume = calculateSalesVolume();
  const pricePerLitre = selectedPumpData ? getProductPrice(selectedPumpData.product_type) : 0;
  const totalSales = salesVolume * pricePerLitre;

  const initializeStockData = async () => {
    try {
      // Get all pumps first
      const { data: pumpsData, error: pumpsError } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', stationId);

      if (pumpsError) throw pumpsError;

      // For each pump, check and initialize stock data
      for (const pump of pumpsData || []) {
        // Check if today's record exists
        const { data: todayRecord, error: todayError } = await supabase
          .from('fuel_records')
          .select('*')
          .eq('station_code', stationId)
          .eq('pump_id', pump.id)
          .eq('record_date', date)
          .single();

        if (todayError && todayError.code !== 'PGRST116') throw todayError;

        // If no record exists for today
        if (!todayRecord) {
          // Get yesterday's closing stock
          const previousDate = new Date(date);
          previousDate.setDate(previousDate.getDate() - 1);
          const formattedPreviousDate = format(previousDate, 'yyyy-MM-dd');

          const { data: yesterdayRecord, error: yesterdayError } = await supabase
            .from('fuel_records')
            .select('closing_stock')
            .eq('station_code', stationId)
            .eq('pump_id', pump.id)
            .eq('record_date', formattedPreviousDate)
            .single();

          if (yesterdayError && yesterdayError.code !== 'PGRST116') throw yesterdayError;

          const openingStock = yesterdayRecord?.closing_stock || 0;

          // Create today's record with yesterday's closing stock as opening stock
          const { error: insertError } = await supabase
            .from('fuel_records')
            .insert({
              station_code: stationId,
              pump_id: pump.id,
              product_type: pump.product_type,
              record_date: date,
              opening_stock: openingStock,
              closing_stock: openingStock, // Initially same as opening stock
              sales_volume: 0,
              input_mode: 'auto',
              meter_opening: 0,
              meter_closing: 0,
              price_per_litre: 0,
              total_sales: 0
            });

          if (insertError) throw insertError;
        }
      }

      // Reload saved records to show the new data
      await loadSavedRecords();
    } catch (error) {
      console.error('Error initializing stock data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to initialize stock data",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Fuel Record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pump">Pump</Label>
                <Select value={selectedPump} onValueChange={handlePumpSelection} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pump" />
                  </SelectTrigger>
                  <SelectContent>
                    {pumps.map((pump) => (
                      <SelectItem key={pump.id} value={pump.id}>
                        Pump {pump.pump_number} - {pump.product_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meter-opening">Meter Opening</Label>
                <Input
                  id="meter-opening"
                  type="number"
                  step="0.01"
                  value={meterOpening}
                  onChange={(e) => setMeterOpening(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meter-closing">Meter Closing</Label>
                <Input
                  id="meter-closing"
                  type="number"
                  step="0.01"
                  value={meterClosing}
                  onChange={(e) => setMeterClosing(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {selectedPumpData && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-blue-900">Calculations</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Sales Volume:</span>
                    <span className="ml-2 font-medium">{calculateSalesVolume().toFixed(2)} L</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Price per Litre:</span>
                    <span className="ml-2 font-medium">₦{pricePerLitre.toFixed(2)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="ml-2 font-bold text-green-600">₦{totalSales.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Fuel Record'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Saved Records Card */}
      <Card>
        <CardHeader>
          <CardTitle>Records for {format(new Date(date), 'dd MMMM yyyy')}</CardTitle>
          <p className="text-sm text-gray-500">Total records: {savedRecords.filter(record => record.input_mode !== 'auto' || record.sales_volume > 0).length}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {savedRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No records for this date</p>
            ) : (
              <div className="space-y-4">
                {savedRecords
                  .filter(record => record.input_mode !== 'auto' || record.sales_volume > 0)
                  .map((record) => (
                  <div
                    key={record.id}
                    className="relative group"
                  >
                    <div className="absolute right-0 top-0 bottom-0 bg-red-500 text-white px-4 flex items-center transform translate-x-full group-hover:translate-x-0 transition-transform cursor-pointer"
                         onClick={() => handleDeleteRecord(record.id)}>
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <Card className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Pump Information</p>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Number:</span>
                                <span className="font-medium">Pump {record.pumps?.pump_number}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Product:</span>
                                <span className="font-medium">{record.pumps?.product_type}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Meter Readings</p>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Opening:</span>
                                <span className="font-medium">{record.meter_opening?.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Closing:</span>
                                <span className="font-medium">{record.meter_closing?.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Stock Information</p>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Opening:</span>
                                <span className="font-medium">{record.opening_stock?.toLocaleString()} L</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Closing:</span>
                                <span className="font-medium">{record.closing_stock?.toLocaleString()} L</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Sales Information</p>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Volume:</span>
                                <span className="font-medium">{record.sales_volume?.toLocaleString()} L</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Price/L:</span>
                                <span className="font-medium">₦{record.price_per_litre?.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-green-600">
                                <span className="text-sm">Total:</span>
                                <span className="font-bold">₦{record.total_sales?.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing Record Found</AlertDialogTitle>
            <AlertDialogDescription>
              This pump already has a record for today. Would you like to update the existing record or create a new one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDialog(false);
              setPendingPumpSelection(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdate}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Update Existing
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleCreateNew}
              className="bg-green-500 hover:bg-green-600"
            >
              Create New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FuelRecordForm;
