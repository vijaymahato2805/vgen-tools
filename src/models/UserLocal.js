const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Simple in-memory user storage for development/testing
class UserLocal {
  constructor(userData) {
    this.id = userData.id || crypto.randomUUID();
    this.email = userData.email;
    this.password_hash = userData.password_hash;
    this.first_name = userData.first_name || userData.firstName;
    this.last_name = userData.last_name || userData.lastName;
    this.bio = userData.bio || '';
    this.location = userData.location || '';
    this.website = userData.website || '';
    this.linkedin = userData.linkedin || '';
    this.github = userData.github || '';
    this.preferences = userData.preferences || {};
    this.subscription = userData.subscription || {
      plan: 'free',
      usageCount: 0,
      monthlyLimit: 10,
      resetDate: new Date().toISOString()
    };
    this.is_active = userData.is_active !== undefined ? userData.is_active : true;
    this.last_login = userData.last_login || null;
    this.password_reset_token = userData.password_reset_token || null;
    this.password_reset_expires = userData.password_reset_expires || null;
    this.created_at = userData.created_at || new Date().toISOString();
    this.updated_at = userData.updated_at || new Date().toISOString();
  }

  // Static property to store users in memory
  static users = new Map();

  // Static method to create a new user
  static async create(userData) {
    try {
      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const password_hash = await bcrypt.hash(userData.password, saltRounds);

      const user = new UserLocal({
        ...userData,
        password_hash,
        id: crypto.randomUUID()
      });

      // Store user
      UserLocal.users.set(user.email, user);
      
      console.log(`✅ User created: ${user.email}`);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Static method to find user by email
  static async findByEmail(email) {
    return UserLocal.users.get(email) || null;
  }

  // Static method to find user by ID
  static async findById(id) {
    for (const user of UserLocal.users.values()) {
      if (user.id === id) {
        return user;
      }
    }
    return null;
  }

  // Instance method to save user changes
  async save() {
    this.updated_at = new Date().toISOString();
    UserLocal.users.set(this.email, this);
    return this;
  }

  // Instance method to compare password
  async comparePassword(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password_hash);
    } catch (error) {
      console.error('Error comparing password:', error);
      return false;
    }
  }

  // Instance method to create password reset token
  createPasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.password_reset_token = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.password_reset_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return resetToken;
  }

  // Instance method to increment usage count
  async incrementUsage() {
    try {
      if (!this.subscription) {
        this.subscription = {
          plan: 'free',
          usageCount: 0,
          monthlyLimit: 10,
          resetDate: new Date().toISOString()
        };
      }
      
      this.subscription.usageCount += 1;
      return await this.save();
    } catch (error) {
      throw error;
    }
  }

  // Instance method to check if user can make more requests
  canMakeRequest() {
    try {
      if (!this.subscription) {
        return true; // Allow if no subscription data
      }

      const now = new Date();
      const resetDate = new Date(this.subscription.resetDate);

      // Reset usage count if it's a new month
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        this.subscription.usageCount = 0;
        this.subscription.resetDate = now.toISOString();
        this.save().catch(console.error);
      }

      return this.subscription.usageCount < this.subscription.monthlyLimit;
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return true; // Allow on error
    }
  }

  // Convert to plain object for JSON responses
  toJSON() {
    const { password_hash, password_reset_token, ...userData } = this;
    return {
      ...userData,
      firstName: this.first_name,
      lastName: this.last_name
    };
  }

  // Get full name (computed property)
  get fullName() {
    return `${this.first_name} ${this.last_name}`;
  }
}

module.exports = UserLocal;
