require('dotenv').config();
const { supabase } = require('./src/config/supabase');

async function testUserCreation() {
    console.log('🧪 Testing user creation in Supabase...');
    
    try {
        // Test 1: Check if tables exist
        console.log('1️⃣ Checking if users table exists...');
        const { data: tableCheck, error: tableError } = await supabase
            .from('users')
            .select('count')
            .limit(1);
            
        if (tableError) {
            console.log('❌ Users table error:', tableError.message);
            console.log('💡 Make sure you ran the SQL setup in Supabase dashboard');
            return;
        } else {
            console.log('✅ Users table exists and is accessible');
        }
        
        // Test 2: Try to insert a test user
        console.log('2️⃣ Testing user insertion...');
        const testUser = {
            email: 'test@example.com',
            password_hash: 'test_hash_123',
            first_name: 'Test',
            last_name: 'User',
            is_active: true,
            subscription: {
                plan: 'free',
                usageCount: 0,
                monthlyLimit: 10,
                resetDate: new Date().toISOString()
            }
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert(testUser)
            .select()
            .single();
            
        if (insertError) {
            console.log('❌ User insertion error:', insertError.message);
            console.log('Error code:', insertError.code);
            console.log('Error details:', insertError.details);
            
            if (insertError.code === '23505') {
                console.log('💡 User already exists - this is normal for testing');
            }
        } else {
            console.log('✅ User created successfully:', insertData.email);
            
            // Clean up test user
            await supabase.from('users').delete().eq('email', 'test@example.com');
            console.log('🧹 Test user cleaned up');
        }
        
        // Test 3: Check existing users
        console.log('3️⃣ Checking existing users...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('email, first_name, last_name, created_at')
            .limit(5);
            
        if (usersError) {
            console.log('❌ Error fetching users:', usersError.message);
        } else {
            console.log('✅ Found', users.length, 'existing users');
            users.forEach(user => {
                console.log('  -', user.email, `(${user.first_name} ${user.last_name})`);
            });
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testUserCreation();
