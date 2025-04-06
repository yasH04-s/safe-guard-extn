const CONFIG = {
  API_ENDPOINTS: {
    ANALYZE: 'http://localhost:3000/api/analyze',
    STORE_ANALYSIS: 'http://localhost:3000/api/store-analysis',
    AUTH: 'http://localhost:3000/api/auth'
  },
  TOXICITY_THRESHOLD: 0.7,
  HIGHLIGHT_COLORS: {
    HIGH: '#ff4444',
    MEDIUM: '#ffbb33',
    LOW: '#ffeb3b'
  },
  NOTIFICATION_SETTINGS: {
    POPULAR_SITES: [
      'twitter.com',
      'facebook.com',
      'news.google.com',
      'reddit.com'
    ]
  }
};

// Make config available globally
window.HarmDetectorConfig = CONFIG; 