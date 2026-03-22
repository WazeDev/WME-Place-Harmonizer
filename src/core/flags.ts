import {
    SEVERITY, CAT, PNH_DATA, USER, URLS, BAD_URL, BAD_PHONE, SCRIPT_NAME,
    DEFAULT_HOURS_TEXT, COMMON_EV_PAYMENT_METHODS,
    COLLEGE_ABBREVIATIONS, PRIMARY_CATS_TO_IGNORE_MISSING_PHONE_URL,
    PRIMARY_CATS_TO_FLAG_GREEN_MISSING_PHONE_URL, ANY_CATS_TO_FLAG_GREEN_MISSING_PHONE_URL,
    REGIONS_THAT_WANT_PLA_PHONE_URL, CHAIN_APPROVAL_PRIMARY_CATS_TO_IGNORE,
    SEARCH_RESULTS_WINDOW_NAME, _searchResultsWindowSpecs, SETTING_IDS
} from './constants';
import {
    log, logDev, isNullOrWhitespace, OLD_getSelectedVenue, clickGeneralTab,
    uniq, arraysAreEqual, insertAtIndex, containsAny, normalizeURL, normalizePhone,
    titleCase, getNameParts, removeUnnecessaryAliases, is247Hours, isHoursAllDay, isAlwaysOpen, sortWithIndex, getOpeningHours, getSelectedVenue
} from './utils';
import {
    harmonizePlaceGo, whitelistAction, addUpdateAction, nudgeVenue,
    reportError, inferAddress, updateAddress, UPDATED_FIELDS,
    _areaCodeList, _dupeHNRangeList, _dupeHNRangeDistList
} from './actions';
import { Pnh } from './pnh';
import { getSdk } from './wmeSdk';

declare const require: any;
declare const W: any;
declare const WazeWrap: any;
declare const $: any;
declare const I18n: any;
declare const turf: any;
declare const OpenLayers: any;
declare const HoursParser: any;

// Abstract flag classes.
export class FlagBase {
    static defaultSeverity: any = SEVERITY.GREEN;
    static defaultMessage: string = '';
    static currentFlags: any;
    #severity: any;
    #message: string | undefined;
    #noLock: boolean | undefined;
    /** @type {HarmonizationArgs} */
    args: any;
    noBannerAssemble?: boolean;
    divId?: string;
    suffixMessage?: string | any;
    postProcess?(): void;
    WLactive?: boolean;

    get name(): string { return this.constructor.name; }

    get severity(): any { return this.#severity ?? (this.constructor as any).defaultSeverity; }
    set severity(value: any) { this.#severity = value; }

    get message(): string { return this.#message ?? (this.constructor as any).defaultMessage; }
    set message(value: string) { this.#message = value; }

    get noLock(): boolean { return this.#noLock ?? this.severity > SEVERITY.BLUE; }
    set noLock(value: boolean) { this.#noLock = value; }

    constructor() {
        FlagBase.currentFlags.add(this);
    }

    /**
     *
     * @param {HarmonizationArgs} args
     * @returns
     */
    static eval(args: any): any {
        if ((this as any).venueIsFlaggable(args)) {
            const flag = new (this as any)(args);
            flag.args = args;
            return flag;
        }
        return null;
    }
}

export class ActionFlag extends FlagBase {
    static defaultButtonTooltip: string = '';
    #buttonText: string | undefined;
    #buttonTooltip: string | undefined;
    value2?: string;
    title2?: string;
    action2?(): void;
    action?(): void;

    get buttonText(): string { return this.#buttonText ?? (this.constructor as any).defaultButtonText; }
    set buttonText(value: string) { this.#buttonText = value; }
    get buttonTooltip(): string { return this.#buttonTooltip ?? (this.constructor as any).defaultButtonTooltip; }
    set buttonTooltip(value: string) { this.#buttonTooltip = value; }
}

export class WLFlag extends FlagBase {
    static defaultWLTooltip: string = 'Whitelist this message';
    #showWL: boolean | undefined;

    get severity(): any { return (this.constructor as any).isWhitelisted(this.args) ? SEVERITY.GREEN : super.severity; }
    set severity(value: any) { super.severity = value; }

    get showWL(): boolean { return this.#showWL ?? !(this.constructor as any).isWhitelisted(this.args); }
    set showWL(value: boolean) { this.#showWL = value; }

    get wlTooltip(): string { return (this.constructor as any).defaultWLTooltip; }

    WLaction() {
        const venue = OLD_getSelectedVenue();
        if (whitelistAction(this.args.sdkVenue.id, (this.constructor as any).WL_KEY)) {
            harmonizePlaceGo(venue, 'harmonize');
        }
    }

    /**
     *
     * @param {HarmonizationArgs} args
     * @returns
     */
    static isWhitelisted(args: any): boolean {
        return !!args.wl[(this as any).WL_KEY];
    }
}

export class WLActionFlag extends WLFlag {
    static defaultButtonTooltip: string = '';
    #buttonText: string | undefined;
    #buttonTooltip: string | undefined;
    action?(): void;

    get buttonText(): string { return this.#buttonText ?? (this.constructor as any).defaultButtonText; }
    set buttonText(value: string) { this.#buttonText = value; }

    get buttonTooltip(): string { return this.#buttonTooltip ?? (this.constructor as any).defaultButtonTooltip; }
    set buttonTooltip(value: string) { this.#buttonTooltip = value; }
}

/** Namespace to keep flags grouped. */
export const Flag: any = {
    ChainIsClosed: class extends WLFlag {
        static defaultSeverity = SEVERITY.ORANGE;
        static WL_KEY = 'chainIsClosed';

        static venueIsFlaggable(args: any) {
            return args.chainIsClosed;
        }

        get message() {
            const pnhName = this.args.pnhMatch.name;
            return `Place matched to PNH entry "${pnhName}", which is no longer in business.<br/><br/>`
            + 'Follow the <a target="_blank" href="https://www.waze.com/wiki/USA/Places#Closed">wiki instructions</a> for closed places.';
        }
    },
    // @ts-ignore
    PnhCatMess: class extends ActionFlag {
        actionType?: string;
        venue: any;

        constructor(venue: any, pnhCategoryInfo: any, categories: string[]) {
            super();
            this.message = pnhCategoryInfo.message;
            if (categories.includes(CAT.HOSPITAL_URGENT_CARE)) {
                this.buttonText = 'Change to Doctor/Clinic';
                this.actionType = 'changeToDoctorClinic';
            }
            this.venue = venue;
        }

        static #venueIsFlaggable(highlightOnly: boolean, pnhCategoryInfo: any) {
            return !highlightOnly && !isNullOrWhitespace(pnhCategoryInfo.message);
        }

        // @ts-ignore
        static eval(venue: any, pnhCategoryInfo: any, categories: string[], highlightOnly: boolean): any {
            return this.#venueIsFlaggable(highlightOnly, pnhCategoryInfo) ? new this(venue, pnhCategoryInfo, categories) : null;
        }

        action() {
            if (this.actionType === 'changeToDoctorClinic') {
                const categories = uniq(this.venue.attributes.categories.slice());
                const indexOfHospital = categories.indexOf(CAT.HOSPITAL_URGENT_CARE);
                if (indexOfHospital > -1) {
                    categories[indexOfHospital] = CAT.DOCTOR_CLINIC;
                    addUpdateAction(this.venue, { categories }, null, true);
                }
            }
        }
    },
    NotAHospital: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Key words suggest this location may not be a hospital or urgent care location.';
        static defaultButtonText = 'Change to Doctor / Clinic';
        static defaultButtonTooltip = 'Change category to Doctor / Clinic';
        static WL_KEY = 'notAHospital';
        static defaultWLTooltip = 'Whitelist category';

        static venueIsFlaggable(args: any) {
            if (args.categories.includes(CAT.HOSPITAL_URGENT_CARE) && !this.isWhitelisted(args)) {
                const testName = args.nameBase.toLowerCase().replace(/[^a-z]/g, ' ');
                const testNameWords = testName.split(' ');
                return containsAny(testNameWords, Pnh.HOSPITAL_FULL_MATCH) || Pnh.HOSPITAL_PART_MATCH.some((match: string) => testName.includes(match));
            }
            return false;
        }

        action() {
            let categories = this.args.categories.slice();
            let updateIt = false;
            if (categories.length) {
                const idx = categories.indexOf(CAT.HOSPITAL_URGENT_CARE);
                if (idx > -1) {
                    categories[idx] = CAT.DOCTOR_CLINIC;
                    updateIt = true;
                }
                categories = uniq(categories);
            } else {
                categories.push(CAT.DOCTOR_CLINIC);
                updateIt = true;
            }
            if (updateIt) {
                addUpdateAction(this.args.venue, { categories }, null, true);
            } else {
                harmonizePlaceGo(this.args.venue, 'harmonize');
            }
        }
    },
    FullAddressInference: class extends FlagBase {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Missing address was inferred from nearby segments. Verify the address and run WMEPH again.';
        inferredAddress: any;

        constructor(inferredAddress: any) {
            super();
            this.inferredAddress = inferredAddress;
        }

        static eval(args: any): any {
            let result: any = null;
            const isStateEmpty = !args.addr.state || args.addr.state.attributes?.isEmpty || (typeof args.addr.state.isEmpty === 'function' ? args.addr.state.isEmpty() : args.addr.state.isEmpty);
            const isCountryEmpty = !args.addr.country || args.addr.country.attributes?.isEmpty || (typeof args.addr.country.isEmpty === 'function' ? args.addr.country.isEmpty() : args.addr.country.isEmpty);

            if (!args.highlightOnly) {
                if (isStateEmpty || isCountryEmpty) {
                    const sdk = getSdk();
                    if (sdk.Map.getZoomLevel() < 16) {
                        if ($('#WMEPH-EnableIAZoom').prop('checked')) {
                            const sdkVenue = getSelectedVenue();
                            if (sdkVenue) {
                                const center = turf.centroid(sdkVenue.geometry).geometry.coordinates;
                                sdk.Map.setMapCenter({ lonLat: { lon: center[0], lat: center[1] }, zoomLevel: 17 });
                            }
                        } else {
                            WazeWrap.Alerts.error(SCRIPT_NAME, 'No address and the state cannot be determined. Please zoom in and rerun the script. '
                                + 'You can enable autozoom for this type of case in the options.');
                        }
                        result = { exit: true };
                    } else {
                        let inferredAddress = inferAddress(args.venue, 7);
                        inferredAddress = inferredAddress.attributes ?? inferredAddress;

                        if (inferredAddress?.state && inferredAddress.country) {
                            if ($('#WMEPH-AddAddresses').prop('checked')) {
                                updateAddress(args.venue, inferredAddress, args.actions);
                                UPDATED_FIELDS.address.updated = true;
                                result = new this(inferredAddress);
                            } else if (![CAT.JUNCTION_INTERCHANGE].includes(args.categories[0])) {
                                new Flag.CityMissing(args);
                            }
                        } else {
                            WazeWrap.Alerts.error(SCRIPT_NAME, 'This place has no address data and the address cannot be inferred from nearby segments. Please edit the address and run WMEPH again.');
                            result = { exit: true };
                        }
                    }
                }
            } else if (isStateEmpty || isCountryEmpty) {
                result = { exit: true };
                if (args.sdkVenue.isAdLocked) {
                    result.severity = 'adLock';
                } else {
                    const cat = args.categories;
                    if (containsAny(cat, [CAT.HOSPITAL_MEDICAL_CARE, CAT.HOSPITAL_URGENT_CARE, CAT.GAS_STATION])) {
                        logDev('Unaddressed HUC/GS');
                        result.severity = SEVERITY.PINK;
                    } else if (cat.includes(CAT.JUNCTION_INTERCHANGE)) {
                        result.severity = SEVERITY.GREEN;
                    } else {
                        result.severity = SEVERITY.RED;
                    }
                }
            }
            return result;
        }
    },
    NameMissing: class extends FlagBase {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Name is missing.';

        static venueIsFlaggable(args: any) {
            return !args.categories.includes(CAT.RESIDENCE_HOME)
                && (!args.nameBase?.replace(/[^A-Za-z0-9]/g, ''))
                && ![CAT.ISLAND, CAT.FOREST_GROVE, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.PARKING_LOT].includes(args.categories[0])
                && !(args.categories.includes(CAT.GAS_STATION) && args.brand);
        }
    },
    GasNameMissing: class extends ActionFlag {
        static defaultSeverity = SEVERITY.RED;
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Use gas brand as station name';

        get message() { return `Name is missing. Use "${this.args.brand}"?`; }

        static venueIsFlaggable(args: any) {
            return args.categories.includes(CAT.GAS_STATION)
                && isNullOrWhitespace(args.nameBase)
                && !isNullOrWhitespace(args.brand);
        }

        action() {
            addUpdateAction(this.args.venue, { name: this.args.brand }, null, true);
        }
    },
    ClearThisUrl: class extends FlagBase {
        static defaultSeverity = SEVERITY.YELLOW;

        static venueIsFlaggable(args: any) {
            return args.categories.includes(CAT.CHARGING_STATION)
                && args.url
                && ['https://www.nissan-europe.com/', 'https://www.eco-movement.com/'].includes(args.url);
        }
    },
    ClearThisPhone: class extends FlagBase {
        static defaultSeverity = SEVERITY.YELLOW;

        static venueIsFlaggable(args: any) {
            return args.categories.includes(CAT.CHARGING_STATION)
                && args.phone === '+33-1-72676914';
        }
    },
    PlaIsPublic: class extends FlagBase {
        static get defaultMessage() {
            let msg = 'If this does not meet the requirements for a <a href="https://wazeopedia.waze.com/wiki/USA/Places/Parking_lot#Lot_Type" '
                + 'target="_blank" style="color:5a5a73">public parking lot</a>, change to:<br>';
            msg += [
                ['RESTRICTED', 'Restricted'],
                ['PRIVATE', 'Private']
            ].map(
                (btnInfo: string[]) => $('<button>', { class: 'wmeph-pla-lot-type-btn btn btn-default btn-xs wmeph-btn', 'data-lot-type': btnInfo[0] })
                    .text(btnInfo[1])
                    .prop('outerHTML')
            ).join('');
            return msg;
        }

        static venueIsFlaggable(args: any) {
            return args.categories.includes(CAT.PARKING_LOT)
                && getSdk().DataModel.Venues.ParkingLot.getParkingLotType({ venueId: args.sdkVenue.id }) === 'PUBLIC';
        }

        postProcess() {
            $('.wmeph-pla-lot-type-btn').click((evt: any) => {
                const lotType = $(evt.currentTarget).data('lot-type');
                const categoryAttrClone = JSON.parse(JSON.stringify(this.args.venue.attributes?.categoryAttributes || {}));
                categoryAttrClone.PARKING_LOT.parkingType = lotType;
                UPDATED_FIELDS.lotType.updated = true;
                addUpdateAction(this.args.venue, { categoryAttributes: categoryAttrClone }, null, true);
            });
        }
    },
    PlaNameMissing: class extends FlagBase {
        static defaultSeverity = SEVERITY.BLUE;
        static get defaultMessage() { return `Name is missing. ${(USER.rank ?? 0) < 3 ? 'Request an R3+ lock' : 'Lock to 3+'} to confirm unnamed parking lot.`; }
        get noLock() { return true; }

        static venueIsFlaggable(args: any) {
            return args.categories.includes(CAT.PARKING_LOT)
                && (!args.nameBase?.replace(/[^A-Za-z0-9]/g, '').length)
                && args.sdkVenue.lockRank < 2;
        }
    },
    PlaNameNonStandard: class extends WLFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Parking lot names typically contain words like "Parking", "Lot", and/or "Garage"';
        static WL_KEY = 'plaNameNonStandard';
        static defaultWLTooltip = 'Whitelist non-standard PLA name';

        static venueIsFlaggable(args: any) {
            if (!this.isWhitelisted(args) && args.categories.includes(CAT.PARKING_LOT)) {
                const name = args.sdkVenue.name;
                if (name) {
                    const state = args.sdkAddress?.state?.name;
                    const re = state === 'Quebec' ? /\b(parking|stationnement)\b/i : /\b((park -[ -]ride)|parking|lot|garage|ramp)\b/i;
                    if (!re.test(name)) {
                        return true;
                    }
                }
            }
            return false;
        }
    },
    IndianaLiquorStoreHours: class extends WLFlag {
        static defaultMessage = 'If this is a liquor store, check the hours. As of Feb 2018, liquor stores in Indiana are allowed '
            + 'to be open between noon and 8 pm on Sunday.';

        static WL_KEY = 'indianaLiquorStoreHours';
        static defaultWLTooltip = 'Whitelist Indiana liquor store hours';

        static venueIsFlaggable(args: any) {
            return !args.highlightOnly && !this.isWhitelisted(args)
                && !args.categories.includes(CAT.RESIDENCE_HOME)
                && args.sdkAddress?.state?.name === 'Indiana'
                && /\b(beers?|wines?|liquors?|spirits)\b/i.test(args.nameBase)
                && !args.openingHours.some((entry: any) => entry.days.includes(0));
        }
    },
    HoursOverlap: class extends FlagBase {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Overlapping hours of operation. Place might not save.';

        static venueIsFlaggable(args: any) {
            return args.hoursOverlap;
        }
    },
    UnmappedRegion: class extends WLFlag {
        static WL_KEY = 'unmappedRegion';
        static defaultWLTooltip = 'Whitelist unmapped category';
        static #regionsToFlagOther = ['HI', 'NER', 'NOR', 'NWR', 'PLN', 'ATR'];

        get noLock(): boolean {
            return Flag.UnmappedRegion.#getRareCategoryInfos(this.args)
                .some((categoryInfo: any) => (categoryInfo.id === CAT.OTHER
                    && Flag.UnmappedRegion.#regionsToFlagOther.includes(this.args.regionCode)
                    && !this.args.isLocked)
                        || !Flag.UnmappedRegion.isWhitelisted(this.args));
        }

        constructor(args: any) {
            let showWL = true;
            let severity: any = SEVERITY.GREEN;
            let message;
            const categoryNames: string[] = [];
            let addOtherMessage = false;

            Flag.UnmappedRegion.#getRareCategoryInfos(args)
                .forEach((categoryInfo: any) => {
                    if (categoryInfo.id === CAT.OTHER) {
                        if (Flag.UnmappedRegion.#regionsToFlagOther.includes(args.region) && !args.isLocked) {
                            addOtherMessage = true;
                            severity = Math.max(severity, SEVERITY.BLUE);
                            showWL = false;
                        }
                    } else {
                        if (Flag.UnmappedRegion.isWhitelisted(args)) {
                            showWL = false;
                            severity = Math.max(severity, SEVERITY.GREEN);
                        } else {
                            severity = SEVERITY.YELLOW;
                        }
                        if (!args.highlightOnly) categoryNames.push(categoryInfo.name);
                    }
                });
            if (!args.highlightOnly) {
                const messages = [];
                if (categoryNames.length === 1) {
                    messages.push(`The <b>${categoryNames[0]}</b> category is usually not mapped in this region.`);
                } else if (categoryNames.length > 1) {
                    messages.push(`These categories are usually not mapped in this region: ${categoryNames.map(name => `<b>${name}</b>`).join(', ')}`);
                }
                if (addOtherMessage) {
                    messages.push('The <b>Other</b> category should only be used if no other category applies. '
                        + 'Manually lock the place to override this flag.');
                }
                message = messages.join('<br><br>');
            }
            super();
            this.message = message || '';
            this.severity = severity;
            this.showWL = showWL;
        }

        static venueIsFlaggable(args: any) {
            return !args.categories.includes(CAT.REST_AREAS)
                && !!this.#getRareCategoryInfos(args).length;
        }

        static #getRareCategoryInfos(args: any) {
            return args.categories
                .map((cat: string) => args.pnhCategoryInfos.getById(cat))
                .filter((pnhCategoryInfo: any) => {
                    if (!pnhCategoryInfo) return false;
                    const rareLocalities = pnhCategoryInfo.rare;
                    if (rareLocalities.includes(args.state2L) || rareLocalities.includes(args.region) || rareLocalities.includes(args.countryCode)) {
                        if (pnhCategoryInfo.id === CAT.OTHER && this.#regionsToFlagOther.includes(args.region)) {
                            if (!args.isLocked) {
                                return true;
                            }
                        } else {
                            return true;
                        }
                    }
                    return false;
                });
        }
    },
    RestAreaName: class extends WLFlag {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Rest area name is out of spec. Use the Rest Area wiki button below to view formats.';
        static WL_KEY = 'restAreaName';
        static defaultWLTooltip = 'Whitelist rest area name';

        static venueIsFlaggable(args: any) {
            return args.countryCode === PNH_DATA.USA.countryCode && args.categories.includes(CAT.REST_AREAS)
                && !/^Rest Area.* - /.test(args.nameBase + (args.nameSuffix ?? ''));
        }
    },
    RestAreaNoTransportation: class extends ActionFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Rest areas should not use the Transportation category.';
        static defaultButtonText = 'Remove it?';

        static venueIsFlaggable(args: any) {
            return args.categories.includes(CAT.REST_AREAS)
                && args.categories.includes(CAT.TRANSPORTATION);
        }

        action() {
            const categories = this.args.categories.slice(); // create a copy
            const index = categories.indexOf(CAT.TRANSPORTATION);
            if (index > -1) {
                categories.splice(index, 1); // remove the category
                addUpdateAction(this.args.venue, { categories }, null, true);
            } else {
                harmonizePlaceGo(this.args.venue, 'harmonize');
            }
        }
    },
    RestAreaGas: class extends FlagBase {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Gas stations at Rest Areas should be separate area places.';

        static venueIsFlaggable(args: any) {
            return args.categories.includes(CAT.REST_AREAS) && args.categories.includes(CAT.GAS_STATION);
        }
    },
    RestAreaScenic: class extends WLActionFlag {
        static WL_KEY = 'restAreaScenic';
        static defaultWLTooltip = 'Whitelist place';
        static defaultMessage = 'Verify that the "Scenic Overlook" category is appropriate for this rest area. If not: ';
        static defaultButtonText = 'Remove it';
        static defaultButtonTooltip = 'Remove "Scenic Overlook" category.';

        static venueIsFlaggable(args: any) {
            return !this.isWhitelisted(args)
                && args.categories.includes(CAT.REST_AREAS)
                && args.categories.includes(CAT.SCENIC_LOOKOUT_VIEWPOINT);
        }

        action() {
            const categories = this.args.categories.slice(); // create a copy
            const index = categories.indexOf(CAT.SCENIC_LOOKOUT_VIEWPOINT);
            if (index > -1) {
                categories.splice(index, 1); // remove the category
                addUpdateAction(this.args.venue, { categories }, null, true);
            }
        }
    },
    RestAreaSpec: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.RED;
        static WL_KEY = 'restAreaSpec';
        static defaultWLTooltip = 'Whitelist place';
        static defaultMessage = 'Is this a rest area?';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Update with proper categories and services.';

        static venueIsFlaggable(args: any) {
            return !this.isWhitelisted(args)
                && !args.categories.includes(CAT.REST_AREAS)
                && (/rest (?:area|stop)|service plaza/i.test(args.nameBase));
        }

        action() {
            const categories = insertAtIndex(this.args.categories.slice(), CAT.REST_AREAS, 0);
            // make it 24/7
                const OpeningHour = require('Waze/Model/Objects/OpeningHour');
            const openingHours = [new OpeningHour({ days: [1, 2, 3, 4, 5, 6, 0], fromHour: '00:00', toHour: '00:00' })];
            addUpdateAction(this.args.venue, { categories, openingHours }, null, true);
        }
    },
    EVChargingStationWarning: class extends FlagBase {
        static defaultMessage = 'Please do not delete EV Charging Stations. Be sure you are completely up to date with the latest guidelines in '
            + '<a href="https://wazeopedia.waze.com/wiki/USA/Places/EV_charging_station" target="_blank">wazeopedia</a>.';

        static venueIsFlaggable(args: any) {
            return !args.highlightOnly && args.categories.includes(CAT.CHARGING_STATION);
        }
    },
    EVCSAltNameMissing: class extends ActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'Public and restricted EV charging stations should have an alternate name of "EV Charging Station"';
        static defaultButtonText = 'Add it';
        static defaultButtonTooltip = 'Add EVCS alternate name';

        static venueIsFlaggable(args: any) {
            const sdk = getSdk();
            const accessType = args.categories.includes(CAT.CHARGING_STATION) ? sdk.DataModel.Venues.ChargingStation.getChargersAccessType({ venueId: args.sdkVenue.id }) : null;
            return args.categories.includes(CAT.CHARGING_STATION)
                && !args.aliases.some((alias: string) => alias.toLowerCase() === 'ev charging station')
                && accessType !== 'PRIVATE'
                && !args.sdkVenue.name.toLowerCase().includes('(private)');
        }

        action() {
            let aliases = this.args.aliases.slice();
            aliases = insertAtIndex(aliases, 'EV Charging Station', 0);
            addUpdateAction(this.args.venue, { aliases }, null);
        }
    },
    EVCSPriceMissing: class extends FlagBase {
        static defaultSeverity = SEVERITY.BLUE;
        static get defaultMessage() {
            let msg = 'EVCS price: ';
            [['FREE', 'Free', 'Free'], ['FEE', 'Paid', 'Paid']].forEach(btnInfo => {
                msg += $('<button>', {
                    id: `wmeph_${btnInfo[0]}`,
                    class: 'wmeph-evcs-cost-type-btn btn btn-default btn-xs wmeph-btn',
                    title: btnInfo[2]
                })
                    .text(btnInfo[1])
                    .css({
                        padding: '3px',
                        height: '20px',
                        lineHeight: '0px',
                        marginRight: '2px',
                        marginBottom: '1px',
                        minWidth: '18px'
                    })
                    .prop('outerHTML');
            });
            return msg;
        }

        constructor() {
            super();
            this.noLock = true;
        }

        static venueIsFlaggable(args: any) {
            const sdk = getSdk();
            const costType = args.categories.includes(CAT.CHARGING_STATION) ? sdk.DataModel.Venues.ChargingStation.getCostType({ venueId: args.sdkVenue.id }) : null;
            return args.categories.includes(CAT.CHARGING_STATION)
                && (!costType || costType === 'COST_TYPE_UNSPECIFIED');
        }

        postProcess() {
            $('.wmeph-evcs-cost-type-btn').click((evt: any) => {
                const selectedValue = $(evt.currentTarget).attr('id').replace('wmeph_', '');
                let attrClone;
                if (this.args.venue.attributes.categoryAttributes) {
                    attrClone = JSON.parse(JSON.stringify(this.args.venue.attributes.categoryAttributes));
                } else {
                    attrClone = {};
                }
                attrClone.CHARGING_STATION ??= {};
                attrClone.CHARGING_STATION.costType = selectedValue;
                addUpdateAction(this.args.venue, { categoryAttributes: attrClone }, null, true);
                UPDATED_FIELDS.evCostType.updated = true;
            });
        }
    },
    GasMismatch: class extends WLFlag {
        static defaultSeverity = SEVERITY.RED;
        static WL_KEY = 'gasMismatch';
        static defaultWLTooltip = 'Whitelist gas brand / name mismatch';
        static defaultMessage = '<a href="https://wazeopedia.waze.com/wiki/USA/Places/Gas_station#Name" target="_blank" class="red">'
            + 'Gas brand should typically be included in the place name.</a>';

        static venueIsFlaggable(args: any) {
            // For gas stations, check to make sure brand exists somewhere in the place name.
            // Remove non - alphanumeric characters first, for more relaxed matching.
            if (args.categories[0] === CAT.GAS_STATION && args.brand) {
                const compressedName = (args.nameBase + args.nameSuffix).toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
                // Some brands may have more than one acceptable name, or the brand listed in WME doesn't match what we want to see in the name.
                // Ideally, this would be addressed in the PNH spreadsheet somehow, but for now hardcoding is the only option.
                const compressedBrands = [args.brand.toUpperCase().replace(/[^a-zA-Z0-9]/g, '')];
                if (args.brand === 'Diamond Gasoline') {
                    compressedBrands.push('DIAMONDOIL');
                } else if (args.brand === 'Murphy USA') {
                    compressedBrands.push('MURPHY');
                } else if (args.brand === 'Mercury Fuel') {
                    compressedBrands.push('MERCURY', 'MERCURYPRICECUTTER');
                } else if (args.brand === 'Carrollfuel') {
                    compressedBrands.push('CARROLLMOTORFUEL', 'CARROLLMOTORFUELS');
                }
                if (!compressedBrands.some(compressedBrand => compressedName.includes(compressedBrand))) {
                    return true;
                }
            }
            return false;
        }
    },
    GasUnbranded: class extends FlagBase {
        //  Unbranded is not used per wiki
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = '"Unbranded" should not be used for the station brand. Change to the correct brand or delete the brand.';

        static venueIsFlaggable(args: any) {
            return args.categories.includes(CAT.GAS_STATION)
                && args.brand === 'Unbranded';
        }
    },
    GasMkPrim: class extends ActionFlag {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Gas Station should be the primary category';
        static defaultButtonText = 'Fix';
        static defaultButtonTooltip = 'Make the Gas Station category the primary category.';

        static venueIsFlaggable(args: any) {
            return args.categories.indexOf(CAT.GAS_STATION) > 0;
        }

        action() {
            // Move Gas category to the first position
            const categories = insertAtIndex(this.args.categories.slice(), CAT.GAS_STATION, 0);
            addUpdateAction(this.args.venue, { categories }, null, true);
        }
    },
    IsThisAPilotTravelCenter: class extends ActionFlag {
        static defaultMessage = 'Is this a "Travel Center"?';
        static defaultButtonText = 'Yes';

        static venueIsFlaggable(args: any) {
            return !args.highlightOnly
                && args.state2L === 'TN'
                && args.nameBase.toLowerCase().trim() === 'pilot food mart';
        }

        action() {
            addUpdateAction(this.args.venue, { name: 'Pilot Travel Center' }, null, true);
        }
    },
    HotelMkPrim: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Hotel category is not first';
        static defaultButtonText = 'Fix';
        static defaultButtonTooltip = 'Make the Hotel category the primary category.';
        static WL_KEY = 'hotelMkPrim';
        static defaultWLTooltip = 'Whitelist hotel as secondary category';

        static venueIsFlaggable(args: any) {
            return args.priPNHPlaceCat === CAT.HOTEL
                && args.categories.indexOf(CAT.HOTEL) !== 0;
        }

        action() {
            // Insert/move Hotel category in the first position
            const categories = insertAtIndex(this.args.categories.slice(), CAT.HOTEL, 0);
            addUpdateAction(this.args.venue, { categories }, null, true);
        }
    },
    ChangeToPetVet: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Key words suggest this should be a Pet/Veterinarian category. Change?';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Change to Pet/Veterinarian Category';
        static WL_KEY = 'changeHMC2PetVet';
        static defaultWLTooltip = 'Whitelist Pet/Vet category';

        static venueIsFlaggable(args: any) {
            if (!this.isWhitelisted(args) && args.nameBase) {
                const testName = args.nameBase.toLowerCase().replace(/[^a-z]/g, ' ');
                const testNameWords = testName.split(' ');
                if ((args.categories.includes(CAT.HOSPITAL_URGENT_CARE) || args.categories.includes(CAT.DOCTOR_CLINIC))
                    && (containsAny(testNameWords, Pnh.ANIMAL_FULL_MATCH) || Pnh.ANIMAL_PART_MATCH.some(match => testName.includes(match)))) {
                    return true;
                }
            }
            return false;
        }

        action() {
            let updated = false;
            let categories = uniq(this.args.categories.slice());
            categories.forEach((cat, idx) => {
                if (cat === CAT.HOSPITAL_URGENT_CARE || cat === CAT.DOCTOR_CLINIC) {
                    categories[idx] = CAT.PET_STORE_VETERINARIAN_SERVICES;
                    updated = true;
                }
            });
            if (updated) {
                categories = uniq(categories);
            }
            addUpdateAction(this.args.venue, { categories }, null, true);
        }
    },
    NotASchool: class extends WLFlag {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Key words suggest this should not be School category.';
        static WL_KEY = 'changeSchool2Offices';
        static defaultWLTooltip = 'Whitelist School category';

        static venueIsFlaggable(args: any) {
            if (!this.isWhitelisted(args) && args.nameBase) {
                const testName = args.nameBase.toLowerCase().replace(/[^a-z]/g, ' ');
                const testNameWords = testName.split(' ');

                if (args.categories.includes(CAT.SCHOOL)
                    && (containsAny(testNameWords, Pnh.SCHOOL_FULL_MATCH) || Pnh.SCHOOL_PART_MATCH.some(match => testName.includes(match)))) {
                    return true;
                }
            }
            return false;
        }
    },
    PointNotArea: class extends WLActionFlag {
        static defaultButtonText = 'Change to point';
        static defaultButtonTooltip = 'Change to Point Place';
        static WL_KEY = 'pointNotArea';
        static defaultWLTooltip = 'Whitelist point (not area)';

        get message() {
            if (this.args.maxAreaSeverity === SEVERITY.RED) {
                return 'This category should be a point place.';
            }
            return 'This category is usually a point place, but can be an area in some cases. Verify if area is appropriate.';
        }

        constructor(args: any) {
            let severity;
            let showWL = true;

            const lockRank = args.venue.attributes?.lockRank ?? args.sdkVenue?.lockRank ?? 0;
            const makeGreen = Flag.PointNotArea.isWhitelisted(args)
                || lockRank >= args.defaultLockLevel;

            if (makeGreen) {
                showWL = false;
                severity = SEVERITY.GREEN;
            } else {
                severity = args.maxAreaSeverity;
            }

            super();
            this.showWL = showWL;
            this.severity = severity;
        }

        static venueIsFlaggable(args: any) {
            const isPoint = typeof args.venue.isPoint === 'function' ? args.venue.isPoint() : args.sdkVenue?.geometry?.type === 'Point';
            return !isPoint
                && (args.categories.includes(CAT.RESIDENCE_HOME) || (args.maxAreaSeverity > SEVERITY.BLUE && !args.categories.includes(CAT.REST_AREAS)));
        }

        action() {
            if (this.args.venue.isResidential()) {
                // 7/1/2022 - Not sure if this is necessary? Can residence be converted to area? Either way, updateFeatureGeometry function no longer works.
                // const centroid = venue.geometry.getCentroid();
                // updateFeatureGeometry(venue, new OpenLayers.Geometry.Point(centroid.x, centroid.y));
            } else {
                $('wz-checkable-chip.geometry-type-control-point').click();
            }
            harmonizePlaceGo(this.args.venue, 'harmonize'); // Rerun the script to update fields and lock
        }
    },
    AreaNotPoint: class extends WLActionFlag {
        static defaultButtonText = 'Change to area';
        static defaultButtonTooltip = 'Change to Area Place';
        static WL_KEY = 'areaNotPoint';
        static defaultWLTooltip = 'Whitelist area (not point)';
        static #collegeAbbrRegExps: RegExp[];

        get message() {
            if (this.args.maxPointSeverity === SEVERITY.RED) {
                return 'This category should be an area place.';
            }
            return 'This category is usually an area place, but can be a point in some cases. Verify if point is appropriate.';
        }

        constructor(args: any) {
            let severity;
            let showWL = true;

            const lockRank = args.venue.attributes?.lockRank ?? args.sdkVenue?.lockRank ?? 0;
            const makeGreen = Flag.AreaNotPoint.isWhitelisted(args)
                || lockRank >= args.defaultLockLevel
                || (args.maxPointSeverity === SEVERITY.BLUE && Flag.AreaNotPoint.#hasCollegeInName(args.nameBase));

            if (makeGreen) {
                showWL = false;
                severity = SEVERITY.GREEN;
            } else {
                severity = args.maxPointSeverity;
            }

            super();
            this.severity = severity;
            this.showWL = showWL;
        }

        static venueIsFlaggable(args: any) {
            const isPoint = typeof args.venue.isPoint === 'function' ? args.venue.isPoint() : args.sdkVenue?.geometry?.type === 'Point';
            return isPoint
                && (args.maxPointSeverity > SEVERITY.GREEN || args.categories.includes(CAT.REST_AREAS));
        }

        static #hasCollegeInName(name: string) {
            if (!this.#collegeAbbrRegExps) {
                this.#collegeAbbrRegExps = COLLEGE_ABBREVIATIONS.map(abbr => new RegExp(`\\b${abbr}\\b`, 'g'));
            }
            return this.#collegeAbbrRegExps.some((re: RegExp) => re.test(name));
        }

        action() {
            const { venue } = this.args;
                const UpdateFeatureGeometry = require('Waze/Action/UpdateFeatureGeometry');
            W.model.actionManager.add(new UpdateFeatureGeometry(venue, venue.model.venues, venue.getOLGeometry(), venue.getPolygonGeometry()));
            harmonizePlaceGo(venue, 'harmonize');
        }
    },
    HnMissing: class extends WLActionFlag {
        static defaultButtonText = 'Add';
        static defaultButtonTooltip = 'Add HN to place';
        static WL_KEY = 'HNWL';
        static defaultWLTooltip = 'Whitelist empty HN';
        static #CATEGORIES_TO_IGNORE = [CAT.BRIDGE, CAT.ISLAND, CAT.FOREST_GROVE, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL,
            CAT.DAM, CAT.TUNNEL, CAT.JUNCTION_INTERCHANGE];

        static #TEXTBOX_ID = 'WMEPH-HNAdd';
        noBannerAssemble = true;

        get message() {
            let msg = `No HN: <input type="text" id="${Flag.HnMissing.#TEXTBOX_ID}" autocomplete="off" `
            + 'style="font-size:0.85em;width:100px;padding-left:2px;color:#000;" > ';

            const lockRank = this.args.venue.attributes?.lockRank ?? this.args.sdkVenue?.lockRank ?? 0;
            if (this.args.categories.includes(CAT.PARKING_LOT) && lockRank < 2) {
                if ((USER.rank ?? 0) < 3) {
                    msg += 'Request an R3+ lock to confirm no HN.';
                } else {
                    msg += 'Lock to R3+ to confirm no HN.';
                }
            }
            return msg;
        }

        constructor(args: any) {
            let showWL = true;
            let severity: any = SEVERITY.RED;
            let noLock = false;
            const lockRank = args.venue.attributes?.lockRank ?? args.sdkVenue?.lockRank ?? 0;
            if (args.state2L === 'PR' || args.categories[0] === CAT.SCENIC_LOOKOUT_VIEWPOINT) {
                severity = SEVERITY.GREEN;
                showWL = false;
            } else if (args.categories.includes(CAT.PARKING_LOT)) {
                showWL = false;
                if (lockRank < 2) {
                    noLock = true;
                    severity = SEVERITY.BLUE;
                } else {
                    severity = SEVERITY.GREEN;
                }
            } else if (Flag.HnMissing.isWhitelisted(args)) {
                severity = SEVERITY.GREEN;
                showWL = false;
            } else {
                noLock = true;
            }

            super();
            this.severity = severity;
            this.showWL = showWL;
            this.noLock = noLock;
        }

        static venueIsFlaggable(args: any) {
            return args.hasStreet
                && (!args.currentHN?.replace(/\D/g, ''))
                && !this.#CATEGORIES_TO_IGNORE.includes(args.categories[0])
                && !args.categories.includes(CAT.REST_AREAS);
        }

        static #getTextbox() {
            return $(`#${Flag.HnMissing.#TEXTBOX_ID}`);
        }

        action() {
            const newHN = $('#WMEPH-HNAdd').val().replace(/\s+/g, '');
            logDev(newHN);
            const hnTemp = newHN.replace(/[^\d]/g, '');
            const hnTempDash = newHN.replace(/[^\d-]/g, '');
            if (hnTemp > 0 && hnTemp < 1000000) {
                const pendingUpdates = { sdkUpdates: {}, legacyActions: [] };
                addUpdateAction(this.args.venue, { houseNumber: hnTempDash }, pendingUpdates);
                harmonizePlaceGo(this.args.venue, 'harmonize', pendingUpdates); // Rerun the script to update fields and lock
                UPDATED_FIELDS.address.updated = true;
            } else {
                Flag.HnMissing.#getTextbox().css({ backgroundColor: '#FDD' }).attr('title', 'Must be a number between 0 and 1000000');
            }
        }

        postProcess() {
            // If pressing enter in the HN entry box, add the HN
            const textbox = Flag.HnMissing.#getTextbox();
            textbox.keyup((evt: any) => {
                if (evt.keyCode === 13 && textbox.val()) {
                    this.action();
                }
            });
        }
    },
    HnTooManyDigits: class extends WLFlag {
        static defaultMessage = 'HN contains more than 6 digits. Please verify.';
        static defaultSeverity = SEVERITY.YELLOW;
        static WL_KEY = 'hnTooManyDigits';
        static defaultWLTooltip = 'Whitelist long HN';

        static venueIsFlaggable(args: any) {
            return !this.isWhitelisted(args)
                && args.currentHN?.replace(/[^0-9]/g, '').length > 6;
        }
    },
    HNRange: class extends WLFlag {
        static defaultMessage = 'House number seems out of range for the street name. Verify.';
        static defaultSeverity = SEVERITY.YELLOW;
        static WL_KEY = 'HNRange';
        static defaultWLTooltip = 'Whitelist HN range';

        static venueIsFlaggable(args: any) {
            if (!this.isWhitelisted(args) && _dupeHNRangeList.length > 3) {
                let dhnix;
                const dupeHNRangeListSorted = [];
                sortWithIndex(_dupeHNRangeDistList);
                for (dhnix = 0; dhnix < _dupeHNRangeList.length; dhnix++) {
                    dupeHNRangeListSorted.push(_dupeHNRangeList[(_dupeHNRangeDistList as any).sortIndices[dhnix]]);
                }
                // Calculate HN/distance ratio with other venues
                // var sumHNRatio = 0;
                const arrayHNRatio = [];
                for (dhnix = 0; dhnix < dupeHNRangeListSorted.length; dhnix++) {
                    arrayHNRatio.push(Math.abs((parseInt(args.currentHN, 10) - dupeHNRangeListSorted[dhnix]) / _dupeHNRangeDistList[dhnix]));
                }
                sortWithIndex(arrayHNRatio);
                // Examine either the median or the 8th index if length is >16
                const arrayHNRatioCheckIX = Math.min(Math.round(arrayHNRatio.length / 2), 8);
                if (arrayHNRatio[arrayHNRatioCheckIX] > 1.4) {
                    // show stats if HN out of range
                    logDev(`HNs: ${dupeHNRangeListSorted}`);
                    logDev(`Distances: ${_dupeHNRangeDistList}`);
                    logDev(`arrayHNRatio: ${arrayHNRatio}`);
                    logDev(`HN Ratio Score: ${arrayHNRatio[Math.round(arrayHNRatio.length / 2)]}`);
                    return true;
                }
            }
            return false;
        }
    },
    StreetMissing: class extends ActionFlag {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'No street:';
        static defaultButtonText = 'Edit address';
        static defaultButtonTooltip = 'Edit address to add street.';

        constructor(args: any) {
            super();
            if (args.categories[0] === CAT.SCENIC_LOOKOUT_VIEWPOINT) {
                this.severity = SEVERITY.BLUE;
            }
        }

        static venueIsFlaggable(args: any) {
            const isStreetEmpty = !args.addr.street || args.addr.street.attributes?.isEmpty || (typeof args.addr.street.isEmpty === 'function' ? args.addr.street.isEmpty() : args.addr.street.isEmpty);
            const isCityEmpty = !args.addr.city || args.addr.city.attributes?.isEmpty || (typeof args.addr.city.isEmpty === 'function' ? args.addr.city.isEmpty() : args.addr.city.isEmpty);
            return !isCityEmpty
                && isStreetEmpty
                && ![CAT.BRIDGE, CAT.ISLAND, CAT.FOREST_GROVE, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL,
                    CAT.DAM, CAT.TUNNEL, CAT.JUNCTION_INTERCHANGE].includes(args.categories[0])
                && !args.categories.includes(CAT.REST_AREAS);
        }

        // eslint-disable-next-line class-methods-use-this
        action() {
            clickGeneralTab();
            $('.venue .full-address').click();
            setTimeout(() => {
                if ($('.empty-street').prop('checked')) {
                    $('.empty-street').click();
                }
                setTimeout(() => {
                    const elem = document
                        .querySelector('#venue-edit-general > div:nth-child(1) > div > div > wz-card > form > div:nth-child(2) > div > wz-autocomplete')
                        ?.shadowRoot?.querySelector('#text-input')
                        ?.shadowRoot?.querySelector('#id') as HTMLElement;
                    if (elem) elem.focus();
                }, 100);
            }, 100);
        }
    },
    CityMissing: class extends ActionFlag {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'No city:';
        static defaultButtonText = 'Edit address';
        static defaultButtonTooltip = 'Edit address to add city.';

        constructor(args: any) {
            super();
            if (args.categories.includes(CAT.RESIDENCE_HOME) && args.highlightOnly) {
                this.severity = SEVERITY.BLUE;
            }
        }

        static venueIsFlaggable(args: any) {
            const isCityEmpty = !args.addr.city || args.addr.city.attributes?.isEmpty || (typeof args.addr.city.isEmpty === 'function' ? args.addr.city.isEmpty() : args.addr.city.isEmpty);
            return isCityEmpty
                && ![CAT.BRIDGE, CAT.ISLAND, CAT.FOREST_GROVE, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL,
                    CAT.DAM, CAT.TUNNEL, CAT.JUNCTION_INTERCHANGE].includes(args.categories[0])
                && !args.categories.includes(CAT.REST_AREAS);
        }

        // eslint-disable-next-line class-methods-use-this
        action() {
            clickGeneralTab();
            $('.venue .full-address').click();
            setTimeout(() => {
                if ($('.empty-city').prop('checked')) {
                    $('.empty-city').click();
                }
                setTimeout(() => {
                    const elem = document
                        .querySelector('#venue-edit-general > div:nth-child(1) > div > div > wz-card > form > div:nth-child(4) > wz-autocomplete')
                        ?.shadowRoot?.querySelector('#text-input')
                        ?.shadowRoot?.querySelector('#id') as HTMLElement;
                    if (elem) elem.focus();
                }, 100);
            }, 100);

            $('.city-name').focus();
        }
    },
    BankType1: class extends FlagBase {
        static defaultSeverity = SEVERITY.RED;
        static defaultMessage = 'Clarify the type of bank: the name has ATM but the primary category is Offices';

        static venueIsFlaggable(args: any) {
            return (!args.pnhNameRegMatch || (args.pnhNameRegMatch && args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank))
                && args.categories[0] === CAT.OFFICES
                && /\batm\b/i.test(args.nameBase);
        }
    },
    BankBranch: class extends ActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'Is this a bank branch office? ';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Is this a bank branch?';

        static venueIsFlaggable(args: any) {
            let flaggable = false;
            if (!args.priPNHPlaceCat || (args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank)) {
                const ixBank = args.categories.indexOf(CAT.BANK_FINANCIAL);
                const ixATM = args.categories.indexOf(CAT.ATM);
                const ixOffices = args.categories.indexOf(CAT.OFFICES);

                if (/\batm\b/ig.test(args.nameBase)) {
                    flaggable = ixOffices === 0
                        || (ixBank === -1 && ixATM === -1)
                        || (ixATM === 0 && ixBank > 0)
                        || (ixBank > -1);
                } else if (ixBank > -1 || ixATM > -1) {
                    flaggable = ixOffices === 0
                        || (ixATM === 0 && ixBank === -1)
                        || (ixBank > 0 && ixATM > 0);
                } else if (args.priPNHPlaceCat) {
                    flaggable = ixBank === -1 && !(/\bcorporate offices\b/i.test(args.nameSuffix) && ixOffices === 0);
                }
            }
            return flaggable;
        }

        action() {
            const newAttributes: any = {};

            const originalCategories = this.args.categories.slice();
            const newCategories = insertAtIndex(originalCategories, [CAT.BANK_FINANCIAL, CAT.ATM], 0); // Change to bank and atm cats
            if (!arraysAreEqual(originalCategories, newCategories)) {
                newAttributes.categories = newCategories;
            }

            // strip ATM from name if present
            const originalName = this.args.sdkVenue?.name ?? this.args.venue.name;
            const newName = originalName.replace(/[- (]*ATM[- )]*/ig, ' ').replace(/^ /g, '').replace(/ $/g, '');
            if (originalName !== newName) {
                newAttributes.name = newName;
            }

            addUpdateAction(this.args.venue, newAttributes, null, true);
        }
    },
    StandaloneATM: class extends ActionFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Or is this a standalone ATM? ';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Is this a standalone ATM with no bank branch?';

        static venueIsFlaggable(args: any) {
            let flaggable = false;
            if (!args.priPNHPlaceCat || (args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank)) {
                const ixBank = args.categories.indexOf(CAT.BANK_FINANCIAL);
                const ixATM = args.categories.indexOf(CAT.ATM);
                const ixOffices = args.categories.indexOf(CAT.OFFICES);

                if (/\batm\b/ig.test(args.nameBase)) {
                    flaggable = ixOffices === 0
                        || (ixBank === -1 && ixATM === -1)
                        || (ixBank > -1);
                } else if (ixBank > -1 || ixATM > -1) {
                    flaggable = ixOffices === 0
                        || (ixATM === 0 && ixBank === -1)
                        || (ixBank > 0 && ixATM > 0);
                } else {
                    flaggable = args.priPNHPlaceCat && !(/\bcorporate offices\b/i.test(args.nameSuffix) && ixOffices === 0);
                }
            }
            return flaggable;
        }

        action() {
            const newAttributes: any = {};

            const originalName = this.args.sdkVenue?.name ?? this.args.venue.name;
            if (!/\bATM\b/i.test(originalName)) {
                newAttributes.name = `${originalName} ATM`;
            }

            const atmCategory = [CAT.ATM];
            if (!arraysAreEqual(this.args.categories.slice(), atmCategory)) {
                newAttributes.categories = atmCategory; // Change to ATM only
            }

            addUpdateAction(this.args.venue, newAttributes, null, true);
        }
    },
    BankCorporate: class extends ActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'Or is this the bank\'s corporate offices?';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Is this the bank\'s corporate offices?';

        static venueIsFlaggable(args: any) {
            let flaggable = false;
            if (!args.priPNHPlaceCat) {
                flaggable = (/\batm\b/ig.test(args.nameBase) && args.categories.indexOf(CAT.OFFICES) === 0);
            } else if (args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank) {
                flaggable = !containsAny(args.categories, [CAT.BANK_FINANCIAL, CAT.ATM])
                    && !/\bcorporate offices\b/i.test(args.nameSuffix);
            }
            return flaggable;
        }

        action() {
            const newAttributes: any = {};

            const officesCategory = [CAT.OFFICES];
            if (!arraysAreEqual(this.args.categories.slice(), officesCategory)) {
                newAttributes.categories = officesCategory;
            }

            // strip ATM from name if present
            const originalName = this.args.sdkVenue?.name ?? this.args.venue.name;
            let newName = originalName
                .replace(/[- (]*atm[- )]*/ig, ' ')
                .replace(/^ /g, '')
                .replace(/ $/g, '')
                .replace(/ {2,}/g, ' ')
                .replace(/\s*-\s*corporate\s*offices\s*$/i, '');
            const suffix = ' - Corporate Offices';
            if (!newName.endsWith(suffix)) newName += suffix;
            if (originalName !== newName) {
                newAttributes.name = newName;
            }

            addUpdateAction(this.args.venue, newAttributes, null, true);
        }
    },
    CatPostOffice: class extends FlagBase {
        static defaultMessage = `The Post Office category is reserved for certain USPS locations. Please be sure to follow <a href="${
            URLS.uspsWiki}" style="color:#3a3a3a;" target="_blank">the guidelines</a>.`;

        static venueIsFlaggable(args: any) {
            return !args.highlightOnly && args.isUspsPostOffice;
        }
    },
    IgnEdited: class extends FlagBase {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Last edited by an IGN editor';

        static venueIsFlaggable(args: any) {
            return !args.categories.includes(CAT.RESIDENCE_HOME)
                && args.sdkVenue.modificationData?.updatedBy
                && /^ign_/i.test(args.sdkVenue.modificationData.updatedBy);
        }
    },
    WazeBot: class extends ActionFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Edited last by an automated process. Please verify information is correct.';
        static defaultButtonText = 'Nudge';
        static defaultButtonTooltip = 'If no other properties need to be updated, click to nudge the place (force an edit).';
        static #botIds = [105774162, 361008095, 338475699, -1, 107668852];
        static #botNames = [/^waze-maint/i, /^waze3rdparty$/i, /^WazeParking1$/i, /^admin$/i, /^avsus$/i];

        static venueIsFlaggable(args: any) {
            const isUpdated = typeof args.venue.isUpdated === 'function' ? args.venue.isUpdated() : !args.sdkVenue?.isUnchanged;
            let flaggable = !isUpdated && !args.categories.includes(CAT.RESIDENCE_HOME);
            if (flaggable) {
                const lastUpdatedByName = args.sdkVenue.modificationData?.updatedBy ?? args.sdkVenue.modificationData?.createdBy;
                flaggable = lastUpdatedByName ? this.#botNames.some(botName => botName.test(lastUpdatedByName)) : false;
            }
            return flaggable;
        }

        action() {
            nudgeVenue(this.args.venue);
            harmonizePlaceGo(this.args.venue, 'harmonize');
        }
    },
    ParentCategory: class extends WLFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static WL_KEY = 'parentCategory';
        static defaultWLTooltip = 'Whitelist parent Category';

        get message() {
            let msg;
            const badCatInfos = this.args.categories
                .filter((category: string) => Flag.ParentCategory.categoryIsDisallowedParent(category, this.args))
                .map((category: string) => this.args.pnhCategoryInfos.getById(category));
            if (badCatInfos.length === 1) {
                msg = `The <b>${badCatInfos[0].name}</b> parent category is usually not mapped in this region.`;
            } else {
                msg = 'These parent categories are usually not mapped in this region: ';
                msg += badCatInfos.map((catInfo: any) => `<b>${catInfo.name}</b>`).join(', ');
            }
            return msg;
        }

        static categoryIsDisallowedParent(category: string, args: any) {
            const pnhCategoryInfo = args.pnhCategoryInfos.getById(category);
            if (!pnhCategoryInfo) return false;
            const localities = pnhCategoryInfo.disallowedParent;
            return localities.includes(args.state2L) || localities.includes(args.region) || localities.includes(args.countryCode);
        }

        static venueIsFlaggable(args: any) {
            return args.categories.some((category: string) => this.categoryIsDisallowedParent(category, args));
        }
    },
    CheckDescription: class extends FlagBase {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Description field already contained info; PNH description was added in front of existing. Check for inconsistency or duplicate info.';

        static venueIsFlaggable(args: any) {
            return args.descriptionInserted;
        }
    },
    Overlapping: class extends FlagBase {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Place points are stacked up.';
    },
    SuspectDesc: class extends WLFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Description field might contain copyrighted info.';
        static WL_KEY = 'suspectDesc';
        static defaultWLTooltip = 'Whitelist description';

        static venueIsFlaggable(args: any) {
            return !args.sdkVenue.isResidential
                && args.totalSeverity < SEVERITY.RED
                && !this.isWhitelisted(args)
                && /(google|yelp)/i.test(args.description);
        }
    },
    ResiTypeName: class extends WLFlag {
        static defaultMessage = 'The place name suggests a residential place or personalized place of work.  Please verify.';
        static WL_KEY = 'resiTypeName';
        static defaultWLTooltip = 'Whitelist Residential-type name';

        constructor(likelyResidential: boolean) {
            super();
            if (likelyResidential) this.severity = SEVERITY.YELLOW;
        }

        static #likelyResidentialName(alphaName: string) {
            return /^((my|mi|moms|dads)?\s*(home|work|office|casa|house))|(mom|dad)$/i.test(alphaName);
        }

        static #possiblyResidentialName(alphaName: string, categories: string[]) {
            return /('?s|my)\s+(house|home|work)/i.test(alphaName)
                && !containsAny(categories, [CAT.RESTAURANT, CAT.DESSERT, CAT.BAR]);
        }

        static #isPreflaggable(args: any) {
            return !args.categories.includes(CAT.RESIDENCE_HOME)
                && !args.pnhNameRegMatch
                && !this.isWhitelisted(args)
                && args.totalSeverity < SEVERITY.RED;
        }

        static #venueIsFlaggable(preflaggable: boolean, likelyResidential: boolean, alphaName: string, categories: string[]) {
            return preflaggable
                && (likelyResidential || this.#possiblyResidentialName(alphaName, categories));
        }

        static eval(args: any): any {
            const preflaggable = this.#isPreflaggable(args);
            if (preflaggable && args.nameBase) {
                const alphaName = args.nameBase.replace(/[^A-Z ]/i, ''); // remove non-alpha characters
                const likelyResidential = this.#likelyResidentialName(alphaName);
                if (this.#venueIsFlaggable(preflaggable, likelyResidential, alphaName, args.categories)) return new this(likelyResidential);
            }
            return null;
        }
    },
    PhoneInvalid: class extends FlagBase {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Phone # is invalid.';

        static venueIsFlaggable(args: any) {
            if (!args.phone) return false;
            const normalizedPhone = normalizePhone(args.phone, args.outputPhoneFormat);
            return (args.highlightOnly && normalizedPhone !== args.phone)
                || (!args.highlightOnly && normalizedPhone === BAD_PHONE);
        }
    },
    UrlMismatch: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'Existing URL doesn\'t match the suggested PNH URL. Use the Website button below to verify the existing URL is valid. If not:';
        static defaultButtonText = 'Use PNH URL';
        static defaultButtonTooltip = 'Change URL to the PNH standard';
        static WL_KEY = 'longURL';
        static defaultWLTooltip = 'Whitelist existing URL';

        static venueIsFlaggable(args: any) {
            // for cases where there is an existing URL in the WME place, and there is a PNH url on queue:
            return !isNullOrWhitespace(args.url)
                && !isNullOrWhitespace(args.pnhUrl)
                && args.url !== args.pnhUrl
                && args.pnhUrl !== BAD_URL;
        }

        action() {
            if (!isNullOrWhitespace(this.args.pnhUrl)) {
                addUpdateAction(this.args.venue, { url: this.args.pnhUrl }, null, true);
            } else {
                WazeWrap.Alerts.confirm(
                    SCRIPT_NAME,
                    'URL Matching Error!<br>Click OK to report this error',
                    () => { reportError(); },
                    () => { }
                );
            }
        }
    },
    UrlAnalytics: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'URL contains analytics queries. Strip them?';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Strip analytics queries from the URL';
        static WL_KEY = 'urlAnalytics';
        static defaultWLTooltip = 'Whitelist existing URL';
        static URL_ANALYTICS_REGEX = /(?<=&|\?)(utm_|y_|(wtextnd)?source=|cmpid=|cid=|otppartnerid=|campaignid=|ref=|cmp=).*?(&|$)/ig;

        static venueIsFlaggable(args: any) {
            return !isNullOrWhitespace(args.url)
                && args.url !== args.pnhUrl
                && Flag.UrlAnalytics.URL_ANALYTICS_REGEX.test(args.url);
        }

        action() {
            const url = Flag.UrlAnalytics.#stripUrlAnalyticsQueries(this.args.url);
            addUpdateAction(this.args.venue, { url }, null, true);
        }

        static #stripUrlAnalyticsQueries(url: string) {
            // utm_* queries are generally used by Google.
            // y_* queries are used by yext.
            url = url.replace(Flag.UrlAnalytics.URL_ANALYTICS_REGEX, '');

            // Strip the ending ? if all queries were removed.
            url = url.replace(/\?$/, '');

            return url;
        }
    },
    GasNoBrand: class extends FlagBase {
        static defaultSeverity = SEVERITY.BLUE;

        get message() { return `Lock to L${this.args.levelToLock + 1}+ to verify no gas brand.`; }

        constructor() {
            super();
            this.noLock = true;
        }

        static venueIsFlaggable(args: any) {
            // If gas station is missing brand, don't flag if place is locked as high as user can lock it.
            const lockRank = args.venue.attributes?.lockRank ?? args.sdkVenue?.lockRank ?? 0;
            return args.categories.includes(CAT.GAS_STATION)
                && !args.brand
                && lockRank < args.levelToLock;
        }
    },
    SubFuel: class extends WLFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'Make sure this place is for the gas station itself and not the main store building. Otherwise undo and check the categories.';
        static WL_KEY = 'subFuel';
        static defaultWLTooltip = 'Whitelist no gas brand';

        static venueIsFlaggable(args: any) {
            return !this.isWhitelisted(args)
                && args.pnhMatch.subFuel
                && !/\bgas(oline)?\b/i.test(args.sdkVenue.name)
                && !/\bfuel\b/i.test(args.sdkVenue.name);
        }
    },
    FormatUSPS: class extends FlagBase {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = `Name the post office according to this region's <a href="${
            URLS.uspsWiki}" style="color:#3232e6" target="_blank">standards for USPS post offices</a>`;

        static venueIsFlaggable(args: any) {
            return args.isUspsPostOffice
                && !this.isNameOk(this.getCleanNameParts(args.nameBase, args.nameSuffix).join(''), args.state2L, args.sdkAddress);
        }

        static getCleanNameParts(name: string, nameSuffix: string | null) {
            name = name.trimLeft().replace(/ {2,}/, ' ');
            if (nameSuffix) {
                nameSuffix = nameSuffix.trimRight().replace(/\bvpo\b/i, 'VPO').replace(/\bcpu\b/i, 'CPU').replace(/ {2,}/, ' ');
            }
            return [name, nameSuffix || ''];
        }

        static isNameOk(name: string, state2L: string, sdkAddress: any) {
            return this.#getPostOfficeRegEx(state2L, sdkAddress).test(name);
        }

        static #getPostOfficeRegEx(state2L: string, sdkAddress: any) {
            return state2L === 'KY'
                || (state2L === 'NY' && ['Queens', 'Bronx', 'Manhattan', 'Brooklyn', 'Staten Island'].includes(sdkAddress?.city?.name))
                ? /^post office \d{5}( -–?(?: [a-z0-9]+){1,})?$/i
                : /^post office -–?(?: [a-z0-9]+){1,}$/i;
        }
    },
    MissingUSPSAlt: class extends ActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'USPS post offices must have an alternate name of "USPS".';
        static defaultButtonText = 'Add it';
        static defaultButtonTooltip = 'Add USPS alternate name';

        static venueIsFlaggable(args: any) {
            return args.isUspsPostOffice
                && !args.aliases.some((alias: string) => alias.toUpperCase() === 'USPS');
        }

        action() {
            const aliases = this.args.venue.attributes.aliases.slice();
            if (!aliases.some((alias: string) => alias === 'USPS')) {
                aliases.push('USPS');
                addUpdateAction(this.args.venue, { aliases }, null, true);
            } else {
                harmonizePlaceGo(this.args.venue, 'harmonize');
            }
        }
    },
    MissingUSPSZipAlt: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = `No <a href="${URLS.uspsWiki}" style="color:#3232e6;" target="_blank">ZIP code alt name</a>: <input type="text" \
id="WMEPH-zipAltNameAdd"autocomplete="off" style="font-size:0.85em;width:65px;padding-left:2px;color:#000;" title="Enter the ZIP code and click Add">`;

        static defaultButtonText = 'Add';
        static WL_KEY = 'missingUSPSZipAlt';
        static defaultWLTooltip = 'Whitelist missing USPS zip alt name';
        static #TEXTBOX_ID = 'WMEPH-zipAltNameAdd';
        noBannerAssemble = true;

        static venueIsFlaggable(args: any) {
            return args.isUspsPostOffice
                && !args.aliases.some((alias: string) => /\d{5}/.test(alias));
        }

        action() {
            const $input = $(`input#${Flag.MissingUSPSZipAlt.#TEXTBOX_ID}`);
            const zip = $input.val().trim();
            if (zip) {
                if (/^\d{5}/.test(zip)) {
                    const aliases = [...this.args.venue.attributes.aliases];
                    // Make sure zip hasn't already been added.
                    if (!aliases.includes(zip)) {
                        aliases.push(zip);
                        addUpdateAction(this.args.venue, { aliases }, null, true);
                    } else {
                        $input.css({ backgroundColor: '#FDD' }).attr('title', 'Zip code alt name already exists');
                    }
                } else {
                    $input.css({ backgroundColor: '#FDD' }).attr('title', 'Zip code format error');
                }
            }
        }

        postProcess() {
            // If pressing enter in the USPS zip code alt entry box...
            const $textbox = $(`#${Flag.MissingUSPSZipAlt.#TEXTBOX_ID}`);
            $textbox.keyup((evt: any) => {
                if (evt.keyCode === 13 && $(evt.currentTarget).val() !== '') {
                    $('#WMEPH_MissingUSPSZipAlt').click();
                }
            });

            // Prefill zip code text box
            const zipMatch = (this.args.nameBase + (this.args.nameSuffix ?? '')).match(/\d{5}/);
            if (zipMatch) {
                $textbox.val(zipMatch[0]);
            }
        }
    },
    MissingUSPSDescription: class extends WLFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = `The first line of the description for a <a href="${
            URLS.uspsWiki}" style="color:#3232e6" target="_blank">USPS post office</a> must be CITY, STATE(2-letter) ZIP, e.g. "Lexington, KY 40511"`;

        static WL_KEY = 'missingUSPSDescription';
        static defaultWLTooltip = 'Whitelist missing USPS address line in description';

        static venueIsFlaggable(args: any) {
            if (args.isUspsPostOffice) {
                const lines = args.description?.split('\n');
                return !lines?.length
                    || !/^.{2,}, [A-Z]{2}\s{1,2}\d{5}$/.test(lines[0]);
            }
            return false;
        }
    },
    CatHotel: class extends FlagBase {
        constructor(args: any) {
            const pnhName = args.pnhMatch.name;
            super();
            this.message = `Check hotel website for any name localization (e.g. ${pnhName} - Tampa Airport).`;
        }

        static venueIsFlaggable(args: any) {
            return args.priPNHPlaceCat === CAT.HOTEL
                && (args.nameBase + (args.nameSuffix || '')).toUpperCase() === args.pnhMatch.name.toUpperCase();
        }
    },
    LocalizedName: class extends WLFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static WL_KEY = 'localizedName';
        static defaultWLTooltip = 'Whitelist localization';

        get message() { return this.args.pnhMatch.displaynote || 'Place needs localization information'; }

        static venueIsFlaggable(args: any) {
            return args.pnhMatch.localizationRegEx
                && !args.pnhMatch.localizationRegEx.test(args.nameBase + (args.nameSuffix || ''));
        }
    },
    SpecCaseMessage: class extends FlagBase {
        static #teslaSC = /tesla supercharger/i;
        static #teslaDC = /tesla destination charger/i;
        static #rivianAN = /<b>rivian adventure network<\/b> charger/i;
        static #rivianW = /<b>rivian waypoints<\/b> charger/i;

        constructor(args: any) {
            let message = args.pnhMatch.displaynote;

            // 3/23/2023 - This is a temporary solution to add a disambiguator for Tesla & Rivian chargers.
            let isRivian = false;
            const isTesla = Flag.SpecCaseMessage.#teslaSC.test(message) && Flag.SpecCaseMessage.#teslaDC.test(message);
            if (isTesla) {
                message = message.replace(
                    Flag.SpecCaseMessage.#teslaSC,
                    '<button id="wmeph-tesla-supercharger" class="btn wmeph-btn">Tesla SuperCharger</button>'
                );
                message = message.replace(
                    Flag.SpecCaseMessage.#teslaDC,
                    '<button id="wmeph-tesla-destination-charger" class="btn wmeph-btn">Tesla Destination Charger</button>'
                );
            } else {
                isRivian = Flag.SpecCaseMessage.#rivianAN.test(message) && Flag.SpecCaseMessage.#rivianW.test(message);
                if (isRivian) {
                    message = message.replace(
                        Flag.SpecCaseMessage.#rivianAN,
                        '<button id="wmeph-rivian-adventure-network" class="btn wmeph-btn">Rivian Adventure Network charger</button>'
                    );
                    message = message.replace(
                        Flag.SpecCaseMessage.#rivianW,
                        '<button id="wmeph-rivian-waypoints" class="btn wmeph-btn">Rivian Waypoints charger</button>'
                    );
                }
            }

            super();
            this.message = message;

            if (isTesla) {
                this.postProcess = () => {
                    $('#wmeph-tesla-supercharger').click(() => {
                        addUpdateAction(args.venue, { name: 'Tesla Supercharger' }, null, true);
                    });
                    $('#wmeph-tesla-destination-charger').click(() => {
                        addUpdateAction(args.venue, { name: 'Tesla Destination Charger' }, null, true);
                    });
                };
                this.severity = SEVERITY.RED;
            } else if (isRivian) {
                this.postProcess = () => {
                    $('#wmeph-rivian-adventure-network').click(() => {
                        addUpdateAction(args.venue, { name: 'Rivian Adventure Network' }, null, true);
                    });
                    $('#wmeph-rivian-waypoints').click(() => {
                        addUpdateAction(args.venue, { name: 'Rivian Waypoints' }, null, true);
                    });
                };
                this.severity = SEVERITY.RED;
            }
        }

        static venueIsFlaggable(args: any) {
            // TODO: Are the pharmhours and drivethruhours checks really needed?
            // They hide the displaynote message if the key words exist in the
            // venue description, but it could be argued it's ok if the message
            // shows up regardless.
            const message = args.pnhMatch.displaynote;
            let showFlag = false;
            if (args.showDispNote && !isNullOrWhitespace(message)) {
                if (args.pnhMatch.pharmhours) {
                    showFlag = !/\bpharmacy\b\s*\bh(ou)?rs\b/i.test(args.description ?? '');
                    // TODO: figure out what drivethruhours was supposed to be in PNH speccase column
                } else if (args.pnhMatch.drivethruhours) {
                    showFlag = !/\bdrive[\s-]?(thru|through)\b\s*\bh(ou)?rs\b/i.test(args.description ?? '');
                } else {
                    showFlag = true;
                }
            }
            return showFlag;
        }
    },
    ChangeToDoctorClinic: class extends ActionFlag {
        static defaultMessage = 'If this place provides non-emergency medical care: ';
        static defaultButtonText = 'Change to Doctor / Clinic';
        static defaultButtonTooltip = 'Change category to Doctor / Clinic';

        static venueIsFlaggable(args: any) {
            // Show the Change To Doctor / Clinic button for places with PERSONAL_CARE or OFFICES category
            // The date criteria was added because Doctor/Clinic category was added around then, and it's assumed if the
            // place has been edited since then, people would have already updated the category.
            return !args.highlightOnly
                && args.venue.attributes.updatedOn < new Date('3/28/2017').getTime()
                && ((args.categories.includes(CAT.PERSONAL_CARE) && !args.pnhNameRegMatch) || args.categories.includes(CAT.OFFICES));
        }

        action() {
            let categories = this.args.venue.getCategories().slice();
            let updateIt = false;
            if (categories.length) {
                [CAT.OFFICES, CAT.PERSONAL_CARE].forEach(cat => {
                    const idx = categories.indexOf(cat);
                    if (idx > -1) {
                        categories[idx] = CAT.DOCTOR_CLINIC;
                        updateIt = true;
                    }
                });
                categories = uniq(categories);
            } else {
                categories.push(CAT.DOCTOR_CLINIC);
                updateIt = true;
            }
            if (updateIt) {
                addUpdateAction(this.args.venue, { categories });
            }
            harmonizePlaceGo(this.args.venue, 'harmonize');
        }
    },
    ExtProviderMissing: class extends ActionFlag {
        static defaultButtonTooltip = 'If no other properties need to be updated, click to nudge the place (force an edit).';
        static #categoriesToIgnore = [CAT.BRIDGE, CAT.TUNNEL, CAT.JUNCTION_INTERCHANGE, CAT.NATURAL_FEATURES, CAT.ISLAND,
            CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.SWAMP_MARSH];

        get message() {
            let msg = 'No Google link';
            msg += this.makeRed()
                ? ' and place has not been edited for over 6 months. Edit a property (or nudge) and save to reset the 6 month timer: '
                : ': ';
            return msg;
        }

        get severity() { return this.makeRed() ? SEVERITY.RED : super.severity; }
        set severity(value) { super.severity = value; }

        get buttonText() { return this.makeRed() ? 'Nudge' : super.buttonText; }

        set buttonText(value) { super.buttonText = value; }

        constructor() {
            super();
            this.value2 = 'Add';
            this.title2 = 'Add a link to a Google place';
        }

        makeRed() {
            const { sdkVenue, venue } = this.args;
            if (this.args.isLocked) {
                const lastUpdated = sdkVenue.modificationData?.updatedOn ?? sdkVenue.modificationData?.createdOn ?? Date.now();
                const weeksSinceLastUpdate = (Date.now() - lastUpdated) / 604800000;
                const hasSdkUpdates = this.args.pendingUpdates?.sdkUpdates && Object.keys(this.args.pendingUpdates.sdkUpdates).length > 0;
                const hasLegacyActions = this.args.pendingUpdates?.legacyActions && this.args.pendingUpdates.legacyActions.length > 0;
                const isUpdated = typeof venue.isUpdated === 'function' ? venue.isUpdated() : !sdkVenue?.isUnchanged;
                if (weeksSinceLastUpdate >= 26 && !isUpdated && !hasSdkUpdates && !hasLegacyActions) {
                    return true;
                }
            }
            return false;
        }

        static venueIsFlaggable(args: any) {
            const hasPermissions = getSdk().DataModel.Venues.hasPermissions({ venueId: args.sdkVenue.id, permission: 'EDIT_EXTERNAL_PROVIDERS' });
            if ((USER.rank ?? 0) >= 2 && hasPermissions && !(args.categories.includes(CAT.PARKING_LOT) && args.ignoreParkingLots)) {
                if (!args.categories.some((cat: string) => this.#categoriesToIgnore.includes(cat))) {
                    const provIDs = args.sdkVenue.externalProviderIds;
                    if (!(provIDs && provIDs.length)) {
                        return true;
                    }
                }
            }
            return false;
        }

        action() {
            nudgeVenue(this.args.venue);
            harmonizePlaceGo(this.args.venue, 'harmonize'); // Rerun the script to update fields and lock
        }

        action2() {
            clickGeneralTab();
            const venueName = this.args.sdkVenue.name;
            $('wz-button.external-provider-add-new').click();
            setTimeout(() => {
                clickGeneralTab();
                setTimeout(() => {
                        const elem = document.querySelector('div.external-provider-edit-form wz-autocomplete')?.shadowRoot?.querySelector('wz-text-input')?.shadowRoot?.querySelector('input');
                        if (elem) {
                            elem.focus();
                            elem.value = venueName;
                            elem.dispatchEvent(new Event('input', { bubbles: true })); // NOTE: jquery trigger('input') and other event calls did not work.
                        }
                }, 100);
            }, 100);
        }

        preProcess() {
            // If no Google link and severity would otherwise allow locking, ask if user wants to lock anyway.
            const { args } = this;
            if (!args.isLocked && this.severity <= SEVERITY.YELLOW) {
                this.severity = SEVERITY.RED;
                args.totalSeverity = SEVERITY.RED;
                if (args.lockOK) {
                    this.buttonText = `Lock anyway? (${args.levelToLock + 1})`;
                    this.buttonTooltip = 'If no Google link exists, lock this place.\nIf there is still no Google link after '
                        + '6 months from the last update date, it will turn red as a reminder to search again.';
                    this.action = () => {
                        addUpdateAction(args.venue, { lockRank: args.levelToLock }, null, true);
                    };
                }
            }
        }
    },
    AddCommonEVPaymentMethods: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultButtonText = 'Add network payment methods';
        static defaultButtonTooltip = 'Please verify first! If any are not needed, click the WL button and manually add any needed payment methods.';
        static WL_KEY = 'addCommonEVPaymentMethods';
        static defaultWLTooltip = 'Whitelist common EV payment types';
        originalNetwork?: string;

        get message() {
            const sdk = getSdk();
            const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.sdkVenue.id });
            const paymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: this.args.sdkVenue.id }) || [];
            let msg = `These common payment methods for the ${network} network are missing. Verify if they are needed here:`;
            this.originalNetwork = network as string;
            const translations = I18n.translations[I18n.locale].edit.venue.category_attributes.payment_methods;
            const list = COMMON_EV_PAYMENT_METHODS[network as string]
                .filter((method: string) => !paymentMethods.includes(method as any))
                .map((method: string) => `- ${translations[method]}`).join('<br>');
            msg += `<br>${list}<br>`;
            return msg;
        }

        static venueIsFlaggable(args: any) {
            if (args.categories.includes(CAT.CHARGING_STATION) && !this.isWhitelisted(args)) {
                const sdk = getSdk();
                const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: args.sdkVenue.id });
                const paymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: args.sdkVenue.id }) || [];
                return !!(network && COMMON_EV_PAYMENT_METHODS[network]?.some((method: string) => !paymentMethods.includes(method as any)));
            }
            return false;
        }

        action() {
            if (!this.args.categories.includes(CAT.CHARGING_STATION)) {
                WazeWrap.Alerts.info(SCRIPT_NAME, 'This is no longer a charging station. Please run WMEPH again.', false, false);
                return;
            }

            const sdk = getSdk();
            const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.sdkVenue.id });
            if (network !== this.originalNetwork) {
                WazeWrap.Alerts.info(SCRIPT_NAME, 'EV charging station network has changed. Please run WMEPH again.', false, false);
                return;
            }

            const stationAttr = this.args.venue.attributes.categoryAttributes?.CHARGING_STATION || {};
            const newPaymentMethods = stationAttr.paymentMethods?.slice() ?? [];
            const commonPaymentMethods = COMMON_EV_PAYMENT_METHODS[network as string];
            commonPaymentMethods.forEach(method => {
                if (!newPaymentMethods.includes(method)) newPaymentMethods.push(method);
            });

            const categoryAttrClone = JSON.parse(JSON.stringify(this.args.venue.attributes?.categoryAttributes || {}));
            categoryAttrClone.CHARGING_STATION ??= {};
            categoryAttrClone.CHARGING_STATION.paymentMethods = newPaymentMethods;

            UPDATED_FIELDS.evPaymentMethods.updated = true;
            addUpdateAction(this.args.venue, { categoryAttributes: categoryAttrClone }, null, true);
        }
    },
    RemoveUncommonEVPaymentMethods: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultButtonText = 'Remove network payment methods';
        static defaultButtonTooltip = 'Please verify first! If any should NOT be removed, click the WL button and manually remove any unneeded payment methods.';
        static WL_KEY = 'removeUncommonEVPaymentMethods';
        static defaultWLTooltip = 'Whitelist uncommon EV payment types';
        originalNetwork?: string;

        get message() {
            const sdk = getSdk();
            const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.sdkVenue.id });
            const paymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: this.args.sdkVenue.id }) || [];
            let msg = `These payment methods are uncommon for the ${network} network. Verify if they are needed here:`;
            this.originalNetwork = network as string;
            const translations = I18n.translations[I18n.locale].edit.venue.category_attributes.payment_methods;
            const list = paymentMethods
                .filter((method: string) => !COMMON_EV_PAYMENT_METHODS[network as string]?.includes(method))
                .map((method: string) => `- ${translations[method]}`).join('<br>');
            msg += `<br>${list}<br>`;
            return msg;
        }

        static venueIsFlaggable(args: any) {
            if (args.categories.includes(CAT.CHARGING_STATION) && !this.isWhitelisted(args)) {
                const sdk = getSdk();
                const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: args.sdkVenue.id });
                const paymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: args.sdkVenue.id }) || [];
                return network && COMMON_EV_PAYMENT_METHODS.hasOwnProperty(network)
                    && !!(paymentMethods.some((method: string) => !COMMON_EV_PAYMENT_METHODS[network]?.includes(method)));
            }
            return false;
        }

        action() {
            if (!this.args.categories.includes(CAT.CHARGING_STATION)) {
                WazeWrap.Alerts.info('This is no longer a charging station. Please run WMEPH again.', false, false);
                return;
            }

            const sdk = getSdk();
            const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.sdkVenue.id });
            if (network !== this.originalNetwork) {
                WazeWrap.Alerts.info(SCRIPT_NAME, 'EV charging station network has changed. Please run WMEPH again.', false, false);
                return;
            }

            const stationAttr = this.args.venue.attributes.categoryAttributes?.CHARGING_STATION || {};
            const commonPaymentMethods = COMMON_EV_PAYMENT_METHODS[network as string];
            const newPaymentMethods = (stationAttr.paymentMethods?.slice() ?? [])
                .filter((method: string) => commonPaymentMethods?.includes(method));

            const categoryAttrClone = JSON.parse(JSON.stringify(this.args.venue.attributes?.categoryAttributes || {}));
            categoryAttrClone.CHARGING_STATION ??= {};
            categoryAttrClone.CHARGING_STATION.paymentMethods = newPaymentMethods;

            UPDATED_FIELDS.evPaymentMethods.updated = true;
            addUpdateAction(this.args.venue, { categoryAttributes: categoryAttrClone }, null, true);
        }
    },
    UrlMissing: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static get defaultMessage() {
            return `No URL: <input type="text" id="${Flag.UrlMissing.#TEXTBOX_ID}" autocomplete="off"`
                + ' style="font-size:0.85em;width:100px;padding-left:2px;color:#000;">';
        }

        static defaultButtonText = 'Add';
        static defaultButtonTooltip = 'Add URL to place';
        static WL_KEY = 'urlWL';
        static defaultWLTooltip = 'Whitelist empty URL';
        static #TEXTBOX_ID = 'WMEPH-UrlAdd';
        noBannerAssemble = true;

        static isWhitelisted(args: any) {
            return super.isWhitelisted(args)
                || PRIMARY_CATS_TO_FLAG_GREEN_MISSING_PHONE_URL.includes(args.categories[0])
                || ANY_CATS_TO_FLAG_GREEN_MISSING_PHONE_URL.some(category => args.categories.includes(category));
        }

        static venueIsFlaggable(args: any) {
            return !args.url?.trim().length
                && (!args.categories.includes(CAT.PARKING_LOT)
                    || (args.categories.includes(CAT.PARKING_LOT) && REGIONS_THAT_WANT_PLA_PHONE_URL.includes(args.region)))
                && !PRIMARY_CATS_TO_IGNORE_MISSING_PHONE_URL.includes(args.categories[0]);
        }

        static #getTextbox() {
            return $(`#${Flag.UrlMissing.#TEXTBOX_ID}`);
        }

        action() {
            const $textbox = Flag.UrlMissing.#getTextbox();
            const newUrl = normalizeURL($textbox.val());
            if ((!newUrl?.trim().length) || newUrl === BAD_URL) {
                $textbox.css({ backgroundColor: '#FDD' }).attr('title', 'Invalid URL format');
            } else {
                logDev(newUrl);
                addUpdateAction(this.args.venue, { url: newUrl }, null, true);
            }
        }

        postProcess() {
            // If pressing enter in the URL entry box, add the URL
            const textbox = Flag.UrlMissing.#getTextbox();
            textbox.keyup((evt: any) => {
                if (evt.keyCode === 13 && textbox.val() !== '') {
                    this.action();
                }
            });
        }
    },
    InvalidUrl: class extends WLFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'URL appears to be invalid.';
        static WL_KEY = 'invalidUrl';
        static defaultWLTooltip = 'Whitelist bad URL';

        static venueIsFlaggable(args: any) {
            return args.normalizedUrl === BAD_URL
                && !this.isWhitelisted(args);
        }
    },
    AddRecommendedPhone: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultButtonText = 'Add';
        static defaultButtonTooltip = 'Add recommended chain phone #';
        static WL_KEY = 'addRecommendedPhone';
        static defaultWLTooltip = 'Whitelist recommended phone #';

        get message() { return `Recommended phone #:<br>${this.args.recommendedPhone}`; }

        static venueIsFlaggable(args: any) {
            return args.recommendedPhone
                && !this.isWhitelisted(args)
                && args.recommendedPhone !== BAD_PHONE
                && args.recommendedPhone !== normalizePhone(args.phone, args.outputPhoneFormat);
        }

        action() {
            addUpdateAction(this.args.venue, { phone: this.args.recommendedPhone }, null, true);
        }
    },
    BadAreaCode: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultButtonText = 'Update';
        static defaultButtonTooltip = 'Update phone #';
        static WL_KEY = 'aCodeWL';
        static defaultWLTooltip = 'Whitelist the area code';
        noBannerAssemble = true;

        get message() {
            return 'Area Code appears to be invalid for this region:<br><input type="text" id="WMEPH-PhoneAdd" autocomplete="off" '
            + `style="font-size:0.85em;width:100px;padding-left:2px;color:#000;" value="${this.args.phone || ''}">`;
        }

        static venueIsFlaggable(args: any) {
            return args.phone
                && !this.isWhitelisted(args)
                // && ['USA', 'CAN'].includes(args.countryCode) // This check shouldn't be needed here.
                && !_areaCodeList.includes(args.phone.match(/[2-9]\d{2}/)?.[0]);
        }

        action() {
            const newPhone = normalizePhone($('#WMEPH-PhoneAdd').val(), this.args.outputPhoneFormat);
            if (newPhone === BAD_PHONE) {
                $('input#WMEPH-PhoneAdd').css({ backgroundColor: '#FDD' }).attr('title', 'Invalid phone # format');
            } else {
                addUpdateAction(this.args.venue, { phone: newPhone }, null, true);
            }
        }
    },
    PhoneMissing: class extends WLActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'No ph#: <input type="text" id="WMEPH-PhoneAdd" autocomplete="off" style="font-size:0.85em;width:100px;padding-left:2px;color:#000;">';
        static defaultButtonText = 'Add';
        static defaultButtonTooltip = 'Add phone to place';
        static WL_KEY = 'phoneWL';
        static defaultWLTooltip = 'Whitelist empty phone';
        noBannerAssemble = true;

        static isWhitelisted(args: any) {
            return super.isWhitelisted(args)
                || PRIMARY_CATS_TO_FLAG_GREEN_MISSING_PHONE_URL.includes(args.categories[0])
                || ANY_CATS_TO_FLAG_GREEN_MISSING_PHONE_URL.some(category => args.categories.includes(category));
        }

        static venueIsFlaggable(args: any) {
            return !args.phone
                && !FlagBase.currentFlags.hasFlag(Flag.AddRecommendedPhone)
                && (!args.categories.includes(CAT.PARKING_LOT)
                    || (args.categories.includes(CAT.PARKING_LOT) && REGIONS_THAT_WANT_PLA_PHONE_URL.includes(args.region)))
                && !PRIMARY_CATS_TO_IGNORE_MISSING_PHONE_URL.includes(args.categories[0]);
        }

        action() {
            const newPhone = normalizePhone($('#WMEPH-PhoneAdd').val(), this.args.outputPhoneFormat);
            if (newPhone === BAD_PHONE || !newPhone) {
                $('input#WMEPH-PhoneAdd').css({ backgroundColor: '#FDD' }).attr('title', 'Invalid phone # format');
            } else {
                logDev(newPhone);
                addUpdateAction(this.args.venue, { phone: newPhone }, null, true);
            }
        }

        // eslint-disable-next-line class-methods-use-this
        postProcess() {
            // TODO: Is this needed???
            // If pressing enter in the phone entry box, add the phone
            $('#WMEPH-PhoneAdd').keyup((evt: any) => {
                if (evt.keyCode === 13 && $('#WMEPH-PhoneAdd').val() !== '') {
                    $('#WMEPH_PhoneMissing').click();
                    $('#WMEPH_BadAreaCode').click();
                }
            });
        }
    },
    OldHours: class extends ActionFlag {
        static defaultSeverity = SEVERITY.YELLOW;
        static #categoriesToCheck: string[];
        static #parentCategoriesToCheck = [CAT.SHOPPING_AND_SERVICES, CAT.FOOD_AND_DRINK, CAT.CULTURE_AND_ENTERTAINEMENT];

        get message() {
            let msg = 'Last updated over 3 years ago. Verify hours are correct.';
            const isUnchanged = typeof this.args.venue.isUnchanged === 'function' ? this.args.venue.isUnchanged() : this.args.sdkVenue?.isUnchanged;
            if (isUnchanged) msg += ' If everything is current, nudge this place and save.';
            return msg;
        }

        get buttonText(): string {
            const isUnchanged = typeof this.args.venue.isUnchanged === 'function' ? this.args.venue.isUnchanged() : this.args.sdkVenue?.isUnchanged;
            return isUnchanged ? 'Nudge' : '';
        }

        set buttonText(value: string) {
            super.buttonText = value;
        }

        get severity() {
            const isUnchanged = typeof this.args.venue.isUnchanged === 'function' ? this.args.venue.isUnchanged() : this.args.sdkVenue?.isUnchanged;
            return isUnchanged ? super.severity : SEVERITY.GREEN;
        }

        static venueIsFlaggable(args: any) {
            this.#initializeCategoriesToCheck(args.pnhCategoryInfos);
            return !args.sdkVenue.isResidential
                && this.#venueIsOld(args.sdkVenue)
                && args.openingHours?.length
                && args.categories.some((cat: string) => this.#categoriesToCheck.includes(cat));
        }

        static #initializeCategoriesToCheck(pnhCategoryInfos: any) {
            if (!this.#categoriesToCheck) {
                this.#categoriesToCheck = pnhCategoryInfos
                    .toArray()
                    .filter((pnhCategoryInfo: any) => this.#parentCategoriesToCheck.includes(pnhCategoryInfo.parent))
                    .map((catInfo: any) => catInfo.id);
                this.#categoriesToCheck.push(...this.#parentCategoriesToCheck);
            }
        }

        static #venueIsOld(sdkVenue: any) {
            // Get the timestamp, prioritizing updatedOn, falling back to createdOn
            const lastUpdatedTimestamp = sdkVenue.modificationData?.updatedOn ?? sdkVenue.modificationData?.createdOn;

            // If neither timestamp exists, we can't determine age, so return false
            if (!lastUpdatedTimestamp) {
                return false;
            }

            const lastUpdatedDate = new Date(lastUpdatedTimestamp);

            // Calculate the date exactly 3 years ago from the current time
            const threeYearsAgo = new Date(); // Gets current date and time
            threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3); // Sets the year back by 3

            // Check if the last updated date is before the date 3 years ago
            return lastUpdatedDate < threeYearsAgo;
        }

        action() {
            nudgeVenue(this.args.venue);
            harmonizePlaceGo(this.args.venue, 'harmonize');
        }
    },
    Mismatch247: class extends FlagBase {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Hours of operation listed as open 24hrs but not for all 7 days.';

        static venueIsFlaggable(args: any) {
            return args.openingHours.length === 1
                && args.openingHours[0].days.length < 7
                && /^0?0:00$/.test(args.openingHours[0].fromHour)
                && (/^0?0:00$/.test(args.openingHours[0].toHour) || args.openingHours[0].toHour === '23:59');
        }
    },
    NoHours: class extends WLFlag {
        static WL_KEY = 'noHours';
        static defaultSeverity = SEVERITY.BLUE;
        static defaultWLTooltip = 'Whitelist "No hours"';

        get message() {
            let msg;
            if (!this.args.openingHours.length) {
                msg = Flag.NoHours.#getHoursHtml();
            } else {
                msg = Flag.NoHours.#getHoursHtml(true, isAlwaysOpen(this.args.venue));
            }
            return msg;
        }

        static venueIsFlaggable(args: any) {
            return !containsAny(args.categories, [CAT.STADIUM_ARENA, CAT.CEMETERY, CAT.TRANSPORTATION, CAT.FERRY_PIER, CAT.SUBWAY_STATION,
                CAT.BRIDGE, CAT.TUNNEL, CAT.JUNCTION_INTERCHANGE, CAT.ISLAND, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.FOREST_GROVE, CAT.CANAL,
                CAT.SWAMP_MARSH, CAT.DAM]);
        }

        static isWhitelisted(args: any) {
            return super.isWhitelisted(args)
                || args.openingHours.length
                || $('#WMEPH-DisableHoursHL').prop('checked')
                || containsAny(args.categories, [CAT.SCHOOL, CAT.CONVENTIONS_EVENT_CENTER,
                    CAT.CAMPING_TRAILER_PARK, CAT.COTTAGE_CABIN, CAT.COLLEGE_UNIVERSITY, CAT.GOLF_COURSE, CAT.SPORTS_COURT, CAT.MOVIE_THEATER,
                    CAT.SHOPPING_CENTER, CAT.RELIGIOUS_CENTER, CAT.PARKING_LOT, CAT.PARK, CAT.PLAYGROUND, CAT.AIRPORT, CAT.FIRE_DEPARTMENT,
                    CAT.POLICE_STATION, CAT.SEAPORT_MARINA_HARBOR, CAT.FARM, CAT.SCENIC_LOOKOUT_VIEWPOINT]);
        }

        static #getHoursHtml(hasExistingHours = false, alwaysOpen = false) {
            return $('<span>').append(
                `${hasExistingHours ? 'Hours' : 'No hours'}:`,
                !alwaysOpen ? $('<input>', {
                    class: 'btn btn-default btn-xs wmeph-btn',
                    id: 'WMEPH_noHours',
                    title: `Add pasted hours${hasExistingHours ? ' to existing hours' : ''}`,
                    type: 'button',
                    value: 'Add hours',
                    style: 'margin-bottom:4px; margin-right:0px; margin-left:3px;'
                }) : '',
                hasExistingHours ? $('<input>', {
                    class: 'btn btn-default btn-xs wmeph-btn',
                    id: 'WMEPH_noHours_2',
                    title: 'Replace existing hours with pasted hours',
                    type: 'button',
                    value: 'Replace all hours',
                    style: 'margin-bottom:4px; margin-right:0px; margin-left:3px;'
                }) : '',
                // jquery throws an error when setting autocomplete="off" in a jquery object (must use .autocomplete() function), so just use a string here.
                // eslint-disable-next-line max-len
                `<textarea id="WMEPH-HoursPaste" wrap="off" autocomplete="off" style="overflow:auto;width:84%;max-width:84%;min-width:84%;font-size:0.85em;height:24px;min-height:24px;max-height:300px;margin-bottom:-2px;padding-left:3px;color:#AAA;position:relative;z-index:1;">${DEFAULT_HOURS_TEXT}`
            )[0].outerHTML;
        }

        static #getTitle(parseResult: any) {
            let title;
            if (parseResult.overlappingHours) {
                title = 'Overlapping hours.  Check the existing hours.';
            } else if (parseResult.sameOpenAndCloseTimes) {
                title = 'Open/close times cannot be the same.';
            } else {
                title = 'Can\'t parse, try again';
            }
            return title;
        }

        applyHours(replaceAllHours?: boolean) {
            let pasteHours = $('#WMEPH-HoursPaste').val();
            if (pasteHours === DEFAULT_HOURS_TEXT) {
                return;
            }
            logDev(pasteHours);
            pasteHours += !replaceAllHours ? `,${getOpeningHours(this.args.venue).join(',')}` : '';
            $('.nav-tabs a[href="#venue-edit-more-info"]').tab('show');
            const parser = new HoursParser();
            const parseResult = parser.parseHours(pasteHours);
            if (parseResult.hours && !parseResult.overlappingHours && !parseResult.sameOpenAndCloseTimes && !parseResult.parseError) {
                logDev(parseResult.hours);
                addUpdateAction(this.args.venue, { openingHours: parseResult.hours }, null, true);
                $('#WMEPH-HoursPaste').val(DEFAULT_HOURS_TEXT);
            } else {
                log('Can\'t parse those hours');
                this.severity = SEVERITY.BLUE;
                this.WLactive = true;
                $('#WMEPH-HoursPaste').css({ 'background-color': '#FDD' }).attr({ title: Flag.NoHours.#getTitle(parseResult) });
            }
        }

        onAddHoursClick() {
            this.applyHours();
        }

        onReplaceHoursClick() {
            this.applyHours(true);
        }

        static #getDaysString(days: number[]) {
            const dayEnum: Record<number, string> = {
                1: 'Mon',
                2: 'Tue',
                3: 'Wed',
                4: 'Thu',
                5: 'Fri',
                6: 'Sat',
                7: 'Sun'
            };
            const dayGroups: number[][] = [];
            let lastGroup: number[] = [];
            let lastGroupDay = -1;
            days.forEach((day: number) => {
                if (day !== lastGroupDay + 1) {
                    // Not a consecutive day. Start a new group.
                    lastGroup = [];
                    dayGroups.push(lastGroup);
                }
                lastGroup.push(day);
                lastGroupDay = day;
            });

            // Process the groups into strings
            const groupString: string[] = [];
            dayGroups.forEach((group: number[]) => {
                if (group.length < 3) {
                    group.forEach((day: number) => {
                        groupString.push(dayEnum[day]);
                    });
                } else {
                    const firstDay = dayEnum[group[0]];
                    const lastDay = dayEnum[group[group.length - 1]];
                    groupString.push(`${firstDay}–${lastDay}`);
                }
            });
            if (groupString.length === 1 && groupString[0] === 'Mon–Sun') return 'Every day';
            return groupString.join(', ');
        }

        static #formatAmPm(time24Hrs: string) {
            const re = /^(\d{1,2}):(\d{2})/;
            const match = time24Hrs.match(re);
            if (match) {
                let hour = parseInt(match[1], 10);
                const minute = match[2];
                let suffix;
                if (hour === 12 && minute === '00') {
                    return 'noon';
                }
                if (hour === 0) {
                    if (minute === '00') {
                        return 'midnight';
                    }
                    hour = 12;
                    suffix = 'am';
                } else if (hour < 12) {
                    suffix = 'am';
                } else {
                    suffix = 'pm';
                    if (hour > 12) hour -= 12;
                }
                return `${hour}${minute === '00' ? '' : `:${minute}`} ${suffix}`;
            }
            return time24Hrs;
        }

        static #getHoursString(hoursObject: any) {
            if (isHoursAllDay(hoursObject)) return 'All day';
            const fromHour = this.#formatAmPm(hoursObject.fromHour);
            const toHour = this.#formatAmPm(hoursObject.toHour);
            return `${fromHour}–${toHour}`;
        }

        static #getOrderedDaysArray(hoursObject: any) {
            const days = hoursObject.days.slice();
            // Change Sunday value from 0 to 7
            const sundayIndex = days.indexOf(0);
            if (sundayIndex > -1) {
                days.splice(sundayIndex, 1);
                days.push(7);
            }
            days.sort(); // Maybe not needed, but just in case
            return days;
        }

        static #getHoursStringArray(hoursObjects: any[]) {
            const daysWithHours: number[] = [];
            const outputArray = hoursObjects.map((hoursObject: any) => {
                const days = this.#getOrderedDaysArray(hoursObject);
                daysWithHours.push(...days);

                // Concatenate the group strings and append hours range
                const daysString = this.#getDaysString(days);
                const hoursString = this.#getHoursString(hoursObject);
                return `${daysString}:&nbsp&nbsp${hoursString}`;
            });

            // Find closed days
            const closedDays = [1, 2, 3, 4, 5, 6, 7].filter((day: number) => !daysWithHours.includes(day));
            if (closedDays.length) {
                outputArray.push(`${this.#getDaysString(closedDays)}:&nbsp&nbspCLOSED`);
            }
            return outputArray;
        }

        postProcess() {
            if (this.args.openingHours.length) {
                const hoursStringArray = Flag.NoHours.#getHoursStringArray(this.args.openingHours);
                const $hoursTable = $('<div>', {
                    id: 'wmeph-hours-list',
                    style: 'display: inline-block;font-size: 13px;border: 1px solid #aaa;margin: -6px 2px 2px 0px;border-radius: 0px 0px 5px 5px;background-color: #f5f5f5;color: #727272;'
                        + 'padding: 3px 10px 0px 5px !important;z-index: 0;position: relative;min-width: 84%',
                    title: 'Current hours'
                }).append(
                    hoursStringArray
                        .map((entry: string, idx: number) => `<div${idx < hoursStringArray.length - 1 ? ' style="border-bottom: 1px solid #ddd;"' : ''}>${entry}</div>`)
                        .join('')
                );

                $('#WMEPH-HoursPaste').after($hoursTable);
            }
            // NOTE: Leave these wrapped in the "() => ..." functions, to make sure "this" is bound properly.
            $('#WMEPH_noHours').click(() => this.onAddHoursClick());
            $('#WMEPH_noHours_2').click(() => this.onReplaceHoursClick());

            // If pasting or dropping into hours entry box
            function resetHoursEntryHeight() {
                const $sel = $('#WMEPH-HoursPaste');
                $sel.focus();
                const oldText = $sel.val();
                if (oldText === DEFAULT_HOURS_TEXT) {
                    $sel.val('');
                }

                // A small delay to allow window to process pasted text before running.
                setTimeout(() => {
                    const text = $sel.val();
                    const elem = $sel[0];
                    const lineCount = (text.match(/\n/g) || []).length + 1;
                    const height = lineCount * 18 + 6 + (elem.scrollWidth > elem.clientWidth ? 20 : 0);
                    $sel.css({ height: `${height}px` });
                }, 0);
            }

            $('#WMEPH-HoursPaste').after($('<i>', {
                id: 'wmeph-paste-hours-btn',
                class: 'fa fa-paste',
                style: 'font-size: 17px;position: relative;vertical-align: top;top: 2px;right: -5px;margin-right: 3px;color: #6c6c6c;cursor: pointer;',
                title: 'Paste from the clipboard'
            })); // , $('<i>', {
            //     id: 'wmeph-clear-hours-btn',
            //     class: 'fa fa-trash-o',
            //     style: 'font-size: 17px;position: relative;right: -5px;bottom: 6px;color: #6c6c6c;cursor: pointer;margin-left: 5px;',
            //     title: 'Clear pasted hours'
            // }));

            $('#wmeph-paste-hours-btn').click(() => {
                navigator.clipboard.readText().then(cliptext => {
                    $('#WMEPH-HoursPaste').val(cliptext);
                    resetHoursEntryHeight();
                }, err => console.error(err));
            });

            // $('#wmeph-clear-hours-btn').click(() => {
            //     $('#WMEPH-HoursPaste').val(null);
            //     resetHoursEntryHeight();
            // });

            $('#WMEPH-HoursPaste')
                .bind('paste', resetHoursEntryHeight)
                .bind('drop', resetHoursEntryHeight)
                .bind('dragenter', (evt: any) => {
                    const $control = $(evt.currentTarget);
                    const text = $control.val();
                    if (text === DEFAULT_HOURS_TEXT) {
                        $control.val('');
                    }
                }).keydown((evt: any) => {
                    // If pressing enter in the hours entry box then parse the entry, or newline if CTRL or SHIFT.
                    resetHoursEntryHeight();
                    if (evt.keyCode === 13) {
                        if (evt.ctrlKey) {
                            // Simulate a newline event (shift + enter)
                            const target = evt.currentTarget;
                            const text = target.value;
                            const selStart = target.selectionStart;
                            target.value = `${text.substr(0, selStart)}\n${text.substr(target.selectionEnd, text.length - 1)}`;
                            target.selectionStart = selStart + 1;
                            target.selectionEnd = selStart + 1;
                            return true;
                        }
                        if (!(evt.shiftKey || evt.ctrlKey) && $(evt.currentTarget).val().length) {
                            evt.stopPropagation();
                            evt.preventDefault();
                            evt.returnValue = false;
                            evt.cancelBubble = true;
                            $('#WMEPH_noHours').click();
                            return false;
                        }
                    }
                    return true;
                }).focus((evt: any) => {
                    const target = evt.currentTarget;
                    if (target.value === DEFAULT_HOURS_TEXT) {
                        target.value = '';
                    }
                    target.style.color = 'black';
                }).blur((evt: any) => {
                    const target = evt.currentTarget;
                    if (target.value === '') {
                        target.value = DEFAULT_HOURS_TEXT;
                        target.style.color = '#999';
                    }
                });
        }
    },
    AllDayHoursFixed: class extends FlagBase {
        static defaultSeverity = SEVERITY.YELLOW;
        static defaultMessage = 'Hours were changed from 00:00-23:59 to "All Day"';

        // If highlightOnly, flag place yellow. Running WMEPH on a place will automatically fix the hours, so
        // then this can be green and just display the message.
        get severity() { return this.args.highlightOnly ? super.severity : SEVERITY.GREEN; }

        static venueIsFlaggable(args: any) {
            return args.almostAllDayHoursEntries.length > 0;
        }
    },
    PlaLotTypeMissing: class extends FlagBase {
        static defaultSeverity = SEVERITY.RED;
        static get defaultMessage() {
            return `Lot type: ${
                ([['PUBLIC', 'Public'], ['RESTRICTED', 'Restricted'], ['PRIVATE', 'Private']] as string[][])
                    .map((btnInfo: string[]) => $('<button>', { class: 'wmeph-pla-lot-type-btn btn btn-default btn-xs wmeph-btn', 'data-lot-type': btnInfo[0] })
                        .text(btnInfo[1])
                        .prop('outerHTML')).join('')
            }`;
        }

        static venueIsFlaggable(args: any) {
            if (args.categories.includes(CAT.PARKING_LOT)) {
                const sdk = getSdk();
                const type = sdk.DataModel.Venues.ParkingLot.getParkingLotType({ venueId: args.sdkVenue.id });
                if (!type) {
                    return true;
                }
            }
            return false;
        }

        postProcess() {
            $('.wmeph-pla-lot-type-btn').click((evt: any) => {
                const lotType = $(evt.currentTarget).data('lot-type');
                const categoryAttrClone = JSON.parse(JSON.stringify(this.args.venue.attributes?.categoryAttributes || {}));
                categoryAttrClone.PARKING_LOT = categoryAttrClone.PARKING_LOT ?? {};
                categoryAttrClone.PARKING_LOT.parkingType = lotType;
                UPDATED_FIELDS.lotType.updated = true;
                addUpdateAction(this.args.venue, { categoryAttributes: categoryAttrClone }, null, true);
            });
        }
    },
    PlaCostTypeMissing: class extends FlagBase {
        static defaultSeverity = SEVERITY.BLUE;
        static get defaultMessage() {
            return `Parking cost: ${
                ([['FREE', 'Free', 'Free'], ['LOW', '$', 'Low'], ['MODERATE', '$$', 'Moderate'], ['EXPENSIVE', '$$$', 'Expensive']] as string[][])
                    .map((btnInfo: string[]) => $('<button>', { id: `wmeph_${btnInfo[0]}`, class: 'wmeph-pla-cost-type-btn btn btn-default btn-xs wmeph-btn', title: btnInfo[2] })
                        .text(btnInfo[1])
                        .css({
                            padding: '3px',
                            height: '20px',
                            lineHeight: '0px',
                            marginRight: '2px',
                            marginBottom: '1px',
                            minWidth: '18px'
                        })
                        .prop('outerHTML')).join('')
            }`;
        }

        static venueIsFlaggable(args: any) {
            const sdk = getSdk();
            const costType = args.categories.includes(CAT.PARKING_LOT) ? sdk.DataModel.Venues.ParkingLot.getCostType({ venueId: args.sdkVenue.id }) : null;
            return args.categories.includes(CAT.PARKING_LOT)
                && (!costType || costType === 'UNKNOWN');
        }

        postProcess() {
            $('.wmeph-pla-cost-type-btn').click((evt: any) => {
                const selectedValue = $(evt.currentTarget).attr('id').replace('wmeph_', '');
                let attrClone;
                if (this.args.venue.attributes?.categoryAttributes) {
                    attrClone = JSON.parse(JSON.stringify(this.args.venue.attributes?.categoryAttributes));
                } else {
                    attrClone = {};
                }
                attrClone.PARKING_LOT ??= {};
                attrClone.PARKING_LOT.costType = selectedValue;
                addUpdateAction(this.args.venue, { categoryAttributes: attrClone }, null, true);
                UPDATED_FIELDS.cost.updated = true;
            });
        }
    },
    PlaPaymentTypeMissing: class extends ActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'Parking isn\'t free. Select payment type(s) from the "More info" tab. ';
        static defaultButtonText = 'Go there';

        static venueIsFlaggable(args: any) {
            if (args.categories.includes(CAT.PARKING_LOT)) {
                const sdk = getSdk();
                const costType = sdk.DataModel.Venues.ParkingLot.getCostType({ venueId: args.sdkVenue.id });
                const paymentMethods = sdk.DataModel.Venues.ParkingLot.getPaymentMethods({ venueId: args.sdkVenue.id });
                if (costType && costType !== 'FREE' && costType !== 'UNKNOWN' && (!paymentMethods || !paymentMethods.length)) {
                    return true;
                }
            }
            return false;
        }

        // eslint-disable-next-line class-methods-use-this
        action() {
            const tab = document.querySelector('#edit-panel wz-tab.venue-edit-tab-more-info') as any;
            if (tab) tab.isActive = true;
            // The setTimeout is necessary to allow the previous action to do its thing. A pause isn't needed, just a new thread.
            setTimeout(() => document.querySelector('#venue-edit-more-info wz-select[name="costType"]')?.scrollIntoView(), 0);
        }
    },
    PlaLotElevationMissing: class extends ActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'No lot elevation. Is it street level?';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Click if street level parking only, or select other option(s) in the More Info tab.';

        static venueIsFlaggable(args: any) {
            if (args.categories.includes(CAT.PARKING_LOT)) {
                const sdk = getSdk();
                const lotTypes = sdk.DataModel.Venues.ParkingLot.getLotTypes({ venueId: args.sdkVenue.id });
                if (!lotTypes || lotTypes.length === 0) {
                    return true;
                }
            }
            return false;
        }

        action() {
            const attrClone = JSON.parse(JSON.stringify(this.args.venue.attributes?.categoryAttributes || {}));
            attrClone.PARKING_LOT = attrClone.PARKING_LOT ?? {};
            attrClone.PARKING_LOT.lotType = ['STREET_LEVEL'];
            addUpdateAction(this.args.venue, { categoryAttributes: attrClone }, null, true);
        }
    },
    PlaSpaces: class extends FlagBase {
        static get defaultMessage() {
            const msg = '# of parking spaces is set to 1-10.<br><b><i>If appropriate</i></b>, select another option:';
            const $btnDiv = $('<div>');
            let btnIdx = 0;
            [
                ['R_11_TO_30', '11-30'], ['R_31_TO_60', '31-60'], ['R_61_TO_100', '61-100'],
                ['R_101_TO_300', '101-300'], ['R_301_TO_600', '301-600'], ['R_600_PLUS', '601+']
            ].forEach((btnInfo: string[]) => {
                if (btnIdx === 3) $btnDiv.append('<br>');
                $btnDiv.append(
                    $('<button>', { id: `wmeph_${btnInfo[0]}`, class: 'wmeph-pla-spaces-btn btn btn-default btn-xs wmeph-btn' })
                        .text(btnInfo[1])
                        .css({
                            padding: '3px',
                            height: '20px',
                            lineHeight: '0px',
                            marginTop: '2px',
                            marginRight: '2px',
                            marginBottom: '1px',
                            width: '64px'
                        })
                );
                btnIdx++;
            });
            return msg + $btnDiv.prop('outerHTML');
        }

        static venueIsFlaggable(args: any) {
            if (!args.highlightOnly && args.categories.includes(CAT.PARKING_LOT)) {
                const sdk = getSdk();
                const spots = sdk.DataModel.Venues.ParkingLot.getEstimatedNumberOfSpots({ venueId: args.sdkVenue.id });
                if (!spots || spots === 'R_1_TO_10') {
                    return true;
                }
            }
            return false;
        }
    },
    NoPlaStopPoint: class extends ActionFlag {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'Entry/exit point has not been created.';
        static defaultButtonText = 'Add point';
        static defaultButtonTooltip = 'Add an entry/exit point';

        static venueIsFlaggable(args: any) {
            return args.categories.includes(CAT.PARKING_LOT)
                && (!args.sdkVenue.navigationPoints || !args.sdkVenue.navigationPoints.length);
        }

        action() {
            $('wz-button.navigation-point-add-new').click();
            harmonizePlaceGo(this.args.venue, 'harmonize');
        }
    },
    PlaStopPointUnmoved: class extends FlagBase {
        static defaultSeverity = SEVERITY.BLUE;
        static defaultMessage = 'Entry/exit point has not been moved.';

        static venueIsFlaggable(args: any) {
            if (args.categories.includes(CAT.PARKING_LOT) && args.sdkVenue.navigationPoints?.length) {
                const stopPoint = args.sdkVenue.navigationPoints[0].point.coordinates;
                const areaCenter = turf.centroid(args.sdkVenue.geometry).geometry.coordinates;
                return stopPoint[0] === areaCenter[0] && stopPoint[1] === areaCenter[1];
            }
            return false;
        }
    },
    PlaCanExitWhileClosed: class extends ActionFlag {
        static defaultMessage = 'Can cars exit when lot is closed? ';
        static defaultButtonText = 'Yes';

        static venueIsFlaggable(args: any) {
            const sdk = getSdk();
            const canExit = args.categories.includes(CAT.PARKING_LOT) ? sdk.DataModel.Venues.ParkingLot.canExitWhileClosed({ venueId: args.sdkVenue.id }) : null;
            return !args.highlightOnly
                && args.categories.includes(CAT.PARKING_LOT)
                && !canExit
                && ($('#WMEPH-ShowPLAExitWhileClosed').prop('checked') || !(args.openingHours.length === 0 || is247Hours(args.openingHours)));
        }

        action() {
            const attrClone = JSON.parse(JSON.stringify(this.args.venue.attributes?.categoryAttributes || {}));
            attrClone.PARKING_LOT = attrClone.PARKING_LOT ?? {};
            attrClone.PARKING_LOT.canExitWhileClosed = true;
            addUpdateAction(this.args.venue, { categoryAttributes: attrClone }, null, true);
        }
    },
    PlaHasAccessibleParking: class extends ActionFlag {
        static defaultMessage = 'Does this lot have disability parking? ';
        static defaultButtonText = 'Yes';

        static venueIsFlaggable(args: any) {
            return !args.highlightOnly
                && args.categories.includes(CAT.PARKING_LOT)
                && !(args.sdkVenue.services?.includes('DISABILITY_PARKING'));
        }

        action() {
            const services = this.args.sdkVenue.services?.slice() ?? [];
            services.push('DISABILITY_PARKING');
            addUpdateAction(this.args.venue, { services }, null, true);
            UPDATED_FIELDS.services_DISABILITY_PARKING.updated = true;
        }
    },
    LocalURL: class extends FlagBase {
        static defaultMessage = 'Some locations for this business have localized URLs, while others use the primary corporate site.'
            + ' Check if a local URL applies to this location.';

        static venueIsFlaggable(args: any) {
            return args.localUrlRegexString && !(new RegExp(args.localUrlRegexString, 'i')).test(args.url);
        }
    },
    LockRPP: class extends ActionFlag {
        static defaultButtonText = 'Lock';
        static defaultButtonTooltip = 'Lock the residential point';

        get message() {
            let msg = 'Lock at <select id="RPPLockLevel">';
            let ddlSelected = false;
            for (let llix = 1; llix < 6; llix++) {
                if (llix < (USER.rank ?? 0) + 1) {
                    if (!ddlSelected && (this.args.defaultLockLevel === llix - 1 || llix === USER.rank)) {
                        msg += `<option value="${llix}" selected="selected">${llix}</option>`;
                        ddlSelected = true;
                    } else {
                        msg += `<option value="${llix}">${llix}</option>`;
                    }
                }
            }
            msg += '</select>';
            msg = `Current lock: ${this.args.sdkVenue.lockRank + 1}. ${msg} ?`;
            return msg;
        }

        static venueIsFlaggable(args: any) {
            // Allow residential point locking by R3+
            return !args.highlightOnly
                && args.categories.includes(CAT.RESIDENCE_HOME)
                && (USER.isDevUser || USER.isBetaUser || (USER.rank ?? 0) >= 3);
        }

        action() {
            let levelToLock = $('#RPPLockLevel :selected').val() || this.args.defaultLockLevel + 1;
            logDev(`RPPlevelToLock: ${levelToLock}`);

            levelToLock -= 1;
            if (this.args.sdkVenue.lockRank !== levelToLock) {
                addUpdateAction(this.args.venue, { lockRank: levelToLock }, null, true);
            }
        }
    },
    AddAlias: class extends ActionFlag {
        static defaultButtonText = 'Yes';

        get message() { return `Is there a ${this.args.pnhMatch.optionalAlias} at this location?`; }
        get buttonTooltip() { return `Add ${this.args.pnhMatch.optionalAlias}`; }

        static venueIsFlaggable(args: any) {
            return args.pnhMatch.optionalAlias
                && !args.aliases.includes(args.pnhMatch.optionalAlias);
        }

        action() {
            const attr = this.args.venue.attributes || this.args.sdkVenue;
            const alias = this.args.pnhMatch.optionalAlias;
            let aliases = insertAtIndex(attr.aliases.slice(), alias, 0);
            if (this.args.pnhMatch.altName2Desc && !attr.description.toUpperCase().includes(alias.toUpperCase())) {
                const description = `${alias}\n${attr.description}`;
                addUpdateAction(this.args.venue, { description }, null, false);
            }
            const newAliases = removeUnnecessaryAliases(attr.name, aliases);
            if (newAliases) {
                addUpdateAction(this.args.venue, { aliases: newAliases }, null, true);
            }
        }
    },
    // @ts-ignore
    AddCat2: class extends ActionFlag {
        static defaultButtonText = 'Yes';
        altCategory: string;
        venue: any;

        get message() { return `Is there a ${I18n.translations[I18n.locale].venues.categories[this.altCategory]} at this location?`; }
        get buttonTooltip() { return `Add ${I18n.translations[I18n.locale].venues.categories[this.altCategory]}`; }

        constructor(venue: any, altCategory: string) {
            super();
            this.altCategory = altCategory;
            this.venue = venue;
        }

        // @ts-ignore
        static eval(args: any, altCategory: string) {
            let result = null;
            if (args.pnhMatch.flagsToAdd?.addCat2 && !args.categories.includes(altCategory)) {
                result = new this(args.venue, altCategory);
            }
            return result;
        }

        action() {
            const categories = insertAtIndex(this.args.categories.slice(), this.altCategory, 1);
            addUpdateAction(this.venue, { categories }, null, true);
        }
    },
    AddPharm: class extends ActionFlag {
        static defaultMessage = 'Is there a Pharmacy at this location?';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Add Pharmacy category';

        static venueIsFlaggable(args: any) {
            return args.pnhMatch.flagsToAdd?.addPharm && !args.categories.includes(CAT.PHARMACY);
        }

        action() {
            const categories = insertAtIndex(this.args.categories.slice(), CAT.PHARMACY, 1);
            addUpdateAction(this.args.venue, { categories }, null, true);
        }
    },
    AddSuper: class extends ActionFlag {
        static defaultMessage = 'Does this location have a supermarket?';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Add Supermarket category';

        static venueIsFlaggable(args: any) {
            return args.pnhMatch.flagsToAdd?.addSuper && !args.categories.includes(CAT.SUPERMARKET_GROCERY);
        }

        action() {
            const categories = insertAtIndex(this.args.categories.slice(), CAT.SUPERMARKET_GROCERY, 1);
            addUpdateAction(this.args.venue, { categories }, null, true);
        }
    },
    AppendAMPM: class extends ActionFlag {
        // Only used on the ARCO gas station PNH entry.
        static defaultMessage = 'Is there an ampm at this location?';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Add ampm to the place';

        static venueIsFlaggable(args: any) {
            // No need to check for name/catgory. After the action is run, the name will match the "ARCO ampm"
            // PNH entry, which doesn't have this flag.
            return args.pnhMatch.flagsToAdd?.appendAMPM;
        }

        action() {
            const categories = insertAtIndex(this.args.categories.slice(), CAT.CONVENIENCE_STORE, 1);
            addUpdateAction(this.args.venue, { name: 'ARCO ampm', url: 'ampm.com', categories }, null, true);
        }
    },
    AddATM: class extends ActionFlag {
        static defaultMessage = 'ATM at location? ';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Add the ATM category to this place';

        static venueIsFlaggable(args: any) {
            let flaggable = false;
            if (args.pnhMatch.flagsToAdd?.addATM) {
                flaggable = true;
            } else if (args.pnhMatch.notABank) {
                // do nothing
            } else if (!args.categories.includes(CAT.ATM) && args.categories.includes(CAT.BANK_FINANCIAL)) {
                if (args.priPNHPlaceCat === CAT.BANK_FINANCIAL) {
                    if ((args.categories.indexOf(CAT.OFFICES) !== 0)) {
                        flaggable = true;
                    }
                } else {
                    flaggable = true;
                }
            }
            return flaggable;
        }

        action() {
            const categories = insertAtIndex(this.args.categories.slice(), CAT.ATM, 1); // Insert ATM category in the second position
            addUpdateAction(this.args.venue, { categories }, null, true);
        }
    },
    AddConvStore: class extends ActionFlag {
        static defaultMessage = 'Add convenience store category? ';
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Add the Convenience Store category to this place';

        static venueIsFlaggable(args: any) {
            return (args.categories.includes(CAT.GAS_STATION)
                && !args.categories.includes(CAT.CONVENIENCE_STORE)
                && !this.currentFlags.hasFlag(Flag.SubFuel)) // Don't flag if already asking if this is really a gas station
                || args.pnhMatch?.flagsToAdd?.addConvStore;
        }

        action() {
            // Insert C.S. category in the second position
            const categories = insertAtIndex(this.args.categories.slice(), CAT.CONVENIENCE_STORE, 1);
            addUpdateAction(this.args.venue, { categories }, null, true);
        }
    },
    IsThisAPostOffice: class extends ActionFlag {
        static defaultMessage = `Is this a <a href="${URLS.uspsWiki}" target="_blank" style="color:#3a3a3a">USPS post office</a>? `;
        static defaultButtonText = 'Yes';
        static defaultButtonTooltip = 'Is this a USPS location?';
        nameBase?: string;
        nameSuffix?: string;

        static venueIsFlaggable(args: any) {
            return !args.highlightOnly
                && args.countryCode === PNH_DATA.USA.countryCode
                && !args.categories.includes(CAT.PARKING_LOT)
                && !args.categories.includes(CAT.POST_OFFICE)
                && /\bUSP[OS]\b|\bpost(al)?\s+(service|office)\b/i.test(args.nameBase.replace(/[/\-.]/g, ''));
        }

        action() {
            const categories = insertAtIndex(this.args.categories.slice(), CAT.POST_OFFICE, 0);
            addUpdateAction(this.args.venue, { categories }, null, true);
        }
    },
    TitleCaseName: class extends ActionFlag {
        static defaultButtonText = 'Force Title Case?';
        #confirmChange = false;
        #originalName: string;
        #titleCaseName: string | null | undefined;
        noBannerAssemble = true;

        get message() { return `${this.#titleCaseName}${this.args.nameSuffix || ''}`; }
        get buttonTooltip() { return `Rename to: ${this.#titleCaseName}${this.args.nameSuffix || ''}`; }

        constructor(args: any) {
            super();
            this.#titleCaseName = titleCase(args.nameBase);
            this.#originalName = args.nameBase + (args.nameSuffix || '');
        }

        static venueIsFlaggable(args: any) {
            return !args.pnhNameRegMatch && args.nameBase !== titleCase(args.nameBase);
        }

        action() {
            let name = this.args.sdkVenue?.name ?? this.args.venue.name;
            if (name === this.#originalName || this.#confirmChange) {
                const parts = getNameParts(this.#originalName);
                name = titleCase(parts.base);
                if (parts.base !== name) {
                    addUpdateAction(this.args.venue, { name: name + (parts.suffix || '') });
                }
                harmonizePlaceGo(this.args.venue, 'harmonize');
            } else {
                $('button#WMEPH_titleCaseName').text('Are you sure?').after(' The name has changed. This will overwrite the new name.');
                this.#confirmChange = true;
            }
        }
    },
    ChangeToHospitalUrgentCare: class extends ActionFlag {
        static defaultMessage = 'If this place provides emergency medical care:';
        static defaultButtonText = 'Change to Hospital / Urgent Care';
        static defaultButtonTooltip = 'Change category to Hospital / Urgent Care';

        static venueIsFlaggable(args: any) {
            return !args.highlightOnly && args.categories.includes(CAT.DOCTOR_CLINIC);
        }

        action() {
            let categories = this.args.categories.slice();
            if (!categories.includes(CAT.HOSPITAL_MEDICAL_CARE)) {
                const indexToReplace = categories.indexOf(CAT.DOCTOR_CLINIC);
                if (indexToReplace > -1) {
                    categories = categories.slice(); // create a copy
                    categories[indexToReplace] = CAT.HOSPITAL_URGENT_CARE;
                }
                addUpdateAction(this.args.venue, { categories });
            }
            harmonizePlaceGo(this.args.venue, 'harmonize');
        }
    },
    SFAliases: class extends FlagBase {
        static defaultMessage = 'Unnecessary aliases were removed.';

        static venueIsFlaggable(args: any) {
            return args.aliasesRemoved;
        }
    },
    PlaceMatched: class extends FlagBase {
        static defaultMessage = 'Place matched from PNH data.';

        static venueIsFlaggable(args: any) {
            return args.pnhNameRegMatch;
        }
    },
    PlaceLocked: class extends FlagBase {
        static defaultMessage = 'Place locked.';
        hlLockFlag?: boolean;
        constructor(args: any) {
            super();

            if (args.sdkVenue.lockRank < args.levelToLock) {
                if (!args.highlightOnly) {
                    logDev('Venue locked!');
                    addUpdateAction(args.venue, { lockRank: args.levelToLock }, args.pendingUpdates);
                    UPDATED_FIELDS.lockRank.updated = true;
                } else {
                    this.hlLockFlag = true;
                }
            }
        }

        static venueIsFlaggable(args: any) {
            return args.lockOK && args.totalSeverity < SEVERITY.YELLOW;
        }
    },
    NewPlaceSubmit: class extends ActionFlag {
        static defaultMessage = 'No PNH match. If it\'s a chain: ';
        static defaultButtonText = 'Submit new chain data';
        static defaultButtonTooltip = 'Submit info for a new chain through the linked form';
        #formUrl;

        constructor(args: any) {
            super();

            // Make PNH submission link
            const encodedName = encodeURIComponent(args.nameBase);
            const encodedPermalink = encodeURIComponent(args.placePL);
            const encodedUrl = encodeURIComponent(args.newUrl?.trim() ?? '');
            const regionSettings = PNH_DATA[args.countryCode].regions[args.regionCode];
            let entryValues;
            if (['CA_EN', 'QC'].includes(args.region)) {
                entryValues = [encodedName, encodedUrl, USER.name, encodedPermalink];
            } else {
                entryValues = [encodedName, encodedUrl, USER.name + args.gFormState];
            }
            this.#formUrl = regionSettings.getNewChainFormUrl(entryValues);
        }

        static venueIsFlaggable(args: any) {
            return !args.highlightOnly
                && args.pnhMatch[0] === 'NoMatch'
                && !args.categories.includes(CAT.PARKING_LOT)
                && !CHAIN_APPROVAL_PRIMARY_CATS_TO_IGNORE.includes(args.categories[0])
                && !args.categories.includes(CAT.REST_AREAS);
        }

        action() {
            window.open(this.#formUrl);
        }
    },
    ApprovalSubmit: class extends ActionFlag {
        static defaultMessage = 'PNH data exists but is not approved for this region: ';
        static defaultButtonText = 'Request approval';
        static defaultButtonTooltip = 'Request region/country approval of this place';
        #formUrl;

        constructor(args: any) {
            super();

            const encodedName = encodeURIComponent(args.pnhMatch[1][0]); // Just do the first match
            const pnhOrderNum = args.pnhMatch[2].join(',');
            const approvalMessage = `Submitted via WMEPH. PNH order number ${pnhOrderNum}`;
            const encodedPermalink = encodeURIComponent(args.placePL);
            const regionSettings = PNH_DATA[args.countryCode].regions[args.regionCode];
            let entryValues;
            if (['CA_EN', 'QC'].includes(args.region)) {
                entryValues = [encodedName, approvalMessage, USER.name, encodedPermalink];
            } else {
                entryValues = [encodedName, approvalMessage, USER.name + args.gFormState];
            }
            this.#formUrl = regionSettings.getApproveChainFormUrl(entryValues);
        }

        static venueIsFlaggable(args: any) {
            return !args.highlightOnly
                && args.pnhMatch[0] === 'ApprovalNeeded'
                && !args.categories.includes(CAT.PARKING_LOT)
                && !CHAIN_APPROVAL_PRIMARY_CATS_TO_IGNORE.includes(args.categories[0])
                && !args.categories.includes(CAT.REST_AREAS);
        }

        action() {
            window.open(this.#formUrl);
        }
    },
    LocationFinder: class extends ActionFlag {
        static defaultButtonTooltip = 'Look up details about this location on the chain\'s finder web page.';
        static #USPS_LOCATION_FINDER_URL = 'https://tools.usps.com/find-location.htm';
        #storeFinderUrl: string;
        #isCustom = false;
        isCustom: boolean;
        venue: any;

        get buttonText() { return `Location Finder${this.isCustom ? ' (L)' : ''}`; }

        constructor(venue: any, storeFinderUrl: string, isCustom: boolean, addr: any, state2L: string, venueGPS: any) {
            super();
            this.isCustom = isCustom;
            this.venue = venue;
            this.#isCustom = isCustom;
            this.#storeFinderUrl = storeFinderUrl;
            this.#processUrl(venue, addr, state2L, venueGPS);
        }

        static #venueIsFlaggable(highlightOnly: boolean, storeFinderUrl: string) {
            return !highlightOnly && storeFinderUrl;
        }

        // TODO: Can this be put into venueIsFlaggable?
        static eval(args: any): any {
            const isUsps = args.countryCode === PNH_DATA.USA.countryCode && !args.categories.includes(CAT.PARKING_LOT)
                && args.categories.includes(CAT.POST_OFFICE);
            let storeFinderUrl;
            let isCustom = false;
            if (isUsps) {
                storeFinderUrl = this.#USPS_LOCATION_FINDER_URL;
            } else {
                storeFinderUrl = args.pnhMatch.sfurllocal;
                if (storeFinderUrl) {
                    isCustom = true;
                } else {
                    storeFinderUrl = args.pnhMatch.sfurl;
                }
            }

            return this.#venueIsFlaggable(args.highlightOnly, storeFinderUrl)
                ? new this(args.venue, storeFinderUrl, isCustom, args.sdkAddress, args.state2L, args.venueGPS)
                : null;
        }

        #processUrl(venue: any, sdkAddress: any, state2L: string, venueGPS: any) {
            if (this.#isCustom) {
                const houseNumber = sdkAddress?.houseNumber ?? venue.attributes?.houseNumber;

                const urlParts = this.#storeFinderUrl.replace(/ /g, '').split('<>');
                let searchStreet = typeof sdkAddress?.street?.name === 'string' ? sdkAddress.street.name : '';
                const searchStreetPlus = searchStreet.replace(/ /g, '+');
                searchStreet = searchStreet.replace(/ /g, '%20');
                
                let searchCity = typeof sdkAddress?.city?.name === 'string' ? sdkAddress.city.name : '';
                const searchCityPlus = searchCity.replace(/ /g, '+');
                searchCity = searchCity.replace(/ /g, '%20');
                
                let searchState = typeof sdkAddress?.state?.name === 'string' ? sdkAddress.state.name : '';
                const searchStatePlus = searchState.replace(/ /g, '+');
                searchState = searchState.replace(/ /g, '%20');

                if (!venueGPS) venueGPS = { lon: 0, lat: 0 };
                this.#storeFinderUrl = '';
                for (let tlix = 1; tlix < urlParts.length; tlix++) {
                    let part = '';
                    switch (urlParts[tlix]) {
                        case 'ph_streetName':
                            part = searchStreet;
                            break;
                        case 'ph_streetNamePlus':
                            part = searchStreetPlus;
                            break;
                        case 'ph_cityName':
                            part = searchCity;
                            break;
                        case 'ph_cityNamePlus':
                            part = searchCityPlus;
                            break;
                        case 'ph_stateName':
                            part = searchState;
                            break;
                        case 'ph_stateNamePlus':
                            part = searchStatePlus;
                            break;
                        case 'ph_state2L':
                            part = state2L;
                            break;
                        case 'ph_latitudeEW':
                            // customStoreFinderLocalURL = customStoreFinderLocalURL + venueGPS[0];
                            break;
                        case 'ph_longitudeNS':
                            // customStoreFinderLocalURL = customStoreFinderLocalURL + venueGPS[1];
                            break;
                        case 'ph_latitudePM':
                            part = venueGPS.lat;
                            break;
                        case 'ph_longitudePM':
                            part = venueGPS.lon;
                            break;
                        case 'ph_latitudePMBuffMin':
                            part = (venueGPS.lat - 0.025).toString();
                            break;
                        case 'ph_longitudePMBuffMin':
                            part = (venueGPS.lon - 0.025).toString();
                            break;
                        case 'ph_latitudePMBuffMax':
                            part = (venueGPS.lat + 0.025).toString();
                            break;
                        case 'ph_longitudePMBuffMax':
                            part = (venueGPS.lon + 0.025).toString();
                            break;
                        case 'ph_houseNumber':
                            part = houseNumber ?? '';
                            break;
                        default:
                            part = urlParts[tlix];
                    }
                    this.#storeFinderUrl += part;
                }
            }
            if (!/^https?:\/\//.test(this.#storeFinderUrl)) {
                this.#storeFinderUrl = `http://${this.#storeFinderUrl}`;
            }
        }

        #openStoreFinderWebsite() {
            if ($('#WMEPH-WebSearchNewTab').prop('checked')) {
                window.open(this.#storeFinderUrl);
            } else {
                window.open(this.#storeFinderUrl, SEARCH_RESULTS_WINDOW_NAME, _searchResultsWindowSpecs);
            }
        }

        get noLock() { return true; }

        action() {
            // If the user has 'never' opened a localized store finder URL, then warn them (just once)
            if (localStorage.getItem(SETTING_IDS.sfUrlWarning) === '0' && this.#isCustom) {
                WazeWrap.Alerts.confirm(
                    SCRIPT_NAME,
                    '***Localized store finder sites often show multiple nearby results. Please make sure you pick the right location.'
                        + '<br>Click OK to agree and continue.',
                    () => {
                        localStorage.setItem(SETTING_IDS.sfUrlWarning, '1'); // prevent future warnings
                        this.#openStoreFinderWebsite();
                    },
                    () => { }
                );
                return;
            }
            this.#openStoreFinderWebsite();
        }
    }
};

export class FlagContainer {
    static #flagOrder = [
        Flag.ChainIsClosed,
        Flag.EVChargingStationWarning,
        Flag.PnhCatMess,
        Flag.NotAHospital,
        Flag.NotASchool,
        Flag.FullAddressInference,
        Flag.NameMissing,
        Flag.GasNameMissing,
        Flag.PlaIsPublic,
        Flag.PlaNameMissing,
        Flag.PlaNameNonStandard,
        Flag.IndianaLiquorStoreHours,
        Flag.HoursOverlap,
        Flag.UnmappedRegion,
        Flag.RestAreaName,
        Flag.RestAreaNoTransportation,
        Flag.RestAreaGas,
        Flag.RestAreaScenic,
        Flag.RestAreaSpec,
        Flag.GasMismatch,
        Flag.GasUnbranded,
        Flag.GasMkPrim,
        Flag.IsThisAPilotTravelCenter,
        Flag.HotelMkPrim,
        Flag.ChangeToPetVet,
        Flag.PointNotArea,
        Flag.AreaNotPoint,
        Flag.HnMissing,
        Flag.HnTooManyDigits,
        Flag.HNRange,
        Flag.StreetMissing,
        Flag.CityMissing,
        Flag.BankType1,
        Flag.BankBranch,
        Flag.StandaloneATM,
        Flag.BankCorporate,
        Flag.CatPostOffice,
        Flag.IgnEdited,
        Flag.WazeBot,
        Flag.ParentCategory,
        Flag.CheckDescription,
        Flag.Overlapping,
        Flag.SuspectDesc,
        Flag.ResiTypeName,
        Flag.PhoneInvalid,
        Flag.UrlMismatch,
        Flag.UrlAnalytics,
        Flag.GasNoBrand,
        Flag.SubFuel,
        Flag.FormatUSPS,
        Flag.MissingUSPSAlt,
        Flag.MissingUSPSZipAlt,
        Flag.MissingUSPSDescription,
        Flag.CatHotel,
        Flag.LocalizedName,
        Flag.SpecCaseMessage,
        Flag.ChangeToDoctorClinic,
        Flag.ExtProviderMissing,
        Flag.AddCommonEVPaymentMethods,
        Flag.RemoveUncommonEVPaymentMethods,
        Flag.UrlMissing,
        Flag.InvalidUrl,
        Flag.AddRecommendedPhone,
        Flag.BadAreaCode,
        Flag.PhoneMissing,
        Flag.OldHours,
        Flag.Mismatch247,
        Flag.NoHours,
        Flag.AllDayHoursFixed,
        Flag.EVCSPriceMissing,
        Flag.PlaLotTypeMissing,
        Flag.PlaCostTypeMissing,
        Flag.PlaPaymentTypeMissing,
        Flag.PlaLotElevationMissing,
        Flag.PlaSpaces,
        Flag.NoPlaStopPoint,
        Flag.PlaStopPointUnmoved,
        Flag.PlaCanExitWhileClosed,
        Flag.PlaHasAccessibleParking,
        Flag.LocalURL,
        Flag.LockRPP,
        Flag.AddAlias,
        Flag.EVCSAltNameMissing,
        Flag.AddCat2,
        Flag.AddPharm,
        Flag.AddSuper,
        Flag.AppendAMPM,
        Flag.AddATM,
        Flag.AddConvStore,
        Flag.IsThisAPostOffice,
        Flag.TitleCaseName,
        Flag.ChangeToHospitalUrgentCare,
        Flag.SFAliases,
        Flag.ClearThisPhone,
        Flag.ClearThisUrl,
        Flag.PlaceMatched,
        Flag.PlaceLocked,
        Flag.NewPlaceSubmit,
        Flag.ApprovalSubmit,
        Flag.LocationFinder
    ];

    static #isIndexed: boolean = false;
    #flags: any[] = [];

    constructor() {
        FlagContainer.#indexFlags();
    }

    static #indexFlags() {
        if (!this.#isIndexed) {
            let displayIndex = 1;
            this.#flagOrder.forEach((flagClass: any) => {
                if (flagClass) {
                    flagClass.displayIndex = displayIndex++;
                }
            });
            this.#isIndexed = true;
        }
    }

    add(flag: any) {
        if (flag) this.#flags.push(flag);
    }

    remove(flagClass: any) {
        const idx = this.#flags.findIndex(flag => flag.constructor === flagClass);
        if (idx > -1) this.#flags.splice(idx, 1);
    }

    getOrderedFlags() {
        return this.#flags.slice().sort((f1: any, f2: any) => {
            const idx1 = f1.constructor.displayIndex;
            const idx2 = f2.constructor.displayIndex;

            if (idx1 > idx2) return 1;
            if (idx1 < idx2) return -1;
            return 0;
        });
    }

    hasFlag(flagClass: any) {
        return this.#flags.some(flag => flag.constructor === flagClass);
    }
}

export class HarmonizationArgs {
    venue: any = null;
    sdkVenue: any = null;
    sdkAddress: any = null;
    countryCode: string | null = null;
    pendingUpdates: any = null;
    highlightOnly = true;
    /** @type {SEVERITY} */
    totalSeverity: any;
    /** @type {number} */
    levelToLock: number | null = null;
    lockOK: boolean = true;
    isLocked: boolean = false;

    // Current venue attributes
    categories: string[] = [];
    nameSuffix: string = '';
    nameBase: string = '';
    aliases: string[] = [];
    description: string | null = null;
    url: string | null = null;
    phone: string | null = null;
    openingHours: any[] = [];

    /**
     * Will temporarily contain an array of information
     * during matching, but eventually contains a single PnhEntry object.
     * @type {PnhEntry}
     */
    pnhMatch: any = null;
    showDispNote: boolean = true;
    hoursOverlap: boolean = false;
    descriptionInserted: boolean = false;
    aliasesRemoved: boolean = false;
    isUspsPostOffice: boolean = false;
    maxPointSeverity: any;
    maxAreaSeverity: any;
    almostAllDayHoursEntries: any[] = [];
    defaultLockLevel: number;
    state2L: string = 'Unknown';
    regionCode: string = 'Unknown';
    gFormState = '';
    wl: any = {};
    outputPhoneFormat = '({0}) {1}-{2}';
    addr: any;
    brand: string | null = null;

    // Additional properties populated during harmonization
    priPNHPlaceCat?: string;
    pnhNameRegMatch?: boolean;
    chainIsClosed: boolean = false;
    pnhCategoryInfos?: any;
    normalizedUrl?: string | null;
    pnhUrl?: string | null;
    currentHN?: string;
    hasStreet?: boolean;
    ignoreParkingLots?: boolean;
    placePL: string = '';
    venueGPS?: any;
    recommendedPhone?: string;

    constructor(venue: any, pendingUpdates: any, highlightOnly: boolean) {
        this.venue = venue;
        const sdk = getSdk();
        this.sdkVenue = sdk.DataModel.Venues.getById({ venueId: venue.attributes?.id || venue.id });
        this.sdkAddress = sdk.DataModel.Venues.getAddress({ venueId: this.sdkVenue?.id });
        
        // Just mapping some defaults here to prevent undefined errors before constants are added
        this.totalSeverity = 0;
        this.maxPointSeverity = 0;
        this.maxAreaSeverity = 3;
        this.defaultLockLevel = 1;

        this.highlightOnly = highlightOnly;
        if (typeof venue.getAddress === 'function') {
            this.addr = venue.getAddress(W.model);
            this.addr = this.addr.attributes ?? this.addr;
        } else {
            this.addr = this.sdkAddress;
        }

        this.pendingUpdates = pendingUpdates;
        this.categories = this.sdkVenue?.categories?.slice() || [];

        const nameParts = getNameParts(this.sdkVenue?.name || '');
        this.nameSuffix = nameParts.suffix;
        this.nameBase = nameParts.base;

        this.aliases = this.sdkVenue?.aliases?.slice() || [];
        this.description = (this.sdkVenue as any)?.description ?? venue.attributes?.description ?? venue.description ?? null;
        this.url = this.sdkVenue?.url || null;
        this.phone = this.sdkVenue?.phone || null;
        this.openingHours = this.sdkVenue?.openingHours || [];
        this.brand = this.sdkVenue?.brand || null;
        
        if (this.sdkVenue) {
            const center = turf.centroid(this.sdkVenue.geometry).geometry.coordinates;
            this.venueGPS = { lon: center[0], lat: center[1] };
        }
    }
}
