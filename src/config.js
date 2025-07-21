// Configuration and feature flags for Twirl extension
window.TwirlConfig = {
  // Development flags
  debug: false,           // Enable debug logging
  testMode: false,        // Enable test scripts
  
  // Production settings
  maxChats: 10,          // Maximum chats to store
  maxChatLength: 10000,  // Maximum characters per chat
  maxMessages: 50,       // Maximum messages per chat
  
  // Development mode detection
  isDevelopment: () => {
    // Check if running in development (unpacked extension)
    return chrome.runtime && chrome.runtime.getManifest && 
           chrome.runtime.getManifest().update_url === undefined;
  },
  
  // Initialize config based on environment
  init: () => {
    if (window.TwirlConfig.isDevelopment()) {
      console.log('🌀 Twirl: Development mode detected');
      // Optionally enable debug in development
      // window.TwirlConfig.debug = true;
    }
  }
};

// Initialize on load
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.TwirlConfig.init();
}