require('dotenv').config();
const https = require('https');
const { URL } = require('url');

async function checkSupabaseURL() {
    const supabaseUrl = process.env.SUPABASE_URL;
    console.log('🔍 Checking Supabase URL:', supabaseUrl);
    
    if (!supabaseUrl) {
        console.log('❌ SUPABASE_URL not found in environment variables');
        return;
    }
    
    try {
        const url = new URL(supabaseUrl);
        console.log('📋 URL Details:');
        console.log('  Protocol:', url.protocol);
        console.log('  Host:', url.host);
        console.log('  Pathname:', url.pathname);
        
        // Try to make a simple HTTP request to check connectivity
        console.log('\n🌐 Testing HTTP connectivity...');
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: '/rest/v1/',
            method: 'GET',
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            }
        };
        
        const req = https.request(options, (res) => {
            console.log('✅ HTTP Response Status:', res.statusCode);
            console.log('📋 Response Headers:', res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('📄 Response Body:', data.substring(0, 200) + '...');
                
                if (res.statusCode === 200) {
                    console.log('🎉 Supabase is reachable!');
                } else if (res.statusCode === 401) {
                    console.log('🔑 Authentication issue - check your API keys');
                } else {
                    console.log('⚠️  Unexpected response code');
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ HTTP Request failed:', error.message);
            
            if (error.code === 'ENOTFOUND') {
                console.log('🌐 DNS resolution failed - check your internet connection');
            } else if (error.code === 'ECONNREFUSED') {
                console.log('🚫 Connection refused - server may be down');
            } else if (error.code === 'ETIMEDOUT') {
                console.log('⏰ Connection timed out - network issue');
            }
        });
        
        req.setTimeout(10000, () => {
            console.log('⏰ Request timed out after 10 seconds');
            req.destroy();
        });
        
        req.end();
        
    } catch (error) {
        console.error('💥 URL parsing error:', error.message);
    }
}

// Also check environment variables
console.log('🔧 Environment Variables Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

checkSupabaseURL();
