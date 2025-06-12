import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Fuel, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Helper function to round monetary values to nearest 10
const roundToTen = (num: number) => Math.round(num / 10) * 10;

interface DailySummaryProps {
  stationId: string;
  date: string;
}

interface SalesData {
  product_type: string;
  total_sales: number;
  total_volume: number;
  price_per_litre: number;
}

interface ExpenseData {
  total_expenses: number;
}

interface DetailedExpenseData {
  category: string;
  amount: number;
  description?: string;
}

interface TrendData {
  date: string;
  [key: string]: string | number; // For dynamic product types
}

interface NetSalesRecord {
  record_date: string;
  total_sales: number;
  total_expenses: number;
  net_sales: number;
}

interface FuelRecord {
  record_date: string;
  total_sales: number;
}

interface ExpenseRecord {
  expense_date: string;
  amount: number;
}

interface TankLevel {
  product_type: string;
  current_volume: number;
  max_capacity: number;
  last_updated: string;
}

const DailySummary = ({ stationId, date }: DailySummaryProps) => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<'day' | 'month'>('day');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [detailedExpenses, setDetailedExpenses] = useState<DetailedExpenseData[]>([]);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [netSalesRecords, setNetSalesRecords] = useState<NetSalesRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreRecords, setHasMoreRecords] = useState(true);
  const [tankLevels, setTankLevels] = useState<TankLevel[]>([]);

  const loadSummaryData = async () => {
    setLoading(true);
    try {
      // Load sales data with price per litre
      const { data: salesResult, error: salesError } = await supabase
        .from('fuel_records')
        .select('product_type, total_sales, sales_volume, price_per_litre')
        .eq('station_code', stationId)
        .eq('record_date', date);

      if (salesError) throw salesError;

      // Aggregate sales by product type - round only monetary values
      const aggregatedSales = salesResult?.reduce((acc: any[], record) => {
        const existing = acc.find(item => item.product_type === record.product_type);
        if (existing) {
          existing.total_sales = roundToTen(existing.total_sales + (record.total_sales || 0));
          existing.total_volume += record.sales_volume || 0; // Keep exact volume
          existing.price_per_litre = roundToTen(record.price_per_litre || 0);
        } else {
          acc.push({
            product_type: record.product_type,
            total_sales: roundToTen(record.total_sales || 0),
            total_volume: record.sales_volume || 0, // Keep exact volume
            price_per_litre: roundToTen(record.price_per_litre || 0)
          });
        }
        return acc;
      }, []) || [];

      setSalesData(aggregatedSales);

      // Load and round expense data
      const { data: expenseResult, error: expenseError } = await supabase
        .from('expenses')
        .select('category, amount, description')
        .eq('station_id', stationId)
        .eq('expense_date', date);

      if (expenseError) throw expenseError;

      const roundedExpenses = expenseResult?.map(expense => ({
        ...expense,
        amount: roundToTen(expense.amount)
      })) || [];

      setDetailedExpenses(roundedExpenses);
      const totalExpenses = roundToTen(roundedExpenses.reduce((sum, expense) => sum + expense.amount, 0));
      setExpenseData([{ total_expenses: totalExpenses }]);
    } catch (error) {
      console.error('Error loading summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = salesData.reduce((sum, item) => sum + item.total_sales, 0);
  const totalExpenses = expenseData[0]?.total_expenses || 0;
  const netSales = totalSales - totalExpenses;

  const loadTrendData = async () => {
    try {
      setChartLoading(true);
      let startDate, endDate;
      
      if (trendPeriod === 'day') {
        startDate = startOfMonth(new Date(selectedMonth));
        endDate = endOfMonth(new Date(selectedMonth));
      } else {
        // Monthly view uses full year
        startDate = startOfYear(new Date(selectedYear));
        endDate = endOfYear(new Date(selectedYear));
      }

      console.log('Date Range:', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        period: trendPeriod
      });

      // Fetch all fuel records within the selected period
      const { data: records, error } = await supabase
        .from('fuel_records')
        .select('record_date, product_type, sales_volume')
        .eq('station_code', stationId)
        .gte('record_date', format(startDate, 'yyyy-MM-dd'))
        .lte('record_date', format(endDate, 'yyyy-MM-dd'))
        .order('record_date', { ascending: true });

      if (error) throw error;

      console.log('Fetched Records:', records?.length);

      // Initialize data structure based on period
      let groupedData: { [key: string]: any } = {};

      if (trendPeriod === 'day') {
        // Create entries for each day of the month
        eachDayOfInterval({ start: startDate, end: endDate }).forEach(date => {
          const dateKey = format(date, 'yyyy-MM-dd');
          groupedData[dateKey] = {
            date: format(date, 'MMM dd'),
            PMS: 0,
            AGO: 0,
            LPG: 0
          };
        });
      } else {
        // Create entries for each month of the year
        eachMonthOfInterval({ start: startDate, end: endDate }).forEach(date => {
          const monthKey = format(date, 'yyyy-MM');
          groupedData[monthKey] = {
            date: format(date, 'MMM'),
            PMS: 0,
            AGO: 0,
            LPG: 0,
            sortKey: monthKey // Add a sort key for proper ordering
          };
        });
      }

      console.log('Initial Grouped Data:', groupedData);

      // Aggregate the data - keep volumes exact
      records?.forEach(record => {
        const recordDate = new Date(record.record_date);
        let periodKey;

        if (trendPeriod === 'day') {
          periodKey = format(recordDate, 'yyyy-MM-dd');
        } else {
          periodKey = format(recordDate, 'yyyy-MM');
        }

        if (groupedData[periodKey]) {
          groupedData[periodKey][record.product_type] = 
            (groupedData[periodKey][record.product_type] || 0) + (record.sales_volume || 0);
        }
      });

      console.log('Aggregated Data:', groupedData);

      // Convert to array and sort by date
      const trendingData = Object.values(groupedData)
        .sort((a: any, b: any) => {
          if (trendPeriod === 'day') {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          } else {
            // Use the sortKey for monthly data
            return a.sortKey.localeCompare(b.sortKey);
          }
        });

      console.log('Final Trend Data:', trendingData);

      setTrendData(trendingData);
    } catch (error) {
      console.error('Error loading trend data:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const loadNetSalesRecords = async (page: number) => {
    try {
      // Get distinct dates with proper pagination
      const { data: uniqueDatesResult, error: uniqueDatesError } = await supabase
        .from('fuel_records')
        .select('record_date')
        .eq('station_code', stationId)
        .order('record_date', { ascending: false });

      if (uniqueDatesError) throw uniqueDatesError;

      // Get unique dates and handle pagination
      const allDates = [...new Set(uniqueDatesResult?.map(record => record.record_date) || [])];
      const startIndex = page * 10;
      const endIndex = startIndex + 10;
      const dates = allDates.slice(startIndex, endIndex);

      if (dates.length === 0) {
        setNetSalesRecords([]);
        setHasMoreRecords(false);
        return;
      }

      // Then fetch total sales for these dates
      const { data: salesData, error: salesError } = await supabase
        .from('fuel_records')
        .select('record_date, total_sales')
        .eq('station_code', stationId)
        .in('record_date', dates);

      if (salesError) throw salesError;

      // And fetch expenses for these dates
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('expense_date, amount')
        .eq('station_id', stationId)
        .in('expense_date', dates);

      if (expensesError) throw expensesError;

      // Aggregate the data manually and round to nearest 10
      const combinedData: NetSalesRecord[] = dates.map(date => {
        const dateSales = roundToTen((salesData || [])
          .filter(sale => sale.record_date === date)
          .reduce((sum, sale) => sum + (sale.total_sales || 0), 0));

        const dateExpenses = roundToTen((expensesData || [])
          .filter(expense => expense.expense_date === date)
          .reduce((sum, expense) => sum + (expense.amount || 0), 0));

        return {
          record_date: date,
          total_sales: dateSales,
          total_expenses: dateExpenses,
          net_sales: roundToTen(dateSales - dateExpenses)
        };
      });

      setNetSalesRecords(combinedData);
      // Check if there are more records
      setHasMoreRecords(endIndex < allDates.length);

      console.log('Debug Info:', {
        totalDates: allDates.length,
        currentPageDates: dates.length,
        hasMore: endIndex < allDates.length,
        startIndex,
        endIndex
      });
    } catch (error) {
      console.error('Error loading net sales records:', error);
    }
  };

  const loadTankLevels = async () => {
    try {
      // First get the tank capacities
      const { data: tankData, error: tankError } = await supabase
        .from('tank_capacities')
        .select('*')
        .eq('station_code', stationId);

      if (tankError) throw tankError;

      // Get the latest fuel records for current volumes
      const { data: latestRecords, error: recordsError } = await supabase
        .from('fuel_records')
        .select('*')
        .eq('station_code', stationId)
        .order('record_date', { ascending: false })
        .limit(3);

      if (recordsError) throw recordsError;

      // Combine the data - keep volumes exact
      const levels = tankData?.map(tank => {
        const latestRecord = latestRecords?.find(record => 
          record.product_type === tank.product_type
        );

        return {
          product_type: tank.product_type,
          current_volume: latestRecord?.closing_stock || 0, // Keep exact volume
          max_capacity: tank.capacity, // Keep exact capacity
          last_updated: latestRecord?.record_date || ''
        };
      }) || [];

      setTankLevels(levels);
    } catch (error) {
      console.error('Error loading tank levels:', error);
    }
  };

  // Load summary data only when necessary
  useEffect(() => {
    loadSummaryData();
  }, [stationId, date]);

  // Load trend data when date selection changes
  useEffect(() => {
    loadTrendData();
  }, [stationId, selectedMonth, selectedYear, trendPeriod]);

  useEffect(() => {
    loadNetSalesRecords(currentPage);
  }, [currentPage, stationId]);

  useEffect(() => {
    loadTankLevels();
  }, [stationId]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Detailed Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Sales Summary Card */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Sales Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Volume (L)</th>
                    <th className="text-right py-2">Price/L (₦)</th>
                    <th className="text-right py-2">Total (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{item.product_type}</td>
                      <td className="text-right">{item.total_volume.toLocaleString()}</td>
                      <td className="text-right">{item.price_per_litre?.toLocaleString()}</td>
                      <td className="text-right">{item.total_sales.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td colSpan={3} className="py-2 pl-2">Grand Total</td>
                    <td className="text-right py-2 pr-2">₦{totalSales.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Summary Card */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Expenses Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-4">
              <table className="w-full">                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Expense Type</th>
                    <th className="text-right py-2">Amount (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedExpenses.map((expense, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{expense.category}</td>
                      <td className="text-right">{expense.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="py-2 pl-2">Total Expenses</td>
                    <td className="text-right py-2 pr-2">₦{totalExpenses.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">₦{totalSales.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">₦{totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Sales</p>
                <p className={`text-2xl font-bold ${netSales >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₦{netSales.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Time Period Selection */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Select Time Period</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trendPeriod === 'day' ? (
                <>
                  <div>
                    <Label htmlFor="year" className="text-sm font-medium text-gray-700 mb-2 block">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={format(new Date(selectedMonth), 'yyyy')}
                      onChange={(e) => {
                        const newYear = e.target.value;
                        const currentMonth = format(new Date(selectedMonth), 'MM');
                        setSelectedMonth(`${newYear}-${currentMonth}`);
                      }}
                      min="2000"
                      max="2099"
                      className="w-full h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="month" className="text-sm font-medium text-gray-700 mb-2 block">Month</Label>
                    <Select
                      value={format(new Date(selectedMonth), 'MM')}
                      onValueChange={(value) => {
                        const currentYear = format(new Date(selectedMonth), 'yyyy');
                        setSelectedMonth(`${currentYear}-${value}`);
                      }}
                    >
                      <SelectTrigger id="month" className="w-full h-10">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">January</SelectItem>
                        <SelectItem value="02">February</SelectItem>
                        <SelectItem value="03">March</SelectItem>
                        <SelectItem value="04">April</SelectItem>
                        <SelectItem value="05">May</SelectItem>
                        <SelectItem value="06">June</SelectItem>
                        <SelectItem value="07">July</SelectItem>
                        <SelectItem value="08">August</SelectItem>
                        <SelectItem value="09">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="yearOnly" className="text-sm font-medium text-gray-700 mb-2 block">Year</Label>
                  <Input
                    id="yearOnly"
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    min="2000"
                    max="2099"
                    className="w-full h-10"
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="viewType" className="text-sm font-medium text-gray-700 mb-2 block">View Type</Label>
              <Select 
                value={trendPeriod} 
                onValueChange={(value: any) => {
                  setTrendPeriod(value);
                  if (value === 'month') {
                    setSelectedYear(format(new Date(selectedMonth), 'yyyy'));
                  }
                }}
              >
                <SelectTrigger id="viewType" className="w-full h-10">
                  <SelectValue placeholder="Select view type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily View</SelectItem>
                  <SelectItem value="month">Monthly View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Combined Sales Volume Trend Chart */}
        <Card>
          <CardHeader>
          <CardTitle>
            {trendPeriod === 'day' 
              ? `Daily Sales Volume - ${format(new Date(selectedMonth), 'MMMM yyyy')}`
              : `Monthly Sales Volume - ${selectedYear}`
            }
          </CardTitle>
          </CardHeader>
          <CardContent>
          {chartLoading ? (
            <div className="h-[400px] w-full flex items-center justify-center">
              <div className="text-gray-500">Loading chart data...</div>
            </div>
          ) : (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toLocaleString()} L`, 'Volume']}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    formatter={(value) => <span style={{ color: '#666', fontSize: '14px' }}>{value}</span>}
                  />
                  <Line
                    type="linear"
                    name="PMS"
                    dataKey="PMS"
                    stroke="#ff6b6b"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#ff6b6b", strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: "#ff6b6b", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Line
                    type="linear"
                    name="AGO"
                    dataKey="AGO"
                    stroke="#4ecdc4"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#4ecdc4", strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: "#4ecdc4", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Line
                    type="linear"
                    name="LPG"
                    dataKey="LPG"
                    stroke="#ffd93d"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#ffd93d", strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: "#ffd93d", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
            </ResponsiveContainer>
            </div>
          )}
          </CardContent>
        </Card>

      {/* Net Sales Records */}
        <Card>
          <CardHeader>
          <CardTitle>Daily Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Total Sales</th>
                  <th className="text-right py-2">Total Expenses</th>
                  <th className="text-right py-2">Net Sales</th>
                </tr>
              </thead>
              <tbody>
                {netSalesRecords.map((record, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2">{format(new Date(record.record_date), 'MMM dd, yyyy')}</td>
                    <td className="text-right">₦{record.total_sales.toLocaleString()}</td>
                    <td className="text-right">₦{record.total_expenses.toLocaleString()}</td>
                    <td className={`text-right font-medium ${
                      record.net_sales >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₦{record.net_sales.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                currentPage === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage + 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!hasMoreRecords}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                !hasMoreRecords
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          </CardContent>
        </Card>
    </div>
  );
};

export default DailySummary;
