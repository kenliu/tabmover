let overlay = null;
let isNamingDialogActive = false;

// Clean up any leftover overlays on page load
document.addEventListener('DOMContentLoaded', () => {
  const leftoverOverlays = document.querySelectorAll('#tabmover-overlay');
  leftoverOverlays.forEach(el => el.remove());
});

// Also clean up on window focus (when tab becomes active)
window.addEventListener('focus', () => {
  const leftoverOverlays = document.querySelectorAll('#tabmover-overlay');
  leftoverOverlays.forEach(el => el.remove());
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showWindowSelector') {
    showWindowSelector();
  } else if (message.action === 'hideOverlay') {
    hideWindowSelector();
  }
});

document.addEventListener('keydown', (event) => {
  chrome.runtime.sendMessage({ 
    action: 'checkCustomShortcut', 
    event: {
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey
    }
  }, (response) => {
    if (response) {
      if (response.matches) {
        event.preventDefault();
        showWindowSelector();
      } else if (response.lastMatches) {
        event.preventDefault();
        hideWindowSelector();
        chrome.runtime.sendMessage({ action: 'moveToLastWindow' });
      }
    }
  });
});

function showWindowSelector() {
  if (overlay) {
    hideWindowSelector();
    return;
  }

  chrome.runtime.sendMessage({ action: 'getWindows' }, (response) => {
    if (response && response.windows) {
      createOverlay(response.windows);
    }
  });
}

function createOverlay(windows) {
  overlay = document.createElement('div');
  overlay.id = 'tabmover-overlay';
  overlay.innerHTML = `
    <div class="tabmover-modal">
      <div class="tabmover-header">Move tab to window:</div>
      <div class="tabmover-windows">
        ${windows.map(window => `
          <div class="tabmover-window${window.isCurrent ? ' current' : ''}${window.hasCustomName ? ' has-custom-name' : ''}" data-window-id="${window.id}" data-number="${window.number}">
            <span class="tabmover-number">${window.number}</span>
            <span class="tabmover-title">${window.title}</span>
            <span class="tabmover-count">(${window.tabCount} tabs)</span>
            ${window.hasCustomName ? '<span class="tabmover-name-indicator" title="Custom name">📝</span>' : ''}
            <span class="tabmover-name-button" title="Name this window">⋯</span>
          </div>
        `).join('')}
      </div>
      <div class="tabmover-footer">Click a window, press number/letter, or click ⋯ to name • ESC to cancel</div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.addEventListener('keydown', handleKeyPress);
  
  // Add click handlers to individual window rows
  overlay.querySelectorAll('.tabmover-window').forEach(windowElement => {
    windowElement.addEventListener('click', handleWindowClick);
  });
  
  // Add click handlers to name buttons
  overlay.querySelectorAll('.tabmover-name-button').forEach(nameButton => {
    nameButton.addEventListener('click', handleNameButtonClick);
  });
  
  // Close overlay when clicking on background (but not on modal content)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      hideWindowSelector();
    }
  });
}

function handleKeyPress(event) {
  // Don't handle window selection keys if naming dialog is active
  if (isNamingDialogActive) {
    return;
  }
  
  if (event.key === 'Escape') {
    hideWindowSelector();
    return;
  }

  // Handle both numbers (1-9) and letters (A-Z)
  let identifier = null;
  const number = parseInt(event.key);
  if (number >= 1 && number <= 9) {
    identifier = number.toString();
  } else if (event.key.match(/^[A-Za-z]$/)) {
    identifier = event.key.toUpperCase();
  }

  if (identifier) {
    const windowElement = overlay.querySelector(`[data-number="${identifier}"]`);
    if (windowElement && !windowElement.classList.contains('current')) {
      moveToWindow(windowElement);
    }
  }
}

function handleWindowClick(event) {
  // Don't handle click if it's on the name button
  if (event.target.classList.contains('tabmover-name-button')) {
    return;
  }
  
  event.stopPropagation(); // Prevent closing overlay
  const windowElement = event.currentTarget;
  
  // Don't allow clicking on current window
  if (!windowElement.classList.contains('current')) {
    moveToWindow(windowElement);
  }
}

function handleNameButtonClick(event) {
  event.stopPropagation(); // Prevent closing overlay and window click
  const windowElement = event.target.closest('.tabmover-window');
  const windowId = parseInt(windowElement.dataset.windowId);
  
  showWindowNameDialog(windowId);
}

function showWindowNameDialog(windowId) {
  // Set flag to prevent window selection keystrokes
  isNamingDialogActive = true;
  
  // Get current name for the window
  chrome.runtime.sendMessage({ 
    action: 'getWindowName', 
    windowId: windowId 
  }, (response) => {
    const currentName = response.name || '';
    
    // Create naming dialog
    const nameDialog = document.createElement('div');
    nameDialog.id = 'tabmover-name-dialog';
    nameDialog.innerHTML = `
      <div class="tabmover-name-modal">
        <div class="tabmover-name-header">Name this window:</div>
        <input type="text" class="tabmover-name-input" value="${currentName}" placeholder="Enter window name..." maxlength="50">
        <div class="tabmover-name-buttons">
          <button class="tabmover-name-save">Save</button>
          <button class="tabmover-name-clear" ${!currentName ? 'disabled' : ''}>Clear</button>
          <button class="tabmover-name-cancel">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(nameDialog);
    
    const input = nameDialog.querySelector('.tabmover-name-input');
    const saveBtn = nameDialog.querySelector('.tabmover-name-save');
    const clearBtn = nameDialog.querySelector('.tabmover-name-clear');
    const cancelBtn = nameDialog.querySelector('.tabmover-name-cancel');
    
    // Focus and select input
    input.focus();
    input.select();
    
    function closeDialog() {
      nameDialog.remove();
      // Clear flag to re-enable window selection keystrokes
      isNamingDialogActive = false;
    }
    
    function saveName() {
      const name = input.value.trim();
      chrome.runtime.sendMessage({ 
        action: 'setWindowName', 
        windowId: windowId, 
        name: name 
      }, () => {
        closeDialog();
        // Refresh the window list to show updated name
        refreshWindowList();
      });
    }
    
    function clearName() {
      chrome.runtime.sendMessage({ 
        action: 'setWindowName', 
        windowId: windowId, 
        name: '' 
      }, () => {
        closeDialog();
        // Refresh the window list to show updated name
        refreshWindowList();
      });
    }
    
    // Event listeners
    saveBtn.addEventListener('click', saveName);
    clearBtn.addEventListener('click', clearName);
    cancelBtn.addEventListener('click', closeDialog);
    
    input.addEventListener('keydown', (event) => {
      // Stop all key events from propagating to prevent window selection
      event.stopPropagation();
      
      if (event.key === 'Enter') {
        saveName();
      } else if (event.key === 'Escape') {
        closeDialog();
      }
    });
    
    // Close on outside click
    nameDialog.addEventListener('click', (event) => {
      if (event.target === nameDialog) {
        closeDialog();
      }
    });
  });
}

function refreshWindowList() {
  // Re-fetch window data and update the overlay
  chrome.runtime.sendMessage({ action: 'getWindows' }, (response) => {
    if (response && response.windows && overlay) {
      // Update the windows container content
      const windowsContainer = overlay.querySelector('.tabmover-windows');
      windowsContainer.innerHTML = response.windows.map(window => `
        <div class="tabmover-window${window.isCurrent ? ' current' : ''}${window.hasCustomName ? ' has-custom-name' : ''}" data-window-id="${window.id}" data-number="${window.number}">
          <span class="tabmover-number">${window.number}</span>
          <span class="tabmover-title">${window.title}</span>
          <span class="tabmover-count">(${window.tabCount} tabs)</span>
          ${window.hasCustomName ? '<span class="tabmover-name-indicator" title="Custom name">📝</span>' : ''}
          <span class="tabmover-name-button" title="Name this window">⋯</span>
        </div>
      `).join('');
      
      // Re-attach event listeners to new elements
      overlay.querySelectorAll('.tabmover-window').forEach(windowElement => {
        windowElement.addEventListener('click', handleWindowClick);
      });
      
      overlay.querySelectorAll('.tabmover-name-button').forEach(nameButton => {
        nameButton.addEventListener('click', handleNameButtonClick);
      });
    }
  });
}

function moveToWindow(windowElement) {
  const windowId = parseInt(windowElement.dataset.windowId);
  hideWindowSelector();
  // Add a small delay to ensure overlay is removed before tab moves
  setTimeout(() => {
    chrome.runtime.sendMessage({ 
      action: 'moveTabToWindow', 
      windowId: windowId 
    });
  }, 50);
}

function hideWindowSelector() {
  if (overlay) {
    document.removeEventListener('keydown', handleKeyPress);
    overlay.remove();
    overlay = null;
  }
  // Force remove any remaining overlays
  const remainingOverlays = document.querySelectorAll('#tabmover-overlay');
  remainingOverlays.forEach(el => el.remove());
  
  // Also close any naming dialogs and clear the flag
  const nameDialogs = document.querySelectorAll('#tabmover-name-dialog');
  nameDialogs.forEach(el => el.remove());
  isNamingDialogActive = false;
}

