-- SQL script to create the words table in Supabase

-- Create the words table
CREATE TABLE IF NOT EXISTS words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,  -- Changed to UUID to match auth.uid()
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

-- Insert sample words: "word" and "super"
-- Using a default UUID for the user_id (you would replace this with actual user IDs in production)
INSERT INTO words (user_id, term, phonetic, translation, part_of_speech, definition, known_count, unknown_count) VALUES
('12345678-1234-1234-1234-123456789012', 'word', '/wɜːrd/', '词；话语；诺言', 'noun', 'A single distinct meaningful element of speech or writing, used with others to form a sentence.', 5, 1),
('12345678-1234-1234-1234-123456789012', 'super', '/ˈsuːpər/', '超级的；极好的', 'adjective', 'Better, greater, or larger than average or standard.', 3, 0);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_words_user_id ON words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_created_at ON words(created_at);

-- Enable row level security
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to only access their own data
-- Using CAST to ensure type compatibility
CREATE POLICY "Users can view their own words" ON words
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own words" ON words
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own words" ON words
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

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