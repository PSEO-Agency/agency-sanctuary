-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Create RLS policies for blog images
CREATE POLICY "Users can upload blog images to their subaccount"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM subaccounts WHERE id = user_subaccount_id(auth.uid())
  )
);

CREATE POLICY "Users can view blog images from their subaccount"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'blog-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM subaccounts WHERE id = user_subaccount_id(auth.uid())
  )
);

CREATE POLICY "Agency admins can view all their subaccounts' blog images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'blog-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM subaccounts WHERE agency_id = user_agency_id(auth.uid())
  )
);

CREATE POLICY "Users can delete blog images from their subaccount"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'blog-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM subaccounts WHERE id = user_subaccount_id(auth.uid())
  )
);

CREATE POLICY "Public can view blog images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-images');