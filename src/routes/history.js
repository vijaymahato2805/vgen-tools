const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Content = require('../models/ContentSupabase');
const historyController = require('../controllers/historyController');

const router = express.Router();

// @route   GET /api/history
// @desc    Get user's content history
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { type, page = 1, limit = 20, sort = '-createdAt', search } = req.query;

    const options = {
      type: type,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50), // Max 50 items per page
      sort,
      search: search
    };

    const history = await historyController.getUserHistory(req.user.id, options);

    res.json({
      success: true,
      data: {
        history: history.content,
        pagination: history.pagination,
        filters: options,
        totalCount: history.totalCount
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve history. Please try again.'
    });
  }
});

// @route   GET /api/history/:id
// @desc    Get specific content item
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const content = await historyController.getContentById(id, req.user.id);

    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }

    // Update access time
    await content.updateAccessTime();

    res.json({
      success: true,
      data: {
        content,
        lastAccessed: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({
      error: 'Failed to retrieve content. Please try again.'
    });
  }
});

// @route   POST /api/history
// @desc    Save new content to history
// @access  Private
router.post('/', protect, [
  body('type')
    .isIn(['resume', 'cover_letter', 'bio', 'flashcard', 'interview_question', 'analysis'])
    .withMessage('Valid content type is required'),
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .isObject()
    .withMessage('Content must be an object'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type, title, content, metadata, tags, isPublic = false } = req.body;

    const savedContent = await historyController.saveContent({
      user: req.user.id,
      type,
      title,
      content,
      metadata,
      tags: tags || [],
      isPublic
    });

    res.status(201).json({
      success: true,
      message: 'Content saved successfully',
      data: {
        content: savedContent,
        savedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Save content error:', error);
    res.status(500).json({
      error: 'Failed to save content. Please try again.'
    });
  }
});

// @route   PUT /api/history/:id
// @desc    Update existing content
// @access  Private
router.put('/:id', protect, [
  body('title')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .optional()
    .isObject()
    .withMessage('Content must be an object'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const updatedContent = await historyController.updateContent(id, req.user.id, updates);

    if (!updatedContent) {
      return res.status(404).json({
        error: 'Content not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: {
        content: updatedContent,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      error: 'Failed to update content. Please try again.'
    });
  }
});

// @route   DELETE /api/history/:id
// @desc    Delete content item
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedContent = await historyController.deleteContent(id, req.user.id);

    if (!deletedContent) {
      return res.status(404).json({
        error: 'Content not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Content deleted successfully',
      data: {
        deletedId: id,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({
      error: 'Failed to delete content. Please try again.'
    });
  }
});

// @route   POST /api/history/:id/favorite
// @desc    Toggle favorite status for content
// @access  Private
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const content = await historyController.toggleFavorite(id, req.user.id);

    if (!content) {
      return res.status(404).json({
        error: 'Content not found or access denied'
      });
    }

    res.json({
      success: true,
      message: `Content ${content.isFavorite ? 'added to' : 'removed from'} favorites`,
      data: {
        content,
        favoritedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      error: 'Failed to update favorite status. Please try again.'
    });
  }
});

// @route   GET /api/history/stats/summary
// @desc    Get user's content statistics summary
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const stats = await historyController.getUserStatsSummary(req.user.id);

    res.json({
      success: true,
      data: {
        stats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics. Please try again.'
    });
  }
});

// @route   GET /api/history/stats/usage
// @desc    Get user's usage statistics over time
// @access  Private
router.get('/stats/usage', protect, async (req, res) => {
  try {
    const { period = '30days' } = req.query;

    const usageStats = await historyController.getUsageStats(req.user.id, period);

    res.json({
      success: true,
      data: {
        usageStats,
        period,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve usage statistics. Please try again.'
    });
  }
});

// @route   POST /api/history/bulk-delete
// @desc    Delete multiple content items
// @access  Private
router.post('/bulk-delete', protect, [
  body('contentIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Must provide 1-50 content IDs')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { contentIds } = req.body;

    const deletedCount = await historyController.bulkDeleteContent(contentIds, req.user.id);

    res.json({
      success: true,
      message: `${deletedCount} items deleted successfully`,
      data: {
        deletedCount,
        deletedIds: contentIds,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      error: 'Failed to delete content items. Please try again.'
    });
  }
});

// @route   POST /api/history/bulk-favorite
// @desc    Toggle favorite status for multiple content items
// @access  Private
router.post('/bulk-favorite', protect, [
  body('contentIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Must provide 1-50 content IDs'),
  body('favorite')
    .isBoolean()
    .withMessage('Favorite status must be a boolean')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { contentIds, favorite } = req.body;

    const updatedCount = await historyController.bulkToggleFavorite(contentIds, req.user.id, favorite);

    res.json({
      success: true,
      message: `${updatedCount} items ${favorite ? 'added to' : 'removed from'} favorites`,
      data: {
        updatedCount,
        favorite,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bulk favorite error:', error);
    res.status(500).json({
      error: 'Failed to update favorite status. Please try again.'
    });
  }
});

// @route   GET /api/history/search
// @desc    Search user's content
// @access  Private
router.get('/search/advanced', protect, async (req, res) => {
  try {
    const {
      query,
      type,
      tags,
      dateFrom,
      dateTo,
      isFavorite,
      isPublic,
      page = 1,
      limit = 20
    } = req.query;

    const searchOptions = {
      query,
      type,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      dateFrom: dateFrom ? new Date(dateFrom) : null,
      dateTo: dateTo ? new Date(dateTo) : null,
      isFavorite: isFavorite === 'true',
      isPublic: isPublic === 'true',
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const searchResults = await historyController.searchContent(req.user.id, searchOptions);

    res.json({
      success: true,
      data: {
        results: searchResults.content,
        pagination: searchResults.pagination,
        searchQuery: searchOptions.query,
        filters: searchOptions,
        totalResults: searchResults.totalCount
      }
    });

  } catch (error) {
    console.error('Search content error:', error);
    res.status(500).json({
      error: 'Failed to search content. Please try again.'
    });
  }
});

// @route   POST /api/history/:id/duplicate
// @desc    Create a duplicate of existing content
// @access  Private
router.post('/:id/duplicate', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, modifications } = req.body;

    const duplicatedContent = await historyController.duplicateContent(id, req.user.id, {
      title,
      modifications: modifications || {}
    });

    if (!duplicatedContent) {
      return res.status(404).json({
        error: 'Content not found or access denied'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Content duplicated successfully',
      data: {
        originalId: id,
        duplicatedContent,
        duplicatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Duplicate content error:', error);
    res.status(500).json({
      error: 'Failed to duplicate content. Please try again.'
    });
  }
});

// @route   GET /api/history/export
// @desc    Export user's content data
// @access  Private
router.get('/export/data', protect, async (req, res) => {
  try {
    const { format = 'json', type, includeMetadata = true } = req.query;

    const exportData = await historyController.exportUserContent(req.user.id, {
      format,
      type,
      includeMetadata: includeMetadata === 'true'
    });

    res.json({
      success: true,
      message: 'Content exported successfully',
      data: {
        exportData,
        format,
        exportedAt: new Date().toISOString(),
        totalItems: exportData.length
      }
    });

  } catch (error) {
    console.error('Export content error:', error);
    res.status(500).json({
      error: 'Failed to export content. Please try again.'
    });
  }
});

module.exports = router;