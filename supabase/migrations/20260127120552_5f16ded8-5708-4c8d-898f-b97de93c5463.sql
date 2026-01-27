-- Add category column to feature_requests
ALTER TABLE public.feature_requests 
ADD COLUMN category text;