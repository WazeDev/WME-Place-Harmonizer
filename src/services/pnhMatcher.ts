import i18n from '../../locales/i18n';
import { logDebug, logWarn } from '../core/logger';
import type { HarmonizationChange, HarmonizationIssue, PnhChainEntry, PnhStateMetadata } from '../core/types';
import { getStoredChains, getStoredStates } from './pnhFetcher';
import type { WmeSDK } from 'wme-sdk-typings';

interface SearchToken {
    tight: string;
    spaced: string;
}

interface ScopeResult {
    countryOk: boolean;
    outOfRegion: boolean;
    regionMatch: boolean;
    region?: string | null;
}

export interface PnhMatchResult {
    entry: PnhChainEntry;
    matchedBy: 'brand' | 'name' | 'alias' | 'partial' | 'regex';
    value: string;
    scope: ScopeResult;
}

export interface PnhHarmonizationResult {
    match: PnhMatchResult | null;
    changes: HarmonizationChange[];
    issues: HarmonizationIssue[];
    nextCategories?: string[];
    nextServices?: string[];
}

// Common spelling/word variations seen in PNH data; used to expand search tokens
const WORD_VARIATIONS: string[][] = [
    ['&', 'AND'],
    ['CENTER', 'CENTRE'],
    ['THEATER', 'THEATRE'],
    ['COLOR', 'COLOUR'],
    ['FAVOUR', 'FAVOR'],
    ['TYRE', 'TIRE'],
    ['MT', 'MOUNT'],
    ['ST', 'SAINT'],
    ['SHOPPE', 'SHOP'],
    ['MART', 'MKT'],
];

const CATEGORY_APPEND_MAP: Record<string, string[]> = {
    HOTEL: ['HOTEL'],
    BANK_FINANCIAL: ['BANK', 'ATM'],
    SUPERMARKET_GROCERY: ['SUPERMARKET'],
    GYM_FITNESS: ['GYM'],
    GAS_STATION: ['GAS', 'GASOLINE', 'FUEL', 'STATION', 'GASSTATION'],
    CAR_RENTAL: ['RENTAL', 'RENTACAR', 'CARRENTAL', 'RENTALCAR']
};

const MIN_TOKEN_LENGTH = 3;
const MATCHED_BY_PRIORITY: Record<PnhMatchResult['matchedBy'], number> = {
    regex: 4,
    brand: 3,
    name: 2,
    alias: 1,
    partial: 0
};

const MANUAL_SERVICE_MAP: Record<string, string> = {
    ps_valet: 'VALLET_SERVICE',
    ps_drivethru: 'DRIVETHROUGH',
    ps_wifi: 'WI_FI',
    ps_restrooms: 'RESTROOMS',
    ps_cc: 'CREDIT_CARDS',
    ps_reservations: 'RESERVATIONS',
    ps_outside: 'OUTSIDE_SEATING',
    ps_ac: 'AIR_CONDITIONING',
    ps_parking: 'PARKING_FOR_CUSTOMERS',
    ps_deliveries: 'DELIVERIES',
    ps_takeaway: 'TAKE_AWAY',
    ps_wheelchair: 'WHEELCHAIR_ACCESSIBLE',
    ps_curbside: 'CURBSIDE_PICKUP'
};

let cachedSdkCategoryMap: Record<string, string> | null = null;

function normalizeCode(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.toUpperCase() : null;
}

function normalizeCategoryKey(value: string | null | undefined): string | null {
    if (!value) return null;
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return normalized.length ? normalized : null;
}

function normalizeServiceKey(value: string | null | undefined): string | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length ? normalized : null;
}

function tighten(str: string): string {
    return str.toUpperCase().replace(/ AND /g, '').replace(/^THE /, '').replace(/[^A-Z0-9]/g, '');
}

function normalizeWithSpaces(str: string): string {
    return str.toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(values.filter(v => typeof v === 'string' && v.trim().length > 0).map(v => v!.trim())));
}

function applyWordVariations(value: string, variants: Set<string>): void {
    const upper = value.toUpperCase();
    variants.add(upper);
    WORD_VARIATIONS.forEach(group => {
        group.forEach(option => {
            if (!upper.includes(option)) return;
            group.forEach(replacement => {
                if (replacement === option) return;
                variants.add(upper.replace(option, replacement));
            });
        });
    });
}

function buildSdkCategoryMap(sdk: WmeSDK): Record<string, string> {
    if (cachedSdkCategoryMap) return cachedSdkCategoryMap;

    const map: Record<string, string> = {};
    try {
        const categories = sdk.DataModel.Venues.getAllVenueCategories();
        categories.forEach(cat => {
            const key = normalizeCategoryKey(cat.localizedName) ?? normalizeCategoryKey(cat.id);
            if (key) {
                map[key] = cat.id;
            }
        });
    } catch (error) {
        logWarn('Failed to build SDK category map', error);
    }

    cachedSdkCategoryMap = map;
    return map;
}

function mapCategoriesToWme(categories: string[], sdk: WmeSDK): string[] {
    const mapped: string[] = [];
    const sdkMap = buildSdkCategoryMap(sdk);

    categories.forEach(category => {
        const key = normalizeCategoryKey(category);
        if (!key) return;
        // Try SDK map first, then use category as-is if valid
        const target = sdkMap[key] ?? category;
        if (target) {
            if (!mapped.includes(target)) {
                mapped.push(target);
            }
        } else {
            logWarn('Unrecognized PNH category', { category });
        }
    });

    return mapped;
}

function mapServicesToWme(services: string[]): string[] {
    const mapped: string[] = [];

    services.forEach(service => {
        const key = normalizeServiceKey(service);
        if (!key) return;
        // Use manual service map, fall back to service as-is
        const target = MANUAL_SERVICE_MAP[key] ?? service.toUpperCase();
        if (target) {
            if (!mapped.includes(target)) {
                mapped.push(target);
            }
        } else {
            logWarn('Unrecognized PNH service', { service: key });
        }
    });

    return mapped;
}

function buildSearchTokens(entry: PnhChainEntry): SearchToken[] {
    const tokens: SearchToken[] = [];
    const normalizedCategories = (entry.categories ?? [])
        .map(cat => normalizeCode(cat))
        .filter((cat): cat is string => Boolean(cat));
    const baseNames = uniqStrings([
        entry.name,
        entry.brand ?? undefined,
        ...(entry.aliases ?? [])
    ]);

    baseNames.forEach(base => {
        const variants = new Set<string>();
        applyWordVariations(base, variants);

        // Category-based appended words
        const appendWords: string[] = [];
        normalizedCategories.forEach(cat => {
            CATEGORY_APPEND_MAP[cat]?.forEach(word => appendWords.push(word));
        });

        Array.from(variants).forEach(variant => {
            tokens.push({
                tight: tighten(variant),
                spaced: normalizeWithSpaces(variant)
            });
            appendWords.forEach(word => {
                tokens.push({
                    tight: tighten(`${variant} ${word}`),
                    spaced: normalizeWithSpaces(`${variant} ${word}`)
                });
            });
        });
    });

    const deduped: SearchToken[] = [];
    const seen = new Set<string>();
    tokens.forEach(token => {
        if (!token.tight || token.tight.length < MIN_TOKEN_LENGTH) return;
        if (seen.has(token.tight)) return;
        seen.add(token.tight);
        deduped.push(token);
    });
    return deduped;
}

function resolveStateInfo(address: any, states: PnhStateMetadata[]): { stateCode?: string | null; regionCode?: string | null } {
    const stateName = normalizeCode(address?.state?.abbr ?? address?.state?.name);
    if (!stateName) return {};

    const match = states.find(
        state => normalizeCode(state.stateCode) === stateName || normalizeCode(state.stateName) === stateName
    );

    if (match) {
        return { stateCode: normalizeCode(match.stateCode), regionCode: normalizeCode(match.region) };
    }
    return { stateCode: stateName, regionCode: undefined };
}

function evaluateScope(
    entry: PnhChainEntry,
    countryCode: string | null | undefined,
    address: any,
    states: PnhStateMetadata[]
): ScopeResult {
    const entryCountry = normalizeCode(entry.countryCode);
    const venueCountry = normalizeCode(countryCode ?? address?.country?.abbr ?? address?.country?.name);

    if (entryCountry && venueCountry && entryCountry !== venueCountry) {
        return { countryOk: false, outOfRegion: true, regionMatch: false };
    }

    const entryRegions = uniqStrings([
        ...(entry.regionCodes ?? []),
        entry.regionCode ?? undefined
    ])
        .map(region => normalizeCode(region))
        .filter((region): region is string => Boolean(region));

    const { stateCode, regionCode } = resolveStateInfo(address, states);
    const venueRegions = uniqStrings([regionCode ?? undefined, stateCode ?? undefined])
        .map(region => normalizeCode(region))
        .filter((region): region is string => Boolean(region));

    if (entryRegions.length === 0) {
        return { countryOk: true, outOfRegion: false, regionMatch: true, region: regionCode ?? null };
    }

    if (venueRegions.length === 0) {
        return { countryOk: true, outOfRegion: false, regionMatch: false, region: regionCode ?? stateCode ?? null };
    }

    const regionMatch = venueRegions.some(region => entryRegions.includes(region));
    if (!regionMatch && entry.scope === 'national') {
        return {
            countryOk: true,
            outOfRegion: false,
            regionMatch: true,
            region: regionCode ?? stateCode ?? null
        };
    }
    return {
        countryOk: true,
        outOfRegion: !regionMatch,
        regionMatch,
        region: regionCode ?? stateCode ?? null
    };
}

function arraysEqualIgnoreOrder(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const aSet = new Set(a);
    const bSet = new Set(b);
    if (aSet.size !== bSet.size) return false;
    return Array.from(aSet).every(value => bSet.has(value));
}

function findBestMatch(
    venue: any,
    address: any,
    countryCode: string | null | undefined,
    chains: PnhChainEntry[],
    states: PnhStateMetadata[]
): PnhMatchResult | null {
    const venueName = venue?.name ?? '';
    const venueBrand = venue?.brand ?? '';
    const venueAliases: string[] = Array.isArray(venue?.aliases) ? venue.aliases : [];
    const venueCategories: string[] = Array.isArray(venue?.categories)
        ? venue.categories
              .map((cat: string) => normalizeCode(cat))
              .filter((cat: string | null): cat is string => Boolean(cat))
        : [];

    const normalizedName = tighten(venueName);
    const normalizedBrand = tighten(venueBrand);
    const normalizedAliases = new Set(venueAliases.map(alias => tighten(alias)));
    const spacedName = ` ${normalizeWithSpaces(venueName)} `;

    let best: PnhMatchResult | null = null;
    let bestScore = -Infinity;
    let bestMeta: { regionMatch: boolean; matchedBy: PnhMatchResult['matchedBy']; categoryOverlap: boolean } | null = null;

    const isBetter = (
        score: number,
        meta: { regionMatch: boolean; matchedBy: PnhMatchResult['matchedBy']; categoryOverlap: boolean }
    ) => {
        if (score > bestScore) return true;
        if (score < bestScore) return false;
        if (bestMeta) {
            if (meta.regionMatch !== bestMeta.regionMatch) return meta.regionMatch;
            const candidatePriority = MATCHED_BY_PRIORITY[meta.matchedBy];
            const bestPriority = MATCHED_BY_PRIORITY[bestMeta.matchedBy];
            if (candidatePriority !== bestPriority) return candidatePriority > bestPriority;
            if (meta.categoryOverlap !== bestMeta.categoryOverlap) return meta.categoryOverlap;
        }
        return false;
    };

    chains.forEach(entry => {
        const scope = evaluateScope(entry, countryCode, address, states);
        if (!scope.countryOk) return;

        const tokens = buildSearchTokens(entry);
        const normalizedEntryCategories = (entry.categories ?? [])
            .map(cat => normalizeCode(cat))
            .filter((cat): cat is string => Boolean(cat));

        if (entry.nameRegex) {
            try {
                const regex = new RegExp(entry.nameRegex, 'i');
                if (regex.test(venueName) || regex.test(venueBrand)) {
                    const candidateScore = 7 + (scope.regionMatch ? 1 : 0);
                    const meta = { regionMatch: scope.regionMatch, matchedBy: 'regex' as const, categoryOverlap: false };
                    if (isBetter(candidateScore, meta)) {
                        best = {
                            entry,
                            matchedBy: 'regex',
                            value: entry.nameRegex ?? '',
                            scope
                        };
                        bestScore = candidateScore;
                        bestMeta = meta;
                    }
                }
            } catch (error) {
                logWarn('Invalid PNH regex', { regex: entry.nameRegex });
            }
        }

        tokens.forEach(token => {
            let score = 0;
            let matchedBy: PnhMatchResult['matchedBy'] | null = null;

            if (token.tight === normalizedBrand) {
                score = 6;
                matchedBy = 'brand';
            } else if (token.tight === normalizedName || normalizedAliases.has(token.tight)) {
                score = 5;
                matchedBy = normalizedAliases.has(token.tight) ? 'alias' : 'name';
            } else if (spacedName.includes(` ${token.spaced} `)) {
                score = 3;
                matchedBy = 'partial';
            } else if (normalizedName.includes(token.tight) || normalizedBrand.includes(token.tight)) {
                score = 2;
                matchedBy = 'partial';
            }

            if (score === 0) return;

            const categoryOverlap = normalizedEntryCategories.some(cat => venueCategories.includes(cat));
            if (categoryOverlap) score += 1;
            if (scope.regionMatch) score += 1;

            const meta = {
                regionMatch: scope.regionMatch,
                matchedBy: matchedBy ?? 'partial',
                categoryOverlap
            };

            if (isBetter(score, meta)) {
                bestScore = score;
                bestMeta = meta;
                best = {
                    entry,
                    matchedBy: matchedBy ?? 'partial',
                    value: token.spaced,
                    scope
                };
            }
        });
    });

    return best;
}

function sanitizeUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    const withoutProto = value.replace(/^https?:\/\//i, '').trim();
    return withoutProto.length > 0 ? withoutProto : null;
}

function mergeAliases(existing: string[], incoming: string[], nameToAvoid: string | null): string[] {
    const base = uniqStrings(existing);
    const extras = uniqStrings(incoming);
    const merged = uniqStrings([...extras, ...base]);
    if (nameToAvoid) {
        const normalizedName = nameToAvoid.toUpperCase();
        return merged.filter(alias => alias.toUpperCase() !== normalizedName);
    }
    return merged;
}

export function harmonizeWithPnh(
    sdk: WmeSDK,
    venue: any,
    address: any,
    countryCode?: string | null
): PnhHarmonizationResult {
    const chains = getStoredChains() ?? [];
    const states = getStoredStates() ?? [];

    if (chains.length === 0) {
        logWarn('PNH data unavailable; skipping PNH harmonization');
        return { match: null, changes: [], issues: [] };
    }

    const match = findBestMatch(venue, address, countryCode ?? null, chains, states);
    if (!match) {
        return { match: null, changes: [], issues: [] };
    }

    if (match.scope.outOfRegion) {
        return {
            match,
            changes: [],
            issues: [
                {
                    field: 'pnh',
                    severity: 'medium',
                    message: i18n.t('pnh.outOfRegion')
                }
            ]
        };
    }

    const issues: HarmonizationIssue[] = [];
    const changes: HarmonizationChange[] = [];
    const entry = match.entry;

    const desiredBrand = entry.brand ?? entry.name ?? null;
    const desiredName = entry.name ?? desiredBrand ?? null;
    const desiredAliases = entry.aliases ?? [];
    const desiredCategories = mapCategoriesToWme(entry.categories ?? [], sdk);
    const desiredServices = mapServicesToWme(entry.services ?? []);
    const desiredUrl = sanitizeUrl(entry.url);

    if (desiredName && desiredName !== (venue.name ?? '')) {
        changes.push({
            field: 'name',
            oldValue: venue.name ?? null,
            newValue: desiredName,
            reason: i18n.t('pnh.name')
        });
    }

    if (desiredBrand && desiredBrand !== (venue.brand ?? '')) {
        changes.push({
            field: 'brand',
            oldValue: venue.brand ?? null,
            newValue: desiredBrand,
            reason: i18n.t('pnh.brand')
        });
    }

    if (desiredAliases.length > 0) {
        const mergedAliases = mergeAliases(venue.aliases ?? [], desiredAliases, desiredName);
        if (!arraysEqualIgnoreOrder(mergedAliases, venue.aliases ?? [])) {
            changes.push({
                field: 'aliases',
                oldValue: venue.aliases ?? [],
                newValue: mergedAliases,
                reason: i18n.t('pnh.aliases')
            });
        }
    }

    if (desiredCategories.length > 0 && !arraysEqualIgnoreOrder(desiredCategories, venue.categories ?? [])) {
        changes.push({
            field: 'categories',
            oldValue: venue.categories ?? [],
            newValue: desiredCategories,
            reason: i18n.t('pnh.categories')
        });
    }

    if (desiredServices.length > 0 && !arraysEqualIgnoreOrder(desiredServices, venue.services ?? [])) {
        changes.push({
            field: 'services',
            oldValue: venue.services ?? [],
            newValue: desiredServices,
            reason: i18n.t('pnh.services')
        });
    }

    if (desiredUrl && desiredUrl !== sanitizeUrl(venue.url ?? null)) {
        changes.push({
            field: 'url',
            oldValue: sanitizeUrl(venue.url ?? null),
            newValue: desiredUrl,
            reason: i18n.t('pnh.url')
        });
    }

    if (entry.description && entry.description !== (venue.description ?? '')) {
        changes.push({
            field: 'description',
            oldValue: venue.description ?? null,
            newValue: entry.description,
            reason: i18n.t('pnh.description')
        });
    }

    logDebug('PNH match found', {
        matchedBy: match.matchedBy,
        value: match.value,
        entry: {
            id: entry.id,
            name: entry.name,
            brand: entry.brand,
            regions: entry.regionCodes ?? entry.regionCode
        }
    });

    return {
        match,
        changes,
        issues,
        nextCategories: desiredCategories.length ? desiredCategories : undefined,
        nextServices: desiredServices.length ? desiredServices : undefined
    };
}
