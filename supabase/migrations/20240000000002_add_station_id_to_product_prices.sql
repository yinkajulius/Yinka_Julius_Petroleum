-- Add station_id column to product_prices table
ALTER TABLE product_prices ADD COLUMN station_id TEXT REFERENCES stations(id);

-- Update existing records to set station_id to 'egbedore'
UPDATE product_prices SET station_id = 'egbedore';

-- After all existing records are updated, make station_id required
ALTER TABLE product_prices ALTER COLUMN station_id SET NOT NULL;

-- Add a composite unique constraint
ALTER TABLE product_prices 
ADD CONSTRAINT unique_product_station_date 
UNIQUE (product_type, station_id, effective_date);
