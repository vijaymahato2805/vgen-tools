const ContentSupabase = require('../models/ContentSupabase');

/**
 * Get user's content history with filtering and pagination
 * @param {string} userId - User ID
 * @param {Object} options - Query options (type, pagination, sorting, search)
 * @returns {Object} User's content history with pagination info
 */
const getUserHistory = async (userId, options = {}) => {
  try {
    const {
      type,
      page = 1,
      limit = 20,
      sort = '-createdAt',
      search
    } = options;

    let queryOptions = { limit, skip: (page - 1) * limit };

    // Add type filter if specified
    if (type) {
      queryOptions.contentType = type;
    }

    // For search functionality, we'll need to implement it differently in Supabase
    let content, totalCount;

    if (search) {
      // Get all user's content and filter client-side for now
      // (Supabase text search would require full-text search setup)
      const allContent = await ContentSupabase.findByUserAndType(userId, type || '', { limit: 1000 });
      const filteredContent = allContent.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      );

      content = filteredContent.slice((page - 1) * limit, page * limit);
      totalCount = filteredContent.length;
    } else {
      // Get content with pagination
      content = await ContentSupabase.findByUserAndType(userId, type || '', queryOptions);
      totalCount = content.length; // This is not accurate for pagination, need separate count query

      // For accurate count, we'd need to implement a separate count function in ContentSupabase
      // For now, we'll use a simple approach
      if (type) {
        // Count total for specific type
        const allContentOfType = await ContentSupabase.findByUserAndType(userId, type, { limit: 10000 });
        totalCount = allContentOfType.length;
      } else {
        // Count all user's content (this could be expensive, consider caching)
        totalCount = (await ContentSupabase.findByUserAndType(userId, '', { limit: 10000 })).length;
      }
    }

    const totalPages = Math.ceil(totalCount / limit);

    return {
      content,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      totalCount
    };

  } catch (error) {
    console.error('Get user history error:', error);
    throw new Error(`Failed to retrieve user history: ${error.message}`);
  }
};

/**
 * Get specific content by ID with access control
 * @param {string} contentId - Content ID
 * @param {string} userId - User ID for access verification
 * @returns {Object} Content object if accessible
 */
const getContentById = async (contentId, userId) => {
  try {
    const content = await ContentSupabase.findById(contentId);

    if (!content) {
      return null;
    }

    // Check access permissions
    if (!content.isAccessible(userId)) {
      return null;
    }

    return content;

  } catch (error) {
    console.error('Get content by ID error:', error);
    throw new Error(`Failed to retrieve content: ${error.message}`);
  }
};

/**
 * Save new content to user's history
 * @param {Object} contentData - Content data to save
 * @returns {Object} Saved content object
 */
const saveContent = async (contentData) => {
  try {
    const {
      user,
      type,
      title,
      content,
      metadata = {},
      tags = [],
      isPublic = false
    } = contentData;

    const newContent = await ContentSupabase.create({
      user,
      type,
      title,
      content,
      metadata,
      tags,
      isPublic
    });

    return newContent;

  } catch (error) {
    console.error('Save content error:', error);
    throw new Error(`Failed to save content: ${error.message}`);
  }
};

/**
 * Update existing content with access control
 * @param {string} contentId - Content ID to update
 * @param {string} userId - User ID for access verification
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated content object
 */
const updateContent = async (contentId, userId, updates) => {
  try {
    const content = await ContentSupabase.findById(contentId);

    if (!content) {
      return null;
    }

    // Check ownership
    if (content.user !== userId) {
      return null;
    }

    // Update version if content is being modified
    if (updates.content || updates.title) {
      updates.version = content.version + 1;
    }

    // Apply updates to content object
    Object.assign(content, updates);
    await content.save();

    return content;

  } catch (error) {
    console.error('Update content error:', error);
    throw new Error(`Failed to update content: ${error.message}`);
  }
};

/**
 * Delete content with access control
 * @param {string} contentId - Content ID to delete
 * @param {string} userId - User ID for access verification
 * @returns {Object} Deleted content object
 */
const deleteContent = async (contentId, userId) => {
  try {
    const content = await ContentSupabase.findById(contentId);

    if (!content) {
      return null;
    }

    // Check ownership
    if (content.user !== userId) {
      return null;
    }

    await ContentSupabase.deleteById(contentId);
    return content;

  } catch (error) {
    console.error('Delete content error:', error);
    throw new Error(`Failed to delete content: ${error.message}`);
  }
};

/**
 * Toggle favorite status for content
 * @param {string} contentId - Content ID
 * @param {string} userId - User ID for access verification
 * @returns {Object} Updated content object
 */
const toggleFavorite = async (contentId, userId) => {
  try {
    const content = await ContentSupabase.findById(contentId);

    if (!content) {
      return null;
    }

    // Check ownership
    if (content.user !== userId) {
      return null;
    }

    await content.toggleFavorite();
    return content;

  } catch (error) {
    console.error('Toggle favorite error:', error);
    throw new Error(`Failed to toggle favorite status: ${error.message}`);
  }
};

/**
 * Get user's content statistics summary
 * @param {string} userId - User ID
 * @returns {Object} User's content statistics
 */
const getUserStatsSummary = async (userId) => {
  try {
    const stats = await ContentSupabase.getUserStats(userId);

    // Calculate additional summary statistics
    const totalContent = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalViews = stats.reduce((sum, stat) => sum + stat.totalViews, 0);
    const totalDownloads = stats.reduce((sum, stat) => sum + stat.totalDownloads, 0);

    const contentTypeDistribution = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const averageCharacterCount = stats.reduce((sum, stat) => sum + (stat.avgCharacterCount || 0), 0) / stats.length;

    return {
      overview: {
        totalContent,
        totalViews,
        totalDownloads,
        averageCharacterCount: Math.round(averageCharacterCount)
      },
      byType: contentTypeDistribution,
      detailed: stats,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Get user stats summary error:', error);
    throw new Error(`Failed to retrieve statistics: ${error.message}`);
  }
};

/**
 * Get user's usage statistics over time
 * @param {string} userId - User ID
 * @param {string} period - Time period (7days, 30days, 90days)
 * @returns {Object} Usage statistics over time
 */
const getUsageStats = async (userId, period = '30days') => {
  try {
    const days = {
      '7days': 7,
      '30days': 30,
      '90days': 90
    }[period] || 30;

    // For Supabase, we'll get all content in the date range and group client-side
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    // Get all user's content in the date range
    const allContent = await ContentSupabase.findByUserAndType(userId, '', { limit: 10000 });

    // Filter by date range
    const filteredContent = allContent.filter(content => {
      const createdAt = new Date(content.createdAt);
      return createdAt >= startDate;
    });

    // Group by date
    const usageByDate = {};
    filteredContent.forEach(content => {
      const date = content.createdAt.split('T')[0]; // Get YYYY-MM-DD
      if (!usageByDate[date]) {
        usageByDate[date] = {
          count: 0,
          views: 0,
          downloads: 0
        };
      }
      usageByDate[date].count += 1;
      usageByDate[date].views += content.usage?.views || 0;
      usageByDate[date].downloads += content.usage?.downloads || 0;
    });

    // Fill in missing dates with zero values
    const dateRange = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      dateRange.unshift(dateStr);
    }

    const filledData = dateRange.map(date => ({
      date,
      count: usageByDate[date]?.count || 0,
      views: usageByDate[date]?.views || 0,
      downloads: usageByDate[date]?.downloads || 0
    }));

    return {
      period,
      days,
      data: filledData,
      summary: {
        totalCreated: filledData.reduce((sum, day) => sum + day.count, 0),
        totalViews: filledData.reduce((sum, day) => sum + day.views, 0),
        totalDownloads: filledData.reduce((sum, day) => sum + day.downloads, 0),
        averagePerDay: Math.round(filledData.reduce((sum, day) => sum + day.count, 0) / days)
      }
    };

  } catch (error) {
    console.error('Get usage stats error:', error);
    throw new Error(`Failed to retrieve usage statistics: ${error.message}`);
  }
};

/**
 * Bulk delete multiple content items
 * @param {Array} contentIds - Array of content IDs to delete
 * @param {string} userId - User ID for access verification
 * @returns {number} Number of deleted items
 */
const bulkDeleteContent = async (contentIds, userId) => {
  try {
    let deletedCount = 0;

    // Delete each content item individually (Supabase doesn't have bulk delete with conditions)
    for (const contentId of contentIds) {
      const content = await ContentSupabase.findById(contentId);
      if (content && content.user === userId) {
        await ContentSupabase.deleteById(contentId);
        deletedCount++;
      }
    }

    return deletedCount;

  } catch (error) {
    console.error('Bulk delete content error:', error);
    throw new Error(`Failed to bulk delete content: ${error.message}`);
  }
};

/**
 * Bulk toggle favorite status for multiple content items
 * @param {Array} contentIds - Array of content IDs
 * @param {string} userId - User ID for access verification
 * @param {boolean} favorite - Favorite status to set
 * @returns {number} Number of updated items
 */
const bulkToggleFavorite = async (contentIds, userId, favorite) => {
  try {
    let modifiedCount = 0;

    // Update each content item individually (Supabase doesn't have bulk update with conditions like MongoDB)
    for (const contentId of contentIds) {
      const content = await ContentSupabase.findById(contentId);
      if (content && content.user === userId) {
        content.isFavorite = favorite;
        await content.save();
        modifiedCount++;
      }
    }

    return modifiedCount;

  } catch (error) {
    console.error('Bulk toggle favorite error:', error);
    throw new Error(`Failed to bulk update favorite status: ${error.message}`);
  }
};

/**
 * Search user's content with advanced filters
 * @param {string} userId - User ID
 * @param {Object} searchOptions - Search options and filters
 * @returns {Object} Search results with pagination
 */
const searchContent = async (userId, searchOptions) => {
  try {
    const {
      query,
      type,
      tags = [],
      dateFrom,
      dateTo,
      isFavorite,
      isPublic,
      page = 1,
      limit = 20
    } = searchOptions;

    // For complex search, we'll get all user's content and filter client-side
    // This is not ideal for large datasets but works for now
    const allContent = await ContentSupabase.findByUserAndType(userId, type || '', { limit: 10000 });

    // Apply filters client-side
    let filteredContent = allContent.filter(content => {
      // Text search
      if (query) {
        const matchesTitle = content.title.toLowerCase().includes(query.toLowerCase());
        const matchesContent = JSON.stringify(content.content).toLowerCase().includes(query.toLowerCase());
        const matchesTags = content.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

        if (!matchesTitle && !matchesContent && !matchesTags) {
          return false;
        }
      }

      // Tags filter
      if (tags.length > 0) {
        const hasMatchingTag = tags.some(tag => content.tags?.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const contentDate = new Date(content.createdAt);
        if (dateFrom && contentDate < new Date(dateFrom)) {
          return false;
        }
        if (dateTo && contentDate > new Date(dateTo)) {
          return false;
        }
      }

      // Favorite filter
      if (isFavorite !== undefined && content.isFavorite !== isFavorite) {
        return false;
      }

      // Public filter
      if (isPublic !== undefined && content.isPublic !== isPublic) {
        return false;
      }

      return true;
    });

    // Sort by creation date (newest first)
    filteredContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedContent = filteredContent.slice(skip, skip + limit);
    const totalCount = filteredContent.length;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      content: paginatedContent,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      totalCount
    };

  } catch (error) {
    console.error('Search content error:', error);
    throw new Error(`Failed to search content: ${error.message}`);
  }
};

/**
 * Duplicate existing content with modifications
 * @param {string} contentId - Original content ID
 * @param {string} userId - User ID for access verification
 * @param {Object} options - Duplication options (title, modifications)
 * @returns {Object} Duplicated content object
 */
const duplicateContent = async (contentId, userId, options = {}) => {
  try {
    const { title, modifications = {} } = options;

    const originalContent = await ContentSupabase.findById(contentId);

    if (!originalContent) {
      return null;
    }

    // Check ownership
    if (originalContent.user !== userId) {
      return null;
    }

    // Create duplicated content
    const duplicatedContent = await ContentSupabase.create({
      user: userId,
      type: originalContent.type,
      title: title || `${originalContent.title} (Copy)`,
      content: {
        ...originalContent.content,
        ...modifications
      },
      metadata: {
        ...originalContent.metadata,
        ...modifications.metadata
      },
      tags: originalContent.tags,
      parentContent: originalContent.id,
      version: 1,
      isPublic: false // Duplicates are private by default
    });

    return duplicatedContent;

  } catch (error) {
    console.error('Duplicate content error:', error);
    throw new Error(`Failed to duplicate content: ${error.message}`);
  }
};

/**
 * Export user's content data
 * @param {string} userId - User ID
 * @param {Object} options - Export options (format, type, includeMetadata)
 * @returns {Array} Exported content data
 */
const exportUserContent = async (userId, options = {}) => {
  try {
    const { format = 'json', type, includeMetadata = true } = options;

    // Get user's content
    const content = await ContentSupabase.findByUserAndType(userId, type || '', { limit: 10000 });

    if (format === 'json') {
      return content.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content,
        ...(includeMetadata && { metadata: item.metadata }),
        tags: item.tags,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));
    }

    // For other formats, return structured data
    return content.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      content: item.content,
      tags: item.tags,
      createdAt: item.createdAt
    }));

  } catch (error) {
    console.error('Export user content error:', error);
    throw new Error(`Failed to export content: ${error.message}`);
  }
};

/**
 * Clean up expired content (for maintenance tasks)
 * @returns {number} Number of deleted items
 */
const cleanupExpiredContent = async () => {
  try {
    const expiredContent = await ContentSupabase.findExpired();
    let deletedCount = 0;

    // Delete each expired content item individually
    for (const content of expiredContent) {
      await ContentSupabase.deleteById(content.id);
      deletedCount++;
    }

    return deletedCount;

  } catch (error) {
    console.error('Cleanup expired content error:', error);
    throw new Error(`Failed to cleanup expired content: ${error.message}`);
  }
};

/**
 * Get content recommendations for user
 * @param {string} userId - User ID
 * @returns {Array} Recommended content or actions
 */
const getContentRecommendations = async (userId) => {
  try {
    // Get user's content statistics
    const stats = await ContentSupabase.getUserStats(userId);
    const totalContent = stats.reduce((sum, stat) => sum + stat.count, 0);

    const recommendations = [];

    // Recommendations based on usage patterns
    if (totalContent === 0) {
      recommendations.push({
        type: 'getting_started',
        title: 'Create your first resume',
        description: 'Start building your professional profile with our AI resume generator',
        action: '/resume/generate',
        priority: 'high'
      });
    }

    if (totalContent > 0 && totalContent < 5) {
      recommendations.push({
        type: 'diversify',
        title: 'Try other tools',
        description: 'Explore our cover letter generator and interview question tool',
        action: '/tools',
        priority: 'medium'
      });
    }

    if (totalContent > 10) {
      recommendations.push({
        type: 'organize',
        title: 'Organize your content',
        description: 'Use tags and favorites to better organize your generated content',
        action: '/history',
        priority: 'low'
      });
    }

    return recommendations;

  } catch (error) {
    console.error('Get content recommendations error:', error);
    throw new Error(`Failed to get recommendations: ${error.message}`);
  }
};

module.exports = {
  getUserHistory,
  getContentById,
  saveContent,
  updateContent,
  deleteContent,
  toggleFavorite,
  getUserStatsSummary,
  getUsageStats,
  bulkDeleteContent,
  bulkToggleFavorite,
  searchContent,
  duplicateContent,
  exportUserContent,
  cleanupExpiredContent,
  getContentRecommendations
};