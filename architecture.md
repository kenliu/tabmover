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

- **getWindows**: Returns list of all browser windows with metadata
- **moveTabToWindow**: Moves active tab to specified window
- **moveToLastWindow**: Moves tab to last used window (with fallback)
- **checkCustomShortcut**: Validates custom keyboard shortcuts
- **shortcutUpdated**: Updates stored custom shortcuts

#### Window Management
- Uses `chrome.windows.getAll()` to enumerate windows
- Uses `chrome.tabs.move()` to relocate tabs
- Maintains "last window" memory in `chrome.storage.sync`
- Identifies current window using `chrome.windows.getCurrent()`

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
- **createOverlay()**: Builds HTML structure for window selection

#### Event Handling
- Global keydown listener for custom shortcuts
- Overlay-specific keydown handler for number selection (1-9)
- ESC key support for cancellation
- Click-to-dismiss functionality

#### Cleanup Mechanisms
Multiple strategies to prevent overlay persistence:
- DOM cleanup on page load (`DOMContentLoaded`)
- Cleanup on window focus (tab activation)
- Force removal of any remaining overlay elements
- 50ms delay before tab moves to ensure proper cleanup

#### Current Window Highlighting
- Marks current window row with "current" CSS class
- Prevents selection of current window
- Provides visual feedback with grayed-out styling

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
6. **Background script** queries windows and returns data with current window marked
7. **Content script** creates overlay with window list
8. **User selects window** by pressing number key (1-9) or letter key (A-Z for windows 10+)
9. **Content script** hides overlay and sends `moveTabToWindow` message
10. **Background script** moves tab and updates last window memory

### Secondary Use Case: Move to Last Window

1. **User triggers shortcut** (Ctrl+Shift+L or custom)
2. **Background script** retrieves `lastWindowId` from storage
3. **Background script** validates window still exists
4. If valid: **Background script** moves tab directly
5. If invalid: **Background script** falls back to showing window selector

### Custom Shortcuts

1. **Content script** captures all keydown events
2. **Content script** sends `checkCustomShortcut` message to background
3. **Background script** compares against stored custom shortcuts
4. **Background script** responds with match status
5. **Content script** triggers appropriate action if matched

## Key Features

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