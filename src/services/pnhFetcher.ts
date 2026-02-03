import { logDebug, logError, logInfo, logWarn } from '../core/logger';
import { getCompressed, setCompressed } from './storageService';
import type { PnhChainEntry, PnhStateMetadata } from '../core/types';
import { withErrorBoundary } from '../utils/errorHandler';

export interface PnhLookupResult {
    found: boolean;
    data?: PnhChainEntry;
    source: 'api' | 'cache' | 'local';
}

// Spreadsheet ID and ranges from legacy WMEPH script
const SHEET_ID = '1pBz4l4cNapyGyzfMJKqA4ePEFLkmz2RryAt1UV39B4g';
const SHEET_RANGES = {
    // Main data sheet with PNH entries (USA column 3, CAN column 0)
    main: '2019.01.20.001!A2:L',
    moderators: 'Moderators!A1:F'
};

// Column indices in the main PNH sheet (legacy format)
// From legacy script: USA uses column 0 for PNH, CAN uses column 2
// (Column 3 is for category data, not PNH entries)
const COUNTRY_COLUMNS = {
    USA: 0,
    CAN: 2
};

const API_KEY_OBFUSCATED = 'YTJWNVBVRkplbUZUZVVObU1YVXpSRVZ3ZW5OaFRFSk1SbTR4VGxKblRURjJlRTFYY3pOQ2NXZElPQT09';
const CACHE_KEY = 'WMEPH-pnhCache';
const CACHE_TTL = 86400000; // 24 hours

interface PnhCachePayload {
    fetchedAt: number;
    chains: PnhChainEntry[];
    states: PnhStateMetadata[];
    moderators: Record<string, string[]>;
}

let memoryCache: PnhCachePayload | null = null;

function decodeApiKeyParam(): string {
    try {
        return atob(atob(API_KEY_OBFUSCATED));
    } catch (error) {
        logWarn('Failed to decode PNH API key', error);
        return '';
    }
}

function buildSheetsUrl(range: string): string {
    const keyParam = decodeApiKeyParam();
    const encodedRange = encodeURIComponent(range);
    return `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}?${keyParam}`;
}

async function fetchSheetValues(range: string): Promise<string[][]> {
    const result = await withErrorBoundary(
        {
            operation: 'fetchPnhData',
            details: { range },
            fatal: true,
        },
        async () => {
            const url = buildSheetsUrl(range);
            const response = await fetch(url);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`PNH fetch failed (${response.status}): ${errorBody}`);
            }

            const data = (await response.json()) as { values?: string[][] };
            return data.values ?? [];
        }
    );
    return result ?? [];
}

function normalizeHeaderKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeCountryCode(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.toUpperCase() : null;
}

function getCell(row: string[], index: number): string | undefined {
    if (index < 0 || index >= row.length) return undefined;
    const value = row[index]?.trim();
    return value ? value : undefined;
}

function parseDelimited(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .split(/[|,]/g)
        .map(item => item.trim())
        .filter(Boolean);
}

function isCacheFresh(cache: PnhCachePayload): boolean {
    return Date.now() - cache.fetchedAt < CACHE_TTL;
}

/**
 * Parse PNH data from a column in the legacy spreadsheet format.
 * Each row is a pipe-separated string with headers in the first row.
 *
 * Legacy header format uses ph_* prefixes: ph_order, ph_name, ph_aliases, etc.
 * Canada's spreadsheet may be missing 'ph_order' in the first column header (empty string).
 */
function parsePnhColumn(rows: string[][], columnIndex: number, countryCode: string): PnhChainEntry[] {
    // Extract the column data
    const columnData = rows
        .filter(row => row.length > columnIndex)
        .map(row => row[columnIndex]);

    if (columnData.length === 0) {
        logDebug('PNH column empty', { countryCode, columnIndex });
        return [];
    }

    // First row contains pipe-separated headers
    const headerRow = columnData[0];
    if (!headerRow) {
        logDebug('PNH header row empty', { countryCode, columnIndex });
        return [];
    }

    const headers = headerRow.split('|').map(h => h.trim().toLowerCase());

    // Canada's spreadsheet is missing 'ph_order' in the first column header
    if (headers[0] === '') {
        headers[0] = 'ph_order';
    }

    logDebug('PNH headers parsed', { countryCode, columnIndex, headers: headers.slice(0, 10) });

    // Find column index by header name (using ph_* format from legacy)
    const findIndex = (headerName: string): number => {
        return headers.indexOf(headerName.toLowerCase());
    };

    const columnIndexes = {
        order: findIndex('ph_order'),
        name: findIndex('ph_name'),
        aliases: findIndex('ph_aliases'),
        category1: findIndex('ph_category1'),
        category2: findIndex('ph_category2'),
        description: findIndex('ph_description'),
        url: findIndex('ph_url'),
        region: findIndex('ph_region'),
        disable: findIndex('ph_disable')
    };

    logDebug('PNH column indices', { countryCode, columnIndex, ...columnIndexes });

    // Validate required headers exist
    if (columnIndexes.name < 0) {
        logWarn('PNH parsing failed: ph_name header not found', { countryCode, headers });
        return [];
    }

    const chains: PnhChainEntry[] = [];

    // Process each data row (skip header)
    for (let i = 1; i < columnData.length; i++) {
        const rowData = columnData[i];
        if (!rowData) continue;

        const cells = rowData.split('|').map(c => c.trim());

        // Check if disabled
        const disableValue = columnIndexes.disable >= 0 ? cells[columnIndexes.disable] : '';
        if (disableValue === '1') {
            continue;
        }

        const name = columnIndexes.name >= 0 ? cells[columnIndexes.name] : '';

        // Skip invalid entries (legacy uses 'PLEASE REUSE' as placeholder)
        if (!name || name.toUpperCase() === 'PLEASE REUSE') continue;

        // Skip entries without region (legacy marks these as invalid)
        const regions = parseDelimited(columnIndexes.region >= 0 ? cells[columnIndexes.region] : '');
        if (regions.length === 0) continue;

        const id = columnIndexes.order >= 0 ? cells[columnIndexes.order] : name;
        const categories = [
            ...parseDelimited(columnIndexes.category1 >= 0 ? cells[columnIndexes.category1] : ''),
            ...parseDelimited(columnIndexes.category2 >= 0 ? cells[columnIndexes.category2] : '')
        ];

        chains.push({
            id: id || name,
            name,
            brand: null,
            aliases: parseDelimited(columnIndexes.aliases >= 0 ? cells[columnIndexes.aliases] : ''),
            categories,
            description: columnIndexes.description >= 0 ? cells[columnIndexes.description] : undefined,
            url: columnIndexes.url >= 0 ? cells[columnIndexes.url]?.replace(/^https?:\/\//i, '') : null,
            services: [],
            countryCode,
            regionCode: regions[0] ?? null,
            regionCodes: regions.length ? regions : undefined
        });
    }

    logDebug('PNH parsing complete', { countryCode, chainCount: chains.length });
    return chains;
}

function loadCache(allowExpired = false): PnhCachePayload | null {
    if (memoryCache && (allowExpired || isCacheFresh(memoryCache))) {
        return memoryCache;
    }

    const stored = getCompressed<PnhCachePayload>(CACHE_KEY);
    if (!stored) return null;
    if (!allowExpired && !isCacheFresh(stored)) return null;

    memoryCache = stored;
    return stored;
}

function saveCache(payload: PnhCachePayload): void {
    memoryCache = payload;
    setCompressed(CACHE_KEY, payload);
}

export function getStoredChains(): PnhChainEntry[] | null {
    return loadCache(true)?.chains ?? null;
}

export function getStoredStates(): PnhStateMetadata[] | null {
    return loadCache(true)?.states ?? null;
}

export function getStoredModerators(): Record<string, string[]> | null {
    return loadCache(true)?.moderators ?? null;
}

/**
 * Get state metadata by state code.
 */
export function getStateMetadata(stateCode: string): PnhStateMetadata | null {
    const states = getStoredStates();
    if (!states) return null;

    const normalizedCode = stateCode.toUpperCase();
    return states.find(s => s.stateCode.toUpperCase() === normalizedCode) ?? null;
}

/**
 * Fetch moderators list by region.
 */
async function fetchModerators(): Promise<Record<string, string[]>> {
    try {
        const rows = await fetchSheetValues(SHEET_RANGES.moderators);
        if (rows.length === 0) return {};

        const moderators: Record<string, string[]> = {};

        rows.slice(1).forEach(row => {
            const region = getCell(row, 0);
            if (!region) return;

            const mods = row.slice(1).map(v => v?.trim()).filter(Boolean);
            if (mods.length > 0) {
                moderators[region] = mods;
            }
        });

        return moderators;
    } catch (error) {
        logWarn('Failed to fetch moderators', error);
        return {};
    }
}

/**
 * Master function to download all PNH data; called on init and when user clicks "Refresh Data".
 */
export async function initPnhCache(options?: { force?: boolean }): Promise<void> {
    const force = options?.force ?? false;
    const cached = loadCache(true);
    if (!force && cached && isCacheFresh(cached)) {
        logInfo('PNH cache is fresh; skipping refresh', { fetchedAt: cached.fetchedAt });
        return;
    }

    logInfo('Downloading PNH data from Google Sheets...');
    try {
        const [mainRows, moderators] = await Promise.all([
            fetchSheetValues(SHEET_RANGES.main),
            fetchModerators()
        ]);

        // Debug: log first row to verify data format
        if (mainRows.length > 0) {
            logDebug('PNH first row sample', {
                rowCount: mainRows.length,
                colCount: mainRows[0].length,
                col0Preview: mainRows[0][0]?.substring(0, 100),
                col2Preview: mainRows[0][2]?.substring(0, 100)
            });
        }

        // Parse USA and CAN chains from their respective columns
        const usaChains = parsePnhColumn(mainRows, COUNTRY_COLUMNS.USA, 'USA');
        const canChains = parsePnhColumn(mainRows, COUNTRY_COLUMNS.CAN, 'CAN');
        const chains = [...usaChains, ...canChains];

        const payload: PnhCachePayload = {
            fetchedAt: Date.now(),
            chains,
            states: [], // State metadata not in legacy format
            moderators
        };

        saveCache(payload);
        logInfo('PNH data loaded', {
            chainCount: chains.length,
            usaCount: usaChains.length,
            canCount: canChains.length
        });
    } catch (error) {
        logError('Failed to fetch PNH data', error);
        if (!cached) {
            logWarn('PNH cache is empty; harmonizer will run without PNH data');
        } else {
            logWarn('Using cached PNH data despite refresh failure', { fetchedAt: cached.fetchedAt });
        }
    }
}

/**
 * Lookup a venue/chain in PNH data.
 */
export function lookupPnhData(venueNameOrBrand: string, countryCode?: string | null): PnhLookupResult {
    const normalizedSearch = normalizeHeaderKey(venueNameOrBrand);
    const chains = getStoredChains();

    if (!normalizedSearch) {
        logDebug('PNH lookup skipped (empty key)');
        return { found: false, source: 'cache' };
    }

    if (!chains || chains.length === 0) {
        logWarn('PNH data not loaded; using empty result');
        return { found: false, source: 'cache' };
    }

    const normalizedCountry = normalizeCountryCode(countryCode);
    const candidateChains =
        normalizedCountry
            ? chains.filter(chain => normalizeCountryCode(chain.countryCode) === normalizedCountry)
            : chains;

    const match = candidateChains.find(chain => {
        const candidates = [chain.name, chain.brand ?? '', ...(chain.aliases ?? [])];
        return candidates.some(candidate => normalizeHeaderKey(candidate) === normalizedSearch);
    });

    if (match) {
        logDebug('PNH lookup (cache)', { key: venueNameOrBrand });
        return { found: true, data: match, source: 'cache' };
    }

    logDebug('PNH lookup (not found)', { key: venueNameOrBrand });
    return { found: false, source: 'cache' };
}

/**
 * Fetch PNH data from a remote API (wrapper around cached lookups).
 */
export async function fetchPnhDataFromApi(
    venueNameOrBrand: string,
    countryCode?: string | null
): Promise<PnhLookupResult> {
    try {
        await initPnhCache();
        return lookupPnhData(venueNameOrBrand, countryCode);
    } catch (error) {
        logWarn('PNH API fetch failed', error);
        return { found: false, source: 'api' };
    }
}
