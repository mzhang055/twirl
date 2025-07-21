// Popup JavaScript for Twirl extension
class TwirlPopup {
  constructor() {
    this.chatData = null;
    this.allChats = {};
    this.selectedChatId = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadChatData();
  }

  bindEvents() {
    document.getElementById('copyBtn').addEventListener('click', () => this.copyToClipboard());
    document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
    document.getElementById('clearBtn').addEventListener('click', () => this.clearMemory());
    
    // Platform switcher buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.platform-btn')) {
        const button = e.target.closest('.platform-btn');
        const platform = button.dataset.platform;
        const url = button.dataset.url;
        this.switchToPlatform(platform, url, button);
      }
    });
  }

  async loadChatData() {
    try {
      this.updateStatus('loading', 'Loading chat history...');
      
      const result = await chrome.storage.local.get(['twirlChats', 'twirlSelectedChat', 'twirlChatHistory']);
      this.allChats = result.twirlChats || {};
      this.selectedChatId = result.twirlSelectedChat;

      // Fallback to legacy format if new format doesn't exist
      if (Object.keys(this.allChats).length === 0 && result.twirlChatHistory) {
        const legacyChat = result.twirlChatHistory;
        const chatId = `legacy_${legacyChat.timestamp}`;
        this.allChats[chatId] = {
          ...legacyChat,
          id: chatId,
          title: legacyChat.title || 'Legacy Chat'
        };
        this.selectedChatId = chatId;
      }

      if (Object.keys(this.allChats).length > 0) {
        this.updateStatus('success', `${Object.keys(this.allChats).length} chats available`);
        this.displayChatList();
        this.selectChat(this.selectedChatId);
        this.enableButtons();
        this.showPlatformSwitcher();
      } else {
        this.updateStatus('error', 'No chat history found');
        this.displayNoData();
        this.disableButtons();
        this.hidePlatformSwitcher();
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
      this.updateStatus('error', 'Failed to load chat history');
      this.displayNoData();
      this.disableButtons();
    }
  }

  updateStatus(type, message) {
    const indicator = document.getElementById('statusIndicator');
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    // Remove existing status classes
    indicator.className = 'status-indicator';
    
    // Add new status class
    if (type) {
      indicator.classList.add(type);
    }

    text.textContent = message;
  }

  displayChatSummary() {
    const summarySection = document.getElementById('chatSummary');
    const summaryContent = document.getElementById('summaryContent');
    const chatMeta = document.getElementById('chatMeta');

    if (!this.chatData || !this.chatData.messages) {
      summarySection.style.display = 'none';
      return;
    }

    // Show the summary section
    summarySection.style.display = 'block';

    // Show preview of recent messages (last 3)
    const recentMessages = this.chatData.messages.slice(-3);
    const preview = recentMessages.map(msg => {
      // Truncate long messages
      const truncated = msg.length > 100 ? msg.substring(0, 100) + '...' : msg;
      return truncated;
    }).join('\n\n');

    summaryContent.innerHTML = `<p class="chat-preview">${this.escapeHtml(preview)}</p>`;

    // Show metadata
    const timestamp = new Date(this.chatData.timestamp).toLocaleString();
    const messageCount = this.chatData.messages.length;
    const source = this.chatData.source || 'Unknown';

    chatMeta.innerHTML = `
      <span>${messageCount} messages from ${source}</span>
      <span>${this.getRelativeTime(this.chatData.timestamp)}</span>
    `;
  }

  displayChatList() {
    const chatList = document.getElementById('chatList');
    
    if (Object.keys(this.allChats).length === 0) {
      chatList.innerHTML = '<p class="no-data">No chat history found</p>';
      return;
    }

    // Sort chats by timestamp (newest first)
    const sortedChats = Object.values(this.allChats).sort((a, b) => b.timestamp - a.timestamp);
    
    chatList.innerHTML = '';
    
    sortedChats.forEach(chat => {
      const chatItem = document.createElement('div');
      chatItem.className = 'chat-item';
      chatItem.dataset.chatId = chat.id;
      
      if (chat.id === this.selectedChatId) {
        chatItem.classList.add('selected');
      }
      
      chatItem.innerHTML = `
        <div class="chat-item-title">${this.escapeHtml(chat.title)}</div>
        <div class="chat-item-meta">
          <span>${chat.messageCount} messages • ${this.getRelativeTime(chat.timestamp)}</span>
          <span class="chat-item-source">${chat.source}</span>
        </div>
      `;
      
      chatItem.addEventListener('click', () => this.selectChat(chat.id));
      chatList.appendChild(chatItem);
    });
  }

  selectChat(chatId) {
    if (!chatId || !this.allChats[chatId]) return;
    
    // Update selected chat ID
    this.selectedChatId = chatId;
    this.chatData = this.allChats[chatId];
    
    // Update UI
    this.updateChatSelection();
    this.displayChatSummary();
    
    // Save selection
    chrome.storage.local.set({ twirlSelectedChat: chatId });
  }

  updateChatSelection() {
    // Update selected chat in list
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
      item.classList.toggle('selected', item.dataset.chatId === this.selectedChatId);
    });
  }

  displayNoData() {
    const chatList = document.getElementById('chatList');
    const summaryContent = document.getElementById('summaryContent');
    const chatMeta = document.getElementById('chatMeta');
    
    chatList.innerHTML = '<p class="no-data">No chat history found</p>';
    summaryContent.innerHTML = '<p class="no-data">No chat selected</p>';
    chatMeta.innerHTML = '';
    
    // Hide summary section
    document.getElementById('chatSummary').style.display = 'none';
  }

  enableButtons() {
    document.getElementById('copyBtn').disabled = false;
    document.getElementById('clearBtn').disabled = false;
  }

  disableButtons() {
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('clearBtn').disabled = true;
  }

  async copyToClipboard() {
    if (!this.chatData || !this.chatData.messages) {
      this.showNotification('No chat history to copy', 'error');
      return;
    }

    try {
      const formattedHistory = this.formatChatHistory();
      await navigator.clipboard.writeText(formattedHistory);
      this.showNotification('Chat history copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showNotification('Failed to copy to clipboard', 'error');
      
      // Fallback: create a text area and select the text
      this.fallbackCopy(this.formatChatHistory());
    }
  }

  fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showNotification('Chat history copied to clipboard!', 'success');
    } catch (error) {
      this.showNotification('Failed to copy to clipboard', 'error');
    }
    
    document.body.removeChild(textArea);
  }

  formatChatHistory() {
    if (!this.chatData || !this.chatData.messages) return '';

    const header = `Context from ${this.chatData.source}:\n\n`;
    const messages = this.chatData.messages.join('\n\n');
    const footer = '\n\n---\n\nPlease continue this conversation based on the context above.';
    
    return header + messages + footer;
  }

  async refresh() {
    await this.loadChatData();
    this.showNotification('Chat history refreshed', 'success');
  }

  async clearMemory() {
    if (!confirm('Are you sure you want to clear all stored chat history? This action cannot be undone.')) {
      return;
    }

    try {
      await chrome.storage.local.remove('twirlChatHistory');
      this.chatData = null;
      this.updateStatus('success', 'Memory cleared');
      this.displayNoData();
      this.disableButtons();
      this.showNotification('Chat history cleared', 'success');
    } catch (error) {
      console.error('Failed to clear memory:', error);
      this.showNotification('Failed to clear memory', 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  showPlatformSwitcher() {
    const switcher = document.getElementById('platformSwitcher');
    if (switcher && this.chatData) {
      switcher.style.display = 'block';
      
      // Update button states based on current platform
      this.updatePlatformButtons();
    }
  }

  hidePlatformSwitcher() {
    const switcher = document.getElementById('platformSwitcher');
    if (switcher) {
      switcher.style.display = 'none';
    }
  }

  updatePlatformButtons() {
    // Get current tab info to highlight current platform
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const currentUrl = tabs[0].url;
        const buttons = document.querySelectorAll('.platform-btn');
        
        buttons.forEach(button => {
          const platformUrl = button.dataset.url;
          const isCurrentPlatform = currentUrl.includes(this.getHostFromUrl(platformUrl));
          
          if (isCurrentPlatform) {
            button.style.border = '2px solid #28a745';
            button.style.background = '#f8fff8';
            button.style.opacity = '0.7';
            button.style.pointerEvents = 'none';
            button.title = 'You are currently on this platform';
          } else {
            button.style.border = '2px solid #e9ecef';
            button.style.background = 'white';
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
            button.title = `Switch to ${button.dataset.platform}`;
          }
        });
      }
    });
  }

  getHostFromUrl(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  async switchToPlatform(platform, url, button) {
    if (!this.chatData || !this.chatData.messages) {
      this.showNotification('No chat selected to transfer', 'error');
      return;
    }

    try {
      // Add loading state
      button.classList.add('loading');
      
      // Format the chat for transfer
      const formattedChat = this.formatChatHistory();
      
      // Store the formatted chat in a way the target platform can access
      await this.prepareChatForTransfer(formattedChat, platform);
      
      // Open the target platform
      chrome.tabs.create({ url: url }, (tab) => {
        // Show success notification
        this.showNotification(`Opening ${platform} with your conversation...`, 'success');
        
        // Close popup after successful transfer
        setTimeout(() => {
          window.close();
        }, 1000);
      });
      
    } catch (error) {
      console.error('Failed to switch platforms:', error);
      this.showNotification('Failed to switch platforms', 'error');
      button.classList.remove('loading');
    }
  }

  async prepareChatForTransfer(formattedChat, targetPlatform) {
    // Store the chat in a special transfer key that content scripts can pick up
    await chrome.storage.local.set({
      twirlTransferData: {
        chat: formattedChat,
        targetPlatform: targetPlatform,
        timestamp: Date.now(),
        source: this.chatData.source || 'Unknown'
      }
    });
  }

  formatChatHistoryForPlatform(platform) {
    if (!this.chatData || !this.chatData.messages) return '';

    const source = this.chatData.source || 'Previous conversation';
    const header = `Context from ${source}:\n\n`;
    const messages = this.chatData.messages.join('\n\n');
    
    // Platform-specific formatting
    let footer = '\n\n---\n\nPlease continue this conversation.';
    
    switch (platform) {
      case 'chatgpt':
        footer = '\n\n---\n\nPlease continue this conversation where we left off.';
        break;
      case 'claude':
        footer = '\n\n---\n\nPlease continue this conversation based on the context above.';
        break;
      case 'perplexity':
        footer = '\n\n---\n\nPlease continue this conversation and provide additional insights.';
        break;
      case 'gemini':
        footer = '\n\n---\n\nPlease continue this conversation with your perspective.';
        break;
    }
    
    return header + messages + footer;
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TwirlPopup();
});