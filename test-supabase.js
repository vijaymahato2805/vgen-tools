require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
    console.log('🔍 Testing Supabase connection...');
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    console.log('Has Anon Key:', !!process.env.SUPABASE_ANON_KEY);
    console.log('Has Service Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Test with different clients
    const clients = [
        { name: 'Anon Client', client: createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) },
        { name: 'Service Client', client: createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) }
    ];
    
    for (const { name, client } of clients) {
        console.log(`\n📡 Testing ${name}...`);
        
        try {
            // Test basic connection with a simple query
            const { data, error } = await client
                .from('users')
                .select('count')
                .limit(1);
            
            if (error) {
                console.log(`❌ ${name} error:`, error.message);
                console.log('Error code:', error.code);
                console.log('Error details:', error.details);
                
                // If table doesn't exist, that's expected - let's try to create it
                if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    console.log(`📋 Users table doesn't exist for ${name}. This is expected for new projects.`);
                    
                    if (name === 'Service Client') {
                        console.log('🛠️  Attempting to create tables...');
                        await createTables(client);
                    }
                }
            } else {
                console.log(`✅ ${name} connection successful!`);
                console.log('Data:', data);
            }
        } catch (err) {
            console.error(`💥 ${name} connection failed:`, err.message);
            
            // Check for specific network errors
            if (err.message.includes('fetch failed')) {
                console.log('🌐 This appears to be a network connectivity issue.');
                console.log('💡 Possible solutions:');
                console.log('   - Check your internet connection');
                console.log('   - Verify Supabase URL is correct');
                console.log('   - Check if firewall is blocking the connection');
                console.log('   - Try accessing the Supabase URL in a browser');
            }
        }
    }
}

async function createTables(client) {
    console.log('🛠️  Creating database tables...');
    
    try {
        // First, let's try a simple approach - just create the tables directly
        console.log('📋 Creating users table...');
        
        // Create users table using SQL
        const { data: usersResult, error: usersError } = await client.rpc('exec_sql', {
            sql: `
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
                    preferences JSONB DEFAULT '{}',
                    subscription JSONB DEFAULT '{"plan": "free", "usageCount": 0, "monthlyLimit": 10, "resetDate": "2024-01-01T00:00:00.000Z"}',
                    is_active BOOLEAN DEFAULT true,
                    last_login TIMESTAMP WITH TIME ZONE,
                    password_reset_token VARCHAR(255),
                    password_reset_expires TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });
        
        if (usersError) {
            console.log('❌ Error creating users table:', usersError.message);
            console.log('💡 You may need to create tables manually in Supabase Dashboard');
            console.log('🔗 Go to: https://supabase.com/dashboard/project/rvqyzwgdkevuirfsozsu/editor');
        } else {
            console.log('✅ Users table created successfully!');
        }
        
        // Create content table
        console.log('📋 Creating content table...');
        const { data: contentResult, error: contentError } = await client.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS content (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    type VARCHAR(50) NOT NULL,
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
            `
        });
        
        if (contentError) {
            console.log('❌ Error creating content table:', contentError.message);
        } else {
            console.log('✅ Content table created successfully!');
        }
        
    } catch (error) {
        console.error('💥 Error in createTables:', error.message);
        console.log('\n📝 Manual Setup Instructions:');
        console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/rvqyzwgdkevuirfsozsu/editor');
        console.log('2. Click "New Table" and create the users and content tables');
        console.log('3. Or use the SQL Editor to run the CREATE TABLE statements');
    }
}

testSupabaseConnection();
