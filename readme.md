# TabMover

A Chrome extension that makes it easy to move tabs between windows with keyboard shortcuts.

## Features

### 🎯 **Smart Window Selector Overlay**
- Press **Ctrl+Shift+M** (Cmd+Shift+M on Mac) to show a numbered list of all open windows
- Type a number (1-9) or letter (A-Z for windows 10+) to instantly move the current tab to that window
- **Click any window** or use keyboard shortcuts for flexible interaction
- **Scrollable interface** automatically handles many windows without clipping
- Clean, centered overlay that doesn't interfere with your workflow

### 🏷️ **Persistent Window Naming**
- **Name your windows** with custom labels that persist across browser restarts
- Click the **⋯ button** on any window to set a custom name
- **Intelligent fingerprinting** remembers window names based on content (domains, tab patterns)
- Names survive browser restarts, tab moves, and window reorganization
- Visual indicators show which windows have custom names (📝 icon + blue border)

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
2. **Click a window, type number/letter, or click ⋯ to name** - Multiple interaction options
3. **Numbers 1-9, Letters A-Z** - Keyboard shortcuts for up to 35 windows
4. **ESC** - Cancel and close overlay

### Window Naming
1. **Click ⋯ button** on any window in the selector
2. **Type custom name** - Up to 50 characters
3. **Enter to save, Escape to cancel** - Standard dialog controls
4. **Names persist** across browser restarts and tab reorganization

### Quick Last Window Move
1. **Ctrl+Shift+L** (or Cmd+Shift+L) - Moves tab to last used window
2. If no last window exists, shows the window selector instead

### Advanced Features
- **Automatic fingerprinting** - Windows remembered by content patterns
- **Dynamic updates** - Names stay current as you move tabs between windows
- **Scrollable overlay** - Handles unlimited windows gracefully
- **Visual indicators** - Blue borders and 📝 icons show named windows

### Customization
1. Right-click the extension icon and select "Options"
2. **Keyboard Shortcuts** - Set custom key combinations
3. **Window Names** - View, edit, and manage all named windows
4. **Cleanup tools** - Remove old or unused window names

## How It Works

### Window Identification
TabMover uses **intelligent fingerprinting** to identify windows based on their content:
- **Domain patterns** - Unique combinations of websites in each window
- **Tab composition** - Number of tabs and primary active domain
- **Similarity matching** - 50%+ similarity threshold for reliable identification
- **Persistent storage** - Names sync across devices via Chrome storage

### Last Window Memory
The extension remembers which window you last moved a tab to. This enables the quick "move to last window" feature that's perfect for organizing tabs between specific windows.

### Dynamic Updates
- **Real-time fingerprinting** - Window fingerprints update as you move tabs
- **Automatic recalculation** - Both manual and extension-based tab moves trigger updates
- **Smart key management** - Handles significant fingerprint changes gracefully

## Permissions

- **tabs** - Required to move tabs between windows
- **activeTab** - Required to identify the current tab
- **storage** - Required to remember shortcuts and last window

## Contributing

Feel free to open issues or submit pull requests on [GitHub](https://github.com/kenliu/tabmover).