create table public.tank_capacities (
  id uuid default gen_random_uuid() primary key,
  station_code text references stations(id) on delete cascade,
  product_type text not null,
  capacity numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_station_product unique (station_code, product_type)
);

-- Add RLS policies
alter table public.tank_capacities enable row level security;

create policy "Users can view tank capacities for their stations"
  on public.tank_capacities for select
  using (auth.uid() in (
    select user_id from user_stations where station_code = tank_capacities.station_code
  ));

create policy "Admins can manage tank capacities"
  on public.tank_capacities for all
  using (auth.uid() in (
    select user_id from user_stations 
    where station_code = tank_capacities.station_code 
    and auth.uid() in (
      select id from profiles where role = 'admin'
    )
  ));

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger handle_tank_capacities_updated_at
  before update on public.tank_capacities
  for each row
  execute function public.handle_updated_at();

-- Insert initial tank capacities for each station
DO $$
DECLARE
    omiigbin_id text;
    egbedore_id text;
    osogbo_id text;
BEGIN
    -- Get station IDs
    SELECT id INTO omiigbin_id FROM stations WHERE name ILIKE '%omi%igbin%' LIMIT 1;
    SELECT id INTO egbedore_id FROM stations WHERE name ILIKE '%egbedore%' LIMIT 1;
    SELECT id INTO osogbo_id FROM stations WHERE name ILIKE '%osogbo%' LIMIT 1;

    -- Omiigbin Station (4 tanks)
    INSERT INTO tank_capacities (station_code, product_type, capacity) VALUES
    (omiigbin_id, 'PMS', 33000),
    (omiigbin_id, 'PMS', 33000),  -- Second PMS tank
    (omiigbin_id, 'AGO', 33000),
    (omiigbin_id, 'LPG', 33000);

    -- Egbedore Station (3 tanks)
    INSERT INTO tank_capacities (station_code, product_type, capacity) VALUES
    (egbedore_id, 'PMS', 33000),
    (egbedore_id, 'AGO', 33000),
    (egbedore_id, 'LPG', 33000);

    -- Osogbo Station (4 tanks)
    INSERT INTO tank_capacities (station_code, product_type, capacity) VALUES
    (osogbo_id, 'PMS', 33000),
    (osogbo_id, 'PMS', 33000),  -- Second PMS tank
    (osogbo_id, 'AGO', 33000),
    (osogbo_id, 'LPG', 33000);
END $$;

-- Add capacity column to pumps table
ALTER TABLE public.pumps
ADD COLUMN capacity numeric DEFAULT 33000 NOT NULL;

-- Update capacities for existing pumps
UPDATE public.pumps
SET capacity = 33000; 