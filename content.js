let overlay = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showWindowSelector') {
    showWindowSelector();
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
          <div class="tabmover-window" data-window-id="${window.id}" data-number="${window.number}">
            <span class="tabmover-number">${window.number}</span>
            <span class="tabmover-title">${window.title}</span>
            <span class="tabmover-count">(${window.tabCount} tabs)</span>
          </div>
        `).join('')}
      </div>
      <div class="tabmover-footer">Press a number or ESC to cancel</div>
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

  const number = parseInt(event.key);
  if (number >= 1 && number <= 9) {
    const windowElement = overlay.querySelector(`[data-number="${number}"]`);
    if (windowElement) {
      const windowId = parseInt(windowElement.dataset.windowId);
      chrome.runtime.sendMessage({ 
        action: 'moveTabToWindow', 
        windowId: windowId 
      });
      hideWindowSelector();
    }
  }
}

function hideWindowSelector() {
  if (overlay) {
    document.removeEventListener('keydown', handleKeyPress);
    overlay.remove();
    overlay = null;
  }
}

