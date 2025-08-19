chrome.commands.onCommand.addListener((command) => {
  if (command === 'move-tab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'showWindowSelector' });
      }
    });
  }
  
  if (command === 'move-to-last') {
    chrome.storage.sync.get(['lastWindowId'], (result) => {
      if (result.lastWindowId) {
        chrome.windows.get(result.lastWindowId, (window) => {
          if (chrome.runtime.lastError) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'showWindowSelector' });
              }
            });
          } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.move(tabs[0].id, { windowId: result.lastWindowId, index: -1 });
                chrome.windows.update(result.lastWindowId, { focused: true });
              }
            });
          }
        });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'showWindowSelector' });
          }
        });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getWindows') {
    chrome.windows.getAll({ populate: true }, (windows) => {
      chrome.windows.getCurrent((currentWindow) => {
        const windowData = windows.map((window, index) => {
          // Use numbers 1-9, then letters A-Z for windows 10+
          let identifier;
          if (index < 9) {
            identifier = (index + 1).toString();
          } else {
            // Convert to letter: index 9 = A, index 10 = B, etc.
            identifier = String.fromCharCode(65 + (index - 9));
          }
          
          return {
            id: window.id,
            number: identifier,
            tabCount: window.tabs.length,
            title: window.tabs.find(tab => tab.active)?.title || 'Window',
            isCurrent: window.id === currentWindow.id
          };
        });
        sendResponse({ windows: windowData });
      });
    });
    return true;
  }
  
  if (message.action === 'moveTabToWindow') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.move(tabs[0].id, { windowId: message.windowId, index: -1 });
        chrome.windows.update(message.windowId, { focused: true });
        chrome.storage.sync.set({ lastWindowId: message.windowId });
      }
    });
  }
  
  if (message.action === 'shortcutUpdated') {
    chrome.storage.sync.set({ 
      customShortcut: message.shortcut,
      customLastShortcut: message.lastShortcut
    });
  }
  
  if (message.action === 'checkCustomShortcut') {
    chrome.storage.sync.get(['customShortcut', 'customLastShortcut'], (result) => {
      const mainMatches = result.customShortcut && isShortcutMatch(message.event, result.customShortcut);
      const lastMatches = result.customLastShortcut && isShortcutMatch(message.event, result.customLastShortcut);
      sendResponse({ matches: mainMatches, lastMatches: lastMatches });
    });
    return true;
  }
  
  if (message.action === 'moveToLastWindow') {
    chrome.storage.sync.get(['lastWindowId'], (result) => {
      if (result.lastWindowId) {
        chrome.windows.get(result.lastWindowId, (window) => {
          if (chrome.runtime.lastError) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'showWindowSelector' });
              }
            });
          } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.move(tabs[0].id, { windowId: result.lastWindowId, index: -1 });
                chrome.windows.update(result.lastWindowId, { focused: true });
              }
            });
          }
        });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'showWindowSelector' });
          }
        });
      }
    });
  }
});

function isShortcutMatch(event, shortcut) {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  
  const eventKey = event.key.toLowerCase();
  if (eventKey !== key && eventKey !== key.toLowerCase()) return false;
  
  const hasCtrl = modifiers.includes('ctrl') && event.ctrlKey;
  const hasAlt = modifiers.includes('alt') && event.altKey;
  const hasShift = modifiers.includes('shift') && event.shiftKey;
  const hasCommand = modifiers.includes('command') && event.metaKey;
  
  const requiredModifiers = modifiers.length;
  const actualModifiers = [hasCtrl, hasAlt, hasShift, hasCommand].filter(Boolean).length;
  
  return requiredModifiers === actualModifiers && 
         (!modifiers.includes('ctrl') || event.ctrlKey) &&
         (!modifiers.includes('alt') || event.altKey) &&
         (!modifiers.includes('shift') || event.shiftKey) &&
         (!modifiers.includes('command') || event.metaKey);
}