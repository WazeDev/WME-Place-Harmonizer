import * as turf from '@turf/turf';
import type { WmeSDK, Venue } from 'wme-sdk-typings';
import type { Point, Geometry } from 'geojson';
import { logDebug, logInfo } from '../core/logger';
import { getWhitelist } from './storageService';
import type { WhitelistEntry } from '../core/types';

const DEFAULT_RADIUS_METERS = 800;

export interface DuplicateMatch {
    venueId: string;
    venueName: string;
    distance: number; // meters
    geometry: Point;
    matchType: 'proximity' | 'name' | 'alias';
    similarity?: number; // 0-1 for name/alias matches
}

/**
 * Normalize a string for comparison (lowercase, remove special chars, trim).
 */
function normalizeString(s: string): string {
    return (s ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1).
 */
function calculateSimilarity(a: string, b: string): number {
    const normalA = normalizeString(a);
    const normalB = normalizeString(b);

    if (!normalA || !normalB) return 0;
    if (normalA === normalB) return 1;

    const maxLen = Math.max(normalA.length, normalB.length);
    const distance = levenshteinDistance(normalA, normalB);

    return 1 - (distance / maxLen);
}

/**
 * Check if two venue names are similar enough to be considered duplicates.
 */
function areNamesSimilar(name1: string, name2: string, threshold = 0.7): boolean {
    return calculateSimilarity(name1, name2) >= threshold;
}

/**
 * Check if a venue name matches any of the aliases.
 */
function matchesAlias(name: string, aliases: string[], threshold = 0.8): { match: boolean; similarity: number } {
    const normalName = normalizeString(name);

    for (const alias of aliases) {
        const normalAlias = normalizeString(alias);
        if (normalName === normalAlias) {
            return { match: true, similarity: 1 };
        }
        const similarity = calculateSimilarity(name, alias);
        if (similarity >= threshold) {
            return { match: true, similarity };
        }
    }

    return { match: false, similarity: 0 };
}

function extractPoint(geometry: Geometry): Point | null {
    if (!geometry) return null;
    if (geometry.type === 'Point') {
        return geometry as Point;
    }
    const center = turf.centroid(geometry as any);
    return center.geometry as Point;
}

/**
 * Find nearby venues within radius of the given target geometry.
 * Uses both proximity and name/alias matching for duplicate detection.
 * Filters out whitelisted duplicates and returns sorted by match quality.
 */
export function findNearbyVenues(
    sdk: WmeSDK,
    targetVenueId: string | number,
    targetGeometry: Geometry,
    options: {
        radius?: number;
        logResults?: boolean;
        targetCategories?: string[];
        targetName?: string;
        targetAliases?: string[];
        venues?: Venue[];
        whitelist?: WhitelistEntry[];
        whitelistById?: Map<string, WhitelistEntry>;
        enableNameMatching?: boolean;
    } = {}
): DuplicateMatch[] {
    const radius = options.radius ?? DEFAULT_RADIUS_METERS;
    const logResults = options.logResults ?? true;
    const enableNameMatching = options.enableNameMatching ?? true;

    const targetId = String(targetVenueId);
    const targetPoint = extractPoint(targetGeometry);
    if (!targetPoint) return [];

    // Get target venue info for name matching
    const targetVenue = sdk.DataModel.Venues.getById({ venueId: targetId });
    const targetName = options.targetName ?? targetVenue?.name ?? '';
    const targetAliases = options.targetAliases ?? targetVenue?.aliases ?? [];

    const whitelist = options.whitelist ?? getWhitelist();
    const whitelistById =
        options.whitelistById ??
        new Map<string, WhitelistEntry>(whitelist.map(entry => [entry.venueId, entry]));
    const targetDupeWhitelist = new Set(
        (whitelistById.get(targetId)?.dupeWhitelist ?? []).map(id => String(id))
    );

    const excludePLA = localStorage.getItem('ExcludePLADupes') === '1';
    if (excludePLA) {
        const targetCategories =
            options.targetCategories ?? targetVenue?.categories;
        if (targetCategories?.some(c => c === 'PARKING_LOT')) {
            return [];
        }
    }

    const allVenues = options.venues ?? sdk.DataModel.Venues.getAll();

    const matches: DuplicateMatch[] = [];

    for (const venue of allVenues) {
        const vid = String(venue.id);
        if (vid === targetId) continue;

        if (excludePLA && venue.categories?.some(c => c === 'PARKING_LOT')) {
            continue;
        }

        // Skip whitelisted duplicate pairs
        if (targetDupeWhitelist.has(vid)) {
            continue;
        }
        const wl = whitelistById.get(vid);
        if (wl?.dupeWhitelist && wl.dupeWhitelist.includes(targetId)) {
            continue;
        }

        const point = extractPoint(venue.geometry);
        if (!point) continue;

        // Turf distance in meters
        const distance = turf.distance(targetPoint, point, { units: 'meters' });

        // Only consider venues within radius
        if (distance > radius) continue;

        // Determine match type and similarity
        let matchType: DuplicateMatch['matchType'] = 'proximity';
        let similarity: number | undefined;

        if (enableNameMatching && targetName) {
            const venueName = venue.name ?? '';
            const venueAliases = venue.aliases ?? [];

            // Check name similarity
            const nameSimilarity = calculateSimilarity(targetName, venueName);
            if (nameSimilarity >= 0.7) {
                matchType = 'name';
                similarity = nameSimilarity;
            }

            // Check if target name matches venue aliases
            if (!similarity) {
                const aliasMatch = matchesAlias(targetName, venueAliases, 0.8);
                if (aliasMatch.match) {
                    matchType = 'alias';
                    similarity = aliasMatch.similarity;
                }
            }

            // Check if venue name matches target aliases
            if (!similarity && targetAliases.length > 0) {
                const reverseMatch = matchesAlias(venueName, targetAliases, 0.8);
                if (reverseMatch.match) {
                    matchType = 'alias';
                    similarity = reverseMatch.similarity;
                }
            }
        }

        matches.push({
            venueId: vid,
            venueName: venue.name,
            distance: Math.round(distance),
            geometry: point,
            matchType,
            similarity
        });
    }

    // Sort by match quality: name matches first, then alias, then proximity
    // Within same type, sort by similarity (desc) then distance (asc)
    matches.sort((a, b) => {
        const typeOrder = { name: 0, alias: 1, proximity: 2 };
        const typeDiff = typeOrder[a.matchType] - typeOrder[b.matchType];
        if (typeDiff !== 0) return typeDiff;

        // For name/alias matches, prioritize higher similarity
        if (a.similarity !== undefined && b.similarity !== undefined) {
            const simDiff = b.similarity - a.similarity;
            if (Math.abs(simDiff) > 0.01) return simDiff;
        }

        // Fallback to distance
        return a.distance - b.distance;
    });

    if (logResults) {
        const nameMatches = matches.filter(m => m.matchType === 'name').length;
        const aliasMatches = matches.filter(m => m.matchType === 'alias').length;
        const proximityMatches = matches.filter(m => m.matchType === 'proximity').length;

        logInfo(`Found ${matches.length} potential duplicates within ${radius}m`, {
            targetVenueId: targetId,
            nameMatches,
            aliasMatches,
            proximityMatches
        });
        logDebug('Potential duplicates sample', matches.slice(0, 5));
    }

    return matches;
}
