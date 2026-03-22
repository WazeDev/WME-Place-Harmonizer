import { logDev } from './utils';
import { URLS } from './constants';
import { getSdk } from './wmeSdk';

declare const W: any;
declare const require: any;
declare const _: any;
declare const turf: any;

// --- UI & State Hooks ---
// (These will be connected when we bring the UI banner logic over)
export let harmonizePlaceGo: (...args: any[]) => void = () => {};
export function setHarmonizeFunc(fn: (...args: any[]) => void): void { harmonizePlaceGo = fn; }

export let whitelistAction: (...args: any[]) => boolean = () => false;
export function setWhitelistFunc(fn: (...args: any[]) => boolean): void { whitelistAction = fn; }

export let UPDATED_FIELDS: any = {
    address: { updated: false },
    lotType: { updated: false },
    evCostType: { updated: false },
    cost: { updated: false },
    parkingSpots: { updated: false },
    // eslint-disable-next-line camelcase
    services_DISABILITY_PARKING: { updated: false },
    evPaymentMethods: { updated: false },
    lockRank: { updated: false },
    checkNewAttributes: () => {}
};
export function setUpdatedFields(uf: any): void { UPDATED_FIELDS = uf; }

export let _areaCodeList: string = '800,822,833,844,855,866,877,888';
export function setAreaCodeList(list: string): void { _areaCodeList = list; }

export let _dupeHNRangeList: number[] = [];
export let _dupeHNRangeDistList: number[] = [];
export function setDupeLists(hnList: number[], distList: number[]): void {
    _dupeHNRangeList = hnList;
    _dupeHNRangeDistList = distList;
}

// --- Actions ---
export function addUpdateAction(venue: any, newAttributes: any, pendingUpdates?: any, runHarmonizer: boolean = false, dontHighlightFields: boolean = false): void {
    if (Object.keys(newAttributes).length) {
        if (!dontHighlightFields && UPDATED_FIELDS.checkNewAttributes) {
            UPDATED_FIELDS.checkNewAttributes(newAttributes, venue);
        }
        
        const sdk = getSdk();
        const venueId = venue.attributes?.id || venue.id;
        const { categoryAttributes, houseNumber, ...standardAttributes } = newAttributes;

        if (pendingUpdates) {
            if (categoryAttributes) {
                const UpdateObject = require('Waze/Action/UpdateObject');
                pendingUpdates.legacyActions = pendingUpdates.legacyActions || [];
                pendingUpdates.legacyActions.push(new UpdateObject(venue, { categoryAttributes }));
            }
            if (houseNumber !== undefined) {
                pendingUpdates.sdkAddressUpdates = pendingUpdates.sdkAddressUpdates || {};
                pendingUpdates.sdkAddressUpdates.houseNumber = houseNumber;
            }
            if (Object.keys(standardAttributes).length > 0) {
                pendingUpdates.sdkUpdates = pendingUpdates.sdkUpdates || {};
                Object.assign(pendingUpdates.sdkUpdates, standardAttributes);
            }
        } else {
            if (categoryAttributes) {
                const UpdateObject = require('Waze/Action/UpdateObject');
                W.model.actionManager.add(new UpdateObject(venue, { categoryAttributes }));
            }
            if (houseNumber !== undefined) {
                sdk.DataModel.Venues.updateAddress({ venueId, houseNumber });
            }
            if (Object.keys(standardAttributes).length > 0) {
                sdk.DataModel.Venues.updateVenue({ venueId, ...standardAttributes });
            }
        }
    }
    if (runHarmonizer) setTimeout(() => harmonizePlaceGo(venue, 'harmonize'), 0);
}

export function nudgeVenue(venue: any): void {
    const UpdateFeatureGeometry = require('Waze/Action/UpdateFeatureGeometry');
    const MultiAction = require('Waze/Action/MultiAction');
    const newGeometry = structuredClone(venue.getGeometry());
    const moveNegative = Math.random() > 0.5;
    const nudgeDistance = 0.00000001 * (moveNegative ? -1 : 1);
    if (venue.isPoint()) {
        newGeometry.coordinates[0] += nudgeDistance;
    } else {
        newGeometry.coordinates[0][1][0] += nudgeDistance;
    }
    const action = new UpdateFeatureGeometry(venue, W.model.venues, venue.getGeometry(), newGeometry);
    const mAction = new MultiAction([action], { description: 'Place nudged by WMEPH' });
    W.model.actionManager.add(mAction);
}

export function reportError(data?: any): void {
    window.open(URLS.forum, '_blank');
}

export function updateAddress(feature: any, address: any, pendingUpdates?: any): void {
    if (feature && address) {
        const venueId = feature.attributes?.id || feature.id;
        const streetId = address.street?.id || address.street?.attributes?.id;

        if (streetId) {
            if (pendingUpdates) {
                pendingUpdates.sdkAddressUpdates = pendingUpdates.sdkAddressUpdates || {};
                pendingUpdates.sdkAddressUpdates.streetId = streetId;
                if (address.hasOwnProperty('houseNumber')) pendingUpdates.sdkAddressUpdates.houseNumber = address.houseNumber;
                logDev('Address inferred and queued (via SDK)');
            } else {
                const sdk = getSdk();
                const updateArgs: any = { venueId, streetId };
                if (address.hasOwnProperty('houseNumber')) updateArgs.houseNumber = address.houseNumber;
                
                sdk.DataModel.Venues.updateAddress(updateArgs);
                logDev('Address inferred and updated (via SDK)');
            }
        } else {
            logDev('Failed to update address: No valid street ID found.');
        }
    }
}

export function inferAddress(venue: any, maxRecursionDepth: number): any {
    let foundAddresses: any[] = [];
    let inferredAddress: any = {
        country: null,
        city: null,
        state: null,
        street: null
    };
    const sdk = getSdk();
    const segments = sdk.DataModel.Segments.getAll();
    const IGNORE_ROAD_TYPES = [10, 16, 18, 19];

    if (!(venue && segments.length)) {
        return undefined;
    }

    const sdkVenue = sdk.DataModel.Venues.getById({ venueId: venue.attributes.id });
    if (!sdkVenue) return undefined;

    const getFCRank = (FC: number): number => {
        const typeToFCRank: Record<number, number> = {
            3: 0, // freeway
            6: 1, // major
            7: 2, // minor
            2: 3, // primary
            1: 4, // street
            20: 5, // PLR
            8: 6 // dirt
        };
        return typeToFCRank[FC] || 100;
    };

    const hasStreetName = (segmentId: number): boolean => {
        try {
            const addr = sdk.DataModel.Segments.getAddress({ segmentId });
            return !(addr.isEmpty || addr.street?.isEmpty);
        } catch {
            return false;
        }
    };

    const orderedSegments: any[] = [];
    
    let stopPoint: any;
    const navPoints = sdkVenue.navigationPoints;
    if (navPoints && navPoints.length) {
        const primary = navPoints.find((pt: any) => pt.isPrimary) || navPoints[0];
        stopPoint = primary.point;
    } else {
        stopPoint = turf.centroid(sdkVenue.geometry).geometry;
    }

    const findClosestNode = (): number | undefined => {
        const closestSegment = orderedSegments[0];
        const nodeA = sdk.DataModel.Nodes.getById({ nodeId: closestSegment.fromNodeID });
        const nodeB = sdk.DataModel.Nodes.getById({ nodeId: closestSegment.toNodeID });
        
        if (nodeA && nodeB) {
            const distanceA = turf.distance(stopPoint, nodeA.geometry, { units: 'meters' });
            const distanceB = turf.distance(stopPoint, nodeB.geometry, { units: 'meters' });
            return distanceA < distanceB ? nodeA.id : nodeB.id;
        }
        return nodeA?.id || nodeB?.id || undefined;
    };

    const findConnections = (startingNodeID: number | undefined, recursionDepth: number): void => {
        if (recursionDepth > maxRecursionDepth || startingNodeID === undefined) return;
        const connectedSegments = orderedSegments.filter(seg => [seg.fromNodeID, seg.toNodeID].includes(startingNodeID));
        for (let idx = 0; idx < connectedSegments.length; idx++) {
            const connectedSeg = connectedSegments[idx];
            if (hasStreetName(connectedSeg.segmentId)) {
                foundAddresses.push({
                    depth: recursionDepth,
                    distance: connectedSeg.distance,
                    segmentId: connectedSeg.segmentId,
                    fcRank: getFCRank(connectedSeg.roadType)
                });
                break;
            } else {
                const newNode = connectedSeg.fromNodeID === startingNodeID ? connectedSeg.toNodeID : connectedSeg.fromNodeID;
                findConnections(newNode, recursionDepth + 1);
            }
        }
    };

    segments.forEach((segment: any) => {
        if (!IGNORE_ROAD_TYPES.includes(segment.roadType)) {
            const distanceToSegment = turf.pointToLineDistance(stopPoint, segment.geometry, { units: 'meters' });
            orderedSegments.push({
                distance: distanceToSegment,
                fromNodeID: segment.fromNodeId,
                segmentId: segment.id,
                roadType: segment.roadType,
                toNodeID: segment.toNodeId
            });
        }
    });
    orderedSegments.sort((a, b) => a.distance - b.distance);

    if (orderedSegments.length === 0) return inferredAddress;

    if (hasStreetName(orderedSegments[0].segmentId)) {
        inferredAddress = sdk.DataModel.Segments.getAddress({ segmentId: orderedSegments[0].segmentId });
    } else {
        findConnections(findClosestNode(), 1);
        if (foundAddresses.length > 0) {
            foundAddresses.sort((a, b) => a.fcRank - b.fcRank);
            foundAddresses = foundAddresses.filter(f => f.fcRank === foundAddresses[0].fcRank);
            if (foundAddresses.length > 1) {
                foundAddresses.sort((a, b) => a.depth - b.depth);
                foundAddresses = foundAddresses.filter(f => f.depth === foundAddresses[0].depth);
            }
            if (foundAddresses.length > 1) {
                foundAddresses.sort((a, b) => a.distance - b.distance);
            }
            inferredAddress = sdk.DataModel.Segments.getAddress({ segmentId: foundAddresses[0].segmentId });
        } else {
            const closestElem = orderedSegments.find(element => hasStreetName(element.segmentId));
            inferredAddress = closestElem ? sdk.DataModel.Segments.getAddress({ segmentId: closestElem.segmentId }) : inferredAddress;
        }
    }
    return inferredAddress;
}