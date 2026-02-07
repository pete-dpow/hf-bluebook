/*
  # Enable pgvector and Create Excel File RAG Schema

  1. Extensions
    - Enable vector extension for pgvector support

  2. New Tables
    - `excel_files`
      - `id` (uuid, primary key)
      - `filename` (text)
      - `source_type` (text) - 'upload' or 'microsoft365'
      - `file_hash` (text) - for detecting changes
      - `total_rows` (integer)
      - `total_columns` (integer)
      - `column_headers` (jsonb) - array of column names
      - `microsoft_file_id` (text, nullable) - OneDrive/SharePoint file ID
      - `last_synced_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `excel_rows`
      - `id` (uuid, primary key)
      - `file_id` (uuid, foreign key to excel_files)
      - `row_index` (integer) - original row number in Excel
      - `row_data` (jsonb) - full row data as key-value pairs
      - `row_text` (text) - concatenated text for embedding
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `embeddings`
      - `id` (uuid, primary key)
      - `row_id` (uuid, foreign key to excel_rows)
      - `embedding` (vector(1536)) - OpenAI text-embedding-3-small dimension
      - `embedding_text` (text) - text that was embedded
      - `created_at` (timestamptz)

    - `chat_sessions`
      - `id` (uuid, primary key)
      - `file_id` (uuid, foreign key to excel_files, nullable)
      - `session_token` (text, unique)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `chat_messages`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to chat_sessions)
      - `role` (text) - 'user' or 'assistant'
      - `content` (text)
      - `retrieved_rows` (jsonb, nullable) - rows used for context
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on all tables
    - Add policies for public access (can be restricted later with auth)

  4. Indexes
    - HNSW index on embeddings for fast vector similarity search
    - Indexes on foreign keys and frequently queried fields
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create excel_files table
CREATE TABLE IF NOT EXISTS excel_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  source_type text NOT NULL DEFAULT 'upload',
  file_hash text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  total_columns integer NOT NULL DEFAULT 0,
  column_headers jsonb DEFAULT '[]'::jsonb,
  microsoft_file_id text,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create excel_rows table
CREATE TABLE IF NOT EXISTS excel_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES excel_files(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  row_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create embeddings table with vector column
CREATE TABLE IF NOT EXISTS embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES excel_rows(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  embedding_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES excel_files(id) ON DELETE SET NULL,
  session_token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  retrieved_rows jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE excel_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (public access for now)
CREATE POLICY "Allow public read access to excel_files"
  ON excel_files FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to excel_files"
  ON excel_files FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to excel_files"
  ON excel_files FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from excel_files"
  ON excel_files FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to excel_rows"
  ON excel_rows FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to excel_rows"
  ON excel_rows FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to excel_rows"
  ON excel_rows FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from excel_rows"
  ON excel_rows FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to embeddings"
  ON embeddings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to embeddings"
  ON embeddings FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public delete from embeddings"
  ON embeddings FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to chat_sessions"
  ON chat_sessions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to chat_sessions"
  ON chat_sessions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to chat_sessions"
  ON chat_sessions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to chat_messages"
  ON chat_messages FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to chat_messages"
  ON chat_messages FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_excel_rows_file_id ON excel_rows(file_id);
CREATE INDEX IF NOT EXISTS idx_excel_rows_row_index ON excel_rows(row_index);
CREATE INDEX IF NOT EXISTS idx_embeddings_row_id ON embeddings(row_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_token ON chat_sessions(session_token);

-- Create HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
  ON embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
