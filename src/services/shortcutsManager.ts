import type { WmeSDK } from 'wme-sdk-typings';
import { logWarn, logDebug } from '../core/logger';
import { getSettings, saveSettings } from './storageService';

// Shortcut IDs
const SHORTCUT_RUN = 'wmeph-run';
const SHORTCUT_HIGHLIGHT = 'wmeph-highlight';
const SHORTCUT_FILTER = 'wmeph-filter';
const SHORTCUT_ZOOM = 'wmeph-zoom';

// Legacy compatibility
const SHORTCUT_ID = SHORTCUT_RUN;
const DEFAULT_SHORTCUT_LETTER = 'A';
const LEGACY_SETTING_KEY = 'WMEPH_KeyboardShortcut';

// Shortcut callbacks storage
let highlightCallback: (() => void) | null = null;
let filterCallback: (() => void) | null = null;
let zoomCallback: (() => void) | null = null;

function normalizeShortcutLetter(letter: string | null | undefined): string | null {
    if (!letter) return null;
    const match = letter.match(/[a-z]/i);
    return match ? match[0].toUpperCase() : null;
}

function getStoredShortcutLetter(): string {
    const settingsLetter = normalizeShortcutLetter(getSettings().keyboardShortcutLetter);
    if (settingsLetter) {
        localStorage.setItem(LEGACY_SETTING_KEY, settingsLetter);
        return settingsLetter;
    }

    const legacyLetter = normalizeShortcutLetter(localStorage.getItem(LEGACY_SETTING_KEY));
    if (legacyLetter) {
        saveSettings({ keyboardShortcutLetter: legacyLetter });
        return legacyLetter;
    }

    localStorage.setItem(LEGACY_SETTING_KEY, DEFAULT_SHORTCUT_LETTER);
    return DEFAULT_SHORTCUT_LETTER;
}

function buildShortcutKeys(letter: string): string {
    return `AS+${letter}`;
}

function registerShortcut(
    sdk: WmeSDK,
    letter: string,
    description: string,
    onShortcutActivate: () => void
): boolean {
    const shortcutKeys = buildShortcutKeys(letter);

    // Check for conflicts with other scripts
    if (sdk.Shortcuts.areShortcutKeysInUse({ shortcutKeys })) {
        logWarn(`Shortcut keys ${shortcutKeys} are already in use by another script`, {
            letter,
            shortcutKeys
        });
        return false;
    }

    sdk.Shortcuts.createShortcut({
        shortcutId: SHORTCUT_ID,
        description,
        shortcutKeys,
        callback: onShortcutActivate
    });

    return true;
}

export function getShortcutLetter(): string {
    return getStoredShortcutLetter();
}

export function initShortcuts(sdk: WmeSDK, onShortcutActivate: () => void, description: string): void {
    const letter = getStoredShortcutLetter();
    try {
        if (sdk.Shortcuts.isShortcutRegistered({ shortcutId: SHORTCUT_ID })) {
            return;
        }
        const success = registerShortcut(sdk, letter, description, onShortcutActivate);
        if (!success) {
            logWarn(`Could not register shortcut AS+${letter}; keys may be in use by another script`);
        }
    } catch (error) {
        logWarn('Failed to register shortcut', error);
    }
}

export function updateShortcutLetter(
    sdk: WmeSDK,
    letter: string,
    onShortcutActivate: () => void,
    description: string
): string | null {
    const normalized = normalizeShortcutLetter(letter);
    if (!normalized) {
        logWarn('Invalid shortcut letter', letter);
        return null;
    }

    saveSettings({ keyboardShortcutLetter: normalized });
    localStorage.setItem(LEGACY_SETTING_KEY, normalized);

    try {
        if (sdk.Shortcuts.isShortcutRegistered({ shortcutId: SHORTCUT_ID })) {
            sdk.Shortcuts.deleteShortcut({ shortcutId: SHORTCUT_ID });
        }
        const success = registerShortcut(sdk, normalized, description, onShortcutActivate);
        if (!success) {
            logWarn(`Could not register updated shortcut AS+${normalized}; keys may be in use by another script`);
        }
    } catch (error) {
        logWarn('Failed to update shortcut', error);
    }

    return normalized;
}

/**
 * Register additional shortcuts for highlighting, filter toggle, and zoom.
 */
export function registerAdditionalShortcuts(
    sdk: WmeSDK,
    options: {
        onToggleHighlight?: () => void;
        onToggleFilter?: () => void;
        onZoomToVenue?: () => void;
    }
): void {
    highlightCallback = options.onToggleHighlight ?? null;
    filterCallback = options.onToggleFilter ?? null;
    zoomCallback = options.onZoomToVenue ?? null;

    // Toggle highlighting: Shift+Alt+H
    if (highlightCallback) {
        try {
            if (!sdk.Shortcuts.isShortcutRegistered({ shortcutId: SHORTCUT_HIGHLIGHT })) {
                const keys = 'AS+H';
                if (!sdk.Shortcuts.areShortcutKeysInUse({ shortcutKeys: keys })) {
                    sdk.Shortcuts.createShortcut({
                        shortcutId: SHORTCUT_HIGHLIGHT,
                        description: 'Toggle WMEPH place highlighting',
                        shortcutKeys: keys,
                        callback: highlightCallback
                    });
                    logDebug('Registered highlight shortcut: Shift+Alt+H');
                }
            }
        } catch (error) {
            logWarn('Failed to register highlight shortcut', error);
        }
    }

    // Toggle filter: Shift+Alt+F
    if (filterCallback) {
        try {
            if (!sdk.Shortcuts.isShortcutRegistered({ shortcutId: SHORTCUT_FILTER })) {
                const keys = 'AS+F';
                if (!sdk.Shortcuts.areShortcutKeysInUse({ shortcutKeys: keys })) {
                    sdk.Shortcuts.createShortcut({
                        shortcutId: SHORTCUT_FILTER,
                        description: 'Toggle WMEPH service filter highlighting',
                        shortcutKeys: keys,
                        callback: filterCallback
                    });
                    logDebug('Registered filter shortcut: Shift+Alt+F');
                }
            }
        } catch (error) {
            logWarn('Failed to register filter shortcut', error);
        }
    }

    // Zoom to venue: Ctrl+Alt+Z
    if (zoomCallback) {
        try {
            if (!sdk.Shortcuts.isShortcutRegistered({ shortcutId: SHORTCUT_ZOOM })) {
                const keys = 'CA+Z';
                if (!sdk.Shortcuts.areShortcutKeysInUse({ shortcutKeys: keys })) {
                    sdk.Shortcuts.createShortcut({
                        shortcutId: SHORTCUT_ZOOM,
                        description: 'Zoom to selected venue',
                        shortcutKeys: keys,
                        callback: zoomCallback
                    });
                    logDebug('Registered zoom shortcut: Ctrl+Alt+Z');
                }
            }
        } catch (error) {
            logWarn('Failed to register zoom shortcut', error);
        }
    }
}
