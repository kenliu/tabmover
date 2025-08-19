document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadCurrentShortcut();
  
  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('shortcut').addEventListener('keydown', captureShortcut);
});

function loadSettings() {
  chrome.storage.sync.get(['customShortcut'], (result) => {
    if (result.customShortcut) {
      document.getElementById('shortcut').value = result.customShortcut;
    }
  });
}

function loadCurrentShortcut() {
  chrome.commands.getAll((commands) => {
    const moveTabCommand = commands.find(cmd => cmd.name === 'move-tab');
    const currentShortcut = document.getElementById('current-shortcut');
    
    if (moveTabCommand && moveTabCommand.shortcut) {
      currentShortcut.textContent = moveTabCommand.shortcut;
    } else {
      currentShortcut.textContent = 'No shortcut set in Chrome';
    }
  });
}

function captureShortcut(event) {
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
  document.getElementById('shortcut').value = shortcut;
}

function saveSettings() {
  const customShortcut = document.getElementById('shortcut').value.trim();
  
  chrome.storage.sync.set({
    customShortcut: customShortcut
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Saved!';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
    
    chrome.runtime.sendMessage({ action: 'shortcutUpdated', shortcut: customShortcut });
  });
}