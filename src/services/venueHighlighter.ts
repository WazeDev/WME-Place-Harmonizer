import type { SdkFeature, Venue, VenueAddress, VenueCategoryId, WmeSDK } from 'wme-sdk-typings';
import type { WhitelistEntry } from '../core/types';
import { getWhitelist } from './storageService';
import { refreshFilterLayer } from './filterHighlighter';

interface HighlightSettings {
    colorHighlighting: boolean;
    disableHoursHL: boolean;
    disableRankHL: boolean;
    disableWLHL: boolean;
    plaTypeFill: boolean;
    showFilterHighlight: boolean;
}

type HighlightCompleteness = 'green' | 'yellow' | 'red' | 'gray';

const LAYER_NAME = 'WMEPH_highlights';
const MIN_ZOOM_LEVEL = 14;

const COLOR_GREEN = '#4CAF50';
const COLOR_YELLOW = '#FFC107';
const COLOR_RED = '#F44336';
const COLOR_GRAY = '#999999';
const COLOR_BLUE = '#2196F3';

const LOW_PRIORITY_HOURS_CATEGORIES = new Set<VenueCategoryId>([
    'SCHOOL',
    'CONVENTIONS_EVENT_CENTER',
    'CAMPING_TRAILER_PARK',
    'COTTAGE_CABIN',
    'COLLEGE_UNIVERSITY',
    'GOLF_COURSE',
    'SPORTS_COURT',
    'MOVIE_THEATER',
    'SHOPPING_CENTER',
    'RELIGIOUS_CENTER',
    'PARKING_LOT',
    'PARK',
    'PLAYGROUND',
    'AIRPORT',
    'FIRE_DEPARTMENT',
    'POLICE_STATION',
    'SEAPORT_MARINA_HARBOR',
    'FARM',
    'SCENIC_LOOKOUT_VIEWPOINT'
]);

let layerInitialized = false;
let refreshTimer: number | null = null;

/**
 * Initialize the highlighting layer and set up event listeners.
 */
export async function initHighlightingLayer(sdk: WmeSDK): Promise<void> {
    if (layerInitialized) return;
    layerInitialized = true;

    try {
        sdk.Map.addLayer({
            layerName: LAYER_NAME,
            styleContext: {
                getFillColor: ({ feature }) => {
                    const color = feature?.properties?.colorCode;
                    return typeof color === 'string' ? color : COLOR_GRAY;
                }
            },
            styleRules: [
                {
                    predicate: (_props, zoomLevel) => zoomLevel >= MIN_ZOOM_LEVEL,
                    style: {
                        fill: true,
                        fillColor: '${getFillColor}',
                        fillOpacity: 0.5,
                        stroke: false,
                        pointRadius: 8,
                        graphicName: 'circle'
                    }
                }
            ]
        });
    } catch {
        // Layer may already exist from a previous initialization.
    }

    sdk.Events.trackDataModelEvents({ dataModelName: 'venues' });

    const refreshHandler = (payload: { dataModelName?: string }): void => {
        if (payload.dataModelName === 'venues') {
            scheduleRefresh(sdk);
        }
    };

    sdk.Events.on({ eventName: 'wme-data-model-objects-changed', eventHandler: refreshHandler });
    sdk.Events.on({ eventName: 'wme-data-model-objects-added', eventHandler: refreshHandler });
    sdk.Events.on({ eventName: 'wme-data-model-objects-removed', eventHandler: refreshHandler });
    sdk.Events.on({ eventName: 'wme-data-model-objects-saved', eventHandler: refreshHandler });

    sdk.Events.trackLayerEvents({ layerName: LAYER_NAME });
    sdk.Events.on({
        eventName: 'wme-layer-feature-clicked',
        eventHandler: (payload: { layerName: string; featureId: string | number }): void => {
            if (payload.layerName !== LAYER_NAME) return;
            const featureId = String(payload.featureId);
            if (!featureId.startsWith('hl_')) return;
            const venueId = featureId.slice(3);
            if (!venueId) return;
            sdk.Editing.setSelection({
                selection: {
                    ids: [venueId],
                    objectType: 'venue'
                }
            });
        }
    });

    await refreshHighlightingLayer(sdk);
}

/**
 * Refresh the highlighting layer with current venue data.
 */
export async function refreshHighlightingLayer(sdk: WmeSDK): Promise<void> {
    const settings = getHighlightSettings();

    if (!settings.colorHighlighting) {
        sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });
        return;
    }

    const whitelist = settings.disableWLHL ? [] : getWhitelist();
    const venues = sdk.DataModel.Venues.getAll();
    const features: SdkFeature[] = [];

    venues.forEach(venue => {
        const feature = createHighlightFeature(sdk, venue, settings, whitelist);
        if (feature) {
            features.push(feature);
        }
    });

    sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });
    if (features.length > 0) {
        sdk.Map.addFeaturesToLayer({ layerName: LAYER_NAME, features });
    }
}

/**
 * Handle checkbox toggle for ColorHighlighting.
 */
export function onHighlightingToggle(sdk: WmeSDK, enabled: boolean): void {
    localStorage.setItem('ColorHighlighting', enabled ? '1' : '0');
    void refreshHighlightingLayer(sdk);
}

/**
 * Handle color highlighting checkbox changes (hours, rank, WL, filter).
 */
export function onHighlightingSettingChange(sdk: WmeSDK): void {
    void refreshHighlightingLayer(sdk);
    void refreshFilterLayer(sdk);
}

function scheduleRefresh(sdk: WmeSDK): void {
    if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
    }
    refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshHighlightingLayer(sdk);
    }, 150);
}

function createHighlightFeature(
    sdk: WmeSDK,
    venue: Venue,
    settings: HighlightSettings,
    whitelist: WhitelistEntry[]
): SdkFeature | null {
    if (!venue.geometry) return null;

    const address = sdk.DataModel.Venues.getAddress({ venueId: venue.id });
    const whitelistEntry = settings.disableWLHL ? undefined : whitelist.find(entry => entry.venueId === venue.id);
    const highlight = getHighlightForVenue(sdk, venue, address, settings, whitelistEntry);

    if (!highlight) return null;

    return {
        id: `hl_${venue.id}`,
        type: 'Feature',
        geometry: venue.geometry,
        properties: {
            venueId: venue.id,
            venueName: venue.name || 'Unknown',
            completeness: highlight.completeness,
            issueCount: highlight.issueCount,
            colorCode: highlight.colorCode
        }
    };
}

function getHighlightForVenue(
    sdk: WmeSDK,
    venue: Venue,
    address: VenueAddress,
    settings: HighlightSettings,
    whitelistEntry?: WhitelistEntry
): { completeness: HighlightCompleteness; colorCode: string; issueCount: number } | null {
    const userRank = sdk.State.getUserInfo()?.rank ?? 0;
    if (!settings.disableRankHL && venue.lockRank > userRank) {
        return { completeness: 'gray', colorCode: COLOR_GRAY, issueCount: 0 };
    }

    if (settings.plaTypeFill && venue.categories.includes('PARKING_LOT')) {
        const parkingType = sdk.DataModel.Venues.ParkingLot.getParkingLotType({ venueId: venue.id });
        if (parkingType === 'PUBLIC') {
            return { completeness: 'green', colorCode: COLOR_BLUE, issueCount: 0 };
        }
        if (parkingType === 'RESTRICTED') {
            return { completeness: 'yellow', colorCode: COLOR_YELLOW, issueCount: 0 };
        }
        if (parkingType === 'PRIVATE') {
            return { completeness: 'red', colorCode: COLOR_RED, issueCount: 0 };
        }
    }

    const { criticalIssues, nonCriticalIssues } = getMissingFields(venue, address, settings, whitelistEntry);
    const issueCount = criticalIssues.length + nonCriticalIssues.length;
    let completeness: HighlightCompleteness = 'green';
    let colorCode = COLOR_GREEN;

    if (criticalIssues.length > 0) {
        completeness = 'red';
        colorCode = COLOR_RED;
    } else if (nonCriticalIssues.length > 0) {
        completeness = 'yellow';
        colorCode = COLOR_YELLOW;
    }

    if (whitelistEntry && issueCount > 0) {
        completeness = 'red';
        colorCode = COLOR_RED;
    }

    return { completeness, colorCode, issueCount };
}

function getMissingFields(
    venue: Venue,
    address: VenueAddress,
    settings: HighlightSettings,
    whitelistEntry?: WhitelistEntry
): { criticalIssues: string[]; nonCriticalIssues: string[] } {
    const criticalIssues: string[] = [];
    const nonCriticalIssues: string[] = [];

    const hasName = venue.name.trim().length > 0;
    if (!hasName) {
        criticalIssues.push('name');
    }

    const hasAddress = Boolean(address?.street && address?.houseNumber && !address?.isEmpty);
    if (!hasAddress && !whitelistEntry?.allowMissingAddress) {
        criticalIssues.push('address');
    }

    const hasPhone = venue.phone.trim().length > 0;
    if (!hasPhone && !whitelistEntry?.allowMissingPhone) {
        nonCriticalIssues.push('phone');
    }

    const hasUrl = venue.url.trim().length > 0;
    if (!hasUrl && !whitelistEntry?.allowMissingUrl) {
        nonCriticalIssues.push('url');
    }

    const hasHours = (venue.openingHours?.length ?? 0) > 0;
    if (!hasHours && !settings.disableHoursHL && !whitelistEntry?.allowMissingHours) {
        if (isLowPriorityHoursCategory(venue)) {
            nonCriticalIssues.push('hours');
        } else {
            criticalIssues.push('hours');
        }
    }

    return { criticalIssues, nonCriticalIssues };
}

function isLowPriorityHoursCategory(venue: Venue): boolean {
    return venue.categories.some(category => LOW_PRIORITY_HOURS_CATEGORIES.has(category));
}

function getHighlightSettings(): HighlightSettings {
    return {
        colorHighlighting: localStorage.getItem('ColorHighlighting') === '1',
        disableHoursHL: localStorage.getItem('DisableHoursHL') === '1',
        disableRankHL: localStorage.getItem('DisableRankHL') === '1',
        disableWLHL: localStorage.getItem('DisableWLHL') === '1',
        plaTypeFill: localStorage.getItem('PLATypeFill') === '1',
        showFilterHighlight: localStorage.getItem('ShowFilterHighlight') === '1'
    };
}
