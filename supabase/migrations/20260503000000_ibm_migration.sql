-- IBM Cloud Migration: Complete Database Schema
-- This migration creates all tables needed for the IBM Cloud setup
-- Run this on IBM Databases for PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Stores user information including admin and regular users
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT, -- Only for admin user
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- ============================================================================
-- SESSIONS TABLE
-- Stores active user sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- OTP_CODES TABLE
-- Stores one-time passwords for user authentication
-- ============================================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

-- ============================================================================
-- PAPERS TABLE
-- Stores research paper metadata
-- PDF files are stored in IBM Cloud Object Storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT[],
  publication_date DATE,
  journal TEXT,
  doi TEXT,
  abstract TEXT,
  keywords TEXT[],
  
  -- IBM watsonx.ai analysis fields (Task 1)
  relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
  research_alignment TEXT,
  key_findings TEXT[],
  methodology_summary TEXT,
  limitations TEXT[],
  future_directions TEXT[],
  
  -- Custom tags
  custom_tags TEXT[],
  
  -- IBM COS file reference
  cos_object_key TEXT NOT NULL, -- Format: userId/paperId.pdf
  cos_bucket TEXT NOT NULL,
  
  -- Metadata
  file_size BIGINT,
  page_count INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_papers_user_id ON papers(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_title ON papers(title);
CREATE INDEX IF NOT EXISTS idx_papers_keywords ON papers USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_papers_custom_tags ON papers USING GIN(custom_tags);
CREATE INDEX IF NOT EXISTS idx_papers_relevance_score ON papers(relevance_score);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at DESC);

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- Stores chat history for "Talk with Albert" (Task 3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Context tracking
  paper_ids UUID[], -- Papers referenced in this message
  chunk_count INTEGER, -- Number of chunks used for context
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_paper_ids ON chat_messages USING GIN(paper_ids);

-- ============================================================================
-- PAPER_CHUNKS TABLE
-- Stores extracted text chunks from PDFs for RAG
-- ============================================================================
CREATE TABLE IF NOT EXISTS paper_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(paper_id, chunk_index)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_paper_chunks_paper_id ON paper_chunks(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_chunks_chunk_index ON paper_chunks(chunk_index);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for papers table
DROP TRIGGER IF EXISTS update_papers_updated_at ON papers;
CREATE TRIGGER update_papers_updated_at
  BEFORE UPDATE ON papers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS for multi-tenant security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_chunks ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  USING (id = current_setting('app.user_id', true)::UUID);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (id = current_setting('app.user_id', true)::UUID);

-- Sessions: Users can only see their own sessions
CREATE POLICY sessions_select_own ON sessions
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::UUID);

CREATE POLICY sessions_delete_own ON sessions
  FOR DELETE
  USING (user_id = current_setting('app.user_id', true)::UUID);

-- Papers: Users can only see their own papers
CREATE POLICY papers_select_own ON papers
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::UUID);

CREATE POLICY papers_insert_own ON papers
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true)::UUID);

CREATE POLICY papers_update_own ON papers
  FOR UPDATE
  USING (user_id = current_setting('app.user_id', true)::UUID);

CREATE POLICY papers_delete_own ON papers
  FOR DELETE
  USING (user_id = current_setting('app.user_id', true)::UUID);

-- Chat messages: Users can only see their own messages
CREATE POLICY chat_messages_select_own ON chat_messages
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::UUID);

CREATE POLICY chat_messages_insert_own ON chat_messages
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true)::UUID);

-- Paper chunks: Users can only see chunks from their own papers
CREATE POLICY paper_chunks_select_own ON paper_chunks
  FOR SELECT
  USING (
    paper_id IN (
      SELECT id FROM papers WHERE user_id = current_setting('app.user_id', true)::UUID
    )
  );

CREATE POLICY paper_chunks_insert_own ON paper_chunks
  FOR INSERT
  WITH CHECK (
    paper_id IN (
      SELECT id FROM papers WHERE user_id = current_setting('app.user_id', true)::UUID
    )
  );

CREATE POLICY paper_chunks_delete_own ON paper_chunks
  FOR DELETE
  USING (
    paper_id IN (
      SELECT id FROM papers WHERE user_id = current_setting('app.user_id', true)::UUID
    )
  );

-- ============================================================================
-- INITIAL DATA
-- Note: Admin password should be set via the initializeAdmin function
-- ============================================================================

-- Create admin user (password will be set separately)
INSERT INTO profiles (email, full_name, is_admin)
VALUES ('admin@albert.com', 'Admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles including admin and regular users';
COMMENT ON TABLE sessions IS 'Active user sessions with expiration';
COMMENT ON TABLE otp_codes IS 'One-time passwords for user authentication';
COMMENT ON TABLE papers IS 'Research paper metadata with IBM watsonx.ai analysis';
COMMENT ON TABLE chat_messages IS 'Chat history for Talk with Albert assistant';
COMMENT ON TABLE paper_chunks IS 'Extracted text chunks from PDFs for RAG';

COMMENT ON COLUMN papers.relevance_score IS 'IBM watsonx.ai relevance score (0-100)';
COMMENT ON COLUMN papers.research_alignment IS 'How paper aligns with user research';
COMMENT ON COLUMN papers.key_findings IS 'Main findings extracted by watsonx.ai';
COMMENT ON COLUMN papers.methodology_summary IS 'Research methodology summary';
COMMENT ON COLUMN papers.limitations IS 'Study limitations identified';
COMMENT ON COLUMN papers.future_directions IS 'Future research directions';
COMMENT ON COLUMN papers.cos_object_key IS 'IBM COS object key (userId/paperId.pdf)';

-- Made with Bob
