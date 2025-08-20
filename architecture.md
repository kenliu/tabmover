# TabMover Architecture Documentation

## Overview

TabMover is a Chrome extension that allows users to quickly move tabs between browser windows using keyboard shortcuts. The extension provides both a visual window selector overlay and a quick "move to last window" feature.

## Extension Structure

The extension follows the Chrome Extension Manifest V3 architecture with the following components:

### Core Files

- **manifest.json** - Extension configuration and permissions
- **background.js** - Service worker handling Chrome APIs and tab management
- **content.js** - Content script injected into all pages for UI interaction
- **overlay.css** - Styling for the window selector overlay
- **options.html** - Settings page UI
- **options.js** - Settings page functionality

## Architecture Components

### 1. Background Service Worker (background.js)

The background script serves as the central coordinator and handles:

#### Command Handling
- Listens for Chrome keyboard commands via `chrome.commands.onCommand`
- **move-tab**: Shows window selector overlay
- **move-to-last**: Moves tab to previously used window

#### Message Processing
Handles inter-component communication via `chrome.runtime.onMessage`:

- **getWindows**: Returns list of all browser windows with metadata and fingerprint matching
- **moveTabToWindow**: Moves active tab to specified window with fingerprint updates
- **moveToLastWindow**: Moves tab to last used window (with fallback)
- **checkCustomShortcut**: Validates custom keyboard shortcuts
- **shortcutUpdated**: Updates stored custom shortcuts
- **setWindowName**: Stores custom window name using fingerprint key
- **getWindowName**: Retrieves custom window name via fingerprint matching
- **getAllFingerprints**: Returns all stored window fingerprints for management
- **removeFingerprint**: Deletes specific window fingerprint
- **cleanupFingerprints**: Removes old fingerprints (30+ days)

#### Window Management
- Uses `chrome.windows.getAll()` to enumerate windows
- Uses `chrome.tabs.move()` to relocate tabs
- Maintains "last window" memory in `chrome.storage.sync`
- Identifies current window using `chrome.windows.getCurrent()`

#### Window Fingerprinting System
Intelligent window identification that persists across browser restarts:

- **createWindowFingerprint()**: Generates unique signatures based on:
  - Domain collection from all tabs (sorted, unique)
  - Tab count and primary domain (active tab)
  - Timestamp for cleanup purposes
- **calculateFingerprintSimilarity()**: Scoring algorithm:
  - 60% weight: Domain overlap (intersection/union ratio)
  - 30% weight: Primary domain exact match
  - 10% weight: Tab count similarity
- **findBestFingerprintMatch()**: Finds stored names with 50%+ similarity threshold
- **updateWindowFingerprints()**: Recalculates fingerprints after tab moves
- **generateFingerprintKey()**: Creates readable storage keys from fingerprint data

#### Dynamic Fingerprint Updates
- **chrome.tabs.onAttached**: Listens for manual tab drag-and-drop operations
- **Post-move updates**: Automatically recalculates fingerprints after TabMover operations
- **Smart key management**: Handles fingerprint changes while preserving custom names

#### Shortcut Parsing
The `isShortcutMatch()` function provides flexible shortcut matching:
- Parses shortcut strings (e.g., "Ctrl+Shift+M")
- Validates modifier key combinations
- Supports platform-specific keys (Command on Mac)

### 2. Content Script (content.js)

Injected into all web pages to provide user interface:

#### Overlay Management
- **showWindowSelector()**: Creates and displays window picker overlay
- **hideWindowSelector()**: Removes overlay and cleans up event listeners
- **createOverlay()**: Builds HTML structure for window selection with naming features
- **refreshWindowList()**: Updates overlay content after window name changes

#### Event Handling
- Global keydown listener for custom shortcuts with naming dialog isolation
- **handleKeyPress()**: Enhanced keyboard handler for numbers (1-9) and letters (A-Z)
- **handleWindowClick()**: Click support for window selection
- **handleNameButtonClick()**: Naming dialog trigger via ⋯ button
- ESC key support for cancellation and dialog closing
- Click-to-dismiss functionality with background/modal distinction

#### Window Naming Interface
- **showWindowNameDialog()**: Creates modal dialog for window naming
- **Keyboard isolation**: Prevents window selection during text input
- **Dialog state management**: Global flag (`isNamingDialogActive`) prevents keystroke conflicts
- **Input validation**: 50-character limit and trimming
- **Real-time updates**: Names immediately reflected in overlay after save

#### Cleanup Mechanisms
Multiple strategies to prevent overlay persistence:
- DOM cleanup on page load (`DOMContentLoaded`)
- Cleanup on window focus (tab activation)
- Force removal of any remaining overlay elements
- 50ms delay before tab moves to ensure proper cleanup
- **Naming dialog cleanup**: Removes naming dialogs when main overlay closes
- **State flag reset**: Ensures `isNamingDialogActive` is properly cleared

#### Enhanced Window Display
- **Custom name priority**: Shows fingerprint-matched names over tab titles
- **Visual indicators**: Blue border + 📝 icon for named windows
- **Current window highlighting**: Grayed-out styling prevents self-selection
- **Responsive design**: Scrollable container handles unlimited windows
- **Accessibility**: Tooltips and clear visual hierarchy

### 3. User Interface (overlay.css)

Provides modern, accessible styling:

#### Modal Design
- Full-screen overlay with dark backdrop
- Centered modal with clean typography
- Responsive design with min/max widths

#### Window List Styling
- Flexbox layout for consistent spacing
- Numbered selection indicators
- Hover states for interactive feedback
- Disabled state for current window

#### Visual Hierarchy
- Clear typography scale
- Consistent spacing and padding
- High contrast colors for accessibility

### 4. Options Page (options.html + options.js)

Configuration interface for custom shortcuts:

#### Settings Management
- Custom shortcut input with live capture
- Storage via `chrome.storage.sync`
- Display of current Chrome-configured shortcuts

#### Shortcut Capture
- Real-time keyboard event capture
- Modifier key detection and formatting
- Prevention of invalid key combinations

## Communication Flow

### Primary Use Case: Show Window Selector

1. **User triggers shortcut** (Ctrl+Shift+M or custom)
2. **Background script** receives command via `chrome.commands.onCommand`
3. **Background script** sends `showWindowSelector` message to active tab
4. **Content script** receives message and calls `showWindowSelector()`
5. **Content script** requests window list via `getWindows` message
6. **Background script** queries windows, performs fingerprint matching, returns enhanced data
7. **Content script** creates overlay with window list including custom names and visual indicators
8. **User selects window** by pressing number/letter key, clicking window, or clicking ⋯ to name
9. **Content script** processes action (move tab or show naming dialog)
10. **Background script** moves tab, updates fingerprints, and maintains last window memory

### Secondary Use Case: Move to Last Window

1. **User triggers shortcut** (Ctrl+Shift+L or custom)
2. **Background script** retrieves `lastWindowId` from storage
3. **Background script** validates window still exists
4. If valid: **Background script** moves tab directly
5. If invalid: **Background script** falls back to showing window selector

### Window Naming Flow

1. **User clicks ⋯ button** on window in overlay
2. **Content script** sets `isNamingDialogActive = true` and shows naming dialog
3. **Content script** requests current name via `getWindowName` message
4. **Background script** performs fingerprint matching and returns stored name
5. **User types name** with keyboard isolation preventing window selection
6. **User saves/cancels** via Enter/Escape or button clicks
7. **Content script** sends `setWindowName` message with new name
8. **Background script** creates/updates fingerprint entry in storage
9. **Content script** refreshes overlay to show updated name and clears dialog state

### Custom Shortcuts

1. **Content script** captures all keydown events
2. **Content script** sends `checkCustomShortcut` message to background
3. **Background script** compares against stored custom shortcuts
4. **Background script** responds with match status
5. **Content script** triggers appropriate action if matched

## Key Features

### Persistent Window Naming
- **Content-based identification**: Uses domain patterns and tab composition
- **Restart survival**: Names persist across browser sessions via fingerprinting
- **Dynamic updates**: Fingerprints recalculate when tabs move between windows
- **Similarity matching**: 50% threshold ensures reliable window identification
- **Cross-device sync**: Names sync across Chrome instances via `chrome.storage.sync`

### Window Memory
- Tracks the last window used for tab moves
- Enables quick "move to last" functionality
- Falls back gracefully when last window is closed

### Robust Overlay Management
- Multiple cleanup strategies prevent UI persistence
- Handles tab context switching during moves
- Force removes any orphaned overlay elements

### Flexible Shortcuts
- Supports both Chrome's built-in commands and custom shortcuts
- Custom shortcuts work on any page via content script
- Comprehensive modifier key support

### Current Window Detection
- Prevents moving tab to its current window
- Visual indication of current location
- Improved user experience and error prevention

### Settings Persistence
- Uses Chrome's sync storage for cross-device settings
- Real-time shortcut capture in options page
- Displays both custom and Chrome-configured shortcuts

## Error Handling

### Window Validation
- Checks if target window still exists before moving
- Falls back to window selector if last window is invalid
- Handles Chrome API errors gracefully

### Overlay Cleanup
- Multiple cleanup mechanisms prevent stuck overlays
- Force removal on page transitions
- Event listener cleanup prevents memory leaks

### Message Handling
- Proper async response handling with `return true`
- Graceful degradation when messages fail
- Timeout handling for delayed operations

## Performance Considerations

### Efficient Window Queries
- Batches window enumeration with tab population
- Caches window data during overlay display
- Minimal DOM manipulation

### Event Management
- Adds/removes event listeners appropriately
- Uses event delegation where possible
- Cleans up resources on overlay hide

### Storage Optimization
- Uses sync storage for cross-device settings
- Minimal storage footprint
- Efficient key-value access patterns

This architecture provides a robust, user-friendly tab management experience while maintaining good performance and handling edge cases gracefully.