// Universal chat extractor for multiple AI platforms
class UniversalChatExtractor {
  constructor() {
    this.chatHistory = [];
    this.isExtracting = false;
    this.extractionAttempts = 0;
    this.maxAttempts = 10;
    this.platform = this.detectPlatform();
    
    // Use global config for feature flags
    this.config = window.TwirlConfig || {};
    
    this.log(`Universal extractor loaded for platform: ${this.platform}`);
    
    if (this.platform !== 'unknown') {
      this.init();
    }
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    const url = window.location.href;
    
    if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) {
      return 'chatgpt';
    } else if (hostname.includes('claude.ai')) {
      return 'claude';
    } else if (hostname.includes('perplexity.ai')) {
      return 'perplexity';
    } else if (hostname.includes('gemini.google.com') || hostname.includes('bard.google.com')) {
      return 'gemini';
    } else if (hostname.includes('poe.com')) {
      return 'poe';
    } else if (hostname.includes('character.ai')) {
      return 'character';
    }
    
    return 'unknown';
  }

  log(message, ...args) {
    if (this.config.debug) {
      console.log('🌀 Twirl:', message, ...args);
    }
  }

  error(message, ...args) {
    console.error('🌀 Twirl Error:', message, ...args);
  }

  init() {
    this.log('Starting initialization, readyState:', document.readyState);

    // Wait for page to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.startExtraction(), 3000);
      });
    } else {
      setTimeout(() => this.startExtraction(), 3000);
    }
  }

  startExtraction() {
    this.log('Starting extraction process');
    this.retryExtraction();
  }

  retryExtraction() {
    try {
      this.extractionAttempts++;
      this.log(`Extraction attempt ${this.extractionAttempts}/${this.maxAttempts}`);

      // Extract existing messages using platform-specific logic
      this.extractExistingMessages();

      if (this.chatHistory.length > 0) {
        this.log(`Successfully extracted ${this.chatHistory.length} messages`);
        this.saveChatHistory();
        this.observeNewMessages();
      } else if (this.extractionAttempts < this.maxAttempts) {
        this.log('No messages found, retrying in 3 seconds...');
        setTimeout(() => this.retryExtraction(), 3000);
      } else {
        this.log('Max attempts reached, setting up observer anyway');
        this.observeNewMessages();
      }
    } catch (error) {
      this.error('Error during extraction:', error);
      if (this.extractionAttempts < this.maxAttempts) {
        setTimeout(() => this.retryExtraction(), 3000);
      }
    }
  }

  extractExistingMessages() {
    this.isExtracting = true;
    this.chatHistory = [];

    this.log(`Extracting messages for platform: ${this.platform}`);

    switch (this.platform) {
      case 'chatgpt':
        this.extractChatGPTMessages();
        break;
      case 'claude':
        this.extractClaudeMessages();
        break;
      case 'perplexity':
        this.extractPerplexityMessages();
        break;
      case 'gemini':
        this.extractGeminiMessages();
        break;
      case 'poe':
        this.extractPoeMessages();
        break;
      case 'character':
        this.extractCharacterMessages();
        break;
      default:
        this.log('Unknown platform, attempting generic extraction');
        this.extractGenericMessages();
    }

    this.log(`Extracted ${this.chatHistory.length} valid messages`);
    this.isExtracting = false;
  }

  extractChatGPTMessages() {
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
      if (messages.length > 0) break;
    }

    this.processMessages(messages, (element) => {
      const authorRole = element.getAttribute('data-message-author-role');
      if (authorRole === 'user') return 'User';
      if (authorRole === 'assistant') return 'AI';
      
      const hasUserIndicator = element.querySelector('[data-testid="user-message"]') ||
        element.querySelector('.bg-gray-50') ||
        element.closest('[data-message-author-role="user"]');
      
      return hasUserIndicator ? 'User' : 'AI';
    });
  }

  extractClaudeMessages() {
    const messageSelectors = [
      '[data-testid="message"]',
      '.font-claude-message',
      '.prose',
      'div[class*="message"]',
      '.whitespace-pre-wrap'
    ];

    let messages = [];
    for (const selector of messageSelectors) {
      messages = document.querySelectorAll(selector);
      if (messages.length > 0) break;
    }

    this.processMessages(messages, (element) => {
      // Claude typically alternates messages, check for user indicators
      const isUserMessage = element.closest('[data-is-author="true"]') ||
        element.querySelector('.bg-claude-user') ||
        element.classList.contains('user-message');
      
      return isUserMessage ? 'User' : 'AI';
    });
  }

  extractPerplexityMessages() {
    const messageSelectors = [
      '.prose',
      '[data-testid="message"]',
      '.message',
      '.whitespace-pre-wrap'
    ];

    let messages = [];
    for (const selector of messageSelectors) {
      messages = document.querySelectorAll(selector);
      if (messages.length > 0) break;
    }

    this.processMessages(messages, (element) => {
      // Perplexity has distinct styling for user vs AI messages
      const isUserMessage = element.closest('.bg-blue-50') ||
        element.closest('[data-testid="user-message"]') ||
        element.classList.contains('user');
      
      return isUserMessage ? 'User' : 'AI';
    });
  }

  extractGeminiMessages() {
    const messageSelectors = [
      '[data-test-id="message"]',
      '.message-content',
      '.conversation-turn',
      '.prose'
    ];

    let messages = [];
    for (const selector of messageSelectors) {
      messages = document.querySelectorAll(selector);
      if (messages.length > 0) break;
    }

    this.processMessages(messages, (element) => {
      // Gemini uses different classes for user vs assistant
      const isUserMessage = element.closest('.user-turn') ||
        element.classList.contains('user-message') ||
        element.closest('[data-test-id="user-message"]');
      
      return isUserMessage ? 'User' : 'AI';
    });
  }

  extractPoeMessages() {
    const messageSelectors = [
      '[class*="Message_messageRow"]',
      '.Message_botMessageBubble',
      '.Message_humanMessageBubble',
      '.break-words'
    ];

    let messages = [];
    for (const selector of messageSelectors) {
      messages = document.querySelectorAll(selector);
      if (messages.length > 0) break;
    }

    this.processMessages(messages, (element) => {
      const isUserMessage = element.classList.contains('Message_humanMessageBubble') ||
        element.closest('.Message_humanMessageBubble');
      
      return isUserMessage ? 'User' : 'AI';
    });
  }

  extractCharacterMessages() {
    const messageSelectors = [
      '[data-testid="message"]',
      '.msg',
      '.message'
    ];

    let messages = [];
    for (const selector of messageSelectors) {
      messages = document.querySelectorAll(selector);
      if (messages.length > 0) break;
    }

    this.processMessages(messages, (element) => {
      const isUserMessage = element.classList.contains('user-msg') ||
        element.closest('.user-msg');
      
      return isUserMessage ? 'User' : 'AI';
    });
  }

  extractGenericMessages() {
    // Generic fallback for unknown platforms
    const commonSelectors = [
      '.message',
      '.chat-message',
      '.conversation-turn',
      '.prose',
      '[role="article"]',
      '.whitespace-pre-wrap'
    ];

    let messages = [];
    for (const selector of commonSelectors) {
      messages = document.querySelectorAll(selector);
      if (messages.length > 2) break; // Need at least a few messages
    }

    this.processMessages(messages, (element) => {
      // Generic role detection based on common patterns
      const text = element.textContent || '';
      const classes = element.className || '';
      
      if (classes.includes('user') || classes.includes('human')) {
        return 'User';
      }
      if (classes.includes('bot') || classes.includes('ai') || classes.includes('assistant')) {
        return 'AI';
      }
      
      // Alternate between User and AI if no clear indicators
      const index = Array.from(messages).indexOf(element);
      return index % 2 === 0 ? 'User' : 'AI';
    });
  }

  processMessages(messages, roleDetector) {
    messages.forEach((messageElement, index) => {
      const messageText = this.extractMessageText(messageElement);
      const messageRole = roleDetector(messageElement);

      this.log(`Message ${index + 1}: Role="${messageRole}", Length=${messageText.length}`);

      if (messageText.trim() && messageText.length > 10) {
        const formattedMessage = `${messageRole}: ${messageText}`;
        this.chatHistory.push(formattedMessage);
      }
    });
  }

  extractMessageText(element) {
    const textSelectors = [
      '.whitespace-pre-wrap',
      '.markdown',
      '.prose',
      'p',
      '.text-base',
      '.message-content'
    ];

    for (const selector of textSelectors) {
      const textElement = element.querySelector(selector);
      if (textElement) {
        return this.cleanText(textElement.textContent || textElement.innerText);
      }
    }

    return this.cleanText(element.textContent || element.innerText);
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
    const containerSelectors = [
      'main',
      '[data-testid="conversation"]',
      '.conversation',
      '.chat-container',
      '.messages-container',
      'body'
    ];

    for (const selector of containerSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        return container;
      }
    }

    return document.body;
  }

  async saveChatHistory() {
    if (this.chatHistory.length === 0) {
      this.log('No chat history to save');
      return;
    }

    const chatId = this.generateChatId();
    const chatData = {
      id: chatId,
      messages: this.chatHistory,
      timestamp: Date.now(),
      source: this.getPlatformDisplayName(),
      url: window.location.href,
      title: this.generateChatTitle(),
      messageCount: this.chatHistory.length,
      platform: this.platform
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

      this.log('Chat history saved successfully -', chatData.messages.length, 'messages');
      this.log('Chat ID:', chatId);
      
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        this.error('Extension context invalidated, cannot save chat history. Please reload the page.');
        this.showUserNotification('Twirl extension needs to be reloaded. Please refresh the page.');
      } else {
        this.error('Failed to save chat history:', error);
      }
    }
  }

  getPlatformDisplayName() {
    const platformNames = {
      'chatgpt': 'ChatGPT',
      'claude': 'Claude',
      'perplexity': 'Perplexity',
      'gemini': 'Gemini',
      'poe': 'Poe',
      'character': 'Character.AI'
    };
    
    return platformNames[this.platform] || 'Unknown Platform';
  }

  generateChatId() {
    const urlPath = window.location.pathname;
    const timestamp = Date.now();
    return `${this.platform}_${urlPath}_${timestamp}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  generateChatTitle() {
    const firstUserMessage = this.chatHistory.find(msg => msg.startsWith('User:'));
    if (firstUserMessage) {
      const title = firstUserMessage.replace('User:', '').trim();
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }
    return `Chat from ${this.getPlatformDisplayName()} - ${new Date().toLocaleDateString()}`;
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

// Initialize the universal extractor
new UniversalChatExtractor();