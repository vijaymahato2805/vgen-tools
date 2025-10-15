const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['resume', 'cover_letter', 'bio', 'flashcard', 'interview_question', 'analysis'],
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    template: String,
    platform: String,
    tone: String,
    difficulty: String,
    subject: String,
    industry: String,
    experienceLevel: String,
    questionType: String,
    characterCount: Number,
    wordCount: Number,
    generationTime: Number, // in milliseconds
    model: String,
    tokens: Number
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  usage: {
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from creation
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  },
  parentContent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }, // For tracking variations of the same content
  relatedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],
  settings: {
    autoSave: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    },
    sharing: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
contentSchema.index({ user: 1, type: 1, createdAt: -1 });
contentSchema.index({ user: 1, isFavorite: 1, createdAt: -1 });
contentSchema.index({ user: 1, tags: 1 });
contentSchema.index({ type: 1, isPublic: 1, createdAt: -1 });
contentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for content age
contentSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Virtual for content size category
contentSchema.virtual('sizeCategory').get(function() {
  const charCount = this.metadata?.characterCount || 0;
  if (charCount < 500) return 'short';
  if (charCount < 2000) return 'medium';
  return 'long';
});

// Static method to find user's content by type
contentSchema.statics.findByUserAndType = function(userId, contentType, options = {}) {
  const { limit = 20, skip = 0, sort = '-createdAt' } = options;

  return this.find({ user: userId, type: contentType })
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Static method to find expired content
contentSchema.statics.findExpired = function() {
  return this.find({ expiresAt: { $lt: new Date() } });
};

// Static method to get content statistics for a user
contentSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalViews: { $sum: '$usage.views' },
        totalDownloads: { $sum: '$usage.downloads' },
        avgCharacterCount: { $avg: '$metadata.characterCount' }
      }
    }
  ]);
};

// Instance method to update access time
contentSchema.methods.updateAccessTime = function() {
  this.lastAccessed = new Date();
  return this.save();
};

// Instance method to increment view count
contentSchema.methods.incrementViews = function() {
  this.usage.views += 1;
  return this.save();
};

// Instance method to increment download count
contentSchema.methods.incrementDownloads = function() {
  this.usage.downloads += 1;
  return this.save();
};

// Instance method to create a new version
contentSchema.methods.createVersion = function(newContent, changes = {}) {
  const version = new this.constructor({
    user: this.user,
    type: this.type,
    title: `${this.title} (v${this.version + 1})`,
    content: newContent,
    metadata: { ...this.metadata, ...changes },
    tags: this.tags,
    parentContent: this._id,
    version: this.version + 1
  });

  return version.save();
};

// Instance method to check if content is accessible
contentSchema.methods.isAccessible = function(userId) {
  if (this.isPublic) return true;
  if (this.user.toString() === userId.toString()) return true;
  return false;
};

module.exports = mongoose.model('Content', contentSchema);