-- Add capacity column to pumps table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 
                  FROM information_schema.columns 
                  WHERE table_name='pumps' AND column_name='capacity') THEN
        ALTER TABLE public.pumps
        ADD COLUMN capacity numeric DEFAULT 33000 NOT NULL;
    END IF;
END $$;

-- Update existing pumps with default capacity
UPDATE public.pumps
SET capacity = 33000
WHERE capacity IS NULL; 