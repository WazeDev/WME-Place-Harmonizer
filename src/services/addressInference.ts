import type { WmeSDK } from 'wme-sdk-typings';
import * as turf from '@turf/turf';
import type { HarmonizationChange } from '../core/types';
import { logDebug, logInfo } from '../core/logger';
import i18n from '../../locales/i18n';

/**
 * Infer missing address from nearby road segments.
 * Suggests street and/or city if venue has no address but nearby segments do.
 *
 * @param sdk - WME SDK instance
 * @param venue - Venue object with geometry
 * @returns Array of suggested HarmonizationChange objects for address fields
 */
export function inferAddressFromSegments(sdk: WmeSDK, venue: any): HarmonizationChange[] {
  const changes: HarmonizationChange[] = [];

  // Check if address inference is enabled via setting
  const enableInference = localStorage.getItem('EnableAddressInference') === '1';
  if (!enableInference) {
    logDebug('Address inference disabled in settings');
    return changes;
  }

  try {
    // Get venue's current address
    const venueAddress = sdk.DataModel.Venues.getAddress({ venueId: String(venue.id) });
    const hasStreet = Boolean(venueAddress.street);
    const hasCity = Boolean(venueAddress.city);

    // If address is complete, skip inference
    if (hasStreet && hasCity) {
      logDebug(`Venue ${venue.id} has complete address, skipping inference`);
      return changes;
    }

    // Find nearest segment
    const nearestSegment = findNearestSegment(sdk, venue.geometry);
    if (!nearestSegment) {
        logDebug(`No segments within 100m of venue ${venue.id}`);
        return changes;
    }

    const segmentAddress = sdk.DataModel.Segments.getAddress({ segmentId: nearestSegment.id });

    // Suggest street if missing
    if (!hasStreet && segmentAddress.street) {
      changes.push({
        field: 'street',
        oldValue: null,
        newValue: segmentAddress.street.name,
        reason: i18n.t('validation.addressInference.inferredStreet', { segmentId: nearestSegment.id })
      });
      logDebug(`Suggested street for venue ${venue.id}: ${segmentAddress.street.name}`);
    }

    // Suggest city if missing
    if (!hasCity && segmentAddress.city) {
      changes.push({
        field: 'city',
        oldValue: null,
        newValue: segmentAddress.city.name,
        reason: i18n.t('validation.addressInference.inferredCity', { segmentId: nearestSegment.id })
      });
      logDebug(`Suggested city for venue ${venue.id}: ${segmentAddress.city.name}`);
    }

    if (changes.length > 0) {
      logInfo(`Address inference found ${changes.length} suggestions for venue ${venue.id}`);
    }
  } catch (error) {
    logDebug(`Address inference error for venue ${venue.id}:`, error);
    // Silently fail - this is an optional enhancement
  }

  return changes;
}

/**
 * Find the nearest drivable road segment to a venue geometry.
 * Only considers segments within 100m and returns the closest one.
 *
 * @param sdk - WME SDK instance
 * @param venueGeometry - GeoJSON geometry (Point or Polygon)
 * @returns Nearest Segment object, or null if none within 100m
 */
function findNearestSegment(sdk: WmeSDK, venueGeometry: any): any | null {
  try {
    const segments = sdk.DataModel.Segments.getAll();

    if (segments.length === 0) {
      logDebug('No segments in data model');
      return null;
    }

    // Get the centroid of the venue geometry
    const venueCentroid = turf.centroid(venueGeometry);

    let nearestSegment: any | null = null;
    let minDistance = Infinity;

    segments.forEach((segment) => {
      // Only consider drivable segments (skip walking trails, etc.)
      if (!sdk.DataModel.Segments.isRoadTypeDrivable({ roadType: segment.roadType })) {
        return;
      }

      try {
        const segmentLine = turf.lineString(segment.geometry.coordinates);
        const distance = turf.pointToLineDistance(venueCentroid, segmentLine, { units: 'meters' });

        if (distance < minDistance) {
          minDistance = distance;
          nearestSegment = segment;
        }
      } catch {
        // Skip segments with invalid geometry
      }
    });

    // Only use segment if within 100m threshold
    if (minDistance > 100) {
      logDebug(`Nearest segment is ${minDistance.toFixed(1)}m away (exceeds 100m threshold)`);
      return null;
    }

    if (nearestSegment) {
      logDebug(`Found nearest segment ${nearestSegment.id} at distance ${minDistance.toFixed(1)}m`);
    }

    return nearestSegment;
  } catch (error) {
    logDebug('Error finding nearest segment:', error);
    return null;
  }
}
