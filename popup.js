class PopupManager {
  constructor() {
    // Wait for DOM to be fully loaded before initializing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    try {
      this.initializeElements();
      this.attachEventListeners();
      this.checkAuthStatus();
      this.updateCurrentPageStats();
      this.initializeTabListeners();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize the extension. Please try reloading the page.');
    }
  }

  initializeElements() {
    // Initialize all required elements with null checks
    this.toxicityScore = document.getElementById('toxicity-score');
    this.harmfulCount = document.getElementById('harmful-count');
    this.reportBtn = document.getElementById('report-btn');
    this.downloadBtn = document.getElementById('download-btn');
    this.viewDashboardBtn = document.getElementById('view-dashboard');
    this.loginBtn = document.getElementById('login-btn');
    this.userName = document.getElementById('user-name');
    this.textContentList = document.getElementById('text-content-list');
    this.statusDot = document.querySelector('.status-dot');
    this.statusText = document.querySelector('.status-text');
    this.safetyNotification = document.getElementById('safety-notification');
    this.closeNotificationBtn = document.getElementById('close-notification');
    this.errorNotification = document.getElementById('error-notification');
    this.errorMessageText = document.getElementById('error-message-text');
    this.closeErrorBtn = document.getElementById('close-error');
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.analysisPanels = document.querySelectorAll('.analysis-panel');

    // Verify all critical elements are present
    if (!this.toxicityScore || !this.harmfulCount || !this.textContentList) {
      throw new Error('Critical UI elements not found');
    }
  }

  attachEventListeners() {
    if (this.reportBtn) this.reportBtn.addEventListener('click', () => this.handleReport());
    if (this.downloadBtn) this.downloadBtn.addEventListener('click', () => this.handleDownload());
    if (this.viewDashboardBtn) this.viewDashboardBtn.addEventListener('click', () => this.openDashboard());
    if (this.loginBtn) this.loginBtn.addEventListener('click', () => this.handleLogin());
    if (this.closeNotificationBtn) this.closeNotificationBtn.addEventListener('click', () => this.hideSafetyNotification());
    if (this.closeErrorBtn) this.closeErrorBtn.addEventListener('click', () => this.hideErrorNotification());
    
    // Tab switching
    if (this.tabButtons) {
      this.tabButtons.forEach(button => {
        button.addEventListener('click', () => this.switchTab(button.dataset.tab));
      });
    }
  }

  initializeTabListeners() {
    // Listen for changes in the active tab
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.startRealTimeAnalysis(tabId);
      }
    });

    chrome.tabs.onActivated.addListener(({ tabId }) => {
      this.startRealTimeAnalysis(tabId);
    });
  }

  async startRealTimeAnalysis(tabId) {
    try {
      // Start analysis
      const statusBadge = document.querySelector('.status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'Analyzing...';
        statusBadge.className = 'status-badge analyzing';
      }

      const response = await chrome.tabs.sendMessage(tabId, { type: 'START_ANALYSIS' });
      
      if (response && response.error) {
        throw new Error(response.error);
      }

      // Update UI with initial results
      this.updateStats(response);
      this.updateHarmfulContentList(response.harmfulContent || []);

      // If no harmful content is found, show the safety notification
      if (response && response.harmfulContent && response.harmfulContent.length === 0 && response.toxicityScore < 0.3) {
        this.showSafetyNotification();
        if (statusBadge) {
          statusBadge.textContent = 'Page is Safe';
          statusBadge.className = 'status-badge safe';
        }
      } else {
        if (statusBadge) {
          statusBadge.textContent = 'Issues Found';
          statusBadge.className = 'status-badge warning';
        }
      }
    } catch (error) {
      console.error('Error in real-time analysis:', error);
      this.showError(this.getConnectionErrorMessage(error));
    }
  }

  switchTab(tabId) {
    try {
      // Remove active class from all tabs and panels
      if (this.tabButtons) {
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
      }
      
      if (this.analysisPanels) {
        this.analysisPanels.forEach(panel => panel.classList.remove('active'));
      }
      
      // Add active class to selected tab and panel
      const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
      const selectedPanel = document.getElementById(`${tabId}-panel`);
      
      if (selectedTab) {
        selectedTab.classList.add('active');
      }
      
      if (selectedPanel) {
        selectedPanel.classList.add('active');
      }
    } catch (error) {
      console.error('Error switching tabs:', error);
      this.showError('Failed to switch tabs. Please try again.');
    }
  }

  showSafetyNotification() {
    if (this.safetyNotification) {
      this.safetyNotification.classList.add('show');
      // Auto-hide after 5 seconds
      setTimeout(() => this.hideSafetyNotification(), 5000);
    }
  }

  hideSafetyNotification() {
    if (this.safetyNotification) {
      this.safetyNotification.classList.remove('show');
    }
  }

  async handleDownload() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }
      
      try {
        // Add retry mechanism for content script communication
        let retries = 3;
        let response = null;
        let lastError = null;
        
        while (retries > 0 && !response) {
          try {
            response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ANALYSIS' });
            if (response) break;
          } catch (error) {
            lastError = error;
            console.log(`Retry attempt ${4-retries}/3 failed:`, error);
            // Wait a short time before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
          }
        }
        
        if (!response) {
          throw lastError || new Error('No analysis data available after retries');
        }
        
        const report = {
          url: tab.url,
          timestamp: new Date().toISOString(),
          toxicityScore: response.toxicityScore,
          harmfulContent: response.harmfulContent,
          analysisDetails: response.details
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const downloadParams = {
          url: url,
          filename: `harm-detector-report-${new Date().toISOString().slice(0,10)}.json`,
          saveAs: true
        };

        chrome.downloads.download(downloadParams, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
            this.showNotification('Failed to download report');
          } else {
            this.showNotification('Report downloaded successfully');
          }
          URL.revokeObjectURL(url);
        });
      } catch (error) {
        console.error('Error communicating with content script:', error);
        this.showError(this.getConnectionErrorMessage(error));
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      this.showNotification('Failed to generate report');
    }
  }

  async checkAuthStatus() {
    const token = await this.getAuthToken();
    if (token) {
      try {
        const user = await this.fetchUserInfo(token);
        this.updateUserInfo(user);
      } catch (error) {
        console.error('Error fetching user info:', error);
        this.showLoginState();
      }
    } else {
      this.showLoginState();
    }
  }

  async getAuthToken() {
    return new Promise(resolve => {
      chrome.storage.local.get(['authToken'], result => resolve(result.authToken));
    });
  }

  async fetchUserInfo(token) {
    const response = await fetch(`${window.HarmDetectorConfig.API_ENDPOINTS.AUTH}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  }

  updateUserInfo(user) {
    this.userName.textContent = user.name;
    this.loginBtn.style.display = 'none';
  }

  showLoginState() {
    this.userName.textContent = 'Not logged in';
    this.loginBtn.style.display = 'block';
  }

  async updateCurrentPageStats() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }

      try {
        // Add retry mechanism for content script communication
        let retries = 3;
        let response = null;
        let lastError = null;
        
        while (retries > 0 && !response) {
          try {
            response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ANALYSIS' });
            if (response) break;
          } catch (error) {
            lastError = error;
            console.log(`Retry attempt ${4-retries}/3 failed:`, error);
            // Wait a short time before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
          }
        }
        
        if (!response) {
          throw lastError || new Error('No analysis data available after retries');
        }

        if (response.error) {
          throw new Error(response.error);
        }

        this.updateStats(response);
        this.updateHarmfulContentList(response.harmfulContent || []);
      } catch (error) {
        console.error('Error communicating with content script:', error);
        this.showError(this.getConnectionErrorMessage(error));
      }
    } catch (error) {
      console.error('Error getting analysis:', error);
      this.showError(error.message || 'Error analyzing page');
    }
  }

  // Helper method to provide better error messages for connection issues
  getConnectionErrorMessage(error) {
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('Receiving end does not exist')) {
      return 'Content script not loaded. Try refreshing the page or checking extension permissions.';
    } else if (errorMessage.includes('Could not establish connection')) {
      return 'Could not connect to page content. Try refreshing the page.';
    } else if (errorMessage.includes('API server not running')) {
      return 'API server not running - please start the local server at http://localhost:3000';
    }
    
    return errorMessage || 'Error connecting to page content';
  }

  showError(message) {
    try {
      // Update status indicator
      if (this.statusDot) this.statusDot.style.backgroundColor = '#dc3545';
      if (this.statusText) this.statusText.textContent = 'Error';
      
      // Update stats
      if (this.toxicityScore) this.toxicityScore.textContent = '-';
      if (this.harmfulCount) this.harmfulCount.textContent = '0';
      
      // Clear content list
      if (this.textContentList) {
        this.textContentList.innerHTML = '';
        
        // Add a more detailed error message to the harmful content section
        const errorItem = document.createElement('div');
        errorItem.className = 'content-item high';
        errorItem.innerHTML = `
          <div class="content-text">
            <strong>Error:</strong> ${message}
          </div>
          <div class="content-meta">
            <span class="content-type">Connection Issue</span>
            <span class="content-score">⚠️</span>
          </div>
          ${message.includes('API server not running') ? 
            `<div class="content-text" style="margin-top: 8px; font-size: 14px;">
              Please ensure the local API server is running at <a href="http://localhost:3000" target="_blank">http://localhost:3000</a>
            </div>` : ''}
          ${message.includes('Content script not loaded') ? 
            `<div class="content-text" style="margin-top: 8px; font-size: 14px;">
              Try refreshing the page or reopening the extension.
            </div>` : ''}
        `;
        this.textContentList.appendChild(errorItem);
      }
      
      // Show error notification
      this.showErrorNotification(message);
    } catch (error) {
      console.error('Error in showError method:', error);
      // Fallback error display
      if (this.textContentList) {
        this.textContentList.innerHTML = '<div class="error">An error occurred while displaying the error message.</div>';
      }
    }
  }
  
  showErrorNotification(message) {
    try {
      if (this.errorNotification && this.errorMessageText) {
        this.errorMessageText.textContent = message;
        this.errorNotification.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => this.hideErrorNotification(), 5000);
      }
    } catch (error) {
      console.error('Error showing error notification:', error);
    }
  }
  
  hideErrorNotification() {
    try {
      if (this.errorNotification) {
        this.errorNotification.classList.remove('show');
      }
    } catch (error) {
      console.error('Error hiding error notification:', error);
    }
  }
  
  updateStats(analysis) {
    if (!analysis) return;
    
    try {
      if (this.toxicityScore) {
        this.toxicityScore.textContent = analysis.toxicityScore ? 
          (analysis.toxicityScore * 100).toFixed(1) + '%' : '-';
      }
      
      if (this.harmfulCount) {
        this.harmfulCount.textContent = analysis.harmfulContent ? 
          analysis.harmfulContent.length : '0';
      }
      
      // Update status indicator based on toxicity score
      if (this.statusDot && this.statusText) {
        if (analysis.toxicityScore < 0.3) {
          this.statusDot.style.backgroundColor = '#4caf50';
          this.statusText.textContent = 'Safe';
        } else {
          this.statusDot.style.backgroundColor = '#dc3545';
          this.statusText.textContent = 'Issues Found';
        }
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  updateHarmfulContentList(harmfulContent) {
    if (!this.textContentList) return;
    
    try {
      this.textContentList.innerHTML = '';
      
      if (!harmfulContent || harmfulContent.length === 0) {
        this.textContentList.innerHTML = '<div class="no-content">No harmful content detected</div>';
        return;
      }

      harmfulContent.forEach(item => {
        if (!item) return;
        
        const contentElement = document.createElement('div');
        contentElement.className = `content-item ${this.getSeverityClass(item.score || 0)}`;
        contentElement.innerHTML = `
          <div class="content-text">${item.text || 'Unknown content'}</div>
          <div class="content-score">${((item.score || 0) * 100).toFixed(1)}%</div>
        `;
        this.textContentList.appendChild(contentElement);
      });
    } catch (error) {
      console.error('Error updating content list:', error);
      this.textContentList.innerHTML = '<div class="error">Error displaying content</div>';
    }
  }

  getSeverityClass(score) {
    if (score > 0.8) return 'high';
    if (score > 0.5) return 'medium';
    return 'low';
  }

  async handleReport() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }
      
      try {
        // Add retry mechanism for content script communication
        let retries = 3;
        let response = null;
        let lastError = null;
        
        while (retries > 0 && !response) {
          try {
            response = await chrome.tabs.sendMessage(tab.id, { type: 'REPORT_CONTENT' });
            if (response) break;
          } catch (error) {
            lastError = error;
            console.log(`Retry attempt ${4-retries}/3 failed:`, error);
            // Wait a short time before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
          }
        }
        
        if (!response) {
          throw lastError || new Error('No response from content script after retries');
        }
        
        // Show success message
        this.showNotification('Content reported successfully');
      } catch (error) {
        console.error('Error communicating with content script:', error);
        this.showError(this.getConnectionErrorMessage(error));
      }
    } catch (error) {
      console.error('Error reporting content:', error);
      this.showError(error.message || 'Error reporting content');
    }
  }

  openDashboard() {
    try {
      if (window.HarmDetectorConfig && window.HarmDetectorConfig.API_ENDPOINTS && window.HarmDetectorConfig.API_ENDPOINTS.AUTH) {
        chrome.tabs.create({
          url: `${window.HarmDetectorConfig.API_ENDPOINTS.AUTH}/dashboard`
        });
      } else {
        this.showError('Configuration error: API endpoints not defined');
      }
    } catch (error) {
      console.error('Error opening dashboard:', error);
      this.showError('Failed to open dashboard');
    }
  }

  async handleLogin() {
    try {
      if (window.HarmDetectorConfig && window.HarmDetectorConfig.API_ENDPOINTS && window.HarmDetectorConfig.API_ENDPOINTS.AUTH) {
        chrome.tabs.create({
          url: `${window.HarmDetectorConfig.API_ENDPOINTS.AUTH}/login`
        });
      } else {
        this.showError('Configuration error: API endpoints not defined');
      }
    } catch (error) {
      console.error('Error handling login:', error);
      this.showError('Failed to open login page');
    }
  }

  showNotification(message) {
    try {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      
      // Add to document
      document.body.appendChild(notification);
      
      // Add show class after a small delay to trigger animation
      setTimeout(() => {
        if (notification.parentNode) {
          notification.classList.add('show');
        }
      }, 10);
      
      // Remove after delay
      setTimeout(() => {
        if (notification.parentNode) {
          notification.classList.remove('show');
          // Remove from DOM after animation completes
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 3000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
}

// Initialize the popup manager when the script loads
const popupManager = new PopupManager();