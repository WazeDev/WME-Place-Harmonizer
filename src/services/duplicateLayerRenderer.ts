import * as turf from '@turf/turf';
import type { Geometry, Point } from 'geojson';
import type { SdkFeature, WmeSDK } from 'wme-sdk-typings';
import { findNearbyVenues } from './duplicateFinder';
import { getWhitelist } from './storageService';
import type { WhitelistEntry } from '../core/types';

const LAYER_NAME = 'WMEPH_duplicates';
const MIN_ZOOM_LEVEL = 14;
const REFRESH_DEBOUNCE_MS = 150;

let layerInitialized = false;
let layerEnabled = false;
let refreshTimer: number | null = null;

/**
 * Initialize the duplicate detection layer and event handlers.
 */
export function initDuplicateLayer(sdk: WmeSDK): void {
    if (layerInitialized) return;
    layerInitialized = true;
    layerEnabled = localStorage.getItem('ShowDuplicates') === '1';

    try {
        sdk.Map.addLayer({
            layerName: LAYER_NAME,
            styleRules: [
                {
                    predicate: (_props, zoomLevel) => zoomLevel >= MIN_ZOOM_LEVEL,
                    style: {
                        fill: true,
                        fillColor: '#F44336',
                        fillOpacity: 0.7,
                        stroke: true,
                        strokeColor: '#D32F2F',
                        strokeWidth: 2,
                        pointRadius: 12,
                        graphicName: 'circle',
                        label: '${count}',
                        fontColor: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 'bold'
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
            if (payload.layerName === LAYER_NAME) {
                onDuplicateClicked(sdk, payload.featureId);
            }
        }
    });

    refreshDuplicateLayer(sdk);
}

/**
 * Refresh the duplicate layer with current venue data.
 */
export function refreshDuplicateLayer(sdk: WmeSDK): void {
    if (!layerEnabled) {
        sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });
        return;
    }

    const venues = sdk.DataModel.Venues.getAll();
    const whitelist: WhitelistEntry[] = getWhitelist();
    const whitelistById = new Map<string, WhitelistEntry>(whitelist.map(entry => [entry.venueId, entry]));
    const features: SdkFeature[] = [];

    venues.forEach(venue => {
        const point = extractPoint(venue.geometry);
        if (!point) return;

        const nearbyVenues = findNearbyVenues(sdk, venue.id, point, {
            logResults: false,
            targetCategories: venue.categories,
            venues,
            whitelist,
            whitelistById
        });
        if (nearbyVenues.length === 0) return;

        features.push({
            id: `dup_${venue.id}`,
            type: 'Feature',
            geometry: point,
            properties: {
                venueId: venue.id,
                count: String(nearbyVenues.length + 1)
            }
        });
    });

    sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });
    if (features.length > 0) {
        sdk.Map.addFeaturesToLayer({ layerName: LAYER_NAME, features });
    }
}

/**
 * Handle click on duplicate label: zoom to cluster + select the venue.
 */
function onDuplicateClicked(sdk: WmeSDK, featureId: string | number): void {
    const rawId = String(featureId);
    const venueId = rawId.startsWith('dup_') ? rawId.slice(4) : rawId;
    if (!venueId) return;

    const venue = sdk.DataModel.Venues.getById({ venueId });
    if (!venue?.geometry) return;

    const targetPoint = extractPoint(venue.geometry);
    if (!targetPoint) return;

    const nearbyVenues = findNearbyVenues(sdk, venueId, targetPoint, {
        logResults: false,
        targetCategories: venue.categories,
        venues: sdk.DataModel.Venues.getAll(),
        whitelist: getWhitelist()
    });
    const points = [targetPoint, ...nearbyVenues.map(dupe => dupe.geometry)];

    if (points.length > 1 && localStorage.getItem('DisableDFZoom') !== '1') {
        const pointFeatures = points.map(point => turf.point(point.coordinates));
        const bbox = turf.bbox(turf.featureCollection(pointFeatures)) as [number, number, number, number];
        sdk.Map.zoomToExtent({ bbox });
    }

    sdk.Editing.setSelection({
        selection: {
            ids: [venueId],
            objectType: 'venue'
        }
    });
}

/**
 * Toggle duplicate layer visibility based on user setting.
 */
export function onDuplicateLayerToggle(sdk: WmeSDK, enabled: boolean): void {
    layerEnabled = enabled;
    if (enabled) {
        refreshDuplicateLayer(sdk);
    } else {
        sdk.Map.removeAllFeaturesFromLayer({ layerName: LAYER_NAME });
    }
}

function scheduleRefresh(sdk: WmeSDK): void {
    if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
    }
    refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshDuplicateLayer(sdk);
    }, REFRESH_DEBOUNCE_MS);
}

function extractPoint(geometry?: Geometry | null): Point | null {
    if (!geometry) return null;
    if (geometry.type === 'Point') {
        return geometry as Point;
    }
    const center = turf.centroid(geometry as any);
    return center.geometry as Point;
}
