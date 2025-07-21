// Content script for Claude chat injection
class ClaudeInjector {
  constructor() {
    this.injected = false;
    this.attempts = 0;
    this.maxAttempts = 20;
    
    // Use global config for feature flags
    this.config = window.TwirlConfig || {};
    
    this.log('Claude content script loaded');
    this.init();
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
    this.log('Claude init, readyState:', document.readyState);
    
    // Wait for page to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startInjection());
    } else {
      this.startInjection();
    }
  }

  async startInjection() {
    this.log('Starting Claude injection process');
    
    // Check if we have chat history to inject
    const chatData = await this.getChatHistory();
    
    if (!chatData || !chatData.messages || chatData.messages.length === 0) {
      this.log('No chat history found to inject');
      return;
    }

    this.log(`Found ${chatData.messages.length} messages from ${chatData.source}`);
    
    // Wait for Claude's input field to be available
    this.waitForInputField(chatData);
  }

  async getChatHistory() {
    try {
      const result = await chrome.storage.local.get(['twirlChats', 'twirlSelectedChat', 'twirlChatHistory']);
      
      // Use selected chat if available
      if (result.twirlChats && result.twirlSelectedChat && result.twirlChats[result.twirlSelectedChat]) {
        this.log('Using selected chat:', result.twirlSelectedChat);
        return result.twirlChats[result.twirlSelectedChat];
      }
      
      // Fallback to most recent chat
      if (result.twirlChats && Object.keys(result.twirlChats).length > 0) {
        const chats = Object.values(result.twirlChats);
        const mostRecent = chats.sort((a, b) => b.timestamp - a.timestamp)[0];
        this.log('Using most recent chat:', mostRecent.id);
        return mostRecent;
      }
      
      // Fallback to legacy format
      if (result.twirlChatHistory) {
        this.log('Using legacy chat format');
        return result.twirlChatHistory;
      }
      
      return null;
    } catch (error) {
      this.error('Failed to get chat history', error);
      return null;
    }
  }

  waitForInputField(chatData, attempts = 0) {
    if (!chatData || !chatData.messages) {
      this.error('Invalid chat data provided to waitForInputField');
      return;
    }

    this.attempts = attempts;
    this.log(`Looking for Claude input field, attempt ${attempts + 1}/${this.maxAttempts}`);
    
    if (attempts >= this.maxAttempts) {
      this.log('Could not find Claude input field after maximum attempts');
      return;
    }

    const inputField = this.findInputField();
    
    if (inputField && !this.injected) {
      this.log('Found input field, injecting chat history');
      this.injectChatHistory(inputField, chatData);
    } else {
      this.log('Input field not found, retrying in 1 second...');
      setTimeout(() => this.waitForInputField(chatData, attempts + 1), 1000);
    }
  }

  findInputField() {
    this.log('Searching for input field...');
    
    // Find contenteditable divs (Claude's current input method)
    const editableDivs = document.querySelectorAll('div[contenteditable="true"]');
    this.log(`Found ${editableDivs.length} contenteditable divs`);
    
    for (const div of editableDivs) {
      const rect = div.getBoundingClientRect();
      const style = window.getComputedStyle(div);
      
      this.log(`Checking div - width: ${rect.width}, height: ${rect.height}`);
      
      // Claude's input field should be reasonably sized and visible
      if (rect.width > 100 && rect.height > 5 && 
          style.display !== 'none' && style.visibility !== 'hidden') {
        this.log('Found suitable input field!');
        return div;
      }
    }

    this.log('No suitable input field found');
    return null;
  }

  injectChatHistory(inputField, chatData) {
    if (this.injected) {
      this.log('Already injected, skipping');
      return;
    }

    if (!inputField || !chatData || !chatData.messages) {
      this.error('Invalid parameters for injection');
      return;
    }

    let formattedHistory = this.formatChatHistory(chatData);
    
    try {
      this.log('Injecting formatted history into input field');
      
      // Sanitize the formatted history before injection
      const maxLength = this.config.maxChatLength || 10000;
      if (formattedHistory.length > maxLength) {
        this.log('Chat history too long, truncating');
        formattedHistory = formattedHistory.substring(0, maxLength) + '\n\n[Truncated due to length]';
      }
      
      // For contenteditable divs
      inputField.textContent = formattedHistory;
      
      // Trigger input events to make Claude recognize the content
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Focus the input field
      inputField.focus();

      // Move cursor to end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(inputField);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      this.injected = true;
      this.log('Successfully injected chat history into Claude');

      // Show visual notification
      this.showVisualNotification(chatData.messages.length);

    } catch (error) {
      this.error('Failed to inject chat history', error);
    }
  }

  formatChatHistory(chatData) {
    if (!chatData || !chatData.messages || !Array.isArray(chatData.messages)) {
      this.error('Invalid chat data for formatting');
      return '';
    }

    // Sanitize source name
    const source = (chatData.source || 'Unknown').replace(/[<>]/g, '');
    
    const header = `Context from ${source}:\n\n`;
    
    // Sanitize and validate messages
    const maxMessages = this.config.maxMessages || 50;
    const sanitizedMessages = chatData.messages
      .filter(msg => typeof msg === 'string' && msg.trim().length > 0)
      .map(msg => msg.replace(/[<>]/g, '')) // Basic XSS prevention
      .slice(0, maxMessages); // Limit messages
    
    const messages = sanitizedMessages.join('\n\n');
    const footer = '\n\n---\n\nPlease continue this conversation based on the context above.';
    
    return header + messages + footer;
  }

  showVisualNotification(messageCount) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      transition: opacity 0.3s ease;
    `;
    notification.textContent = `🌀 Twirl: Injected ${messageCount} messages from ChatGPT`;

    document.body.appendChild(notification);

    // Remove notification after 4 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
}

// Initialize the injector
new ClaudeInjector();