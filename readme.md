# TabMover

A Chrome extension that makes it easy to move tabs between windows with keyboard shortcuts.

## Features

### 🎯 **Window Selector Overlay**
- Press **Ctrl+Shift+M** (Cmd+Shift+M on Mac) to show a numbered list of all open windows
- Type a number to instantly move the current tab to that window
- Clean, centered overlay that doesn't interfere with your workflow

### ⚡ **Quick Move to Last Window**
- Press **Ctrl+Shift+L** (Cmd+Shift+L on Mac) to instantly move the current tab to the last window you used
- Perfect for quickly bouncing tabs between two windows
- Smart fallback: shows window selector if no last window exists

### ⚙️ **Customizable Shortcuts**
- Set your own keyboard shortcuts in the options page
- Both Chrome's built-in shortcuts and custom shortcuts are supported
- Right-click extension icon → "Options" to configure

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension is now ready to use!

## Usage

### Basic Tab Moving
1. **Ctrl+Shift+M** (or Cmd+Shift+M) - Opens window selector
2. **Type a number** (1-9) - Moves tab to that window
3. **ESC** - Cancel and close overlay

### Quick Last Window Move
1. **Ctrl+Shift+L** (or Cmd+Shift+L) - Moves tab to last used window
2. If no last window exists, shows the window selector instead

### Customization
1. Right-click the extension icon and select "Options"
2. Click in a shortcut field and press your desired key combination
3. Save settings

## How It Works

The extension remembers which window you last moved a tab to. This enables the quick "move to last window" feature that's perfect for organizing tabs between specific windows.

## Permissions

- **tabs** - Required to move tabs between windows
- **activeTab** - Required to identify the current tab
- **storage** - Required to remember shortcuts and last window

## Contributing

Feel free to open issues or submit pull requests on [GitHub](https://github.com/kenliu/tabmover).