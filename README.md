# 🌀 Twirl - Chat Transfer Extension

Seamlessly transfer recent conversation history from one AI assistant (e.g., ChatGPT) to another (e.g., Claude) so you can continue conversations without starting over.

## Features

- **Chat Extraction**: Automatically extracts chat history from ChatGPT
- **Smart Injection**: Auto-injects formatted history into Claude
- **Popup Interface**: View, copy, and manage chat history
- **Real-time Sync**: Continuously monitors for new messages
- **Memory Management**: Clear stored history when needed

## Installation

### For Development/Testing:

1. **Clone or download** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the `twirl` folder
5. **Pin the extension** to your toolbar for easy access

### Development Commands:

```bash
# No build process needed - load directly in Chrome
npm run dev  # Shows development instructions

# Future commands (not yet implemented)
npm test     # Run tests
npm run lint # Check code quality
```

### Missing Icons

The extension references icon files that need to be created:
- `assets/icons/icon16.png` (16x16 pixels)
- `assets/icons/icon32.png` (32x32 pixels) 
- `assets/icons/icon48.png` (48x48 pixels)
- `assets/icons/icon128.png` (128x128 pixels)

You can create these icons or use placeholder images for testing.

## How to Use

### Step 1: Extract from ChatGPT
1. Visit [ChatGPT](https://chat.openai.com)
2. Have a conversation (the extension automatically extracts messages)
3. Chat history is stored locally in your browser

### Step 2: Inject into Claude
1. Visit [Claude.ai](https://claude.ai)
2. The extension automatically injects your ChatGPT history
3. Continue your conversation seamlessly!

### Step 3: Manage History (Optional)
- Click the 🌀 **Twirl icon** in your toolbar
- View recent chat summary
- Copy history to clipboard
- Clear stored memory

## Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Content Scripts** for ChatGPT and Claude
- **Local Storage** for cross-site data persistence
- **Popup Interface** for user controls

### File Structure
```
twirl/
├── src/
│   ├── content/
│   │   ├── chatgpt.js     # ChatGPT message extraction
│   │   └── claude.js      # Claude message injection
│   └── popup/
│       ├── popup.html     # Popup interface
│       ├── popup.css      # Popup styling
│       └── popup.js       # Popup functionality
├── assets/
│   └── icons/             # Extension icons
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
├── tests/
│   └── test-simple.js     # Test utilities
├── manifest.json          # Extension configuration
├── package.json           # Project metadata
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

### Data Format
Messages are stored with speaker labels:
```
User: How does machine learning work?
AI: Machine learning is a subset of artificial intelligence...
User: Can you give me a practical example?
```

## Privacy & Security

- **Local Storage Only**: Chat history never leaves your browser
- **No External Servers**: All processing happens locally  
- **Manual Control**: You control when to clear stored data
- **Cleanup**: Automatically limits storage to 10 recent chats

For detailed security information, see [SECURITY.md](SECURITY.md).

## License

MIT License - feel free to use and modify as needed.
