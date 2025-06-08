import React from 'react';

interface StockManagementProps {
  stationId: string;
}

interface MonthlyStock {
  id: string;
  product_type: string;
  month_year: string;
  opening_stock: number;
  actual_closing_stock: number | null;
  excess: number | null;
}

interface DailyStock {
  product_type: string;
  opening_stock: number;
  closing_stock: number;
  sales_volume: number;
}

interface TankStock {
  product_type: string;
  yesterdayClosing: number;
}

export const StockManagement = ({ stationId }: StockManagementProps): React.ReactElement => {
  return (
    <div>
      <h2>Stock Management</h2>
      <div>Station ID: {stationId}</div>
    </div>
  );
};