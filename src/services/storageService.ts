// Use named imports for optimal tree-shaking
import { compress, decompress } from 'lz-string';
import { logDebug, logWarn } from '../core/logger';
import type { WhitelistEntry } from '../core/types';
import { STORAGE_KEYS } from '../core/config';
import { handleSdkError } from '../utils/errorHandler';
import i18n from '../../locales/i18n';

export function getCompressed<T>(key: string): T | null {
    try {
        const compressed = localStorage.getItem(key);
        if (!compressed) return null;
        const decompressed = decompress(compressed);
        if (!decompressed) {
            logWarn(`Decompression returned null for ${key}`);
            return null;
        }
        return JSON.parse(decompressed) as T;
    } catch (error) {
        handleSdkError(
            {
                operation: 'getCompressedData',
                details: { key },
            },
            error
        );
        return null;
    }
}

export function setCompressed<T>(key: string, value: T): boolean {
    try {
        const json = JSON.stringify(value);
        const compressed = compress(json);
        if (!compressed) {
            logWarn(`Compression returned null for ${key}`);
            return false;
        }
        localStorage.setItem(key, compressed);
        logDebug(`Stored compressed data at ${key}`, { sizeRatio: compressed.length / json.length });
        return true;
    } catch (error) {
        handleSdkError(
            {
                operation: 'setCompressedData',
                details: { key },
                fatal: true,
            },
            error
        );
        return false;
    }
}

export function getWhitelist(): WhitelistEntry[] {
    const result = getCompressed<WhitelistEntry[]>(STORAGE_KEYS.whitelistCompressed);
    if (result) return result;

    // Fallback to legacy uncompressed
    try {
        const legacy = localStorage.getItem(STORAGE_KEYS.whitelistLegacy);
        if (legacy) {
            const parsed = JSON.parse(legacy) as unknown;
            const normalized = normalizeWhitelistEntries(parsed);
            if (normalized) {
                // Migrate to compressed format
                setWhitelist(normalized);
                return normalized;
            }
        }
    } catch (e) {
        logWarn('Legacy whitelist parse failed', e);
    }
    return [];
}

export function setWhitelist(entries: WhitelistEntry[]): boolean {
    return setCompressed(STORAGE_KEYS.whitelistCompressed, entries);
}

function normalizeVenueId(value: unknown): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    return null;
}

function normalizeWhitelistEntries(input: unknown): WhitelistEntry[] | null {
    if (Array.isArray(input)) {
        return input
            .map(entry => {
                const item = entry as WhitelistEntry;
                const venueId = normalizeVenueId(item?.venueId);
                return venueId ? { ...item, venueId } : null;
            })
            .filter((entry): entry is WhitelistEntry => entry !== null);
    }

    if (input && typeof input === 'object') {
        const entries: WhitelistEntry[] = [];
        Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
            if (key === '1.1.1') return;
            const item = value as WhitelistEntry;
            const venueId = normalizeVenueId(item?.venueId ?? key);
            if (!venueId) return;
            entries.push({ ...item, venueId });
        });
        return entries;
    }

    return null;
}

export interface MergeWhitelistResult {
    success: boolean;
    message: string;
    mergedCount: number;
    totalCount: number;
}

/**
 * Merge an external whitelist string into the existing whitelist.
 * Deduplicates by venueId.
 */
export function mergeWhitelist(externalWLString: string): MergeWhitelistResult {
    try {
        const parsed = JSON.parse(externalWLString) as unknown;
        const externalWL = normalizeWhitelistEntries(parsed);
        if (!externalWL) {
            return { success: false, message: i18n.t('whitelist.errors.invalidFormat'), mergedCount: 0, totalCount: 0 };
        }

        const currentWL = getWhitelist();
        const mergedMap = new Map<string, WhitelistEntry>();

        currentWL.forEach(entry => {
            const venueId = normalizeVenueId(entry.venueId);
            if (venueId) {
                mergedMap.set(venueId, { ...entry, venueId });
            }
        });

        externalWL.forEach(entry => {
            const venueId = normalizeVenueId(entry.venueId);
            if (venueId) {
                mergedMap.set(venueId, { ...entry, venueId });
            }
        });

        const merged = Array.from(mergedMap.values());
        setWhitelist(merged);

        return {
            success: true,
            message: '',
            mergedCount: externalWL.length,
            totalCount: merged.length
        };
    } catch (error) {
        return { success: false, message: i18n.t('errors.generic', { message: String(error) }), mergedCount: 0, totalCount: 0 };
    }
}

/**
 * Pull (export) the current whitelist as a JSON string.
 */
export function pullWhitelist(): string {
    const wl = getWhitelist();
    return JSON.stringify(wl, null, 2);
}

/**
 * Get whitelist statistics by state.
 */
export function getWhitelistStats(): Record<string, number> {
    const wl = getWhitelist();
    const stats: Record<string, number> = {};

    wl.forEach(entry => {
        const state = typeof entry.state === 'string' && entry.state.trim().length > 0 ? entry.state.trim() : i18n.t('labels.unknown');
        stats[state] = (stats[state] || 0) + 1;
    });

    return stats;
}

/**
 * Remove all whitelist entries for a specific state.
 */
export function removeWhitelistByState(stateAbbr: string): { success: boolean; removedCount: number } {
    const normalizedState = stateAbbr.trim().toUpperCase();
    if (!normalizedState) {
        return { success: false, removedCount: 0 };
    }

    const wl = getWhitelist();
    const filtered = wl.filter(entry => (entry.state ?? '').toUpperCase() !== normalizedState);
    const removedCount = wl.length - filtered.length;

    if (removedCount > 0) {
        setWhitelist(filtered);
    }

    return { success: true, removedCount };
}

/**
 * Share whitelist to public Google sheet via HTTP POST.
 */
export async function shareWhitelist(): Promise<{ success: boolean; message: string }> {
    const wl = getWhitelist();
    const wlString = JSON.stringify(wl);

    // Real Google Form ID from legacy WMEPH script
    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdqJpWQf2rRYkbXRt6V_wTvLo0WnFf0k_5RyOq81Fv4IRHzltC34kW3IUbXnQqDVMogwJKFNbE/formResponse';
    const formFieldId = 'entry.1875329498';

    try {
        const formData = new FormData();
        formData.append(formFieldId, wlString);

        await fetch(googleFormUrl, {
            method: 'POST',
            body: formData,
            mode: 'no-cors'
        });

        return { success: true, message: i18n.t('whitelist.shareSuccess') };
    } catch (error) {
        return { success: false, message: i18n.t('whitelist.shareErrorDetailed', { message: String(error) }) };
    }
}

export function addToWhitelist(entry: WhitelistEntry): void {
    const current = getWhitelist();
    const index = current.findIndex(e => e.venueId === entry.venueId);
    if (index >= 0) {
        current[index] = { ...current[index], ...entry };
    } else {
        current.push(entry);
    }
    setWhitelist(current);
    logDebug('Whitelist updated', { venueId: entry.venueId });
}

export function removeFromWhitelist(venueId: string): void {
    const current = getWhitelist().filter(e => e.venueId !== venueId);
    setWhitelist(current);
    logDebug('Removed from whitelist', { venueId });
}

/**
 * Reset (clear) the entire whitelist.
 */
export function resetWhitelist(): { success: boolean; clearedCount: number } {
    const current = getWhitelist();
    const clearedCount = current.length;

    setWhitelist([]);
    logDebug('Whitelist reset', { clearedCount });

    return { success: true, clearedCount };
}

/**
 * Sync whitelist venue IDs after saving new venues.
 * When a new venue is saved, WME assigns a permanent ID replacing the temporary one.
 * This function updates the whitelist to use the new permanent IDs.
 */
export function syncWhitelistVenueIds(idMapping: { oldId: string; newId: string }[]): number {
    if (idMapping.length === 0) return 0;

    const current = getWhitelist();
    let updatedCount = 0;

    const updated = current.map(entry => {
        const mapping = idMapping.find(m => m.oldId === entry.venueId);
        if (mapping) {
            updatedCount++;
            return { ...entry, venueId: mapping.newId };
        }

        // Also update dupeWhitelist entries
        if (entry.dupeWhitelist && entry.dupeWhitelist.length > 0) {
            const newDupeList = entry.dupeWhitelist.map(dupeId => {
                const dupeMapping = idMapping.find(m => m.oldId === dupeId);
                return dupeMapping ? dupeMapping.newId : dupeId;
            });
            if (JSON.stringify(newDupeList) !== JSON.stringify(entry.dupeWhitelist)) {
                updatedCount++;
                return { ...entry, dupeWhitelist: newDupeList };
            }
        }

        return entry;
    });

    if (updatedCount > 0) {
        setWhitelist(updated);
        logDebug('Whitelist IDs synced', { updatedCount, mappings: idMapping.length });
    }

    return updatedCount;
}

/**
 * Add a duplicate pair to the whitelist (for both venues).
 */
export function whitelistDuplicatePair(venueId1: string, venueId2: string): void {
    const current = getWhitelist();

    // Find or create entry for venue 1
    let entry1 = current.find(e => e.venueId === venueId1);
    if (!entry1) {
        entry1 = { venueId: venueId1, dupeWhitelist: [] };
        current.push(entry1);
    }
    if (!entry1.dupeWhitelist) entry1.dupeWhitelist = [];
    if (!entry1.dupeWhitelist.includes(venueId2)) {
        entry1.dupeWhitelist.push(venueId2);
    }

    // Find or create entry for venue 2
    let entry2 = current.find(e => e.venueId === venueId2);
    if (!entry2) {
        entry2 = { venueId: venueId2, dupeWhitelist: [] };
        current.push(entry2);
    }
    if (!entry2.dupeWhitelist) entry2.dupeWhitelist = [];
    if (!entry2.dupeWhitelist.includes(venueId1)) {
        entry2.dupeWhitelist.push(venueId1);
    }

    setWhitelist(current);
    logDebug('Duplicate pair whitelisted', { venueId1, venueId2 });
}

export interface UserSettings {
    zoomToVenue?: boolean;
    newTabSearch?: boolean;
    hideWikiButtons?: boolean;
    disableServicesButtons?: boolean;
    autoLockResidential?: boolean;
    cloneMode?: boolean;
    keyboardShortcutLetter?: string;
}

export function getSettings(): UserSettings {
    return getCompressed<UserSettings>(STORAGE_KEYS.settingsCompressed) ?? {};
}

export function saveSettings(settings: Partial<UserSettings>): void {
    const current = getSettings();
    setCompressed(STORAGE_KEYS.settingsCompressed, { ...current, ...settings });
    logDebug('Settings saved', settings);
}

export const StorageKeys = STORAGE_KEYS;
