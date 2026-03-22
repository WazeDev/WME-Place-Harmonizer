import {
    SEVERITY, CAT, PNH_DATA, USER, SCRIPT_NAME, SCRIPT_VERSION, SeverityValue,
    BETA_VERSION_STR, CATS_THAT_DONT_NEED_NAMES, BAD_URL, BAD_PHONE
} from './constants';
import {
    logDev, isAlwaysOpen, isEmergencyRoom,
    isRestArea, venueHasOverlappingHours, normalizeURL, normalizePhone,
    removeUnnecessaryAliases, insertAtIndex, uniq, containsAny, containsAll,
    matchSets, getCurrentPL, isNullOrWhitespace
} from './utils';
import {
    addUpdateAction, UPDATED_FIELDS, setHarmonizeFunc, setDupeLists, setAreaCodeList,
    _areaCodeList, reportError
} from './actions';
import { _venueWhitelist, saveWhitelistToLS, wmephWhitelistCounter } from './storage';
import {
    FlagBase, FlagContainer, HarmonizationArgs, Flag
} from './flags';
import {
    _buttonBanner2, _servicesBanner, assembleBanner, updateServicesChecks,
    getButtonBanner2, getServicesBanner, setButtonBanner2, setServicesBanner, setDupeBanner,
    WL_BUTTON_TEXT
} from './ui';
import {
    _dupeIDList, findNearbyDuplicate
} from './map';
import { Pnh } from './pnh';
import { getSdk } from './wmeSdk';

declare const W: any;
declare const require: any;
declare const $: any;
declare const WazeWrap: any;
declare const OpenLayers: any;
declare const turf: any;

const LOCK_LEVEL_4 = 3;

function executeMultiAction(pendingUpdates: any, venue: any): void {
    const sdk = getSdk();
    if (pendingUpdates.legacyActions && pendingUpdates.legacyActions.length > 0) {
        const MultiAction = require('Waze/Action/MultiAction');
        W.model.actionManager.add(new MultiAction(pendingUpdates.legacyActions));
    }
    if (pendingUpdates.sdkAddressUpdates && Object.keys(pendingUpdates.sdkAddressUpdates).length > 0) {
        sdk.DataModel.Venues.updateAddress({
            venueId: venue.attributes?.id ?? venue.id,
            ...pendingUpdates.sdkAddressUpdates
        });
    }
    if (pendingUpdates.sdkUpdates && Object.keys(pendingUpdates.sdkUpdates).length > 0) {
        sdk.DataModel.Venues.updateVenue({
            venueId: venue.attributes?.id ?? venue.id,
            ...pendingUpdates.sdkUpdates
        });
    }
}

function getPvaSeverity(pvaValue: string, venue: any): any {
    const isER = pvaValue === 'hosp' && isEmergencyRoom(venue);
    let severity;
    if (pvaValue === '' || pvaValue === '0' || (pvaValue === 'hosp' && !isER)) {
        severity = SEVERITY.RED;
    } else if (pvaValue === '2') {
        severity = SEVERITY.BLUE;
    } else if (pvaValue === '3') {
        severity = SEVERITY.YELLOW;
    } else {
        severity = SEVERITY.GREEN;
    }
    return severity;
}

let _stateHeadersParsed: boolean = false;
let _psStateIx: number;
let _psState2LetterIx: number;
let _psRegionIx: number;
let _psGoogleFormStateIx: number;
let _psDefaultLockLevelIx: number;
let _psAreaCodeIx: number;

function ensureStateHeaders(): void {
    if (!_stateHeadersParsed && PNH_DATA.states && PNH_DATA.states.length > 0) {
        const _stateHeaders = PNH_DATA.states[0].split('|');
        _psStateIx = _stateHeaders.indexOf('ps_state');
        _psState2LetterIx = _stateHeaders.indexOf('ps_state2L');
        _psRegionIx = _stateHeaders.indexOf('ps_region');
        _psGoogleFormStateIx = _stateHeaders.indexOf('ps_gFormState');
        _psDefaultLockLevelIx = _stateHeaders.indexOf('ps_defaultLockLevel');
        _psAreaCodeIx = _stateHeaders.indexOf('ps_areacode');
        _stateHeadersParsed = true;
    }
}

export function runDuplicateFinder(venue: any, name: string, aliases: string[], addr: any, placePL: string): void {
    const venueID = venue.attributes?.id ?? venue.id;
    const isResi = typeof venue.isResidential === 'function' ? venue.isResidential() : venue.isResidential;
    if (name.replace(/[^A-Za-z0-9]/g, '').length > 0 && !venue.attributes?.residential && !isResi && !isEmergencyRoom(venue) && !isRestArea(venue)) {
        let duplicateName: any = findNearbyDuplicate(name, aliases, venue, !$('#WMEPH-DisableDFZoom').prop('checked'), _venueWhitelist);
        if (duplicateName[1]) {
            new Flag.Overlapping();
        }
        [duplicateName] = duplicateName;
        if (duplicateName.length) {
            if (duplicateName.length + 1 !== _dupeIDList.length && USER.isDevUser) {
                WazeWrap.Alerts.confirm(
                    SCRIPT_NAME,
                    'WMEPH: Dupefinder Error!<br>Click OK to report this',
                    () => {
                        reportError({
                            subject: 'WMEPH Bug report DupeID',
                            message: `Script version: ${SCRIPT_VERSION}${BETA_VERSION_STR}\nPermalink: ${placePL}\nPlace name: ${
                                venue.attributes?.name ?? venue.name}\nCountry: ${addr.country?.name ?? 'Unknown'}\n--------\nDescribe the error:\nDupeID mismatch with dupeName list`
                        });
                    },
                    () => { }
                );
            } else {
                const wlAction = (dID: string) => {
                    const wlKey = 'dupeWL';
                    if (!_venueWhitelist.hasOwnProperty(venueID)) {
                        _venueWhitelist[venueID] = { dupeWL: [] };
                    }
                    if (!_venueWhitelist[venueID].hasOwnProperty(wlKey)) {
                        _venueWhitelist[venueID][wlKey] = [];
                    }
                    _venueWhitelist[venueID].dupeWL.push(dID);
                    _venueWhitelist[venueID].dupeWL = uniq(_venueWhitelist[venueID].dupeWL);
                    if (!_venueWhitelist.hasOwnProperty(dID)) {
                        _venueWhitelist[dID] = { dupeWL: [] };
                    }
                    if (!_venueWhitelist[dID].hasOwnProperty(wlKey)) {
                        _venueWhitelist[dID][wlKey] = [];
                    }
                    _venueWhitelist[dID].dupeWL.push(venueID);
                    _venueWhitelist[dID].dupeWL = uniq(_venueWhitelist[dID].dupeWL);
                    saveWhitelistToLS(true);
                    wmephWhitelistCounter();
                    _buttonBanner2.clearWL.active = true;
                    harmonizePlaceGo(venue, 'harmonize');
                };
                const newDupeBanner: Record<string, any> = {};
                for (let ijx = 1; ijx < duplicateName.length + 1; ijx++) {
                    newDupeBanner[_dupeIDList[ijx]] = {
                        active: true,
                        severity: SEVERITY.YELLOW,
                        message: duplicateName[ijx - 1],
                        WLactive: false,
                        WLvalue: WL_BUTTON_TEXT,
                        wlTooltip: 'Whitelist Duplicate',
                        WLaction: wlAction
                    };
                    if (_venueWhitelist.hasOwnProperty(venueID) && _venueWhitelist[venueID].hasOwnProperty('dupeWL')
                        && _venueWhitelist[venueID].dupeWL.includes(_dupeIDList[ijx])) {
                        newDupeBanner[_dupeIDList[ijx]].active = false;
                    } else {
                        newDupeBanner[_dupeIDList[ijx]].WLactive = true;
                    }
                }
                setDupeBanner(newDupeBanner);
            }
        }
    }
}

export function harmonizePlaceGo(venue: any, useFlag: string, pendingUpdates?: any): any {
    if (useFlag === 'harmonize') logDev('harmonizePlaceGo: useFlag="harmonize"');

    const venueID = venue.attributes?.id || venue.id;
    pendingUpdates = pendingUpdates || { sdkUpdates: {}, legacyActions: [] };

    FlagBase.currentFlags = new FlagContainer();
    const args = new HarmonizationArgs(venue, pendingUpdates, !useFlag.includes('harmonize'));
    const isResi = typeof venue.isResidential === 'function' ? venue.isResidential() : venue.isResidential;
    const isParkingLot = typeof venue.isParkingLot === 'function' ? venue.isParkingLot() : args.categories.includes(CAT.PARKING_LOT);
    const isPoint = typeof venue.isPoint === 'function' ? venue.isPoint() : venue.geometry?.type === 'Point';

    let pnhLockLevel = -1;
    if (!args.highlightOnly) {
        args.placePL = getCurrentPL()
            .replace(/&layers=[^&]+(&?)/g, '$1')
            .replace(/&s=[^&]+(&?)/g, '$1')
            .replace(/&update_requestsFilter=[^&]+(&?)/g, '$1')
            .replace(/&problemsFilter=[^&]+(&?)/g, '$1')
            .replace(/&mapProblemFilter=[^&]+(&?)/g, '$1')
            .replace(/&mapUpdateRequestFilter=[^&]+(&?)/g, '$1')
            .replace(/&venueFilter=[^&]+(&?)/g, '$1');

        setButtonBanner2(getButtonBanner2(venue, args.placePL));
        setServicesBanner(getServicesBanner());

        updateServicesChecks();

        if ($('#WMEPH-HidePlacesWiki').prop('checked')) {
            _buttonBanner2.placesWiki.active = false;
        }

        if ($('#WMEPH-HideReportError').prop('checked')) {
            _buttonBanner2.PlaceErrorForumPost.active = false;
        }

        pnhLockLevel = -1;
    }

    const result = Flag.FullAddressInference.eval(args);
    if (result?.exit) return result.severity;
    const inferredAddress = result?.inferredAddress;
    args.addr = inferredAddress ?? args.addr;

    if (!args.highlightOnly && isParkingLot) _servicesBanner.addDisabilityParking.active = true;

    if (_venueWhitelist.hasOwnProperty(venueID) && (!args.highlightOnly || (args.highlightOnly && !$('#WMEPH-DisableWLHL').prop('checked')))) {
        Object.keys(_venueWhitelist[venueID]).forEach(wlKey => {
            if (_venueWhitelist[venueID].hasOwnProperty(wlKey) && (_venueWhitelist[venueID][wlKey].active || false)) {
                if (!args.highlightOnly) _buttonBanner2.clearWL.active = true;
                args.wl[wlKey] = _venueWhitelist[venueID][wlKey];
            }
        });
        if (_venueWhitelist[venueID].hasOwnProperty('dupeWL') && _venueWhitelist[venueID].dupeWL.length > 0) {
            if (!args.highlightOnly) _buttonBanner2.clearWL.active = true;
            args.wl.dupeWL = _venueWhitelist[venueID].dupeWL;
        }
        if (!args.highlightOnly) {
            if (!args.venueGPS) {
                const sdkVenue = getSdk().DataModel.Venues.getById({ venueId: venueID });
                const center = turf.centroid(sdkVenue?.geometry).geometry.coordinates;
                args.venueGPS = { lon: center[0], lat: center[1] };
            }
            _venueWhitelist[venueID].city = args.addr.city?.getName?.() || args.addr.city?.name;
            _venueWhitelist[venueID].state = args.addr.state?.getName?.() || args.addr.state?.name;
            _venueWhitelist[venueID].country = args.addr.country?.getName?.() || args.addr.country?.name;
            _venueWhitelist[venueID].gps = args.venueGPS;
        }
    }

    const isStateEmpty = !args.addr.state || args.addr.state.attributes?.isEmpty || (typeof args.addr.state.isEmpty === 'function' ? args.addr.state.isEmpty() : args.addr.state.isEmpty);
    const isCountryEmpty = !args.addr.country || args.addr.country.attributes?.isEmpty || (typeof args.addr.country.isEmpty === 'function' ? args.addr.country.isEmpty() : args.addr.country.isEmpty);

    if (isCountryEmpty || isStateEmpty) {
        if (!args.highlightOnly) {
            WazeWrap.Alerts.error(SCRIPT_NAME, 'Country and/or state could not be determined.  Edit the place address and run WMEPH again.');
        }
        return undefined;
    }

    const countryName = args.addr.country?.getName?.() || args.addr.country?.name;
    const stateName = args.addr.state?.getName?.() || args.addr.state?.name;
    if (['United States', 'American Samoa', 'Guam', 'Northern Mariana Islands', 'Puerto Rico', 'Virgin Islands (U.S.)'].includes(countryName)) {
        args.countryCode = PNH_DATA.USA.countryCode;
    } else if (countryName === PNH_DATA.CAN.countryName) {
        args.countryCode = PNH_DATA.CAN.countryCode;
    } else {
        if (!args.highlightOnly) {
            WazeWrap.Alerts.error(SCRIPT_NAME, `This script is not currently supported in ${countryName}.`);
        }
        return SEVERITY.RED;
    }

    args.pnhCategoryInfos = PNH_DATA[args.countryCode as string].categoryInfos;

    ensureStateHeaders();

    let _stateDataTemp: any;
    for (let usdix = 1; usdix < PNH_DATA.states.length; usdix++) {
        _stateDataTemp = PNH_DATA.states[usdix].split('|');
        if (stateName === _stateDataTemp[_psStateIx]) {
            args.state2L = _stateDataTemp[_psState2LetterIx];
            args.regionCode = _stateDataTemp[_psRegionIx];
            args.gFormState = _stateDataTemp[_psGoogleFormStateIx];
            if (_stateDataTemp[_psDefaultLockLevelIx].match(/[1-5]{1}/) !== null) {
                args.defaultLockLevel = _stateDataTemp[_psDefaultLockLevelIx] - 1;
            } else if (!args.highlightOnly) {
                WazeWrap.Alerts.warning(SCRIPT_NAME, 'Lock level sheet data is not correct');
            } else {
                return 3;
            }
            setAreaCodeList(`${_areaCodeList},${_stateDataTemp[_psAreaCodeIx]}`);
            break;
        }
        if (countryName === _stateDataTemp[_psStateIx]) {
            args.state2L = _stateDataTemp[_psState2LetterIx];
            args.regionCode = _stateDataTemp[_psRegionIx];
            args.gFormState = _stateDataTemp[_psGoogleFormStateIx];
            if (_stateDataTemp[_psDefaultLockLevelIx].match(/[1-5]{1}/) !== null) {
                args.defaultLockLevel = _stateDataTemp[_psDefaultLockLevelIx] - 1;
            } else if (!args.highlightOnly) {
                WazeWrap.Alerts.warning(SCRIPT_NAME, 'Lock level sheet data is not correct');
            } else {
                return 3;
            }
            setAreaCodeList(`${_areaCodeList},${_stateDataTemp[_psAreaCodeIx]}`);
            break;
        }
    }
    if (args.state2L === 'Unknown' || args.regionCode === 'Unknown') {
        if (!args.highlightOnly) {
            WazeWrap.Alerts.confirm(
                SCRIPT_NAME,
                'WMEPH: Localization Error!<br>Click OK to report this error',
                () => {
                    const data = {
                        subject: 'WMEPH Localization Error report',
                        message: `Error report: Localization match failed for "${stateName}".`
                    };
                    if (PNH_DATA.states.length === 0) {
                        data.message += ' _PNH_DATA.states array is empty.';
                    } else {
                        data.message += ` state2L = ${_stateDataTemp[_psState2LetterIx]}. region = ${_stateDataTemp[_psRegionIx]}`;
                    }
                    reportError(data);
                },
                () => { }
            );
        }
        return SEVERITY.RED;
    }

    if (!args.highlightOnly && args.state2L === 'TN' && args.nameBase.toLowerCase().trim() === 'pilot') {
        args.nameBase = 'Pilot Food Mart';
        addUpdateAction(venue, { name: args.nameBase }, pendingUpdates);
    }

    if (venue.attributes?.residential || isResi) {
        if (!args.highlightOnly) {
            if (!$('#WMEPH-AutoLockRPPs').prop('checked')) {
                args.lockOK = false;
            }
            if (venue.attributes.name !== '') {
                logDev('Residential Name reset');
                addUpdateAction(venue, { name: '' }, pendingUpdates, false, true);
            }
            args.categories = ['RESIDENCE_HOME'];
            if (venue.attributes.description !== null && venue.attributes.description !== '') {
                logDev('Residential description cleared');
                addUpdateAction(venue, { description: null }, pendingUpdates, false, true);
            }
            if (venue.attributes.phone !== null && venue.attributes.phone !== '') {
                logDev('Residential Phone cleared');
                addUpdateAction(venue, { phone: null }, pendingUpdates, false, true);
            }
            if (venue.attributes.url !== null && venue.attributes.url !== '') {
                logDev('Residential URL cleared');
                addUpdateAction(venue, { url: null }, pendingUpdates, false, true);
            }
            if (venue.attributes.services.length > 0) {
                logDev('Residential services cleared');
                addUpdateAction(venue, { services: [] }, pendingUpdates, false, true);
            }
        }
    } else if (isParkingLot || (args.nameBase?.trim().length) || containsAny(args.categories, CATS_THAT_DONT_NEED_NAMES)) {
        const phone = venue.attributes?.phone || venue.phone;
        if (containsAny(['CA', 'CO'], [args.regionCode, args.state2L]) && (/^\d{3}-\d{3}-\d{4}$/.test(phone))) {
            args.outputPhoneFormat = '{0}-{1}-{2}';
        } else if (args.regionCode === 'SER' && !(/^\(\d{3}\) \d{3}-\d{4}$/.test(phone))) {
            args.outputPhoneFormat = '{0}-{1}-{2}';
        } else if (args.regionCode === 'GLR') {
            args.outputPhoneFormat = '{0}-{1}-{2}';
        } else if (args.state2L === 'NV') {
            args.outputPhoneFormat = '{0}-{1}-{2}';
        } else if (args.countryCode === PNH_DATA.CAN.countryCode) {
            args.outputPhoneFormat = '+1-{0}-{1}-{2}';
        }

        args.almostAllDayHoursEntries = args.openingHours.filter((hoursEntry: any) => hoursEntry.toHour === '23:59' && /^0?0:00$/.test(hoursEntry.fromHour));
        if (!args.highlightOnly && args.almostAllDayHoursEntries.length) {
            const OpeningHour = require('Waze/Model/Objects/OpeningHour');
            const newHoursEntries: any[] = [];
            args.openingHours.forEach((hoursEntry: any) => {
                const isInvalid = args.almostAllDayHoursEntries.includes(hoursEntry);
                const newHoursEntry = new OpeningHour({
                    days: hoursEntry.days.slice(),
                    fromHour: isInvalid ? '00:00' : hoursEntry.fromHour,
                    toHour: isInvalid ? '00:00' : hoursEntry.toHour
                });
                newHoursEntries.push(newHoursEntry);
            });
            args.openingHours = newHoursEntries;
            addUpdateAction(venue, { openingHours: args.openingHours }, pendingUpdates);
        }

        if (!args.highlightOnly) {
            if (isParkingLot || isResi) {
                args.pnhMatch = ['NoMatch'];
            } else {
                args.pnhMatch = Pnh.findMatch(args.nameBase, args.state2L, args.regionCode, args.countryCode as string, args.categories, venue);
            }
        } else {
            args.pnhMatch = Pnh.findMatch(args.nameBase, args.state2L, args.regionCode, args.countryCode as string, args.categories, venue, true);
        }

        args.pnhNameRegMatch = args.pnhMatch?.length
            && args.pnhMatch[0] !== 'NoMatch'
            && args.pnhMatch[0] !== 'ApprovalNeeded'
            && args.pnhMatch[0] !== 'Highlight';

        if (args.pnhNameRegMatch) {
            let updatePNHName = true;
            let nsMultiMatch = false;
            const orderList: string[] = [];
            if (args.pnhMatch.length > 1) {
                let maxBrandParentLevel = -1;
                let pnhMatchHold = args.pnhMatch[0];
                for (let pnhEntryIdx = 0; pnhEntryIdx < args.pnhMatch.length; pnhEntryIdx++) {
                    const pnhEntry = args.pnhMatch[pnhEntryIdx];
                    orderList.push(pnhEntry.order);
                    if (pnhEntry.brandParentLevel > -1) {
                        if (pnhEntry.brandParentLevel > maxBrandParentLevel) {
                            maxBrandParentLevel = pnhEntry.brandParentLevel;
                            pnhMatchHold = pnhEntry;
                        }
                    } else {
                        nsMultiMatch = true;
                    }
                }
                args.pnhMatch = pnhMatchHold;
            } else {
                [args.pnhMatch] = args.pnhMatch;
            }

            args.priPNHPlaceCat = args.pnhMatch.primaryCategory;

            if (nsMultiMatch && !args.highlightOnly) {
                WazeWrap.Alerts.confirm(
                    SCRIPT_NAME,
                    'WMEPH: Multiple matches found!<br>Double check the script changes.<br>Click OK to report this situation.',
                    () => {
                        reportError({
                            subject: `Order Nos. "${orderList.join(', ')}" WMEPH Multiple match report`,
                            message: `Error report: PNH Order Nos. "${orderList.join(', ')}" are ambiguous multiple matches.\n \nExample Permalink: ${args.placePL}`
                        });
                    },
                    () => { }
                );
            }

            if (args.pnhMatch.hasSpecialCases) {
                if (args.pnhMatch.flagsToRemove.addConvStore) {
                    FlagBase.currentFlags.remove(Flag.AddConvStore);
                }
                args.pnhMatch.servicesToAdd.forEach((scFlag: string) => {
                    _servicesBanner[scFlag].actionOn(pendingUpdates);
                    _servicesBanner[scFlag].pnhOverride = true;
                });
                args.pnhMatch.servicesToRemove.forEach((scFlag: string) => {
                    _servicesBanner[scFlag].actionOff(pendingUpdates);
                    _servicesBanner[scFlag].pnhOverride = true;
                });
                if (args.pnhMatch.forceBrand) {
                    [, args.brand] = args.pnhMatch.forceBrand;
                }
                if (args.pnhMatch.forceBrand && args.priPNHPlaceCat === CAT.GAS_STATION
                    && args.brand !== args.pnhMatch.forceBrand) {
                    addUpdateAction(venue, { brand: args.pnhMatch.forceBrand }, pendingUpdates);
                    UPDATED_FIELDS.brand.updated = true;
                    logDev('Gas brand updated from PNH');
                }
                if (args.pnhMatch.localizationRegEx) {
                    args.showDispNote = false;
                }
                if (args.pnhMatch.recommendedPhone) {
                    args.recommendedPhone = normalizePhone(args.pnhMatch.recommendedPhone, args.outputPhoneFormat) ?? undefined;
                }
                if (args.pnhMatch.keepName) {
                    updatePNHName = false;
                }
                if (args.pnhMatch.chainIsClosed && !Flag.ChainIsClosed.isWhitelisted(args)) {
                    args.chainIsClosed = true;
                }
            }

            if (!args.chainIsClosed) {
                const { altCategories } = args.pnhMatch;

                if (args.priPNHPlaceCat === CAT.HOTEL) {
                    const nameToCheck = args.nameBase + (args.nameSuffix || '');
                    if (nameToCheck.toUpperCase() === args.pnhMatch.name.toUpperCase()) {
                        args.nameBase = args.pnhMatch.name;
                    } else {
                        const splix = args.nameBase.toUpperCase().replace(/[-/]/g, ' ').indexOf(args.pnhMatch.name.toUpperCase().replace(/[-/]/g, ' '));
                        if (splix > -1) {
                            const frontText = args.nameBase.slice(0, splix);
                            const backText = args.nameBase.slice(splix + args.pnhMatch.name.length);
                            args.nameBase = args.pnhMatch.name;
                            if (frontText.length > 0) { args.nameBase = `${frontText} ${args.nameBase}`; }
                            if (backText.length > 0) { args.nameBase = `${args.nameBase} ${backText}`; }
                            args.nameBase = args.nameBase.replace(/ {2,}/g, ' ');
                        } else {
                            args.nameBase = args.pnhMatch.name;
                        }
                    }
                    if (altCategories && altCategories.length) {
                        insertAtIndex(args.categories, altCategories, 1);
                    }
                    if (args.categories.includes(CAT.HOTEL)) {
                        const lodgingIdx = args.categories.indexOf(CAT.LODGING);
                        if (lodgingIdx > -1) {
                            args.categories.splice(lodgingIdx, 1);
                        }
                    }
                    if (args.pnhMatch && !_servicesBanner.addWiFi.checked) {
                        _servicesBanner.addWiFi.action();
                    }
                    if (!_servicesBanner.add247.checked) {
                        _servicesBanner.add247.action();
                    }
                } else if (args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank) {
                    if (/\batm\b/ig.test(args.nameBase)) {
                        args.nameBase = `${args.pnhMatch.name} ATM`;
                    } else {
                        args.nameBase = args.pnhMatch.name;
                    }
                } else if (args.priPNHPlaceCat === CAT.GAS_STATION) {
                    if (altCategories?.length) {
                        insertAtIndex(args.categories, altCategories, 1);
                    }
                    args.nameBase = args.pnhMatch.name;
                } else if (updatePNHName) {
                    args.nameBase = args.pnhMatch.name;
                    args.categories = insertAtIndex(args.categories, args.priPNHPlaceCat, 0);
                    if (altCategories?.length && !args.pnhMatch.flagsToAdd?.addCat2 && !args.pnhMatch.optionCat2) {
                        args.categories = insertAtIndex(args.categories, altCategories, 1);
                    }
                } else if (!updatePNHName) {
                    Flag.TitleCaseName.eval(venue, args.nameBase, args.nameSuffix);
                }

                if (!(args.pnhMatch.localUrlCheckRegEx?.test(args?.url))) {
                    args.pnhUrl = args.pnhMatch.url;
                }

                if (!args.pnhMatch.noUpdateAlias && (!containsAll(args.aliases, args.pnhMatch.aliases)
                    && args.pnhMatch.aliases?.length && !args.pnhMatch.optionName2)) {
                    args.aliases = insertAtIndex(args.aliases, args.pnhMatch.aliases, 0);
                    addUpdateAction(venue, { aliases: args.aliases }, pendingUpdates);
                }

                const parentCats = uniq(args.categories.map((category: string) => args.pnhCategoryInfos.getById(category)?.parent))
                    .filter((parent: any) => typeof parent === 'string' && parent.trim().length > 0);
                args.categories = args.categories.filter((cat: string) => !parentCats.includes(cat));

                if (!matchSets(uniq(venue.attributes?.categories || venue.categories || []), uniq(args.categories!))) {
                    if (!args.pnhMatch.optionCat2 && !args.pnhMatch.flagsToAdd?.addCat2) {
                        logDev(`Categories updated with ${args.categories}`);
                        addUpdateAction(venue, { categories: args.categories }, pendingUpdates);
                    } else {
                        logDev(`Primary category updated with ${args.priPNHPlaceCat}`);
                        args.categories = insertAtIndex(args.categories, args.priPNHPlaceCat, 0);
                        addUpdateAction(venue, { categories: args.categories });
                    }
                }
                Flag.AddCat2.eval(args, altCategories?.[0]);

                args.description = args.pnhMatch.description;
                const desc = venue.attributes?.description || (venue as any).description;
                if (!isNullOrWhitespace(args.description) && !desc?.toUpperCase().includes(args.description!.toUpperCase())) {
                    if (!isNullOrWhitespace(desc)) {
                        args.descriptionInserted = true;
                    }
                    logDev('Description updated');
                    args.description = `${args.description}\n${desc}`;
                    addUpdateAction(venue, { description: args.description }, pendingUpdates);
                    UPDATED_FIELDS.description.updated = true;
                }

                if (args.pnhMatch.lockAt) {
                    pnhLockLevel = args.pnhMatch.lockAt - 1;
                }
            }
        }

        if (!args.chainIsClosed) {
            const isArea = !isPoint;
            let highestCategoryLock = -1;
            args.categories.forEach((category: string) => {
                const pnhCategoryInfo = args.pnhCategoryInfos.getById(category);

                if (!pnhCategoryInfo) {
                    console.warn(`WMEPH: Unexpected category: ${category}`);
                    return;
                }
                let pvaPoint = pnhCategoryInfo.point;
                let pvaArea = pnhCategoryInfo.area;
                if (pnhCategoryInfo.regPoint.includes(args.state2L) || pnhCategoryInfo.regPoint.includes(args.regionCode)
                    || pnhCategoryInfo.regPoint.includes(args.countryCode)) {
                    pvaPoint = '1';
                    pvaArea = '';
                } else if (pnhCategoryInfo.regArea.includes(args.state2L) || pnhCategoryInfo.regArea.includes(args.regionCode)
                    || pnhCategoryInfo.regArea.includes(args.countryCode)) {
                    pvaPoint = '';
                    pvaArea = '1';
                }

                if (args.categories.includes(CAT.POST_OFFICE) && /\b(?:cpu|vpo)\b/i.test(args.nameBase + args.nameSuffix)) {
                    pvaPoint = '1';
                    pvaArea = '';
                }

                const pointSeverity = getPvaSeverity(pvaPoint, venue);
                const areaSeverity = getPvaSeverity(pvaArea, venue);

                if (isPoint && pointSeverity > SEVERITY.GREEN) {
                    args.maxPointSeverity = Math.max(pointSeverity, args.maxPointSeverity);
                } else if (isArea) {
                    args.maxAreaSeverity = Math.min(areaSeverity, args.maxAreaSeverity);
                }

                Flag.PnhCatMess.eval(venue, pnhCategoryInfo, args.categories, args.highlightOnly);

                for (let lockix = 1; lockix < 6; lockix++) {
                    const categoryLock = pnhCategoryInfo[`lock${lockix}`];
                    if (lockix - 1 > highestCategoryLock && (categoryLock.includes(args.state2L) || categoryLock.includes(args.regionCode)
                        || categoryLock.includes(args.countryCode))) {
                        highestCategoryLock = lockix - 1;
                    }
                }
            });

            if (highestCategoryLock > -1) {
                args.defaultLockLevel = highestCategoryLock;
            }

            if (!args.highlightOnly) {
                const venueName = venue.attributes?.name || venue.name;
                if ((args.nameBase + (args.nameSuffix || '')) !== venueName) {
                    logDev('Name updated');
                    addUpdateAction(venue, { name: args.nameBase + (args.nameSuffix || '') }, pendingUpdates);
                }

                const tempAliases = removeUnnecessaryAliases(args.nameBase, args.aliases);
                if (tempAliases) {
                    args.aliasesRemoved = true;
                    args.aliases = tempAliases;
                    logDev('Alt Names updated');
                    addUpdateAction(venue, { aliases: args.aliases }, pendingUpdates);
                }

                args.categories.forEach((category: string) => {
                    const pnhCategoryInfo = args.pnhCategoryInfos.getById(category);
                    pnhCategoryInfo.services.forEach((service: any) => {
                        const serviceButton = _servicesBanner[service.pnhKey];
                        if (!serviceButton.pnhOverride) {
                            serviceButton.active = true;
                        }
                    });
                });
            }

            args.hoursOverlap = venueHasOverlappingHours(args.openingHours!);

            args.isUspsPostOffice = args.countryCode === PNH_DATA.USA.countryCode && !args.categories.includes(CAT.PARKING_LOT)
                && args.categories.includes(CAT.POST_OFFICE);

            if (!args.highlightOnly) {
                if (isAlwaysOpen(venue)) {
                    _servicesBanner.add247.checked = true;
                }
                _servicesBanner.add247.active = true;

                if (!args.hoursOverlap) {
                    const OpeningHour = require('Waze/Model/Objects/OpeningHour');
                    const tempHours = args.openingHours.slice();
                    for (let ohix = 0; ohix < args.openingHours.length; ohix++) {
                        if (tempHours[ohix].days.length === 2 && tempHours[ohix].days[0] === 1 && tempHours[ohix].days[1] === 0) {
                            logDev('Correcting M-S entry...');
                            tempHours.push(new OpeningHour({ days: [0], fromHour: tempHours[ohix].fromHour, toHour: tempHours[ohix].toHour }));
                            tempHours[ohix].days = [1];
                            args.openingHours = tempHours;
                            addUpdateAction(venue, { openingHours: tempHours }, pendingUpdates);
                        }
                    }
                }

                if (Flag.ClearThisUrl.venueIsFlaggable(args)) {
                    args.url = null;
                    addUpdateAction(venue, { url: args.url }, pendingUpdates);
                }
                args.normalizedUrl = normalizeURL(args.url);
                if (args.isUspsPostOffice && args.url !== 'usps.com') {
                    args.url = 'usps.com';
                    addUpdateAction(venue, { url: args.url }, pendingUpdates);
                } else if (!args.pnhUrl && args.normalizedUrl !== args.url) {
                    if (args.normalizedUrl !== BAD_URL) {
                        args.url = args.normalizedUrl ?? null;
                        logDev('URL formatted');
                        addUpdateAction(venue, { url: args.url }, pendingUpdates);
                    }
                } else if (args.pnhUrl && isNullOrWhitespace(args.url)) {
                    args.url = args.pnhUrl;
                    logDev('URL updated');
                    addUpdateAction(venue, { url: args.url }, pendingUpdates);
                }

                if (args.phone) {
                    if (Flag.ClearThisPhone.venueIsFlaggable(args)) {
                        args.phone = null;
                    }
                    const normalizedPhone = normalizePhone(args.phone, args.outputPhoneFormat);
                    if (normalizedPhone && normalizedPhone !== BAD_PHONE) args.phone = normalizedPhone;
                    const venuePhone = venue.attributes?.phone || venue.phone;
                    if (args.phone !== venuePhone) {
                        logDev('Phone updated');
                        addUpdateAction(venue, { phone: args.phone }, pendingUpdates);
                    }
                }

                if (args.isUspsPostOffice) {
                    const cleanNameParts = Flag.FormatUSPS.getCleanNameParts(args.nameBase, args.nameSuffix);
                    const nameToCheck = cleanNameParts.join('');
                    if (Flag.FormatUSPS.isNameOk(nameToCheck, args.state2L, args.addr)) {
                        const venueName = venue.attributes?.name || venue.name;
                        if (nameToCheck !== venueName) {
                            [args.nameBase, args.nameSuffix] = cleanNameParts;
                            addUpdateAction(venue, { name: nameToCheck }, pendingUpdates);
                        }
                    }
                }
            }
        }
    } // CLOSES else if (venue.isParkingLot()...)

    if (!args.chainIsClosed) {
        if (!args.highlightOnly && args.categories.includes(CAT.REST_AREAS)) {
            const venueName = venue.attributes?.name || venue.name;
            if (venueName.match(/^Rest Area.* - /) !== null && args.countryCode === PNH_DATA.USA.countryCode) {
                const newSuffix = args.nameSuffix.replace(/\bMile\b/i, 'mile');
                if (args.nameBase + newSuffix !== venueName) {
                    addUpdateAction(venue, { name: args.nameBase + newSuffix }, pendingUpdates);
                    logDev('Lower case "mile"');
                }
            }
            _buttonBanner2.restAreaWiki.active = true;
            _buttonBanner2.placesWiki.active = false;
        }

        args.isLocked = (venue.attributes?.lockRank ?? venue.lockRank) >= (pnhLockLevel > -1 ? pnhLockLevel : args.defaultLockLevel);
        args.currentHN = venue.attributes?.houseNumber ?? args.sdkAddress?.houseNumber;
        if (pendingUpdates?.sdkAddressUpdates?.houseNumber !== undefined) {
            args.currentHN = pendingUpdates.sdkAddressUpdates.houseNumber;
        } else if (pendingUpdates?.legacyActions) {
            const updateHnAction = pendingUpdates.legacyActions.find((action: any) => action.newAttributes && action.newAttributes.houseNumber);
            if (updateHnAction) args.currentHN = updateHnAction.newAttributes.houseNumber;
        }
        const isStreetEmpty = !args.addr.street || args.addr.street.attributes?.isEmpty || (typeof args.addr.street.isEmpty === 'function' ? args.addr.street.isEmpty() : args.addr.street.isEmpty);
        args.hasStreet = !isStreetEmpty;
        args.ignoreParkingLots = $('#WMEPH-DisablePLAExtProviderCheck').prop('checked');

        if (!isResi && (isParkingLot || (args.nameBase?.trim().length))) {
            if (args.pnhNameRegMatch) {
                Flag.HotelMkPrim.eval(args);
                Flag.LocalizedName.eval(args);
                Flag.AddAlias.eval(args);
                Flag.AddRecommendedPhone.eval(args);
                Flag.SubFuel.eval(args);
                Flag.SpecCaseMessage.eval(args);
                Flag.LocalURL.eval(args);
                Flag.UrlMismatch.eval(args);
                Flag.CheckDescription.eval(args);
                Flag.LocationFinder.eval(args);
                Flag.AddPharm.eval(args);
                Flag.AddSuper.eval(args);
                Flag.AppendAMPM.eval(args);
                Flag.PlaceMatched.eval(args);
            } else if (!args.highlightOnly && args.categories.includes(CAT.POST_OFFICE)) {
                Flag.LocationFinder.eval(args);
            }
            Flag.InvalidUrl.eval(args);
            Flag.SFAliases.eval(args);
            Flag.CatHotel.eval(args);
            Flag.ExtProviderMissing.eval(args);
            Flag.NewPlaceSubmit.eval(args);
            Flag.ApprovalSubmit.eval(args);
            Flag.TitleCaseName.eval(args);
            Flag.BankType1.eval(args);
            Flag.BankBranch.eval(args);
            Flag.StandaloneATM.eval(args);
            Flag.BankCorporate.eval(args);
            Flag.AddATM.eval(args);
            Flag.NoHours.eval(args);
            Flag.Mismatch247.eval(args);
            Flag.HoursOverlap.eval(args);
            Flag.OldHours.eval(args);
            Flag.AllDayHoursFixed.eval(args);
            Flag.IsThisAPostOffice.eval(args);
            Flag.MissingUSPSZipAlt.eval(args);
            Flag.FormatUSPS.eval(args);
            Flag.CatPostOffice.eval(args);
            Flag.MissingUSPSDescription.eval(args);
            Flag.MissingUSPSAlt.eval(args);
            Flag.UrlMissing.eval(args);
            Flag.PhoneInvalid.eval(args);
            Flag.PhoneMissing.eval(args);
            Flag.BadAreaCode.eval(args);
            Flag.ParentCategory.eval(args);
            Flag.ClearThisPhone.eval(args);
            Flag.ClearThisUrl.eval(args);
            Flag.UrlAnalytics.eval(args);
            Flag.EVCSAltNameMissing.eval(args);
        }
        Flag.UnmappedRegion.eval(args);
        Flag.PlaCostTypeMissing.eval(args);
        Flag.PlaLotElevationMissing.eval(args);
        Flag.PlaSpaces.eval(args);
        Flag.PlaLotTypeMissing.eval(args);
        Flag.NoPlaStopPoint.eval(args);
        Flag.PlaStopPointUnmoved.eval(args);
        Flag.PlaCanExitWhileClosed.eval(args);
        Flag.PlaPaymentTypeMissing.eval(args);
        Flag.PlaHasAccessibleParking.eval(args);
        Flag.ChangeToHospitalUrgentCare.eval(args);
        Flag.IsThisAPilotTravelCenter.eval(args);
        Flag.GasMkPrim.eval(args);
        Flag.AddConvStore.eval(args);
        Flag.IndianaLiquorStoreHours.eval(args);
        Flag.PointNotArea.eval(args);
        Flag.GasMismatch.eval(args);
        Flag.EVChargingStationWarning.eval(args);
        Flag.AddCommonEVPaymentMethods.eval(args);
        Flag.RemoveUncommonEVPaymentMethods.eval(args);
        Flag.EVCSPriceMissing.eval(args);
        Flag.NameMissing.eval(args);
        Flag.PlaNameMissing.eval(args);
        Flag.PlaNameNonStandard.eval(args);
        Flag.GasNameMissing.eval(args);
        Flag.PlaIsPublic.eval(args);
        Flag.HnMissing.eval(args);
        Flag.HnTooManyDigits.eval(args);
        Flag.CityMissing.eval(args);
        Flag.StreetMissing.eval(args);
        Flag.NotAHospital.eval(args);
        Flag.ChangeToPetVet.eval(args);
        Flag.ChangeToDoctorClinic.eval(args);
        Flag.NotASchool.eval(args);

        Flag.RestAreaSpec.eval(args);
        Flag.RestAreaScenic.eval(args);
        Flag.RestAreaNoTransportation.eval(args);
        Flag.RestAreaGas.eval(args);
        Flag.RestAreaName.eval(args);
        Flag.AreaNotPoint.eval(args);
    } else {
        Flag.ChainIsClosed.eval(args);
    }

    const orderedFlags = FlagBase.currentFlags.getOrderedFlags();
    orderedFlags.forEach((flag: any) => {
        args.totalSeverity = Math.max(flag.severity, args.totalSeverity);
    });

    let placeLockedFlag;
    if (!args.chainIsClosed) {
        if (pnhLockLevel !== -1 && !args.highlightOnly) {
            logDev(`PNHLockLevel: ${pnhLockLevel}`);
            args.levelToLock = pnhLockLevel;
        } else {
            args.levelToLock = args.defaultLockLevel;
        }
        if (args.regionCode === 'SER') {
            if (args.categories.includes(CAT.COLLEGE_UNIVERSITY) && args.categories.includes(CAT.PARKING_LOT)) {
                args.levelToLock = LOCK_LEVEL_4;
            } else if (isPoint && args.categories.includes(CAT.COLLEGE_UNIVERSITY) && (!args.categories.includes(CAT.HOSPITAL_MEDICAL_CARE)
                || !args.categories.includes(CAT.HOSPITAL_URGENT_CARE))) {
                args.levelToLock = LOCK_LEVEL_4;
            }
        }

        if (args.levelToLock !== null && args.levelToLock > ((USER.rank ?? 0) - 1)) { args.levelToLock = ((USER.rank ?? 0) - 1); }

        Flag.GasNoBrand.eval(args);
        Flag.GasUnbranded.eval(args);

        Flag.IgnEdited.eval(args);
        Flag.WazeBot.eval(args);
        Flag.LockRPP.eval(args);

        orderedFlags.forEach((flag: any) => flag.preProcess?.(args));

        if (!args.highlightOnly) {
            args.lockOK &&= !orderedFlags.some((flag: any) => flag.noLock);
            logDev(`Severity: ${args.totalSeverity}; lockOK: ${args.lockOK}`);
        }

        placeLockedFlag = Flag.PlaceLocked.eval(args);

        if (args.categories.includes(CAT.PHARMACY)) {
            FlagBase.currentFlags.remove(Flag.AddPharm);
        }
        if (args.categories.includes(CAT.SUPERMARKET_GROCERY)) {
            FlagBase.currentFlags.remove(Flag.AddSuper);
        }

        Flag.ResiTypeName.eval(args);
        Flag.SuspectDesc.eval(args);

        setDupeLists([], []);
        setDupeBanner({});
        if (!args.highlightOnly) runDuplicateFinder(venue, args.nameBase, args.aliases, args.addr, args.placePL);
        Flag.HNRange.eval(args);
    }

    if (args.highlightOnly) {
        args.totalSeverity = SEVERITY.GREEN;
        orderedFlags.forEach((flag: any) => {
            args.totalSeverity = Math.max(flag.severity, args.totalSeverity);
        });

        const lockRank = venue.attributes?.lockRank ?? venue.lockRank;
        if (lockRank === 0
            && args.categories.some((cat: string) => [CAT.HOSPITAL_MEDICAL_CARE, CAT.HOSPITAL_URGENT_CARE, CAT.GAS_STATION].includes(cat))) {
            args.totalSeverity = SEVERITY.PINK;
        }

        if (args.totalSeverity === SEVERITY.GREEN && placeLockedFlag?.hlLockFlag) {
            args.totalSeverity = 'lock';
        }
        if (args.totalSeverity === SEVERITY.BLUE && placeLockedFlag?.hlLockFlag) {
            args.totalSeverity = 'lock1';
        }
        if (venue.attributes?.adLocked || venue.isAdLocked) {
            args.totalSeverity = 'adLock';
        }

        return args.totalSeverity;
    }

    if (!args.highlightOnly) {
        updateServicesChecks();
        UPDATED_FIELDS.updateEditPanelHighlights();
        assembleBanner(args.chainIsClosed);
        executeMultiAction(pendingUpdates, venue);
    }

    return undefined;
}

setHarmonizeFunc(harmonizePlaceGo);
