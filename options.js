document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadCurrentShortcuts();
  loadWindowNames();
  
  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('shortcut').addEventListener('keydown', (e) => captureShortcut(e, 'shortcut'));
  document.getElementById('lastShortcut').addEventListener('keydown', (e) => captureShortcut(e, 'lastShortcut'));
  document.getElementById('clear-all-names').addEventListener('click', clearAllWindowNames);
  document.getElementById('cleanup-old-names').addEventListener('click', cleanupOldNames);
  document.getElementById('refresh-names').addEventListener('click', loadWindowNames);
});

function loadSettings() {
  chrome.storage.sync.get(['customShortcut', 'customLastShortcut'], (result) => {
    if (result.customShortcut) {
      document.getElementById('shortcut').value = result.customShortcut;
    }
    if (result.customLastShortcut) {
      document.getElementById('lastShortcut').value = result.customLastShortcut;
    }
  });
}

function loadCurrentShortcuts() {
  chrome.commands.getAll((commands) => {
    const moveTabCommand = commands.find(cmd => cmd.name === 'move-tab');
    const moveToLastCommand = commands.find(cmd => cmd.name === 'move-to-last');
    
    const currentShortcut = document.getElementById('current-shortcut');
    const currentLastShortcut = document.getElementById('current-last-shortcut');
    
    if (moveTabCommand && moveTabCommand.shortcut) {
      currentShortcut.textContent = `Show Window Selector: ${moveTabCommand.shortcut}`;
    } else {
      currentShortcut.textContent = 'Show Window Selector: No shortcut set in Chrome';
    }
    
    if (moveToLastCommand && moveToLastCommand.shortcut) {
      currentLastShortcut.textContent = `Move to Last Window: ${moveToLastCommand.shortcut}`;
    } else {
      currentLastShortcut.textContent = 'Move to Last Window: No shortcut set in Chrome';
    }
  });
}

function captureShortcut(event, fieldId) {
  event.preventDefault();
  
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Command');
  
  let key = event.key;
  if (key === ' ') key = 'Space';
  if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return;
  
  const shortcut = modifiers.length > 0 ? `${modifiers.join('+')}+${key.toUpperCase()}` : key.toUpperCase();
  document.getElementById(fieldId).value = shortcut;
}

function saveSettings() {
  const customShortcut = document.getElementById('shortcut').value.trim();
  const customLastShortcut = document.getElementById('lastShortcut').value.trim();
  
  chrome.storage.sync.set({
    customShortcut: customShortcut,
    customLastShortcut: customLastShortcut
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Saved!';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
    
    chrome.runtime.sendMessage({ 
      action: 'shortcutUpdated', 
      shortcut: customShortcut,
      lastShortcut: customLastShortcut
    });
  });
}

function loadWindowNames() {
  chrome.runtime.sendMessage({ action: 'getAllFingerprints' }, (response) => {
    const fingerprints = response.fingerprints || {};
    const container = document.getElementById('window-names-list');
    
    if (Object.keys(fingerprints).length === 0) {
      container.innerHTML = '<div class="help-text">No custom window names set. You can name windows from the TabMover overlay.</div>';
      return;
    }
    
    // Get current windows to match against fingerprints
    chrome.windows.getAll({ populate: true }, (windows) => {
      const matchResults = new Map();
      
      // Check which fingerprints match current windows
      for (const window of windows) {
        chrome.runtime.sendMessage({ 
          action: 'getWindows' 
        }, (windowsResponse) => {
          // Find this window in the response
          const windowData = windowsResponse.windows.find(w => w.id === window.id);
          if (windowData && windowData.fingerprintKey) {
            matchResults.set(windowData.fingerprintKey, {
              matched: true,
              windowId: window.id,
              tabCount: window.tabs.length
            });
          }
          
          // Update display after processing all windows
          if (matchResults.size > 0 || windows.length === 0) {
            updateFingerprintDisplay();
          }
        });
      }
      
      function updateFingerprintDisplay() {
        container.innerHTML = Object.entries(fingerprints)
          .map(([fingerprintKey, data]) => {
            const match = matchResults.get(fingerprintKey);
            const isMatched = !!match;
            const lastSeen = data.lastSeen ? new Date(data.lastSeen).toLocaleDateString() : 'Unknown';
            
            // Parse fingerprint for display
            const fp = data.fingerprint;
            const domainsText = fp.domains.length > 0 ? fp.domains.slice(0, 3).join(', ') : 'No domains';
            const moreDomainsText = fp.domains.length > 3 ? ` (+${fp.domains.length - 3} more)` : '';
            
            return `
              <div class="window-name-item">
                <div>
                  <span class="window-name-text">${data.name}</span>
                  <div class="window-name-details">
                    <span class="window-name-domains">Domains: ${domainsText}${moreDomainsText}</span>
                    <span class="window-name-stats">Tabs: ${fp.tabCount} | Last seen: ${lastSeen}</span>
                    <span class="window-name-status ${isMatched ? 'matched' : 'unmatched'}">${isMatched ? '✓ Currently matched' : '○ Not matched'}</span>
                  </div>
                </div>
                <button class="window-name-remove" onclick="removeWindowFingerprint('${fingerprintKey}')">Remove</button>
              </div>
            `;
          })
          .join('');
      }
      
      if (windows.length === 0) {
        updateFingerprintDisplay();
      }
    });
  });
}

function removeWindowFingerprint(fingerprintKey) {
  chrome.runtime.sendMessage({ 
    action: 'removeFingerprint', 
    fingerprintKey: fingerprintKey 
  }, () => {
    loadWindowNames(); // Refresh the list
  });
}

function clearAllWindowNames() {
  if (confirm('Are you sure you want to clear all custom window names? This cannot be undone.')) {
    chrome.storage.sync.set({ windowFingerprints: {} }, () => {
      loadWindowNames(); // Refresh the list
    });
  }
}

function cleanupOldNames() {
  chrome.runtime.sendMessage({ action: 'cleanupFingerprints' }, () => {
    loadWindowNames(); // Refresh the list
  });
}