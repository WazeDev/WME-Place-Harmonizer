import type { WmeSDK, Venue } from 'wme-sdk-typings';
import i18n from '../../locales/i18n';
import type { HarmonizationChange, PnhChainEntry, PnhStateMetadata } from '../core/types';
import { lookupPnhData, getStateMetadata } from './pnhFetcher';

type ChainScope = 'local' | 'regional' | 'national';

// Default lock levels by state/region (can be overridden by PNH state metadata)
const DEFAULT_STATE_LOCKS: Record<string, number> = {
    // These are examples - actual values should come from PNH state metadata
    'CA': 3,
    'TX': 3,
    'NY': 3,
    'FL': 3
};

/**
 * Get the user's current editing rank (1-6 scale).
 */
function getUserRank(sdk: WmeSDK): number {
    try {
        const user = sdk.State.getUserInfo();
        return user?.rank ?? 1;
    } catch {
        return 1;
    }
}

/**
 * Get state-specific default lock level from PNH metadata.
 */
function getStateDefaultLock(stateCode: string | null): number | null {
    if (!stateCode) return null;

    // Try to get from PNH state metadata first
    const stateMeta = getStateMetadata(stateCode);
    if (stateMeta?.defaultLockLevel) {
        return stateMeta.defaultLockLevel;
    }

    // Fallback to hardcoded defaults
    return DEFAULT_STATE_LOCKS[stateCode.toUpperCase()] ?? null;
}

function getCurrentLockRank(venue: Venue): number {
    const parsed = Number(venue.lockRank);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getVenueCategories(venue: Venue): string[] {
    return Array.isArray(venue.categories) ? venue.categories : [];
}

function getPnhEntry(venue: Venue, countryCode?: string | null): PnhChainEntry | null {
    const brand = (venue.brand ?? '').trim();
    const name = (venue.name ?? '').trim();

    if (brand) {
        const result = lookupPnhData(brand, countryCode);
        if (result.found && result.data) return result.data;
    }

    if (name) {
        const result = lookupPnhData(name, countryCode);
        if (result.found && result.data) return result.data;
    }

    return null;
}

function getChainScope(entry: PnhChainEntry | null): ChainScope {
    if (!entry?.scope) return 'local';
    if (entry.scope === 'national' || entry.scope === 'regional' || entry.scope === 'local') {
        return entry.scope;
    }
    return 'local';
}

/**
 * Determine recommended lock rank for a venue.
 */
export function getRecommendedLockRank(
    sdk: WmeSDK,
    venue: Venue,
    countryCode?: string | null,
    stateCode?: string | null
): number {
    const pnhEntry = getPnhEntry(venue, countryCode);
    const userRank = getUserRank(sdk);
    const rawRank = computeRecommendedLockRank(sdk, venue, pnhEntry, stateCode);

    // Cap to user's rank (can't lock above your own rank)
    return Math.min(rawRank, userRank);
}

function computeRecommendedLockRank(
    sdk: WmeSDK,
    venue: Venue,
    pnhEntry: PnhChainEntry | null,
    stateCode?: string | null
): number {
    const categories = getVenueCategories(venue);

    // Start with state default if available, otherwise default to 2
    const stateDefault = getStateDefaultLock(stateCode ?? null);
    let recommendedRank = stateDefault ?? 2;

    if (pnhEntry) {
        const chainScope = getChainScope(pnhEntry);
        const chainRank = chainScope === 'national' ? 4 : chainScope === 'regional' ? 3 : 2;
        recommendedRank = Math.max(recommendedRank, chainRank);
    }

    if (categories.some(c => c === 'GAS_STATION')) {
        recommendedRank = Math.max(recommendedRank, 3);
    }

    if (categories.some(c => c === 'PARKING_LOT')) {
        const parkingType = sdk.DataModel.Venues.ParkingLot.getParkingLotType({ venueId: venue.id });
        if (parkingType === 'PUBLIC' || parkingType === 'RESTRICTED') {
            recommendedRank = Math.max(recommendedRank, 3);
        } else {
            recommendedRank = Math.max(recommendedRank, 2);
        }
    }

    // Residential places: check auto-lock setting
    if (categories.some(c => c === 'RESIDENCE' || c === 'RESIDENCE_HOME')) {
        const autoLockRPP = localStorage.getItem('WMEPH-AutoLockRPPs') === '1';
        if (autoLockRPP) {
            recommendedRank = Math.max(recommendedRank, stateDefault ?? 2);
        }
    }

    return recommendedRank;
}

/**
 * Generate lock rank change suggestion if needed.
 * Follows no-down-locking policy: never suggest lowering lock rank.
 */
export function suggestLockRankChange(
    sdk: WmeSDK,
    venue: Venue,
    countryCode?: string | null,
    stateCode?: string | null
): HarmonizationChange | null {
    const currentLockRank = getCurrentLockRank(venue);
    const pnhEntry = getPnhEntry(venue, countryCode);
    const userRank = getUserRank(sdk);
    const rawRecommendedRank = computeRecommendedLockRank(sdk, venue, pnhEntry, stateCode);

    // Cap to user's rank
    const recommendedRank = Math.min(rawRecommendedRank, userRank);

    // No-down-locking policy: never suggest lowering lock rank
    if (currentLockRank >= recommendedRank) {
        return null;
    }

    const reason = getLockRankReason(sdk, venue, pnhEntry);

    return {
        field: 'lockRank',
        oldValue: currentLockRank,
        newValue: recommendedRank,
        reason: i18n.t('lockRank.recommended', { rank: recommendedRank, reason })
    };
}

function getLockRankReason(sdk: WmeSDK, venue: Venue, pnhEntry: PnhChainEntry | null): string {
    const categories = getVenueCategories(venue);

    if (pnhEntry) {
        const scope = getChainScope(pnhEntry);
        if (scope === 'national') return i18n.t('lockRank.nationalChain');
        if (scope === 'regional') return i18n.t('lockRank.regionalChain');
        return i18n.t('lockRank.chain');
    }

    if (categories.includes('GAS_STATION')) {
        return i18n.t('lockRank.gasStation');
    }

    if (categories.includes('PARKING_LOT')) {
        const parkingType = sdk.DataModel.Venues.ParkingLot.getParkingLotType({ venueId: venue.id });
        if (parkingType === 'PUBLIC' || parkingType === 'RESTRICTED') {
            return i18n.t('lockRank.publicParking');
        }
    }

    return i18n.t('lockRank.localPlace');
}
