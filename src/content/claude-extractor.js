// Claude-specific chat extractor
class ClaudeExtractor {
  constructor() {
    this.chatHistory = [];
    this.isExtracting = false;
    this.extractionAttempts = 0;
    this.maxAttempts = 10;
    
    // Use global config for feature flags
    this.config = window.TwirlConfig || {};
    
    this.log('Claude extractor loaded');
    this.init();
  }

  log(message, ...args) {
    if (this.config.debug) {
      console.log('🌀 Twirl (Claude):', message, ...args);
    }
  }

  error(message, ...args) {
    console.error('🌀 Twirl Error (Claude):', message, ...args);
  }

  init() {
    this.log('Starting Claude initialization, readyState:', document.readyState);

    // Wait for Claude to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.startExtraction(), 2000);
      });
    } else {
      setTimeout(() => this.startExtraction(), 2000);
    }
  }

  startExtraction() {
    this.log('Starting Claude extraction process');
    this.retryExtraction();
  }

  retryExtraction() {
    try {
      this.extractionAttempts++;
      this.log(`Claude extraction attempt ${this.extractionAttempts}/${this.maxAttempts}`);

      // Extract existing messages
      this.extractExistingMessages();

      if (this.chatHistory.length > 0) {
        this.log(`Successfully extracted ${this.chatHistory.length} Claude messages`);
        this.saveChatHistory();
        this.observeNewMessages();
      } else if (this.extractionAttempts < this.maxAttempts) {
        this.log('No Claude messages found, retrying in 3 seconds...');
        setTimeout(() => this.retryExtraction(), 3000);
      } else {
        this.log('Max attempts reached, setting up Claude observer anyway');
        this.observeNewMessages();
      }
    } catch (error) {
      this.error('Error during Claude extraction:', error);
      if (this.extractionAttempts < this.maxAttempts) {
        setTimeout(() => this.retryExtraction(), 3000);
      }
    }
  }

  extractExistingMessages() {
    this.isExtracting = true;
    this.chatHistory = [];

    this.log('Looking for Claude messages...');

    // Claude-specific selectors - more targeted for Claude's structure
    const messageSelectors = [
      '[data-testid="conversation"] > div > div', // Main conversation container
      '.font-claude-message', // Claude-specific message class
      '[role="article"]', // Claude uses articles for messages
      '.prose.dark\\:prose-invert', // Claude's prose styling
      'div[class*="font-user-message"]', // User message class
      'div[class*="font-claude-message"]', // Claude message class
    ];

    let messages = [];
    for (const selector of messageSelectors) {
      try {
        messages = document.querySelectorAll(selector);
        this.log(`Claude selector "${selector}" found ${messages.length} elements`);
        if (messages.length > 0) break;
      } catch (e) {
        this.log(`Selector "${selector}" failed:`, e.message);
      }
    }

    // Fallback: look for any div that might contain conversation
    if (messages.length === 0) {
      this.log('Trying Claude fallback selectors...');
      const fallbackSelectors = [
        'main div[class*="flex"][class*="flex-col"]',
        'div[class*="whitespace-pre-wrap"]',
        'div[class*="prose"]'
      ];

      for (const selector of fallbackSelectors) {
        try {
          messages = document.querySelectorAll(selector);
          this.log(`Claude fallback selector "${selector}" found ${messages.length} elements`);
          if (messages.length > 2) break; // Need at least a few messages
        } catch (e) {
          this.log(`Fallback selector "${selector}" failed:`, e.message);
        }
      }
    }

    this.log(`Processing ${messages.length} Claude message elements`);

    messages.forEach((messageElement, index) => {
      const messageText = this.extractMessageText(messageElement);
      const messageRole = this.determineMessageRole(messageElement, index);

      this.log(`Claude Message ${index + 1}: Role="${messageRole}", Length=${messageText.length}`);

      if (messageText.trim() && messageText.length > 10) {
        const formattedMessage = `${messageRole}: ${messageText}`;
        this.chatHistory.push(formattedMessage);
      }
    });

    this.log(`Extracted ${this.chatHistory.length} valid Claude messages`);
    this.isExtracting = false;
  }

  extractMessageText(element) {
    // Claude-specific text extraction
    const textSelectors = [
      '.prose', // Claude's main text container
      '.whitespace-pre-wrap',
      'p',
      'div[class*="text-"]',
      '.font-claude-message',
      '.font-user-message'
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
    // Check Claude-specific attributes
    const elementClasses = element.className || '';
    const elementHTML = element.innerHTML || '';

    // Check for user-specific indicators
    if (elementClasses.includes('font-user-message') || 
        elementClasses.includes('user-message') ||
        element.closest('[data-is-author="true"]')) {
      return 'User';
    }

    // Check for Claude-specific indicators
    if (elementClasses.includes('font-claude-message') || 
        elementClasses.includes('claude-message') ||
        elementHTML.includes('Claude') ||
        element.closest('[data-is-author="false"]')) {
      return 'AI';
    }

    // Look for visual patterns in Claude
    const hasUserStyling = elementClasses.includes('bg-') && 
                          (elementClasses.includes('slate') || elementClasses.includes('gray'));
    
    if (hasUserStyling) return 'User';

    // Claude typically alternates, so use index as fallback
    return index % 2 === 0 ? 'User' : 'AI';
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
    // Claude-specific container selectors
    const selectors = [
      '[data-testid="conversation"]',
      'main',
      'div[class*="conversation"]',
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
      this.log('No Claude chat history to save');
      return;
    }

    const chatId = this.generateChatId();
    const chatData = {
      id: chatId,
      messages: this.chatHistory,
      timestamp: Date.now(),
      source: 'Claude',
      url: window.location.href,
      title: this.generateChatTitle(),
      messageCount: this.chatHistory.length,
      platform: 'claude'
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

      this.log('Claude chat history saved successfully -', chatData.messages.length, 'messages');
      this.log('Chat ID:', chatId);
      
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        this.error('Extension context invalidated, cannot save chat history. Please reload the page.');
        this.showUserNotification('Twirl extension needs to be reloaded. Please refresh the page.');
      } else {
        this.error('Failed to save Claude chat history:', error);
      }
    }
  }

  generateChatId() {
    const urlPath = window.location.pathname;
    const timestamp = Date.now();
    return `claude_${urlPath}_${timestamp}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  generateChatTitle() {
    const firstUserMessage = this.chatHistory.find(msg => msg.startsWith('User:'));
    if (firstUserMessage) {
      const title = firstUserMessage.replace('User:', '').trim();
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }
    return `Claude Chat - ${new Date().toLocaleDateString()}`;
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

// Initialize the Claude extractor
new ClaudeExtractor();