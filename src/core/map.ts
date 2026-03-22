import {
    CAT, MAX_CACHE_SIZE, USER, NO_NUM_SKIP,
    CATS_TO_IGNORE_CUSTOMER_PARKING_HIGHLIGHT, SCRIPT_NAME
} from './constants';
import {
    log,
    logDev,
    OLD_getSelectedVenue,
    getSelectedVenue,
    uniq,
    getOLMapExtent,
    isEmergencyRoom
} from './utils';
import { harmonizePlaceGo, setDupeLists } from './actions';
import { getSdk } from './wmeSdk';

declare const W: any;
declare const OpenLayers: any;
declare const WazeWrap: any;
declare const $: any;
declare const google: any;
declare const turf: any;

export let _layer: any;
export let _resultsCache: Record<string, any> = {};
export let _disableHighlightTest: boolean = false;
export let _dupeLayer: any;
export let _dupeIDList: string[] = [];
export let _googlePlacePtFeature: any;
export let _googlePlaceLineFeature: any;
export let _destroyGooglePlacePointTimeoutId: any;

export function setDisableHighlightTest(val: boolean): void {
    _disableHighlightTest = val;
}

export function initMapLayer(): void {
    _layer = W.map.getLayerByUniqueName('venues');
}

function errorHandler(callback: (...args: any[]) => void, ...args: any[]): void {
    try {
        callback(...args);
    } catch (ex) {
        console.error(`${SCRIPT_NAME}:`, ex);
    }
}

export function initializeHighlights(): void {
    OpenLayers.Renderer.symbol.triangle = [0, -10, 10, 10, -10, 10, 0, -10];

    const ruleGenerator = (value: any, symbolizer: any) => new W.Rule({
        filter: new OpenLayers.Filter.Comparison({
            type: '==',
            value,
            evaluate(feature: any) {
                const id = feature.attributes.wazeFeature?.id ?? feature.attributes.wazeFeature?._wmeObject?.attributes?.id ?? feature.attributes.id;
                return id && _resultsCache[id]?.s === (this as any).value;
            }
        }),
        symbolizer,
        wmephStyle: 'default'
    });

    const rppRule = new W.Rule({
        filter: new OpenLayers.Filter.Comparison({
            type: '==',
            value: true,
            evaluate(feature: any) {
                const wazeFeat = feature.attributes.wazeFeature;
                return wazeFeat?.isResidential ?? wazeFeat?._wmeObject?.isResidential() ?? false;
            }
        }),
        symbolizer: {
            graphicName: 'triangle',
            pointRadius: 7
        },
        wmephStyle: 'default'
    });

    const severity0 = ruleGenerator(0, {
        pointRadius: 5,
        externalGraphic: '',
        label: '',
        strokeWidth: 4,
        strokeColor: '#24ff14',
        fillColor: '#ba85bf'
    });

    const severityLock = ruleGenerator('lock', {
        pointRadius: 5,
        externalGraphic: '',
        label: '',
        strokeColor: '#24ff14',
        strokeLinecap: 1,
        strokeDashstyle: '7 2',
        strokeWidth: 5,
        fillColor: '#ba85bf'
    });

    const severity1 = ruleGenerator(1, {
        strokeColor: '#0055ff',
        strokeWidth: 4,
        externalGraphic: '',
        label: '',
        pointRadius: 7,
        fillColor: '#ba85bf'
    });

    const severityLock1 = ruleGenerator('lock1', {
        pointRadius: 5,
        strokeColor: '#0055ff',
        strokeLinecap: 1,
        strokeDashstyle: '7 2',
        externalGraphic: '',
        label: '',
        strokeWidth: 5,
        fillColor: '#ba85bf'
    });

    const severity2 = ruleGenerator(2, {
        strokeColor: '#ff0',
        strokeWidth: 6,
        externalGraphic: '',
        label: '',
        pointRadius: 8,
        fillColor: '#ba85bf'
    });

    const severity3 = ruleGenerator(3, {
        strokeColor: '#ff0000',
        strokeWidth: 4,
        externalGraphic: '',
        label: '',
        pointRadius: 8,
        fillColor: '#ba85bf'
    });

    const severity4 = ruleGenerator(4, {
        fillColor: 'black',
        fillOpacity: 0.35,
        strokeColor: '#f42',
        strokeLinecap: 1,
        strokeWidth: 13,
        externalGraphic: '',
        label: '',
        strokeDashstyle: '4 2'
    });

    const severityHigh = ruleGenerator(5, {
        pointRadius: 12,
        fillColor: 'black',
        fillOpacity: 0.4,
        strokeColor: '#f4a',
        strokeLinecap: 1,
        strokeWidth: 10,
        externalGraphic: '',
        label: '',
        strokeDashstyle: '4 2'
    });

    const severity6 = ruleGenerator(6, {
        strokeColor: '#f80',
        strokeWidth: 6,
        externalGraphic: '',
        label: '',
        pointRadius: 10,
        fillColor: '#ba85bf'
    });

    const severityAdLock = ruleGenerator('adLock', {
        pointRadius: 1,
        fillColor: 'yellow',
        fillOpacity: 0.4,
        strokeColor: '#000',
        strokeLinecap: 1,
        strokeWidth: 10,
        externalGraphic: '',
        label: '',
        strokeDashstyle: '4 2'
    });

    function plaTypeRuleGenerator(value: string, symbolizer: any) {
        return new W.Rule({
            filter: new OpenLayers.Filter.Comparison({
                type: '==',
                value,
                evaluate(feature: any) {
                    const id = feature.attributes.wazeFeature?.id ?? feature.attributes.wazeFeature?._wmeObject?.attributes?.id ?? feature.attributes.id;
                if (!id) return undefined;
                if ($('#WMEPH-PLATypeFill').prop('checked')) {
                    const sdkVenue = getSdk().DataModel.Venues.getById({ venueId: id });
                    if (sdkVenue?.categories.includes(CAT.PARKING_LOT as any)) {
                        const type = getSdk().DataModel.Venues.ParkingLot.getParkingLotType({ venueId: id });
                        return (!type && (this as any).value === 'public') || (type && (type.toLowerCase() === (this as any).value));
                    }
                    }
                    return undefined;
                }
            }),
            symbolizer,
            wmephStyle: 'default'
        });
    }

    const publicPLA = plaTypeRuleGenerator('public', {
        fillColor: '#0000FF',
        fillOpacity: '0.25'
    });
    const restrictedPLA = plaTypeRuleGenerator('restricted', {
        fillColor: '#FFFF00',
        fillOpacity: '0.3'
    });
    const privatePLA = plaTypeRuleGenerator('private', {
        fillColor: '#FF0000',
        fillOpacity: '0.25'
    });

    _layer.styleMap.styles.default.rules.push(...[severity0, severityLock, severity1, severityLock1, severity2,
        severity3, severity4, severity6, severityHigh, severityAdLock, rppRule, publicPLA, restrictedPLA, privatePLA]);
}

export function toggleXrayMode(enable: boolean): void {
    localStorage.setItem('WMEPH_xrayMode_enabled', $('#layer-switcher-item_wmeph_x-ray_mode').prop('checked'));

    const commentsLayer = W.map.getLayerByUniqueName('mapComments');
    const gisLayer = W.map.getLayerByUniqueName('__wmeGISLayers');
    const satLayer = W.map.getLayerByUniqueName('satellite_imagery');
    const roadLayer = W.map.roadLayers[0];
    const commentRuleSymb = commentsLayer.styleMap.styles.default.rules[0].symbolizer;
    if (enable) {
        _layer.styleMap.styles.default.rules = _layer.styleMap.styles.default.rules.filter((rule: any) => rule.wmephStyle !== 'default');
        roadLayer.opacity = 0.25;
        satLayer.opacity = 0.25;
        commentRuleSymb.Polygon.strokeColor = '#888';
        commentRuleSymb.Polygon.fillOpacity = 0.2;
        if (gisLayer) gisLayer.setOpacity(0.4);
    } else {
        _layer.styleMap.styles.default.rules = _layer.styleMap.styles.default.rules.filter((rule: any) => rule.wmephStyle !== 'xray');
        roadLayer.opacity = 1;
        satLayer.opacity = 1;
        commentRuleSymb.Polygon.strokeColor = '#fff';
        commentRuleSymb.Polygon.fillOpacity = 0.4;
        if (gisLayer) gisLayer.setOpacity(1);
        initializeHighlights();
        _layer.redraw();
    }
    commentsLayer.redraw();
    roadLayer.redraw();
    satLayer.redraw();
    if (!enable) return;

    const defaultPointRadius = 6;
    const ruleGenerator = (value: any, symbolizer: any) => new W.Rule({
        filter: new OpenLayers.Filter.Comparison({
            type: '==',
            value,
            evaluate(feature: any) {
                const id = feature.attributes.wazeFeature?.id ?? feature.attributes.wazeFeature?._wmeObject?.attributes?.id ?? feature.attributes.id;
                return id && _resultsCache[id]?.s === (this as any).value;
            }
        }),
        symbolizer,
        wmephStyle: 'xray'
    });

    const severity0 = ruleGenerator(0, {
        Point: {
            strokeWidth: 1.67,
            strokeColor: '#888',
            pointRadius: 5,
            fillOpacity: 0.25,
            fillColor: 'white',
            zIndex: 0
        },
        Polygon: {
            strokeWidth: 1.67,
            strokeColor: '#888',
            fillOpacity: 0
        }
    });

    const severityLock = ruleGenerator('lock', {
        Point: {
            strokeColor: 'white',
            fillColor: '#080',
            fillOpacity: 1,
            strokeLinecap: 1,
            strokeDashstyle: '4 2',
            strokeWidth: 2.5,
            pointRadius: defaultPointRadius
        },
        Polygon: {
            strokeColor: 'white',
            fillColor: '#0a0',
            fillOpacity: 0.4,
            strokeDashstyle: '4 2',
            strokeWidth: 2.5
        }
    });

    const severity1 = ruleGenerator(1, {
        strokeColor: 'white',
        strokeWidth: 2,
        pointRadius: defaultPointRadius,
        fillColor: '#0055ff'
    });

    const severityLock1 = ruleGenerator('lock1', {
        pointRadius: defaultPointRadius,
        fillColor: '#0055ff',
        strokeColor: 'white',
        strokeLinecap: '1',
        strokeDashstyle: '4 2',
        strokeWidth: 2.5
    });

    const severity2 = ruleGenerator(2, {
        Point: {
            fillColor: '#ca0',
            strokeColor: 'white',
            strokeWidth: 2,
            pointRadius: defaultPointRadius

        },
        Polygon: {
            fillColor: '#ff0',
            strokeColor: 'white',
            strokeWidth: 2,
            fillOpacity: 0.4
        }
    });

    const severity3 = ruleGenerator(3, {
        strokeColor: 'white',
        strokeWidth: 2,
        pointRadius: defaultPointRadius,
        fillColor: '#ff0000'
    });

    const severity4 = ruleGenerator(4, {
        fillColor: '#f42',
        strokeLinecap: 1,
        strokeWidth: 2,
        strokeDashstyle: '4 2'
    });

    const severityHigh = ruleGenerator(5, {
        fillColor: 'black',
        strokeColor: '#f4a',
        strokeLinecap: 1,
        strokeWidth: 4,
        strokeDashstyle: '4 2',
        pointRadius: defaultPointRadius
    });

    const severityAdLock = ruleGenerator('adLock', {
        pointRadius: 12,
        fillColor: 'yellow',
        fillOpacity: 0.4,
        strokeColor: '#000',
        strokeLinecap: 1,
        strokeWidth: 10,
        strokeDashstyle: '4 2'
    });

    _layer.styleMap.styles.default.rules.push(...[severity0, severityLock, severity1,
        severityLock1, severity2, severity3, severity4, severityHigh, severityAdLock]);

    _layer.redraw();
}

export function applyHighlightsTest(venues: any | any[], force: boolean = false): void {
    logDev('applyHighlightsTest');
    if (!_layer) return;

    // Make sure venues is an array, or convert it to one if not.
    if (venues) {
        if (!Array.isArray(venues)) {
            venues = [venues];
        }
    } else {
        venues = [];
    }

    const t0 = performance.now();
    const doHighlight = $('#WMEPH-ColorHighlighting').prop('checked');
    const disableRankHL = $('#WMEPH-DisableRankHL').prop('checked');

    venues.forEach((venue: any) => {
        if (venue && venue.id) {
            // Highlighting logic would go here
            // Severity can be: 0, 'lock', 1, 2, 3, 4, or 'high'. Set to
            // anything else to use default WME style.
            if (doHighlight && !(disableRankHL && venue.lockRank > (USER.rank ?? 0) - 1)) {
                try {
                    const id = venue.id;
                    let severity;
                    let cachedResult: any;
                    const modificationData = venue.modificationData;
                    const updatedOn = modificationData?.updatedOn ?? modificationData?.createdOn ?? -1;
                    // eslint-disable-next-line no-cond-assign
                    if (force || Number.isNaN(Number(id)) || ((cachedResult = _resultsCache[id]) === undefined) || (updatedOn > cachedResult.u)) {
                        severity = harmonizePlaceGo(venue, 'highlight');
                        _resultsCache[id] = { s: severity, u: updatedOn };
                    } else {
                        severity = cachedResult.s;
                    }
                } catch (err) {
                    console.error('WMEPH highlight error: ', err);
                }
            } else {
                _resultsCache[venue.id] = { s: 'default', u: Date.now() };
            }
        }
    });

    // Trim the cache if it's over the max size limit.
    const keys = Object.keys(_resultsCache);
    if (keys.length > MAX_CACHE_SIZE) {
        const trimSize = MAX_CACHE_SIZE * 0.8;
        for (let i = keys.length - 1; i > trimSize; i--) {
            delete _resultsCache[keys[i]];
        }
    }

    const venue = getSelectedVenue();
    if (venue) {
        const severity = harmonizePlaceGo(venue, 'highlight');
        _resultsCache[venue.id] = { s: severity, u: Date.now() };
    }
    logDev(`Ran highlighter in ${Math.round((performance.now() - t0) * 10) / 10} milliseconds.`);
    logDev(`WMEPH cache size: ${Object.keys(_resultsCache).length}`);
}

export function bootstrapWmephColorHighlights(): void {
    const sdk = getSdk();
    if (localStorage.getItem('WMEPH-ColorHighlighting') === '1') {
        // Add listeners
        sdk.Events.on({
            eventName: 'wme-data-model-objects-changed',
            eventHandler: (payload: any) => errorHandler(() => {
                if (payload.dataModelName === 'venues' && !_disableHighlightTest) {
                    const venues = payload.objectIds.map((id: string) => sdk.DataModel.Venues.getById({ venueId: id })).filter(Boolean);
                    applyHighlightsTest(venues, true);
                    _layer.redraw();
                }
            })
        });

        sdk.Events.on({
            eventName: 'wme-data-model-objects-added',
            eventHandler: (payload: any) => errorHandler(() => {
                if (payload.dataModelName === 'venues') {
                    const venues = payload.objectIds.map((id: string) => sdk.DataModel.Venues.getById({ venueId: id })).filter(Boolean);
                    applyHighlightsTest(venues);
                    _layer.redraw();
                }
            })
        });
        // Clear the cache (highlight severities may need to be updated).
        _resultsCache = {};

        // Apply the colors
        applyHighlightsTest(sdk.DataModel.Venues.getAll());
        _layer.redraw();
    } else {
        // reset the colors to default
        applyHighlightsTest(sdk.DataModel.Venues.getAll());
        _layer.redraw();
    }
}

export function clearFilterHighlights(): void {
    const layer = W.map.venueLayer;
    layer.removeFeatures(layer.getFeaturesByAttribute('wmephHighlight', '1'));
}

export function processFilterHighlights(): void {
    if (!$('#WMEPH-ShowFilterHighlight').prop('checked')) {
        return;
    }
    // clear existing highlights
    clearFilterHighlights();
    const featuresToAdd: any[] = [];
    W.model.venues.getObjectArray((v: any) => !v.attributes.services.includes('PARKING_FOR_CUSTOMERS')
        && !CATS_TO_IGNORE_CUSTOMER_PARKING_HIGHLIGHT.includes(v.attributes.categories[0]))
        .forEach((v: any) => {
            let style;
            if (v.isPoint()) {
                style = {
                    pointRadius: 10,
                    strokeWidth: 10,
                    strokeColor: '#F0F',
                    strokeOpacity: 0.7,
                    fillOpacity: 0,
                    graphicZIndex: -9999,
                    strokeDashstyle: 'solid' // '3 6'
                };
            } else {
                style = {
                    strokeWidth: 12,
                    strokeColor: '#F0F',
                    strokeOpacity: 0.7,
                    fillOpacity: 0,
                    graphicZIndex: -9999999999,
                    strokeDashstyle: 'solid' // '3 6'
                };
            }
            const geometry = v.getOLGeometry().clone();
            const f = new OpenLayers.Feature.Vector(geometry, { wmephHighlight: '1' }, style);
            featuresToAdd.push(f);
        });
    W.map.venueLayer.addFeatures(featuresToAdd);
}

// --- Duplicate Place Finder ---

export function initDupeLayer(): void {
    _dupeLayer = W.map.getLayerByUniqueName('__DuplicatePlaceNames');
    if (!_dupeLayer) {
        const lname = 'WMEPH Duplicate Names';
        const style = new OpenLayers.Style({
            label: '${labelText}',
            labelOutlineColor: '#333',
            labelOutlineWidth: 3,
            labelAlign: '${labelAlign}',
            fontColor: '${fontColor}',
            fontOpacity: 1.0,
            fontSize: '20px',
            fontWeight: 'bold',
            labelYOffset: -30,
            labelXOffset: 0,
            fill: false,
            strokeColor: '${strokeColor}',
            strokeWidth: 10,
            pointRadius: '${pointRadius}'
        });
        _dupeLayer = new OpenLayers.Layer.Vector(lname, { displayInLayerSwitcher: false, uniqueName: '__DuplicatePlaceNames', styleMap: new OpenLayers.StyleMap(style) });
        _dupeLayer.setVisibility(false);
        W.map.addLayer(_dupeLayer);
    }
}

export function destroyDupeLabels(): void {
    if (!_dupeLayer) return;
    _dupeLayer.destroyFeatures();
    _dupeLayer.setVisibility(false);
}

export function deleteDupeLabel(): void {
    setTimeout(() => {
        const actionsList = W.model.actionManager.getActions();
        const lastAction = actionsList[actionsList.length - 1];
        if (typeof lastAction !== 'undefined' && lastAction.hasOwnProperty('object') && lastAction.object.hasOwnProperty('state') && lastAction.object.state === 'Delete') {
            if (_dupeIDList.includes(lastAction.object.attributes.id)) {
                if (_dupeIDList.length === 2) {
                    destroyDupeLabels();
                } else {
                    const deletedDupe = _dupeLayer.getFeaturesByAttribute('dupeID', lastAction.object.attributes.id);
                    _dupeLayer.removeFeatures(deletedDupe);
                    _dupeIDList.splice(_dupeIDList.indexOf(lastAction.object.attributes.id), 1);
                }
                log('Deleted a dupe');
            }
        }
    }, 20);
}

export function findNearbyDuplicate(selectedVenueName: string, selectedVenueAliases: string[], selectedVenue: any, recenterOption: boolean, venueWhitelist: Record<string, any> = {}): [string[], boolean] {
    const formatName = (name: string): string => name.toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');
    _dupeLayer.destroyFeatures();

    const sdk = getSdk();
    const mapExtent = sdk.Map.getMapExtent(); // [left, bottom, right, top] in WGS84
    const padFrac = 0.15;
    const allowedTwoLetters = ['BP', 'DQ', 'BK', 'BW', 'LQ', 'QT', 'DB', 'PO'];

    // Padded extent for visibility checks
    const lonPad = padFrac * (mapExtent[2] - mapExtent[0]);
    const latPad = padFrac * (mapExtent[3] - mapExtent[1]);
    const paddedExtent = [
        mapExtent[0] + lonPad, // left
        mapExtent[1] + latPad, // bottom
        mapExtent[2] - lonPad, // right
        mapExtent[3] - latPad  // top
    ];
    const isPointInPaddedExtent = (lon: number, lat: number) => {
        return lon >= paddedExtent[0] && lon <= paddedExtent[2] && lat >= paddedExtent[1] && lat <= paddedExtent[3];
    };

    let outOfExtent = false;
    let overlappingFlag = false;

    const selectedCentroid = selectedVenue.getOLGeometry().getCentroid();

    const selectedSdkVenue = sdk.DataModel.Venues.getById({ venueId: selectedVenue.attributes.id });
    const selectedCenterWGS = selectedSdkVenue ? turf.centroid(selectedSdkVenue.geometry).geometry.coordinates : [0, 0];

    let minLon = selectedCenterWGS[0];
    let minLat = selectedCenterWGS[1];
    let maxLon = minLon;
    let maxLat = minLat;

    const labelFeatures: any[] = [];
    const dupeNames: string[] = [];
    let labelColorIX = 0;
    const labelColorList = ['#3F3'];

    const selectedVenueNameRF = formatName(selectedVenueName);
    let currNameList: string[] = [];
    if (selectedVenueNameRF.length > 2 || allowedTwoLetters.includes(selectedVenueNameRF)) {
        currNameList.push(selectedVenueNameRF);
    } else {
        currNameList.push('PRIMNAMETOOSHORT_PJZWX');
    }

    const selectedVenueAttr = selectedVenue.attributes;
    const venueNameNoNum = selectedVenueNameRF.replace(/[^A-Z]/g, '');
    if (((venueNameNoNum.length > 2 && !NO_NUM_SKIP.includes(venueNameNoNum)) || allowedTwoLetters.includes(venueNameNoNum))
        && !selectedVenueAttr.categories.includes(CAT.PARKING_LOT)) {
        currNameList.push(venueNameNoNum);
    }

    if (selectedVenueAliases.length > 0) {
        for (let aliix = 0; aliix < selectedVenueAliases.length; aliix++) {
            const aliasNameRF = formatName(selectedVenueAliases[aliix]);
            if ((aliasNameRF.length > 2 && !NO_NUM_SKIP.includes(aliasNameRF)) || allowedTwoLetters.includes(aliasNameRF)) {
                currNameList.push(aliasNameRF);
            }
            const aliasNameNoNum = aliasNameRF.replace(/[^A-Z]/g, '');
            if (((aliasNameNoNum.length > 2 && !NO_NUM_SKIP.includes(aliasNameNoNum)) || allowedTwoLetters.includes(aliasNameNoNum))
                && !selectedVenueAttr.categories.includes(CAT.PARKING_LOT)) {
                currNameList.push(aliasNameNoNum);
            }
        }
    }
    currNameList = uniq(currNameList);

    let selectedVenueAddr = selectedVenue.getAddress(W.model);
    selectedVenueAddr = selectedVenueAddr.attributes || selectedVenueAddr;
    const selectedVenueHN = selectedVenueAttr.houseNumber;

    const selectedVenueAddrIsComplete = selectedVenueAddr.street !== null && selectedVenueAddr.street.getName() !== null
        && selectedVenueHN && selectedVenueHN.match(/\d/g) !== null;

    const venues = W.model.venues.getObjectArray();
    const selectedVenueId = selectedVenueAttr.id;

    // _dupeIDList is global, reassign it
    _dupeIDList.length = 0;
    _dupeIDList.push(selectedVenueId);
    
    const dupeHNRangeList: number[] = [];
    const dupeHNRangeDistList: number[] = [];

    const selectedVenueWL = venueWhitelist[selectedVenueId];
    const whitelistedDupes = selectedVenueWL && selectedVenueWL.dupeWL ? selectedVenueWL.dupeWL : [];

    const excludePLADupes = $('#WMEPH-ExcludePLADupes').prop('checked');
    let randInt = 100;

    venues.forEach((testVenue: any) => {
        if ((!excludePLADupes || (excludePLADupes && !(selectedVenue.isParkingLot() || testVenue.isParkingLot())))
            && !isEmergencyRoom(testVenue)) {
            const testVenueAttr = testVenue.attributes;
            const testVenueId = testVenueAttr.id;

            const testSdkVenue = sdk.DataModel.Venues.getById({ venueId: testVenueId });
            if (!testSdkVenue) return;

            const testCenterWGS = turf.centroid(testSdkVenue.geometry).geometry.coordinates;
            const pt2ptDistance = turf.distance(selectedCenterWGS, testCenterWGS, { units: 'meters' });
 
            const testCentroid = testVenue.getOLGeometry().getCentroid();
            if (selectedVenue.isPoint() && testVenue.isPoint() && pt2ptDistance < 2 && selectedVenueId !== testVenueId) {
                overlappingFlag = true;
            }

            const testVenueHN = testVenueAttr.houseNumber;
            let testVenueAddr = testVenue.getAddress(W.model);
            testVenueAddr = testVenueAddr.attributes || testVenueAddr;

            if (selectedVenueAddrIsComplete && testVenueAddr.street !== null && testVenueAddr.street.getName() !== null
                && testVenueHN && testVenueHN !== '' && testVenueId !== selectedVenueId
                && selectedVenueAddr.street.getName() === testVenueAddr.street.getName() && testVenueHN < 1000000) {
                dupeHNRangeList.push(parseInt(testVenueHN, 10));
                dupeHNRangeDistList.push(pt2ptDistance);
            }

            if (!whitelistedDupes.includes(testVenueId) && _dupeIDList.length < 6 && pt2ptDistance < 800
                && !testVenue.isResidential() && testVenueId !== selectedVenueId && !testVenue.isNew()
                && testVenueAttr.name !== null && testVenueAttr.name.length > 1) {
                let suppressMatch = false;
                if (selectedVenueAddrIsComplete && testVenueAddr.street !== null && testVenueAddr.street.getName() !== null
                    && testVenueHN && testVenueHN.match(/\d/g) !== null) {
                    if (selectedVenueAttr.lockRank > 0 && testVenueAttr.lockRank > 0) {
                        if (selectedVenueAttr.houseNumber !== testVenueHN
                            || selectedVenueAddr.street.getName() !== testVenueAddr.street.getName()) {
                            suppressMatch = true;
                        }
                    } else if (selectedVenueHN !== testVenueHN
                        && selectedVenueAddr.street.getName() !== testVenueAddr.street.getName()) {
                        suppressMatch = true;
                    }
                }

                if (!suppressMatch) {
                    let testNameList: string[];
                    const strippedTestName = formatName(testVenueAttr.name).replace(/\s+[-(].*$/, '');
                    if ((strippedTestName.length > 2 && !NO_NUM_SKIP.includes(strippedTestName))
                        || allowedTwoLetters.includes(strippedTestName)) {
                        testNameList = [strippedTestName];
                    } else {
                        testNameList = [`TESTNAMETOOSHORTQZJXS${randInt}`];
                        randInt++;
                    }

                    const testNameNoNum = strippedTestName.replace(/[^A-Z]/g, '');
                    if (((testNameNoNum.length > 2 && !NO_NUM_SKIP.includes(testNameNoNum)) || allowedTwoLetters.includes(testNameNoNum))
                        && !testVenueAttr.categories.includes(CAT.PARKING_LOT)) {
                        testNameList.push(testNameNoNum);
                    }

                    let nameMatch = false;
                    for (let tnlix = 0; tnlix < testNameList.length; tnlix++) {
                        for (let cnlix = 0; cnlix < currNameList.length; cnlix++) {
                            if ((testNameList[tnlix].includes(currNameList[cnlix]) || currNameList[cnlix].includes(testNameList[tnlix]))) {
                                nameMatch = true;
                                break;
                            }
                        }
                        if (nameMatch) break;
                    }

                    let altNameMatch = -1;
                    if (!nameMatch && testVenueAttr.aliases.length > 0) {
                        for (let aliix = 0; aliix < testVenueAttr.aliases.length; aliix++) {
                            const aliasNameRF = formatName(testVenueAttr.aliases[aliix]);
                            if ((aliasNameRF.length > 2 && !NO_NUM_SKIP.includes(aliasNameRF)) || allowedTwoLetters.includes(aliasNameRF)) {
                                testNameList = [aliasNameRF];
                            } else {
                                testNameList = [`ALIASNAMETOOSHORTQOFUH${randInt}`];
                                randInt++;
                            }
                            const aliasNameNoNum = aliasNameRF.replace(/[^A-Z]/g, '');
                            if (((aliasNameNoNum.length > 2 && !NO_NUM_SKIP.includes(aliasNameNoNum)) || allowedTwoLetters.includes(aliasNameNoNum))
                                && !testVenueAttr.categories.includes(CAT.PARKING_LOT)) {
                                testNameList.push(aliasNameNoNum);
                            } else {
                                testNameList.push(`111231643239${randInt}`);
                                randInt++;
                            }
                        }
                        for (let tnlix = 0; tnlix < testNameList.length; tnlix++) {
                            for (let cnlix = 0; cnlix < currNameList.length; cnlix++) {
                                if ((testNameList[tnlix].includes(currNameList[cnlix]) || currNameList[cnlix].includes(testNameList[tnlix]))) {
                                    altNameMatch = Math.floor(tnlix / 2);
                                    break;
                                }
                            }
                            if (altNameMatch > -1) break;
                        }
                    }

                    if (nameMatch || altNameMatch > -1) {
                        _dupeIDList.push(testVenueAttr.id);
                        _dupeLayer.setVisibility(true);

                        const labelText = nameMatch ? testVenueAttr.name : `${testVenueAttr.aliases[altNameMatch]} (Alt)`;
                        logDev(`Possible duplicate found. WME place: ${selectedVenueName} / Nearby place: ${labelText}`);

                        const labelTextBuild: string[] = [];
                        let maxLettersPerLine = Math.round(2 * Math.sqrt(labelText.replace(/ /g, '').length / 2));
                        maxLettersPerLine = Math.max(maxLettersPerLine, 4);
                        let startIX = 0;
                        let endIX = 0;
                        while (endIX !== -1) {
                            endIX = labelText.indexOf(' ', endIX + 1);
                            if (endIX - startIX > maxLettersPerLine) {
                                labelTextBuild.push(labelText.substr(startIX, endIX - startIX));
                                startIX = endIX + 1;
                            }
                        }
                        labelTextBuild.push(labelText.substr(startIX));
                        let labelTextReformat = labelTextBuild.join('\n');
                        if (testVenueAttr.images.length) {
                            labelTextReformat = `${labelTextReformat} `;
                            for (let phix = 0; phix < testVenueAttr.images.length; phix++) {
                                if (phix === 3) {
                                    labelTextReformat = `${labelTextReformat}+`;
                                    break;
                                }
                                labelTextReformat = `${labelTextReformat}\u25A3`;
                            }
                        }

                    if (!isPointInPaddedExtent(testCenterWGS[0], testCenterWGS[1])) {
                            outOfExtent = true;
                        }
                    minLat = Math.min(minLat, testCenterWGS[1]);
                    minLon = Math.min(minLon, testCenterWGS[0]);
                    maxLat = Math.max(maxLat, testCenterWGS[1]);
                    maxLon = Math.max(maxLon, testCenterWGS[0]);

                        labelFeatures.push(new OpenLayers.Feature.Vector(
                            testCentroid,
                            {
                                labelText: labelTextReformat,
                                fontColor: '#fff',
                                strokeColor: labelColorList[labelColorIX % labelColorList.length],
                                labelAlign: 'cm',
                                pointRadius: 25,
                                dupeID: testVenueId
                            }
                        ));
                        dupeNames.push(labelText);
                    }
                    labelColorIX++;
                }
            }
        }
    });

    if (_dupeIDList.length > 1) {
        if (!isPointInPaddedExtent(selectedCenterWGS[0], selectedCenterWGS[1])) {
            outOfExtent = true;
        }
        minLat = Math.min(minLat, selectedCenterWGS[1]);
        minLon = Math.min(minLon, selectedCenterWGS[0]);
        maxLat = Math.max(maxLat, selectedCenterWGS[1]);
        maxLon = Math.max(maxLon, selectedCenterWGS[0]);

        let currentLabel = 'Current';
        if (selectedVenueAttr.images.length > 0) {
            for (let ciix = 0; ciix < selectedVenueAttr.images.length; ciix++) {
                currentLabel = `${currentLabel} `;
                if (ciix === 3) {
                    currentLabel = `${currentLabel}+`;
                    break;
                }
                currentLabel = `${currentLabel}\u25A3`;
            }
        }
        labelFeatures.push(new OpenLayers.Feature.Vector(
            selectedCentroid,
            {
                labelText: currentLabel,
                fontColor: '#fff',
                strokeColor: '#fff',
                labelAlign: 'cm',
                pointRadius: 25,
                dupeID: selectedVenueId
            }
        ));
        _dupeLayer.addFeatures(labelFeatures);
    }

    if (recenterOption && dupeNames.length > 0 && outOfExtent) {
        const padMult = 1.0;
        const lonPadZoom = (padFrac * padMult) * (maxLon - minLon);
        const latPadZoom = (padFrac * padMult) * (maxLat - minLat);
        sdk.Map.zoomToExtent({ bbox: [
            minLon - lonPadZoom,
            minLat - latPadZoom,
            maxLon + lonPadZoom,
            maxLat + latPadZoom
        ] as [number, number, number, number] });
    }

    setDupeLists(dupeHNRangeList, dupeHNRangeDistList);
    return [dupeNames, overlappingFlag];
}

// --- Google Places Links ---

export class GooglePlaceContainer {
    places = new Map<string, any>();
    pendingRequests = new Map<string, any[]>();

    addPlace(placeId: string, placeData: any): void {
        this.places.set(placeId, placeData);

        const requestsForId = this.pendingRequests.get(placeId);
        if (requestsForId && requestsForId.length > 0) {
            requestsForId.forEach(request => {
                clearTimeout(request.timeoutId);
                request.resolve(placeData);
            });
            this.pendingRequests.delete(placeId);
        }
    }

    #removePendingRequest(placeId: string, requestToRemove: any): void {
        const requests = this.pendingRequests.get(placeId);
        if (!requests) return;

        const index = requests.indexOf(requestToRemove);
        if (index > -1) {
            requests.splice(index, 1);
        }

        if (requests.length === 0) {
            this.pendingRequests.delete(placeId);
        }
    }

    getPlace(placeId: string, timeoutMs: number = 3000): Promise<any> {
        if (this.places.has(placeId)) {
            return Promise.resolve(this.places.get(placeId));
        }

        return new Promise((resolve, reject) => {
            let pendingRequest: any;

            const timeoutId = setTimeout(() => {
                const error = new Error(`Request for place ID "${placeId}" timed out after ${timeoutMs / 1000} seconds.`);
                this.#removePendingRequest(placeId, pendingRequest);
                reject(error);
            }, timeoutMs);

            pendingRequest = { resolve, reject, timeoutId };

            if (!this.pendingRequests.has(placeId)) {
                this.pendingRequests.set(placeId, []);
            }
            this.pendingRequests.get(placeId)?.push(pendingRequest);
        });
    }
}

export const _googlePlaces = new GooglePlaceContainer();

export function interceptGoogleGetDetails(): void {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places || !google.maps.places.PlacesService) {
        console.debug('Google Maps PlacesService not loaded yet.');
        setTimeout(interceptGoogleGetDetails, 500); // Retry until it loads
        return;
    }

    const originalGetDetails = google.maps.places.PlacesService.prototype.getDetails;
    google.maps.places.PlacesService.prototype.getDetails = function interceptedGetDetails(request: any, callback: any) {
        console.debug('Intercepted getDetails call:', request);
        const { placeId } = request;
        const customCallback = function(result: any, status: any) {
            const googleResult = { ...result };
            googleResult.placeId = placeId;
            googleResult.requestStatus = status;
            _googlePlaces.addPlace(placeId, googleResult);
            console.debug('Intercepted getDetails response:', googleResult, status);
            callback(result, status); // Pass the result to the original callback
        };

        return originalGetDetails.call(this, request, customCallback);
    };

    console.debug('Google Maps PlacesService.getDetails intercepted successfully.');
}

export async function drawGooglePlacePoint(uuid: string): Promise<void> {
    if (!uuid) return;
    const link = await _googlePlaces.getPlace(uuid).catch((err: any) => {
        console.warn(`WMEPH: Skipped drawing Google Place point - ${err.message}`);
        return null;
    });
    if (link?.geometry) {
        const coord = link.geometry.location;
        const poiPt = new OpenLayers.Geometry.Point(coord.lng(), coord.lat());
        poiPt.transform(W.Config.map.projection.remote, W.map.getProjectionObject().projCode);
        const placeGeom = W.selectionManager.getSelectedDataModelObjects()[0].getOLGeometry().getCentroid();
        const placePt = new OpenLayers.Geometry.Point(placeGeom.x, placeGeom.y);
        const ext = getOLMapExtent();
        const lsBounds = new OpenLayers.Geometry.LineString([
            new OpenLayers.Geometry.Point(ext.left, ext.bottom),
            new OpenLayers.Geometry.Point(ext.left, ext.top),
            new OpenLayers.Geometry.Point(ext.right, ext.top),
            new OpenLayers.Geometry.Point(ext.right, ext.bottom),
            new OpenLayers.Geometry.Point(ext.left, ext.bottom)]);
        let lsLine = new OpenLayers.Geometry.LineString([placePt, poiPt]);

        const splits = lsLine.splitWith(lsBounds);
        let label = '';
        if (splits) {
            let splitPoints: any;
            splits.forEach((split: any) => {
                split.components.forEach((component: any) => {
                    if (component.x === placePt.x && component.y === placePt.y) splitPoints = split;
                });
            });
            lsLine = new OpenLayers.Geometry.LineString([splitPoints.components[0], splitPoints.components[1]]);
            let distance = WazeWrap.Geometry.calculateDistance([poiPt, placePt]);
            let unitConversion;
            let unit1;
            let unit2;
            const sdk = getSdk();
            if (sdk.Settings.getUserSettings().isImperial) {
                distance *= 3.28084;
                unitConversion = 5280;
                unit1 = ' ft';
                unit2 = ' mi';
            } else {
                unitConversion = 1000;
                unit1 = ' m';
                unit2 = ' km';
            }
            if (distance > unitConversion * 10) {
                label = Math.round(distance / unitConversion) + unit2;
            } else if (distance > 1000) {
                label = (Math.round(distance / (unitConversion / 10)) / 10) + unit2;
            } else {
                label = Math.round(distance) + unit1;
            }
        }

        destroyGooglePlacePoint();
        _googlePlacePtFeature = new OpenLayers.Feature.Vector(poiPt, { poiCoord: true }, {
            pointRadius: 6,
            strokeWidth: 30,
            strokeColor: '#FF0',
            fillColor: '#FF0',
            strokeOpacity: 0.5
        });
        _googlePlaceLineFeature = new OpenLayers.Feature.Vector(lsLine, {}, {
            strokeWidth: 3,
            strokeDashstyle: '12 8',
            strokeColor: '#FF0',
            label,
            labelYOffset: 45,
            fontColor: '#FF0',
            fontWeight: 'bold',
            labelOutlineColor: '#000',
            labelOutlineWidth: 4,
            fontSize: '18'
        });
        W.map.getLayerByUniqueName('venues').addFeatures([_googlePlacePtFeature, _googlePlaceLineFeature]);
        timeoutDestroyGooglePlacePoint();
    }
}

export function timeoutDestroyGooglePlacePoint(): void {
    if (_destroyGooglePlacePointTimeoutId) clearTimeout(_destroyGooglePlacePointTimeoutId);
    _destroyGooglePlacePointTimeoutId = setTimeout(() => destroyGooglePlacePoint(), 4000);
}

export function destroyGooglePlacePoint(): void {
    if (_googlePlacePtFeature) {
        _googlePlacePtFeature.destroy();
        _googlePlacePtFeature = null;
        _googlePlaceLineFeature.destroy();
        _googlePlaceLineFeature = null;
    }
}