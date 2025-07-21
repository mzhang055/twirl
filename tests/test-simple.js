// Simple test script
console.log('🌀 TWIRL TEST: Script is running!');
console.log('🌀 TWIRL TEST: URL is:', window.location.href);
console.log('🌀 TWIRL TEST: Domain is:', window.location.hostname);
console.log('🌀 TWIRL TEST: Chrome storage available:', typeof chrome !== 'undefined' && !!chrome.storage);
console.log('🌀 TWIRL TEST: Document ready state:', document.readyState);

// Immediately show we're here
alert('🌀 Twirl extension loaded! Check console for logs.');

// Test every 2 seconds for 10 seconds
let count = 0;
const interval = setInterval(() => {
  count++;
  console.log(`🌀 TWIRL TEST: Heartbeat ${count}/5 - Time: ${new Date().toLocaleTimeString()}`);
  if (count >= 5) {
    clearInterval(interval);
    console.log('🌀 TWIRL TEST: Test complete');
  }
}, 2000);