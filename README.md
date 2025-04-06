# Harm Detection Chrome Extension

A powerful Chrome extension that helps users identify and protect against harmful content across the web. The extension uses advanced content analysis to detect potentially harmful text, images, audio, and video content in real-time.

## Features

- 🔍 **Real-time Content Analysis**: Automatically analyzes web page content as you browse
- 📊 **Multi-modal Analysis**: Supports text, image, audio, and video content analysis
- 🎯 **Harmful Content Detection**: Identifies potentially harmful content with toxicity scoring
- 🔔 **Smart Notifications**: Get instant alerts when harmful content is detected
- 📈 **Analytics Dashboard**: Track and analyze harmful content patterns
- 🔒 **Privacy Focused**: All analysis is done locally with optional cloud storage
- 🎨 **Visual Indicators**: Highlights harmful content with color-coded warnings
- 📱 **Cross-platform**: Works across different websites and platforms

## Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/harm-detector)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Development)
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/harm-detection.git
   cd harm-detection
   ```

2. Install dependencies:
   ```bash
   # Install extension dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   ```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `harm-detection` directory

## Configuration

The extension can be configured through the `config.js` file:

```javascript
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
  }
};
```

## Usage

1. **Basic Analysis**:
   - The extension automatically analyzes content as you browse
   - Harmful content is highlighted with color-coded indicators
   - Click the extension icon to view detailed analysis

2. **Manual Analysis**:
   - Click the extension icon
   - Select the content type (text, image, audio, video)
   - View the analysis results and recommendations

3. **Reporting**:
   - Click the "Report" button to flag harmful content
   - Add additional context to your report
   - Submit for review

4. **Dashboard**:
   - Access your analysis history
   - View statistics and trends
   - Export reports

## Development

### Project Structure
```
harm-detection/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js
├── config.js
├── styles.css
├── backend/
│   ├── server.js
│   ├── db.js
│   └── package.json
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Building for Production
```bash
npm run build
```

### Running Tests
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

- All content analysis is performed locally by default
- Cloud storage is optional and requires user authentication
- No personal data is collected without consent
- Regular security audits are performed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all contributors who have helped shape this project
- Special thanks to the open-source community for their invaluable tools and libraries
- Inspired by the need for better content moderation tools

## Support

For support, please:
1. Check the [documentation](docs/README.md)
2. Search [existing issues](https://github.com/yourusername/harm-detection/issues)
3. Create a new issue if needed

## Roadmap

- [ ] Enhanced image analysis using AI
- [ ] Audio content transcription and analysis
- [ ] Video frame analysis
- [ ] Community-driven content moderation
- [ ] API for third-party integrations
- [ ] Mobile app version
