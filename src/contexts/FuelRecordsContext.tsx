import React, { createContext, useContext, useState } from 'react';

interface FuelSales {
  [key: string]: number;
}

interface FuelRecordsContextType {
  salesVolumes: FuelSales;
  updateSalesVolume: (productType: string, volume: number) => void;
  resetSalesVolumes: () => void;
}

const FuelRecordsContext = createContext<FuelRecordsContextType | undefined>(undefined);

export const FuelRecordsProvider = ({ children }: { children: React.ReactNode }) => {
  const [salesVolumes, setSalesVolumes] = useState<FuelSales>({});

  const updateSalesVolume = (productType: string, volume: number) => {
    setSalesVolumes(prev => ({
      ...prev,
      [productType]: (prev[productType] || 0) + volume
    }));
  };

  const resetSalesVolumes = () => {
    setSalesVolumes({});
  };

  return (
    <FuelRecordsContext.Provider value={{ salesVolumes, updateSalesVolume, resetSalesVolumes }}>
      {children}
    </FuelRecordsContext.Provider>
  );
};

export const useFuelRecords = () => {
  const context = useContext(FuelRecordsContext);
  if (context === undefined) {
    throw new Error('useFuelRecords must be used within a FuelRecordsProvider');
  }
  return context;
};