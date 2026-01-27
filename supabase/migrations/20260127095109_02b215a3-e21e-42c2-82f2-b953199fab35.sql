-- Add wizard tracking columns to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS wizard_step integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_finalized boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS wizard_state jsonb DEFAULT '{}'::jsonb;

-- Update existing campaigns to be finalized (backward compatibility)
UPDATE campaigns SET is_finalized = true WHERE is_finalized IS NULL OR is_finalized = false;