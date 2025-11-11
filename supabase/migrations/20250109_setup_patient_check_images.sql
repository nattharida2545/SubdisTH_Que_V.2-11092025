-- Create patient_check_images table to track uploaded images
CREATE TABLE IF NOT EXISTS patient_check_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_check_id UUID NOT NULL REFERENCES patient_check(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(patient_check_id, order_index)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_patient_check_images_patient_check_id 
ON patient_check_images(patient_check_id);

-- Add image_count column to patient_check table if it doesn't exist
ALTER TABLE patient_check 
ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0;

-- Enable RLS (Row Level Security) on patient_check_images
ALTER TABLE patient_check_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users to view images
CREATE POLICY "Authenticated users can view patient_check_images" 
ON patient_check_images 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create RLS policy for authenticated users to insert images
CREATE POLICY "Authenticated users can insert patient_check_images" 
ON patient_check_images 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policy for authenticated users to delete images
CREATE POLICY "Authenticated users can delete patient_check_images" 
ON patient_check_images 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create RLS policy for authenticated users to update images
CREATE POLICY "Authenticated users can update patient_check_images" 
ON patient_check_images 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
