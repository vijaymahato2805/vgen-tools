-- VGen Tools - Complete Supabase Production Setup
-- Run this in your Supabase SQL Editor

-- 1. Create users table with all required fields
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    location VARCHAR(255),
    website VARCHAR(255),
    linkedin VARCHAR(255),
    github VARCHAR(255),
    preferences JSONB DEFAULT '{"emailNotifications": true, "theme": "auto", "language": "en"}',
    subscription JSONB DEFAULT '{"plan": "free", "usageCount": 0, "monthlyLimit": 10, "resetDate": "2024-01-01T00:00:00.000Z"}',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create content table for storing generated content
CREATE TABLE IF NOT EXISTS content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('bio', 'resume', 'cover-letter', 'interview', 'flashcard', 'analyzer')),
    title VARCHAR(200) NOT NULL,
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    usage JSONB DEFAULT '{"views": 0, "downloads": 0}',
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    parent_content UUID REFERENCES content(id),
    related_content UUID[],
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
CREATE INDEX IF NOT EXISTS idx_content_is_public ON content(is_public);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- 5. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable Row Level Security (RLS) for better security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies

-- Users can only see and update their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Content policies
CREATE POLICY "Users can view own content" ON content
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view public content" ON content
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert own content" ON content
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own content" ON content
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own content" ON content
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Session policies
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sessions" ON user_sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- 9. Create a function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 10. Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON content TO authenticated;
GRANT ALL ON user_sessions TO authenticated;

-- 11. Test the setup
DO $$
BEGIN
    RAISE NOTICE 'VGen Tools database setup completed successfully!';
    RAISE NOTICE 'Tables created: users, content, user_sessions';
    RAISE NOTICE 'Indexes created for optimal performance';
    RAISE NOTICE 'Row Level Security enabled';
    RAISE NOTICE 'Triggers set up for automatic updated_at timestamps';
END $$;

-- 12. Verify tables exist
SELECT 
    'Setup verification:' as message,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users') as users_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'content') as content_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_sessions') as sessions_table;
