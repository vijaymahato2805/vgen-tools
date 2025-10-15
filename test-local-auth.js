require('dotenv').config();
const UserLocal = require('./src/models/UserLocal');

async function testLocalAuth() {
    console.log('🧪 Testing local authentication system...');
    
    try {
        // Test 1: Create a test user
        console.log('1️⃣ Creating test user...');
        const userData = {
            email: 'test@local.com',
            password: 'testpass123',
            firstName: 'Test',
            lastName: 'User'
        };
        
        const user = await UserLocal.create(userData);
        console.log('✅ User created:', user.email, 'ID:', user.id);
        
        // Test 2: Find user by email
        console.log('2️⃣ Finding user by email...');
        const foundUser = await UserLocal.findByEmail('test@local.com');
        if (foundUser) {
            console.log('✅ User found:', foundUser.email);
        } else {
            console.log('❌ User not found');
        }
        
        // Test 3: Test password comparison
        console.log('3️⃣ Testing password comparison...');
        const passwordMatch = await foundUser.comparePassword('testpass123');
        console.log('✅ Password match:', passwordMatch);
        
        const wrongPasswordMatch = await foundUser.comparePassword('wrongpass');
        console.log('✅ Wrong password match:', wrongPasswordMatch);
        
        // Test 4: Show all users in memory
        console.log('4️⃣ All users in memory:');
        console.log('Total users:', UserLocal.users.size);
        for (const [email, user] of UserLocal.users) {
            console.log('  -', email, `(${user.first_name} ${user.last_name})`);
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
        console.error(error.stack);
    }
}

testLocalAuth();
