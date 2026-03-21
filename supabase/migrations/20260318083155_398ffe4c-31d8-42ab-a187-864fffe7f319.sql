-- Create storage bucket for tenant logos (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public-assets', 'public-assets', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload tenant logos
CREATE POLICY "Authenticated users can upload tenant logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public-assets' AND (storage.foldername(name))[1] = 'tenant-logos');

-- Allow public read access to tenant logos
CREATE POLICY "Public read access for public assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'public-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update tenant logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'public-assets' AND (storage.foldername(name))[1] = 'tenant-logos');
