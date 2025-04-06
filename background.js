// Handle authentication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH') {
    handleAuth(request.token);
  }
});

async function handleAuth(token) {
  await chrome.storage.local.set({ authToken: token });
}

// Handle content analysis results
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYSIS_RESULT') {
    handleAnalysisResult(request.data, sender.tab);
  }
});

async function handleAnalysisResult(data, tab) {
  const { toxicityScore, category } = data;
  
  // Check if the site is in the popular sites list
  const url = new URL(tab.url);
  const isPopularSite = window.HarmDetectorConfig.NOTIFICATION_SETTINGS.POPULAR_SITES
    .some(site => url.hostname.includes(site));

  if (toxicityScore > window.HarmDetectorConfig.TOXICITY_THRESHOLD) {
    // Show browser notification for popular sites
    if (isPopularSite) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Harmful Content Detected',
        message: `⚠️ ${category} detected on ${url.hostname}`,
        priority: 2
      });
    }

    // Update extension badge
    chrome.action.setBadgeText({
      text: '⚠️',
      tabId: tab.id
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#ff4444',
      tabId: tab.id
    });
  } else {
    // Clear badge if content is safe
    chrome.action.setBadgeText({
      text: '',
      tabId: tab.id
    });
  }
}

// Handle manual content reporting
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REPORT_CONTENT') {
    handleManualReport(request.data, sender.tab);
  }
});

async function handleManualReport(data, tab) {
  try {
    const token = await new Promise(resolve => {
      chrome.storage.local.get(['authToken'], result => resolve(result.authToken));
    });

    await fetch(window.HarmDetectorConfig.API_ENDPOINTS.STORE_ANALYSIS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: tab.url,
        timestamp: new Date().toISOString(),
        analysis: {
          ...data,
          manuallyReported: true
        }
      })
    });

    // Show confirmation notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Content Reported',
      message: 'Thank you for reporting harmful content. Our team will review it shortly.',
      priority: 1
    });
  } catch (error) {
    console.error('Error reporting content:', error);
  }
} 