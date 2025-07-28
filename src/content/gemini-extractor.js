// Gemini-specific chat extractor
class GeminiExtractor {
  constructor() {
    this.chatHistory = [];
    this.isExtracting = false;
    this.extractionAttempts = 0;
    this.maxAttempts = 10;
    
    // Use global config for feature flags
    this.config = window.TwirlConfig || {};
    
    this.log('Gemini extractor loaded');
    this.init();
  }

  log(message, ...args) {
    if (this.config.debug) {
      console.log('🌀 Twirl (Gemini):', message, ...args);
    }
  }

  error(message, ...args) {
    console.error('🌀 Twirl Error (Gemini):', message, ...args);
  }

  init() {
    this.log('Starting Gemini initialization, readyState:', document.readyState);

    // Wait for Gemini to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.startExtraction(), 3000);
      });
    } else {
      setTimeout(() => this.startExtraction(), 3000);
    }
  }

  startExtraction() {
    this.log('Starting Gemini extraction process');
    this.retryExtraction();
  }

  retryExtraction() {
    try {
      this.extractionAttempts++;
      this.log(`Gemini extraction attempt ${this.extractionAttempts}/${this.maxAttempts}`);

      // Extract existing messages
      this.extractExistingMessages();

      if (this.chatHistory.length > 0) {
        this.log(`Successfully extracted ${this.chatHistory.length} Gemini messages`);
        this.saveChatHistory();
        this.observeNewMessages();
      } else if (this.extractionAttempts < this.maxAttempts) {
        this.log('No Gemini messages found, retrying in 3 seconds...');
        setTimeout(() => this.retryExtraction(), 3000);
      } else {
        this.log('Max attempts reached, setting up Gemini observer anyway');
        this.observeNewMessages();
      }
    } catch (error) {
      this.error('Error during Gemini extraction:', error);
      if (this.extractionAttempts < this.maxAttempts) {
        setTimeout(() => this.retryExtraction(), 3000);
      }
    }
  }

  extractExistingMessages() {
    this.isExtracting = true;
    this.chatHistory = [];

    this.log('Looking for Gemini messages...');

    // Gemini-specific selectors
    const messageSelectors = [
      '[data-test-id="message"]',
      '[data-test-id="user-message"]',
      '[data-test-id="model-message"]',
      '.message-content',
      '.conversation-turn',
      '.user-turn',
      '.model-turn',
      'model-response',
      '.response-container'
    ];

    let messages = [];
    for (const selector of messageSelectors) {
      try {
        messages = document.querySelectorAll(selector);
        this.log(`Gemini selector "${selector}" found ${messages.length} elements`);
        if (messages.length > 0) break;
      } catch (e) {
        this.log(`Selector "${selector}" failed:`, e.message);
      }
    }

    // Fallback: look for typical Gemini patterns
    if (messages.length === 0) {
      this.log('Trying Gemini fallback selectors...');
      const fallbackSelectors = [
        'div[class*="conversation"]',
        'div[class*="message"]',
        'div[class*="turn"]',
        '.ql-editor', // Rich text editor content
        'div[jsaction]', // Gemini uses jsaction attributes
        'main div[class*="flex"]'
      ];

      for (const selector of fallbackSelectors) {
        try {
          messages = document.querySelectorAll(selector);
          this.log(`Gemini fallback selector "${selector}" found ${messages.length} elements`);
          if (messages.length > 2) break;
        } catch (e) {
          this.log(`Fallback selector "${selector}" failed:`, e.message);
        }
      }
    }

    this.log(`Processing ${messages.length} Gemini message elements`);

    messages.forEach((messageElement, index) => {
      const messageText = this.extractMessageText(messageElement);
      const messageRole = this.determineMessageRole(messageElement, index);

      this.log(`Gemini Message ${index + 1}: Role="${messageRole}", Length=${messageText.length}`);

      if (messageText.trim() && messageText.length > 10) {
        const formattedMessage = `${messageRole}: ${messageText}`;
        this.chatHistory.push(formattedMessage);
      }
    });

    this.log(`Extracted ${this.chatHistory.length} valid Gemini messages`);
    this.isExtracting = false;
  }

  extractMessageText(element) {
    // Gemini-specific text extraction
    const textSelectors = [
      '.ql-editor',
      '.message-content',
      'div[class*="text-"]',
      'p',
      'span',
      '.markdown-body'
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

  determineMessageRole(element, index) {
    const elementClasses = element.className || '';
    const elementTestId = element.getAttribute('data-test-id') || '';
    const elementHTML = element.innerHTML || '';

    // Check for Gemini-specific user indicators
    if (elementTestId.includes('user-message') || 
        elementClasses.includes('user-turn') ||
        elementClasses.includes('user-message') ||
        element.closest('[data-test-id="user-message"]') ||
        element.closest('.user-turn')) {
      return 'User';
    }

    // Check for Gemini-specific AI indicators
    if (elementTestId.includes('model-message') || 
        elementClasses.includes('model-turn') ||
        elementClasses.includes('model-response') ||
        elementHTML.includes('Gemini') ||
        element.closest('[data-test-id="model-message"]') ||
        element.closest('.model-turn')) {
      return 'AI';
    }

    // Look for visual patterns in Gemini
    const hasUserStyling = elementClasses.includes('bg-blue') || 
                          elementClasses.includes('user');
    
    if (hasUserStyling) return 'User';

    // Gemini typically alternates, starting with user
    return index % 2 === 0 ? 'User' : 'AI';
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .replace(/Copy code/g, '')
      .replace(/View other drafts/g, '') // Remove Gemini's "View other drafts"
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  observeNewMessages() {
    const chatContainer = this.findChatContainer();
    if (!chatContainer) {
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
    // Gemini-specific container selectors
    const selectors = [
      'main',
      '[data-test-id="conversation"]',
      'div[class*="conversation"]',
      'div[jscontroller]', // Gemini uses jscontroller
      'body'
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) {
        return container;
      }
    }

    return document.body;
  }

  async saveChatHistory() {
    if (this.chatHistory.length === 0) {
      this.log('No Gemini chat history to save');
      return;
    }

    const chatId = this.generateChatId();
    const chatData = {
      id: chatId,
      messages: this.chatHistory,
      timestamp: Date.now(),
      source: 'Gemini',
      url: window.location.href,
      title: this.generateChatTitle(),
      messageCount: this.chatHistory.length,
      platform: 'gemini'
    };

    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime) {
        this.error('Extension context not available, skipping save');
        return;
      }

      try {
        const extensionId = chrome.runtime.id;
        if (!extensionId) {
          this.error('Extension context invalidated, skipping save');
          return;
        }
      } catch (contextError) {
        this.error('Extension context invalidated, skipping save:', contextError.message);
        return;
      }

      const result = await chrome.storage.local.get(['twirlChats', 'twirlSelectedChat']);
      const existingChats = result.twirlChats || {};

      existingChats[chatId] = chatData;

      const maxChats = this.config.maxChats || 10;
      const chatArray = Object.values(existingChats);
      chatArray.sort((a, b) => b.timestamp - a.timestamp);
      const recentChats = chatArray.slice(0, maxChats);

      const cleanedChats = {};
      recentChats.forEach(chat => {
        cleanedChats[chat.id] = chat;
      });

      const selectedChat = result.twirlSelectedChat || chatId;

      await chrome.storage.local.set({
        twirlChats: cleanedChats,
        twirlSelectedChat: selectedChat,
        twirlChatHistory: chatData
      });

      this.log('Gemini chat history saved successfully -', chatData.messages.length, 'messages');
      this.log('Chat ID:', chatId);
      
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        this.error('Extension context invalidated, cannot save chat history. Please reload the page.');
        this.showUserNotification('Twirl extension needs to be reloaded. Please refresh the page.');
      } else {
        this.error('Failed to save Gemini chat history:', error);
      }
    }
  }

  generateChatId() {
    const urlPath = window.location.pathname;
    const timestamp = Date.now();
    return `gemini_${urlPath}_${timestamp}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  generateChatTitle() {
    const firstUserMessage = this.chatHistory.find(msg => msg.startsWith('User:'));
    if (firstUserMessage) {
      const title = firstUserMessage.replace('User:', '').trim();
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }
    return `Gemini Chat - ${new Date().toLocaleDateString()}`;
  }

  showUserNotification(message) {
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

// Initialize the Gemini extractor
new GeminiExtractor();