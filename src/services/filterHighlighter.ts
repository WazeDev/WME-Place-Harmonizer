import type { SdkFeature, ServiceType, Venue, WmeSDK } from 'wme-sdk-typings';

const LAYER_NAME = 'WMEPH_filter_highlights';
const MIN_ZOOM_LEVEL = 14;
const COLOR_FILL = '#9C27B0';
const COLOR_STROKE = '#7B1FA2';

export const FILTER_SERVICE_TYPES: ServiceType[] = [
    'PARKING_FOR_CUSTOMERS',
    'WHEELCHAIR_ACCESSIBLE',
    'WI_FI',
    'CREDIT_CARDS',
    'RESTROOMS',
    'OUTSIDE_SEATING',
    'DRIVETHROUGH',
    'DELIVERIES',
    'TAKE_AWAY',
    'RESERVATIONS'
];

export type FilterServiceType = (typeof FILTER_SERVICE_TYPES)[number];
export const DEFAULT_FILTER_SERVICE_TYPE: FilterServiceType = FILTER_SERVICE_TYPES[0];

type FilterSettings = {
    enabled: boolean;
    serviceType: FilterServiceType | '';
};

let initialized = false;
let refreshTimer: number | null = null;

/**
 * Initialize the filter highlighting layer and wire refresh triggers.
 */
export function initFilterHighlightingLayer(sdk: WmeSDK): void {
    if (initialized) return;
    initialized = true;

    try {
        sdk.Map.addLayer({
            layerName: LAYER_NAME,
            styleRules: [
                {
                    predicate: (_props, zoomLevel) => zoomLevel >= MIN_ZOOM_LEVEL,
                    style: {
                        fill: true,
                        fillColor: COLOR_FILL,
                        fillOpacity: 0.6,
                        stroke: true,
                        strokeColor: COLOR_STROKE,
                        strokeWidth: 2,
                        pointRadius: 10,
                        graphicName: 'circle'
                    }
                }
            ]
        });
    } catch {
        // Layer may already exist from a prior initialization.
    }

    sdk.Events.trackDataModelEvents({ dataModelName: 'venues' });

    const refreshHandler = (payload: { dataModelName?: string }): void => {
        if (payload.dataModelName !== 'venues') return;
        scheduleRefresh(sdk);
    };

    sdk.Events.on({ eventName: 'wme-data-model-objects-changed', eventHandler: refreshHandler });
    sdk.Events.on({ eventName: 'wme-data-model-objects-added', eventHandler: refreshHandler });
    sdk.Events.on({ eventName: 'wme-data-model-objects-removed', eventHandler: refreshHandler });
    sdk.Events.on({ eventName: 'wme-data-model-objects-saved', eventHandler: refreshHandler });

    sdk.Events.trackLayerEvents({ layerName: LAYER_NAME });
    sdk.Events.on({
        eventName: 'wme-layer-feature-clicked',
        eventHandler: payload => {
            if (payload.layerName !== LAYER_NAME) return;
            const venueId = parseVenueId(String(payload.featureId));
            if (!venueId) return;
            sdk.Editing.setSelection({ selection: { ids: [venueId], objectType: 'venue' } });
        }
    });

    void refreshFilterLayer(sdk);
}

/**
 * Refresh the filter layer using the latest settings and venue data.
 */
export async function refreshFilterLayer(sdk: WmeSDK): Promise<void> {
    const settings = getFilterSettings();

    if (!settings.enabled || !settings.serviceType) {
        sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });
        return;
    }

    const serviceType = settings.serviceType;

    const venues = sdk.DataModel.Venues.getAll();
    const features: SdkFeature[] = [];

    venues.forEach(venue => {
        if (!venue.geometry) return;
        if (!isMissingService(venue, serviceType)) return;

        features.push({
            id: `filter_${venue.id}`,
            type: 'Feature',
            geometry: venue.geometry,
            properties: {
                venueId: venue.id,
                venueName: venue.name || 'Unknown',
                missingService: serviceType
            }
        });
    });

    sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });
    if (features.length > 0) {
        sdk.Map.addFeaturesToLayer({ layerName: LAYER_NAME, features });
    }
}

export function onFilterHighlightToggle(sdk: WmeSDK, enabled: boolean): void {
    localStorage.setItem('ShowFilterHighlight', enabled ? '1' : '0');
    void refreshFilterLayer(sdk);
}

export function onFilterServiceTypeChange(sdk: WmeSDK, serviceType: string): void {
    const isSupported = FILTER_SERVICE_TYPES.includes(serviceType as FilterServiceType);
    const nextValue = isSupported ? (serviceType as FilterServiceType) : DEFAULT_FILTER_SERVICE_TYPE;
    localStorage.setItem('FilterServiceType', nextValue);
    void refreshFilterLayer(sdk);
}

function scheduleRefresh(sdk: WmeSDK): void {
    if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
    }

    refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshFilterLayer(sdk);
    }, 150);
}

function isMissingService(venue: Venue, serviceType: FilterServiceType): boolean {
    const services = Array.isArray(venue.services) ? venue.services : [];
    return !services.includes(serviceType as ServiceType);
}

function getFilterSettings(): FilterSettings {
    const stored = localStorage.getItem('FilterServiceType') as FilterServiceType | null;
    const serviceType = FILTER_SERVICE_TYPES.includes(stored as FilterServiceType)
        ? (stored as FilterServiceType)
        : DEFAULT_FILTER_SERVICE_TYPE;

    return {
        enabled: localStorage.getItem('ShowFilterHighlight') === '1',
        serviceType
    };
}

function parseVenueId(featureId: string): string | null {
    const trimmed = featureId.startsWith('filter_') ? featureId.slice(7) : featureId;
    return trimmed.length > 0 ? trimmed : null;
}
