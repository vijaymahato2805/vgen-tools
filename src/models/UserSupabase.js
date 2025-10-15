// src/models/UserSupabase.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { supabaseAdmin: supabase, TABLES, handleSupabaseError, transformRecord, transformForInsert } = require('../config/supabase');

class UserSupabase {
  constructor(data) {
    if (data) {
      Object.assign(this, data);
    }
  }

  // Static method to create a new user
  static async create(userData) {
    try {
      // Hash password before storing
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      const userRecord = transformForInsert({
        email: userData.email.toLowerCase(),
        password_hash: hashedPassword,
        first_name: userData.firstName,
        last_name: userData.lastName,
        is_active: true,
        email_verified: false,
        last_login: new Date().toISOString(),
        subscription: {
          plan: 'free',
          usageCount: 0,
          monthlyLimit: 10,
          resetDate: new Date().toISOString()
        },
        preferences: {
          emailNotifications: true,
          theme: 'auto',
          language: 'en'
        }
      });

      const { data, error } = await supabase
        .from(TABLES.USERS)
        .insert(userRecord)
        .select()
        .single();

      handleSupabaseError(error);

      const user = new UserSupabase(transformRecord(data));
      user.id = data.id; // Ensure ID is set
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Static method to find user by ID
  static async findById(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();

      handleSupabaseError(error);

      return data ? new UserSupabase(transformRecord(data)) : null;
    } catch (error) {
      throw error;
    }
  }

  // Static method to find user by email
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      handleSupabaseError(error);

      return data ? new UserSupabase(transformRecord(data)) : null;
    } catch (error) {
      throw error;
    }
  }

  // Static method to find users with filters
  static async find(filters = {}) {
    try {
      let query = supabase.from(TABLES.USERS).select('*');

      if (filters.passwordResetToken) {
        query = query.eq('password_reset_token', filters.passwordResetToken);
      }

      const { data, error } = await query;

      handleSupabaseError(error);

      return data ? data.map(record => new UserSupabase(transformRecord(record))) : [];
    } catch (error) {
      throw error;
    }
  }

  // Instance method to save (update) user
  async save() {
    try {
      const updateData = transformForInsert({
        email: this.email,
        password_hash: this.password_hash,
        first_name: this.first_name,
        last_name: this.last_name,
        is_active: this.is_active,
        email_verified: this.email_verified,
        last_login: this.last_login,
        password_reset_token: this.password_reset_token,
        password_reset_expires: this.password_reset_expires,
        subscription: this.subscription,
        preferences: this.preferences,
        updated_at: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update(updateData)
        .eq('id', this.id)
        .select()
        .single();

      handleSupabaseError(error);

      Object.assign(this, transformRecord(data));
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Instance method to compare password
  async comparePassword(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password_hash);
    } catch (error) {
      throw error;
    }
  }

  // Instance method to create password reset token
  createPasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return resetToken;
  }

  // Get full name (computed property)
  get fullName() {
    return `${this.first_name} ${this.last_name}`;
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
    const { password_hash, passwordResetToken, ...userData } = this;
    return userData;
  }
}

module.exports = UserSupabase;
