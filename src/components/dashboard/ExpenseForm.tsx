import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ExpenseFormProps {
  stationId: string;
  date: string;
}

const ExpenseForm = ({ stationId, date }: ExpenseFormProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedExpenses, setSavedExpenses] = useState<any[]>([]);
  const { toast } = useToast();

  const [driversName, setDriversName] = useState('');
  const [company, setCompany] = useState('Yinka Julius');
  const [product, setProduct] = useState('');
  const [litres, setLitres] = useState('');
  const [pricePerLitre, setPricePerLitre] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [attendantName, setAttendantName] = useState('');
  const [remarks, setRemarks] = useState('');

  const productTypes = ['PMS', 'AGO', 'LPG'];

  const expenseCategories = [
    'Fuel Collection',
    'Maintenance',
    'Utilities',
    'Staff Wages',
    'Fuel Purchase',
    'Office Supplies',
    'Insurance',
    'Transportation',
    'Security',
    'Other'
  ];

  useEffect(() => {
    loadSavedExpenses();
  }, [stationId, date]);

  const loadSavedExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('station_id', stationId)
        .eq('expense_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const handleProductSelection = async (selectedProduct: string) => {
    setProduct(selectedProduct);
    try {
      const { data, error } = await supabase
        .from('product_prices')
        .select('price_per_litre')
        .eq('product_type', selectedProduct)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setPricePerLitre(data.price_per_litre.toString());
    } catch (error) {
      console.error('Error loading price:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load product price",
      });
    }
  };

  const calculateAmount = () => {
    const litresNum = parseFloat(litres) || 0;
    const priceNum = parseFloat(pricePerLitre) || 0;
    return (litresNum * priceNum).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let expenseData;
      if (category === 'Fuel Collection') {
        expenseData = {
          station_id: stationId,
          expense_date: date,
          category,
          amount: parseFloat(calculateAmount()),
          description: JSON.stringify({
            driversName,
            company,
            product,
            litres: parseFloat(litres),
            pricePerLitre: parseFloat(pricePerLitre),
            ticketNumber,
            attendantName,
            remarks
          })
        };
      } else {
        expenseData = {
          station_id: stationId,
          expense_date: date,
          description: description.trim(),
          amount: parseFloat(amount),
          category: category || null
        };
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (error) throw error;

      setSavedExpenses(prev => [data, ...prev]);

      toast({
        title: "Success",
        description: "Expense recorded successfully",
      });

      if (category === 'Fuel Collection') {
        setDriversName('');
        setCompany('Yinka Julius');
        setProduct('');
        setLitres('');
        setPricePerLitre('');
        setTicketNumber('');
        setAttendantName('');
        setRemarks('');
      } else {
        setDescription('');
        setAmount('');
      }
      setCategory('');
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save expense",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      setSavedExpenses(prev => prev.filter(exp => exp.id !== expenseId));

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete expense",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Expense
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {category === 'Fuel Collection' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="drivers-name">Driver's Name</Label>
                    <Input
                      id="drivers-name"
                      value={driversName}
                      onChange={(e) => setDriversName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product">Product</Label>
                    <Select value={product} onValueChange={handleProductSelection} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="litres">Litres</Label>
                    <Input
                      id="litres"
                      type="number"
                      step="0.01"
                      value={litres}
                      onChange={(e) => setLitres(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price-per-litre">Price per Litre (₦)</Label>
                    <Input
                      id="price-per-litre"
                      type="number"
                      step="0.01"
                      value={pricePerLitre}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₦)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={calculateAmount()}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-number">Ticket Number</Label>
                    <Input
                      id="ticket-number"
                      value={ticketNumber}
                      onChange={(e) => setTicketNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="attendant-name">Attendant Name</Label>
                    <Input
                      id="attendant-name"
                      value={attendantName}
                      onChange={(e) => setAttendantName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter any remarks"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter expense description"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₦)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Expense'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses for {format(new Date(date), 'dd MMMM yyyy')}</CardTitle>
          <p className="text-sm text-gray-500">Total expenses: {savedExpenses.length}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {savedExpenses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No expenses recorded for this date</p>
            ) : (
              <div className="space-y-4">
                {savedExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="relative group"
                  >
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-red-500 text-white px-4 flex items-center transform translate-x-full group-hover:translate-x-0 transition-transform cursor-pointer"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <Card className="transform transition-transform group-hover:-translate-x-16">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Category</p>
                            <p className="font-medium">{expense.category || 'Uncategorized'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              ID: {expense.id}
                            </p>
                          </div>
                          
                          {expense.category === 'Fuel Collection' ? (
                            <>
                              <div>
                                <p className="text-sm text-gray-600">Collection Details</p>
                                {(() => {
                                  const details = JSON.parse(expense.description);
                                  return (
                                    <div className="space-y-1">
                                      <p className="text-sm">Driver: {details.driversName}</p>
                                      <p className="text-sm">Company: {details.company}</p>
                                      <p className="text-sm">{details.product}: {details.litres}L</p>
                                      <p className="text-sm">Ticket: {details.ticketNumber}</p>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Amount</p>
                                <p className="font-bold text-red-600">₦{expense.amount?.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">₦{JSON.parse(expense.description).pricePerLitre}/L</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <p className="text-sm text-gray-600">Description</p>
                                <p className="font-medium">{expense.description}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Amount</p>
                                <p className="font-bold text-red-600">₦{expense.amount?.toLocaleString()}</p>
                              </div>
                            </>
                          )}
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
    </div>
  );
};

export default ExpenseForm;
