-- Create folders table for document organization
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table for document categorization
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to documents table
ALTER TABLE public.documents ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE public.documents ADD COLUMN word_count INTEGER DEFAULT 0;

-- Enable Row Level Security on new tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
CREATE POLICY "Users can view their own folders" 
ON public.folders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" 
ON public.folders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON public.folders FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON public.folders FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for categories
CREATE POLICY "Users can view their own categories" 
ON public.categories FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" 
ON public.categories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categories FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.categories FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_documents_user_folder ON public.documents(user_id, folder_id);
CREATE INDEX idx_documents_search ON public.documents USING gin(to_tsvector('english', title || ' ' || coalesce(content, '')));
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_word_count ON public.documents(word_count);
CREATE INDEX idx_folders_user_parent ON public.folders(user_id, parent_id);
CREATE INDEX idx_categories_user ON public.categories(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories for existing users
INSERT INTO public.categories (user_id, name, color, is_default, display_order)
SELECT 
  id as user_id,
  'General' as name,
  '#6B7280' as color,
  true as is_default,
  0 as display_order
FROM auth.users
WHERE id NOT IN (SELECT DISTINCT user_id FROM public.categories WHERE name = 'General');

INSERT INTO public.categories (user_id, name, color, is_default, display_order)
SELECT 
  id as user_id,
  category_name,
  category_color,
  false as is_default,
  row_number() OVER (PARTITION BY id ORDER BY category_name) as display_order
FROM auth.users
CROSS JOIN (
  VALUES 
    ('Blog', '#10B981'),
    ('Book', '#8B5CF6'),
    ('Essay', '#F59E0B'),
    ('Notes', '#EF4444'),
    ('Voice Note', '#06B6D4')
) AS default_categories(category_name, category_color)
WHERE id NOT IN (
  SELECT DISTINCT c.user_id 
  FROM public.categories c 
  WHERE c.name = default_categories.category_name
);