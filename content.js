let overlay = null;

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
          <div class="tabmover-window${window.isCurrent ? ' current' : ''}" data-window-id="${window.id}" data-number="${window.number}">
            <span class="tabmover-number">${window.number}</span>
            <span class="tabmover-title">${window.title}</span>
            <span class="tabmover-count">(${window.tabCount} tabs)</span>
          </div>
        `).join('')}
      </div>
      <div class="tabmover-footer">Press a number (1-9) or letter (A-Z) or ESC to cancel</div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.addEventListener('keydown', handleKeyPress);
  overlay.addEventListener('click', hideWindowSelector);
}

function handleKeyPress(event) {
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
  }
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
}

