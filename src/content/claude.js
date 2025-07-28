// Content script for Claude chat injection
class ClaudeInjector {
  constructor() {
    this.injected = false;
    this.attempts = 0;
    this.maxAttempts = 20;
    this.processedContent = new Set(); // Track processed content to avoid duplicates
    
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
      document.addEventListener('DOMContentLoaded', () => {
        this.startInjection();
        this.setupPasteDetection();
      });
    } else {
      this.startInjection();
      this.setupPasteDetection();
    }
  }

  async startInjection() {
    this.log('Starting injection process');
    
    // First check for transfer data from popup (higher priority)
    const transferData = await this.getTransferData();
    if (transferData) {
      this.log(`Found transfer data for platform: ${transferData.targetPlatform}`);
      this.waitForInputField(transferData);
      return;
    }
    
    // Fallback to regular chat history
    const chatData = await this.getChatHistory();
    if (!chatData || !chatData.messages || chatData.messages.length === 0) {
      this.log('No chat history found to inject');
      return;
    }

    this.log(`Found ${chatData.messages.length} messages from ${chatData.source}`);
    this.waitForInputField(chatData);
  }

  async getTransferData() {
    try {
      const result = await chrome.storage.local.get(['twirlTransferData']);
      const transferData = result.twirlTransferData;
      
      if (!transferData) return null;
      
      // Check if transfer data is recent (within 30 seconds)
      const maxAge = 30 * 1000; // 30 seconds
      const age = Date.now() - transferData.timestamp;
      
      if (age > maxAge) {
        this.log('Transfer data expired, ignoring');
        // Clean up expired data
        chrome.storage.local.remove(['twirlTransferData']);
        return null;
      }
      
      // Convert transfer data to chat format
      const chatData = {
        messages: transferData.chat.split('\n\n').filter(line => line.trim()),
        source: transferData.source,
        timestamp: transferData.timestamp,
        isTransfer: true
      };
      
      // Clean up transfer data after use
      chrome.storage.local.remove(['twirlTransferData']);
      
      return chatData;
    } catch (error) {
      this.error('Failed to get transfer data', error);
      return null;
    }
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

  setupPasteDetection() {
    this.log('Setting up paste detection');
    
    // Monitor all paste events on the page
    document.addEventListener('paste', (event) => {
      this.handlePasteEvent(event);
    });

    // Also monitor input events for when content is pasted
    document.addEventListener('input', (event) => {
      if (event.target && event.target.contentEditable === 'true') {
        this.detectPastedChatContent(event.target);
      }
    });
  }

  handlePasteEvent(event) {
    this.log('Paste event detected');
    
    // Get pasted content
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');
    
    if (this.isLikelyChatConversation(pastedText)) {
      this.log('Detected likely chat conversation in paste');
      
      // Store original content before paste
      const targetElement = event.target;
      const originalContent = targetElement.textContent || '';
      
      // Delay slightly to let the paste complete
      setTimeout(() => {
        this.offerChatProcessing(pastedText, targetElement, originalContent);
      }, 100);
    }
  }

  detectPastedChatContent(element) {
    if (!element || !element.textContent) return;
    
    const content = element.textContent;
    
    // Check if this looks like a chat conversation that was just pasted
    if (this.isLikelyChatConversation(content) && content.length > 200) {
      this.log('Detected chat-like content in input field');
      // For input events, we don't have original content, so pass empty string
      this.offerChatProcessing(content, element, '');
    }
  }

  isLikelyChatConversation(text) {
    if (!text || text.length < 50) return false;
    
    // Patterns that suggest this is a chat conversation
    const chatPatterns = [
      /User:\s*.*\n.*AI:\s*/i,                          // "User: ... AI: ..."
      /Human:\s*.*\n.*Assistant:\s*/i,                  // "Human: ... Assistant: ..."
      /You:\s*.*\n.*ChatGPT:\s*/i,                      // "You: ... ChatGPT: ..."
      /Q:\s*.*\n.*A:\s*/i,                              // "Q: ... A: ..."
      /\n\s*User:\s*/i,                                 // Line starting with "User:"
      /\n\s*AI:\s*/i,                                   // Line starting with "AI:"
      /Context from ChatGPT:/i,                        // Our own format
      /Context from Claude:/i,                         // Our own format
    ];

    // Check for conversation-like patterns
    const hasConversationPattern = chatPatterns.some(pattern => pattern.test(text));
    
    // Check for multiple turns (alternating speakers)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const speakerLines = lines.filter(line => 
      /^(User|AI|Human|Assistant|You|ChatGPT|Claude):\s*/i.test(line.trim())
    );
    
    // Should have at least 2 speaker turns to be a conversation
    const hasMultipleTurns = speakerLines.length >= 2;
    
    // Check for typical AI assistant responses
    const hasAILanguage = /\b(as an AI|I'm an AI|I can help|let me explain|here's|however)\b/i.test(text);
    
    return hasConversationPattern && (hasMultipleTurns || hasAILanguage);
  }

  offerChatProcessing(content, targetElement, originalContent = '') {
    // Don't show multiple prompts
    if (document.querySelector('.twirl-paste-prompt')) return;
    
    // Create a hash of the content to avoid duplicate processing
    const contentHash = this.hashContent(content);
    if (this.processedContent.has(contentHash)) {
      this.log('Content already processed, skipping');
      return;
    }
    
    this.log('Offering to process pasted chat content');
    
    const prompt = this.createPasteProcessingPrompt(content, targetElement, originalContent, contentHash);
    document.body.appendChild(prompt);
  }

  createPasteProcessingPrompt(content, targetElement, originalContent = '', contentHash = '') {
    const overlay = document.createElement('div');
    overlay.className = 'twirl-paste-prompt';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      margin: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    const parsedData = this.parseConversationContent(content);
    
    dialog.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 32px; margin-bottom: 12px;">🌀</div>
        <h3 style="margin: 0; color: #333; font-size: 20px;">Chat Conversation Detected!</h3>
        <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
          Twirl detected ${parsedData.messageCount} messages from what looks like ${parsedData.platform}.
        </p>
      </div>
      
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; max-height: 120px; overflow-y: auto;">
        <div style="font-size: 12px; color: #666; font-family: monospace;">
          ${this.escapeHtml(content.substring(0, 200))}${content.length > 200 ? '...' : ''}
        </div>
      </div>
      
      <div style="margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #333;">
          Would you like Twirl to format this properly and save it for future transfers?
        </p>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="twirl-paste-cancel" style="
          background: #f1f3f4;
          color: #5f6368;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Cancel</button>
        <button id="twirl-paste-process" style="
          background: #1a73e8;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Process & Save</button>
      </div>
    `;

    overlay.appendChild(dialog);

    // Add event listeners
    dialog.querySelector('#twirl-paste-cancel').addEventListener('click', () => {
      // Restore original content when cancelled
      if (targetElement && targetElement.contentEditable === 'true') {
        targetElement.textContent = originalContent;
        // Trigger input events to notify the platform
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
      overlay.remove();
    });

    dialog.querySelector('#twirl-paste-process').addEventListener('click', async () => {
      // Disable the button to prevent multiple clicks
      const processBtn = dialog.querySelector('#twirl-paste-process');
      processBtn.disabled = true;
      processBtn.textContent = 'Processing...';
      
      try {
        // Mark this content as processed
        if (contentHash) {
          this.processedContent.add(contentHash);
        }
        
        await this.processPastedConversation(content, targetElement);
      } catch (error) {
        this.error('Failed to process conversation:', error);
      }
      
      // Remove overlay after processing
      overlay.remove();
    });

    // Close on outside click and restore content
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        // Restore original content when clicking outside
        if (targetElement && targetElement.contentEditable === 'true') {
          targetElement.textContent = originalContent;
          // Trigger input events to notify the platform
          targetElement.dispatchEvent(new Event('input', { bubbles: true }));
          targetElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
        overlay.remove();
      }
    });

    return overlay;
  }

  parseConversationContent(content) {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const messageLines = lines.filter(line => 
      /^(User|AI|Human|Assistant|You|ChatGPT|Claude):\s*/i.test(line.trim())
    );
    
    // Try to detect platform
    let platform = 'an AI assistant';
    if (/ChatGPT|GPT/i.test(content)) platform = 'ChatGPT';
    else if (/Claude/i.test(content)) platform = 'Claude';
    else if (/Bard/i.test(content)) platform = 'Bard';
    
    return {
      messageCount: Math.max(messageLines.length, Math.ceil(lines.length / 3)),
      platform: platform,
      estimatedLength: content.length
    };
  }

  async processPastedConversation(content, targetElement) {
    this.log('Processing pasted conversation content');
    
    try {
      // Parse the conversation into structured format
      const messages = this.parseConversationMessages(content);
      
      if (messages.length === 0) {
        this.showNotification('Could not parse conversation format', 'error');
        return;
      }

      // Create chat data structure
      const chatData = {
        id: `paste_${Date.now()}`,
        messages: messages,
        timestamp: Date.now(),
        source: 'Pasted Content',
        url: window.location.href,
        title: this.generateTitleFromMessages(messages),
        messageCount: messages.length
      };

      // Save to storage
      await this.savePastedChat(chatData);
      
      // Don't replace the content - just leave what the user pasted
      // The user can use the popup to transfer this conversation later
      
      this.showNotification(`Processed and saved conversation with ${messages.length} messages!`, 'success');
      
    } catch (error) {
      this.error('Failed to process pasted conversation:', error);
      this.showNotification('Failed to process conversation', 'error');
    }
  }

  parseConversationMessages(content) {
    const messages = [];
    const lines = content.split('\n');
    
    let currentMessage = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line starts a new message
      const speakerMatch = trimmedLine.match(/^(User|AI|Human|Assistant|You|ChatGPT|Claude):\s*(.*)$/i);
      
      if (speakerMatch) {
        // Save previous message if exists
        if (currentMessage) {
          messages.push(currentMessage);
        }
        
        // Start new message
        const speaker = speakerMatch[1].toLowerCase();
        const role = ['user', 'you', 'human'].includes(speaker) ? 'User' : 'AI';
        
        currentMessage = `${role}: ${speakerMatch[2]}`;
      } else if (currentMessage && trimmedLine.length > 0) {
        // Continue current message
        currentMessage += ' ' + trimmedLine;
      }
    }
    
    // Add the last message
    if (currentMessage) {
      messages.push(currentMessage);
    }
    
    return messages;
  }

  generateTitleFromMessages(messages) {
    if (messages.length === 0) return 'Pasted Conversation';
    
    // Find first user message
    const firstUserMessage = messages.find(msg => msg.startsWith('User:'));
    if (firstUserMessage) {
      const title = firstUserMessage.replace('User:', '').trim();
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }
    
    return `Pasted conversation (${messages.length} messages)`;
  }

  async savePastedChat(chatData) {
    try {
      // Get existing chats
      const result = await chrome.storage.local.get(['twirlChats']);
      const existingChats = result.twirlChats || {};
      
      // Add this chat
      existingChats[chatData.id] = chatData;
      
      // Save back to storage
      await chrome.storage.local.set({ 
        twirlChats: existingChats,
        twirlSelectedChat: chatData.id // Set as selected
      });
      
      this.log('Pasted chat saved successfully');
      
    } catch (error) {
      this.error('Failed to save pasted chat:', error);
      throw error;
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      transition: opacity 0.3s ease;
      max-width: 300px;
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
    }, 4000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  hashContent(content) {
    // Simple hash function to create a unique identifier for content
    let hash = 0;
    if (content.length === 0) return hash.toString();
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

// Initialize the injector
new ClaudeInjector();