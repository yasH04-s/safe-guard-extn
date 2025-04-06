class ContentAnalyzer {
  constructor() {
    this.highlightedElements = new Set();
    this.currentAnalysis = null;
  }

  // Extract visible text from the page
  extractPageText() {
    const textNodes = document.evaluate(
      '//text()[not(ancestor::script) and not(ancestor::style)]',
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    let text = '';
    for (let i = 0; i < textNodes.snapshotLength; i++) {
      const node = textNodes.snapshotItem(i);
      if (node && node.nodeValue && node.nodeValue.trim()) {
        text += node.nodeValue.trim() + ' ';
      }
    }
    return text;
  }

  // Send text for analysis
  async analyzeContent(text) {
    try {
      // Add timeout to fetch to prevent long waiting times
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(window.HarmDetectorConfig.API_ENDPOINTS.ANALYZE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ text }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      this.currentAnalysis = result;
  
      if (result.toxicityScore > window.HarmDetectorConfig.TOXICITY_THRESHOLD) {
        this.highlightHarmfulContent();
        this.showWarning();
      }
  
      // Store analysis result
      await this.storeAnalysis(result);
  
      return result;
    } catch (error) {
      console.error('Error analyzing content:', error);
      // Create a more detailed fallback analysis result when API is unavailable
      const fallbackResult = {
        toxicityScore: 0,
        harmfulContent: [],
        category: 'Unknown',
        harmfulPhrases: [],
        error: error.name === 'AbortError' ? 'Analysis timed out' : 
               error.message === 'Failed to fetch' ? 'API server not running - please start the local server at http://localhost:3000' : 
               error.message || 'Failed to analyze content'
      };
      this.currentAnalysis = fallbackResult;
  
      // Show a more helpful error message to the user
      this.showApiErrorMessage(fallbackResult.error);
  
      return fallbackResult;
    }
  }

  // Highlight harmful content
  highlightHarmfulContent() {
    this.clearHighlights();
    
    const textNodes = document.evaluate(
      '//text()[not(ancestor::script) and not(ancestor::style)]',
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    for (let i = 0; i < textNodes.snapshotLength; i++) {
      const node = textNodes.snapshotItem(i);
      if (!node) continue;
      
      const text = node.nodeValue && node.nodeValue.trim();
      
      if (text && this.currentAnalysis.harmfulPhrases.some(phrase => 
          text.toLowerCase().includes(phrase.toLowerCase()))) {
        const span = document.createElement('span');
        span.className = 'harm-detector-highlight';
        span.style.backgroundColor = this.getHighlightColor(this.currentAnalysis.toxicityScore);
        span.textContent = text;
        node.parentNode.replaceChild(span, node);
        this.highlightedElements.add(span);
      }
    }
  }

  // Clear existing highlights
  clearHighlights() {
    this.highlightedElements.forEach(element => {
      const text = element.textContent;
      const textNode = document.createTextNode(text);
      element.parentNode.replaceChild(textNode, element);
    });
    this.highlightedElements.clear();
  }

  // Get highlight color based on toxicity score
  getHighlightColor(score) {
    if (score > 0.8) return window.HarmDetectorConfig.HIGHLIGHT_COLORS.HIGH;
    if (score > 0.5) return window.HarmDetectorConfig.HIGHLIGHT_COLORS.MEDIUM;
    return window.HarmDetectorConfig.HIGHLIGHT_COLORS.LOW;
  }

  // Show warning notification
  showWarning() {
    const warning = document.createElement('div');
    warning.className = 'harm-detector-warning';
    warning.innerHTML = `
      <div class="harm-detector-warning-content">
        <span class="warning-icon">⚠️</span>
        <span class="warning-text">Harmful content detected!</span>
      </div>
    `;
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 5000);
  }

  // Show API error message - moved inside the class
  showApiErrorMessage(errorMessage) {
    const warning = document.createElement('div');
    warning.className = 'harm-detector-warning';
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #fff;
      border: 2px solid #f44336;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 9999;
    `;
    warning.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 24px;">⚠️</span>
        <div>
          <div style="font-weight: bold; color: #d32f2f;">API Connection Error</div>
          <div style="font-size: 14px; color: #666;">${errorMessage}</div>
        </div>
      </div>
    `;
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 8000);
  }

  // Store analysis result
  async storeAnalysis(result) {
    try {
      await fetch(window.HarmDetectorConfig.API_ENDPOINTS.STORE_ANALYSIS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          url: window.location.href,
          timestamp: new Date().toISOString(),
          analysis: result
        })
      });
    } catch (error) {
      console.error('Error storing analysis:', error);
    }
  }

  // Get authentication token
  async getAuthToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken'], (result) => {
        resolve(result.authToken);
      });
    });
  }
}

// Initialize and start content analysis
const analyzer = new ContentAnalyzer();

// Set up message listener immediately to ensure it's always available
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_ANALYSIS') {
    if (analyzer.currentAnalysis) {
      const harmfulContent = [];
      analyzer.highlightedElements.forEach(element => {
        harmfulContent.push({
          text: element.textContent,
          toxicityScore: analyzer.currentAnalysis.toxicityScore,
          category: analyzer.currentAnalysis.category
        });
      });
      
      sendResponse({
        toxicityScore: analyzer.currentAnalysis.toxicityScore,
        harmfulContent: harmfulContent,
        error: analyzer.currentAnalysis.error || null,
        details: {
          textLength: analyzer.extractPageText().length,
          analyzedAt: new Date().toISOString()
        }
      });
    } else {
      // If no analysis is available yet, return a pending state
      sendResponse({
        toxicityScore: 0,
        harmfulContent: [],
        error: 'Analysis not completed yet',
        details: {
          textLength: analyzer.extractPageText().length,
          analyzedAt: new Date().toISOString()
        }
      });
    }
    return true;
  } else if (request.type === 'REPORT_CONTENT') {
    // Handle content reporting
    try {
      // If we have analysis results, send them to the reporting endpoint
      if (analyzer.currentAnalysis) {
        // In a real implementation, this would send the report to a backend service
        console.log('Reporting harmful content:', analyzer.currentAnalysis);
        
        // Simulate successful reporting
        sendResponse({ success: true });
      } else {
        throw new Error('No analysis available to report');
      }
    } catch (error) {
      console.error('Error reporting content:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  return true;
});

// Analyze content when page loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const text = analyzer.extractPageText();
    await analyzer.analyzeContent(text);
  } catch (error) {
    console.error('Error during initial content analysis:', error);
    // Ensure we still have a valid analysis object even if analysis fails
    if (!analyzer.currentAnalysis) {
      analyzer.currentAnalysis = {
        toxicityScore: 0,
        harmfulContent: [],
        category: 'Unknown',
        harmfulPhrases: [],
        error: error.message || 'Failed to analyze content'
      };
    }
  }
});

// Analyze content when URL changes (for single-page applications)
let lastUrl = location.href;
new MutationObserver(async () => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    try {
      const text = analyzer.extractPageText();
      await analyzer.analyzeContent(text);
    } catch (error) {
      console.error('Error during content analysis after URL change:', error);
    }
  }
}).observe(document, { subtree: true, childList: true });