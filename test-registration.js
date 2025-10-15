require('dotenv').config();

async function testRegistration() {
    console.log('🧪 Testing registration endpoint...');
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'testuser@example.com',
                password: 'testpass123',
                firstName: 'Test',
                lastName: 'User'
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Registration successful!');
            console.log('User:', data.data.user.email);
            console.log('Token received:', !!data.data.token);
            
            // Test login with the same credentials
            console.log('\n🔐 Testing login...');
            const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'testuser@example.com',
                    password: 'testpass123'
                })
            });
            
            const loginData = await loginResponse.json();
            
            if (loginResponse.ok) {
                console.log('✅ Login successful!');
                console.log('User:', loginData.data.user.email);
                console.log('Token received:', !!loginData.data.token);
            } else {
                console.log('❌ Login failed:', loginData.error);
            }
            
        } else {
            console.log('❌ Registration failed:', data.error);
            if (data.details) {
                console.log('Details:', data.details);
            }
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testRegistration();
