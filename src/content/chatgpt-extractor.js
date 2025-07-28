// ChatGPT-specific chat extractor (based on original working code)
class ChatGPTExtractor {
  constructor() {
    this.chatHistory = [];
    this.isExtracting = false;
    this.extractionAttempts = 0;
    this.maxAttempts = 10;
    
    // Use global config for feature flags
    this.config = window.TwirlConfig || {};
    
    this.log('ChatGPT extractor loaded');
    this.init();
  }

  log(message, ...args) {
    if (this.config.debug) {
      console.log('🌀 Twirl (ChatGPT):', message, ...args);
    }
  }

  error(message, ...args) {
    console.error('🌀 Twirl Error (ChatGPT):', message, ...args);
  }

  init() {
    this.log('Starting ChatGPT initialization, readyState:', document.readyState);

    // Wait longer for ChatGPT to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.startExtraction(), 3000);
      });
    } else {
      setTimeout(() => this.startExtraction(), 3000);
    }
  }

  startExtraction() {
    this.log('Starting ChatGPT extraction process');
    this.retryExtraction();
  }

  retryExtraction() {
    try {
      this.extractionAttempts++;
      this.log(`ChatGPT extraction attempt ${this.extractionAttempts}/${this.maxAttempts}`);

      // Check if we're on a valid ChatGPT conversation page
      if (!window.location.href.includes('chat.openai.com') && !window.location.href.includes('chatgpt.com')) {
        this.log('Not on ChatGPT, skipping extraction');
        return;
      }

      // Extract existing messages
      this.extractExistingMessages();

      if (this.chatHistory.length > 0) {
        this.log(`Successfully extracted ${this.chatHistory.length} ChatGPT messages`);
        this.saveChatHistory();
        this.observeNewMessages();
      } else if (this.extractionAttempts < this.maxAttempts) {
        this.log('No ChatGPT messages found, retrying in 3 seconds...');
        setTimeout(() => this.retryExtraction(), 3000);
      } else {
        this.log('Max attempts reached, setting up ChatGPT observer anyway');
        this.observeNewMessages();
      }
    } catch (error) {
      this.error('Error during ChatGPT extraction:', error);
      if (this.extractionAttempts < this.maxAttempts) {
        setTimeout(() => this.retryExtraction(), 3000);
      }
    }
  }

  extractExistingMessages() {
    this.isExtracting = true;
    this.chatHistory = [];

    console.log('🌀 Twirl: Looking for ChatGPT messages...');

    // Updated selectors for current ChatGPT layout
    const messageSelectors = [
      '[data-testid="conversation-turn"]',
      '.group.w-full',
      '.flex.flex-col.items-start.gap-4.whitespace-pre-wrap',
      '.text-base',
      '.prose'
    ];

    let messages = [];
    for (const selector of messageSelectors) {
      messages = document.querySelectorAll(selector);
      console.log(`🌀 Twirl: ChatGPT selector "${selector}" found ${messages.length} elements`);
      if (messages.length > 0) break;
    }

    if (messages.length === 0) {
      // More aggressive fallback search
      console.log('🌀 Twirl: Trying ChatGPT fallback selectors...');
      const fallbackSelectors = [
        '[data-message-author-role]',
        '.whitespace-pre-wrap',
        'div[class*="group"]',
        'div[class*="flex"]'
      ];

      for (const selector of fallbackSelectors) {
        messages = document.querySelectorAll(selector);
        console.log(`🌀 Twirl: ChatGPT fallback selector "${selector}" found ${messages.length} elements`);
        if (messages.length > 2) break; // Need at least a few messages
      }
    }

    this.log(`Processing ${messages.length} ChatGPT message elements`);

    messages.forEach((messageElement, index) => {
      const messageText = this.extractMessageText(messageElement);
      const messageRole = this.determineMessageRole(messageElement);

      // SECURITY: Never log actual message content in production
      this.log(`ChatGPT Message ${index + 1}: Role="${messageRole}", Length=${messageText.length}`);

      if (messageText.trim() && messageText.length > 10) { // Filter out very short messages
        const formattedMessage = `${messageRole}: ${messageText}`;
        this.chatHistory.push(formattedMessage);
      }
    });

    this.log(`Extracted ${this.chatHistory.length} valid ChatGPT messages`);
    this.isExtracting = false;
  }

  extractMessageText(element) {
    // Try different methods to extract clean text
    const textSelectors = [
      '.whitespace-pre-wrap',
      '.markdown',
      '.prose',
      'p',
      '.text-base'
    ];

    for (const selector of textSelectors) {
      const textElement = element.querySelector(selector);
      if (textElement) {
        return this.cleanText(textElement.textContent || textElement.innerText);
      }
    }

    // Fallback to element's own text
    return this.cleanText(element.textContent || element.innerText);
  }

  determineMessageRole(element) {
    // Check for data attributes that indicate role
    const authorRole = element.getAttribute('data-message-author-role');
    if (authorRole === 'user') return 'User';
    if (authorRole === 'assistant') return 'AI';

    // Check for visual indicators in parent/child elements
    const hasUserIndicator = element.querySelector('[data-testid="user-message"]') ||
      element.querySelector('.bg-gray-50') ||
      element.closest('[data-message-author-role="user"]');

    const hasAssistantIndicator = element.querySelector('[data-testid="bot-message"]') ||
      element.querySelector('.gizmo-bot-avatar') ||
      element.closest('[data-message-author-role="assistant"]');

    if (hasUserIndicator) return 'User';
    if (hasAssistantIndicator) return 'AI';

    // Try to determine by position or styling
    const isUserMessage = element.classList.contains('user') ||
      element.querySelector('.justify-end') ||
      element.querySelector('.ml-auto');

    return isUserMessage ? 'User' : 'AI';
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .replace(/Copy code/g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  observeNewMessages() {
    const chatContainer = this.findChatContainer();
    if (!chatContainer) {
      // Retry after a delay if chat container not found
      setTimeout(() => this.observeNewMessages(), 2000);
      return;
    }

    const observer = new MutationObserver((mutations) => {
      let hasNewMessages = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          hasNewMessages = true;
        }
      });

      if (hasNewMessages && !this.isExtracting) {
        this.extractExistingMessages();
        this.saveChatHistory();
      }
    });

    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });
  }

  findChatContainer() {
    // Try multiple selectors for different ChatGPT layouts
    const selectors = [
      '[data-testid="conversation-turn"]',
      '.text-base',
      '[role="presentation"]',
      '.group.w-full'
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) {
        return container.closest('main') || container.parentElement;
      }
    }

    return document.querySelector('main') || document.body;
  }

  async saveChatHistory() {
    if (this.chatHistory.length === 0) {
      this.log('No ChatGPT chat history to save');
      return;
    }

    // Create chat ID based on URL and timestamp
    const chatId = this.generateChatId();
    const chatData = {
      id: chatId,
      messages: this.chatHistory,
      timestamp: Date.now(),
      source: 'ChatGPT',
      url: window.location.href,
      title: this.generateChatTitle(),
      messageCount: this.chatHistory.length,
      platform: 'chatgpt'
    };

    try {
      // Check if extension context is still valid
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime) {
        this.error('Extension context not available, skipping save');
        return;
      }

      // Check if extension context is still valid by testing runtime
      if (chrome.runtime.lastError) {
        this.error('Extension context has errors, skipping save');
        return;
      }

      try {
        // Test if we can access chrome.runtime.id (this will throw if context is invalid)
        const extensionId = chrome.runtime.id;
        if (!extensionId) {
          this.error('Extension context invalidated, skipping save');
          return;
        }
      } catch (contextError) {
        this.error('Extension context invalidated, skipping save:', contextError.message);
        return;
      }

      // Get existing chats
      const result = await chrome.storage.local.get(['twirlChats', 'twirlSelectedChat']);
      const existingChats = result.twirlChats || {};

      // Add/update this chat
      existingChats[chatId] = chatData;

      // Keep only the most recent chats to avoid storage bloat
      const maxChats = this.config.maxChats || 10;
      const chatArray = Object.values(existingChats);
      chatArray.sort((a, b) => b.timestamp - a.timestamp);
      const recentChats = chatArray.slice(0, maxChats);

      const cleanedChats = {};
      recentChats.forEach(chat => {
        cleanedChats[chat.id] = chat;
      });

      // Set this as the selected chat if none is selected
      const selectedChat = result.twirlSelectedChat || chatId;

      await chrome.storage.local.set({
        twirlChats: cleanedChats,
        twirlSelectedChat: selectedChat,
        // Keep legacy format for backward compatibility
        twirlChatHistory: chatData
      });

      this.log('ChatGPT chat history saved successfully -', chatData.messages.length, 'messages');
      this.log('Chat ID:', chatId);
      
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        this.error('Extension context invalidated, cannot save chat history. Please reload the page.');
        // Show user notification if possible
        this.showUserNotification('Twirl extension needs to be reloaded. Please refresh the page.');
      } else {
        this.error('Failed to save ChatGPT chat history:', error);
      }
    }
  }

  generateChatId() {
    // Use URL path + timestamp for unique ID
    const urlPath = window.location.pathname;
    const timestamp = Date.now();
    return `chatgpt_${urlPath}_${timestamp}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  generateChatTitle() {
    // Try to get title from first user message
    const firstUserMessage = this.chatHistory.find(msg => msg.startsWith('User:'));
    if (firstUserMessage) {
      const title = firstUserMessage.replace('User:', '').trim();
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }
    return `ChatGPT Chat - ${new Date().toLocaleDateString()}`;
  }

  showUserNotification(message) {
    // Create a visual notification for the user
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      transition: opacity 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove notification after 8 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 8000);
  }
}

// Initialize the ChatGPT extractor
new ChatGPTExtractor();