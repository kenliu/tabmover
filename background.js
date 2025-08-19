chrome.commands.onCommand.addListener((command) => {
  if (command === 'move-tab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'showWindowSelector' });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getWindows') {
    chrome.windows.getAll({ populate: true }, (windows) => {
      const windowData = windows.map((window, index) => ({
        id: window.id,
        number: index + 1,
        tabCount: window.tabs.length,
        title: window.tabs.find(tab => tab.active)?.title || 'Window'
      }));
      sendResponse({ windows: windowData });
    });
    return true;
  }
  
  if (message.action === 'moveTabToWindow') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.move(tabs[0].id, { windowId: message.windowId, index: -1 });
        chrome.windows.update(message.windowId, { focused: true });
      }
    });
  }
  
  if (message.action === 'shortcutUpdated') {
    chrome.storage.sync.set({ customShortcut: message.shortcut });
  }
  
  if (message.action === 'checkCustomShortcut') {
    chrome.storage.sync.get(['customShortcut'], (result) => {
      const matches = result.customShortcut && isShortcutMatch(message.event, result.customShortcut);
      sendResponse({ matches: matches });
    });
    return true;
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