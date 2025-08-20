// Window fingerprinting functions
function createWindowFingerprint(window) {
  // Get unique domains from all tabs
  const domains = [...new Set(window.tabs
    .filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'))
    .map(tab => {
      try {
        return new URL(tab.url).hostname;
      } catch {
        return null;
      }
    })
    .filter(domain => domain)
  )].sort();
  
  // Find the most common domain or active tab domain
  const primaryDomain = window.tabs.find(tab => tab.active)?.url ? 
    (() => {
      try {
        return new URL(window.tabs.find(tab => tab.active).url).hostname;
      } catch {
        return null;
      }
    })() : null;
  
  // Create fingerprint
  return {
    domains: domains,
    tabCount: window.tabs.length,
    primaryDomain: primaryDomain,
    timestamp: Date.now()
  };
}

function calculateFingerprintSimilarity(fp1, fp2) {
  if (!fp1 || !fp2) return 0;
  
  // Domain overlap (most important factor)
  const intersection = fp1.domains.filter(d => fp2.domains.includes(d));
  const union = [...new Set([...fp1.domains, ...fp2.domains])];
  const domainOverlap = union.length > 0 ? intersection.length / union.length : 0;
  
  // Tab count similarity
  const maxTabs = Math.max(fp1.tabCount, fp2.tabCount, 1);
  const tabCountSim = 1 - Math.abs(fp1.tabCount - fp2.tabCount) / maxTabs;
  
  // Primary domain match
  const primaryMatch = (fp1.primaryDomain && fp2.primaryDomain && 
                       fp1.primaryDomain === fp2.primaryDomain) ? 1 : 0;
  
  // Weighted average: domains are most important, then primary domain, then tab count
  return (domainOverlap * 0.6) + (primaryMatch * 0.3) + (tabCountSim * 0.1);
}

function findBestFingerprintMatch(currentWindow, storedFingerprints) {
  const currentFP = createWindowFingerprint(currentWindow);
  
  let bestMatch = null;
  let bestScore = 0;
  const threshold = 0.5; // 50% similarity threshold
  
  for (const [fingerprintKey, data] of Object.entries(storedFingerprints)) {
    const score = calculateFingerprintSimilarity(currentFP, data.fingerprint);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = { key: fingerprintKey, name: data.name, score: score };
    }
  }
  
  return bestMatch;
}

function generateFingerprintKey(fingerprint) {
  // Create a readable key from fingerprint
  const domainsStr = fingerprint.domains.slice(0, 3).join(',') || 'no-domains';
  const primaryStr = fingerprint.primaryDomain || 'no-primary';
  return `${domainsStr}|${primaryStr}|${fingerprint.tabCount}`;
}

function updateWindowFingerprints(sourceWindowId, destinationWindowId) {
  // Get both windows with their current tab state
  const windowPromises = [];
  
  if (sourceWindowId) {
    windowPromises.push(new Promise(resolve => {
      chrome.windows.get(sourceWindowId, { populate: true }, (window) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve({ type: 'source', window: window });
        }
      });
    }));
  }
  
  if (destinationWindowId) {
    windowPromises.push(new Promise(resolve => {
      chrome.windows.get(destinationWindowId, { populate: true }, (window) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve({ type: 'destination', window: window });
        }
      });
    }));
  }
  
  Promise.all(windowPromises).then(results => {
    chrome.storage.sync.get(['windowFingerprints'], (result) => {
      const storedFingerprints = result.windowFingerprints || {};
      let fingerprintsUpdated = false;
      
      for (const windowResult of results) {
        if (!windowResult) continue;
        
        const { window } = windowResult;
        
        // Find existing fingerprint for this window
        const existingMatch = findBestFingerprintMatch(window, storedFingerprints);
        
        if (existingMatch) {
          // Update the existing fingerprint with new window state
          const newFingerprint = createWindowFingerprint(window);
          const newKey = generateFingerprintKey(newFingerprint);
          
          // If the key changed significantly, we need to update the storage
          if (newKey !== existingMatch.key) {
            // Remove old entry and add new one
            const name = existingMatch.name;
            delete storedFingerprints[existingMatch.key];
            storedFingerprints[newKey] = {
              name: name,
              fingerprint: newFingerprint,
              lastSeen: Date.now()
            };
            fingerprintsUpdated = true;
          } else {
            // Just update the fingerprint and timestamp
            storedFingerprints[existingMatch.key].fingerprint = newFingerprint;
            storedFingerprints[existingMatch.key].lastSeen = Date.now();
            fingerprintsUpdated = true;
          }
        }
        // If no existing match, the window doesn't have a custom name, so no update needed
      }
      
      if (fingerprintsUpdated) {
        chrome.storage.sync.set({ windowFingerprints: storedFingerprints });
      }
    });
  });
}

// Add cleanup function for old fingerprints
function cleanupOldFingerprints() {
  chrome.storage.sync.get(['windowFingerprints'], (result) => {
    const storedFingerprints = result.windowFingerprints || {};
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    let cleaned = false;
    for (const [key, data] of Object.entries(storedFingerprints)) {
      if (data.lastSeen && (now - data.lastSeen) > maxAge) {
        delete storedFingerprints[key];
        cleaned = true;
      }
    }
    
    if (cleaned) {
      chrome.storage.sync.set({ windowFingerprints: storedFingerprints });
    }
  });
}

// Listen for tab moves (including manual drag-and-drop) to update fingerprints
chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  // A tab was attached to a new window - update fingerprints
  // Use a delay to ensure the move is fully completed
  setTimeout(() => {
    // We don't know the source window ID from this event, so we'll update all windows
    // This is less efficient but ensures accuracy for manual tab moves
    chrome.windows.getAll({ populate: true }, (windows) => {
      const fingerprintPromises = windows.map(window => {
        return new Promise(resolve => {
          chrome.storage.sync.get(['windowFingerprints'], (result) => {
            const storedFingerprints = result.windowFingerprints || {};
            const existingMatch = findBestFingerprintMatch(window, storedFingerprints);
            
            if (existingMatch) {
              // Update the existing fingerprint
              const newFingerprint = createWindowFingerprint(window);
              const newKey = generateFingerprintKey(newFingerprint);
              
              if (newKey !== existingMatch.key) {
                // Key changed - need to update storage
                resolve({
                  action: 'update',
                  oldKey: existingMatch.key,
                  newKey: newKey,
                  name: existingMatch.name,
                  fingerprint: newFingerprint
                });
              } else {
                // Just update timestamp and fingerprint
                resolve({
                  action: 'refresh',
                  key: existingMatch.key,
                  fingerprint: newFingerprint
                });
              }
            } else {
              resolve(null);
            }
          });
        });
      });
      
      Promise.all(fingerprintPromises).then(updates => {
        const validUpdates = updates.filter(u => u !== null);
        if (validUpdates.length > 0) {
          chrome.storage.sync.get(['windowFingerprints'], (result) => {
            const storedFingerprints = result.windowFingerprints || {};
            let updated = false;
            
            for (const update of validUpdates) {
              if (update.action === 'update') {
                delete storedFingerprints[update.oldKey];
                storedFingerprints[update.newKey] = {
                  name: update.name,
                  fingerprint: update.fingerprint,
                  lastSeen: Date.now()
                };
                updated = true;
              } else if (update.action === 'refresh') {
                storedFingerprints[update.key].fingerprint = update.fingerprint;
                storedFingerprints[update.key].lastSeen = Date.now();
                updated = true;
              }
            }
            
            if (updated) {
              chrome.storage.sync.set({ windowFingerprints: storedFingerprints });
            }
          });
        }
      });
    });
  }, 200); // Slightly longer delay for manual moves
});

// Clean up old fingerprints periodically (keep only recent ones)
chrome.windows.onRemoved.addListener((windowId) => {
  // Note: We can't clean up fingerprints immediately since we don't know which fingerprint
  // belonged to this window. Cleanup will happen during matching process for stale entries.
});

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
                const sourceWindowId = tabs[0].windowId;
                const destinationWindowId = result.lastWindowId;
                
                chrome.tabs.move(tabs[0].id, { windowId: destinationWindowId, index: -1 }, (movedTab) => {
                  // Activate the moved tab in the destination window
                  chrome.tabs.update(movedTab.id, { active: true });
                  chrome.windows.update(destinationWindowId, { focused: true });
                  
                  // Update fingerprints for both source and destination windows
                  setTimeout(() => {
                    updateWindowFingerprints(sourceWindowId, destinationWindowId);
                  }, 100);
                });
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
        // Load fingerprint-based window names from storage
        chrome.storage.sync.get(['windowFingerprints'], (result) => {
          const storedFingerprints = result.windowFingerprints || {};
          
          const windowData = windows.map((window, index) => {
            // Use numbers 1-9, then letters A-Z for windows 10+
            let identifier;
            if (index < 9) {
              identifier = (index + 1).toString();
            } else {
              // Convert to letter: index 9 = A, index 10 = B, etc.
              identifier = String.fromCharCode(65 + (index - 9));
            }
            
            // Try to match window by fingerprint
            const match = findBestFingerprintMatch(window, storedFingerprints);
            const customName = match ? match.name : null;
            const fallbackTitle = window.tabs.find(tab => tab.active)?.title || 'Window';
            
            return {
              id: window.id,
              number: identifier,
              tabCount: window.tabs.length,
              title: customName || fallbackTitle,
              hasCustomName: !!customName,
              matchScore: match ? match.score : 0,
              fingerprintKey: match ? match.key : null,
              isCurrent: window.id === currentWindow.id
            };
          });
          sendResponse({ windows: windowData });
        });
      });
    });
    return true;
  }
  
  if (message.action === 'moveTabToWindow') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const sourceWindowId = tabs[0].windowId;
        const destinationWindowId = message.windowId;
        
        chrome.tabs.move(tabs[0].id, { windowId: destinationWindowId, index: -1 }, (movedTab) => {
          // Activate the moved tab in the destination window
          chrome.tabs.update(movedTab.id, { active: true });
          chrome.windows.update(destinationWindowId, { focused: true });
          chrome.storage.sync.set({ lastWindowId: destinationWindowId });
          
          // Update fingerprints for both source and destination windows
          // Use a small delay to ensure the move is fully completed
          setTimeout(() => {
            updateWindowFingerprints(sourceWindowId, destinationWindowId);
          }, 100);
        });
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
  
  if (message.action === 'setWindowName') {
    // Get the target window to create its fingerprint
    chrome.windows.get(message.windowId, { populate: true }, (window) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: 'Window not found' });
        return;
      }
      
      const fingerprint = createWindowFingerprint(window);
      const fingerprintKey = generateFingerprintKey(fingerprint);
      
      chrome.storage.sync.get(['windowFingerprints'], (result) => {
        const storedFingerprints = result.windowFingerprints || {};
        
        if (message.name && message.name.trim()) {
          // Store or update the fingerprint with the name
          storedFingerprints[fingerprintKey] = {
            name: message.name.trim(),
            fingerprint: fingerprint,
            lastSeen: Date.now()
          };
        } else {
          // Remove existing fingerprint entries for this window
          const match = findBestFingerprintMatch(window, storedFingerprints);
          if (match) {
            delete storedFingerprints[match.key];
          }
        }
        
        chrome.storage.sync.set({ windowFingerprints: storedFingerprints }, () => {
          sendResponse({ success: true, fingerprintKey: fingerprintKey });
        });
      });
    });
    return true;
  }
  
  if (message.action === 'getWindowName') {
    // Get the target window to find its fingerprint match
    chrome.windows.get(message.windowId, { populate: true }, (window) => {
      if (chrome.runtime.lastError) {
        sendResponse({ name: '' });
        return;
      }
      
      chrome.storage.sync.get(['windowFingerprints'], (result) => {
        const storedFingerprints = result.windowFingerprints || {};
        const match = findBestFingerprintMatch(window, storedFingerprints);
        sendResponse({ 
          name: match ? match.name : '',
          fingerprintKey: match ? match.key : null,
          matchScore: match ? match.score : 0
        });
      });
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
                const sourceWindowId = tabs[0].windowId;
                const destinationWindowId = result.lastWindowId;
                
                chrome.tabs.move(tabs[0].id, { windowId: destinationWindowId, index: -1 }, (movedTab) => {
                  // Activate the moved tab in the destination window
                  chrome.tabs.update(movedTab.id, { active: true });
                  chrome.windows.update(destinationWindowId, { focused: true });
                  
                  // Update fingerprints for both source and destination windows
                  setTimeout(() => {
                    updateWindowFingerprints(sourceWindowId, destinationWindowId);
                  }, 100);
                });
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
  
  if (message.action === 'cleanupFingerprints') {
    cleanupOldFingerprints();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'getAllFingerprints') {
    chrome.storage.sync.get(['windowFingerprints'], (result) => {
      sendResponse({ fingerprints: result.windowFingerprints || {} });
    });
    return true;
  }
  
  if (message.action === 'removeFingerprint') {
    chrome.storage.sync.get(['windowFingerprints'], (result) => {
      const storedFingerprints = result.windowFingerprints || {};
      delete storedFingerprints[message.fingerprintKey];
      chrome.storage.sync.set({ windowFingerprints: storedFingerprints }, () => {
        sendResponse({ success: true });
      });
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