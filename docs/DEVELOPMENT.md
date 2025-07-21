# Development Guide

## Feature Flags & Configuration

Twirl uses a configuration system that allows enabling different features for development and testing.

### Available Flags

| Flag | Default | Description |
|------|---------|-------------|
| `debug` | `false` | Enable verbose console logging |
| `testMode` | `false` | Enable test scripts and features |
| `maxChats` | `10` | Maximum chats to store |
| `maxChatLength` | `10000` | Maximum characters per chat |
| `maxMessages` | `50` | Maximum messages per chat |

### Enabling Debug Mode

To enable debug logging during development:

1. **Edit the config file**: `src/config.js`
```javascript
window.TwirlConfig = {
  debug: true,        // ← Change this to true
  testMode: false,
  // ... rest of config
};
```

2. **Or enable in browser console** (temporary):
```javascript
// On any ChatGPT or Claude page
window.TwirlConfig.debug = true;
```

### Test Mode

Test mode enables additional testing features and scripts:

```javascript
// In src/config.js
window.TwirlConfig = {
  debug: true,
  testMode: true,     // ← Enable test features
  // ...
};
```

When `testMode` is enabled:
- Additional test utilities are loaded
- More verbose error reporting
- Debug buttons may appear in UI

### Development vs Production

The extension automatically detects if it's running as:
- **Development**: Unpacked extension (loaded from folder)
- **Production**: Packaged extension (from Chrome Web Store)

```javascript
// Check if in development mode
if (window.TwirlConfig.isDevelopment()) {
  console.log('Running in development mode');
}
```

### Loading Test Scripts

The test scripts in `tests/` directory are not loaded by default. To enable them:

1. **Add to manifest.json** (for specific testing):
```json
{
  "content_scripts": [
    {
      "matches": ["https://chat.openai.com/*"],
      "js": [
        "src/config.js", 
        "src/content/chatgpt.js",
        "tests/test-simple.js"  // ← Add test script
      ]
    }
  ]
}
```

2. **Or load conditionally** in your content script:
```javascript
if (this.config.testMode) {
  // Dynamically load test script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('tests/test-simple.js');
  document.head.appendChild(script);
}
```

## Console Logging Explanation

### `this.log()` vs `console.log()`

**Before (Bad Practice):**
```javascript
console.log('🌀 Twirl: Always logs this message');
console.log('🌀 Twirl: User message:', userMessage); // PRIVACY ISSUE!
```

**After (Good Practice):**
```javascript
this.log('Only logs in debug mode');
this.log('Message count:', messageCount); // Safe - no user content
this.error('Always logs errors for troubleshooting');
```

### Why We Changed This

1. **Privacy**: `console.log()` was logging actual user chat content
2. **Performance**: Excessive logging slows down the extension
3. **Production Ready**: Users don't need to see debug messages
4. **Selective Debugging**: Developers can enable logging when needed

### Logging Best Practices

| Use | When | Example |
|-----|------|---------|
| `this.log()` | Development info | `this.log('Found 5 messages')` |
| `this.error()` | Actual errors | `this.error('Failed to save:', error)` |
| `console.log()` | Never in production | ❌ Don't use directly |

## Development Workflow

1. **Setup**:
```bash
git clone <repo>
cd twirl
# No build step needed - load directly in Chrome
```

2. **Enable debug mode** in `src/config.js`

3. **Load extension** in Chrome Developer Mode

4. **Test on target sites**:
   - ChatGPT: `https://chatgpt.com`
   - Claude: `https://claude.ai`

5. **Check console** for debug messages (F12 → Console)

6. **Make changes** and reload extension

## Testing Features

### Manual Testing
- Test chat extraction on ChatGPT
- Test injection on Claude  
- Test popup interface
- Test multiple chat selection
- Test edge cases (empty chats, long chats, etc.)

### Automated Testing (Future)
The `tests/` directory is set up for future automated testing:
- Unit tests for utility functions
- Integration tests for storage
- UI tests for popup interface

## Common Development Tasks

### Adding New Feature Flags
1. Add flag to `src/config.js`
2. Use flag in content scripts: `this.config.newFlag`
3. Document in this file

### Debugging Issues
1. Enable debug mode: `window.TwirlConfig.debug = true`
2. Check console for detailed logs
3. Use browser developer tools
4. Check Extensions page for errors

### Testing Changes
1. Reload extension in `chrome://extensions/`
2. Refresh ChatGPT and Claude pages
3. Test full workflow: extract → select → inject
4. Verify no console errors

## Security Considerations for Development

- Never commit with debug mode enabled
- Never log actual user chat content
- Test with various chat lengths and content types
- Validate all user input during development
- Test extension permissions are minimal

## Performance Guidelines

- Keep debug logging lightweight
- Avoid excessive DOM queries
- Use efficient selectors
- Limit storage operations
- Test with large chat histories