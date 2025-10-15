const { supabase, TABLES, handleSupabaseError, transformRecord, transformForInsert } = require('../config/supabase');
const UserSupabase = require('./UserSupabase');

class ContentSupabase {
  constructor(data) {
    if (data) {
      Object.assign(this, data);
    }
  }

  // Static method to create new content
  static async create(contentData) {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const contentRecord = transformForInsert({
        ...contentData,
        isPublic: false,
        isTemplate: false,
        isFavorite: false,
        usage: {
          views: 0,
          downloads: 0,
          shares: 0
        },
        expiresAt: expiresAt.toISOString(),
        lastAccessed: new Date().toISOString(),
        version: 1,
        settings: {
          autoSave: true,
          notifications: true,
          sharing: false
        }
      });

      const { data, error } = await supabase
        .from(TABLES.CONTENT)
        .insert(contentRecord)
        .select()
        .single();

      handleSupabaseError(error);

      return new ContentSupabase(transformRecord(data));
    } catch (error) {
      throw error;
    }
  }

  // Static method to find content by ID
  static async findById(contentId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONTENT)
        .select('*')
        .eq('id', contentId)
        .single();

      handleSupabaseError(error);

      return data ? new ContentSupabase(transformRecord(data)) : null;
    } catch (error) {
      throw error;
    }
  }

  // Static method to find user's content by type
  static async findByUserAndType(userId, contentType, options = {}) {
    try {
      const { limit = 20, skip = 0, sort = '-createdAt' } = options;

      let query = supabase
        .from(TABLES.CONTENT)
        .select('*')
        .eq('user', userId)
        .eq('type', contentType);

      // Handle sorting (Supabase uses different syntax)
      if (sort === '-createdAt' || sort === 'createdAt') {
        query = query.order('created_at', { ascending: sort === 'createdAt' });
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (skip > 0) {
        query = query.range(skip, skip + (limit || 20) - 1);
      }

      const { data, error } = await query;

      handleSupabaseError(error);

      return data ? data.map(record => new ContentSupabase(transformRecord(record))) : [];
    } catch (error) {
      throw error;
    }
  }

  // Static method to find user's favorite content
  static async findUserFavorites(userId, options = {}) {
    try {
      const { limit = 20, skip = 0 } = options;

      let query = supabase
        .from(TABLES.CONTENT)
        .select('*')
        .eq('user', userId)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      if (skip > 0) {
        query = query.range(skip, skip + (limit || 20) - 1);
      }

      const { data, error } = await query;

      handleSupabaseError(error);

      return data ? data.map(record => new ContentSupabase(transformRecord(record))) : [];
    } catch (error) {
      throw error;
    }
  }

  // Static method to find expired content
  static async findExpired() {
    try {
      const { data, error } = await supabase
        .from(TABLES.CONTENT)
        .select('*')
        .lt('expires_at', new Date().toISOString());

      handleSupabaseError(error);

      return data ? data.map(record => new ContentSupabase(transformRecord(record))) : [];
    } catch (error) {
      throw error;
    }
  }

  // Static method to get user content statistics
  static async getUserStats(userId) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_content_stats', { user_id: userId });

      handleSupabaseError(error);

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Static method to search content by tags
  static async findByTags(userId, tags, options = {}) {
    try {
      const { limit = 20 } = options;

      const { data, error } = await supabase
        .from(TABLES.CONTENT)
        .select('*')
        .eq('user', userId)
        .overlaps('tags', tags)
        .order('created_at', { ascending: false })
        .limit(limit);

      handleSupabaseError(error);

      return data ? data.map(record => new ContentSupabase(transformRecord(record))) : [];
    } catch (error) {
      throw error;
    }
  }

  // Instance method to save (update) content
  async save() {
    try {
      const updateData = transformForInsert(this);

      const { data, error } = await supabase
        .from(TABLES.CONTENT)
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

  // Instance method to update access time
  async updateAccessTime() {
    try {
      this.lastAccessed = new Date().toISOString();

      const { error } = await supabase
        .from(TABLES.CONTENT)
        .update({
          last_accessed: this.lastAccessed,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      handleSupabaseError(error);

      return this;
    } catch (error) {
      throw error;
    }
  }

  // Instance method to increment views
  async incrementViews() {
    try {
      this.usage.views += 1;

      const { error } = await supabase
        .from(TABLES.CONTENT)
        .update({
          usage: this.usage,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      handleSupabaseError(error);

      return this;
    } catch (error) {
      throw error;
    }
  }

  // Instance method to increment downloads
  async incrementDownloads() {
    try {
      this.usage.downloads += 1;

      const { error } = await supabase
        .from(TABLES.CONTENT)
        .update({
          usage: this.usage,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      handleSupabaseError(error);

      return this;
    } catch (error) {
      throw error;
    }
  }

  // Instance method to create a new version
  async createVersion(newContent, changes = {}) {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const versionRecord = transformForInsert({
        user: this.user,
        type: this.type,
        title: `${this.title} (v${this.version + 1})`,
        content: newContent,
        metadata: { ...this.metadata, ...changes },
        tags: this.tags,
        parentContent: this.id,
        version: this.version + 1,
        isPublic: false,
        isTemplate: false,
        isFavorite: false,
        usage: { views: 0, downloads: 0, shares: 0 },
        expiresAt: expiresAt.toISOString(),
        lastAccessed: new Date().toISOString(),
        settings: this.settings
      });

      const { data, error } = await supabase
        .from(TABLES.CONTENT)
        .insert(versionRecord)
        .select()
        .single();

      handleSupabaseError(error);

      return new ContentSupabase(transformRecord(data));
    } catch (error) {
      throw error;
    }
  }

  // Instance method to check if content is accessible
  isAccessible(userId) {
    if (this.isPublic) return true;
    if (this.user === userId) return true;
    return false;
  }

  // Instance method to toggle favorite status
  async toggleFavorite() {
    try {
      this.isFavorite = !this.isFavorite;

      const { error } = await supabase
        .from(TABLES.CONTENT)
        .update({
          is_favorite: this.isFavorite,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      handleSupabaseError(error);

      return this;
    } catch (error) {
      throw error;
    }
  }

  // Instance method to update metadata
  async updateMetadata(newMetadata) {
    try {
      this.metadata = { ...this.metadata, ...newMetadata };

      const { error } = await supabase
        .from(TABLES.CONTENT)
        .update({
          metadata: this.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      handleSupabaseError(error);

      return this;
    } catch (error) {
      throw error;
    }
  }

  // Get content age in days (computed property)
  get age() {
    const createdAt = new Date(this.createdAt);
    const now = new Date();
    return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  }

  // Get content size category (computed property)
  get sizeCategory() {
    const charCount = this.metadata?.characterCount || 0;
    if (charCount < 500) return 'short';
    if (charCount < 2000) return 'medium';
    return 'long';
  }

  // Convert to plain object for JSON responses
  toJSON() {
    return { ...this };
  }

  // Static method to delete content
  static async deleteById(contentId) {
    try {
      const { error } = await supabase
        .from(TABLES.CONTENT)
        .delete()
        .eq('id', contentId);

      handleSupabaseError(error);

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Instance method to delete
  async delete() {
    return await ContentSupabase.deleteById(this.id);
  }
}

module.exports = ContentSupabase;