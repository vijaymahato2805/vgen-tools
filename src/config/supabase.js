const { createClient } = require('@supabase/supabase-js');
console.log('DEBUG: src/config/supabase.js started.');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('DEBUG: Supabase URL:', supabaseUrl ? 'Provided' : 'MISSING');
console.log('DEBUG: Supabase Anon Key:', supabaseKey ? 'Provided' : 'MISSING');
console.log('DEBUG: Supabase Service Role Key:', supabaseServiceKey ? 'Provided' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase environment variables. Please check your .env file.');
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client for public operations
console.log('DEBUG: Creating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('DEBUG: Supabase client created.');

// Create Supabase admin client for server-side operations (if service key is available)
let supabaseAdmin = null;
if (supabaseServiceKey) {
  console.log('DEBUG: Supabase Service Role Key found, creating Supabase Admin client...');
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('DEBUG: Supabase Admin client created.');
} else {
  console.log('DEBUG: Supabase Service Role Key NOT found. Admin client will not be used.');
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
  console.log('DEBUG: Attempting to test Supabase connection...');
  try {
    const client = supabaseAdmin || supabase;
    const { error } = await client.from('users').select('count').limit(1);
    
    if (error) {
      console.error('ERROR: Supabase connection test failed:', error.message);
      if (error.message.includes('fetch failed')) {
        console.log('⚠️  Supabase connection failed (network issue) - using offline mode');
      }
      return false;
    }
    
    console.log('✅ Supabase connection successful.');
    return true;
  } catch (err) {
    console.error('ERROR: Supabase connection test failed unexpectedly:', err.message);
    console.log('⚠️  Supabase connection failed - using offline mode');
    return false;
  }
}

// Export the appropriate client
if (supabaseAdmin) {
  console.log('DEBUG: Supabase Admin client is available. Setting as default client.');
  module.exports.supabase = supabaseAdmin;
  module.exports.isOnline = testConnection(); // This will be a Promise
} else {
  console.log('DEBUG: Supabase Admin client NOT available. Using Supabase Anon Client.');
  module.exports.supabase = supabase;
  module.exports.isOnline = Promise.resolve(false); // Ensure isOnline is a Promise
}
console.log('DEBUG: src/config/supabase.js finished initialization.');