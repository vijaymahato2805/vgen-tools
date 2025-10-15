const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/service/categories
// @desc    Get available service categories
// @access  Public
router.get('/categories', (req, res) => {
  const categories = [
    {
      id: 'healthcare',
      name: 'Healthcare',
      icon: '🏥',
      description: 'Medical services and healthcare providers',
      subcategories: [
        'Primary Care',
        'Specialists',
        'Dentists',
        'Mental Health',
        'Pharmacies',
        'Urgent Care',
        'Hospitals'
      ]
    },
    {
      id: 'education',
      name: 'Education',
      icon: '🎓',
      description: 'Educational institutions and services',
      subcategories: [
        'Schools',
        'Tutoring',
        'Test Prep',
        'Language Learning',
        'Professional Development',
        'Libraries',
        'Online Courses'
      ]
    },
    {
      id: 'home-services',
      name: 'Home Services',
      icon: '🏠',
      description: 'Home maintenance and improvement services',
      subcategories: [
        'Plumbing',
        'Electrical',
        'Cleaning',
        'Landscaping',
        'Painting',
        'Handyman',
        'Moving'
      ]
    },
    {
      id: 'automotive',
      name: 'Automotive',
      icon: '🚗',
      description: 'Car repair and maintenance services',
      subcategories: [
        'Auto Repair',
        'Body Shops',
        'Car Wash',
        'Tire Services',
        'Oil Change',
        'Dealerships',
        'Parts'
      ]
    },
    {
      id: 'beauty-wellness',
      name: 'Beauty & Wellness',
      icon: '💆',
      description: 'Beauty and personal care services',
      subcategories: [
        'Hair Salons',
        'Spas',
        'Nail Salons',
        'Massage',
        'Fitness Centers',
        'Yoga Studios',
        'Personal Training'
      ]
    },
    {
      id: 'food-dining',
      name: 'Food & Dining',
      icon: '🍽️',
      description: 'Restaurants and food services',
      subcategories: [
        'Restaurants',
        'Fast Food',
        'Cafes',
        'Bakeries',
        'Delivery',
        'Catering',
        'Food Trucks'
      ]
    },
    {
      id: 'professional',
      name: 'Professional Services',
      icon: '💼',
      description: 'Business and professional services',
      subcategories: [
        'Legal Services',
        'Accounting',
        'Real Estate',
        'Insurance',
        'Financial Planning',
        'Consulting',
        'Marketing'
      ]
    },
    {
      id: 'shopping',
      name: 'Shopping',
      icon: '🛍️',
      description: 'Retail and shopping services',
      subcategories: [
        'Grocery Stores',
        'Clothing Stores',
        'Electronics',
        'Home Goods',
        'Bookstores',
        'Specialty Shops',
        'Online Retail'
      ]
    }
  ];

  res.json({
    success: true,
    data: {
      categories,
      total: categories.length,
      note: 'This is a demo implementation. In production, this would connect to real service provider databases.'
    }
  });
});

// @route   POST /api/service/search
// @desc    Search for local services
// @access  Public
router.post('/search', [
  body('location')
    .isString()
    .isLength({ min: 3 })
    .withMessage('Location is required'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  body('subcategory')
    .optional()
    .isString()
    .withMessage('Subcategory must be a string'),
  body('radius')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Radius must be between 1 and 50 miles'),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  body('priceRange')
    .optional()
    .isIn(['$', '$$', '$$$', '$$$$'])
    .withMessage('Invalid price range')
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

    const { location, category, subcategory, radius = 10, rating, priceRange } = req.body;

    // Mock search results - in production, this would query real databases
    const mockResults = await generateMockServiceResults({
      location,
      category,
      subcategory,
      radius,
      rating,
      priceRange
    });

    res.json({
      success: true,
      message: 'Local services search completed',
      data: {
        searchQuery: {
          location,
          category,
          subcategory,
          radius,
          rating,
          priceRange
        },
        results: mockResults.services,
        totalResults: mockResults.services.length,
        searchRadius: radius,
        centerLocation: mockResults.centerLocation,
        searchTime: new Date().toISOString(),
        note: 'Demo results - in production, these would be real service providers'
      }
    });

  } catch (error) {
    console.error('Service search error:', error);
    res.status(500).json({
      error: 'Failed to search services. Please try again.'
    });
  }
});

// @route   GET /api/service/featured
// @desc    Get featured local services
// @access  Public
router.get('/featured', (req, res) => {
  const featuredServices = [
    {
      id: 'service_1',
      name: 'Downtown Medical Center',
      category: 'Healthcare',
      subcategory: 'Primary Care',
      rating: 4.8,
      reviewCount: 156,
      priceRange: '$$',
      distance: 1.2,
      location: 'Downtown Area',
      description: 'Comprehensive primary healthcare services with experienced physicians.',
      features: ['Same-day appointments', 'Online booking', 'Most insurance accepted'],
      phone: '(555) 123-4567',
      website: 'https://medical-center.demo',
      hours: 'Mon-Fri: 8AM-6PM, Sat: 9AM-2PM',
      verified: true
    },
    {
      id: 'service_2',
      name: 'Elite Fitness Studio',
      category: 'Beauty & Wellness',
      subcategory: 'Fitness Centers',
      rating: 4.6,
      reviewCount: 89,
      priceRange: '$$$',
      distance: 0.8,
      location: 'Business District',
      description: 'Premium fitness facility with personal training and group classes.',
      features: ['Personal training', 'Group classes', 'Modern equipment'],
      phone: '(555) 987-6543',
      website: 'https://elite-fitness.demo',
      hours: 'Mon-Fri: 5AM-10PM, Sat-Sun: 7AM-8PM',
      verified: true
    },
    {
      id: 'service_3',
      name: 'Bella Vista Restaurant',
      category: 'Food & Dining',
      subcategory: 'Restaurants',
      rating: 4.4,
      reviewCount: 203,
      priceRange: '$$$',
      distance: 2.1,
      location: 'Arts Quarter',
      description: 'Upscale Italian dining with authentic cuisine and extensive wine list.',
      features: ['Fine dining', 'Wine tasting', 'Private events'],
      phone: '(555) 456-7890',
      website: 'https://bella-vista.demo',
      hours: 'Tue-Sun: 5PM-11PM, Closed Mondays',
      verified: true
    }
  ];

  res.json({
    success: true,
    data: {
      services: featuredServices,
      total: featuredServices.length,
      featured: true,
      note: 'These are demo featured services. In production, featured services would be curated based on ratings and partnerships.'
    }
  });
});

// @route   GET /api/service/:id
// @desc    Get detailed service information
// @access  Public
router.get('/:id', (req, res) => {
  const { id } = req.params;

  // Mock detailed service data
  const serviceDetails = {
    id,
    name: 'Downtown Medical Center',
    category: 'Healthcare',
    subcategory: 'Primary Care',
    rating: 4.8,
    reviewCount: 156,
    priceRange: '$$',
    distance: 1.2,
    location: {
      address: '123 Main Street, Downtown',
      city: 'Metropolis',
      state: 'CA',
      zipCode: '12345',
      coordinates: {
        lat: 34.0522,
        lng: -118.2437
      }
    },
    contact: {
      phone: '(555) 123-4567',
      email: 'info@medical-center.demo',
      website: 'https://medical-center.demo'
    },
    hours: [
      { day: 'Monday', hours: '8:00 AM - 6:00 PM' },
      { day: 'Tuesday', hours: '8:00 AM - 6:00 PM' },
      { day: 'Wednesday', hours: '8:00 AM - 6:00 PM' },
      { day: 'Thursday', hours: '8:00 AM - 6:00 PM' },
      { day: 'Friday', hours: '8:00 AM - 6:00 PM' },
      { day: 'Saturday', hours: '9:00 AM - 2:00 PM' },
      { day: 'Sunday', hours: 'Closed' }
    ],
    description: 'Comprehensive primary healthcare services with experienced physicians and modern facilities.',
    features: [
      'Same-day appointments',
      'Online booking',
      'Most insurance accepted',
      'Telemedicine available',
      'Lab services on-site',
      'Pharmacy partnership'
    ],
    providers: [
      {
        name: 'Dr. Sarah Johnson',
        specialty: 'Family Medicine',
        education: 'MD from UCLA Medical School',
        experience: '15+ years',
        languages: ['English', 'Spanish']
      },
      {
        name: 'Dr. Michael Chen',
        specialty: 'Internal Medicine',
        education: 'MD from Stanford Medical School',
        experience: '12+ years',
        languages: ['English', 'Mandarin']
      }
    ],
    reviews: [
      {
        id: 'review_1',
        userName: 'Jennifer L.',
        rating: 5,
        date: '2024-01-15',
        comment: 'Excellent care and very professional staff. Highly recommended!'
      },
      {
        id: 'review_2',
        userName: 'Robert M.',
        rating: 5,
        date: '2024-01-10',
        comment: 'Great experience. The doctors are knowledgeable and caring.'
      }
    ],
    insurance: [
      'Blue Cross Blue Shield',
      'Aetna',
      'Cigna',
      'United Healthcare',
      'Medicare',
      'Medi-Cal'
    ],
    photos: [
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
      'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400',
      'https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=400'
    ],
    verified: true,
    lastUpdated: new Date().toISOString()
  };

  res.json({
    success: true,
    data: {
      service: serviceDetails,
      note: 'This is demo service data. In production, this would be real service provider information from verified databases.'
    }
  });
});

// @route   GET /api/service/nearby/:lat/:lng
// @desc    Get services near specific coordinates
// @access  Public
router.get('/nearby/:lat/:lng', [
  // Validation would be added here for lat/lng parameters
], async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const { radius = 5, category, limit = 20 } = req.query;

    // Mock nearby services based on coordinates
    const mockNearbyServices = await generateNearbyServiceResults({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radius: parseInt(radius),
      category,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      message: 'Nearby services found',
      data: {
        center: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng)
        },
        radius: parseInt(radius),
        services: mockNearbyServices,
        totalResults: mockNearbyServices.length,
        searchTime: new Date().toISOString(),
        note: 'Demo location-based search. In production, this would use real mapping and business data APIs.'
      }
    });

  } catch (error) {
    console.error('Nearby services search error:', error);
    res.status(500).json({
      error: 'Failed to search nearby services. Please try again.'
    });
  }
});

// Helper function to generate mock service results
const generateMockServiceResults = async (searchParams) => {
  const { location, category, subcategory, radius, rating, priceRange } = searchParams;

  const mockServices = [
    {
      id: 'service_1',
      name: `Best ${category || 'Medical'} Center`,
      category: category || 'Healthcare',
      subcategory: subcategory || 'Primary Care',
      rating: rating || 4.5,
      reviewCount: Math.floor(Math.random() * 200) + 10,
      priceRange: priceRange || '$$',
      distance: Math.random() * radius,
      location: `${location} Area`,
      description: `Professional ${category?.toLowerCase() || 'medical'} services in ${location}.`,
      features: ['Experienced staff', 'Modern facilities', 'Convenient location'],
      phone: '(555) 123-4567',
      verified: true
    },
    {
      id: 'service_2',
      name: `Elite ${category || 'Dental'} Services`,
      category: category || 'Healthcare',
      subcategory: subcategory || 'Dentists',
      rating: rating || 4.7,
      reviewCount: Math.floor(Math.random() * 150) + 20,
      priceRange: priceRange || '$$$',
      distance: Math.random() * radius,
      location: `Downtown ${location}`,
      description: `Premium ${category?.toLowerCase() || 'dental'} care with state-of-the-art equipment.`,
      features: ['Advanced technology', 'Comfortable environment', 'Insurance accepted'],
      phone: '(555) 987-6543',
      verified: true
    },
    {
      id: 'service_3',
      name: `${location} Family Clinic`,
      category: category || 'Healthcare',
      subcategory: subcategory || 'Urgent Care',
      rating: rating || 4.3,
      reviewCount: Math.floor(Math.random() * 100) + 30,
      priceRange: priceRange || '$',
      distance: Math.random() * radius,
      location: `North ${location}`,
      description: `Affordable healthcare services for families in ${location}.`,
      features: ['Family-friendly', 'Affordable rates', 'Walk-ins welcome'],
      phone: '(555) 456-7890',
      verified: true
    }
  ];

  return {
    services: mockServices,
    centerLocation: `${location}, CA`,
    totalFound: mockServices.length
  };
};

// Helper function to generate nearby service results based on coordinates
const generateNearbyServiceResults = async (params) => {
  const { latitude, longitude, radius, category, limit } = params;

  const mockServices = [];

  for (let i = 1; i <= limit; i++) {
    mockServices.push({
      id: `nearby_service_${i}`,
      name: `Local Service Provider ${i}`,
      category: category || 'General',
      subcategory: 'Various',
      rating: 4.0 + (Math.random() * 1.0),
      reviewCount: Math.floor(Math.random() * 100) + 5,
      priceRange: ['$', '$$', '$$$'][Math.floor(Math.random() * 3)],
      distance: Math.random() * radius,
      location: {
        address: `${Math.floor(Math.random() * 9999)} Main Street`,
        city: 'Nearby City',
        coordinates: {
          lat: latitude + (Math.random() - 0.5) * 0.01,
          lng: longitude + (Math.random() - 0.5) * 0.01
        }
      },
      description: 'Local service provider offering quality services.',
      phone: '(555) 123-4567',
      verified: Math.random() > 0.3
    });
  }

  return mockServices;
};

module.exports = router;