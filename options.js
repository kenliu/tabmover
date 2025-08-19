document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadCurrentShortcuts();
  
  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('shortcut').addEventListener('keydown', (e) => captureShortcut(e, 'shortcut'));
  document.getElementById('lastShortcut').addEventListener('keydown', (e) => captureShortcut(e, 'lastShortcut'));
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