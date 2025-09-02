-- Enable real-time updates for documents table
ALTER TABLE public.documents REPLICA IDENTITY FULL;

-- Add the documents table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Create indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_documents_user_status ON documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_folder_user ON documents(folder_id, user_id);
CREATE INDEX IF NOT EXISTS idx_documents_search_title ON documents USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_documents_search_content ON documents USING GIN(to_tsvector('english', content));