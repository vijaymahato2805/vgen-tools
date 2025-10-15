const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client for public operations
const supabase = createClient(supabaseUrl, supabaseKey);

// Create Supabase admin client for server-side operations (if service key is available)
let supabaseAdmin = null;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Database table names (adjust these based on your Supabase table names)
const TABLES = {
  USERS: 'users',
  CONTENT: 'content',
  USER_SESSIONS: 'user_sessions'
};

// Helper function to handle Supabase errors
const handleSupabaseError = (error) => {
  if (error) {
    console.error('Supabase error:', error);
    throw new Error(error.message || 'Database operation failed');
  }
};

// Helper function to transform database records to match expected format
const transformRecord = (record) => {
  if (!record) return null;

  // Convert snake_case to camelCase for consistency with existing code
  const transformed = {};
  Object.keys(record).forEach(key => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    transformed[camelKey] = record[key];
  });

  return transformed;
};

// Helper function to transform records for insertion (camelCase to snake_case)
const transformForInsert = (data) => {
  if (!data || typeof data !== 'object') return data;

  const transformed = {};
  Object.keys(data).forEach(key => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    transformed[snakeKey] = data[key];
  });

  return transformed;
};

module.exports = {
  supabase,
  supabaseAdmin,
  TABLES,
  handleSupabaseError,
  transformRecord,
  transformForInsert
};

// Test connection and export appropriate client
async function testConnection() {
  try {
    const client = supabaseAdmin || supabase;
    const { error } = await client.from('users').select('count').limit(1);
    
    if (error && error.message.includes('fetch failed')) {
      console.log('⚠️  Supabase connection failed - using offline mode');
      return false;
    }
    
    console.log('✅ Using Supabase Admin Client');
    return true;
  } catch (err) {
    console.log('⚠️  Supabase connection failed - using offline mode');
    return false;
  }
}

// Export the appropriate client
if (supabaseAdmin) {
  module.exports.supabase = supabaseAdmin;
  module.exports.isOnline = testConnection();
} else {
  console.log('⚠️  Using Supabase Anon Client (Admin key not available)');
  module.exports.supabase = supabase;
  module.exports.isOnline = false;
}