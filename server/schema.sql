-- Supabase Database Schema for LingoLife App

-- Create words table
CREATE TABLE IF NOT EXISTS words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    term TEXT NOT NULL,
    phonetic TEXT,
    translation TEXT NOT NULL,
    part_of_speech TEXT,
    definition TEXT,
    known_count INTEGER DEFAULT 0,
    unknown_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_words_user_id ON words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_created_at ON words(created_at);

-- Enable row level security
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to only access their own data
CREATE POLICY "Users can view their own words" ON words
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR auth.email() = user_id);

CREATE POLICY "Users can insert their own words" ON words
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR auth.email() = user_id);

CREATE POLICY "Users can update their own words" ON words
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR auth.email() = user_id);

-- Create a trigger to update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_words_updated_at 
    BEFORE UPDATE ON words 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();