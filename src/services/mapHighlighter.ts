import type { WmeSDK } from 'wme-sdk-typings';
import type { Point, Polygon } from 'geojson';
import { logDebug } from '../core/logger';
import type { HarmonizationReport } from './harmonizer';
import { withErrorBoundary } from '../utils/errorHandler';

// Track active marker IDs for cleanup
const activeMarkerIds: string[] = [];

/**
 * Add a colored marker to the map overlay layer based on venue completeness.
 */
export async function addVenueMarker(
    sdk: WmeSDK,
    layerName: string,
    report: HarmonizationReport
): Promise<void> {
    try {
        const venue = sdk.DataModel.Venues.getById({ venueId: String(report.venueId) });
        if (!venue) {
            logDebug('Venue not found for marker', { venueId: report.venueId });
            return;
        }

        // Use venue geometry if available
        const geometry = venue.geometry as Point | Polygon;
        if (geometry.type !== 'Point' && geometry.type !== 'Polygon') {
            logDebug('Unsupported geometry for marker');
            return;
        }

        // For Polygon venues, use the first coordinate of the exterior ring
        let point: Point;
        if (geometry.type === 'Point') {
            point = geometry;
        } else {
            const polygon = geometry as Polygon;
            const firstCoord = polygon.coordinates[0][0];
            point = { type: 'Point', coordinates: [firstCoord[0], firstCoord[1]] };
        }

        const markerId = `marker-${report.venueId}`;
        const feature = {
            id: markerId,
            type: 'Feature' as const,
            geometry: point,
            properties: {
                completeness: report.completeness,
                venueName: report.venueName,
                issuesCount: report.issues.length,
                changesCount: report.changes.length
            }
        };

        await withErrorBoundary(
            {
                operation: 'addFeatureToLayer',
                venueId: String(report.venueId),
                details: { layerName, markerId },
            },
            () => {
                sdk.Map.addFeatureToLayer({
                    layerName,
                    feature
                });

                // Track marker for cleanup
                if (!activeMarkerIds.includes(markerId)) {
                    activeMarkerIds.push(markerId);
                }

                logDebug('Added venue marker', {
                    venueId: report.venueId,
                    completeness: report.completeness
                });
            }
        );
    } catch (error) {
        logDebug('Failed to add venue marker', error);
    }
}

/**
 * Clear all markers from the overlay layer.
 */
export async function clearVenueMarkers(sdk: WmeSDK, layerName: string): Promise<void> {
    try {
        let removedCount = 0;
        while (activeMarkerIds.length > 0) {
            const markerId = activeMarkerIds.pop();
            if (markerId) {
                await withErrorBoundary(
                    {
                        operation: 'removeFeatureFromLayer',
                        details: { layerName, markerId },
                    },
                    () => {
                        sdk.Map.removeFeatureFromLayer({
                            layerName,
                            featureId: markerId
                        });
                        removedCount++;
                    }
                );
            }
        }
        logDebug(`Cleared ${removedCount} venue markers from ${layerName}`);
    } catch (error) {
        logDebug('Failed to clear venue markers', error);
    }
}
