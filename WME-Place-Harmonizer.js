// ==UserScript==
// @name        WME Place Harmonizer Beta
// @namespace   WazeUSA
// @version     2026.05.29.01
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH Development Group
// @include      https://www.waze.com/editor*
// @include      https://www.waze.com/*/editor*
// @include      https://beta.waze.com/editor*
// @include      https://beta.waze.com/*/editor*
// @exclude      https://www.waze.com/user/editor*
// @exclude      https://www.waze.com/dashboard/editor
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require     https://update.greasyfork.org/scripts/509664/WME%20Utils%20-%20Bootstrap.js
// @require     https://greasyfork.org/scripts/37486-wme-utils-hoursparser/code/WME%20Utils%20-%20HoursParser.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// @require     https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js
// @license     GNU GPL v3
// @connect     greasyfork.org
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_setClipboard
// ==/UserScript==

/* global _ */
/* global WazeWrap */
/* global LZString */
/* global HoursParser */
/* global I18n */
/* global google */
/* global turf */

/* eslint-disable max-classes-per-file */

(function main() {
  'use strict';

  // **************************************************************************************************************
  // IMPORTANT: Update this when releasing a new version of script
  // **************************************************************************************************************
  const SHOW_UPDATE_MESSAGE = true;
  const SCRIPT_UPDATE_MESSAGE = [
    'v 2026.05.28.00 : Fix: Make Gas Station primany category bug fixed.',
    'v 2026.05.29.00 : Fix: Prevent Nudge button from reappearing after initial click',
    'v 2026.05.29.01 : Fix: Preserve address IDs during place copy operation',
  ];

  // **************************************************************************************************************
  // TODO: SDK Limitations & Workarounds
  // **************************************************************************************************************
  // 1. House Numbers Layer: No SDK setter function exists (setHouseNumbersLayerCheckboxChecked)
  //    Current Status: Roads, Paths, JunctionBoxes, Hazards, Closures have SDK setters
  //    Current Solution: Toggle House Numbers via DOM manipulation (toggleLayerCheckboxViaDOM) in X-ray mode
  //    AFFECTED CODE: toggleXrayMode() function, lines 7159-7162 (enable) and 7189-7192 (restore)
  //
  //    WHEN SDK ADDS setHouseNumbersLayerCheckboxChecked:
  //      1. Replace toggleLayerCheckboxViaDOM() call with: sdk.LayerSwitcher.setHouseNumbersLayerCheckboxChecked({ isChecked: false })
  //      2. Remove the special-case check for 'HouseNumbers' layer in both enable and restore sections
  //      3. DELETE toggleLayerCheckboxViaDOM() function (lines 7128-7138)
  //
  // 2. Venue.description: Not exposed in WME SDK Venue interface for READING
  //    Current Status: updateVenue() DOES support writing, but Venue object doesn't expose reading
  //    Current Solution: Read from DOM textarea via UPDATED_FIELDS.description selector during WMEPH mode
  //
  //    LOCATIONS AFFECTED (runs in both highlight and WMEPH modes):
  //      - Line 4076: SuspectDesc - checks for google/yelp (guard: `args.description &&`)
  //      - Line 4567, 4572: DisplayNoteIfNeeded - pharmacy/drivethru checks (guard: `!args.description ||`)
  //      - Line 4471: MissingUSPSDescription - USPS validation (guard: `!args.highlightOnly`)
  //
  //    WHEN SDK ADDS description TO Venue INTERFACE:
  //      1. Update HarmonizationArgs constructor (line 6387):
  //         FROM: this.description = !highlightOnly ? this.getDescriptionFromDOM() : null;
  //         TO:   this.description = venue.description;
  //      2. DELETE getDescriptionFromDOM() method (lines 6396-6404)
  //      3. DELETE highlightOnly check in MissingUSPSDescription (line 4470)
  //      4. SIMPLIFY guard in SuspectDesc (line 4076):
  //         FROM: args.description && /(google|yelp)/i.test(args.description)
  //         TO:   /(google|yelp)/i.test(args.description)
  //      5. SIMPLIFY guards in DisplayNoteIfNeeded (lines 4567, 4572):
  //         FROM: !args.description || /pattern/
  //         TO:   /pattern/
  //      6. Update this TODO section or remove entirely
  //

  // **************************************************************************************************************
  // GLOBAL VARIABLES AND CONSTANTS
  // **************************************************************************************************************
  let sdk; // Declared as let because script checks for existing sdk before initialization
  let wmephSettings = {}; // Script-wide settings cache from WMEPH-Settings localStorage

  const SCRIPT_VERSION = GM_info.script.version.toString(); // pull version from header
  const SCRIPT_NAME = GM_info.script.name;
  const IS_BETA_VERSION = /Beta/i.test(SCRIPT_NAME); //  enables dev messages and unique DOM options if the script is called "... Beta"
  const BETA_VERSION_STR = IS_BETA_VERSION ? 'Beta' : ''; // strings to differentiate DOM elements between regular and beta script

  const MAX_CACHE_SIZE = 25000;
  const PROD_DOWNLOAD_URL = 'https://greasyfork.org/scripts/28690-wme-place-harmonizer/code/WME%20Place%20Harmonizer.user.js';
  const BETA_DOWNLOAD_URL =
    'YUhSMGNITTZMeTluY21WaGMzbG1iM0pyTG05eVp5OXpZM0pwY0hSekx6STROamc1TFhkdFpTMXdiR0ZqWlMxb1lYSnRiMjVwZW1WeUxXSmxkR0V2WTI5a1pTOVhUVVVsTWpCUWJHRmpaU1V5TUVoaGNtMXZibWw2WlhJbE1qQkNaWFJoTG5WelpYSXVhbk09';
  const GF_URL = 'https://greasyfork.org/scripts/28690-wme-place-harmonizer';

  const dec = (s) => atob(atob(s));

  let _layer;
  let _resultsCache = {};
  let _resultsCacheOrder = []; // Track insertion order for LRU eviction
  let _initAlreadyRun = false; // This is used to skip a couple things if already run once.  This could probably be handled better...
  let _textEntryValues = null; // Store the values entered in text boxes so they can be re-added when the banner is reassembled.

  // lock levels are offset by one
  const LOCK_LEVEL_2 = 1;
  const LOCK_LEVEL_4 = 3;

  // An enum to help clarify flag severity levels
  const SEVERITY = {
    GREEN: 0,
    BLUE: 1,
    YELLOW: 2,
    RED: 3,
    // 4 isn't used anymore
    PINK: 5,
    ORANGE: 6,
    // Historical note: 'lock', 'lock1', and 'adLock' severity levels existed in older WME but are no longer in use
  };

  // Pre-compiled regex patterns for performance (avoid recompilation in loops)
  const REGEX_PATTERNS = {
    BUTTON_ON: /^buttOn_(.*)/i,
    BUTTON_OFF: /^buttOff_(.+)/i,
    PS_ON: /^psOn_(.+)/i,
    PS_OFF: /^psOff_(.+)/i,
    FORCE_BRAND: /forceBrand<>([^,<]+)/i,
    LOCAL_URL: /^localURL_(.+)/i,
    CHECK_LOCALIZATION: /^checkLocalization<>(.+)/i,
    PHONE: /phone<>(.*?)<>/,
    KEEP_NAME: /keepName/g,
    OPTION_ALT_NAME: /^optionAltName<>(.+)/i,
    CLOSED: /^closed$/i,
    BRAND_PARENT: /^brandParent(\d+)/,
    STR_MATCH_ANY: /^strMatchAny$/i,
    PHARM_HOURS: /^pharmhours$/i,
    NOT_A_BANK: /^notABank$/i,
    OPTION_CAT2: /^optionCat2$/i,
    OPTION_NAME2: /^optionName2$/i,
    ALT_NAME2_DESC: /^altName2Desc$/i,
    SUB_FUEL: /^subFuel$/i,
    REGEX_NAME_MATCH: /^regexNameMatch<>(.+)<>/i,
    LOCK_AT: /^lockAt(\d)$/i,
    NO_UPDATE_ALIAS: /^noUpdateAlias$/i,
  };

  // Severity level colors (used for both map layer and banner background)
  const SEVERITY_COLORS = {
    [SEVERITY.GREEN]: '#08d608', // complete
    [SEVERITY.BLUE]: '#0000FF', // minor issues
    [SEVERITY.YELLOW]: '#FFFF00', // moderate issues
    [SEVERITY.RED]: '#FF0000', // major issues
    [SEVERITY.PINK]: '#FF1493', // extreme issues
    [SEVERITY.ORANGE]: '#FFA500', // other issues
    lock: '#08d608', // Used when SEVERITY = GREEN, but venue is not locked to regional standereds (old #8B008B)
    lock1: '#0000FF', //Used when SEVERITY = BLUE, but venue is not locked to regional standereds (old #FF69B4)
    adLock: '#FFD700', // ad-locked
  };

  // UI colors used throughout the script for consistency
  const UI_COLORS = {
    primary: '#0075e3', // Primary action button, links
    primaryAlt: '#0099ff', // Alternative primary
    accent: '#33ccff', // Accent elements
    success: '#118742', // Success states, buttons
    textDefault: '#3a3a3a', // Default text color
    textLink: '#3232e6', // Link text color
    textDisabled: '#999', // Disabled text
    fallback: '#CCCCCC', // Fallback/unset color
  };

  // Parking lot color mapping
  const PARKING_TYPE_COLORS = {
    PUBLIC: '#0000FF', // blue
    RESTRICTED: '#FFFF00', // yellow
    PRIVATE: '#FF0000', // red
  };

  // SHORTCUT STUFF
  let _shortcutParse;
  // *** Cache Management Helpers ***
  // Adds entry to cache with automatic LRU eviction when MAX_CACHE_SIZE is exceeded
  function addToResultsCache(id, value) {
    // Remove from order list if it already exists (for updates)
    const existingIndex = _resultsCacheOrder.indexOf(id);
    if (existingIndex > -1) {
      _resultsCacheOrder.splice(existingIndex, 1);
    }
    _resultsCacheOrder.push(id); // Add to end (most recent)
    _resultsCache[id] = value;

    // Evict oldest entry if cache exceeds MAX_CACHE_SIZE
    if (Object.keys(_resultsCache).length > MAX_CACHE_SIZE) {
      const oldestId = _resultsCacheOrder.shift();
      delete _resultsCache[oldestId];
    }
  }

  let _modifKey = 'Alt+';
  /**
   * Maps keycodes to their corresponding display names.
   * Used for shortcut normalization with C (Control), A (Alt), S (Shift) modifiers.
   * @const {Object<number, string>}
   */
  // prettier-ignore
  const _KEYCODE_TO_CHAR = {
        65:'A',66:'B',67:'C',68:'D',69:'E',70:'F',71:'G',72:'H',73:'I',74:'J',75:'K',76:'L',
        77:'M',78:'N',79:'O',80:'P',81:'Q',82:'R',83:'S',84:'T',85:'U',86:'V',87:'W',88:'X',
        89:'Y',90:'Z', 48:'0',49:'1',50:'2',51:'3',52:'4',53:'5',54:'6',55:'7',56:'8',57:'9',
        112:'F1',113:'F2',114:'F3',115:'F4',116:'F5',117:'F6',118:'F7',119:'F8',120:'F9',121:'F10',122:'F11',123:'F12',
        32:'Space',13:'Enter',9:'Tab',27:'Esc',8:'Backspace',46:'Delete',36:'Home',35:'End',33:'PageUp',34:'PageDown',45:'Insert',
        37:'←',38:'↑',39:'→',40:'↓', 188:',',190:'.',191:'/',186:';',222:"'",219:'[',221:']',220:'\\',189:'-',187:'=',192:'`',
    };

  /** Reverse mapping: display name to keycode. @const {Object<string, number>} */
  const _CHAR_TO_KEYCODE = Object.fromEntries(Object.entries(_KEYCODE_TO_CHAR).map(([k, v]) => [v.toUpperCase(), Number(k)]));

  /** Bitwise values for modifier keys: C=Control(1), S=Shift(2), A=Alt(4). @const {Object<string, number>} */
  const _MOD_CHAR_TO_VAL = { C: 1, S: 2, A: 4 };

  // Whitelisting vars
  let _venueWhitelist;
  const WL_BUTTON_TEXT = 'WL';
  const WL_LOCAL_STORE_NAME = 'WMEPH-venueWhitelistNew';
  const WL_LOCAL_STORE_NAME_COMPRESSED = 'WMEPH-venueWhitelistCompressed';

  // Pending feed request tracker (prevents duplicate banners from async race conditions)
  let _pendingFeedRequest;

  // Dupe check variables
  let _dupeLayer;
  let _dupeIDList = [];
  let _dupeHNRangeList;
  let _dupeHNRangeDistList;

  // Web search window specifications
  let _searchResultsWindowSpecs = `"resizable=yes, top=${Math.round(window.screen.height * 0.1)}, left=${Math.round(
    window.screen.width * 0.3,
  )}, width=${Math.round(window.screen.width * 0.7)}, height=${Math.round(window.screen.height * 0.8)}"`;
  const SEARCH_RESULTS_WINDOW_NAME = '"WMEPH Search Results"';
  let _wmephMousePosition;
  let _cloneMaster = null;

  // Banner UI elements
  let _buttonBanner2;
  let _servicesBanner;
  let _dupeBanner;

  // State flags
  let _disableHighlightTest = false; // Set to true to temporarily disable highlight checks immediately when venues change.
  let _isHarmonizing = false; // Prevent recursive harmonization when venue data changes during harmonization
  let _previousVenueServices = null; // Tracks services state to detect services-only changes

  // User information object
  const USER = {
    ref: null,
    rank: null,
    name: null,
    isBetaUser: false,
    isDevUser: false,
  };

  // Userlists
  let _wmephDevList;
  let _wmephBetaList;
  let _userLanguage;

  // Setting identifiers
  const SETTING_IDS = {
    sfUrlWarning: 'SFURLWarning', // Warning message for first time using localized storefinder URL.
    gLinkWarning: 'GLinkWarning', // Warning message for first time using Google search to not to use the Google info itself.
  };

  // Reference URLs
  const URLS = {
    forum: 'https://www.waze.com/discuss/t/script-wme-place-harmonizer/178574',
    usaPnh: 'https://docs.google.com/spreadsheets/d/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/edit#gid=0',
    placesWiki: 'https://www.waze.com/discuss/t/places/377947',
    restAreaWiki: 'https://www.waze.com/discuss/t/rest-areas/378691',
    uspsWiki: 'https://www.waze.com/discuss/t/post-office-places/378648',
  };

  // Master Service Key Mapping Reference
  // Maps PNH service keys (from Google Sheet ps_* columns) to code banner keys and WME Service IDs
  // Format: Sheet (ps_*) → Code (add*) → WME Service ID
  // Currently used (12): ps_valet, ps_drivethru, ps_wifi, ps_restrooms, ps_cc, ps_reservations, ps_outside, ps_ac, ps_parking, ps_deliveries, ps_takeaway, ps_wheelchair
  // Available for expansion (14): ps_curbside, ps_disability_parking, ps_airport_shuttle, ps_carwash, ps_carpool_parking, ps_covered, ps_ev_charging_station, ps_on_site_attendant, ps_park_and_ride, ps_security, ps_reservations_pl, ps_valet_pl, ps_vallet_service_pl, ps_247
  // Sheet owners can add new services by adding them to the Categories section (ps_* columns) in the PNH Google Sheet.
  const PNH_TO_BANNER_SERVICE_KEY_MAP = {
    // General Services (GENERAL_SERVICE_TYPE)
    ps_valet: 'addValet', // VALLET_SERVICE
    ps_drivethru: 'addDriveThru', // DRIVETHROUGH
    ps_wifi: 'addWiFi', // WI_FI
    ps_restrooms: 'addRestrooms', // RESTROOMS
    ps_cc: 'addCreditCards', // CREDIT_CARDS
    ps_reservations: 'addReservations', // RESERVATIONS
    ps_outside: 'addOutside', // OUTSIDE_SEATING
    ps_ac: 'addAC', // AIR_CONDITIONING
    ps_parking: 'addParking', // PARKING_FOR_CUSTOMERS
    ps_deliveries: 'addDeliveries', // DELIVERIES
    ps_takeaway: 'addTakeAway', // TAKE_AWAY
    ps_wheelchair: 'addWheelchair', // WHEELCHAIR_ACCESSIBLE
    ps_curbside: 'addCurbside', // CURBSIDE_PICKUP
    // Parking Lot Services (PARKING_LOT_SERVICE_TYPE)
    ps_disability_parking: 'addDisabilityParking', // DISABILITY_PARKING
    ps_airport_shuttle: 'addAirportShuttle', // AIRPORT_SHUTTLE
    ps_carwash: 'addCarWash', // CAR_WASH
    ps_carpool_parking: 'addCarpoolParking', // CARPOOL_PARKING
    ps_covered: 'addCovered', // COVERED
    ps_ev_charging_station: 'addEVChargingStation', // EV_CHARGING_STATION
    ps_on_site_attendant: 'addOnSiteAttendant', // ON_SITE_ATTENDANT
    ps_park_and_ride: 'addParkAndRide', // PARK_AND_RIDE
    ps_security: 'addSecurity', // SECURITY
    ps_reservations_pl: 'addReservationsPL', // RESERVATIONS
    ps_valet_pl: 'addValetPL', // VALET
    ps_vallet_service_pl: 'addValletServicePL', // VALLET_SERVICE
    // Special
    ps_247: 'add247', // (hours only, not a service ID)
  };

  // CAT and SUB CAT Stuff
  let CAT = {};
  let SUBCATEGORIES_BY_ID = {};

  let _catTransWaze2Lang; // pulls the category translations
  const EV_PAYMENT_METHOD = {
    APP: 'APP',
    CREDIT: 'CREDIT',
    DEBIT: 'DEBIT',
    MEMBERSHIP_CARD: 'MEMBERSHIP_CARD',
    ONLENE_PAYMENT: 'ONLINE_PAYMENT',
    PLUG_IN_AUTO_CHARGER: 'PLUG_IN_AUTO_CHARGE',
    OTHER: 'OTHER',
  };
  // Common payment types found at: https://wazeopedia.waze.com/wiki/USA/Places/EV_charging_station
  const /* The above code is a comment in JavaScript. It appears to be defining a constant or variable
  named COMMON_EV_PAYMENT_METHODS and using a delimiter " */

    COMMON_EV_PAYMENT_METHODS = {
      'Blink Charging': [EV_PAYMENT_METHOD.APP, EV_PAYMENT_METHOD.MEMBERSHIP_CARD, EV_PAYMENT_METHOD.PLUG_IN_AUTO_CHARGER, EV_PAYMENT_METHOD.OTHER],
      ChargePoint: [EV_PAYMENT_METHOD.APP, EV_PAYMENT_METHOD.CREDIT, EV_PAYMENT_METHOD.DEBIT, EV_PAYMENT_METHOD.MEMBERSHIP_CARD],
      'Electrify America': [EV_PAYMENT_METHOD.APP, EV_PAYMENT_METHOD.CREDIT, EV_PAYMENT_METHOD.DEBIT, EV_PAYMENT_METHOD.MEMBERSHIP_CARD, EV_PAYMENT_METHOD.PLUG_IN_AUTO_CHARGER],
      EVgo: [EV_PAYMENT_METHOD.APP, EV_PAYMENT_METHOD.CREDIT, EV_PAYMENT_METHOD.DEBIT, EV_PAYMENT_METHOD.MEMBERSHIP_CARD, EV_PAYMENT_METHOD.PLUG_IN_AUTO_CHARGER],
      SemaConnect: [EV_PAYMENT_METHOD.APP, EV_PAYMENT_METHOD.MEMBERSHIP_CARD, EV_PAYMENT_METHOD.OTHER],
      Tesla: [EV_PAYMENT_METHOD.PLUG_IN_AUTO_CHARGER],
    };
  const GENERAL_SERVICES = [
    'VALLET_SERVICE',
    'DRIVETHROUGH',
    'WI_FI',
    'RESTROOMS',
    'CREDIT_CARDS',
    'RESERVATIONS',
    'OUTSIDE_SEATING',
    'AIR_CONDITIONING',
    'PARKING_FOR_CUSTOMERS',
    'DELIVERIES',
    'TAKE_AWAY',
    'CURBSIDE_PICKUP',
    'WHEELCHAIR_ACCESSIBLE',
  ];
  const PARKING_LOT_SERVICES = [
    'AIRPORT_SHUTTLE',
    'CAR_WASH',
    'CARPOOL_PARKING',
    'COVERED',
    'DISABILITY_PARKING',
    'EV_CHARGING_STATION',
    'ON_SITE_ATTENDANT',
    'PARK_AND_RIDE',
    'RESERVATIONS',
    'SECURITY',
    'VALET',
    'VALLET_SERVICE',
  ];
  const WME_SERVICES_ARRAY = [...GENERAL_SERVICES, ...PARKING_LOT_SERVICES];

  const COLLEGE_ABBREVIATIONS = ['USF', 'USFSP', 'UF', 'UCF', 'UA', 'UGA', 'FSU', 'UM', 'SCP', 'FAU', 'FIU'];
  // Change place.name to title case
  const TITLECASE_SETTINGS = {
    ignoreWords: 'an|and|as|at|by|for|from|hhgregg|in|into|of|on|or|the|to|with'.split('|'),
    // eslint-disable-next-line max-len
    capWords:
      '3M|AAA|AMC|AOL|AT&T|ATM|BBC|BLT|BMV|BMW|BP|CBS|CCS|CGI|CISCO|CJ|CNG|CNN|CVS|DHL|DKNY|DMV|DSW|EMS|ER|ESPN|FCU|FCUK|FDNY|GNC|H&M|HP|HSBC|IBM|IHOP|IKEA|IRS|JBL|JCPenney|KFC|LLC|MBNA|MCA|MCI|NBC|NYPD|PDQ|PNC|TCBY|TNT|TV|UPS|USA|USPS|VW|XYZ|ZZZ'.split(
        '|',
      ),
    specWords: "d'Bronx|iFix|ExtraMile|ChargePoint|EVgo|SemaConnect".split('|'),
  };
  const NO_NUM_SKIP = [
    'BANK',
    'ATM',
    'HOTEL',
    'MOTEL',
    'STORE',
    'MARKET',
    'SUPERMARKET',
    'GYM',
    'GAS',
    'GASOLINE',
    'GASSTATION',
    'CAFE',
    'OFFICE',
    'OFFICES',
    'CARRENTAL',
    'RENTALCAR',
    'RENTAL',
    'SALON',
    'BAR',
    'BUILDING',
    'LOT',
    ...COLLEGE_ABBREVIATIONS,
  ];
  // These arrays are populated lazily after CAT is initialized
  const getPrimaryCatsToIgnoreMissingPhoneUrl = () => ['ISLAND', 'SEA_LAKE_POOL', 'RIVER_STREAM', 'CANAL', 'JUNCTION_INTERCHANGE', 'SCENIC_LOOKOUT_VIEWPOINT', 'SWAMP_MARSH'];
  const getPrimaryCatsToFlagGreenMissingPhoneUrl = () => ['BRIDGE', 'FOREST_GROVE', 'DAM', 'TUNNEL', 'CEMETERY'];
  const getAnyCatsToFlagGreenMissingPhoneUrl = () => ['REST_AREAS'];
  const REGIONS_THAT_WANT_PLA_PHONE_URL = ['SER'];
  const getChainApprovalPrimaryCatsToIgnore = () => [
    'POST_OFFICE',
    'BRIDGE',
    'FOREST_GROVE',
    'DAM',
    'TUNNEL',
    'CEMETERY',
    'ISLAND',
    'SEA_LAKE_POOL',
    'SWAMP_MARSH',
    'RIVER_STREAM',
    'CANAL',
    'JUNCTION_INTERCHANGE',
    'SCENIC_LOOKOUT_VIEWPOINT',
  ];
  const BAD_URL = 'badURL';
  const BAD_PHONE = 'badPhone';
  // Feeds that are not in use and it's safe to delete the place. Use regex.
  const FEEDS_TO_SKIP = [/^google$/i, /^yext\d?/i, /^wazeads$/i, /^parkme$/i, /^navads(na)?$/i];

  const UPDATED_FIELDS = {
    name: {
      updated: false,
      selector: '#venue-edit-general wz-text-input[name="name"]',
      shadowSelector: 'input',
      tab: 'general',
    },
    aliases: {
      updated: false,
      selector: '#venue-edit-general > div.aliases.form-group > wz-list',
      tab: 'general',
    },
    address: {
      updated: false,
      selector: '#venue-edit-general div.address-edit-view div.full-address-container',
      tab: 'general',
    },
    categories: {
      updated: false,
      selector: '#venue-edit-general > div.categories-control.form-group > wz-card',
      shadowSelector: 'div',
      tab: 'general',
    },
    description: {
      updated: false,
      selector: '#venue-edit-general wz-textarea[name="description"]',
      shadowSelector: 'textarea',
      tab: 'general',
    },
    lockRank: {
      updated: false,
      selector: '#venue-edit-general > div.lock-edit',
      tab: 'general',
    },
    externalProvider: {
      updated: false,
      selector: '#venue-edit-general > div.external-providers-control.form-group > wz-list',
      tab: 'general',
    },
    brand: { updated: false, selector: '.venue .brand .select2-container', tab: 'general' },
    url: {
      updated: false,
      selector: '#venue-url',
      shadowSelector: 'input',
      tab: 'more-info',
    },
    phone: {
      updated: false,
      selector: '#venue-phone',
      shadowSelector: 'input',
      tab: 'more-info',
    },
    openingHours: {
      updated: false,
      selector: '#venue-edit-more-info div.opening-hours.form-group > wz-list',
      tab: 'more-info',
    },
    cost: {
      updated: false,
      selector: '#venue-edit-more-info wz-select[name="costType"]',
      shadowSelector: 'div.select-box',
      tab: 'more-info',
    },
    canExit: { updated: false, selector: '.venue label[for="can-exit-checkbox"]', tab: 'more-info' },
    hasTBR: { updated: false, selector: '.venue label[for="has-tbr"]', tab: 'more-info' },
    lotType: { updated: false, selector: '#venue-edit-more-info > form > div:nth-child(1) > wz-radio-group', tab: 'more-info' },
    parkingSpots: {
      updated: false,
      selector: '#venue-edit-more-info wz-select[name="estimatedNumberOfSpots"]',
      shadowSelector: '#select-wrapper > div',
      tab: 'more-info',
    },
    lotElevation: { updated: false, selector: '.venue .lot-checkbox', tab: 'more-info' },
    evNetwork: { updated: false, selector: '', tab: 'general' },
    evPaymentMethods: {
      updated: false,
      selector: '#venue-edit-general > div.charging-station-controls div.wz-multiselect > wz-card',
      shadowSelector: 'div',
      tab: 'general',
    },
    evCostType: {
      updated: false,
      selector: '#venue-edit-general > div.charging-station-controls > wz-select',
      shadowSelector: '#select-wrapper > div > div',
      tab: 'general',
    },

    getFieldProperties() {
      return Object.keys(this)
        .filter((key) => this[key].hasOwnProperty('updated'))
        .map((key) => this[key]);
    },
    getUpdatedTabNames() {
      return uniq(
        this.getFieldProperties()
          .filter((prop) => prop.updated)
          .map((prop) => prop.tab),
      );
    },
    reset() {
      this.clearEditPanelHighlights();
      this.getFieldProperties().forEach((prop) => {
        prop.updated = false;
      });
    },
    init() {
      uniq(WME_SERVICES_ARRAY).forEach((service) => {
        const propName = `services_${service}`;
        this[propName] = { updated: false, selector: `.venue label[for="service-checkbox-${service}"]`, tab: 'more-info' };
      });

      sdk.Events.on({ eventName: 'wme-selection-changed', eventHandler: () => errorHandler(() => this.reset()) });
    },
    getTabElement(tabName) {
      let tabText;
      if (tabName === 'more-info') {
        tabText = 'More info';
      } else if (tabName === 'general') {
        tabText = 'General';
      } else {
        return null;
      }
      const tabElements = document.querySelector('#edit-panel div.venue-edit-section > wz-tabs')?.shadowRoot?.querySelectorAll('.wz-tab-label');
      if (tabElements) {
        return [...tabElements].filter((elem) => elem.textContent === tabText)[0];
      }
      return null;
    },
    clearEditPanelHighlights() {
      this.getFieldProperties()
        .filter((prop) => prop.updated)
        .forEach((prop) => {
          if (prop.shadowSelector) {
            $(document.querySelector(prop.selector)?.shadowRoot?.querySelector(prop.shadowSelector)).css('background-color', '');
          } else {
            $(prop.selector).css({ 'background-color': '' });
          }
          $(this.getTabElement(prop.tab)).css({ 'background-color': '' });
        });
    },
    // Highlight fields in the editor panel that have been updated by WMEPH.
    updateEditPanelHighlights() {
      // This setTimeout is necessary to get some highlights to work.
      setTimeout(() => {
        this.getFieldProperties()
          .filter((prop) => prop.updated)
          .forEach((prop) => {
            if (prop.shadowSelector) {
              $(document.querySelector(prop.selector)?.shadowRoot?.querySelector(prop.shadowSelector)).css('background-color', '#dfd');
            } else {
              $(prop.selector).css({ 'background-color': '#dfd' });
            }
            $(this.getTabElement(prop.tab)).css({ 'background-color': '#dfd' });
          });
      }, 100);
    },
    checkNewAttributes(newAttributes, venue) {
      const checkAttribute = (name) => {
        if (newAttributes.hasOwnProperty(name)) {
          // SDK venues have flattened properties, not nested in .attributes
          const oldValue = venue[name];
          const newValue = newAttributes[name];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            UPDATED_FIELDS[name].updated = true;
          }
        }
      };
      checkAttribute('categories');
      checkAttribute('name');
      checkAttribute('openingHours');
      checkAttribute('description');
      checkAttribute('aliases');
      checkAttribute('url');
      checkAttribute('phone');
      checkAttribute('lockRank');
    },
  };
  // PNH DATA
  const PNH_DATA = {
    /** @type {Country} */
    USA: null,
    /** @type {Country} */
    CAN: null,
  };
  // Split out state-based data
  let _psStateIx;
  let _psState2LetterIx;
  let _psRegionIx;
  let _psGoogleFormStateIx;
  let _psDefaultLockLevelIx;
  let _psAreaCodeIx;
  let _stateDataTemp;
  let _areaCodeList = '800,822,833,844,855,866,877,888'; //  include toll free non-geographic area codes

  let OpeningHour;
  const DEFAULT_HOURS_TEXT = 'Paste hours here';

  // GOOGLE LINK STUFF
  let _googlePlacePtFeature;
  let _googlePlaceLineFeature;
  let _destroyGooglePlacePointTimeoutId;

  // CSS STUFF
  const _CSS = `
    #edit-panel .venue-feature-editor {
        overflow: initial;
    }
    #sidebar .wmeph-pane {
        width: auto;
        padding: 8px !important;
    }
    #WMEPH_banner .wmeph-btn {
        background-color: #fbfbfb;
        box-shadow: 0 2px 0 #aaa;
        border: solid 1px #bbb;
        font-weight:normal;
        margin-bottom: 2px;
        margin-right:4px
    }
    .wmeph-btn, .wmephwl-btn {
        height: 19px;
        font-family: "Boing", sans-serif;
    }
    .btn.wmeph-btn {
        padding: 0px 3px;
    }
    .btn.wmephwl-btn {
        padding: 0px 1px 0px 2px;
        height: 18px;
        box-shadow: 0 2px 0 #b3b3b3;
    }

    #WMEPH_banner .banner-row {
        padding:2px 4px;
        cursor: default;
    }
    #WMEPH_banner .banner-row.red {
        color:#b51212;
        background-color: #f0dcdc;
    }
    #WMEPH_banner .banner-row.blue {
        color:#3232e6;
        background-color: #dcdcf0;
    }
    #WMEPH_banner .banner-row.yellow {
        color:#584a04;
        background-color: #f0f0c2;
    }
    #WMEPH_banner .banner-row.gray {
        color:#3a3a3a;
        background-color: #eeeeee;
    }
    #WMEPH_banner .banner-row.orange {
        color:#754900;
        background-color: #ffd389
    }
    #WMEPH_banner .banner-row.lightgray {
        color:#3a3a3a;
        background-color: #f5f5f5;
    }
    #WMEPH_banner .banner-row .dupe {
        padding-left:8px;
    }
    #WMEPH_banner {
        background-color:#fff;
        color:black; font-size:14px;
        padding-top:8px;
        padding-bottom:8px;
        margin-left:4px;
        margin-right:4px;
        line-height:18px;
        margin-top:2px;
        border: solid 1px #8d8c8c;
        border-radius: 6px;
        margin-bottom: 4px;
    }
    #WMEPH_banner input[type=text] {
        font-size: 13px !important;
        height:22px !important;
        font-family: "Open Sans", Alef, helvetica, sans-serif !important;
    }
    #WMEPH_banner div:last-child {
        padding-bottom: 3px !important;
    }
    #wmeph-run-panel {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        padding: 4px;
        color: black;
        font-size: 14px;
    }
    #wmeph-run-panel .wmeph-run-btn {
        flex: 1 0 83px;
        min-width: 83px;
        height: 28px;
        padding: 4px 8px !important;
        font-size: 12px !important;
        border-radius: 14px;
        border: 1px solid;
        background-color: transparent !important;
        box-shadow: none !important;
    }
    #wmeph-run-panel .wmeph-btn {
        flex: 0 1 auto;
        height: 28px;
    }
    #wmeph-run-panel .wmeph-clone-row {
        display: flex;
        // flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        // justify-content: space-around;
        // margin-top: 4px;
    }
    #wmeph-run-panel .wmeph-clone-btn {
        height: 18px !important;
        padding: 0px 10px !important;
        font-size: 9px !important;
        border-radius: 9px;
        border: 1px solid;
        background-color: transparent !important;
        box-shadow: none !important;
        transition: all 0.2s ease;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    #wmeph-run-panel .wmeph-clone-btn.btn-warning {
        border-color: #e37400 !important;
        color: #e37400 !important;
    }
    #wmeph-run-panel .wmeph-clone-btn.btn-warning:hover {
        background-color: rgba(227, 116, 0, 0.1) !important;
        border-color: #ffc400 !important;
    }
    #wmeph-run-panel .wmeph-clone-btn.btn-info {
        border-color: #0099ff !important;
        color: #0099ff !important;
    }
    #wmeph-run-panel .wmeph-clone-btn.btn-info:hover {
        background-color: rgba(0, 153, 255, 0.1) !important;
        border-color: #33ccff !important;
    }
    #wmeph-run-panel .wmeph-clone-row .wmeph-icon-toggle {
        font-size: 18px !important;
        color: #0075e3;
    }
    #wmeph-run-panel .wmeph-clone-row .wmeph-icon-toggle i {
        font-size: 18px !important;
    }
    #wmeph-run-panel .wmeph-clone-row .wmeph-icon-toggle:hover {
        transform: scale(1.1);
    }
    [wz-theme="dark"] #wmeph-run-panel .wmeph-clone-row .wmeph-icon-toggle {
        color: #33ccff;
    }
    /* Waze color palette - Chip/outline style */
    #runWMEPH {
        border-color: #0075e3 !important;
        color: #0075e3 !important;
        transition: all 0.2s ease;
    }
    #runWMEPH:hover {
        background-color: rgba(0, 153, 255, 0.1) !important;
        border-color: #0099ff !important;
    }
    #WMEPHurl {
        border-color: #118742 !important;
        color: #118742 !important;
        transition: all 0.2s ease;
    }
    #WMEPHurl:hover {
        background-color: rgba(27, 171, 80, 0.1) !important;
        border-color: #1bab50 !important;
    }
    #wmephSearch {
        border-color: #0099ff !important;
        color: #0099ff !important;
        transition: all 0.2s ease;
    }
    #wmephSearch:hover {
        background-color: rgba(51, 204, 255, 0.1) !important;
        border-color: #33ccff !important;
    }
    #wmephPlugShareSearch {
        border-color: #118742 !important;
        color: #118742 !important;
        transition: all 0.2s ease;
    }
    #wmephPlugShareSearch:hover {
        background-color: rgba(30, 171, 146, 0.1) !important;
        border-color: #1ee592 !important;
    }
    #WMEPH_tools {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        padding: 4px 6px !important;
    }
    #WMEPH_tools > div {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
    }
    #WMEPH_tools .wmeph-btn {
        padding: 2px 6px !important;
        margin-bottom: 0 !important;
        margin-right: 0 !important;
        font-size: 12px;
        height: 18px;
        flex-shrink: 0;
    }
    #WMEPH_tools .wmeph-clone-btn {
        height: 18px !important;
        padding: 0px 10px !important;
        font-size: 9px !important;
        border-radius: 9px;
        border: 1px solid;
        background-color: transparent !important;
        box-shadow: none !important;
        transition: all 0.2s ease;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    #WMEPH_tools .wmeph-clone-btn.btn-info {
        border-color: #0099ff !important;
        color: #0099ff !important;
    }
    #WMEPH_tools .wmeph-clone-btn.btn-info:hover {
        background-color: rgba(0, 153, 255, 0.1) !important;
        border-color: #33ccff !important;
    }
    .wmeph-fat-btn {
        padding-left:8px;
        padding-right:8px;
        padding-top:4px;
        margin-right:3px;
        display:inline-block;
        font-weight:normal;
        height:24px;
        font-family: "Boing", sans-serif;
    }
    .ui-autocomplete {
        max-height: 300px;
        overflow-y: auto;
        overflow-x: hidden;
    }
    .wmeph-hr {
        border-color: #ccc;
    }
    .wmeph-hr {
        border-color: #ccc;
    }

    @keyframes highlight {
        0% {
            background: #ffff99;
        }
        100% {
            background: none;
        }
    }

    .highlight {
        animation: highlight 1.5s;
    }

    .google-logo {
        /*font-size: 16px*/
    }
    .google-logo.red{
        color: #ea4335
    }
    .google-logo.blue {
        color: #4285f4
    }
    .google-logo.orange {
        color: #fbbc05
    }
    .google-logo.green {
        color: #34a853
    }

    /* WMEPH Section Wrapper - Phase 1 Incremental */
    .wmeph-section {
        background-color: #fff;
        border: solid 1px #8d8c8c;
        border-radius: 6px;
        margin: 2px 4px 4px 4px;
    }
    [wz-theme="dark"] .wmeph-section {
        background-color: #2c2c2c;
        border-color: #5f6368;
    }

    .wmeph-section-header {
        display: flex;
        align-items: center;
        background: linear-gradient(to right, #f5f5f5 0%, #ffffff 100%);
        border-bottom: 1px solid #dadce0;
        padding: 2px 2px;
        font-weight: 600;
        font-size: 14px;
        color: #202124;
        cursor: default;
        user-select: none;
    }
    [wz-theme="dark"] .wmeph-section-header {
        background: linear-gradient(to right, #3a3a3a 0%, #2c2c2c 100%);
        border-bottom-color: #5f6368;
        color: #e8eaed;
    }

    .wmeph-section-body {
        padding: 4px 0;
    }
    `;

  // **************************************************************************************************************
  // UTILITY/HELPER FUNCTIONS
  // **************************************************************************************************************

  /**
   * Checks if a value is null, undefined, or contains only whitespace.
   * @param {string} str - String value to check
   * @returns {boolean} True if null, undefined, or whitespace-only; false otherwise
   */
  function isNullOrWhitespace(str) {
    return !str?.trim().length;
  }

  /**
   * Calculates total distance along a path of points (polyline length).
   * Sums the distances between consecutive points in the array.
   * @param {number[][]|object[]} pointArray - Array of points as [lon, lat] arrays or {longitude, latitude} objects
   * @returns {number} Total distance in meters along the polyline
   */
  function calculateDistance(pointArray) {
    if (pointArray.length < 2) return 0;

    const line = turf.lineString(pointArray);
    const length = turf.length(line, { units: 'meters' });
    return length; //multiply by 3.28084 to convert to feet
  }

  /**
   * Returns array with duplicate values removed (unique elements only).
   * Uses Set to efficiently deduplicate while preserving first-occurrence order.
   * @param {array} arrayIn - Input array containing potential duplicates
   * @returns {array} New array containing unique elements from input array
   */
  function uniq(arrayIn) {
    return [...new Set(arrayIn)];
  }

  function sortWithIndex(toSort) {
    for (let i = 0; i < toSort.length; i++) {
      toSort[i] = [toSort[i], i];
    }
    toSort.sort((left, right) => (left[0] < right[0] ? -1 : 1));
    toSort.sortIndices = [];
    for (let j = 0; j < toSort.length; j++) {
      toSort.sortIndices.push(toSort[j][1]);
      // eslint-disable-next-line prefer-destructuring
      toSort[j] = toSort[j][0];
    }
    return toSort;
  }

  function log(...args) {
    console.log(`WMEPH${IS_BETA_VERSION ? '-β' : ''}:`, ...args);
  }

  function logDev(...args) {
    if (USER.isDevUser) {
      console.debug(`WMEPH${IS_BETA_VERSION ? '-β' : ''} (dev):`, ...args);
    }
  }

  function errorHandler(callback, ...args) {
    try {
      callback(...args);
    } catch (ex) {
      logDev(ex);
    }
  }

  // **************************************************************************************************************
  // SETTINGS/STORAGE FUNCTIONS
  // **************************************************************************************************************

  function getWMEPHSetting(key, defaultValue = null) {
    return wmephSettings[key] !== undefined ? wmephSettings[key] : defaultValue;
  }

  function setWMEPHSetting(key, value) {
    wmephSettings[key] = value;
    // Don't include internal metadata (_migrationVersion) when saving to localStorage
    const settingsToSave = Object.fromEntries(Object.entries(wmephSettings).filter(([k]) => !k.startsWith('_')));
    localStorage.setItem('WMEPH-Settings', JSON.stringify(settingsToSave));
  }

  function saveWhitelistToLS(compress) {
    let wlString = JSON.stringify(_venueWhitelist);
    if (compress) {
      if (wlString.length < 4800000) {
        // Also save to regular storage as a back up
        localStorage.setItem(WL_LOCAL_STORE_NAME, wlString);
      }
      wlString = LZString.compressToUTF16(wlString);
      localStorage.setItem(WL_LOCAL_STORE_NAME_COMPRESSED, wlString);
    } else {
      localStorage.setItem(WL_LOCAL_STORE_NAME, wlString);
    }
  }

  function loadWhitelistFromLS(decompress) {
    let wlString;
    if (decompress) {
      wlString = localStorage.getItem(WL_LOCAL_STORE_NAME_COMPRESSED);
      if (!wlString) {
        logDev('Compressed whitelist not found, trying uncompressed fallback');
        wlString = localStorage.getItem(WL_LOCAL_STORE_NAME);
      } else {
        wlString = LZString.decompressFromUTF16(wlString);
      }
    } else {
      wlString = localStorage.getItem(WL_LOCAL_STORE_NAME);
    }

    if (!wlString) {
      logDev('No whitelist found in localStorage');
      _venueWhitelist = {};
      return;
    }

    try {
      _venueWhitelist = JSON.parse(wlString);
    } catch (e) {
      logDev('Error parsing whitelist:', e);
      _venueWhitelist = {};
    }
  }

  function backupWhitelistToLS(compress) {
    let wlString = JSON.stringify(_venueWhitelist);
    if (compress) {
      wlString = LZString.compressToUTF16(wlString);
      localStorage.setItem(WL_LOCAL_STORE_NAME_COMPRESSED + Math.floor(Date.now() / 1000), wlString);
    } else {
      localStorage.setItem(WL_LOCAL_STORE_NAME + Math.floor(Date.now() / 1000), wlString);
    }
  }

  // **************************************************************************************************************
  // SHORTCUT/KEYBOARD FUNCTIONS
  // **************************************************************************************************************

  function _comboToRaw(str) {
    if (!str || str === '' || str === '-1' || str === 'None') return null;
    if (/^\d+,-?\d+$/.test(str)) {
      const kc = parseInt(str.split(',')[1], 10);
      return kc < 0 ? null : str;
    }
    const s = String(str).toUpperCase();
    if (/^[A-Z0-9]$/.test(s)) return `0,${s.charCodeAt(0)}`;
    if (_CHAR_TO_KEYCODE[s] !== undefined) return `0,${_CHAR_TO_KEYCODE[s]}`;
    const mLetter = s.match(/^([ACS]+)\+([A-Z0-9])$/);
    if (mLetter) {
      const mod = mLetter[1].split('').reduce((a, c) => a | (_MOD_CHAR_TO_VAL[c] || 0), 0);
      return `${mod},${mLetter[2].charCodeAt(0)}`;
    }
    const mNumeric = s.match(/^([ACS]+)\+(\d+)$/);
    if (mNumeric) {
      const mod = mNumeric[1].split('').reduce((a, c) => a | (_MOD_CHAR_TO_VAL[c] || 0), 0);
      return `${mod},${mNumeric[2]}`;
    }
    const mSpecial = s.match(/^([ACS]+)\+(.+)$/);
    if (mSpecial && _CHAR_TO_KEYCODE[mSpecial[2]] !== undefined) {
      const mod = mSpecial[1].split('').reduce((a, c) => a | (_MOD_CHAR_TO_VAL[c] || 0), 0);
      return `${mod},${_CHAR_TO_KEYCODE[mSpecial[2]]}`;
    }
    return null;
  }

  /**
   * Converts raw "modifier,keycode" format to human-readable combo format (e.g. "A+R").
   * @param {string|null} str Raw format string or any shortcut value
   * @returns {string|null} Combo format string or null if no key
   */
  function _rawToCombo(str) {
    const raw = _comboToRaw(str);
    if (!raw) return null;
    const [modStr, keyStr] = raw.split(',');
    const mod = parseInt(modStr, 10);
    const keyCode = parseInt(keyStr, 10);
    const keyChar = _KEYCODE_TO_CHAR[keyCode] || String(keyCode);
    let mods = '';
    if (mod & 1) mods += 'C';
    if (mod & 2) mods += 'S';
    if (mod & 4) mods += 'A';
    return mods ? `${mods}+${keyChar}` : keyChar;
  }

  /**
   * Normalizes any shortcut value to a {raw, combo} pair for consistent storage.
   * @param {string|Object|null} val Shortcut value: string (any format), {raw,combo} object, or null
   * @returns {Object} Object with raw (keycode format) and combo (display format) properties
   */
  function _normalizeShortcut(val) {
    const src = val && typeof val === 'object' ? (val.raw ?? val.combo) : val;
    const raw = _comboToRaw(src);
    const combo = _rawToCombo(raw);
    return { raw, combo };
  }

  /**
   * Loads shortcut from settings in both raw and combo formats.
   * @param {string} settingsKey The settings key identifier
   * @returns {Object} Object with raw and combo properties
   */
  function loadShortcut(settingsKey) {
    const raw = getWMEPHSetting(`WMEPH_shortcut_${settingsKey}_raw`);
    const combo = getWMEPHSetting(`WMEPH_shortcut_${settingsKey}_combo`);
    return { raw: raw || null, combo: combo || null };
  }

  /**
   * Saves shortcut to settings in both raw and combo formats for consistency.
   * RAW format (keycodes) handles SDK inconsistencies, COMBO format aids debugging.
   * @param {string} settingsKey The settings key identifier
   * @param {string|Object|null} shortcutValue Shortcut value in any format
   */
  function saveShortcut(settingsKey, shortcutValue) {
    const normalized = _normalizeShortcut(shortcutValue);
    setWMEPHSetting(`WMEPH_shortcut_${settingsKey}_raw`, normalized.raw || '');
    setWMEPHSetting(`WMEPH_shortcut_${settingsKey}_combo`, normalized.combo || '');
  }

  /**
   * Loads the harmonize shortcut from UI-managed localStorage keys.
   * @returns {string|null} Shortcut in SDK combo format (e.g. "C+A+H")
   */
  function loadHarmonizeShortcut() {
    const keyLetter = getWMEPHSetting('WMEPH-KeyboardShortcut') || 'A';
    const useCtrl = getWMEPHSetting('WMEPH-KBSModifierKey') === '1';

    // Build SDK format with single-letter modifiers: C=Ctrl, S=Shift, A=Alt
    let sdkKey = '';
    if (useCtrl) sdkKey += 'C';
    if (/^[A-Z]{1}$/.test(keyLetter)) sdkKey += 'S'; // Add S if uppercase (means Shift)
    sdkKey += 'A'; // Add Alt modifier

    // Add the key letter (lowercase)
    const keyChar = keyLetter.toLowerCase();
    sdkKey += '+' + keyChar;

    const normalized = _normalizeShortcut(sdkKey);
    logDev(`loadHarmonizeShortcut: letter=${keyLetter}, useCtrl=${useCtrl}, sdkKey=${sdkKey}, raw=${normalized.raw}, combo=${normalized.combo}`);
    if (!normalized.combo) {
      logDev(`Failed to normalize harmonize shortcut key: ${sdkKey}`);
    }
    return normalized.combo || null; // Return null if normalization failed
  }

  /**
   * Registers an SDK shortcut with normalized combo format.
   * Stores both raw and combo formats for consistency, handles key conflicts.
   * @param {string} shortcutId Unique identifier for the shortcut
   * @param {string} description Human-readable description for the shortcut
   * @param {string|null} defaultKey Default shortcut key if none stored (combo or raw format)
   * @param {Function} callback Function to execute when shortcut is triggered
   */
  function registerShortcut(shortcutId, description, defaultKey, callback) {
    const stored = loadShortcut(shortcutId);
    const keyToUse = stored.combo || (defaultKey ? _normalizeShortcut(defaultKey).combo : null);

    try {
      // SDK only accepts combo format:
      //  "A" - press 'a' to trigger the shortcut
      //  "C+3" - press Ctrl-3 to trigger the shortcut
      //  "AS+32" - press Alt-Shift-Space to trigger the shortcut
      sdk.Shortcuts.createShortcut({
        shortcutId,
        description,
        callback,
        shortcutKeys: keyToUse,
      });

      // Re-fetch from SDK to capture what it stored, then normalize both formats
      const allShortcuts = sdk.Shortcuts.getAllShortcuts();
      const registered = allShortcuts.find((s) => s.shortcutId === shortcutId);
      if (registered?.shortcutKeys) {
        saveShortcut(shortcutId, registered.shortcutKeys);
        const normalized = _normalizeShortcut(registered.shortcutKeys);
        logDev(`Registered shortcut: ${shortcutId} = ${normalized.combo || 'none'}`);
      } else if (keyToUse) {
        saveShortcut(shortcutId, keyToUse);
        logDev(`Registered shortcut: ${shortcutId} = ${keyToUse}`);
      }
    } catch (ex) {
      if (String(ex).includes('already in use')) {
        // Shortcut keys conflict with another shortcut; register without keys
        logDev(`Shortcut "${shortcutId}" keys already in use, registering without keys`);
        try {
          sdk.Shortcuts.createShortcut({
            shortcutId,
            description,
            callback,
            shortcutKeys: null,
          });
          saveShortcut(shortcutId, null);
        } catch (ex2) {
          logDev(`Failed to register shortcut ${shortcutId} without keys: ${ex2}`);
        }
      } else {
        logDev(`Failed to register shortcut ${shortcutId}: ${ex}`);
      }
    }
  }

  // KB Shortcut object
  const SHORTCUT = {
    allShortcuts: {}, // All the shortcuts are stored in this array
    add(shortcutCombo, callback, opt) {
      // Provide a set of default options
      const defaultOptions = {
        type: 'keydown',
        propagate: false,
        disableInInput: false,
        target: document,
        keycode: false,
      };
      if (!opt) {
        opt = defaultOptions;
      } else {
        Object.keys(defaultOptions).forEach((dfo) => {
          if (typeof opt[dfo] === 'undefined') {
            opt[dfo] = defaultOptions[dfo];
          }
        });
      }
      let ele = opt.target;
      if (typeof opt.target === 'string') {
        ele = document.getElementById(opt.target);
      }
      shortcutCombo = shortcutCombo.toLowerCase();
      // The function to be called at keypress
      // eslint-disable-next-line func-names
      const func = function keyPressFunc(e) {
        e = e || window.event;
        if (opt.disableInInput) {
          // Don't enable shortcut keys in Input, Textarea fields
          let element;
          if (e.target) {
            element = e.target;
          } else if (e.srcElement) {
            element = e.srcElement;
          }
          if (element.nodeType === 3) {
            element = element.parentNode;
          }
          if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return;
          }
        }
        // Find Which key is pressed
        let code;
        if (e.keyCode) {
          code = e.keyCode;
        } else if (e.which) {
          code = e.which;
        }
        let character = String.fromCharCode(code).toLowerCase();
        if (code === 188) {
          character = ',';
        } // If the user presses , when the type is onkeydown
        if (code === 190) {
          character = '.';
        } // If the user presses , when the type is onkeydown
        const keys = shortcutCombo.split('+');
        // Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
        let kp = 0;
        // Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
        const shiftNums = {
          '`': '~',
          1: '!',
          2: '@',
          3: '#',
          4: '$',
          5: '%',
          6: '^',
          7: '&',
          8: '*',
          9: '(',
          0: ')',
          '-': '_',
          '=': '+',
          ';': ':',
          "'": '"',
          ',': '<',
          '.': '>',
          '/': '?',
          '\\': '|',
        };
        // Special Keys - and their codes
        const specialKeys = {
          esc: 27,
          escape: 27,
          tab: 9,
          space: 32,
          return: 13,
          enter: 13,
          backspace: 8,
          scrolllock: 145,
          // eslint-disable-next-line camelcase
          scroll_lock: 145,
          scroll: 145,
          capslock: 20,
          // eslint-disable-next-line camelcase
          caps_lock: 20,
          caps: 20,
          numlock: 144,
          // eslint-disable-next-line camelcase
          num_lock: 144,
          num: 144,
          pause: 19,
          break: 19,
          insert: 45,
          home: 36,
          delete: 46,
          end: 35,
          pageup: 33,
          // eslint-disable-next-line camelcase
          page_up: 33,
          pu: 33,
          pagedown: 34,
          // eslint-disable-next-line camelcase
          page_down: 34,
          pd: 34,
          left: 37,
          up: 38,
          right: 39,
          down: 40,
          f1: 112,
          f2: 113,
          f3: 114,
          f4: 115,
          f5: 116,
          f6: 117,
          f7: 118,
          f8: 119,
          f9: 120,
          f10: 121,
          f11: 122,
          f12: 123,
        };
        const modifiers = {
          shift: { wanted: false, pressed: false },
          ctrl: { wanted: false, pressed: false },
          alt: { wanted: false, pressed: false },
          meta: { wanted: false, pressed: false }, // Meta is Mac specific
        };
        if (e.ctrlKey) {
          modifiers.ctrl.pressed = true;
        }
        if (e.shiftKey) {
          modifiers.shift.pressed = true;
        }
        if (e.altKey) {
          modifiers.alt.pressed = true;
        }
        if (e.metaKey) {
          modifiers.meta.pressed = true;
        }
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          // Modifiers
          if (k === 'ctrl' || k === 'control') {
            kp++;
            modifiers.ctrl.wanted = true;
          } else if (k === 'shift') {
            kp++;
            modifiers.shift.wanted = true;
          } else if (k === 'alt') {
            kp++;
            modifiers.alt.wanted = true;
          } else if (k === 'meta') {
            kp++;
            modifiers.meta.wanted = true;
          } else if (k.length > 1) {
            // If it is a special key
            if (specialKeys[k] === code) {
              kp++;
            }
          } else if (opt.keycode) {
            if (opt.keycode === code) {
              kp++;
            }
          } else if (character === k) {
            // The special keys did not match
            kp++;
          } else if (shiftNums[character] && e.shiftKey) {
            // Stupid Shift key bug created by using lowercase
            character = shiftNums[character];
            if (character === k) {
              kp++;
            }
          }
        }

        if (
          kp === keys.length &&
          modifiers.ctrl.pressed === modifiers.ctrl.wanted &&
          modifiers.shift.pressed === modifiers.shift.wanted &&
          modifiers.alt.pressed === modifiers.alt.wanted &&
          modifiers.meta.pressed === modifiers.meta.wanted
        ) {
          callback(e);
          if (!opt.propagate) {
            // Stop the event
            // e.cancelBubble is supported by IE - this will kill the bubbling process.
            e.cancelBubble = true;
            e.returnValue = false;
            // e.stopPropagation works in Firefox.
            if (e.stopPropagation) {
              e.stopPropagation();
              e.preventDefault();
            }

            // 5/19/2019 (MapOMatic) Not sure if this return value is necessary.
            // eslint-disable-next-line consistent-return
            return false;
          }
        }
      };
      this.allShortcuts[shortcutCombo] = { callback: func, target: ele, event: opt.type };
      // Attach the function with the event
      if (ele.addEventListener) {
        ele.addEventListener(opt.type, func, false);
      } else if (ele.attachEvent) {
        ele.attachEvent(`on${opt.type}`, func);
      } else {
        ele[`on${opt.type}`] = func;
      }
    },
    // Remove a shortcut by specifying its key combination
    remove(shortcutCombo) {
      shortcutCombo = shortcutCombo.toLowerCase();
      const binding = this.allShortcuts[shortcutCombo];
      delete this.allShortcuts[shortcutCombo];
      if (!binding) {
        return;
      }
      const type = binding.event;
      const ele = binding.target;
      const { callback } = binding;
      if (ele.detachEvent) {
        ele.detachEvent(`on${type}`, callback);
      } else if (ele.removeEventListener) {
        ele.removeEventListener(type, callback, false);
      } else {
        ele[`on${type}`] = false;
      }
    },
  }; // END Shortcut function

  // **************************************************************************************************************
  // MAP/LAYER/GEOMETRY FUNCTIONS
  // **************************************************************************************************************

  /**
   * Redraws a layer to reflect style changes.
   * @param {string} layerName Name of the layer to redraw
   */
  function redrawLayer(layerName) {
    if (!layerName) return;
    try {
      sdk.Map.redrawLayer({ layerName });
    } catch (e) {
      logDev(`Failed to redraw layer ${layerName}:`, e);
    }
  }

  /**
   * Calculates the centroid (center point) of a venue's geometry using Turf.js.
   * For points, returns the point itself; for areas, calculates the geometric center.
   * @param {object} venue - Venue object with geometry property (GeoJSON format)
   * @returns {number[]|null} Coordinates as [longitude, latitude], or null if geometry invalid or missing
   */
  function getVenueCentroid(venue) {
    if (!venue?.geometry) return null;
    try {
      const point = turf.centroid(venue.geometry);
      return point.geometry.coordinates; // [lon, lat]
    } catch (e) {
      logDev('getVenueCentroid error:', e, venue);
      return null;
    }
  }

  /**
   * Calculates the distance between two geographic points using Turf.js.
   * Uses the haversine formula for great-circle distance (accounts for Earth's curvature).
   * @param {number[]|object} pt1 - First point as [longitude, latitude] array or {longitude, latitude} object
   * @param {number[]|object} pt2 - Second point as [longitude, latitude] array or {longitude, latitude} object
   * @returns {number} Distance in meters, or Infinity if either point is invalid
   */
  function calculatePointDistance(pt1, pt2) {
    if (!pt1 || !pt2) return Infinity;
    try {
      const coords1 = Array.isArray(pt1) ? pt1 : [pt1.longitude, pt1.latitude];
      const coords2 = Array.isArray(pt2) ? pt2 : [pt2.longitude, pt2.latitude];
      if (!coords1[0] || !coords2[0]) return Infinity; // Invalid coords

      return turf.distance(turf.point(coords1), turf.point(coords2), { units: 'meters' });
    } catch (e) {
      logDev('calculatePointDistance error:', e, pt1, pt2);
      return Infinity;
    }
  }

  /**
   * Gets the current map extent as a bounding box in WGS84 coordinates.
   * @returns {number[]|null} Bounding box [minLon, minLat, maxLon, maxLat], or null on error
   */
  function getMapBoundingBox() {
    try {
      const bbox = sdk.Map.getMapExtent();
      return bbox;
    } catch (e) {
      logDev('getMapBoundingBox error:', e);
      return null;
    }
  }

  // **************************************************************************************************************
  // VENUE/SEGMENT FUNCTIONS
  // **************************************************************************************************************

  /**
   * Retrieves address details for a venue using the WME SDK.
   * Returns house number, street, city, state, and postal code information.
   * @param {object} venue - Venue object with id property
   * @returns {object|null} Address object with {houseNumber, street, city, state, postalCode}, or null if invalid venue
   */
  function getVenueAddress(venue) {
    if (!venue || !venue.id) return null;
    return sdk.DataModel.Venues.getAddress({ venueId: venue.id });
  }

  /**
   * Retrieves address details for a segment using the WME SDK.
   * @param {object} segment Segment object with id property
   * @returns {object|null} Address object, or null if invalid segment
   */
  function getSegmentAddress(segment) {
    if (!segment || !segment.id) return null;
    return sdk.DataModel.Segments.getAddress({ segmentId: segment.id });
  }

  function getSelectedVenue() {
    const selection = sdk.Editing.getSelection();
    if (selection?.objectType === 'venue' && selection?.ids?.length === 1) {
      return sdk.DataModel.Venues.getById({ venueId: selection.ids[0] });
    }
    return null;
  }

  function getVenueLonLat(venue) {
    const centroid = turf.centroid(venue.geometry);
    return { longitude: centroid.geometry.coordinates[0], latitude: centroid.geometry.coordinates[1] };
  }

  function isAlwaysOpen(venue) {
    return is247Hours(venue.openingHours);
  }

  function is247Hours(openingHours) {
    if (!openingHours || openingHours.length !== 1) return false;
    const hours = openingHours[0];
    return hours.days?.length === 7 && hours.fromHour === '00:00' && hours.toHour === '00:00';
  }

  function isEmergencyRoom(venue) {
    return /(?:emergency\s+(?:room|department|dept))|\b(?:er|ed)\b/i.test(venue.name);
  }

  function isRestArea(venue) {
    return venue.categories.includes('REST_AREAS') && /rest\s*area/i.test(venue.name);
  }

  /**
   * Determines flag severity based on PVA (Place Verification Attribute) value.
   * Maps PVA codes to highlight colors: RED (missing/invalid), BLUE (confirmed), YELLOW (secondary), GREEN (ok).
   * Special handling for emergency rooms (coded as 'hosp' category).
   * @param {string} pvaValue - PVA code ("0", "2", "3", "hosp", "", etc.)
   * @param {object} venue - Venue object (used to check if hospital is emergency room)
   * @returns {number} Severity constant (SEVERITY.RED/BLUE/YELLOW/GREEN) for use in highlighting
   */
  function getPvaSeverity(pvaValue, venue) {
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

  /**
   * Checks if a venue is residential.
   * @param {object|null} venue Venue object with residential property or categories array
   * @returns {boolean} True if venue is residential
   */
  function isVenueResidential(venue) {
    if (!venue) return false;
    // SDK has venue.residential property and RESIDENTIAL category ID
    return venue.residential === true || venue.categories?.includes('RESIDENTIAL');
  }

  /**
   * Checks if a venue is a charging station.
   * @param {object|null} venue Venue object with categories array
   * @returns {boolean} True if venue's primary category is CHARGING_STATION
   */
  function isVenueChargingStation(venue) {
    if (!venue) return false;
    const primaryCategory = venue.categories?.[0];
    return primaryCategory === 'CHARGING_STATION';
  }

  /**
   * Checks if a venue is a parking lot.
   * @param {object|null} venue Venue object with categories array
   * @returns {boolean} True if venue has PARKING_LOT category
   */
  function isVenueParkingLot(venue) {
    if (!venue) return false;
    return venue.categories?.includes('PARKING_LOT') ?? false;
  }

  /**
   * Checks if a venue is a point geometry (not polygon or line).
   * @param {object|null} venue Venue object with geometry property
   * @returns {boolean} True if venue geometry type is Point
   */
  function isVenuePoint(venue) {
    if (!venue || !venue.geometry) return false;
    return venue.geometry.type === 'Point';
  }

  function isCategoryConfiguredAsArea(category, pnhCategoryInfos, regionCode) {
    if (!pnhCategoryInfos) return false;
    const categoryInfo = pnhCategoryInfos.getById(category);
    if (!categoryInfo) return false;
    // Regional override takes precedence
    if (regionCode && categoryInfo.regArea?.includes(regionCode)) {
      return true;
    }
    return categoryInfo.area === '1';
  }

  /**
   * Gets applicable services based on venue type.
   * @param {object} venue Venue object to check
   * @returns {object} Service configuration (PARKING_LOT_SERVICES or GENERAL_SERVICES)
   */
  function getApplicableServices(venue) {
    if (isVenueParkingLot(venue)) {
      return PARKING_LOT_SERVICES;
    }
    return GENERAL_SERVICES;
  }

  // **************************************************************************************************************
  // CLASSES
  // **************************************************************************************************************

  class Country {
    /** @type {string} */
    countryCode;
    /** @type {string} */
    countryName;
    /** @type {PnhCategoryInfos} */
    categoryInfos;
    /** @type {PnhEntry[]} */
    pnh;
    /** @type {Object<string, Region>} */
    regions;
    /** @type {PnhEntry[]} */
    closedChains;

    /**
     * Creates an instance of Country.
     * @param {string} code Country code, e.g. USA, CAN
     * @param {string} name Country name, for display purposes
     * @param {string[][]} allSpreadsheetData Raw data from Google Sheets API (2D array of rows)
     * @param {number} categoryColumnIndex Column index for category information
     * @param {number} pnhColumnIndex Column index for PNH data
     * @param {Object<string, Region>} regions Object mapping region codes to Region instances
     */
    constructor(code, name, allSpreadsheetData, categoryColumnIndex, pnhColumnIndex, regions) {
      this.countryCode = code;
      this.countryName = name;
      this.categoryInfos = new PnhCategoryInfos();
      Pnh.processCategories(Pnh.processImportedDataColumn(allSpreadsheetData, categoryColumnIndex), this.categoryInfos);
      this.pnh = Pnh.processPnhSSRows(allSpreadsheetData, pnhColumnIndex, this);
      this.closedChains = this.pnh.filter((entry) => entry.chainIsClosed);
      this.regions = regions;
    }
  }
  class Region {
    static #defaultNewChainRequestEntryIds = ['entry.925969794', 'entry.1970139752', 'entry.1749047694'];
    static #defaultApproveChainRequestEntryIds = ['entry.925969794', 'entry.50214576', 'entry.1749047694'];
    regionCode;
    #formId;
    #newChainRequestEntryIds;
    #approveChainRequestEntryIds;

    constructor(regionCode, formId, newChainRequestEntryIds, approveChainRequestEntryIds) {
      this.regionCode = regionCode;
      this.#formId = formId;
      this.#newChainRequestEntryIds = newChainRequestEntryIds ?? Region.#defaultNewChainRequestEntryIds;
      this.#approveChainRequestEntryIds = approveChainRequestEntryIds ?? Region.#defaultApproveChainRequestEntryIds;
    }

    #getFormUrl(entryIds, entryValues) {
      const entryValuesUrl = entryValues.map((value, idx) => `${entryIds[idx]}=${value}`).join('&');
      return `https://docs.google.com/forms/d/${this.#formId}/viewform?${entryValuesUrl}`;
    }

    getNewChainFormUrl(entryValues) {
      return this.#getFormUrl(this.#newChainRequestEntryIds, entryValues);
    }

    getApproveChainFormUrl(entryValues) {
      return this.#getFormUrl(this.#approveChainRequestEntryIds, entryValues);
    }
  }
  class PnhCategoryInfos {
    #categoriesById = {};
    #categoriesByName = {};

    add(categoryInfo) {
      this.#categoriesById[categoryInfo.id] = categoryInfo;
      this.#categoriesByName[categoryInfo.name.toUpperCase()] = categoryInfo;
    }

    getById(id) {
      return this.#categoriesById[id];
    }

    getByName(name) {
      return this.#categoriesByName[name.toUpperCase()];
    }

    toArray() {
      return Object.values(this.#categoriesById);
    }
  }
  class PnhEntry {
    /** @type {string} */
    order;

    /** @type {string} */
    name;

    /** @type {string[]} */
    aliases;

    /** @type {string} */
    primaryCategory;

    /** @type {string[]} */
    altCategories;

    /** @type {string} */
    description;

    /** @type {string} */
    url;

    /** @type {string} */
    notes;

    /** @type {string[]} */
    regions;

    /**
     * If this is true, the PNH entry should be ignored.
     * @type {boolean}
     * */
    disabled;

    /** @type {Symbol} */
    forceCategoryMatching;

    flagsToAdd = {};

    flagsToRemove = {};

    /** @type {string[]} */
    servicesToAdd = [];

    /** @type {string[]} */
    servicesToRemove = [];

    /** @type {string} */
    forceBrand;

    /** @type {RegExp} */
    localUrlCheckRegEx;

    /** @type {RegExp} */
    localizationRegEx;

    /** @type {string} */
    recommendedPhone;

    /**
     * Prevent name change
     * @type {boolean}
     */
    keepName = false;

    /** @type {string} */
    optionalAlias;

    /** @type {boolean} */
    chainIsClosed;

    /**
     * Value is -1 if no value has been set in PNH.
     * @type {number}
     */
    brandParentLevel = -1;

    /** @type {boolean} */
    strMatchAny;

    /** @type {string[]} */
    spaceMatchList;

    /** @type {boolean} */
    pharmhours;

    /** @type {boolean} */
    notABank;

    /** @type {boolean} */
    optionCat2;

    /** @type {boolean} */
    optionName2;

    /** @type {boolean} */
    altName2Desc;

    /** @type {boolean} */
    subFuel;

    /** @type {RegExp} */
    regexNameMatch;

    /** @type {number} */
    lockAt;

    /** @type {boolean} */
    noUpdateAlias;

    /** @type {boolean} */
    betaEnable;

    /** @type {string[]} */
    searchnameword;

    /** @type {string[]} */
    searchNameList;

    /** @type {boolean} */
    hasSpecialCases = false;

    /**
     * true if the PNH entry is invalid and should be skipped
     * @type {boolean}
     */
    invalid = false;

    /**
     *
     * @param {string[]} columnHeaders
     * @param {string} rowString A pipe-separated string with all of the PNH entry's data
     * @param {Country} country
     */
    constructor(columnHeaders, rowString, country) {
      const parseResult = this.#parseSpreadsheetRow(columnHeaders, rowString, country);
      if (!this.invalid && (!this.disabled || this.betaEnable)) {
        this.#buildSearchNameList(parseResult);
      }
    }

    /**
     * Makes a string uppercase, then removes AND (anywhere), THE (only at the beginning),
     * and any non-alphanumeric characters.
     * @param {string} str
     */
    static #tighten(str) {
      return str
        .toUpperCase()
        .replace(/ AND /g, '')
        .replace(/^THE /g, '')
        .replace(/[^A-Z0-9]/g, '');
    }

    /**
     * Makes a string uppercase and removes any non-alphanumeric characters except for commas.
     * @param {string} str
     */
    static #stripNonAlphaKeepCommas(str) {
      return str.toUpperCase().replace(/[^A-Z0-9,]/g, '');
    }

    /**
     *
     * @param {string[]} columnHeaders
     * @param {string} rowString
     * @param {Country} country
     * @returns
     */
    #parseSpreadsheetRow(columnHeaders, rowString, country) {
      /**  Contains values needed for immediate processing, but not to be stored in the PnhEntry */
      const result = {
        searchnamebase: null,
        searchnamemid: null,
        searchnameend: null,
        skipAltNameMatch: null,
        warningMessages: [],
      };

      try {
        const columnValues = rowString.split('|');

        // Do any preprocessing here:
        const disabled = columnValues[columnHeaders.indexOf(Pnh.SSHeader.disable)].trim();
        if (disabled === '1') {
          // If the row is disabled, no need to process the rest of it.
          this.disabled = true;
          return result;
        }

        // Step through columns and process the row values.
        columnHeaders.forEach((header, i) => {
          try {
            if (Pnh.COLUMNS_TO_IGNORE.includes(header)) return;

            // If an invalid value is found, don't bother parsing the rest of the row data.
            if (!this.invalid) {
              let value = columnValues[i].trim();
              if (!value.length) {
                value = undefined;
              } else if (header === Pnh.SSHeader.aliases) {
                // Validate aliases: ignore if starts with paren (invalid format), otherwise normalize commas
                if (value.startsWith('(')) {
                  value = undefined; // Ignore aliases if the cell starts with paren
                } else {
                  value = value.replace(/,[^A-za-z0-9]*/g, ','); // Tighten up commas if more than one alias
                }
              }

              switch (header) {
                case Pnh.SSHeader.order:
                case Pnh.SSHeader.description:
                case Pnh.SSHeader.notes:
                case Pnh.SSHeader.displaynote:
                case Pnh.SSHeader.sfurl:
                case Pnh.SSHeader.sfurllocal:
                  header = header.substring(3);
                  this[header] = value;
                  break;
                case Pnh.SSHeader.url:
                  if (value) this.url = normalizeURL(value);
                  break;
                case Pnh.SSHeader.searchnamebase:
                  result.searchnamebase = value;
                  break;
                case Pnh.SSHeader.searchnamemid:
                  result.searchnamemid = value;
                  break;
                case Pnh.SSHeader.searchnameend:
                  result.searchnameend = value;
                  break;
                case Pnh.SSHeader.searchnameword:
                  this.searchnameword = value?.toUpperCase().replace(/, /g, ',').split(',');
                  break;
                case Pnh.SSHeader.name:
                  if (value?.toUpperCase() !== 'PLEASE REUSE') {
                    this.name = value;
                  } else {
                    // No need to post warning here. Just skip it.
                    this.invalid = true;
                  }
                  break;
                case Pnh.SSHeader.aliases:
                  this.aliases = value?.split(',').map((v) => v.trim()) || [];
                  break;
                case Pnh.SSHeader.category1:
                  if (value) {
                    this.primaryCategory = country.categoryInfos.getByName(value)?.id;
                    if (typeof this.primaryCategory === 'undefined') {
                      result.warningMessages.push(`Unrecognized primary category value: ${value}`);
                    }
                  } else {
                    result.warningMessages.push('No primary category assigned. PNH entry will be ignored!');
                    this.invalid = true;
                  }
                  break;
                case Pnh.SSHeader.category2:
                  this.altCategories = value
                    ? value.split(',').reduce((acc, catName) => {
                        const trimmedName = catName.trim();
                        const cat = country.categoryInfos.getByName(trimmedName)?.id;
                        if (!cat) {
                          result.warningMessages.push(`Unrecognized alternate category: ${trimmedName}`);
                        } else if (typeof cat === 'string') {
                          acc.push(cat);
                        }
                        return acc;
                      }, [])
                    : [];
                  break;
                case Pnh.SSHeader.region:
                  if (value) {
                    this.regions = value
                      .toUpperCase()
                      .split(',')
                      .map((v) => v.trim());
                    // TODO: Check for valid regions.
                  } else {
                    // If no regions, ignore it.
                    this.invalid = true;
                    result.warningMessages.push('No regions specified. PNH entry will be ignored!');
                  }
                  break;
                case Pnh.SSHeader.disable:
                  // Handled the '1' case earlier in preprocessing
                  if (value === 'altName') {
                    result.skipAltNameMatch = true;
                  } else if (value) {
                    result.warningMessages.push(`Unrecognized value in ${Pnh.SSHeader.disable} column: ${value}`);
                  }
                  return;
                case Pnh.SSHeader.forcecat:
                  if (!value || value === '0') {
                    this.forceCategoryMatching = Pnh.ForceCategoryMatchingType.NONE;
                  } else if (value === '1') {
                    this.forceCategoryMatching = Pnh.ForceCategoryMatchingType.PRIMARY;
                  } else if (value === '2') {
                    this.forceCategoryMatching = Pnh.ForceCategoryMatchingType.ANY;
                  } else {
                    result.warningMessages.push(`Unrecognized value in ${Pnh.SSHeader.forcecat} column: ${value}`);
                  }
                  break;
                case Pnh.SSHeader.speccase:
                  if (value) {
                    this.hasSpecialCases = true;
                    value = value.split(',').map((v) => v.trim());
                    /* eslint-disable no-cond-assign */
                    value.forEach((specialCase) => {
                      let match;
                      if ((match = specialCase.match(REGEX_PATTERNS.BUTTON_ON))) {
                        const [, scFlag] = match;
                        switch (scFlag) {
                          case 'addCat2':
                            // flag = new Flag.AddCat2();
                            break;
                          case 'addPharm':
                          case 'addSuper':
                          case 'appendAMPM':
                          case 'addATM':
                          case 'addConvStore':
                            this.flagsToAdd[scFlag] = true;
                            break;
                          default:
                            result.warningMessages.push(`Unrecognized ph_specCase value: ${specialCase}`);
                        }
                      } else if ((match = specialCase.match(REGEX_PATTERNS.BUTTON_OFF))) {
                        const [, scFlag] = match;
                        switch (scFlag) {
                          case 'addConvStore':
                            this.flagsToRemove[scFlag] = true;
                            break;
                          default:
                            result.warningMessages.push(`Unrecognized ph_specCase value: ${specialCase}`);
                        }
                        // } else if (match = specCase.match(REGEX_PATTERNS.MESS_ON)) {
                        //    [, scFlag] = match;
                        //    _buttonBanner[scFlag].active = true;
                        // } else if (match = specCase.match(REGEX_PATTERNS.MESS_OFF)) {
                        //    [, scFlag] = match;
                        //    _buttonBanner[scFlag].active = false;
                      } else if ((match = specialCase.match(REGEX_PATTERNS.PS_ON))) {
                        const [, scFlag] = match;
                        // Map ps_* keys to banner keys (e.g., ps_valet → addValet)
                        const mappedKey = PNH_TO_BANNER_SERVICE_KEY_MAP[scFlag] || scFlag;
                        // Only add if the service exists in the banner
                        if (mappedKey && mappedKey.length > 0) {
                          this.servicesToAdd.push(mappedKey);
                        }
                      } else if ((match = specialCase.match(REGEX_PATTERNS.PS_OFF))) {
                        const [, scFlag] = match;
                        // Map ps_* keys to banner keys (e.g., ps_valet → addValet)
                        const mappedKey = PNH_TO_BANNER_SERVICE_KEY_MAP[scFlag] || scFlag;
                        // Only add if the service exists in the banner
                        if (mappedKey && mappedKey.length > 0) {
                          this.servicesToRemove.push(mappedKey);
                        }
                      } else if ((match = specialCase.match(REGEX_PATTERNS.FORCE_BRAND))) {
                        // If brand is going to be forced, use that.  Otherwise, use existing brand.
                        [, this.forceBrand] = match;
                      } else if ((match = specialCase.match(REGEX_PATTERNS.LOCAL_URL))) {
                        // parseout localURL data if exists (meaning place can have a URL distinct from the chain URL
                        [, this.localURLcheck] = new RegExp(match, 'i');
                      } else if ((match = specialCase.match(REGEX_PATTERNS.CHECK_LOCALIZATION))) {
                        const [, localizationString] = match;
                        this.localizationRegEx = new RegExp(localizationString, 'g');
                      } else if ((match = specialCase.match(REGEX_PATTERNS.PHONE))) {
                        [, this.recommendedPhone] = match;
                      } else if (REGEX_PATTERNS.KEEP_NAME.test(specialCase)) {
                        this.keepName = true;
                      } else if ((match = specialCase.match(REGEX_PATTERNS.OPTION_ALT_NAME))) {
                        [, this.optionalAlias] = match;
                      } else if (REGEX_PATTERNS.CLOSED.test(specialCase)) {
                        this.chainIsClosed = true;
                      } else if ((match = specialCase.match(REGEX_PATTERNS.BRAND_PARENT))) {
                        try {
                          this.brandParentLevel = parseInt(match[1], 10);
                        } catch {
                          result.warningMessages.push(`Invalid forceBrand value: ${specialCase}`);
                        }
                      } else if (REGEX_PATTERNS.STR_MATCH_ANY.test(specialCase)) {
                        this.strMatchAny = true;
                      } else if (REGEX_PATTERNS.PHARM_HOURS.test(specialCase)) {
                        this.pharmhours = true;
                      } else if (REGEX_PATTERNS.NOT_A_BANK.test(specialCase)) {
                        this.notABank = true;
                      } else if (REGEX_PATTERNS.OPTION_CAT2.test(specialCase)) {
                        this.optionCat2 = true;
                      } else if (REGEX_PATTERNS.OPTION_NAME2.test(specialCase)) {
                        this.optionName2 = true;
                      } else if (REGEX_PATTERNS.ALT_NAME2_DESC.test(specialCase)) {
                        this.altName2Desc = true;
                      } else if (REGEX_PATTERNS.SUB_FUEL.test(specialCase)) {
                        this.subFuel = true;
                      } else if ((match = specialCase.match(REGEX_PATTERNS.REGEX_NAME_MATCH))) {
                        this.regexNameMatch = new RegExp(match[1].replace(/\\/, '\\').replace(/<or>/g, '|'), 'i');
                      } else if ((match = specialCase.match(REGEX_PATTERNS.LOCK_AT))) {
                        try {
                          this.lockAt = parseInt(match[1], 10);
                          if (this.lockAt < 1 || this.lockAt > 6) {
                            throw new Error();
                          }
                        } catch {
                          result.warningMessages.push(`Invalid ph_speccase lockAt value (must be between 1 and 6): ${specialCase}`);
                        }
                      } else if (REGEX_PATTERNS.NO_UPDATE_ALIAS.test(specialCase)) {
                        this.noUpdateAlias = true;
                      } else if (/^betaEnable$/i.test(specialCase)) {
                        this.betaEnable = true;
                      } else {
                        result.warningMessages.push(`Unrecognized ph_speccase value: ${specialCase}`);
                      }
                    });
                    /* eslint-enable no-cond-assign */
                  }
                  break;
                case '': // Ignore this
                  break;
                default:
                // Ignore unrecognized headers here.
              }
            }
          } catch (ex) {
            result.warningMessages.push(`An unexpected error occurred while processing column: ${header}. PNH entry will be ignored.`);
          }
        }); // END ROW PROCESSING

        // Do any post-processing of row values here:
        if (this.strMatchAny || this.primaryCategory === 'HOTEL') {
          // Space match uses custom string transformations: uppercase, strip AND/THE, remove non-alphanumerics
          this.spaceMatchList = [
            this.name
              .toUpperCase()
              .replace(/ AND /g, ' ')
              .replace(/^THE /g, '')
              .replace(/[^A-Z0-9 ]/g, ' ')
              .replace(/ {2,}/g, ' '),
          ];
          if (this.searchnameword) {
            this.spaceMatchList.push(...this.searchnameword);
          }
        }
      } catch (ex) {
        result.warningMessages.push(`An unexpected error occurred while parsing. PNH entry will be ignored! :\n${ex.toString()}`);
        this.disabled = true;
      }

      if (result.warningMessages.length) {
        logDev(`${country.countryName}: PNH Order # ${this.order} parsing issues:\n- ${result.warningMessages.join('\n- ')}`);
      }
      return result;
    }

    #buildSearchNameList(parseResult) {
      let newNameList = [PnhEntry.#tighten(this.name)];

      if (!parseResult.skipAltNameMatch) {
        // Add any aliases
        newNameList = newNameList.concat(this.aliases.map((alias) => PnhEntry.#tighten(alias)));
      }

      // The following code sets up alternate search names as outlined in the PNH dataset.
      // Formula, with P = PNH primary; A1, A2 = PNH aliases; B1, B2 = base terms; M1, M2 = mid terms; E1, E2 = end terms
      // Search list will build: P, A, B, PM, AM, BM, PE, AE, BE, PME, AME, BME.
      // Multiple M terms are applied singly and in pairs (B1M2M1E2).  Multiple B and E terms are applied singly (e.g B1B2M1 not used).
      // Any doubles like B1E2=P are purged at the end to eliminate redundancy.
      if (!isNullOrWhitespace(parseResult.searchnamebase)) {
        // If base terms exist, otherwise only the primary name is matched
        newNameList = newNameList.concat(PnhEntry.#stripNonAlphaKeepCommas(parseResult.searchnamebase).split(','));

        if (!isNullOrWhitespace(parseResult.searchnamemid)) {
          let pnhSearchNameMid = PnhEntry.#stripNonAlphaKeepCommas(parseResult.searchnamemid).split(',');
          if (pnhSearchNameMid.length > 1) {
            // if there are more than one mid terms, it adds a permutation of the first 2
            pnhSearchNameMid = pnhSearchNameMid.concat([pnhSearchNameMid[0] + pnhSearchNameMid[1], pnhSearchNameMid[1] + pnhSearchNameMid[0]]);
          }
          const midLen = pnhSearchNameMid.length;
          // extend the list by adding Mid terms onto the SearchNameBase names
          for (let extix = 1, len = newNameList.length; extix < len; extix++) {
            for (let midix = 0; midix < midLen; midix++) {
              newNameList.push(newNameList[extix] + pnhSearchNameMid[midix]);
            }
          }
        }

        if (!isNullOrWhitespace(parseResult.searchnameend)) {
          const pnhSearchNameEnd = PnhEntry.#stripNonAlphaKeepCommas(parseResult.searchnameend).split(',');
          const endLen = pnhSearchNameEnd.length;
          // extend the list by adding End terms onto all the SearchNameBase & Base+Mid names
          for (let extix = 1, len = newNameList.length; extix < len; extix++) {
            for (let endix = 0; endix < endLen; endix++) {
              newNameList.push(newNameList[extix] + pnhSearchNameEnd[endix]);
            }
          }
        }
      }

      // Clear out any empty entries
      newNameList = newNameList.filter((name) => name.length > 1);

      // Next, add extensions to the search names based on the WME place category
      const categoryInfo = this.primaryCategory;
      const appendWords = [];
      if (categoryInfo) {
        if (categoryInfo.id === 'HOTEL') {
          appendWords.push('HOTEL');
        } else if (categoryInfo.id === 'BANK_FINANCIAL' && !this.notABank) {
          appendWords.push('BANK', 'ATM');
        } else if (categoryInfo.id === 'SUPERMARKET_GROCERY') {
          appendWords.push('SUPERMARKET');
        } else if (categoryInfo.id === 'GYM_FITNESS') {
          appendWords.push('GYM');
        } else if (categoryInfo.id === 'GAS_STATION') {
          appendWords.push('GAS', 'GASOLINE', 'FUEL', 'STATION', 'GASSTATION');
        } else if (categoryInfo.id === 'CAR_RENTAL') {
          appendWords.push('RENTAL', 'RENTACAR', 'CARRENTAL', 'RENTALCAR');
        }
        appendWords.forEach((word) => {
          newNameList = newNameList.concat(newNameList.map((name) => name + word));
        });
      }

      // Add entries for word/spelling variations
      Pnh.WORD_VARIATIONS.forEach((variationsList) => addSpellingVariants(newNameList, variationsList));

      this.searchNameList = uniq(newNameList);
    }

    /**
     *  Function that checks current place against the Harmonization Data.  Returns place data or "NoMatch"
     * @param {string} name
     * @param {string} state2L
     * @param {string} region3L
     * @param {string} country
     * @param {string[]} categories
     * @param {venue} venue
     * @returns
     */
    getMatchInfo(name, state2L, region3L, country, categories, venue, venueNameSpace) {
      const matchInfo = {
        isMatch: false,
        allowMultiMatch: true, // TODO: This can probably be removed
        matchOutOfRegion: false,
      };
      let nameMatch = false;

      // Name Matching
      if (this.regexNameMatch) {
        nameMatch = this.regexNameMatch.test(venue.name);
      } else if (this.strMatchAny || this.primaryCategory === 'HOTEL') {
        // Match any part of WME name with either the PNH name or any spaced names
        matchInfo.allowMultiMatch = true; // TODO: This can probably be removed

        for (let nmix = 0; nmix < this.spaceMatchList.length; nmix++) {
          if (venueNameSpace.includes(` ${this.spaceMatchList[nmix]} `)) {
            nameMatch = true;
            break;
          }
        }
      } else {
        // Split all possible search names for the current PNH entry
        const { searchNameList } = this;

        // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )
        const venueNameNoNum = name.replace(/[^A-Z]/g, '');

        /*
         * I could not find strMatchStart or strMatchEnd in the PNH spreadsheet. Assuming these
         * are no longer needed.
         */
        if (searchNameList.includes(name) || searchNameList.includes(venueNameNoNum)) {
          // full match of any term only
          nameMatch = true;
        }
      }

      // if a match was found:
      if (nameMatch) {
        // Compare WME place name to PNH search name list
        logDev(`Matched PNH Order No.: ${this.order}`);

        const PNHPriCat = this.primaryCategory; // Primary category of PNH data
        let PNHForceCat = this.forceCategoryMatching; // Primary category of PNH data

        // Gas stations only harmonized if the WME place category is already gas station (prevents Costco Gas becoming Costco Store)
        if (categories[0] === 'GAS_STATION' || PNHPriCat === 'GAS_STATION') {
          PNHForceCat = Pnh.ForceCategoryMatchingType.PRIMARY;
        }

        // Name and primary category match
        matchInfo.isMatch =
          (PNHForceCat === Pnh.ForceCategoryMatchingType.PRIMARY && categories.indexOf(PNHPriCat) === 0) ||
          // Name and any category match
          (PNHForceCat === Pnh.ForceCategoryMatchingType.ANY && categories.includes(PNHPriCat)) ||
          // Name only match
          PNHForceCat === Pnh.ForceCategoryMatchingType.NONE;
      }

      if (
        !(
          this.regions.includes(state2L) ||
          this.regions.includes(region3L) || // if the WME-selected venue matches the state, region
          this.regions.includes(country) || //  OR if the country code is in the data then it is approved for all regions therein
          $('#WMEPH-RegionOverride').prop('checked')
        )
      ) {
        // OR if region override is selected (dev setting)
        matchInfo.matchOutOfRegion = true;
      }

      return matchInfo;
    }
  }
  /** "Namespace" for classes and methods related to handling PNH spreadsheet data */
  class Pnh {
    static #SPREADSHEET_ID = '1pBz4l4cNapyGyzfMJKqA4ePEFLkmz2RryAt1UV39B4g';
    static #SPREADSHEET_RANGE = '2019.01.20.001!A2:L';
    static #SPREADSHEET_MODERATORS_RANGE = 'Moderators!A1:F';
    static #API_KEY = 'YTJWNVBVRkplbUZUZVVObU1YVXpSRVZ3ZW5OaFRFSk1SbTR4VGxKblRURjJlRTFYY3pOQ2NXZElPQT09';
    /** Columns that can be ignored when importing */
    static COLUMNS_TO_IGNORE = ['temp_field', 'ph_services', 'ph_national', 'logo', ''];
    static WORD_VARIATIONS = null;
    static MODERATORS = {};
    // vars for category name checking
    /** @type {string[]} */
    static HOSPITAL_PART_MATCH;
    /** @type {string[]} */
    static HOSPITAL_FULL_MATCH;
    /** @type {string[]} */
    static ANIMAL_PART_MATCH;
    /** @type {string[]} */
    static ANIMAL_FULL_MATCH;
    /** @type {string[]} */
    static SCHOOL_PART_MATCH;
    /** @type {string[]} */
    static SCHOOL_FULL_MATCH;

    static ForceCategoryMatchingType = Object.freeze({
      NONE: Symbol('none'),
      PRIMARY: Symbol('primary'),
      ANY: Symbol('any'),
    });

    static SSHeader = Object.freeze({
      order: 'ph_order',
      name: 'ph_name',
      aliases: 'ph_aliases',
      category1: 'ph_category1',
      category2: 'ph_category2',
      description: 'ph_description',
      url: 'ph_url',
      notes: 'ph_notes',
      region: 'ph_region',
      disable: 'ph_disable',
      forcecat: 'ph_forcecat',
      displaynote: 'ph_displaynote',
      speccase: 'ph_speccase',
      searchnamebase: 'ph_searchnamebase',
      searchnamemid: 'ph_searchnamemid',
      searchnameend: 'ph_searchnameend',
      searchnameword: 'ph_searchnameword',
      sfurl: 'ph_sfurl',
      sfurllocal: 'ph_sfurllocal',
      toValueArray: () => Object.values(Pnh.SSHeader).filter((v) => typeof v === 'string'),
    });

    /**
     * Function that checks current place against the Harmonization Data. Returns place data, "NoMatch", or "Approval Needed"
     * @param {string} name The venue's base name, i.e. everything before a hyphen or parentheses
     * @param {string} state2L The 2-letter state abbreviation
     * @param {string} region3L The 3-letter region abbreviation
     * @param {string} country The country code
     * @param {string[]} categories The venue's current category array
     * @param {venue} venue The venue object
     * @param {boolean} [closedChainsOnly] Use true if only finding closed chains, i.e. when doing map highlights
     * @returns
     */
    static findMatch(name, state2L, region3L, country, categories, venue, closedChainsOnly) {
      if (country !== PNH_DATA.USA.countryCode && country !== PNH_DATA.CAN.countryCode) {
        return ['NoMatch'];
      }
      if (isVenueParkingLot(venue)) {
        return ['NoMatch'];
      }
      /** @type {PnhEntry[]} */
      const pnhData = closedChainsOnly ? PNH_DATA[country].closedChains : PNH_DATA[country].pnh;
      const matchPNHRegionData = []; // array of matched data with regional approval
      const pnhOrderNum = [];
      const pnhNameTemp = [];
      let matchOutOfRegion = false; // tracks match status
      let matchInRegion = false;

      name = name.toUpperCase().replace(/ AND /g, ' ').replace(/^THE /g, '');
      const venueNameSpace = ` ${name.replace(/[^A-Z0-9 ]/g, ' ').replace(/ {2,}/g, ' ')} `;
      name = name.replace(/[^A-Z0-9]/g, ''); // Clear all non-letter and non-number characters ( HOLLYIVY PUB #23 -- > HOLLYIVYPUB23 )

      // for each entry in the PNH list (skipping headers at index 0)
      for (let pnhIdx = 0; pnhIdx < pnhData.length; pnhIdx++) {
        const pnhEntry = pnhData[pnhIdx];
        const matchInfo = pnhEntry.getMatchInfo(name, state2L, region3L, country, categories, venue, venueNameSpace);
        if (matchInfo.isMatch) {
          // if (!matchInfo.allowMultiMatch) {
          //     return [pnhEntry];
          // }
          if (matchInfo.matchOutOfRegion) {
            // PNH match found (once true, stays true)
            matchOutOfRegion = true;
            // temp name for approval return
            pnhNameTemp.push(pnhEntry.name);

            // temp order number for approval return
            pnhOrderNum.push(pnhEntry.order);
          } else {
            matchInRegion = true;
            matchPNHRegionData.push(pnhEntry);
          }
        }
      } // END loop through PNH entries

      // If name & region match was found:
      if (matchInRegion) {
        return matchPNHRegionData;
      }
      if (matchOutOfRegion) {
        // if a name match was found but not for region, prod the user to get it approved
        return ['ApprovalNeeded', pnhNameTemp, pnhOrderNum];
      }
      if (matchPNHRegionData.length) {
        return matchOutOfRegion;
      }
      // if no match was found, suggest adding the place to the sheet if it's a chain
      return ['NoMatch'];
    }

    static #validatePnhSSColumnHeaders(headers) {
      let valid = true;
      const expectedHeaders = Pnh.SSHeader.toValueArray();

      // Warn if extra headers are found in the spreadsheet.
      headers.forEach((header) => {
        // temp_field currently exists on the USA sheet but may not be needed
        if (header.length && header !== 'temp_field' && !expectedHeaders.includes(header) && !Pnh.COLUMNS_TO_IGNORE.includes(header)) {
          logDev(`Unexpected column header found in PNH spreadsheet: ${header}`);
        }
      });

      // Return invalid if expected headers are not found in spreadsheet.
      expectedHeaders.forEach((header) => {
        if (!headers.includes(header)) {
          logDev(`Column header missing from PNH spreadsheet data: ${header}`);
          valid = false;
        }
      });

      return valid;
    }

    /**
     *
     * @param {string[]} rows
     * @param {Country} country
     * @returns {PnhEntry[]}
     */
    static processPnhSSRows(allData, columnIndex, country) {
      const rows = this.processImportedDataColumn(allData, columnIndex);
      const columnHeaders = rows
        .splice(0, 1)[0]
        .split('|')
        .map((h) => h.trim());

      // Canada's spreadsheet is missing 'ph_order' in the first column header.
      if (!columnHeaders[0].length) columnHeaders[0] = Pnh.SSHeader.order;

      if (!Pnh.#validatePnhSSColumnHeaders(columnHeaders)) {
        throw new Error('WMEPH: WMEPH exiting due to missing spreadsheet column headers.');
      }
      return rows.map((row) => new PnhEntry(columnHeaders, row, country)).filter((entry) => !entry.disabled && !entry.invalid);
    }

    static processImportedDataColumn(allData, columnIndex) {
      return allData.filter((row) => row.length >= columnIndex + 1).map((row) => row[columnIndex]);
    }

    static #getSpreadsheetUrl(id, range, key) {
      return `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?${dec(key)}`;
    }

    static async downloadAllData() {
      await this.downloadPnhData();
      await this.#downloadPnhModerators();
      logDev(`✓ All PNH categories loaded: USA=${Object.keys(PNH_DATA.USA.categoryInfos.toArray()).length}, CAN=${Object.keys(PNH_DATA.CAN.categoryInfos.toArray()).length}`);
    }

    static downloadPnhData() {
      log('PNH data download started...');
      return new Promise((resolve, reject) => {
        const url = this.#getSpreadsheetUrl(this.#SPREADSHEET_ID, this.#SPREADSHEET_RANGE, this.#API_KEY);

        $.getJSON(url)
          .done((res) => {
            const { values } = res;
            if (values[0][0].toLowerCase() === 'obsolete') {
              WazeWrap.Alerts.error(SCRIPT_NAME, "You are using an outdated version of WMEPH that doesn't work anymore. Update or disable the script.");
              return;
            }

            // This needs to be performed before makeNameCheckList() is called.
            Pnh.WORD_VARIATIONS = Pnh.processImportedDataColumn(values, 11)
              .slice(1)
              .map((row) =>
                row
                  .toUpperCase()
                  .replace(/[^A-z0-9,]/g, '')
                  .split(','),
              );

            logDev('Creating USA Country - category data column 3');
            const usaCategoryData = Pnh.processImportedDataColumn(values, 3);
            logDev('USA category rows:', usaCategoryData.length);

            PNH_DATA.USA = new Country('USA', 'USA', values, 3, 0, {
              NWR: new Region('NWR', '1hv5hXBlGr1pTMmo4n3frUx1DovUODbZodfDBwwTc7HE'),
              SWR: new Region('SWR', '1Qf2N4fSkNzhVuXJwPBJMQBmW0suNuy8W9itCo1qgJL4'),
              HI: new Region('HI', '1K7Dohm8eamIKry3KwMTVnpMdJLaMIyDGMt7Bw6iqH_A', null, ['entry.1497446659', 'entry.50214576', 'entry.1749047694']),
              PLN: new Region('PLN', '1ycXtAppoR5eEydFBwnghhu1hkHq26uabjUu8yAlIQuI'),
              SCR: new Region('SCR', '1KZzLdlX0HLxED5Bv0wFB-rWccxUp2Mclih5QJIQFKSQ'),
              GLR: new Region('GLR', '19btj-Qt2-_TCRlcS49fl6AeUT95Wnmu7Um53qzjj9BA'),
              SAT: new Region(
                'SAT',
                '1bxgK_20Jix2ahbmUvY1qcY0-RmzUBT6KbE5kjDEObF8',
                ['entry.2063110249', 'entry.2018912633', 'entry.1924826395'],
                ['entry.2063110249', 'entry.123778794', 'entry.1924826395'],
              ),
              SER: new Region(
                'SER',
                '1jYBcxT3jycrkttK5BxhvPXR240KUHnoFMtkZAXzPg34',
                ['entry.822075961', 'entry.1422079728', 'entry.1891389966'],
                ['entry.822075961', 'entry.607048307', 'entry.1891389966'],
              ),
              ATR: new Region('ATR', '1v7JhffTfr62aPSOp8qZHA_5ARkBPldWWJwDeDzEioR0'),
              NER: new Region('NER', '1UgFAMdSQuJAySHR0D86frvphp81l7qhEdJXZpyBZU6c'),
              NOR: new Region('NOR', '1iYq2rd9HRd-RBsKqmbHDIEBGuyWBSyrIHC6QLESfm4c'),
              MAR: new Region('MAR', '1PhL1iaugbRMc3W-yGdqESoooeOz-TJIbjdLBRScJYOk'),
            });
            PNH_DATA.CAN = new Country('CAN', 'Canada', values, 3, 2, {
              CA_EN: new Region(
                'CA_EN',
                '13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws',
                ['entry_839085807', 'entry_1067461077', 'entry_318793106', 'entry_1149649663'],
                ['entry_839085807', 'entry_1125435193', 'entry_318793106', 'entry_1149649663'],
              ),
              QC: new Region(
                'QC',
                '13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws',
                ['entry_839085807', 'entry_1067461077', 'entry_318793106', 'entry_1149649663'],
                ['entry_839085807', 'entry_1125435193', 'entry_318793106', 'entry_1149649663'],
              ),
            });
            PNH_DATA.states = Pnh.processImportedDataColumn(values, 1).filter((row) => row && row.trim());

            const WMEPHuserList = Pnh.processImportedDataColumn(values, 4)[1].split('|');
            const betaix = WMEPHuserList.indexOf('BETAUSERS');
            _wmephDevList = [];
            _wmephBetaList = [];
            for (let ulix = 1; ulix < betaix; ulix++) _wmephDevList.push(WMEPHuserList[ulix].toLowerCase().trim());
            for (let ulix = betaix + 1; ulix < WMEPHuserList.length; ulix++) _wmephBetaList.push(WMEPHuserList[ulix].toLowerCase().trim());

            const processTermsCell = (termsValues, colIdx) =>
              Pnh.processImportedDataColumn(termsValues, colIdx)[1]
                .toLowerCase()
                .split('|')
                .map((value) => value.trim());
            this.HOSPITAL_PART_MATCH = processTermsCell(values, 5);
            this.HOSPITAL_FULL_MATCH = processTermsCell(values, 6);
            this.ANIMAL_PART_MATCH = processTermsCell(values, 7);
            this.ANIMAL_FULL_MATCH = processTermsCell(values, 8);
            this.SCHOOL_PART_MATCH = processTermsCell(values, 9);
            this.SCHOOL_FULL_MATCH = processTermsCell(values, 10);

            log('PNH data download completed');
            resolve();
          })
          .fail((res) => {
            const message = res.responseJSON && res.responseJSON.error ? res.responseJSON.error : 'See response error message above.';
            logDev('Failed to load spreadsheet:', message);
            reject();
          });
      });
    }

    static #downloadPnhModerators() {
      log('PNH moderators download started...');
      return new Promise((resolve) => {
        const url = Pnh.#getSpreadsheetUrl(Pnh.#SPREADSHEET_ID, Pnh.#SPREADSHEET_MODERATORS_RANGE, Pnh.#API_KEY);

        $.getJSON(url)
          .done((res) => {
            const { values } = res;

            try {
              values.forEach((regionArray) => {
                const region = regionArray[0];
                const mods = regionArray.slice(3);
                Pnh.MODERATORS[region] = mods;
              });
            } catch (ex) {
              Pnh.MODERATORS['?'] = ['Error downloading moderators!'];
            }

            // delete Texas region, if it exists
            delete Pnh.MODERATORS.TX;

            log('PNH moderators download completed');
            resolve();
          })
          .fail((res) => {
            const message = res.responseJSON && res.responseJSON.error ? res.responseJSON.error : 'See response error message above.';
            logDev('Failed to load moderator list:', message);
            Pnh.MODERATORS['?'] = ['Error downloading moderators!'];
            resolve();
          });
      });
    }

    static processCategories(categoryDataRows, categoryInfos) {
      let headers;
      let pnhServiceKeys;
      let wmeServiceIds;
      const splitValues = (value) => (value.trim() ? value.split(',').map((v) => v.trim()) : []);
      categoryDataRows.forEach((row, iRow) => {
        row = row.split('|');
        if (iRow === 0) {
          headers = row;
        } else if (iRow === 1) {
          pnhServiceKeys = row;
        } else if (iRow === 2) {
          wmeServiceIds = row;
        } else {
          const categoryInfo = {
            services: [],
          };
          row.forEach((value, iCol) => {
            const headerValue = headers[iCol].trim();
            value = value.trim();
            switch (headerValue) {
              case 'pc_wmecat':
                categoryInfo.id = value;
                break;
              case 'pc_transcat':
                categoryInfo.name = value;
                break;
              case 'pc_catparent':
                categoryInfo.parent = value;
                break;
              case 'pc_point':
                categoryInfo.point = value;
                break;
              case 'pc_area':
                categoryInfo.area = value;
                break;
              case 'pc_regpoint':
                categoryInfo.regPoint = splitValues(value);
                break;
              case 'pc_regarea':
                categoryInfo.regArea = splitValues(value);
                break;
              case 'pc_lock1':
                categoryInfo.lock1 = splitValues(value);
                break;
              case 'pc_lock2':
                categoryInfo.lock2 = splitValues(value);
                break;
              case 'pc_lock3':
                categoryInfo.lock3 = splitValues(value);
                break;
              case 'pc_lock4':
                categoryInfo.lock4 = splitValues(value);
                break;
              case 'pc_lock5':
                categoryInfo.lock5 = splitValues(value);
                break;
              case 'pc_rare':
                categoryInfo.rare = splitValues(value);
                break;
              case 'pc_parent':
                categoryInfo.disallowedParent = splitValues(value);
                break;
              case 'pc_message':
                categoryInfo.messagae = value;
                break;
              case 'ps_valet':
              case 'ps_drivethru':
              case 'ps_wifi':
              case 'ps_restrooms':
              case 'ps_cc':
              case 'ps_reservations':
              case 'ps_outside':
              case 'ps_ac':
              case 'ps_parking':
              case 'ps_deliveries':
              case 'ps_takeaway':
              case 'ps_wheelchair':
                if (value) {
                  categoryInfo.services.push({ wmeId: wmeServiceIds[iCol], pnhKey: PNH_TO_BANNER_SERVICE_KEY_MAP[pnhServiceKeys[iCol]] || pnhServiceKeys[iCol] });
                }
                break;
              case '':
                // ignore blank column
                break;
              default:
                throw new Error(`WMEPH: Unexpected category data from PNH sheet: ${headerValue}`);
            }
          });

          // Debug output for specific categories
          if (categoryInfo.name === 'RIVER_STREAM' || categoryInfo.name === 'ISLAND') {
            log(`Parsed ${categoryInfo.name}:`, {
              id: categoryInfo.id,
              name: categoryInfo.name,
              parent: categoryInfo.parent,
              point: categoryInfo.point,
              area: categoryInfo.area,
              regPoint: categoryInfo.regPoint,
              regArea: categoryInfo.regArea,
              services: categoryInfo.services
            });
          }

          categoryInfos.add(categoryInfo);
        }
      });
    }
  }
  // Abstract flag classes.  Must be declared outside the "Flag" namespace.
  class FlagBase {
    static defaultSeverity = SEVERITY.GREEN;
    static defaultMessage = '';
    static currentFlags;
    #severity;
    #message;
    #noLock;
    /** @type {HarmonizationArgs} */
    args;

    get name() {
      return this.constructor.name;
    }

    get severity() {
      return this.#severity ?? this.constructor.defaultSeverity;
    }
    set severity(value) {
      this.#severity = value;
    }

    get message() {
      return this.#message ?? this.constructor.defaultMessage;
    }
    set message(value) {
      this.#message = value;
    }

    get noLock() {
      return this.#noLock ?? this.severity > SEVERITY.BLUE;
    }
    set noLock(value) {
      this.#noLock = value;
    }

    constructor() {
      FlagBase.currentFlags.add(this);
    }

    /**
     *
     * @param {HarmonizationArgs} args
     * @returns
     */
    static eval(args) {
      if (this.venueIsFlaggable(args) && !FlagBase.currentFlags.hasFlag(this)) {
        const flag = new this(args);
        flag.args = args;
        return flag;
      }
      return null;
    }
  }
  class ActionFlag extends FlagBase {
    static defaultButtonTooltip = '';
    #buttonText;
    #buttonTooltip;

    get buttonText() {
      return this.#buttonText ?? this.constructor.defaultButtonText;
    }
    set buttonText(value) {
      this.#buttonText = value;
    }
    get buttonTooltip() {
      return this.#buttonTooltip ?? this.constructor.defaultButtonTooltip;
    }
    set buttonTooltip(value) {
      this.#buttonTooltip = value;
    }
  }
  class WLFlag extends FlagBase {
    static defaultWLTooltip = 'Whitelist this message';
    #showWL;

    get severity() {
      return this.constructor.isWhitelisted(this.args) ? SEVERITY.GREEN : super.severity;
    }
    set severity(value) {
      super.severity = value;
    }

    get showWL() {
      return this.#showWL ?? !this.constructor.isWhitelisted(this.args);
    }
    set showWL(value) {
      this.#showWL = value;
    }

    get wlTooltip() {
      return this.constructor.defaultWLTooltip;
    }

    WLaction() {
      const venue = getSelectedVenue();
      if (whitelistAction(venue.id, this.constructor.WL_KEY)) {
        harmonizePlaceGo(venue, 'harmonize');
      }
    }

    /**
     *
     * @param {HarmonizationArgs} args
     * @returns
     */
    static isWhitelisted(args) {
      return !!args.wl[this.WL_KEY];
    }
  }
  class WLActionFlag extends WLFlag {
    static defaultButtonTooltip = '';
    #buttonText;
    #buttonTooltip;

    get buttonText() {
      return this.#buttonText ?? this.constructor.defaultButtonText;
    }
    set buttonText(value) {
      this.#buttonText = value;
    }

    get buttonTooltip() {
      return this.#buttonTooltip ?? this.constructor.defaultButtonTooltip;
    }
    set buttonTooltip(value) {
      this.#buttonTooltip = value;
    }
  }
  /** Namespace to keep flags grouped. */
  const Flag = {
    // 2020-10-5 Disabling HN validity checks for now. See note on HnNonStandard flag for details.
    // HnDashRemoved: class extends FlagBase {
    //     constructor() { super(SEVERITY.GREEN, 'Dash removed from house number. Verify'); }
    // },
    ChainIsClosed: class extends WLFlag {
      static defaultSeverity = SEVERITY.ORANGE;
      static WL_KEY = 'chainIsClosed';

      /**
       *
       * @param {HarmonizationArgs} args
       * @returns
       */
      static venueIsFlaggable(args) {
        return args.chainIsClosed;
      }

      get message() {
        const pnhName = this.args.pnhMatch.name;
        return (
          `Place matched to PNH entry "${pnhName}", which is no longer in business.<br/><br/>` +
          'Follow the <a target="_blank" href="https://www.waze.com/wiki/USA/Places#Closed">wiki instructions</a> for closed places.'
        );
      }
    },
    FullAddressInference: class extends FlagBase {
      static defaultSeverity = SEVERITY.RED;
      static defaultMessage = 'Missing address was inferred from nearby segments. Verify the address and run WMEPH again.';

      constructor(inferredAddress) {
        super();
        this.inferredAddress = inferredAddress;
      }

      static eval(args) {
        let result = null;

        // Detect if user intentionally set city to "None"
        // When city is set to "None", WME assigns it placeholder id=999909
        const cityIsIntentionallyEmpty = args.addr.city?.id === 999909;

        // Only attempt address inference if the venue should have street/city information
        // StreetMissing and CityMissing already have all the logic to determine this
        const shouldHaveStreet = Flag.StreetMissing.venueIsFlaggable(args);
        const shouldHaveCity = Flag.CityMissing.venueIsFlaggable(args);
        const shouldInferAddress = shouldHaveStreet || shouldHaveCity;

        const hasMissingAddress = !args.addr.state || !args.addr.country || !args.addr.street?.name || !args.addr.city?.name;

        if (!args.highlightOnly) {
          if (hasMissingAddress && shouldInferAddress) {
            // Only infer if venue type should have address info (not a natural feature, bridge, etc.)
            if (cityIsIntentionallyEmpty) {
              // Don't auto-infer; user made an intentional choice
              result = null;
            } else {
              if (sdk.Map.getZoomLevel() < 4) {
                if ($('#WMEPH-EnableIAZoom').prop('checked')) {
                  const coords = getVenueLonLat(args.venue);
                  sdk.Map.setMapCenter({ lonLat: coords, zoomLevel: 5 });
                } else {
                  WazeWrap.Alerts.error(
                    SCRIPT_NAME,
                    'No address and the state cannot be determined. Please zoom in and rerun the script. ' + 'You can enable autozoom for this type of case in the options.',
                  );
                }
                result = { exit: true }; // Don't bother returning a Flag. This will exit the rest of the harmonizePlaceGo function.
              } else {
                let inferredAddress = inferAddress(args.venue, 7); // Pull address info from nearby segments

                if (inferredAddress?.street?.id && inferredAddress?.state && inferredAddress?.country) {
                  if ($('#WMEPH-AddAddresses').prop('checked')) {
                    // update the venue's address if option is enabled
                    updateAddress(args.venue, inferredAddress, args.actions);
                    UPDATED_FIELDS.address.updated = true;
                    result = new this(inferredAddress);
                  } else if (!['JUNCTION_INTERCHANGE'].includes(args.categories[0]) && !FlagBase.currentFlags.hasFlag(Flag.CityMissing)) {
                    new Flag.CityMissing(args);
                  }
                } else {
                  //  if the inference doesn't work...
                  WazeWrap.Alerts.error(SCRIPT_NAME, 'This place has no address data and the address cannot be inferred from nearby segments. Please edit the address and run WMEPH again.');
                  result = { exit: true }; // Don't bother returning a Flag. This will exit the rest of the harmonizePlaceGo function.
                }
              }
            }
          }
        } else if (hasMissingAddress && shouldInferAddress) {
          // only highlighting (and only if venue should have address info)
          result = { exit: true };
          if (args.venue.adLocked) {
            result.severity = 'adLock';
          } else {
            const cat = args.venue.categories;
            if (containsAny(cat, ['HOSPITAL_MEDICAL_CARE', 'HOSPITAL_URGENT_CARE', 'GAS_STATION'])) {
              result.severity = SEVERITY.PINK;
            } else if (cat.includes('JUNCTION_INTERCHANGE')) {
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

      static venueIsFlaggable(args) {
        const EXCLUDED_FIRST_CATEGORIES = ['ISLAND', 'FOREST_GROVE', 'SEA_LAKE_POOL', 'RIVER_STREAM', 'CANAL', 'PARKING_LOT', 'NATURAL_FEATURES', 'SWAMP_MARSH'];
        const hasAlphanumericName = args.nameBase?.replace(/[^A-Za-z0-9]/g, '').length > 0;
        const isResidential = args.categories.includes('RESIDENCE_HOME') || args.categories.includes('RESIDENTIAL');
        const isBrandedGasStation = args.categories.includes('GAS_STATION') && args.brand;

        return !isResidential && !hasAlphanumericName && !EXCLUDED_FIRST_CATEGORIES.includes(args.categories[0]) && !isBrandedGasStation;
      }
    },
    GasNameMissing: class extends ActionFlag {
      static defaultSeverity = SEVERITY.RED;
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Use gas brand as station name';

      get message() {
        return `Name is missing. Use "${this.args.brand}"?`;
      }

      static venueIsFlaggable(args) {
        return args.categories.includes('GAS_STATION') && isNullOrWhitespace(args.nameBase) && !isNullOrWhitespace(args.brand);
      }

      action() {
        addUpdateAction(this.args.venue, { name: this.args.brand }, null, true);
      }
    },
    ClearThisUrl: class extends FlagBase {
      static defaultSeverity = SEVERITY.YELLOW;

      // Use this to highlight yellow any venues that have an invalid value and will be
      // auto-corrected when WMEPH is run.
      static venueIsFlaggable(args) {
        return args.categories.includes('CHARGING_STATION') && args.url && ['https://www.nissan-europe.com/', 'https://www.eco-movement.com/'].includes(args.url);
      }
    },
    ClearThisPhone: class extends FlagBase {
      static defaultSeverity = SEVERITY.YELLOW;

      // Use this to highlight yellow any venues that have an invalid value and will be
      // auto-corrected when WMEPH is run.
      static venueIsFlaggable(args) {
        return args.categories.includes('CHARGING_STATION') && args.phone === '+33-1-72676914'; // Nissan Europe ph#
      }
    },
    PlaIsPublic: class extends FlagBase {
      static get defaultMessage() {
        // Add the buttons to the message.
        let msg =
          'If this does not meet the requirements for a <a href="https://wazeopedia.waze.com/wiki/USA/Places/Parking_lot#Lot_Type" ' +
          'target="_blank" style="color:5a5a73">public parking lot</a>, change to:<br>';
        msg += [
          ['RESTRICTED', 'Restricted'],
          ['PRIVATE', 'Private'],
        ]
          .map((btnInfo) => $('<button>', { class: 'wmeph-pla-lot-type-btn btn btn-default btn-xs wmeph-btn', 'data-lot-type': btnInfo[0] }).text(btnInfo[1]).prop('outerHTML'))
          .join('');
        return msg;
      }

      static venueIsFlaggable(args) {
        if (!args.categories.includes('PARKING_LOT')) return false;
        try {
          const parkingType = sdk.DataModel.Venues.ParkingLot.getParkingLotType({ venueId: args.venue.id });
          return parkingType === 'PUBLIC';
        } catch {
          return false;
        }
      }

      postProcess() {
        $('.wmeph-pla-lot-type-btn').click((evt) => {
          const lotType = $(evt.currentTarget).data('lot-type');
          const categoryAttrClone = this.args.venue.categoryAttributes ? JSON.parse(JSON.stringify(this.args.venue.categoryAttributes)) : {};
          categoryAttrClone.PARKING_LOT = categoryAttrClone.PARKING_LOT ?? {};
          categoryAttrClone.PARKING_LOT.parkingType = lotType;
          UPDATED_FIELDS.lotType.updated = true;
          addUpdateAction(this.args.venue, { categoryAttributes: categoryAttrClone }, null, true);
        });
      }
    },
    PlaNameMissing: class extends FlagBase {
      static defaultSeverity = SEVERITY.BLUE;
      static get defaultMessage() {
        return `Name is missing. ${USER.rank < 3 ? 'Request an R3+ lock' : 'Lock to 3+'} to confirm unnamed parking lot.`;
      }
      noLock = true;

      static venueIsFlaggable(args) {
        return args.categories.includes('PARKING_LOT') && !args.nameBase?.replace(/[^A-Za-z0-9]/g, '').length && args.venue.lockRank < 2;
      }
    },
    PlaNameNonStandard: class extends WLFlag {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = 'Parking lot names typically contain words like "Parking", "Lot", and/or "Garage"';
      static WL_KEY = 'plaNameNonStandard';
      static defaultWLTooltip = 'Whitelist non-standard PLA name';

      static venueIsFlaggable(args) {
        if (!this.isWhitelisted(args) && isVenueParkingLot(args.venue)) {
          const name = args.venue.name;
          if (name) {
            const addr = getVenueAddress(args.venue);
            const state = addr?.state?.name;
            const re = state === 'Quebec' ? /\b(parking|stationnement)\b/i : /\b((park[ -](and|&|'?n'?)[ -]ride)|parking|lot|garage|ramp)\b/i;
            if (!re.test(name)) {
              return true;
            }
          }
        }
        return false;
      }
    },
    IndianaLiquorStoreHours: class extends WLFlag {
      static defaultMessage = 'If this is a liquor store, check the hours. As of Feb 2018, liquor stores in Indiana are allowed ' + 'to be open between noon and 8 pm on Sunday.';

      static WL_KEY = 'indianaLiquorStoreHours';
      static defaultWLTooltip = 'Whitelist Indiana liquor store hours';

      static venueIsFlaggable(args) {
        return (
          !args.highlightOnly &&
          !this.isWhitelisted(args) &&
          !args.categories.includes('RESIDENTIAL') &&
          args.addr?.state.name === 'Indiana' &&
          /\b(beers?|wines?|liquors?|spirits)\b/i.test(args.nameBase) &&
          !args.openingHours.some((entry) => entry.days.includes(0))
        );
      }
    },
    HoursOverlap: class extends FlagBase {
      static defaultSeverity = SEVERITY.RED;
      static defaultMessage = 'Overlapping hours of operation. Place might not save.';

      static venueIsFlaggable(args) {
        return args.hoursOverlap;
      }
    },
    UnmappedRegion: class extends WLFlag {
      static WL_KEY = 'unmappedRegion';
      static defaultWLTooltip = 'Whitelist unmapped category';
      static #regionsToFlagOther = ['HI', 'NER', 'NOR', 'NWR', 'PLN', 'ATR'];

      get noLock() {
        return Flag.UnmappedRegion.#getRareCategoryInfos(this.args).some(
          (categoryInfo) =>
            (categoryInfo.id === 'OTHER' && Flag.UnmappedRegion.#regionsToFlagOther.includes(this.args.regionCode) && !this.args.isLocked) || !Flag.UnmappedRegion.isWhitelisted(this.args),
        );
      }

      constructor(args) {
        let showWL = true;
        let severity = SEVERITY.GREEN;
        // let noLock = false;
        let message;
        const categoryNames = [];
        let addOtherMessage = false;

        Flag.UnmappedRegion.#getRareCategoryInfos(args).forEach((categoryInfo) => {
          if (categoryInfo.id === 'OTHER') {
            if (Flag.UnmappedRegion.#regionsToFlagOther.includes(args.region) && !args.isLocked) {
              addOtherMessage = true;
              severity = Math.max(severity, SEVERITY.BLUE);
              showWL = false;
              // noLock = true;
            }
          } else {
            if (Flag.UnmappedRegion.isWhitelisted(args)) {
              showWL = false;
              severity = Math.max(severity, SEVERITY.GREEN);
            } else {
              severity = SEVERITY.YELLOW;
              // noLock = true;
            }
            if (!args.highlightOnly) categoryNames.push(categoryInfo.name);
          }
        });
        if (!args.highlightOnly) {
          const messages = [];
          if (categoryNames.length === 1) {
            messages.push(`The <b>${categoryNames[0]}</b> category is usually not mapped in this region.`);
          } else if (categoryNames.length > 1) {
            messages.push(`These categories are usually not mapped in this region: ${categoryNames.map((name) => `<b>${name}</b>`).join(', ')}`);
          }
          if (addOtherMessage) {
            messages.push('The <b>Other</b> category should only be used if no other category applies. ' + 'Manually lock the place to override this flag.');
          }
          message = messages.join('<br><br>');
        }
        super();
        this.message = message;
        this.severity = severity;
        // this.noLock = noLock;
        this.showWL = showWL;
      }

      static venueIsFlaggable(args) {
        return !args.categories.includes('REST_AREAS') && !!this.#getRareCategoryInfos(args).length;
      }

      static #getRareCategoryInfos(args) {
        return args.categories
          .filter((cat) => cat !== 'RESIDENTIAL') // SDK has RESIDENTIAL as separate type, not a subcategory
          .map((cat) => args.pnhCategoryInfos.getById(cat))
          .filter((pnhCategoryInfo) => pnhCategoryInfo) // Filter out undefined category infos
          .filter((pnhCategoryInfo) => {
            const rareLocalities = pnhCategoryInfo.rare;
            if (rareLocalities.includes(args.state2L) || rareLocalities.includes(args.region) || rareLocalities.includes(args.countryCode)) {
              if (pnhCategoryInfo.id === 'OTHER' && this.#regionsToFlagOther.includes(args.region)) {
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

      static venueIsFlaggable(args) {
        return args.countryCode === PNH_DATA.USA.countryCode && args.categories.includes('REST_AREAS') && !/^Rest Area.* - /.test(args.nameBase + (args.nameSuffix ?? ''));
      }
    },
    RestAreaNoTransportation: class extends ActionFlag {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = 'Rest areas should not use the Transportation category.';
      static defaultButtonText = 'Remove it?';

      static venueIsFlaggable(args) {
        return args.categories.includes('REST_AREAS') && args.categories.includes('TRANSPORTATION');
      }

      action() {
        const categories = this.args.venue.categories.slice(); // create a copy
        const index = categories.indexOf('TRANSPORTATION');
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

      static venueIsFlaggable(args) {
        return args.categories.includes('REST_AREAS') && args.categories.includes('GAS_STATION');
      }
    },
    RestAreaScenic: class extends WLActionFlag {
      static WL_KEY = 'restAreaScenic';
      static defaultWLTooltip = 'Whitelist place';
      static defaultMessage = 'Verify that the "Scenic Overlook" category is appropriate for this rest area. If not: ';
      static defaultButtonText = 'Remove it';
      static defaultButtonTooltip = 'Remove "Scenic Overlook" category.';

      static venueIsFlaggable(args) {
        return !this.isWhitelisted(args) && args.categories.includes('REST_AREAS') && args.categories.includes('SCENIC_LOOKOUT_VIEWPOINT');
      }

      action() {
        const categories = this.args.venue.categories.slice(); // create a copy
        const index = categories.indexOf('SCENIC_LOOKOUT_VIEWPOINT');
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

      static venueIsFlaggable(args) {
        return !this.isWhitelisted(args) && !args.categories.includes('REST_AREAS') && /rest (?:area|stop)|service plaza/i.test(args.nameBase);
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, 'REST_AREAS', 0);
        // make it 24/7
        const openingHours = [new OpeningHour({ days: [1, 2, 3, 4, 5, 6, 0], fromHour: '00:00', toHour: '00:00' })];
        addUpdateAction(this.args.venue, { categories, openingHours }, null, true);
      }
    },
    EVChargingStationWarning: class extends FlagBase {
      static defaultMessage =
        'Please do not delete EV Charging Stations. Be sure you are completely up to date with the latest guidelines in ' +
        '<a href="https://wazeopedia.waze.com/wiki/USA/Places/EV_charging_station" target="_blank">wazeopedia</a>.';

      static venueIsFlaggable(args) {
        return !args.highlightOnly && args.categories.includes('CHARGING_STATION');
      }
    },
    EVCSAltNameMissing: class extends ActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'Public and restricted EV charging stations should have an alternate name of "EV Charging Station"';
      static defaultButtonText = 'Add it';
      static defaultButtonTooltip = 'Add EVCS alternate name';

      static venueIsFlaggable(args) {
        if (!args.categories.includes('CHARGING_STATION')) return false;
        if (args.aliases.some((alias) => alias.toLowerCase() === 'ev charging station')) return false;
        if (args.venue.name.toLowerCase().includes('(private)')) return false;
        try {
          const accessType = sdk.DataModel.Venues.ChargingStation.getChargersAccessType({ venueId: args.venue.id });
          return accessType !== 'PRIVATE';
        } catch {
          return false;
        }
      }

      action() {
        let aliases = this.args.venue.aliases.slice();
        aliases = insertAtIndex(aliases, 'EV Charging Station', 0);
        addUpdateAction(this.args.venue, { aliases }, null);
      }
    },
    EVCSPriceMissing: class extends FlagBase {
      static defaultSeverity = SEVERITY.BLUE;
      static get defaultMessage() {
        let msg = 'EVCS price: ';
        [
          ['FREE', 'Free', 'Free'],
          ['FEE', 'Paid', 'Paid'],
        ].forEach((btnInfo) => {
          msg += $('<button>', {
            id: `wmeph_${btnInfo[0]}`,
            class: 'wmeph-evcs-cost-type-btn btn btn-default btn-xs wmeph-btn',
            title: btnInfo[2],
          })
            .text(btnInfo[1])
            .css({
              padding: '3px',
              height: '20px',
              lineHeight: '0px',
              marginRight: '2px',
              marginBottom: '1px',
              minWidth: '18px',
            })
            .prop('outerHTML');
        });
        return msg;
      }

      constructor() {
        super();
        this.noLock = true;
      }

      static venueIsFlaggable(args) {
        if (!args.categories.includes('CHARGING_STATION')) return false;
        try {
          const costType = sdk.DataModel.Venues.ChargingStation.getCostType({ venueId: args.venue.id });
          return !costType || costType === 'COST_TYPE_UNSPECIFIED';
        } catch {
          return false;
        }
      }

      postProcess() {
        $('.wmeph-evcs-cost-type-btn').click((evt) => {
          const selectedValue = $(evt.currentTarget).attr('id').replace('wmeph_', '');
          let attrClone;
          if (this.args.venue.categoryAttributes) {
            attrClone = JSON.parse(JSON.stringify(this.args.venue.categoryAttributes));
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
      static defaultMessage = '<a href="https://wazeopedia.waze.com/wiki/USA/Places/Gas_station#Name" target="_blank" class="red">' + 'Gas brand should typically be included in the place name.</a>';

      static venueIsFlaggable(args) {
        // For gas stations, check to make sure brand exists somewhere in the place name.
        // Remove non - alphanumeric characters first, for more relaxed matching.
        if (args.categories[0] === 'GAS_STATION' && args.brand) {
          const compressedName = (args.nameBase + args.nameSuffix ?? '').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
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
          if (!compressedBrands.some((compressedBrand) => compressedName.includes(compressedBrand))) {
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

      static venueIsFlaggable(args) {
        return args.categories.includes('GAS_STATION') && args.brand === 'Unbranded';
      }
    },
    GasMkPrim: class extends ActionFlag {
      static defaultSeverity = SEVERITY.RED;
      static defaultMessage = 'Gas Station should be the primary category';
      static defaultButtonText = 'Fix';
      static defaultButtonTooltip = 'Make the Gas Station category the primary category.';

      static venueIsFlaggable(args) {
        return args.categories.indexOf('GAS_STATION') > 0;
      }

      action() {
        // Move Gas category to the first position
        const categories = insertAtIndex(this.args.venue.categories, 'GAS_STATION', 0);
        addUpdateAction(this.args.venue, { categories }, null, true);
      }
    },
    IsThisAPilotTravelCenter: class extends ActionFlag {
      static defaultMessage = 'Is this a "Travel Center"?';
      static defaultButtonText = 'Yes';

      static venueIsFlaggable(args) {
        return !args.highlightOnly && args.state2L === 'TN' && args.nameBase.toLowerCase().trim() === 'pilot food mart';
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

      static venueIsFlaggable(args) {
        return args.priPNHPlaceCat === 'HOTEL' && args.categories.indexOf('HOTEL') !== 0;
      }

      action() {
        // Insert/move Hotel category in the first position
        const categories = insertAtIndex(this.args.venue.categories.slice(), 'HOTEL', 0);
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

      static venueIsFlaggable(args) {
        if (!this.isWhitelisted(args)) {
          const testName = name.toLowerCase().replace(/[^a-z]/g, ' ');
          const testNameWords = testName.split(' ');
          if (
            (args.categories.includes('HOSPITAL_URGENT_CARE') || args.categories.includes('DOCTOR_CLINIC')) &&
            (containsAny(testNameWords, Pnh.ANIMAL_FULL_MATCH) || Pnh.ANIMAL_PART_MATCH.some((match) => testName.includes(match)))
          ) {
            return true;
          }
        }
        return false;
      }

      action() {
        let updated = false;
        let categories = uniq(this.args.venue.categories.slice());
        categories.forEach((cat, idx) => {
          if (cat === 'HOSPITAL_URGENT_CARE' || cat === 'DOCTOR_CLINIC') {
            categories[idx] = 'PET_STORE_VETERINARIAN_SERVICES';
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

      static venueIsFlaggable(args) {
        if (!this.isWhitelisted(args)) {
          const testName = args.nameBase.toLowerCase().replace(/[^a-z]/g, ' ');
          const testNameWords = testName.split(' ');

          if (args.categories.includes('SCHOOL') && (containsAny(testNameWords, Pnh.SCHOOL_FULL_MATCH) || Pnh.SCHOOL_PART_MATCH.some((match) => testName.includes(match)))) {
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

      constructor(args) {
        let severity;
        let showWL = true;

        const makeGreen = Flag.PointNotArea.isWhitelisted(args) || args.venue.lockRank >= args.defaultLockLevel;

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

      static venueIsFlaggable(args) {
        // Check if any category is configured in PNH data as an area
        const hasCategoryConfiguredAsArea = args.categories.some(cat =>
          isCategoryConfiguredAsArea(cat, args.pnhCategoryInfos, args.regionCode)
        );
        if (hasCategoryConfiguredAsArea) {
          return false;
        }
        return !isVenuePoint(args.venue) && (args.categories.includes('RESIDENCE_HOME') || (args.maxAreaSeverity > SEVERITY.BLUE && !args.categories.includes('REST_AREAS')));
      }

      action() {
        const { venue } = this.args;
        if (isVenueResidential(venue)) {
          // Residential areas cannot be converted to points
          return;
        }

        // Convert area polygon to point at polygon centroid
        const coords = venue.geometry.coordinates[0]; // First ring of polygon
        const lon = coords.reduce((sum, [x]) => sum + x, 0) / coords.length;
        const lat = coords.reduce((sum, [, y]) => sum + y, 0) / coords.length;

        const point = {
          type: 'Point',
          coordinates: [lon, lat],
        };

        sdk.DataModel.Venues.updateVenue({ venueId: venue.id, geometry: point });
        harmonizePlaceGo(venue, 'harmonize');
      }
    },
    AreaNotPoint: class extends WLActionFlag {
      static defaultButtonText = 'Change to area';
      static defaultButtonTooltip = 'Change to Area Place';
      static WL_KEY = 'areaNotPoint';
      static defaultWLTooltip = 'Whitelist area (not point)';
      static #collegeAbbrRegExps;

      get message() {
        if (this.args.maxPointSeverity === SEVERITY.RED) {
          return 'This category should be an area place.';
        }
        return 'This category is usually an area place, but can be a point in some cases. Verify if point is appropriate.';
      }

      constructor(args) {
        let severity;
        let showWL = true;

        const makeGreen =
          Flag.AreaNotPoint.isWhitelisted(args) || args.venue.lockRank >= args.defaultLockLevel || (args.maxPointSeverity === SEVERITY.BLUE && Flag.AreaNotPoint.#hasCollegeInName(args.nameBase));

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

      static venueIsFlaggable(args) {
        // If category is configured as area in PNH data, flag point venues
        const hasCategoryConfiguredAsArea = args.categories.some(cat =>
          isCategoryConfiguredAsArea(cat, args.pnhCategoryInfos, args.regionCode)
        );
        if (hasCategoryConfiguredAsArea) {
          return isVenuePoint(args.venue);
        }
        return isVenuePoint(args.venue) && (args.maxPointSeverity > SEVERITY.GREEN || args.categories.includes('REST_AREAS'));
      }

      static #hasCollegeInName(name) {
        if (!this.#collegeAbbrRegExps) {
          this.#collegeAbbrRegExps = COLLEGE_ABBREVIATIONS.map((abbr) => new RegExp(`\\b${abbr}\\b`, 'g'));
        }
        return this.#collegeAbbrRegExps.some((re) => re.test(name));
      }

      action() {
        const { venue } = this.args;
        if (!isVenuePoint(venue)) return; // Already an area

        // Convert point to small square polygon (like WME does)
        const [lon, lat] = venue.geometry.coordinates;
        const offset = 0.0001; // ~10 meters
        const square = {
          type: 'Polygon',
          coordinates: [
            [
              [lon - offset, lat - offset],
              [lon + offset, lat - offset],
              [lon + offset, lat + offset],
              [lon - offset, lat + offset],
              [lon - offset, lat - offset], // Close polygon
            ],
          ],
        };

        // Update venue geometry (SDK tracks as unsaved; user commits via WME Save button)
        sdk.DataModel.Venues.updateVenue({ venueId: venue.id, geometry: square });
        harmonizePlaceGo(venue, 'harmonize');
      }
    },
    HnMissing: class extends WLActionFlag {
      static defaultButtonText = 'Add';
      static defaultButtonTooltip = 'Add HN to place';
      static WL_KEY = 'HNWL';
      static defaultWLTooltip = 'Whitelist empty HN';

      static #TEXTBOX_ID = 'WMEPH-HNAdd';
      noBannerAssemble = true;

      get message() {
        let msg = `No HN: <input type="text" id="${Flag.HnMissing.#TEXTBOX_ID}" autocomplete="off" ` + 'style="font-size:0.85em;width:100px;padding-left:2px;color:#000;" > ';

        if (this.args.categories.includes('PARKING_LOT') && this.args.venue.lockRank < 2) {
          if (USER.rank < 3) {
            msg += 'Request an R3+ lock to confirm no HN.';
          } else {
            msg += 'Lock to R3+ to confirm no HN.';
          }
        }
        return msg;
      }

      constructor(args) {
        let showWL = true;
        let severity = SEVERITY.RED;
        let noLock = false;
        if (args.state2L === 'PR' || args.categories[0] === 'SCENIC_LOOKOUT_VIEWPOINT') {
          severity = SEVERITY.GREEN;
          showWL = false;
        } else if (args.categories.includes('PARKING_LOT')) {
          showWL = false;
          if (args.venue.lockRank < 2) {
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

      static venueIsFlaggable(args) {
        const CATEGORIES_TO_IGNORE = ['BRIDGE', 'ISLAND', 'FOREST_GROVE', 'SEA_LAKE_POOL', 'RIVER_STREAM', 'CANAL', 'DAM', 'TUNNEL', 'JUNCTION_INTERCHANGE', 'SWAMP_MARSH', 'NATURAL_FEATURES'];
        const hasNoHN = !args.currentHN?.replace(/\D/g, '');
        const isRestArea = args.categories.includes('REST_AREAS');
        return args.hasStreet && args.hasCity && hasNoHN && !CATEGORIES_TO_IGNORE.includes(args.categories[0]) && !isRestArea;
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
          sdk.DataModel.Venues.updateAddress({
            venueId: this.args.venue.id,
            houseNumber: hnTempDash,
          });
          harmonizePlaceGo(this.args.venue, 'harmonize', []); // Rerun the script to update fields and lock
          UPDATED_FIELDS.address.updated = true;
        } else {
          Flag.HnMissing.#getTextbox().css({ backgroundColor: '#FDD' }).attr('title', 'Must be a number between 0 and 1000000');
        }
      }

      postProcess() {
        // If pressing enter in the HN entry box, add the HN
        const textbox = Flag.HnMissing.#getTextbox();
        textbox.keyup((evt) => {
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

      static venueIsFlaggable(args) {
        return !this.isWhitelisted(args) && args.currentHN?.replace(/[^0-9]/g, '').length > 6;
      }
    },
    // 2020-10-5 HN's with letters have been allowed since last year.  Currently, RPPs can be saved with a number
    // followed by up to 4 letters but it's not clear if the app actually searches if only 1, 2, or more letters
    // are present.  Other places can have a more flexible HN (up to 15 characters long, total. A single space between
    // the # and letters. Etc)

    /*
        ARCHIVED: House Number validation logic (v2020-10-5)
        This code was disabled due to complexity and unclear requirements.
        If re-enabling HN validation, review the following:
        - HnNonStandard class logic for determining valid HN patterns
        - State-specific HN formats (NY Queens format, HI format, etc.)
        - Integration with whitelist system (_wl.hnNonStandard)
        - Verify compatibility with current SDK approach to address harmonization

        See git history for full implementation details.
        */
    HNRange: class extends WLFlag {
      static defaultMessage = 'House number seems out of range for the street name. Verify.';
      static defaultSeverity = SEVERITY.YELLOW;
      static WL_KEY = 'HNRange';
      static defaultWLTooltip = 'Whitelist HN range';

      static venueIsFlaggable(args) {
        if (!this.isWhitelisted(args) && _dupeHNRangeList.length > 3) {
          let dhnix;
          const dupeHNRangeListSorted = [];
          sortWithIndex(_dupeHNRangeDistList);
          for (dhnix = 0; dhnix < _dupeHNRangeList.length; dhnix++) {
            dupeHNRangeListSorted.push(_dupeHNRangeList[_dupeHNRangeDistList.sortIndices[dhnix]]);
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

      constructor(args) {
        super();
        if (args.categories[0] === 'SCENIC_LOOKOUT_VIEWPOINT') {
          this.severity = SEVERITY.BLUE;
        }
      }

      static venueIsFlaggable(args) {
        const CATEGORIES_TO_IGNORE = ['BRIDGE', 'ISLAND', 'FOREST_GROVE', 'SEA_LAKE_POOL', 'RIVER_STREAM', 'CANAL', 'DAM', 'TUNNEL', 'JUNCTION_INTERCHANGE', 'NATURAL_FEATURES'];
        return (
          args.addr.city &&
          (!args.addr.street || args.addr.street.isEmpty) &&
          !CATEGORIES_TO_IGNORE.includes(args.categories[0]) &&
          !args.categories.includes('REST_AREAS')
        );
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
            const streetAutocomplete = document.querySelector('#venue-edit-general > div:nth-child(1) > div > div > wz-card > form > div:nth-child(2) > div > wz-autocomplete');
            const input = streetAutocomplete?.shadowRoot?.querySelector('wz-text-input')?.shadowRoot?.querySelector('input');
            input?.focus();
          }, 100);
        }, 100);
      }
    },
    CityMissing: class extends ActionFlag {
      static defaultSeverity = SEVERITY.RED;
      static defaultMessage = 'No city:';
      static defaultButtonText = 'Edit address';
      static defaultButtonTooltip = 'Edit address to add city.';

      constructor(args) {
        super();
        if (args.categories.includes('RESIDENCE_HOME') && args.highlightOnly) {
          this.severity = SEVERITY.BLUE;
        }
      }

      static venueIsFlaggable(args) {
        const CATEGORIES_TO_IGNORE = ['BRIDGE', 'ISLAND', 'FOREST_GROVE', 'SEA_LAKE_POOL', 'RIVER_STREAM', 'CANAL', 'DAM', 'TUNNEL', 'JUNCTION_INTERCHANGE', 'NATURAL_FEATURES'];
        return (
          (!args.addr.city || args.addr.city.isEmpty) &&
          !CATEGORIES_TO_IGNORE.includes(args.categories[0]) &&
          !args.categories.includes('REST_AREAS')
        );
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
            const cityAutocomplete = document.querySelector('#venue-edit-general > div:nth-child(1) > div > div > wz-card > form > div:nth-child(4) > wz-autocomplete');
            const input = cityAutocomplete?.shadowRoot?.querySelector('wz-text-input')?.shadowRoot?.querySelector('input');
            input?.focus();
          }, 100);
        }, 100);
      }
    },
    BankType1: class extends FlagBase {
      static defaultSeverity = SEVERITY.RED;
      static defaultMessage = 'Clarify the type of bank: the name has ATM but the primary category is Offices';

      static venueIsFlaggable(args) {
        return (
          (!args.pnhNameRegMatch || (args.pnhNameRegMatch && args.priPNHPlaceCat === 'BANK_FINANCIAL' && !args.pnhMatch.notABank)) && args.categories[0] === 'OFFICES' && /\batm\b/i.test(name)
        );
      }
    },
    // TODO: Fix if the name has "(ATM)" or " - ATM" or similar. This flag is not currently catching those.
    BankBranch: class extends ActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'Is this a bank branch office? ';
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Is this a bank branch?';

      static venueIsFlaggable(args) {
        let flaggable = false;
        if (!args.priPNHPlaceCat || (args.priPNHPlaceCat === 'BANK_FINANCIAL' && !args.pnhMatch.notABank)) {
          const ixBank = args.categories.indexOf('BANK_FINANCIAL');
          const ixATM = args.categories.indexOf('ATM');
          const ixOffices = args.categories.indexOf('OFFICES');

          if (/\batm\b/gi.test(args.nameBase)) {
            flaggable = ixOffices === 0 || (ixBank === -1 && ixATM === -1) || (ixATM === 0 && ixBank > 0) || ixBank > -1;
          } else if (ixBank > -1 || ixATM > -1) {
            flaggable = ixOffices === 0 || (ixATM === 0 && ixBank === -1) || (ixBank > 0 && ixATM > 0);
          } else if (args.priPNHPlaceCat) {
            flaggable = ixBank === -1 && !(/\bcorporate offices\b/i.test(args.nameSuffix) && ixOffices === 0);
          }
        }
        return flaggable;
      }

      action() {
        const newAttributes = {};

        const originalCategories = this.args.venue.categories;
        const newCategories = insertAtIndex(originalCategories, ['BANK_FINANCIAL', 'ATM'], 0); // Change to bank and atm cats
        if (!arraysAreEqual(originalCategories, newCategories)) {
          newAttributes.categories = newCategories;
        }

        // strip ATM from name if present
        const originalName = this.args.venue.name;
        const newName = originalName
          .replace(/[- (]*ATM[- )]*/gi, ' ')
          .replace(/^ /g, '')
          .replace(/ $/g, '');
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

      static venueIsFlaggable(args) {
        let flaggable = false;
        if (!args.priPNHPlaceCat || (args.priPNHPlaceCat === 'BANK_FINANCIAL' && !args.pnhMatch.notABank)) {
          const ixBank = args.categories.indexOf('BANK_FINANCIAL');
          const ixATM = args.categories.indexOf('ATM');
          const ixOffices = args.categories.indexOf('OFFICES');

          if (/\batm\b/gi.test(args.nameBase)) {
            flaggable = ixOffices === 0 || (ixBank === -1 && ixATM === -1) || ixBank > -1;
          } else if (ixBank > -1 || ixATM > -1) {
            flaggable = ixOffices === 0 || (ixATM === 0 && ixBank === -1) || (ixBank > 0 && ixATM > 0);
          } else {
            flaggable = args.priPNHPlaceCat && !(/\bcorporate offices\b/i.test(args.nameSuffix) && ixOffices === 0);
          }
        }
        return flaggable;
      }

      action() {
        const newAttributes = {};

        const originalName = this.args.venue.name;
        if (!/\bATM\b/i.test(originalName)) {
          newAttributes.name = `${originalName} ATM`;
        }

        const atmCategory = ['ATM'];
        if (!arraysAreEqual(this.args.venue.categories, atmCategory)) {
          newAttributes.categories = atmCategory; // Change to ATM only
        }

        addUpdateAction(this.args.venue, newAttributes, null, true);
      }
    },
    BankCorporate: class extends ActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = "Or is this the bank's corporate offices?";
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = "Is this the bank's corporate offices?";

      static venueIsFlaggable(args) {
        let flaggable = false;
        if (!args.priPNHPlaceCat) {
          flaggable = /\batm\b/gi.test(args.nameBase) && args.categories.indexOf('OFFICES') === 0;
        } else if (args.priPNHPlaceCat === 'BANK_FINANCIAL' && !args.pnhMatch.notABank) {
          flaggable = !containsAny(args.categories, ['BANK_FINANCIAL', 'ATM']) && !/\bcorporate offices\b/i.test(args.nameSuffix);
        }
        return flaggable;
      }

      action() {
        const newAttributes = {};

        const officesCategory = ['OFFICES'];
        if (!arraysAreEqual(this.args.venue.categories, officesCategory)) {
          newAttributes.categories = officesCategory;
        }

        // strip ATM from name if present
        const originalName = this.args.venue.name;
        let newName = originalName
          .replace(/[- (]*atm[- )]*/gi, ' ')
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
        URLS.uspsWiki
      }" style="color:#3a3a3a;" target="_blank">the guidelines</a>.`;

      static venueIsFlaggable(args) {
        return !args.highlightOnly && args.isUspsPostOffice;
      }
    },
    IgnEdited: class extends FlagBase {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = 'Last edited by an IGN editor';

      static venueIsFlaggable(args) {
        return !args.categories.includes('RESIDENCE_HOME') && args.venue.modificationData.updatedBy && /^ign_/i.test(args.venue.modificationData.updatedBy);
      }
    },
    WazeBot: class extends ActionFlag {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = 'Edited last by an automated process. Please verify information is correct.';
      static defaultButtonText = 'Nudge';
      static defaultButtonTooltip = 'If no other properties need to be updated, click to nudge the place (force an edit).';
      static #botNames = [/^waze-maint/i, /^waze3rdparty$/i, /^WazeParking1$/i, /^admin$/i, /^avsus$/i];

      static venueIsFlaggable(args) {
        const isUnchanged = !args.venue.isNew && !args.venue.modificationData.updatedBy;
        let flaggable = isUnchanged && !args.categories.includes('RESIDENCE_HOME') && !args.venue._hasBeenNudged;
        if (flaggable) {
          const lastUpdatedByName = args.venue.modificationData.updatedBy ?? args.venue.modificationData.createdBy;
          flaggable = this.#botNames.some((botName) => botName.test(lastUpdatedByName));
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
          .filter((category) => Flag.ParentCategory.categoryIsDisallowedParent(category, this.args))
          .map((category) => this.args.pnhCategoryInfos.getById(category));
        if (badCatInfos.length === 1) {
          msg = `The <b>${badCatInfos[0].name}</b> parent category is usually not mapped in this region.`;
        } else {
          msg = 'These parent categories are usually not mapped in this region: ';
          msg += badCatInfos.map((catInfo) => `<b>${catInfo.name}</b>`).join(', ');
        }
        return msg;
      }

      static categoryIsDisallowedParent(category, args) {
        const pnhCategoryInfo = args.pnhCategoryInfos.getById(category);
        const localities = pnhCategoryInfo.disallowedParent;
        return localities.includes(args.state2L) || localities.includes(args.region) || localities.includes(args.countryCode);
      }

      static venueIsFlaggable(args) {
        return args.categories.some((category) => this.categoryIsDisallowedParent(category, args));
      }
    },
    CheckDescription: class extends FlagBase {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = 'Description field already contained info; PNH description was added in front of existing. Check for inconsistency or duplicate info.';

      static venueIsFlaggable(args) {
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

      static venueIsFlaggable(args) {
        // args.description is only available in WMEPH mode (not during scanning)
        // Only check for copyrighted content if description is accessible
        return !isVenueResidential(args.venue) && args.totalSeverity < SEVERITY.RED && !this.isWhitelisted(args) && args.description && /(google|yelp)/i.test(args.description);
      }
    },
    ResiTypeName: class extends WLFlag {
      static defaultMessage = 'The place name suggests a residential place or personalized place of work.  Please verify.';
      static WL_KEY = 'resiTypeName';
      static defaultWLTooltip = 'Whitelist Residential-type name';

      constructor(likelyResidential) {
        super();
        if (likelyResidential) this.severity = SEVERITY.YELLOW;
      }

      // TODO: make this a public method and pass the result to args so args can be passed into vanueIsFlaggable
      static #likelyResidentialName(alphaName) {
        return /^((my|mi|moms|dads)?\s*(home|work|office|casa|house))|(mom|dad)$/i.test(alphaName);
      }

      static #possiblyResidentialName(alphaName, categories) {
        return /('?s|my)\s+(house|home|work)/i.test(alphaName) && !containsAny(categories, ['RESTAURANT', 'DESSERT', 'BAR']);
      }

      static #isPreflaggable(args) {
        return !args.categories.includes('RESIDENCE_HOME') && !args.pnhNameRegMatch && !this.isWhitelisted(args) && args.totalSeverity < SEVERITY.RED;
      }

      // TODO
      static #venueIsFlaggable(preflaggable, likelyResidential, alphaName, categories) {
        return preflaggable && (likelyResidential || this.#possiblyResidentialName(alphaName, categories));
      }

      static eval(args) {
        const preflaggable = this.#isPreflaggable(args);
        if (preflaggable) {
          const alphaName = name.replace(/[^A-Z ]/i, ''); // remove non-alpha characters
          const likelyResidential = this.#likelyResidentialName(alphaName);
          if (this.#venueIsFlaggable(preflaggable, likelyResidential, alphaName, args.categories)) return new this(likelyResidential);
        }
        return null;
      }
    },
    Mismatch247: class extends FlagBase {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = 'Hours of operation listed as open 24hrs but not for all 7 days.';

      static venueIsFlaggable(args) {
        return (
          args.openingHours.length === 1 &&
          args.openingHours[0].days.length < 7 &&
          /^0?0:00$/.test(args.openingHours[0].fromHour) &&
          (/^0?0:00$/.test(args.openingHours[0].toHour) || args.openingHours[0].toHour === '23:59')
        );
      }
    },
    PhoneInvalid: class extends FlagBase {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = 'Phone # is invalid.';

      static venueIsFlaggable(args) {
        if (!args.phone) return false;
        const normalizedPhone = normalizePhone(args.phone, args.outputPhoneFormat);
        return (args.highlightOnly && normalizedPhone !== args.phone) || (!args.highlightOnly && normalizedPhone === BAD_PHONE);
      }
    },
    UrlMismatch: class extends WLActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = "Existing URL doesn't match the suggested PNH URL. Use the Website button below to verify the existing URL is valid. If not:";
      static defaultButtonText = 'Use PNH URL';
      static defaultButtonTooltip = 'Change URL to the PNH standard';
      static WL_KEY = 'longURL';
      static defaultWLTooltip = 'Whitelist existing URL';

      static venueIsFlaggable(args) {
        // for cases where there is an existing URL in the WME place, and there is a PNH url on queue:
        return !isNullOrWhitespace(args.url) && !isNullOrWhitespace(args.pnhUrl) && args.url !== args.pnhUrl && args.pnhUrl !== BAD_URL;
      }

      action() {
        if (!isNullOrWhitespace(this.args.pnhUrl)) {
          addUpdateAction(this.args.venue, { url: this.args.pnhUrl }, null, true);
        } else {
          WazeWrap.Alerts.error(SCRIPT_NAME, 'URL Matching Error!');
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
      static URL_ANALYTICS_REGEX = /(?<=&|\?)(utm_|y_|(wtextnd)?source=|cmpid=|cid=|otppartnerid=|campaignid=|ref=|cmp=).*?(&|$)/gi;

      static venueIsFlaggable(args) {
        return !isNullOrWhitespace(args.url) && args.url !== args.pnhUrl && Flag.UrlAnalytics.URL_ANALYTICS_REGEX.test(args.url);
      }

      action() {
        const url = Flag.UrlAnalytics.#stripUrlAnalyticsQueries(this.args.url);
        addUpdateAction(this.args.venue, { url }, null, true);
      }

      static #stripUrlAnalyticsQueries(url) {
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

      get message() {
        return `Lock to L${this.args.levelToLock + 1}+ to verify no gas brand.`;
      }

      constructor() {
        super();
        this.noLock = true;
      }

      static venueIsFlaggable(args) {
        // If gas station is missing brand, don't flag if place is locked as high as user can lock it.
        return args.categories.includes('GAS_STATION') && !args.brand && args.venue.lockRank < args.levelToLock;
      }
    },
    SubFuel: class extends WLFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'Make sure this place is for the gas station itself and not the main store building. Otherwise undo and check the categories.';
      static WL_KEY = 'subFuel';
      static defaultWLTooltip = 'Whitelist no gas brand';

      static venueIsFlaggable(args) {
        return !this.isWhitelisted(args) && args.pnhMatch.subFuel && !/\bgas(oline)?\b/i.test(args.venue.name) && !/\bfuel\b/i.test(args.venue.name);
      }
    },
    AddCommonEVPaymentMethods: class extends WLActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultButtonText = 'Add network payment methods';
      static defaultButtonTooltip = 'Please verify first! If any are not needed, click the WL button and manually add any needed payment methods.';
      static WL_KEY = 'addCommonEVPaymentMethods';
      static defaultWLTooltip = 'Whitelist common EV payment types';

      get message() {
        const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.venue.id });
        let msg = `These common payment methods for the ${network} network are missing. Verify if they are needed here:`;
        this.originalNetwork = network;
        const translations = I18n.translations[I18n.locale].edit.venue.category_attributes.payment_methods;
        const paymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: this.args.venue.id });
        const list = COMMON_EV_PAYMENT_METHODS[network]
          .filter((method) => !paymentMethods?.includes(method))
          .map((method) => `- ${translations[method]}`)
          .join('<br>');
        msg += `<br>${list}<br>`;
        return msg;
      }

      static venueIsFlaggable(args) {
        if (args.categories.includes('CHARGING_STATION') && !this.isWhitelisted(args)) {
          try {
            const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: args.venue.id });
            if (!network || !COMMON_EV_PAYMENT_METHODS[network]) return false;
            const paymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: args.venue.id });
            return !!COMMON_EV_PAYMENT_METHODS[network]?.some((method) => !paymentMethods?.includes(method));
          } catch (e) {
            logDev(`AddCommonEVPaymentMethods.venueIsFlaggable error: ${e.message}`);
            return false;
          }
        }
        return false;
      }

      action() {
        if (!isVenueChargingStation(this.args.venue)) {
          WazeWrap.Alerts.info(SCRIPT_NAME, 'This is no longer a charging station. Please run WMEPH again.', false, false);
          return;
        }

        try {
          const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.venue.id });
          if (network !== this.originalNetwork) {
            WazeWrap.Alerts.info(SCRIPT_NAME, 'EV charging station network has changed. Please run WMEPH again.', false, false);
            return;
          }

          const currentPaymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: this.args.venue.id }) ?? [];
          const newPaymentMethods = currentPaymentMethods.slice();
          const commonPaymentMethods = COMMON_EV_PAYMENT_METHODS[network];
          commonPaymentMethods.forEach((method) => {
            if (!newPaymentMethods.includes(method)) newPaymentMethods.push(method);
          });

          const categoryAttributes = this.args.venue.categoryAttributes || {};
          const categoryAttrClone = JSON.parse(JSON.stringify(categoryAttributes));
          categoryAttrClone.CHARGING_STATION ??= {};
          categoryAttrClone.CHARGING_STATION.paymentMethods = newPaymentMethods;

          UPDATED_FIELDS.evPaymentMethods.updated = true;
          addUpdateAction(this.args.venue, { categoryAttributes: categoryAttrClone }, null, true);
        } catch (e) {
          logDev(`AddCommonEVPaymentMethods.action error: ${e.message}`);
          WazeWrap.Alerts.error(SCRIPT_NAME, 'Error updating payment methods', false, false);
        }
      }
    },
    RemoveUncommonEVPaymentMethods: class extends WLActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultButtonText = 'Remove network payment methods';
      static defaultButtonTooltip = 'Please verify first! If any should NOT be removed, click the WL button and manually remove any unneeded payment methods.';
      static WL_KEY = 'removeUncommonEVPaymentMethods';
      static defaultWLTooltip = 'Whitelist uncommon EV payment types';

      #network;
      #paymentMethods;

      get message() {
        try {
          this.#network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.venue.id });
          this.originalNetwork = this.#network;
          let msg = `These payment methods are uncommon for the ${this.#network} network. Verify if they are needed here:`;
          this.#paymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: this.args.venue.id }) ?? [];
          const translations = I18n.translations[I18n.locale].edit.venue.category_attributes.payment_methods;
          const list = this.#paymentMethods
            ?.filter((method) => !COMMON_EV_PAYMENT_METHODS[this.#network]?.includes(method))
            .map((method) => `- ${translations[method]}`)
            .join('<br>');
          msg += `<br>${list}<br>`;
          return msg;
        } catch (e) {
          logDev(`RemoveUncommonEVPaymentMethods.message error: ${e.message}`);
          return 'Error retrieving payment method information';
        }
      }

      static venueIsFlaggable(args) {
        if (args.categories.includes('CHARGING_STATION') && !this.isWhitelisted(args)) {
          try {
            const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: args.venue.id });
            if (!network || !COMMON_EV_PAYMENT_METHODS.hasOwnProperty(network)) return false;
            const paymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: args.venue.id });
            return !!paymentMethods?.some((method) => !COMMON_EV_PAYMENT_METHODS[network]?.includes(method));
          } catch (e) {
            logDev(`RemoveUncommonEVPaymentMethods.venueIsFlaggable error: ${e.message}`);
            return false;
          }
        }
        return false;
      }

      action() {
        if (!isVenueChargingStation(this.args.venue)) {
          WazeWrap.Alerts.info(SCRIPT_NAME, 'This is no longer a charging station. Please run WMEPH again.', false, false);
          return;
        }

        try {
          // Verify network hasn't changed, but use cached payment methods from message getter
          const currentNetwork = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.venue.id });
          if (currentNetwork !== this.originalNetwork) {
            WazeWrap.Alerts.info(SCRIPT_NAME, 'EV charging station network has changed. Please run WMEPH again.', false, false);
            return;
          }

          const commonPaymentMethods = COMMON_EV_PAYMENT_METHODS[currentNetwork];
          const newPaymentMethods = this.#paymentMethods.slice().filter((method) => commonPaymentMethods?.includes(method));

          const categoryAttributes = this.args.venue.categoryAttributes || {};
          const categoryAttrClone = JSON.parse(JSON.stringify(categoryAttributes));
          categoryAttrClone.CHARGING_STATION ??= {};
          categoryAttrClone.CHARGING_STATION.paymentMethods = newPaymentMethods;

          UPDATED_FIELDS.evPaymentMethods.updated = true;
          addUpdateAction(this.args.venue, { categoryAttributes: categoryAttrClone }, null, true);
        } catch (e) {
          logDev(`RemoveUncommonEVPaymentMethods.action error: ${e.message}`);
          WazeWrap.Alerts.error(SCRIPT_NAME, 'Error updating payment methods', false, false);
        }
      }
    },
    FormatUSPS: class extends FlagBase {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = `Name the post office according to this region's <a href="${URLS.uspsWiki}" style="color:#3232e6" target="_blank">standards for USPS post offices</a>`;

      static venueIsFlaggable(args) {
        return args.isUspsPostOffice && !this.isNameOk(this.getCleanNameParts(args.nameBase, args.nameSuffix).join(''), args.state2L, args.addr);
      }

      static getCleanNameParts(name, nameSuffix) {
        name = name.trimLeft().replace(/ {2,}/, ' ');
        if (nameSuffix) {
          nameSuffix = nameSuffix
            .trimRight()
            .replace(/\bvpo\b/i, 'VPO')
            .replace(/\bcpu\b/i, 'CPU')
            .replace(/ {2,}/, ' ');
        }
        return [name, nameSuffix || ''];
      }

      static isNameOk(name, state2L, addr) {
        return this.#getPostOfficeRegEx(state2L, addr).test(name);
      }

      static #getPostOfficeRegEx(state2L, addr) {
        return state2L === 'KY' || (state2L === 'NY' && ['Queens', 'Bronx', 'Manhattan', 'Brooklyn', 'Staten Island'].includes(addr.city?.name))
          ? /^post office \d{5}( [-–](?: cpu| vpo)?(?: [a-z0-9]+){1,})?$/i
          : /^post office [-–](?: cpu| vpo)?(?: [a-z0-9]+){1,}$/i;
      }
    },
    MissingUSPSAlt: class extends ActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'USPS post offices must have an alternate name of "USPS".';
      static defaultButtonText = 'Add it';
      static defaultButtonTooltip = 'Add USPS alternate name';

      static venueIsFlaggable(args) {
        return args.isUspsPostOffice && !args.aliases.some((alias) => alias.toUpperCase() === 'USPS');
      }

      action() {
        const aliases = this.args.venue.aliases.slice();
        if (!aliases.some((alias) => alias === 'USPS')) {
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

      static venueIsFlaggable(args) {
        return args.isUspsPostOffice && !args.aliases.some((alias) => /\d{5}/.test(alias));
      }

      action() {
        const $input = $(`input#${Flag.MissingUSPSZipAlt.#TEXTBOX_ID}`);
        const zip = $input.val().trim();
        if (zip) {
          if (/^\d{5}/.test(zip)) {
            const aliases = [].concat(this.args.venue.aliases);
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
        $textbox.keyup((evt) => {
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
        URLS.uspsWiki
      }" style="color:#3232e6" target="_blank">USPS post office</a> must be CITY, STATE(2-letter) ZIP, e.g. "Lexington, KY 40511"`;

      static WL_KEY = 'missingUSPSDescription';
      static defaultWLTooltip = 'Whitelist missing USPS address line in description';

      static venueIsFlaggable(args) {
        // Only validate description during harmonization, not during scanning.
        // Description is not available in the SDK Venue object, so we read it from the DOM during harmonization.
        // During scanning (highlightOnly=true), the edit form is not open so the description is inaccessible.
        if (args.isUspsPostOffice && !args.highlightOnly) {
          const lines = args.description?.split('\n');
          return !lines?.length || !/^.{2,}, [A-Z]{2}\s{1,2}\d{5}$/.test(lines[0]);
        }
        return false;
      }
    },
    CatHotel: class extends FlagBase {
      constructor(args) {
        const pnhName = args.pnhMatch.name;
        super(`Check hotel website for any name localization (e.g. ${pnhName} - Tampa Airport).`);
      }

      static venueIsFlaggable(args) {
        return args.priPNHPlaceCat === 'HOTEL' && (args.nameBase + (args.nameSuffix || '')).toUpperCase() === args.pnhMatch.name.toUpperCase();
      }
    },
    LocalizedName: class extends WLFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static WL_KEY = 'localizedName';
      static defaultWLTooltip = 'Whitelist localization';

      get message() {
        return this.args.pnhMatch.displaynote || 'Place needs localization information';
      }

      static venueIsFlaggable(args) {
        if (args.pnhMatch.localizationRegEx) {
          const testName = args.nameBase + (args.nameSuffix || '');
          // Reset lastIndex for regex with global flag (known JS bug: .test() with /g alternates results)
          args.pnhMatch.localizationRegEx.lastIndex = 0;
          const matches = args.pnhMatch.localizationRegEx.test(testName);
          return !matches;
        }
        return false;
      }
    },
    SpecCaseMessage: class extends FlagBase {
      static #teslaSC = /tesla supercharger/i;
      static #teslaDC = /tesla destination charger/i;
      static #rivianAN = /<b>rivian adventure network<\/b> charger/i;
      static #rivianW = /<b>rivian waypoints<\/b> charger/i;

      constructor(args) {
        let message = args.pnhMatch.displaynote;

        // 3/23/2023 - This is a temporary solution to add a disambiguator for Tesla & Rivian chargers.
        let isRivian = false;
        const isTesla = Flag.SpecCaseMessage.#teslaSC.test(message) && Flag.SpecCaseMessage.#teslaDC.test(message);
        if (isTesla) {
          message = message.replace(Flag.SpecCaseMessage.#teslaSC, '<button id="wmeph-tesla-supercharger" class="btn wmeph-btn">Tesla SuperCharger</button>');
          message = message.replace(Flag.SpecCaseMessage.#teslaDC, '<button id="wmeph-tesla-destination-charger" class="btn wmeph-btn">Tesla Destination Charger</button>');
        } else {
          isRivian = Flag.SpecCaseMessage.#rivianAN.test(message) && Flag.SpecCaseMessage.#rivianW.test(message);
          if (isRivian) {
            message = message.replace(Flag.SpecCaseMessage.#rivianAN, '<button id="wmeph-rivian-adventure-network" class="btn wmeph-btn">Rivian Adventure Network charger</button>');
            message = message.replace(Flag.SpecCaseMessage.#rivianW, '<button id="wmeph-rivian-waypoints" class="btn wmeph-btn">Rivian Waypoints charger</button>');
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

      static venueIsFlaggable(args) {
        // TODO: Are the pharmhours and drivethruhours checks really needed?
        // They hide the displaynote message if the key words exist in the
        // venue description, but it could be argued it's ok if the message
        // shows up regardless.
        const message = args.pnhMatch.displaynote;
        let showFlag = false;
        if (args.showDispNote && !isNullOrWhitespace(message)) {
          if (args.pnhMatch.pharmhours) {
            // args.description is only available in WMEPH mode (not during scanning)
            // If not available, assume we should show the flag to be safe
            showFlag = !args.description || !/\bpharmacy\b\s*\bh(ou)?rs\b/i.test(args.description);
            // TODO: figure out what drivethruhours was supposed to be in PNH speccase column
          } else if (args.pnhMatch.drivethruhours) {
            // args.description is only available in WMEPH mode (not during scanning)
            // If not available, assume we should show the flag to be safe
            showFlag = !args.description || !/\bdrive[\s-]?(thru|through)\b\s*\bh(ou)?rs\b/i.test(args.description);
          } else {
            showFlag = true;
          }
        }
        return showFlag;
      }
    },
    PnhCatMess: class extends ActionFlag {
      constructor(venue, pnhCategoryInfo, categories) {
        super();
        this.message = pnhCategoryInfo.message;
        if (categories.includes('HOSPITAL_URGENT_CARE')) {
          this.buttonText = 'Change to Doctor/Clinic';
          this.actionType = 'changeToDoctorClinic';
        }
        this.venue = venue;
      }

      static #venueIsFlaggable(highlightOnly, pnhCategoryInfo) {
        return !highlightOnly && !isNullOrWhitespace(pnhCategoryInfo.message);
      }

      static eval(venue, pnhCategoryInfo, categories, highlightOnly) {
        return this.#venueIsFlaggable(highlightOnly, pnhCategoryInfo) ? new this(venue, pnhCategoryInfo, categories) : null;
      }

      action() {
        if (this.actionType === 'changeToDoctorClinic') {
          const categories = uniq(this.venue.categories.slice());
          const indexOfHospital = categories.indexOf('HOSPITAL_URGENT_CARE');
          if (indexOfHospital > -1) {
            categories[indexOfHospital] = 'DOCTOR_CLINIC';
            addUpdateAction(this.venue, { categories }, null, true);
          }
        }
      }
    },
    ExtProviderMissing: class extends ActionFlag {
      static defaultButtonTooltip = 'If no other properties need to be updated, click to nudge the place (force an edit).';
      static #categoriesToIgnore = ['BRIDGE', 'TUNNEL', 'JUNCTION_INTERCHANGE', 'NATURAL_FEATURES', 'ISLAND', 'SEA_LAKE_POOL', 'RIVER_STREAM', 'CANAL', 'SWAMP_MARSH'];

      get message() {
        let msg = 'No Google link';
        msg += this.makeRed() ? ' and place has not been edited for over 6 months. Edit a property (or nudge) and save to reset the 6 month timer: ' : ': ';
        return msg;
      }

      get severity() {
        return this.makeRed() ? SEVERITY.RED : super.severity;
      }
      set severity(value) {
        super.severity = value;
      }

      get buttonText() {
        return this.makeRed() ? 'Nudge' : '';
      }

      set buttonText(value) {
        super.buttonText = value;
      }

      constructor() {
        super();
        this.value2 = 'Add';
        this.title2 = 'Add a link to a Google place';
      }

      makeRed() {
        const { venue } = this.args;
        if (this.args.isLocked) {
          let lastUpdated;
          if (venue.isNew) {
            lastUpdated = Date.now();
          } else if (venue.updatedOn) {
            lastUpdated = venue.updatedOn;
          } else {
            lastUpdated = venue.createdOn;
          }
          const weeksSinceLastUpdate = (Date.now() - lastUpdated) / 604800000;
          if (weeksSinceLastUpdate >= 26 && !venue.isUpdated() && (!this.args.actions || this.args.actions.length === 0)) {
            return true;
          }
        }
        return false;
      }

      static venueIsFlaggable(args) {
        if (USER.rank >= 2 && args.venue.externalProviderIds && !(args.categories.includes('PARKING_LOT') && args.ignoreParkingLots) && !args.venue._hasBeenNudged) {
          if (!args.categories.some((cat) => this.#categoriesToIgnore.includes(cat))) {
            const provIDs = args.venue.externalProviderIds;
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
        const venueName = this.args.venue.name;
        $('wz-button.external-provider-add-new').click();
        setTimeout(() => {
          clickGeneralTab();
          setTimeout(() => {
            const autocomplete = document.querySelector('div.external-provider-edit-form wz-autocomplete');
            const input = autocomplete?.shadowRoot?.querySelector('wz-text-input')?.shadowRoot?.querySelector('input');
            if (input) {
              input.focus();
              input.value = venueName;
              input.dispatchEvent(new Event('input', { bubbles: true })); // NOTE: jquery trigger('input') and other event calls did not work.
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
            this.buttonTooltip =
              'If no Google link exists, lock this place.\nIf there is still no Google link after ' + '6 months from the last update date, it will turn red as a reminder to search again.';
            this.action = () => {
              addUpdateAction(args.venue, { lockRank: args.levelToLock }, null, true);
            };
          }
        }
      }
    },
    UrlMissing: class extends WLActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static get defaultMessage() {
        return `No URL: <input type="text" id="${Flag.UrlMissing.#TEXTBOX_ID}" autocomplete="off"` + ' style="font-size:0.85em;width:100px;padding-left:2px;color:#000;">';
      }

      static defaultButtonText = 'Add';
      static defaultButtonTooltip = 'Add URL to place';
      static WL_KEY = 'urlWL';
      static defaultWLTooltip = 'Whitelist empty URL';
      static #TEXTBOX_ID = 'WMEPH-UrlAdd';
      noBannerAssemble = true;

      static isWhitelisted(args) {
        return (
          super.isWhitelisted(args) ||
          getPrimaryCatsToFlagGreenMissingPhoneUrl().includes(args.categories[0]) ||
          getAnyCatsToFlagGreenMissingPhoneUrl().some((category) => args.categories.includes(category))
        );
      }

      static venueIsFlaggable(args) {
        return (
          !args.url?.trim().length &&
          (!isVenueParkingLot(args.venue) || (isVenueParkingLot(args.venue) && REGIONS_THAT_WANT_PLA_PHONE_URL.includes(args.region))) &&
          !getPrimaryCatsToIgnoreMissingPhoneUrl().includes(args.categories[0])
        );
      }

      static #getTextbox() {
        return $(`#${Flag.UrlMissing.#TEXTBOX_ID}`);
      }

      action() {
        const $textbox = Flag.UrlMissing.#getTextbox();
        const newUrl = normalizeURL($textbox.val());
        if (!newUrl?.trim().length || newUrl === BAD_URL) {
          $textbox.css({ backgroundColor: '#FDD' }).attr('title', 'Invalid URL format');
        } else {
          logDev(newUrl);
          addUpdateAction(this.args.venue, { url: newUrl }, null, true);
        }
      }

      postProcess() {
        // If pressing enter in the URL entry box, add the URL
        const textbox = Flag.UrlMissing.#getTextbox();
        textbox.keyup((evt) => {
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

      static venueIsFlaggable(args) {
        return args.normalizedUrl === BAD_URL && !this.isWhitelisted(args);
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
        return (
          'Area Code appears to be invalid for this region:<br><input type="text" id="WMEPH-PhoneAdd" autocomplete="off" ' +
          `style="font-size:0.85em;width:100px;padding-left:2px;color:#000;" value="${this.args.phone || ''}">`
        );
      }

      static venueIsFlaggable(args) {
        return (
          args.phone &&
          !this.isWhitelisted(args) &&
          // && ['USA', 'CAN'].includes(args.countryCode) // This check shouldn't be needed here.
          !_areaCodeList.includes(args.phone.match(/[2-9]\d{2}/)?.[0])
        );
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
    AddRecommendedPhone: class extends WLActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultButtonText = 'Add';
      static defaultButtonTooltip = 'Add recommended chain phone #';
      static WL_KEY = 'addRecommendedPhone';
      static defaultWLTooltip = 'Whitelist recommended phone #';

      get message() {
        return `Recommended phone #:<br>${this.args.recommendedPhone}`;
      }

      static venueIsFlaggable(args) {
        return args.recommendedPhone && !this.isWhitelisted(args) && args.recommendedPhone !== BAD_PHONE && args.recommendedPhone !== normalizePhone(args.phone, args.outputPhoneFormat);
      }

      action() {
        addUpdateAction(this.args.venue, { phone: this.args.recommendedPhone }, null, true);
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

      static isWhitelisted(args) {
        return (
          super.isWhitelisted(args) ||
          getPrimaryCatsToFlagGreenMissingPhoneUrl().includes(args.categories[0]) ||
          getAnyCatsToFlagGreenMissingPhoneUrl().some((category) => args.categories.includes(category))
        );
      }

      static venueIsFlaggable(args) {
        return (
          !args.phone &&
          !FlagBase.currentFlags.hasFlag(Flag.AddRecommendedPhone) &&
          (!isVenueParkingLot(args.venue) || (isVenueParkingLot(args.venue) && REGIONS_THAT_WANT_PLA_PHONE_URL.includes(args.region))) &&
          !getPrimaryCatsToIgnoreMissingPhoneUrl().includes(args.categories[0])
        );
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
        $('#WMEPH-PhoneAdd').keyup((evt) => {
          if (evt.keyCode === 13 && $('#WMEPH-PhoneAdd').val() !== '') {
            $('#WMEPH_PhoneMissing').click();
            $('#WMEPH_BadAreaCode').click();
          }
        });
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

      static venueIsFlaggable(args) {
        return !containsAny(args.categories, [
          'STADIUM_ARENA',
          'CEMETERY',
          'TRANSPORTATION',
          'FERRY_PIER',
          'SUBWAY_STATION',
          'BRIDGE',
          'TUNNEL',
          'JUNCTION_INTERCHANGE',
          'ISLAND',
          'SEA_LAKE_POOL',
          'RIVER_STREAM',
          'FOREST_GROVE',
          'CANAL',
          'SWAMP_MARSH',
          'DAM',
          'NATURAL_FEATURES',
        ]);
      }

      static isWhitelisted(args) {
        return (
          super.isWhitelisted(args) ||
          args.openingHours.length ||
          $('#WMEPH-DisableHoursHL').prop('checked') ||
          containsAny(args.categories, [
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
            'SCENIC_LOOKOUT_VIEWPOINT',
          ])
        );
      }

      static #getHoursHtml(hasExistingHours = false, alwaysOpen = false) {
        return $('<span>').append(
          `${hasExistingHours ? 'Hours' : 'No hours'}:`,
          !alwaysOpen
            ? $('<input>', {
                class: 'btn btn-default btn-xs wmeph-btn',
                id: 'WMEPH_noHours',
                title: `Add pasted hours${hasExistingHours ? ' to existing hours' : ''}`,
                type: 'button',
                value: 'Add hours',
                style: 'margin-bottom:4px; margin-right:0px; margin-left:3px;',
              })
            : '',
          hasExistingHours
            ? $('<input>', {
                class: 'btn btn-default btn-xs wmeph-btn',
                id: 'WMEPH_noHours_2',
                title: 'Replace existing hours with pasted hours',
                type: 'button',
                value: 'Replace all hours',
                style: 'margin-bottom:4px; margin-right:0px; margin-left:3px;',
              })
            : '',
          // jquery throws an error when setting autocomplete="off" in a jquery object (must use .autocomplete() function), so just use a string here.
          // eslint-disable-next-line max-len
          `<textarea id="WMEPH-HoursPaste" wrap="off" autocomplete="off" style="overflow:auto;width:84%;max-width:84%;min-width:84%;font-size:0.85em;height:24px;min-height:24px;max-height:300px;margin-bottom:-2px;padding-left:3px;color:#AAA;position:relative;z-index:1;">${DEFAULT_HOURS_TEXT}`,
        )[0].outerHTML;
      }

      static #getTitle(parseResult) {
        let title;
        if (parseResult.overlappingHours) {
          title = 'Overlapping hours.  Check the existing hours.';
        } else if (parseResult.sameOpenAndCloseTimes) {
          title = 'Open/close times cannot be the same.';
        } else {
          title = "Can't parse, try again";
        }
        return title;
      }

      applyHours(replaceAllHours) {
        if (!this.args?.venue) {
          logDev('applyHours: No venue in args');
          return;
        }

        let pasteHours = $('#WMEPH-HoursPaste').val();
        if (pasteHours === DEFAULT_HOURS_TEXT) {
          return;
        }
        logDev(pasteHours);
        const existingHours = getOpeningHours(this.args.venue);
        pasteHours += !replaceAllHours && existingHours ? `,${existingHours.join(',')}` : '';
        $('.nav-tabs a[href="#venue-edit-more-info"]').tab('show');
        const parser = new HoursParser();
        const parseResult = parser.parseHours(pasteHours);
        if (parseResult.hours && !parseResult.overlappingHours && !parseResult.sameOpenAndCloseTimes && !parseResult.parseError) {
          logDev(parseResult.hours);
          addUpdateAction(this.args.venue, { openingHours: parseResult.hours }, null, true);
          $('#WMEPH-HoursPaste').val(DEFAULT_HOURS_TEXT);
        } else {
          log("Can't parse those hours");
          this.severity = SEVERITY.BLUE;
          this.WLactive = true;
          $('#WMEPH-HoursPaste')
            .css({ 'background-color': '#FDD' })
            .attr({ title: Flag.NoHours.#getTitle(parseResult) });
        }
      }

      onAddHoursClick() {
        this.applyHours();
      }

      onReplaceHoursClick() {
        this.applyHours(true);
      }

      static #getDaysString(days) {
        const dayEnum = {
          1: 'Mon',
          2: 'Tue',
          3: 'Wed',
          4: 'Thu',
          5: 'Fri',
          6: 'Sat',
          7: 'Sun',
        };
        const dayGroups = [];
        let lastGroup;
        let lastGroupDay = -1;
        days.forEach((day) => {
          if (day !== lastGroupDay + 1) {
            // Not a consecutive day. Start a new group.
            lastGroup = [];
            dayGroups.push(lastGroup);
          }
          lastGroup.push(day);
          lastGroupDay = day;
        });

        // Process the groups into strings
        const groupString = [];
        dayGroups.forEach((group) => {
          if (group.length < 3) {
            group.forEach((day) => {
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

      static #formatAmPm(time24Hrs) {
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

      static #getHoursString(hoursObject) {
        if (hoursObject.fromHour === '00:00' && hoursObject.toHour === '00:00') return 'All Day';
        const fromHour = this.#formatAmPm(hoursObject.fromHour);
        const toHour = this.#formatAmPm(hoursObject.toHour);
        return `${fromHour}–${toHour}`;
      }

      static #getOrderedDaysArray(hoursObject) {
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

      static #getHoursStringArray(hoursObjects) {
        // Group days by their time range (consolidate days with same hours)
        const timeRangeMap = new Map(); // key: "fromHour-toHour", value: array of days
        const daysWithHours = new Set();

        hoursObjects.forEach((hoursObject) => {
          const timeKey = `${hoursObject.fromHour}-${hoursObject.toHour}`;
          const days = this.#getOrderedDaysArray(hoursObject);

          if (!timeRangeMap.has(timeKey)) {
            timeRangeMap.set(timeKey, []);
          }
          timeRangeMap.get(timeKey).push(...days);
          days.forEach((day) => daysWithHours.add(day));
        });

        // Build output array from consolidated time ranges
        const outputArray = [];
        timeRangeMap.forEach((days, timeKey) => {
          const [fromHour, toHour] = timeKey.split('-');
          const hoursObject = { fromHour, toHour, days: [] }; // temp object for formatting
          const hoursString = this.#getHoursString(hoursObject);
          const daysString = this.#getDaysString(days.sort((a, b) => a - b));
          outputArray.push(`${daysString}:&nbsp&nbsp${hoursString}`);
        });

        // Find and add closed days
        const closedDays = [1, 2, 3, 4, 5, 6, 7].filter((day) => !daysWithHours.has(day));
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
            style:
              'display: inline-block;font-size: 13px;border: 1px solid #aaa;margin: -6px 2px 2px 0px;border-radius: 0px 0px 5px 5px;background-color: #f5f5f5;color: #727272;' +
              'padding: 3px 10px 0px 5px !important;z-index: 0;position: relative;min-width: 84%',
            title: 'Current hours',
          }).append(hoursStringArray.map((entry, idx) => `<div${idx < hoursStringArray.length - 1 ? ' style="border-bottom: 1px solid #ddd;"' : ''}>${entry}</div>`).join(''));

          $('#WMEPH-HoursPaste').after($hoursTable);
        }
        // NOTE: Leave these wrapped in the "() => ..." functions, to make sure "this" is bound properly.
        $('#WMEPH_noHours').click(() => this.onAddHoursClick());
        $('#WMEPH_noHours_2').click(() => this.onReplaceHoursClick());

        // If pasting or dropping into hours entry box
        function resetHoursEntryHeight() {
          const $sel = $('#WMEPH-HoursPaste');
          if ($sel.length) $sel.focus();
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

        $('#WMEPH-HoursPaste').after(
          $('<i>', {
            id: 'wmeph-paste-hours-btn',
            class: 'fa fa-paste',
            style: 'font-size: 17px;position: relative;vertical-align: top;top: 2px;right: -5px;margin-right: 3px;color: #6c6c6c;cursor: pointer;',
            title: 'Paste from the clipboard',
          }),
        ); // , $('<i>', {
        //     id: 'wmeph-clear-hours-btn',
        //     class: 'fa fa-trash-o',
        //     style: 'font-size: 17px;position: relative;right: -5px;bottom: 6px;color: #6c6c6c;cursor: pointer;margin-left: 5px;',
        //     title: 'Clear pasted hours'
        // }));

        $('#wmeph-paste-hours-btn').click(() => {
          navigator.clipboard.readText().then(
            (cliptext) => {
              $('#WMEPH-HoursPaste').val(cliptext);
              resetHoursEntryHeight();
            },
            (err) => logDev(err),
          );
        });

        // $('#wmeph-clear-hours-btn').click(() => {
        //     $('#WMEPH-HoursPaste').val(null);
        //     resetHoursEntryHeight();
        // });

        $('#WMEPH-HoursPaste')
          .bind('paste', resetHoursEntryHeight)
          .bind('drop', resetHoursEntryHeight)
          .bind('dragenter', (evt) => {
            const $control = $(evt.currentTarget);
            const text = $control.val();
            if (text === DEFAULT_HOURS_TEXT) {
              $control.val('');
            }
          })
          .keydown((evt) => {
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
          })
          .focus((evt) => {
            const target = evt.currentTarget;
            if (target.value === DEFAULT_HOURS_TEXT) {
              target.value = '';
            }
            target.style.color = 'black';
          })
          .blur((evt) => {
            const target = evt.currentTarget;
            if (target.value === '') {
              target.value = DEFAULT_HOURS_TEXT;
              target.style.color = '#999';
            }
          });
      }
    },
    OldHours: class extends ActionFlag {
      static defaultSeverity = SEVERITY.YELLOW;
      static #categoriesToCheck;
      static #parentCategoriesToCheck = ['SHOPPING_AND_SERVICES', 'FOOD_AND_DRINK', 'CULTURE_AND_ENTERTAINEMENT'];

      get message() {
        let msg = 'Last updated over 3 years ago. Verify hours are correct.';
        const isUnchanged = !this.args.venue.isNew && !this.args.venue.updatedBy;
        if (isUnchanged) msg += ' If everything is current, nudge this place and save.';
        return msg;
      }

      get buttonText() {
        const isUnchanged = !this.args.venue.isNew && !this.args.venue.updatedBy;
        return isUnchanged ? 'Nudge' : null;
      }

      get severity() {
        const isUnchanged = !this.args.venue.isNew && !this.args.venue.updatedBy;
        return isUnchanged ? super.severity : SEVERITY.GREEN;
      }

      static venueIsFlaggable(args) {
        this.#initializeCategoriesToCheck(args.pnhCategoryInfos);
        return (
          !isVenueResidential(args.venue) &&
          this.#venueIsOld(args.venue) && // Check uses the updated logic now
          args.openingHours?.length &&
          args.categories.some((cat) => this.#categoriesToCheck.includes(cat)) &&
          !args.venue._hasBeenNudged
        );
      }

      static #initializeCategoriesToCheck(pnhCategoryInfos) {
        if (!this.#categoriesToCheck) {
          this.#categoriesToCheck = pnhCategoryInfos
            .toArray()
            .filter((pnhCategoryInfo) => this.#parentCategoriesToCheck.includes(pnhCategoryInfo.parent))
            .map((catInfo) => catInfo.id);
          this.#categoriesToCheck.push(...this.#parentCategoriesToCheck);
        }
      }

      static #venueIsOld(venue) {
        // Get the timestamp, prioritizing updatedOn, falling back to createdOn
        const lastUpdatedTimestamp = venue.updatedOn ?? venue.createdOn;

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
    PlaLotTypeMissing: class extends FlagBase {
      static defaultSeverity = SEVERITY.RED;
      static get defaultMessage() {
        return `Lot type: ${[
          ['PUBLIC', 'Public'],
          ['RESTRICTED', 'Restricted'],
          ['PRIVATE', 'Private'],
        ]
          .map((btnInfo) => $('<button>', { class: 'wmeph-pla-lot-type-btn btn btn-default btn-xs wmeph-btn', 'data-lot-type': btnInfo[0] }).text(btnInfo[1]).prop('outerHTML'))
          .join('')}`;
      }

      static venueIsFlaggable(args) {
        if (!isVenueParkingLot(args.venue)) return false;
        try {
          const parkingType = sdk.DataModel.Venues.ParkingLot.getParkingLotType({ venueId: args.venue.id });
          return !parkingType;
        } catch {
          return true;
        }
      }

      postProcess() {
        $('.wmeph-pla-lot-type-btn').click((evt) => {
          const lotType = $(evt.currentTarget).data('lot-type');
          const categoryAttrClone = this.args.venue.categoryAttributes ? JSON.parse(JSON.stringify(this.args.venue.categoryAttributes)) : {};
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
        return `Parking cost: ${[
          ['FREE', 'Free', 'Free'],
          ['LOW', '$', 'Low'],
          ['MODERATE', '$$', 'Moderate'],
          ['EXPENSIVE', '$$$', 'Expensive'],
        ]
          .map((btnInfo) =>
            $('<button>', { id: `wmeph_${btnInfo[0]}`, class: 'wmeph-pla-cost-type-btn btn btn-default btn-xs wmeph-btn', title: btnInfo[2] })
              .text(btnInfo[1])
              .css({
                padding: '3px',
                height: '20px',
                lineHeight: '0px',
                marginRight: '2px',
                marginBottom: '1px',
                minWidth: '18px',
              })
              .prop('outerHTML'),
          )
          .join('')}`;
      }

      static venueIsFlaggable(args) {
        if (!isVenueParkingLot(args.venue)) return false;
        try {
          const costType = sdk.DataModel.Venues.ParkingLot.getCostType({ venueId: args.venue.id });
          return !costType || costType === 'UNKNOWN';
        } catch {
          return false;
        }
      }

      postProcess() {
        $('.wmeph-pla-cost-type-btn').click((evt) => {
          const selectedValue = $(evt.currentTarget).attr('id').replace('wmeph_', '');
          let attrClone;
          if (this.args.venue.categoryAttributes) {
            attrClone = JSON.parse(JSON.stringify(this.args.venue.categoryAttributes));
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

      static venueIsFlaggable(args) {
        if (!isVenueParkingLot(args.venue)) return false;

        try {
          const costType = sdk.DataModel.Venues.ParkingLot.getCostType({ venueId: args.venue.id });
          if (!costType || costType === 'FREE' || costType === 'UNKNOWN') return false;

          const paymentMethods = sdk.DataModel.Venues.ParkingLot.getPaymentMethods({ venueId: args.venue.id });
          return !paymentMethods || paymentMethods.length === 0;
        } catch {
          return false;
        }
      }

      // eslint-disable-next-line class-methods-use-this
      action() {
        document.querySelector('#edit-panel wz-tab.venue-edit-tab-more-info').isActive = true;
        // The setTimeout is necessary to allow the previous action to do its thing. A pause isn't needed, just a new thread.
        setTimeout(() => document.querySelector('#venue-edit-more-info wz-select[name="costType"]').scrollIntoView(), 0);
      }
    },
    PlaLotElevationMissing: class extends ActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'No lot elevation. Is it street level?';
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Click if street level parking only, or select other option(s) in the More Info tab.';
      noLock = true;

      static venueIsFlaggable(args) {
        if (!isVenueParkingLot(args.venue)) return false;
        try {
          const lotTypes = sdk.DataModel.Venues.ParkingLot.getLotTypes({ venueId: args.venue.id });
          return !lotTypes || lotTypes.length === 0;
        } catch {
          return false;
        }
      }

      action() {
        const attrClone = this.args.venue.categoryAttributes ? JSON.parse(JSON.stringify(this.args.venue.categoryAttributes)) : {};
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
          ['R_11_TO_30', '11-30'],
          ['R_31_TO_60', '31-60'],
          ['R_61_TO_100', '61-100'],
          ['R_101_TO_300', '101-300'],
          ['R_301_TO_600', '301-600'],
          ['R_600_PLUS', '601+'],
        ].forEach((btnInfo) => {
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
                width: '64px',
              }),
          );
          btnIdx++;
        });
        return msg + $btnDiv.prop('outerHTML');
      }

      static venueIsFlaggable(args) {
        if (args.highlightOnly || !isVenueParkingLot(args.venue)) return false;
        try {
          const spotEstimate = sdk.DataModel.Venues.ParkingLot.getEstimatedNumberOfSpots({ venueId: args.venue.id });
          return !spotEstimate || spotEstimate === 'R_1_TO_10';
        } catch {
          return false;
        }
      }

      static setupClickHandlers() {
        $('.wmeph-pla-spaces-btn').click((evt) => {
          const selectedVenue = getSelectedVenue();
          const selectedValue = $(evt.currentTarget).attr('id').replace('wmeph_', '');
          try {
            sdk.DataModel.Venues.ParkingLot.setEstimatedNumberOfSpots({
              venueId: selectedVenue.id,
              estimatedNumberOfSpots: selectedValue,
            });
            UPDATED_FIELDS.parkingSpots.updated = true;
            addUpdateAction(selectedVenue, {}, null, true);
          } catch (e) {
            logDev('Error setting parking spaces:', e);
          }
        });
      }
    },
    NoPlaStopPoint: class extends ActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'Entry/exit point has not been created.';
      static defaultButtonText = 'Add point';
      static defaultButtonTooltip = 'Add an entry/exit point';

      static venueIsFlaggable(args) {
        if (!isVenueParkingLot(args.venue)) return false;

        const hasNavPoints = args.venue.navigationPoints?.length > 0;
        return !hasNavPoints;
      }

      action() {
        const { venue } = this.args;

        // Create new entry point at venue geometry center
        const center = turf.centroid(venue.geometry).geometry.coordinates;

        const newNavigationPoints = [
          {
            point: {
              type: 'Point',
              coordinates: center,
            },
            isEntry: true,
            isExit: true,
            isPrimary: true,
            name: '',
          },
        ];

        sdk.DataModel.Venues.replaceNavigationPoints({
          venueId: venue.id,
          navigationPoints: newNavigationPoints,
        });

        harmonizePlaceGo(venue, 'harmonize');
      }
    },
    PlaStopPointUnmoved: class extends FlagBase {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'Entry/exit point has not been moved.';

      static venueIsFlaggable(args) {
        if (!isVenueParkingLot(args.venue)) return false;

        const { navigationPoints, geometry } = args.venue;
        if (!navigationPoints?.length) return false;

        // Get the primary navigation point, if one exists. If none, get the first point.
        const primaryPoint = navigationPoints.find((pt) => pt.isPrimary === true) || navigationPoints[0];
        const stopPoint = primaryPoint.point.coordinates;

        const areaCenter = turf.centroid(geometry).geometry.coordinates;
        return stopPoint[0] === areaCenter[0] && stopPoint[1] === areaCenter[1];
      }
    },
    PlaCanExitWhileClosed: class extends ActionFlag {
      static defaultMessage = 'Can cars exit when lot is closed? ';
      static defaultButtonText = 'Yes';

      static venueIsFlaggable(args) {
        if (args.highlightOnly || !isVenueParkingLot(args.venue)) return false;
        if (!($('#WMEPH-ShowPLAExitWhileClosed').prop('checked') || !(args.openingHours.length === 0 || is247Hours(args.openingHours)))) return false;
        try {
          const canExit = sdk.DataModel.Venues.ParkingLot.canExitWhileClosed({ venueId: args.venue.id });
          return !canExit;
        } catch {
          return false;
        }
      }

      action() {
        const attrClone = this.args.venue.categoryAttributes ? JSON.parse(JSON.stringify(this.args.venue.categoryAttributes)) : {};
        attrClone.PARKING_LOT = attrClone.PARKING_LOT ?? {};
        attrClone.PARKING_LOT.canExitWhileClosed = true;
        addUpdateAction(this.args.venue, { categoryAttributes: attrClone }, null, true);
      }
    },
    PlaHasAccessibleParking: class extends ActionFlag {
      static defaultMessage = 'Does this lot have disability parking? ';
      static defaultButtonText = 'Yes';

      static venueIsFlaggable(args) {
        if (args.highlightOnly || !isVenueParkingLot(args.venue)) return false;
        return !args.venue.services?.includes('DISABILITY_PARKING');
      }

      action() {
        const services = this.args.venue.services?.slice() ?? [];
        services.push('DISABILITY_PARKING');
        addUpdateAction(this.args.venue, { services }, null, true);
        UPDATED_FIELDS.services_DISABILITY_PARKING.updated = true;
      }
    },
    AllDayHoursFixed: class extends FlagBase {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = 'Hours were changed from 00:00-23:59 to "All Day"';

      // If highlightOnly, flag place yellow. Running WMEPH on a place will automatically fix the hours, so
      // then this can be green and just display the message.
      get severity() {
        return this.args.highlightOnly ? super.severity : SEVERITY.GREEN;
      }

      static venueIsFlaggable(args) {
        return args.almostAllDayHoursEntries.length > 0;
      }
    },
    LocalURL: class extends FlagBase {
      static defaultMessage = 'Some locations for this business have localized URLs, while others use the primary corporate site.' + ' Check if a local URL applies to this location.';

      static venueIsFlaggable(args) {
        return args.localUrlRegexString && !new RegExp(args.localUrlRegexString, 'i').test(args.url);
      }
    },
    LockRPP: class extends ActionFlag {
      static defaultButtonText = 'Lock';
      static defaultButtonTooltip = 'Lock the residential point';

      get message() {
        let msg = 'Lock at <select id="RPPLockLevel">';
        let ddlSelected = false;
        for (let llix = 1; llix < 6; llix++) {
          if (llix < USER.rank + 1) {
            if (!ddlSelected && (this.args.defaultLockLevel === llix - 1 || llix === USER.rank)) {
              msg += `<option value="${llix}" selected="selected">${llix}</option>`;
              ddlSelected = true;
            } else {
              msg += `<option value="${llix}">${llix}</option>`;
            }
          }
        }
        msg += '</select>';
        msg = `Current lock: ${parseInt(this.args.venue.lockRank, 10) + 1}. ${msg} ?`;
        return msg;
      }

      static venueIsFlaggable(args) {
        // Allow residential point locking by R3+
        return !args.highlightOnly && (args.categories.includes('RESIDENCE_HOME') || args.categories.includes('RESIDENTIAL')) && (USER.isDevUser || USER.isBetaUser || USER.rank >= 3);
      }

      action() {
        let levelToLock = $('#RPPLockLevel :selected').val() || this.args.defaultLockLevel + 1;
        logDev(`RPPlevelToLock: ${levelToLock}`);

        levelToLock -= 1;
        if (this.args.venue.lockRank !== levelToLock) {
          addUpdateAction(this.args.venue, { lockRank: levelToLock }, null, true);
        }
      }
    },
    AddAlias: class extends ActionFlag {
      static defaultButtonText = 'Yes';

      get message() {
        return `Is there a ${this.args.pnhMatch.optionalAlias} at this location?`;
      }
      get buttonTooltip() {
        return `Add ${this.args.pnhMatch.optionalAlias}`;
      }

      static venueIsFlaggable(args) {
        return args.pnhMatch.optionalAlias && !args.aliases.includes(args.pnhMatch.optionalAlias);
      }

      action() {
        const venue = this.args.venue;
        const alias = this.args.pnhMatch.optionalAlias;
        let aliases = insertAtIndex(venue.aliases?.slice() || [], alias, 0);
        if (this.args.pnhMatch.altName2Desc && !venue.description?.toUpperCase?.().includes(alias.toUpperCase())) {
          const description = `${alias}\n${venue.description}`;
          addUpdateAction(venue, { description }, null, false);
        }
        aliases = removeUnnecessaryAliases(this.args.nameBase, aliases);
        addUpdateAction(venue, { aliases }, null, true);
      }
    },
    AddCat2: class extends ActionFlag {
      static defaultButtonText = 'Yes';

      get message() {
        return `Is there a ${_catTransWaze2Lang[this.altCategory]} at this location?`;
      }
      get buttonTooltip() {
        return `Add ${_catTransWaze2Lang[this.altCategory]}`;
      }

      constructor(venue, altCategory) {
        super();
        this.altCategory = altCategory;
        this.venue = venue;
      }

      static eval(args, altCategory) {
        let result = null;
        if (args.pnhMatch.flagsToAdd?.addCat2 && !args.categories.includes(altCategory)) {
          result = new this(args.venue, altCategory);
        }
        return result;
      }

      action() {
        const categories = insertAtIndex(this.venue.categories, this.altCategory, 1);
        addUpdateAction(this.venue, { categories }, null, true);
      }
    },
    AddPharm: class extends ActionFlag {
      static defaultMessage = 'Is there a Pharmacy at this location?';
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Add Pharmacy category';

      static venueIsFlaggable(args) {
        return args.pnhMatch.flagsToAdd?.addPharm && !args.categories.includes('PHARMACY');
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, 'PHARMACY', 1);
        addUpdateAction(this.args.venue, { categories }, null, true);
      }
    },
    AddSuper: class extends ActionFlag {
      static defaultMessage = 'Does this location have a supermarket?';
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Add Supermarket category';

      static venueIsFlaggable(args) {
        return args.pnhMatch.flagsToAdd?.addSuper && !args.categories.includes('SUPERMARKET_GROCERY');
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, 'SUPERMARKET_GROCERY', 1);
        addUpdateAction(this.args.venue, { categories }, null, true);
      }
    },
    AppendAMPM: class extends ActionFlag {
      // Only used on the ARCO gas station PNH entry.
      static defaultMessage = 'Is there an ampm at this location?';
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Add ampm to the place';

      static venueIsFlaggable(args) {
        // No need to check for name/catgory. After the action is run, the name will match the "ARCO ampm"
        // PNH entry, which doesn't have this flag.
        return args.pnhMatch.flagsToAdd?.appendAMPM;
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, 'CONVENIENCE_STORE', 1);
        addUpdateAction(this.args.venue, { name: 'ARCO ampm', url: 'ampm.com', categories }, null, true);
      }
    },
    AddATM: class extends ActionFlag {
      static defaultMessage = 'ATM at location? ';
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Add the ATM category to this place';

      static venueIsFlaggable(args) {
        let flaggable = false;
        if (args.pnhMatch.flagsToAdd?.addATM) {
          flaggable = true;
        } else if (args.pnhMatch.notABank) {
          // do nothing
        } else if (!args.categories.includes('ATM') && args.categories.includes('BANK_FINANCIAL')) {
          if (args.priPNHPlaceCat === 'BANK_FINANCIAL') {
            if (args.categories.indexOf('OFFICES') !== 0) {
              flaggable = true;
            }
          } else {
            flaggable = true;
          }
        }
        return flaggable;
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, 'ATM', 1); // Insert ATM category in the second position
        addUpdateAction(this.args.venue, { categories }, null, true);
      }
    },
    AddConvStore: class extends ActionFlag {
      static defaultMessage = 'Add convenience store category? ';
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Add the Convenience Store category to this place';

      static venueIsFlaggable(args) {
        return (
          (args.categories.includes('GAS_STATION') && !args.categories.includes('CONVENIENCE_STORE') && !this.currentFlags.hasFlag(Flag.SubFuel)) || // Don't flag if already asking if this is really a gas station
          args.pnhMatch?.flagsToAdd?.addConvStore
        );
      }

      action() {
        // Insert C.S. category in the second position
        const categories = insertAtIndex(this.args.venue.categories, 'CONVENIENCE_STORE', 1);
        addUpdateAction(this.args.venue, { categories }, null, true);
      }
    },
    IsThisAPostOffice: class extends ActionFlag {
      static defaultMessage = `Is this a <a href="${URLS.uspsWiki}" target="_blank" style="color:#3a3a3a">USPS post office</a>? `;
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Is this a USPS location?';

      static venueIsFlaggable(args) {
        return (
          !args.highlightOnly &&
          args.countryCode === PNH_DATA.USA.countryCode &&
          !isVenueParkingLot(args.venue) &&
          !args.categories.includes('POST_OFFICE') &&
          /\bUSP[OS]\b|\bpost(al)?\s+(service|office)\b/i.test(args.nameBase.replace(/[/\-.]/g, ''))
        );
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, 'POST_OFFICE', 0);
        addUpdateAction(this.args.venue, { categories }, null, true);
      }
    },
    ChangeToHospitalUrgentCare: class extends ActionFlag {
      static defaultMessage = 'If this place provides emergency medical care:';
      static defaultButtonText = 'Change to Hospital / Urgent Care';
      static defaultButtonTooltip = 'Change category to Hospital / Urgent Care';

      static venueIsFlaggable(args) {
        return !args.highlightOnly && args.categories.includes('DOCTOR_CLINIC');
      }

      action() {
        let categories = this.args.venue.categories;
        if (!categories.includes('HOSPITAL_MEDICAL_CARE')) {
          const indexToReplace = categories.indexOf('DOCTOR_CLINIC');
          if (indexToReplace > -1) {
            categories = categories.slice(); // create a copy
            categories[indexToReplace] = 'HOSPITAL_URGENT_CARE';
          }
          addUpdateAction(this.args.venue, { categories });
        }
        harmonizePlaceGo(this.args.venue, 'harmonize');
      }
    },
    NotAHospital: class extends WLActionFlag {
      static defaultSeverity = SEVERITY.RED;
      static defaultMessage = 'Key words suggest this location may not be a hospital or urgent care location.';
      static defaultButtonText = 'Change to Doctor / Clinic';
      static defaultButtonTooltip = 'Change category to Doctor / Clinic';
      static WL_KEY = 'notAHospital';
      static defaultWLTooltip = 'Whitelist category';

      static venueIsFlaggable(args) {
        if (args.categories.includes('HOSPITAL_URGENT_CARE') && !this.isWhitelisted(args)) {
          const testName = args.nameBase.toLowerCase().replace(/[^a-z]/g, ' ');
          const testNameWords = testName.split(' ');
          return containsAny(testNameWords, Pnh.HOSPITAL_FULL_MATCH) || Pnh.HOSPITAL_PART_MATCH.some((match) => testName.includes(match));
        }
        return false;
      }

      action() {
        let categories = this.args.venue.categories.slice();
        let updateIt = false;
        if (categories.length) {
          const idx = categories.indexOf('HOSPITAL_URGENT_CARE');
          if (idx > -1) {
            categories[idx] = 'DOCTOR_CLINIC';
            updateIt = true;
          }
          categories = uniq(categories);
        } else {
          categories.push('DOCTOR_CLINIC');
          updateIt = true;
        }
        if (updateIt) {
          addUpdateAction(this.args.venue, { categories }, null, true);
        } else {
          harmonizePlaceGo(this.args.venue, 'harmonize');
        }
      }
    },
    ChangeToDoctorClinic: class extends ActionFlag {
      static defaultMessage = 'If this place provides non-emergency medical care: ';
      static defaultButtonText = 'Change to Doctor / Clinic';
      static defaultButtonTooltip = 'Change category to Doctor / Clinic';

      static venueIsFlaggable(args) {
        // Show the Change To Doctor / Clinic button for places with PERSONAL_CARE or OFFICES category
        // The date criteria was added because Doctor/Clinic category was added around then, and it's assumed if the
        // place has been edited since then, people would have already updated the category.
        return (
          !args.highlightOnly &&
          args.venue.updatedOn < new Date('3/28/2017').getTime() &&
          ((args.categories.includes('PERSONAL_CARE') && !args.pnhNameRegMatch) || args.categories.includes('OFFICES'))
        );
      }

      action() {
        let categories = this.args.venue.categories.slice();
        let updateIt = false;
        if (categories.length) {
          ['OFFICES', 'PERSONAL_CARE'].forEach((cat) => {
            const idx = categories.indexOf(cat);
            if (idx > -1) {
              categories[idx] = 'DOCTOR_CLINIC';
              updateIt = true;
            }
          });
          categories = uniq(categories);
        } else {
          categories.push('DOCTOR_CLINIC');
          updateIt = true;
        }
        if (updateIt) {
          addUpdateAction(this.args.venue, { categories });
        }
        harmonizePlaceGo(this.args.venue, 'harmonize');
      }
    },
    TitleCaseName: class extends ActionFlag {
      static defaultButtonText = 'Force Title Case?';
      #confirmChange = false;
      #originalName;
      #titleCaseName;
      noBannerAssemble = true;

      get message() {
        return `${this.#titleCaseName}${this.args.nameSuffix || ''}`;
      }
      get buttonTooltip() {
        return `Rename to: ${this.#titleCaseName}${this.args.nameSuffix || ''}`;
      }

      constructor(args) {
        super();
        this.#titleCaseName = titleCase(args.nameBase);
        this.#originalName = args.nameBase + (args.nameSuffix || '');
      }

      static venueIsFlaggable(args) {
        return !args.pnhNameRegMatch && args.nameBase !== titleCase(args.nameBase);
      }

      action() {
        let name = this.args.venue.name;
        if (name === this.#originalName || this.#confirmChange) {
          const parts = getNameParts(this.#originalName);
          name = titleCase(parts.base);
          if (parts.base !== name) {
            addUpdateAction(this.args.venue, { name: name + (parts.suffix || '') }, undefined, true);
          } else {
            harmonizePlaceGo(this.args.venue, 'harmonize');
          }
        } else {
          $('button#WMEPH_titleCaseName').text('Are you sure?').after(' The name has changed. This will overwrite the new name.');
          this.#confirmChange = true;
        }
      }
    },
    SFAliases: class extends FlagBase {
      static defaultMessage = 'Unnecessary aliases were removed.';

      static venueIsFlaggable(args) {
        return args.aliasesRemoved;
      }
    },
    PlaceMatched: class extends FlagBase {
      static defaultMessage = 'Place matched from PNH data.';

      static venueIsFlaggable(args) {
        return args.pnhNameRegMatch;
      }
    },
    PlaceLocked: class extends FlagBase {
      static defaultMessage = 'Place locked.';
      constructor(args) {
        super();

        if (args.venue.lockRank < args.levelToLock) {
          if (!args.highlightOnly) {
            logDev(`Venue locked! Current: ${args.venue.lockRank}, Target: ${args.levelToLock}`);
            // Use SDK to update venue directly - wrap in try-catch since locking may fail due to permissions
            try {
              addUpdateAction(args.venue, { lockRank: args.levelToLock }, args.actions);
            } catch (e) {
              logDev('Could not lock venue - you may not have permission', e);
            }
          } else {
            this.hlLockFlag = true;
          }
        }
      }

      static venueIsFlaggable(args) {
        return args.lockOK && args.totalSeverity < SEVERITY.YELLOW;
      }
    },
    NewPlaceSubmit: class extends ActionFlag {
      static defaultMessage = "No PNH match. If it's a chain: ";
      static defaultButtonText = 'Submit new chain data';
      static defaultButtonTooltip = 'Submit info for a new chain through the linked form';
      #formUrl;

      constructor(args) {
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

      static venueIsFlaggable(args) {
        return (
          !args.highlightOnly &&
          args.pnhMatch[0] === 'NoMatch' &&
          !isVenueParkingLot(args.venue) &&
          !getChainApprovalPrimaryCatsToIgnore().includes(args.categories[0]) &&
          !args.categories.includes('REST_AREAS')
        );
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

      constructor(args) {
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

      static venueIsFlaggable(args) {
        return (
          !args.highlightOnly &&
          args.pnhMatch[0] === 'ApprovalNeeded' &&
          !isVenueParkingLot(args.venue) &&
          !getChainApprovalPrimaryCatsToIgnore().includes(args.categories[0]) &&
          !args.categories.includes('REST_AREAS')
        );
      }

      action() {
        window.open(this.#formUrl);
      }
    },
    LocationFinder: class extends ActionFlag {
      static defaultButtonTooltip = "Look up details about this location on the chain's finder web page.";
      static #USPS_LOCATION_FINDER_URL = 'https://tools.usps.com/find-location.htm';
      #storeFinderUrl;
      #isCustom = false;

      get buttonText() {
        return `Location Finder${this.isCustom ? ' (L)' : ''}`;
      }

      constructor(venue, storeFinderUrl, isCustom, addr, state2L, venueGPS) {
        super();
        this.isCustom = isCustom;
        this.venue = venue;
        this.#isCustom = isCustom;
        this.#storeFinderUrl = storeFinderUrl;
        this.#processUrl(venue, addr, state2L, venueGPS);
      }

      static #venueIsFlaggable(highlightOnly, storeFinderUrl) {
        return !highlightOnly && storeFinderUrl;
      }

      // TODO: Can this be put into venueIsFlaggable?
      static eval(args) {
        const isUsps = args.countryCode === PNH_DATA.USA.countryCode && !args.categories.includes('PARKING_LOT') && args.categories.includes('POST_OFFICE');
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

        return this.#venueIsFlaggable(args.highlightOnly, storeFinderUrl) ? new this(args.venue, storeFinderUrl, isCustom, args.addr, args.state2L, args.venueGPS) : null;
      }

      #processUrl(venue, addr, state2L, venueGPS) {
        if (this.#isCustom) {
          const houseNumber = addr.houseNumber;

          const urlParts = this.#storeFinderUrl.replace(/ /g, '').split('<>');
          let searchStreet = '';
          let searchCity = '';
          let searchState = '';
          if (typeof addr.street?.name === 'string') {
            searchStreet = addr.street.name;
          }
          const searchStreetPlus = searchStreet.replace(/ /g, '+');
          searchStreet = searchStreet.replace(/ /g, '%20');
          if (typeof addr.city?.name === 'string') {
            searchCity = addr.city.name;
          }
          const searchCityPlus = searchCity.replace(/ /g, '+');
          searchCity = searchCity.replace(/ /g, '%20');
          if (typeof addr.state?.name === 'string') {
            searchState = addr.state.name;
          }
          const searchStatePlus = searchState.replace(/ /g, '+');
          searchState = searchState.replace(/ /g, '%20');

          // venueGPS is already in WGS84; location object already contains correct coordinates
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
                part = venueGPS ? (venueGPS.latitude ?? venueGPS.lat ?? '').toString() : '';
                break;
              case 'ph_longitudePM':
                part = venueGPS ? (venueGPS.longitude ?? venueGPS.lon ?? '').toString() : '';
                break;
              case 'ph_latitudePMBuffMin':
                part = venueGPS ? ((venueGPS.latitude ?? venueGPS.lat ?? 0) - 0.025).toString() : '';
                break;
              case 'ph_longitudePMBuffMin':
                part = venueGPS ? ((venueGPS.longitude ?? venueGPS.lon ?? 0) - 0.025).toString() : '';
                break;
              case 'ph_latitudePMBuffMax':
                part = venueGPS ? ((venueGPS.latitude ?? venueGPS.lat ?? 0) + 0.025).toString() : '';
                break;
              case 'ph_longitudePMBuffMax':
                part = venueGPS ? ((venueGPS.longitude ?? venueGPS.lon ?? 0) + 0.025).toString() : '';
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

      action() {
        // If the user has 'never' opened a localized store finder URL, then warn them (just once)
        if (localStorage.getItem(SETTING_IDS.sfUrlWarning) === '0' && this.#isCustom) {
          WazeWrap.Alerts.confirm(
            SCRIPT_NAME,
            '***Localized store finder sites often show multiple nearby results. Please make sure you pick the right location.' + '<br>Click OK to agree and continue.',
            () => {
              localStorage.setItem(SETTING_IDS.sfUrlWarning, '1'); // prevent future warnings
              this.#openStoreFinderWebsite();
            },
            () => {},
          );
          return;
        }
        this.#openStoreFinderWebsite();
      }
    },
  }; // END Flag namespace
  class FlagContainer {
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
      Flag.LocationFinder,
    ];

    static #isIndexed = false;
    #flags = [];

    constructor() {
      FlagContainer.#indexFlags();
    }

    static #indexFlags() {
      if (!this.#isIndexed) {
        let displayIndex = 1;
        this.#flagOrder.forEach((flagClass) => (flagClass.displayIndex = displayIndex++));
        this.#isIndexed = true;
      }
    }

    add(flag) {
      if (flag) this.#flags.push(flag);
    }

    remove(flagClass) {
      const idx = this.#flags.indexOf(flagClass);
      if (idx > -1) this.#flags.splice(idx, 1);
    }

    getOrderedFlags() {
      return this.#flags.slice().sort((f1, f2) => {
        const idx1 = f1.constructor.displayIndex;
        const idx2 = f2.constructor.displayIndex;

        if (idx1 > idx2) return 1;
        if (idx1 < idx2) return -1;
        return 0;
      });
    }

    hasFlag(flagClass) {
      return this.#flags.some((flag) => flag.constructor === flagClass);
    }
  }
  class HarmonizationArgs {
    venue = null;
    countryCode = null;
    actions = null;
    highlightOnly = true;
    /** @type {SEVERITY} */
    totalSeverity = SEVERITY.GREEN;
    /** @type {number} */
    levelToLock = null;
    lockOK = true;
    isLocked = false;

    // Current venue attributes
    /** @type {string[]} */
    categories = null;
    /** @type {string} */
    nameSuffix = null;
    /** @type {string} */
    nameBase = null;
    /** @type {string[]} */
    aliases = null;
    /** @type {string} */
    description = null;
    /** @type {string} */
    url = null;
    /** @type {string} */
    phone = null;
    /** @type {[]} */
    openingHours = null;

    /**
     * Will temporarily contain an array of information
     * during matching, but eventually contains a single PnhEntry object.
     * @type {PnhEntry}
     */
    pnhMatch = null;
    showDispNote = true;
    hoursOverlap = false;
    descriptionInserted = false;
    aliasesRemoved = false;
    isUspsPostOffice = false;
    maxPointSeverity = SEVERITY.GREEN;
    maxAreaSeverity = SEVERITY.RED;
    almostAllDayHoursEntries = [];
    defaultLockLevel = LOCK_LEVEL_2;
    state2L = 'Unknown';
    regionCode = 'Unknown';
    gFormState = '';
    wl = {};
    outputPhoneFormat = '({0}) {1}-{2}';

    constructor(venue, actions, highlightOnly) {
      this.venue = venue;

      this.highlightOnly = highlightOnly;
      this.addr = getVenueAddress(venue);

      this.actions = actions;
      this.categories = venue.categories?.slice() || [];
      const nameParts = getNameParts(venue.name);
      this.nameSuffix = nameParts?.suffix;
      this.nameBase = nameParts?.base;
      this.aliases = venue.aliases?.slice() || [];
      // Only read description from DOM during harmonization (when edit form is open), not during scanning
      this.description = !highlightOnly ? this.getDescriptionFromDOM() : null;
      this.url = venue.url;
      this.phone = venue.phone;
      this.openingHours = venue.openingHours;
      // Set up a variable (newBrand) to contain the brand. When harmonizing, it may be forced to a new value.
      // Other brand flags should use it since it won't be updated on the actual venue until later.
      this.brand = venue.brand;
    }

    getDescriptionFromDOM() {
      try {
        const descField = UPDATED_FIELDS.description;
        const element = document.querySelector(descField.selector);
        if (element && descField.shadowSelector) {
          const textarea = element.shadowRoot?.querySelector(descField.shadowSelector);
          return textarea?.value || null;
        }
      } catch (e) {
        logDev(`Error reading description from DOM: ${e}`);
      }
      return null;
    }
  }
  class GooglePlaceContainer {
    places = new Map();
    pendingRequests = new Map();

    addPlace(placeId, placeData) {
      this.places.set(placeId, placeData);

      const requestsForId = this.pendingRequests.get(placeId);
      if (requestsForId && requestsForId.length > 0) {
        requestsForId.forEach((request) => {
          clearTimeout(request.timeoutId);
          request.resolve(placeData);
        });
        this.pendingRequests.delete(placeId);
      }
    }

    #removePendingRequest(placeId, requestToRemove) {
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

    getPlace(placeId, timeoutMs = 3000) {
      if (this.places.has(placeId)) {
        return Promise.resolve(this.places.get(placeId));
      }

      return new Promise((resolve, reject) => {
        let pendingRequest;

        const timeoutId = setTimeout(() => {
          const error = new Error(`Request for place ID "${placeId}" timed out after ${timeoutMs / 1000} seconds.`);
          this.#removePendingRequest(placeId, pendingRequest);
          reject(error);
        }, timeoutMs);

        pendingRequest = { resolve, reject, timeoutId };

        if (!this.pendingRequests.has(placeId)) {
          this.pendingRequests.set(placeId, []);
        }
        this.pendingRequests.get(placeId).push(pendingRequest);
      });
    }
  }
  const _googlePlaces = new GooglePlaceContainer();

  // **************************************************************************************************************
  // UI / UX Functions
  // **************************************************************************************************************

  /**
   * Toggles the color highlighting checkbox and updates map display.
   */
  function toggleHighlightCheckbox() {
    const checkbox = $('#WMEPH-ColorHighlighting');
    if (checkbox.length) {
      checkbox.prop('checked', !checkbox.prop('checked'));
      // Call the handler directly to update the map highlighting
      bootstrapWmephColorHighlights();
      log(`Color highlighting ${checkbox.prop('checked') ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Creates a wz-button element with attributes and optional click handler.
   * @param {object} attrs Button attributes (color, size, disabled, textContent, etc.)
   * @param {Function|null} clickHandler Optional click event handler
   * @returns {HTMLElement} The created wz-button element
   */
  function createWzButton(attrs = {}, clickHandler = null) {
    const btn = document.createElement('wz-button');
    const propertyKeys = ['color', 'size', 'disabled', 'textContent'];
    Object.keys(attrs).forEach((key) => {
      if (attrs[key] !== undefined && attrs[key] !== null) {
        if (propertyKeys.includes(key)) {
          btn[key] = attrs[key];
        } else {
          btn.setAttribute(key, attrs[key]);
        }
      }
    });
    if (clickHandler) {
      btn.addEventListener('click', clickHandler);
    }
    return btn;
  }

  function initializeCategories() {
    try {
      const subCategories = sdk.DataModel.Venues.getVenueSubCategories();
      subCategories.forEach((subCat) => {
        SUBCATEGORIES_BY_ID[subCat.subCategoryId] = subCat;
      });
      log(`✓ Loaded ${Object.keys(SUBCATEGORIES_BY_ID).length} venue categories from SDK`);
    } catch (e) {
      logDev('Failed to initialize categories from SDK:', e);
      throw e;
    }
  }

  function getCategoryLocalizedName(categoryId) {
    return SUBCATEGORIES_BY_ID[categoryId]?.localizedName ?? categoryId;
  }

  /**
   * Injects a Google search icon button into Place Update Request (PUR) popup headers.
   * Monitors for PUR panel openings and adds a search button that performs a Google search
   * for the place name and address extracted from the PUR popup. Respects user setting to hide button.
   * The button is icon-aligned with other header action buttons (recenter, streetview, email, star).
   */
  function addPURWebSearchButton() {
    const purLayerObserver = new MutationObserver(panelContainerChanged);
    purLayerObserver.observe($('#waze-map-container')[0], { childList: true, subtree: true });

    function panelContainerChanged() {
      if (!$('#WMEPH-HidePURWebSearch').prop('checked')) {
        // Target the panel-header-actions div where the icon buttons are
        const $headerActions = $('.place-update-edit .panel-header-actions');
        if ($('#PHPURWebSearchButton').length === 0 && $headerActions.length) {
          const $btn = $('<wz-button>', {
            id: 'PHPURWebSearchButton',
            color: 'clear-icon',
            size: 'sm',
            type: 'button',
            title: `WMEPH${IS_BETA_VERSION ? '-β' : ''}: Search Google for this place. Do not copy info from 3rd party sources!`,
          })
            .css({
              marginLeft: '8px',
              marginRight: '4px',
            })
            .append($('<i>', { class: 'w-icon w-icon-search' }))
            .click(() => {
              logDev('PUR Google button clicked');
              openWebSearch();
            });
          $headerActions.append($btn);
        }
      }
    }

    /**
     * Constructs a Google search URL from a place name and address.
     * Normalizes highway abbreviations (CR-, SR-, US- → County Rd, State Hwy, US Hwy).
     * Returns null if searchName is empty.
     * @param {string} searchName - The place name to search for
     * @param {string} address - The place address (optional, can be empty)
     * @returns {string|null} A properly encoded Google search URL, or null if searchName is falsy
     */
    function buildSearchUrl(searchName, address) {
      if (!searchName) return null;

      searchName = searchName.replace(/[/]/g, ' ').trim();

      // Handle null or undefined address
      if (!address) {
        address = '';
      } else {
        address = address
          .replace(/No street, /, '')
          .replace(/No address/, '')
          .replace(/CR-/g, 'County Rd ')
          .replace(/SR-/g, 'State Hwy ')
          .replace(/US-/g, 'US Hwy ')
          .replace(/ CR /g, ' County Rd ')
          .replace(/ SR /g, ' State Hwy ')
          .replace(/ US /g, ' US Hwy ')
          .replace(/$CR /g, 'County Rd ')
          .replace(/$SR /g, 'State Hwy ')
          .replace(/$US /g, 'US Hwy ')
          .trim();
      }

      searchName = encodeURIComponent(searchName + (address.length > 0 ? `, ${address}` : ''));
      return `http://www.google.com/search?q=${searchName}`;
    }

    /**
     * Extracts place name and address from the PUR (Place Update Request) popup,
     * falls back to viewport location (via SDK) if address is missing, then opens a Google search.
     * If opening in new tab, uses window.open(url). Otherwise, opens in SEARCH_RESULTS_WINDOW_NAME.
     */
    function openWebSearch() {
      let name = null;
      let addr = null;
      // Find place name and address within the PUR popup using stable selectors
      // Look for h3 or div with 'name' class (place name), and div with 'address' class
      const $nameElem = $('.place-update-edit h3.name, .place-update-edit [class*="name--"]').first();
      const $addrElem = $('.place-update-edit [class*="address"], .place-update-edit div.address').first();

      if ($nameElem.length) {
        name = $nameElem.text().trim();
      }
      if ($addrElem.length) {
        addr = $addrElem.text().trim();
      }

      // If address is missing from PUR popup, try to get city/state from viewport
      if (!addr) {
        try {
          const topState = sdk.DataModel.States.getTopState();
          const topCountry = sdk.DataModel.Countries.getTopCountry();
          const viewportState = topState?.name ? `${topState.name}` : '';
          const viewportCountry = topCountry?.name ? `${topCountry.name}` : '';
          const fallbackAddr = `${viewportState}${viewportCountry ? ', ' + viewportCountry : ''}`.trim();

          if (fallbackAddr.length > 0) {
            logDev(`PUR Google Search - Address missing from popup, using viewport location: "${fallbackAddr}"`);
            addr = fallbackAddr;
          }
        } catch (e) {
          logDev('PUR Google Search - Error getting viewport state/country:', e);
        }
      }

      logDev(`PUR Google Search - Name: "${name}", Address: "${addr}"`);

      if (!name) {
        logDev('PUR Google Search - Aborting: name is empty');
        return;
      }
      const searchUrl = buildSearchUrl(name, addr);
      if (!searchUrl) {
        logDev('PUR Google Search - Failed to build search URL');
        return;
      }
      logDev(`PUR Google Search - URL: ${searchUrl}`);
      if ($('#WMEPH-WebSearchNewTab').prop('checked')) {
        logDev('PUR Google Search - Opening in new tab');
        window.open(searchUrl);
      } else {
        logDev('PUR Google Search - Opening in search results window');
        window.open(searchUrl, SEARCH_RESULTS_WINDOW_NAME, _searchResultsWindowSpecs);
      }
    }
  }

  /**
   * Generates and adds spelling variants to a name list by replacing each variant spelling with all others.
   * For example, if ['St', 'Street'] are variants, names containing 'St' will also get 'Street' versions.
   * Modifies nameList in place; does not add duplicates.
   * @param {string[]} nameList - Array of names to expand with variants (modified in place)
   * @param {string[]} spellingVariantList - Array of spelling variants to cross-apply
   */
  function addSpellingVariants(nameList, spellingVariantList) {
    for (let spellingOneIdx = 0; spellingOneIdx < spellingVariantList.length; spellingOneIdx++) {
      const spellingOne = spellingVariantList[spellingOneIdx];
      const namesToCheck = nameList.filter((name) => name.includes(spellingOne));
      for (let spellingTwoIdx = 0; spellingTwoIdx < spellingVariantList.length; spellingTwoIdx++) {
        if (spellingTwoIdx !== spellingOneIdx) {
          const spellingTwo = spellingVariantList[spellingTwoIdx];
          namesToCheck.forEach((name) => {
            const newName = name.replace(spellingOne, spellingTwo);
            if (!nameList.includes(newName)) nameList.push(newName);
          });
        }
      }
    }
  }

  /**
   * Clicks the General tab in the venue edit panel via shadow DOM traversal.
   * Uses specific CSS selectors targeting the first tab button inside wz-tabs shadow root.
   */
  function clickGeneralTab() {
    // Make sure the General tab is selected before clicking on the external provider element.
    // These selector strings are very specific.  Could probably make them more generalized for robustness.
    const containerSelector = '#edit-panel > div > div.venue-feature-editor > div > div.venue-edit-section > wz-tabs';
    const shadowSelector = 'div > div > div > div > div:nth-child(1)';
    document.querySelector(containerSelector).shadowRoot.querySelector(shadowSelector).click();
  }

  /**
   * Zooms the map to center on the currently selected venue (zoom 19), or falls back to mouse position (zoom 18).
   */
  function zoomPlace() {
    const venue = getSelectedVenue();
    if (venue) {
      const { longitude, latitude } = getVenueLonLat(venue);
      sdk.Map.setMapCenter({ lonLat: { lon: longitude, lat: latitude }, zoomLevel: 19 });
    } else if (_wmephMousePosition) {
      sdk.Map.setMapCenter({ lonLat: _wmephMousePosition, zoomLevel: 18 });
    }
  }

  /**
   * Slightly nudges a venue's geometry by a random distance (+/- 0.00000001 degrees).
   * For points, moves the first coordinate. For polygons, moves the second vertex of the outer ring.
   * Updates venue via SDK; changes are tracked as unsaved until user clicks WME Save.
   * @param {Object} venue - The venue object to nudge (must have geometry and id)
   */
  function nudgeVenue(venue) {
    const newGeometry = structuredClone(venue.geometry);
    const moveNegative = Math.random() > 0.5;
    const nudgeDistance = 0.00000001 * (moveNegative ? -1 : 1);
    if (isVenuePoint(venue)) {
      newGeometry.coordinates[0] += nudgeDistance;
    } else {
      // Be sure to edit the 2nd coordinate. Editing the 1st would also require editing the last,
      // otherwise the polygon is not "complete" and another point (geonode) may be added behind the scenes
      // to complete it.
      newGeometry.coordinates[0][1][0] += nudgeDistance;
    }
    // SDK tracks changes as unsaved; user commits via WME Save button
    sdk.DataModel.Venues.updateVenue({ venueId: venue.id, geometry: newGeometry });
    venue._hasBeenNudged = true;
  }

  /**
   * Clears all duplicate label features from the _dupeLayer map layer.
   * Silently catches and logs any errors to prevent script interruption.
   */
  function destroyDupeLabels() {
    try {
      sdk.Map.removeAllFeaturesFromLayer({ layerName: _dupeLayer });
    } catch (e) {
      logDev('Error clearing dupe labels layer:', e);
    }
  }

  /**
   * Removes the associated dupe label when a duplicate is deleted.
   * This is a stub function: dupe removal is now primarily detected via SDK event listeners.
   * Clears all dupe labels if the _dupeIDList is empty.
   */
  function deleteDupeLabel() {
    // Stub: dupe removal is now detected via SDK event listeners
    if (_dupeIDList.length === 0) {
      destroyDupeLabels();
    }
  }

  /**
   * Whitelists a flag for a specific venue, storing venue metadata (city, state, country, GPS).
   * Requires the venue to have a country-level address. Shows error alert if address is missing.
   * Saves whitelist to localStorage and removes venue from results cache for re-evaluation.
   * @param {string} venueID - The venue ID to whitelist
   * @param {string} wlKeyName - The whitelist flag key name to add
   * @returns {boolean} true if successful, false if venue lacks a country address
   */
  function whitelistAction(venueID, wlKeyName) {
    const venue = getSelectedVenue();
    const addressTemp = getVenueAddress(venue);
    if (!addressTemp?.country) {
      WazeWrap.Alerts.error(SCRIPT_NAME, "Whitelisting requires an address. Enter the place's address and try again.");
      return false;
    }
    const centroidPt = turf.centroid(venue.geometry);
    const venueGPS = { longitude: centroidPt.geometry.coordinates[0], latitude: centroidPt.geometry.coordinates[1] };
    if (!_venueWhitelist.hasOwnProperty(venueID)) {
      // If venue is NOT on WL, then add it.
      _venueWhitelist[venueID] = {};
    }
    _venueWhitelist[venueID][wlKeyName] = { active: true }; // WL the flag for the venue
    _venueWhitelist[venueID].city = addressTemp.city?.name; // Store city for the venue
    _venueWhitelist[venueID].state = addressTemp.state?.name; // Store state for the venue
    _venueWhitelist[venueID].country = addressTemp.country?.name; // Store country for the venue
    _venueWhitelist[venueID].gps = venueGPS; // Store GPS coords for the venue
    saveWhitelistToLS(true); // Save the WL to local storage
    wmephWhitelistCounter();
    _buttonBanner2.clearWL.active = true;

    // Remove venue from the results cache so it can be updated again.
    delete _resultsCache[venue.id];
    return true;
  }

  /**
   * Increments the whitelist addition counter in localStorage and alerts user when it exceeds 50.
   * Resets counter to 2 after alert to remind user to back up their whitelist data periodically.
   */
  function wmephWhitelistCounter() {
    // eslint-disable-next-line camelcase
    localStorage.WMEPH_WLAddCount = parseInt(localStorage.WMEPH_WLAddCount, 10) + 1;
    if (localStorage.WMEPH_WLAddCount > 50) {
      WazeWrap.Alerts.warning(SCRIPT_NAME, "Don't forget to periodically back up your Whitelist data using the Pull option in the WMEPH settings tab.");
      // eslint-disable-next-line camelcase
      localStorage.WMEPH_WLAddCount = 2;
    }
  }

  /**
   * Creates and attaches a MutationObserver to the edit-panel that removes scrolling artifacts
   * (separator-line class and tab-scroll-gradient display) when DOM nodes are added.
   * This prevents visual glitches that occur when WMEPH adds content outside the venue div.
   */
  function createObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Mutation is a NodeList and doesn't support forEach like an array
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const addedNode = mutation.addedNodes[i];
          // Only fire up if it's a node
          if (addedNode.querySelector && addedNode.querySelector('.tab-scroll-gradient')) {
            // Normally, scrolling happens inside the tab-content div.  When WMEPH adds stuff outside the venue div, it effectively breaks that
            // and causes scrolling to occur at the main content div under edit-panel.  That's actually OK, but need to disable a couple
            // artifacts that "stick around" with absolute positioning.
            $('#edit-panel .venue').removeClass('separator-line');
            $('#edit-panel .tab-scroll-gradient').css({ display: 'none' });
          }
        }
      });
    });
    observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
  }

  function appendServiceButtonIconCss() {
    const cssArray = [
      '.serv-airportshuttle { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAD4UlEQVR4AeyZv28TMRTHk0xMCITK0GQoE1IRvwRSxdZOSPzoxgCCCgkGBkBCdG/yB8AAAhZ+FJBgYCuVADG0AwKGMjDAgJDokJQfFSxMCNTyeW6cni93ZzuXSwMKel/es/3es79nn89xC7n/5F+PSLdNZG9GejOS0RPwXVo7isXihVKp9AA9kxHukPcMfPcAZ/EhcoIO3pL58vLy8lH0cEY4Sd4b9DXX399/BdtJnIiQdArcc8rYRqd8Pn+O2b/qktJKBAIXSXQYaPmB8YROKlmA3PfBV6CE2T+LMQYSxUqE6ONACUlv1mq1IXCgWq2WswC5x8BuOmysAB7mOOVEsRHZQPQuoGRhYeE5xkeQtXxmtl8EOtmOvRHEio1IgwQZFlmvg6As4EWcEO0CH1+dj/6K4DvQslMbUdpGJBjTx9Ka0OCJlbVt0z6+wVx0vgk4iSZSYh3KzvSJqEOg22WU8c6BGQbaB3KayD4KsjMN0Ji0Q8zi10nQXbMwxv3UygdzmGV7BHuFCOtymxTqUAzrtqHYTUY6CaNzszCoi4VCYbPYekbE/qfRI9Jt06dmhC/0u8DAFgO2YfKSJZ14295mdG4W3uvi0tLSN7EVEYxX4DGY52VuHA0ohyWrE29c3nD/qswYn2G8AbOcNh6hV3YtjCqNo2AL9jTodplirHvBCANVK0jPCGW78IVOdeLlq10O54iq0z72Ea16eBHhXUp14mUZVMI5ouq0z+ow7ZYXEXu6tfNoFxE5MhxsgYbEyYveQqgZkpoIW/JL8BRMg9dm+vgSvjpObdvxnm4taYmU6EYOnCglQ/w/AGwSjpNZUYc/W2Bce1oifyIS/46oC1dFxaltNOzoWk5L5Atb5S3dGfZt7BqwSTjuGgHy8wDVmqQlkmOrPM2HaZ0A+5TrMPDVceux5abENTTSLzWRetZfaAHKSyTmp1dEjHO7iMSk71y1FxF+SaobFJvm56fzDUtSLp/H4EWEc1HjFiXJ5qV3vmFJypMZEZ/Enfb1mhGedNPpNzDg2aj2YB1P3zj9EtvYcoN+2qbdWbyIsE2GT7+NgUiPEe2Gf/ikKzFBhOODbTbbi4gt2Vq2+xKRM1EQ7R67zq21c34bEVk68zobJ1Z1Ug1q3caX/bq2XTUxd7Uv789EMK/Yug0tY5CxYEaLjUiOzirRoU216hKgqTa5YpJmuURAxYvLGKxESD9Joq3oS0CeigF2mPO052lrSYiVS4RjBBt5pUzuCu1yISKEqYoXFyIS/YGE46Dp7pedxulvfJIkAQ9jcpeJkWWFShZXIslZuqC1R6QLJsEYQm9GjMfRBYW/AAAA///d8GdKAAAABklEQVQDAOjZlZI1xoAxAAAAAElFTkSuQmCC) center/contain no-repeat; }',
      '.serv-airportshuttle-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAECElEQVR4AexZO28TQRDeTWG7QiAEDSlChRTES4kU0YUitsQjHQUIIiRQLgUgIdIn+QFQgIA44hFAgoIuRILYRVIgoEgKCigQEilAPCJoaGKDsnyz9lp7l3vs+uz4QLbm887uzszOd3ser88d7D95tYkkbSPbO9LekSZdAdtba282v3opN1V6NDBVnm8GcpOle7nJ8gj49gDGYkPkdDZfesMYvyoEO8GF6G8GBGdnBBe3sNZidqp8jRm+jIgg6AzwwDBm48yEuDCQL183CRhJJJdfvYxAxwAlP6E8AyaaAcHYQ8b4N1Z9cSbOQx0CQiWSiGD8lIqAoLcLTroPOAyMNwNFJz1UcFIHGGe1OwB3w6jKIaiNIrIZjvsBKXNOpgjlA9Bs+cIZf6Etsgf6FiBQoojUSDAmVnBluoHxKsaqreqHtTa2Mo4QYgey/gEo2acUvzaKiObDt6EzpmFc0/VxP93GVvffijWMRBHpxNWlyvQRXkeBpMsg8l2k7zEkSheYKSIHMUCVqQsGgRVCcL6wkUBOvpKdXM1hooe+x/Bdcxx6hQiS300dAhKVDEn3ojicOrSR8K6v+qKjo1vpTIjtpKsdIf2fRptI0rZP7kjBSb9VieEDtKJ0b0tVIgQNPw1711d9vrb2TumM8++kSyJQXgFPgWWQqh0N0HcJSDblxBsU17W41imMZObQXUJhWigMp55Ar1QtKJ9AYBDYCX0WSLrMINdeqqBIVN5BakfQN5K4J176hvfG8BtTNkZJkZEVEVyFuCfeCZ8YfmNyHUrQFFZETIO2wq5RROjIcKQOAuTXX4ffOpfYRHC8eQk8B2aB1+tWCBiArfKTZTvAzHg4LpFOrEQHTjRS+vDeBUSJy4/KLxzk4Q9tXRKXyB+fVX/7jHmH/PxkGfUamvbjEvnKuLijLXYX+mcgSlx++Fl7Aw4LQN0SlwgrDGfOoaRmqjhrmonmt2nOSdGTElNXX7vYRKpRS2gJaKyEfH5ZeQQYN4pIQPiNG7YigpIpn3AYtGMGNpGxbC6DFREE1p9whOl0fgqbN53DkmZiS8QsagusbImoU6neyrTptwEUfdxPp52qjVd94CalNo6e0qGaiRURlFh5KtVaV+3Xxr12qu866XpT9Pp758P6VkTCArV6zpYInVR1NDp/FVu1xvGjiNCts6yioaTOe6Hm8LPzptJNW/jc12ypZLvia3OUA+WiDbnVKCIM9y198Nxe/j35EMB/KnB0GjNLQKiY5BBJBCtMI9Au/OFzhaqMF3hkeRHzHHZ1CXx7gZPeuNRHQCoO9ECECKMbLCZEyPt90UmN4lZY9+wXj2aM/uOjICF47BvbSVO5ptsqxLUyZUqkYp3g9zaRpG1Oe0eStiN/AQAA//+zXvm6AAAABklEQVQDAD4ni5Jd4gdxAAAAAElFTkSuQmCC) center/contain no-repeat; }',
      '.serv-carwash { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAEz0lEQVR4AeyZP4hdRRTG71osEgisJDb71koMUUkRiEhMikgIBBuLsIIQg1hIEC22EMHG3SqxSEgjKWx0IYImELGxCEEtJGBjEyFC0Oa9t80SkjIQdvP7bs7czBvuezP3byBkOd+dc87MnHO+uffN/bPPZU/JX9dEnmedPjBIR+1GuiSydzAYXBsMBuuGa1DYCzqRrogcp/gbVHwYODlsvuPO0WbbOhGKPQ1+pcgFEMqC+sDpsKOp3SqRpaWlLyjoIvDlSwyBppCLNrZwNFXaJLK8vb191i9obm7u49FodEaQ7vfZ2GXf10Rvi8gyl8tPfiEU/+JwOPzW+aTL52y1NqcVMm0QKSPxAoVuglA2IaO+wt8WmaZEjlkhRWEU+grGXTBN7tqYot9iHCscNZQmRHZTwNd+Tgp8C/s2iMltG1uMs1i7C0dFpTYRdh2R2O/yUdi76Lp30CTJDZvjBu+3mM6u1NYisri4+Cm7zkdeJm2vv3h2qqo5mpuPV0zFzo2KhzpEDrGV6mzkqUh+lZU9kxs1DpqrGG6qxT7k7NS2MhGuZa3gDkswGo/Hss2s11iMkc3eYTnMTGuqEtGe/44LzWqKxC1nN2hvWSwXQjmUy9nRthIRVuoTF5FL4Bv0ddCWrFvMPJ6fK3dEDlWIfEisI0CyyZ164nFEzqawmO5GqlzKmRQ2mYi/Qqzcd0QfgrZlaLHzuH7O3DHjkErkBDHeAJIHrNz3UrqAxX5gsZVTuc2c3iQR4UblB/uBcDdBKG3Ziq0cebwgd+4rO6QQ2ck+XxBhd/m5LFCbPj+H5d4Zix8lwnX6PkHmgURb7VUpHUM5lEtp5q0G6VMRJcJMEaHJMn6IP3KqV/uAcmWP/4oaHrsmtRQiAzeF0/xVn3B5aYsa0EulEpHSCP04GxPR25x7rtKltcYprw3O5mo4v8znxnhrpBpUi+eaVGNnZGIl2ONXm4CHw7VwfpnPjZksNZuoJejLYkS0EuGcJ2XPrCVG5N+gaj3/9Ak/fViL3xc9I/cYvQFyYT//rU/kSR8dVINqeWSVHGNnRFNmroQG9IBoDVEi7CB/eIX+jt4nSJdpt/RryMr+okTYQf7yJh7hOegUeLtjnCKnfos0WRbUkPvCQ5QIE/4GhfCV4/PC6EgpyTFRQ1naFCL6oZ1zk7nUPnN6V22QQ7lVw8x0KUQyLqNzBP/fRWLn2u4SLo9yKrezZ7VJRAiwsbW1pZVB7U8sZ/RsqKJUIhmPEvpqclmTesJly5mULpmIonGa36MNPzroG+5R+uZq4igxw2/GQ2IpF11pUomIQpLgJVr39oaaHeT3ch2cx6jyNV1f888z7zrzDgIn+linHM5OaisTUVTIvEp7AfiyQlF/8vao/yPqHf81v9N0+U5ojMbiWwG+XLDYvi9Jr0VEkUm4wq6yhj4GTvbwfnGWIq+Af8B97gk3BelAvisaw4Q9wMlYsRTTOaq2tYkoEXfcVZIfUBHYPiHMXObpe13Ach8wUAtxBA4oVuGtoTQiYvk2VASE9oGTrPYl/HfANLmjMRoL9mkuA5O2WMZNlTaIuOAq/hJb5kkK3AUWwMvgTYN0+XZpDJNihBmSLm0SCbPq/eE/nHroFKTLh6t96ZJI+9XOiPiMyIzFeSJdDwEAAP//kXRIQgAAAAZJREFUAwDBxSiSrKvqZAAAAABJRU5ErkJggg==) center/contain no-repeat; }',
      '.serv-carwash-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAE8UlEQVR4AexZQYgcRRT95WEmBAIrWU/iSZSoeBAiEuMhEnYnePGwrCDEEHLYCaKHHETIxc3J5KDkImbWiy5EiAlEcpHMIupBFrx4WSFCSC6b7GUJyS2zBCrvVVd1upveqeru6lkIWf7r+v9X1fv/9cx0ujvPyVPy17aQXThPn1jQh9uOtSlkX2/wcGV2MFom6EPCPqAVa0vIETS/qkW957qmzxziI0B0iy6kd2HrJBr+DZ1OAUWb4hzXFCeaxlGF9C6MvtRKf59rSslpITJJruHaTKqxG1PIvFZyNtuRUmphuND9mqCfnbNr57O5Jn4sIfP4yvySbWTY775wfaHzg8vRZ87FHO2eKGJiCCkT8Twa3QSKtgkxnEvzscQ0FTJjG0kbQ6OvILgPbGf37Zp03nLMpIkaThMh073B6Fy2Jhp8F/FNwGc37dp0neWaThMVndpCcBbPaZG3XD009iH8VSDUVu0es55c5DRBjUMtIb3Bw89Q6wSQWHJ5vZYElY7XJNnrNp2w3C4OHusIOahFPflKabnKy2twxcJCsxccLm25D7o4dKwsZHZpdBrkuwHaneHJLmP6tWE57liC3baGDcOGqkLmRcsHjhrfcYq44eIG4w3LlVAkNSr9+1JJyMzS1qdJJcFXW30nIstALFtWYjgNX7aWSXgOVYQcV1ofIp8SvXm938ndjjDfFOQkN3lsreP0QxAsZGYwSj8NrdWPIF8HYtu65Ta82ZomMeYQKmROibxteR7hx/mT9aMPlvsRiW3NOfo+BAnpLY2ekCn5GaRrQNFixWv4AbKG4cvVNpnyQ4iQPVpLKgTX/V/LqeJlszVs7T0+dq+Q2cHWxyDpADReaq/SaRmswVos07E90N8WXiF4AKIQR3AJ90OLkwAKXgKMFXowueLBKwSXwRczm76CP0mgnEihByn78wrBpqwQhDti3h58Qvg05+6rqOAMDk2wWLK/LOdqYLkx9sBeTFB28AnJnQncDy02xJmS/WU5U6fQcK6Xwpz4hPBMFPfsVDy2F5+Q/wtd815rksiWL/aSnfN+Ig+wegMwhsvuH5OEKZoc2AN7SaKSo+8TEa3U2DNRwhk9FdKDVwiu4X+5zkD45yTh6mZ7cLni6BWCq8w/bhMID60sdI4B77eMY6zl6mZ7cLni6BWCDf8Cqc0ubX2RBi05JTVyPZSVDRGyoUV9k27W+vPUb8vJ1LC1+WMfWy1EiKz0OxRy2zHhyqXbhKuD8batDXe8BQkBBT4VTTFwJ2daTE3vp8GOQoXgU9nFtyaXuWlCuLzSNzWDygULIRuuHh9hLL504Dvcw5hTNXEYnMV3xuvgYi1MhVklIaREgZcwuqc3uHIAv5ff8RT3LYIqb9OnuYd7se8A4Iwv61jDxUFjZSFkhZjXRNR5yf3pU73B6G/7f4N8xn89N50EzM1xDdeK6FNJ2h3V+YTbxeFjLSGkH/Y7bILPDXcZE1rkVa3kLM7yFeA/YASsWdBn7grXcC33WJADt/OG06aqDbWFsMyw3+Vzw374OUGInfGlxRsICPpwc2YFdPeTKzdTMWgkxNbaYBPAm8BR0XIR+XvAdnaPa7gW4J5FLAy6xGLdthZDiCNn8xfxpvAoGtwLTAEvA+9Y0GduL9dgk08wloRbTCHFqnx+uIUkbzoJ+swhFd/aFBK/2zGMz4SMOTk7MvUYAAD//4gLCk0AAAAGSURBVAMAlZ4AktVwHWoAAAAASUVORK5CYII=) center/contain no-repeat; }',
      '.serv-carpool { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-carpool-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-covered { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-covered-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-ev { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAADrUlEQVR4AeyYPWgUQRTH764OYuVH7kQbG6OViAQCKtiJwU/8AgkBm1gpErDKpdKgxEosLAIGNNgEQQkIkthYSARRtBHB4u7sRDQIFhJ//8nNMnfZHHvZmVwu3PH++97M3r55/3nztZvLbJBfh8h6S2QnI52MBOqBZodWvlAojIHpfD4/mxIT+Cn64tUMkX4Cf7e4uDgMThDA4ZQYwM8IPt/ipwBSSWIiNHiNlrYC33IA39fTOk1K5BgNKQMoI5PZbHY0mw5PjKelizpp15K57LqJITgG2fvc2QNiJRGR7u7unc7TM+Vy+XKpVCqmxEV8/gFW3I6yddK9DMFhjCHieIqOJZOISC6X24IDI2RBY9rYHi6RL3p9pYz8te3Qds9KZBIRsY5apOcgMGrbxo4l0w5EMhrCEIgjE2WxLYgoG3FkWABGdE8IRUQTV1Ab3lBPBscDwEx+70SYtEV6yuz6NBKEDH5/ACu9MrwTYak8LceB8cH6p+N2yPZN5BRO9wLJApc5sCbilQhD6qwT9SPHDm76JLKbaM8DI+z+E8ZIeGFIHqIjzNyqah1b9id8POONCI1HJGj8DZgHzYgWBhfj+JxnJ7+RxIk3IjR2FViZtEZazUZ4Bx99oKH4InKGVuwRf4HGt7GaFC241w8aCs/UnKbdP5OZu245zvZChIbcbHQx3kdccP8ZjV8CDUUbngVzrMf580Hs6DiCvUy8ECHoj8s811WQHS0GdbUNi5/r7oYnUqlUbtUPDZXdQOjph27Zt+0lIwT1nUBrXrSoMzsuWjLDpQyCiS8i9QFuZrgN2krGe9BsqJ0gRJjc5+S8ii/oaRBUghAh4ivACHPF/chg6kJcQhDRsUJQvP+YO2ty5vJOhGX2uBhUoWx8rdpBlXcibrRM8im3vAo7eg2gg3QOkwvtJ9bW+/x7VXonwlAqQuCIQAMvwKqF+fXaPswqqM+rEywks7YOXQKGrHciOJbIuSB71aBTxiHwyXGgd3RlxFaNY/wE/o7xchYAvzg16Ltw9GrrtPGArN+z5VAZsf596JcE3AcuMNRuogfBUTDkOm8HIor3N5cphtpttN48X6FrpF2I1AQdV1iJyHb+rCXOgmKN2Pq0usYpBetPuotyYoklwhJXAdGHAFaO6NOkbPdeGpsoFTAqk4nx+9jcSHiJI+IubwndBPnbvma8xhH5xoqgY4b2gZaBGE6mJaLnn+PI7M6t0gRhjh7oRBKXkUQPrrc/dYh0MhKoBzbM0PoPAAD//zKQVJkAAAAGSURBVAMAy97udAescRQAAAAASUVORK5CYII=) center/contain no-repeat; }',
      '.serv-ev-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAD4UlEQVR4AexYTWgUMRR+8dDtQcSTP6jYixerJxEpFGzBbg/S4i/+gUjBttSTIgVPW08qSj2JnXooKGjxUgSluEVaLx6kgih6EcGDPzcRLdJdkPi92c00O03bbCdpu2WH9817SSYv70symWTW0Cq5qkRW2kBWR6Q6Ip56oNyptaU1yN1IB7mRlsH8eBK0DuSG4KfPFa9yiLSng/wbSdSLxg8JKZuSQAo6R0SZliD3GnorkEisiaD3LxLJjYlaM1QWRHvRQZcMRWVl2RI5yL2vPEuiB7CvJoEQ9Aj1iyLRSVRH5mtdK0/ngek7KN4JGMWKSHowv12rPTrWlTqb7Ur1JcHzztRp+PwLKGlSRkw3oON6SYgevFOPUWYkY0WEpNwAB0p4Tis7kZZCRL4Q5FwjktMaqcdzRjJ2RDRPy2BOoE2exlChGMlUAhHiKQwKJjLRKFYEEZAwksG3KMNlDF9E+MVlcBvOEB8ZWfgWhS+/cyJ4GfuAcQYY+CLzE76VNLDhnAicHgW8ihTinWoAHbaNbddEjsDpLoBlCjdecaD8i1Mi6J3jUchS3o/sJTBcEtmBeE8CoWS7a4dCw/KG6bIf+7loR50OpnnbsseyOjkjgl1sRAKNvwImAWvhvZwOItGfDnKT6cHpy2RxOSMiSFxQ7QkpeFOpksm0FDfhoBGYV1wROUYzW/wpKeQm9CYvwyEQQTuwkPCXW0f0PHzdihJzGE6IYG5Ho4F21gIZHQjkCdJngHmFP3ga6rWH98GOtiOwZ4kTIoLo/SzPsQyQ4cUgljtv8mOs1D+RbGfNNTSqTwtlI7sg6Ol7BcvP3cmIILQfCLTkoIW88IsLzTKK2zfAm7giEg9wPTI6gFBA0utocCNeiLQE+RPsvIhP0COAV/FCRJA8r6KWUv/JoHLdax9EeFvB4Gj/jXWnlmTP5ZwIltk2ZlAE//L5XLS9KudE9Gjxkg/r6XJtbCSjYwA6SB3S6nhPpnyhjbdsOycCx7wMN0M3o4FnwKIFAb/UKmdwRuf/xeNa3lfYIVnnROCYhZ0z2F400Bn9qPwBCEUWzujaF15y+S8u9EWEfbvAb5Dh/8LR0XbGqbyb7aq9rdIrnQjHmQWZRuAUElegO4ADINGDdCSVQISD/YPbMAhch+aT5wvoEqkUIiVBmxJzEdmMh3m5U0CyRFR+Ul3iFAnljzWfa5BlJ0YiWLO/A+FPNtZwxQclqFAynOcCWF454NApbnG/D5FnLSYi2vJm7cfHg7vLcWoi8gUvVZsUYmI5gRgOJyXC9Z+OddY0LycQRLj1gLYS04hYVVxpD1WJVEfEUw+smqn1HwAA//9ZOh+jAAAABklEQVQDADwdJYOEIx4pAAAAAElFTkSuQmCC) center/contain no-repeat; }',
      '.serv-attendant { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-attendant-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-parkandride { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-parkandride-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-security { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAEsElEQVR4AeyZXYhNURTHz8yboiiKmXlQ5EWhKE+KB4V8f6R8FAoPIiGFNKMmpWjKg1DyWTyYfOUBY5AURRohCpPmi8nIg2YePIzfOvbe7XPm7HPPOffe7m1crf/Za6+z1trrv/c+5+y5qr1h8q9CpNwWsrIilRUp0gz8d1trLhNZSjB8vORakS21tbXN4FGJ0Q6NTcApcURmUfxxIleCUstEajlPEVNApDiJ1NTUbCRiDCgbgcw2VzFOIlVVVdN0EPqRrq6uqhJhnq6DdiaIFCeRSO8yNlaIlNviVFaksiJFmoFy2FoTC8GtpETq6uoa+Mi1CyCTF6FCEqGW5MLJoX5wcLBeRQgJOZSqbvqmJESEBKeFBl0uhN6h3waZJY7IgM7KQCO1nm8bJkG+tu7u7lW0P0GU2GObmsKOTiIUbxIzezXhwCz9CBKvOL8JiY+ufDw/Zmy7prC/kwiOhggJJtDPS+TBZkLMdiLZC0XiM7pTiDFEcDI1oQfESaS6utoOspMFEjDLV8BbjGtBpAgJJkM/2OLzDBKrUb6CWCHOTGKopkCck0hnZ+cHy9Mks2yeFMiMrQdT2QLXuLcFBER8KMYm8USR6Aw4ujtm7FBNgQgnEbzsfTuK/pC/zkh8BbsRyJyj8J3agN4QIvFQkfimfRK09t8gdk2B0KREPIpcEoj81/lEYctQ+4EvFH4S3wNhEtjv4Svb6YfvmOwyGzd7W2ci0s+WuU8iLYu1EmpvU+BybHaBRync3k53ecUKiV/4JRYmY6F2VrWYCdN23catiEcxzdqRVr68k2mj5AFk5EeKjvBNCrjFvTXYf4NUwvhm8tDtWobkiSVCAS12hD1Dtl3pT/EXMvbyN/McCQnnh0zFRjWyrczzQe5ALeGAWCI4fwGXgC/Myi6U8cAlLxlQPnCncDiBLiT+oKcWnrO9VpDUILVYpqCai4hHMRetkMl8Mw5a/Sj1HTE7wD5uDoIsspkgmQQaL1yDbwtfchIhoJV9fpPWF3R5vZqH0DcW9jKe1TCTxXgydmuuIZIQ8djnh0jUA3zhWTngK0W4qBXXL5UeNXbOkRIRIct7toqQQfXkbTaHWbvsdwp4YYIaWAFZcT+rGvO938lxSUpE0shvr2dEUdgAmdNKz7sRErxM6q1EMpaMaZncahoi8tDJqrRZ6bZDRn7otkzp1QgSbWo1EidLRYSsfQwg34rn6Fr2SiG6k7IdzUQ0hVbiuRqjL02utEQk9xcGWsbg96QjQK+noLvo00FSWU7MI5x3A1/II+cxObvFfjN859AlCxFJ0cvZaQXKdaBlEYW1sDpbtcHR4lbbxOUG92cALddVzl5tSNNmJSJjDLAy8tFqlI7CWGb1LEW2gu3KpptRkDyG/TUGswroIo0qV5ajjMR7+RDxE1DAYbCOjvnOoMv/aZym6A5wCDSC75Dcz71xQEuPxILD2pC1zZuIGvgqxSxAvwBsqaMjKyZvuxHotlxQMVdtY1a9UERk/DcUthnMp3MHuOSO+AA5T71xOaW1F5KIHruFIpeCSRj2gMcKe8QGltKPPZJzP7UUg4guQl7TTRQ+T6GJG6lfq8QkkmISSVRAoZyGDZG/AAAA//+OS8+lAAAABklEQVQDAHPjHIP2ioUiAAAAAElFTkSuQmCC) center/contain no-repeat; }',
      '.serv-security-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFC0lEQVR4AexYTYgcRRR+NYedFQwoKMSfQ8DgRVBBwZPgHrZXRZOYGISoYAJuL4giRoS4yK6wCEIk4EG2F8S/QDxkURNymN41UUSIoEhCEhJINoQE8kMScgjJzARS+V71X3VPV09Pz0xmSGZ4X9V71a9eva+quqt7SnSH/AZE+m0hBysyWJEuzcBdt7VewET2Ehg+W5qtyKZRpzZvObV9PcZJ0HgHMEoWkWeR/FZBtNbY+/ZdWIFcvsNwjwOpYiRiOfW30eN+oG9k1KmPm5IxEpGCntQ6fe7aZdEjjIR5CHom1BOKkUjCr+/NAZF+W6LBigxWpEsz0A9ba0UnuPWUCE7raeAkA2TaItRJIsglvyD5KXgzUBGT4JdSKvrrCRGfxLSW9GHou4DCYiQipLweRJUk7g30dusUEgfw6rMOcS8DaRKOreeUdDQSIUlh4JKQDyc7FrFTSPznkzhmioeX12hsLaekv5lISYREbpJ4KNmxVRskeCsxgq7/+CROBA3ptTaJWk5JXzMRKUMiJakFS0SwZmvbkeQhNL8BpAquM4HgxiYS8m+QeJ2ITgFNREaTqOWU7GQkgoGOBs6SKAoWNKJWCQp6E+oT0H9GvQmICdrjJEj+6Y4PM4kzMUejEe0GPaeku5EIHPV9uwx2w9cZAm9HeyhI+ltrtvp+0AA7RkKQ+N21FYlzgU+OWv8G0XOKdc1LhMac6quxnp5xHGRWQ70GeCLE19ZcbUsDCUmVij3EK3HRc8xVPgev6GYnKkSEk3MRSMlNUXpFKY3FLpBZI0hGCUr6Am7hPYGtuacyUWYSV9CeWzAZL2nOnAvnpDVFataKwEvMo1CCZzifvCuV0VgsVOxh/pPidMMlQb8t2OX1aL8KtCra5EW5pAXJJOLaQ4t6J+x/fYb0S6z/5dplJqMv/7w7rkiEhys75gRvq/D+cBO5JGNkEoHzEgn6EbUnQnwAZTlgkn9du7yOpPxGkvgKOq/EDZNzVju21ebwupfDUminKM2IEGb0B63fSmuu/qlmp6mH3Ynh9xbsoY9xUQJFZCM68SSgomQOqi1ZNCWCDnuBXwFPpOTHa9YW8/yKl8uxGvpk8dicQ2bEPEQIW2QSUc4CSnCvbFFKFwp/xYOHyll/7KYj5SKCKEdiAYV4HrP2E9o7Kog5jfuLV1zF9cc8oowmRV4iHAb/vUqHFR9vWU511tfbriynFnsLIFJjYcx8oVshgi02zFvsQBRa2Pg/dmtkF9MaSRC+UdRYuQO2RARRL2G51+JbZT90JTjRN/uJKLvF4j7LqW9DnynAE0n71RhEl7yGfGWrRDjqkjtRXi0kVdjwMYX3qz3QnwLyyhpMwD4i+WHQgWNybCLKPDMCf70uQoT7X8C702s4LHeyoSDp5TGnujg2V39X2ebiEQurABK/wOVpwBNBO1VMogteQ2tlUSI8ynUclutBZoYNhiTxgJRyDonuxb1jc5uGZWNO7UvLqf6vr4K6LmhGxSIq8iqjQrRDRAVAAp9hT2+AEZ4zSHQE986s5dROA5PADHBeEn1CJB6k6MfnxAaOETUV09om4g+7A2RexB7/3reD6lEovGKTqO8BQmFf7oOGHUDb0ikinMhB7PGNSG4Uxm7AJLvZh33hcBDoiHSSSJDQIhJdBTyGLfaRFOIPBuvcBqyCY+zzAHbb0g0iQVJL+D7ftjA+NMJgHRdafqyiTy7pJpFcCXTK6Y4hcgsAAP//MkEDHgAAAAZJREFUAwDH0wWD2/EQZwAAAABJRU5ErkJggg==) center/contain no-repeat; }',
      '.serv-valet-service { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-valet-service-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-247 { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-247-active { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEkAAAAyCAYAAAAQlvbeAAAQAElEQVR4AexaCXiVxdU+c4NJCIQICSgC/lD68/+UpRJEjWEVQiAsspelYIRKbCkasKy2BVoLVm0BWTRg1BYKCgVKQUoSIaQIUXbLUqVle2QzhJAQkITlTt937veFm8vdEuhiH/Kc850zc5aZOd98M2fmxiF3/wJG4G6QAoZI5G6Q7gYpiAgEofLfMpMUxsqxEMHeWfinOL2zXQzKm4aW00KQOwvBBolvikh9Innine2NmDVSVcCp0W3VqlXtkJCQwbAb1qBBgwdACUZG5naRA/bngw0R+aaI9tsiT6SM6M9HRWT0T78VsZHQ0NBunRd+9U7XtNJxLVu2DLeM2a/bRePKX5DYADus8RfSvXv3GrCoQ2zdunVUdnZ2FfBGDkpdkMrD6NGj74F1ncjIyJhp06bRN4oBge1L1Mic+6EZLkq+fPjhhwvAE+yAU6eySD9mehvG48Hg6YkTJ0ai0ScT00pfv9H3D8u7Lipdl5BWuj569PYVsz6PW9imTZth06dPj4EtO1HZQBm7bdu2DaDvuNfyF1+8eLEhfBKMjIwXNLKBAweGKq2+Bfl1pXXWjBkzCsFT5gANuU2kH69BosDZq1evmE8bvzSr1jMfLRalfiBakoCPQNgGDXdF3TM1v/fRwu11p8xNTk7moCoTKA5E9+vXr2695/c+bfl+6PLly1XRBgFVJF7RyO69996GWgn7dP1Cevvj4vrT8fHxPRPfLH0Ln2C6Tcn7QncdvKx3EtKu/jI1NfV/6I6dJLWRDeshQ4bElPRa+XMt+lkRVVtEjorS6bum1B2VmRI2QkS9DsXDIsJPcOjpuLSfwOG9KFckUHAhTnzKjktdl48SrR+FPaHE4XDQD/mAuHPnzgeU6PugeB4BOwNqoNqIzbEIXjIKT9mUvC9010HHhsPnkPDw8Gjol5tJkIlesWJF1YIOv/kxpvAzULjC4Ojf9/xOxjNhzxYUFLyNuiWZKaHPR2wc/EMY7EWZ0PdQ05cRPLKYb4YEfMBc5Mknn+wgSvAyTMDBluuTPycmkHV+8EmcFsVPfk9UVNRB26D43Y7Z4GcEg+jITDS8VkR9KSLXgYKXdqSkpOQ8efeZBF2RBQsWPKSV7gchv+dVMVtGTsjKytqllKIx9Vkva9asyYrOeXoijBiomiJqBNaHRuL6o56L8/6EmTg3bNgQVtpjxVCo1ANyoQUJCmiPSagdWIe+YSyUzsMLvmJ4EZWbm5uTmRI2PRjMSAl7sf7H338JkTklItg01Jen5rVOnzNnjvl8Hai0QZMJG5YRD8pOHytYHP/usmXLLqDMwLBjHMgNlMkryD7Me/Ox+Sizc988cODAQ+CDAdrLK6+80s4pKsEycFo0aNKuXbsop6i6MLihtBzAi7T7ZsaCerYTDMrJR9/oAf3/B14FLn/55ZdXghKUHSQ6Mm8GH8v/QsJFYe8jjzyyCzzBiYfdMFhoCSaoiNSrV+9DEE7zqPqpnz4BJ/RFfVR7BSPHrhhxz5CMoSjUUKI2QfM0MFhQVAwLC3vIIfpRdOxk6fJuH7EOaGSgBIhMX31R6uq4uLjHoTAIBhHALaHr+r2Gjesr8IyP5gO8a8CxsbH3i6hYwR+sb+Dz4SeGkleAXxHkTBzcX6iBuR89b968UPJAuMDTB6xataoDFLpC/HGrYz+dAPoJkCMyfskHQuyCdbQoBFkKmzZtaudHOpCdJUfz4hwzZkx05FNbfoQC04iiE79u+d769ev52aFKzMu2g2QcN2rUCGXFN5KLin2dOnUqsRyiaHEeBHkJAqmKWK2d4sTi7lMXOvAvmilD3TE7p6Acfmb+w+9gau/F7nIU5WDBdD4yOYcDq6KU2pSfn38iWGN3PeyOfTBFnjB1Wrb27t37T4Z3e7DTLJqBrV69+mTc6V9MaHpoYt+CRY8voCAQTps2zaGV085rAqmbwSFlGCxKtUWjOW3btuXnKg4tXAsErw/g142R43ONUQ4VB02HUzuPrly50nM9gsgn0IeeOnXqfTVHbh0IrShg4VdLO6989dVXz4I3clADdpBMgQ/OjLlz5365e/duMztY5w83btxYG4sm36hghCFYx9iAePkz9cnJyVwc2bGC4nc6/O6NN97gxsDPzAQQgQN4sb5ZZfywXWzTDVB9qSi9PT8PsEGD8ZGTk9MNM/gxY6Vke5cuXTYa3uNxS5AsOZ0QraJXYuRYPLEbqpaWxvGkpKRSi/ccrCmffixtAOQttZZNffr04YKN4k2AU8DNshfO+CkuLm4D2TfwYg5FRETYGwyqAgL9OzFjqkUM35wEbc6iokvvdnoPszMPZcpNG+AN+AoSlYhGycuDjpzr1q2LCBuW1QdyZNv6XGF6uy3gCZ5+TblHjx5NMaj+ULh0ZWnnpZMnT+ZsZXqBKhegUYCL9/E08nrP7WFOxk0iHyeEYh+6PquxtDRRSlxfgEhux44dM30pm877EvqpZ5Bk9uzZncG48hwtn7Vo0eIzy8YMxOKhYo4f6lrv1dxmv436rOHDh9uzyF0XMSRAwzvQl4zGjYESXd+oaDmYkpLCYLNYzhcrPJD2GklnSGTyFr4sfvrnT89rvWzmzJnMto3cw0YqEyTaOGdNnlUzZNCfvguHSBvkMoa2Jj093d5hbulsYmJiJ+gOAx7GMWcBBlaWh6CuDGAIKCt6MhyEnD9/vomIai8iF5Hw+pq9EN8Cxh5bfGNIugGrYDH824MPPvhn8D6BA/Yp9CJgI2aB/e3a3/ZHXmS2Towqo8n+H71v6VPHYhE65PqTJk2K0v3XjUFlA8yAxTjm5IAnwJTkJsIYcLPsjcNVSgwMYyC7jAGeA60Q4MjSHP0wJ3xRakdycvJJywHcWpwbqWiQjGn79u2faJC67zntOlj+9cb73efOnz+fSSUHqI2S22PLli29IEjAW9sXun7gakuEKtRYBZvAGGCXvFMcf3gqqAHpR7i2/SsoIZAd23PyU2v0wv7O2tX3syW/67J20KBBTB98xsKngK16IHU1svC48GFZMyFrAbyolJq9efNmTld2QqPOBlNmRhv19J+/g8qqovQKLPbHwBsZ6C0AAeCWalawnoMMbTntOHZUqYKKY8iPLlEYLL711lsPYpHhuggTdQA3oXvBENz7znIZcuBlBT8M9Zxjx46tX5SwdDz07LufDbHHptkzA9XlAGMQwSxKECW8DtnTcPdzf7Q0jMziK0SWLFlSw+lQvOQT3HfZ+ZGCE5+DhIxAHSkqKooVrZqxAivBtg8++MDkaSiXs0e5DDj4soIPhjrOESNGRH/e/FcTREsi9NA/WdN4X+qLs2bNOo8yO+DeCMvOvn37Rtcbu4eLdajSevmiRYuOQNfe8unXRlTDM55woq9duwbOAOWGwYM+BetRC6WdzaB34sz8NttQTzAyMj6Qcs7CkKiRWzkLkbKoPNw5bbX03duxqm4Sv0KoUe7klns2fvFYRP4p1EWKUh/eWJk0Gdkyz1vUQZ8hcQE7ZLbZy92WjxQlXNyPdiyY/QeXWPj9c/G3kWWKwvkAVsHPQrjTASfWBZjACxoX119DwXqCRgs6dOhQoUPt9u3b8UOG0xzg4e4L3N+b+yJBAegT0JZfmRNnsyrHW897AVoIkjA73X5lSecZmzZt4vUt7TlYiMuAQeJnhmRPcRZFQFIzu9b4FNDBQOZKXKNsOhD3yZQlQEa4H/fmbGsICn2qV6+OgQlfAlFCh2YyP9II22cxMTHB7mx2n+6DIa+jBceRD2vVqsX1Ec34Bw7SmwadOtPS0u7JfWDKOChMBNYSUXlXlyfO27p1K6c5dbT4+Lt+/XpViBhUEGEuNRmX8MuB7wPfA9p0hRL9JpRaAwnV8BgJ+bKuaVfTqlatyoQPVSKpqal1odsFBbwYlT19+nQu2n77AV2C5qPO9z9uD2XmSNcdTnUc51T4QbgrMZPgx9x1h67WyVik1SQ0gOtZKcTuNAdbvftCbRqX8n+mDmc6Jou7IdoD5F3RJxDs9ER0cQfkvLS7DEpgx8+C2ae05s5TduQ4depUTSWKAb967b1u1IEaPPDpGxVEaFagqOqJSBjwZEF6/CFQAuWkPtHbTDIO0y/0Ho0pORWW/MUAi7OeOTN2/2vNmze/ijo6NnrgPcHU79+//8THE2qPxh1zN2AvYM+slLAkD+yROTosCbLucLIeCFD5kZlDX0Rdp4xnw7577tw5BpDtyY4dOxrC+X2YTXuQH/EFQF9QReIfcQyqBkXOIkG0DjVr1sxcFEqAWQS5eAbJdCY+Ph67h0qGAhO2C7gKeXVKk9zZWOi47SjUoz08/QC2/uvYibiwct0g5kPdE1mPFyBfQGYlhfpC48aNc1EuBFKfL8W0939TDz+Ouiit1YkBAwbQFsWAwP4K8jkcZcR1B6+luH///vQrwfy5B4nO9Lhx42rhN6vJMLYdbkj8asHruKXEDaQJqukw5MEAfbKNQEhf1BU8VGFhob27hUCAKhEksTzxm5mglJzC2Y8vDOLgZlJeXh7WOlWdBpg8n1h32PQdcDzsvMvOemZmZvLemfcs7OCuahmD3xw/fjx/DbE7ThtfyEYtT4awA1xj/CF1jLL9cPtxkjLjExsBA9QKOsVHX2vODB+seWmkAfHMmTPQcbLfhV/MabUfBYLxTcYf0ohyKutRo0bVQvLHrRk7GXIULWvx+xrvvKnDmeRvsJRxUNS944gEswGc8t9qimNjY3k5hmLwcPjwYaQSnEn6Gg7F9sVgUA7cgyRHjhxpifluHzm0OFR7rA9cm/rCG3+w9IWUD4iOjn4UnwVnINQrDCbAeDixKIOU2Rseh1oG6B5c2R6pVq2afRwxsjJN74yTP3O1m1PUFmKkJQ5n7dq1K9RHO0imMfwO1g6O2BkQYYcSGk88xP/7WYW85fcBcGXrmadT8YOh/VlydtJPsMh/vaFuOGaN3S+Wmb1XbTLl8wQUwvHict5+++3T4IMB0wdsIliP9DddBppjvejig3uyM3Sks7Ozqzu04nbPrZHbK/MbQ6Gwzx+iqX3Ag0gZTgT4SQlq3kFpxTudg5jJn4aHh5dYWmhWZNu2bdhlXTeRmBXu+REHbKn6JkgjbmhRPCHg5lSv3bBhw98tbW1Rv4RBMooLFy68cnJeq58hP0kE9nDDJPxW3t0fQpe5Tuddk+6fhSz4mtWi8Wvx/ojRy3g2dCn8dMl9IeZ7JSUl5c5UuKSrK2ISwc9PzY1lti/4MwEE9QfGN5aAkp2T6rwE/0/sebH+BLxIeyYZeXkHt5YYJFOLe5kbBw8eZF7DN8X7XpuSDwovXLjAu+agGjaNln/wiHEWv4Lk47agXKAbPL+H6wl2N30WuRpzKloG3Y5SSiOtYN51Jj8/vyyDp5NgsCxIljLfDusqi7S3XFWY0JbtktrGdiB4lDimtGNfz549edyx5RWh9OvpPyh7GrkrslNOVFQWaQ/zSgFt2S6puwOVkRK+JOe5Gon4JH+Gq1bmbJR7KonxWQAAAExJREFU6rHOH1Lfm39/NkbmGSRT+R/24ODySktL/4Z+cTkA+dfC1yFIjEilPxUa3y5+XYLE2VSpT+V2A0T7r0uQ2Nd/G94NUhCh/wcAAAD//7J7gCkAAAAGSURBVAMA/ij5sOia9NoAAAAASUVORK5CYII=) center/contain no-repeat }',
      '.serv-ac { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-ac-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-credit { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-credit-active { width: 75px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-deliveries { width: 86px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-deliveries-active { width: 86px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-drivethru { width: 78px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-drivethru-active { width: 78px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAyCAYAAADySu2nAAAQAElEQVR4AdRaCVzVxfY/c0HANJeyUss0NbWXW4L2MC1Lvfh33+25L8jiiriEuIS75gLixkUxdwTJXFHwmWimZWqmLS/N5WnlK9dcnqx3/t/vcC+BooKv+ny6nznMmTNnzsycOXPmzPywyF//92fPQVFlf3an7PP3BI7fHhYW9rTVlu7XPCotzmpLW+8TnbYOeWwBYb01Om0DYCVkhAPmNbelLXfIWgsZCdaotNnt2rXrHBkZWQKD1wALO0b+l0wcu33QoEFlPykfGieibUpJV8ykm9byD+RvFxC6iZbOgN6QEQQYAZPq55DVHTI6iZJRd1rGx29z81/s5+dXBjQ7O0f+l0uYm9gTExPdv68Tvlxp3QQzOCOiIrXIOBEZezcoLSFOYF1unGUDSkKhpFCDS46M8VBmNGgXUdfjnOeCBVrrv6bFvfvuu1ScHD169GlMqCZAtJINyf5uw3f5u09P9nefeTckBbjPcgLrcuMsG/Bzn5FMyNt+WrK/h7+ISpDs3yuxsbFP/FUtzkyhRIkS0JfcYcFiVx7M/wiAb3OH1XGLUvydxx9/XP6Sips0aRJ2pMjQoUP/o0Vt52y00r19otJ2wpnToT8KrEbbFTkQnbYSh8QqwjaPgK3og37TrkU2tm7d+srvoThuGwJlPQzI5wSM5ZETxi8Kv8wKhwKnitaLKQnm1ww5DwVOkvndkJt+N94TbfvkgJbeGGgvAuQ3B10pUUsGlt48SymlOVHQHikptGJ7ToJgR/lhQD4nsC1loNkjJQ1fZ4mJibma5O8e1OjnWU3LH/T3fv7zwQ0A9QHM74bcdIM/91ngqxUODfKsdmJkO1H6E8dIbouWORUPD2mplUpx0C40+mXW3K5du6Z36dLFhYN30AucKXC6AKgAO08Y+oBRo0Y9PWbMmPYDBw7s361bt34dOnTo36pVK4P7+/v3Gzt2bOvAwMDS5EUbtqeSzeQhizKRFS5hy1IGDEBlTJw48YsVK1Z8vmzZsiOFgeXLlx+G8r9YuHDhloqfDw13jODL1um2KUuXLt2hxG5cAei3q1Sp8l/kEh8fby+s4jhBKiyLkw8KCnrNJzojfKtHwM7jL047cKzKlI3/9loYc+2tVctvt1gfk9F2o8HP1otcfqRS2Aen60bs2eYWkGiNzogIDg5uun///scdk6dMyua4CgsPamuhdUAg53lfaNKkiSt45Pbt2xeQIwyUa8OGDbsNXDzPTkKYIxkYnCUzM5N9SVhYmKIw1hcEyAt9aQucstUanR7/zUuzduO0GeaIo56EkFWAMFEyFR1NyQ0iapGIlBCl31Kih3xVfcaOyd/UX46AshboTE7rI15QQBeGVcOin4Ks7hjXoICAgLenTZv2DGrsGzZsyGL+IEhJSaHlipubG+coSomCLINDWbQyakxBRk4ylTml+yPks2MLVPSxpS34ruacnZDSEexcla1PpvTt0OL2Ik/EQn0BkxALTYDfmZgbkv3dgttlLnvjmf2+dLpb0PYS/EhnBJTJPrbUkTB/F4f1QTRqC5aMBfTt27f90UphSZC1Fo580ZlX5sfuLTNq+5AhQzoVTEw2V1ZWlpGXXcr+q5TKAEa6ghKZoygPCkdMPf8Ypc2dO7daXFavRViOQSDegeXE1D094e0kP7f2CAg3YevRpOm7aPYEBT4mJ63I4MGDL6zGb6efW4cqx4LaYpJLwVBWi5qz7FrbBYsWLSqOsgawT2QPTIYHV67OP3nbYtHoFVj/Pt4I0GonwPNkrbmR2HJNgTMZfiKFAYvF4pwHuvit5cOEsZF91qxZ1ZOLD12MQis0PV/6o96dk/08fN97771dWBGaORWFKuG2yASSiT0tp06dcgfupHHlUBQXtlmyZMmR5AAPP8dEr4uowM1FfOMWL15cWkTsDt8E9N4E2RiK2Hfu3PkErlzB4PCA9X7oW3pLB94Igirsbg8aY6/y/3p5dmPghU7lypUzikJfnIPRk6urK/s1sgzBYPf+IZNeu3Ztxd2lg+Zp0Vy5wzi2O8XFxe0Au3I6VeCZ2GpuOEU96WMQNI7xsaXZBu9+PgYvC+ObR6cOhyKaw2+UBC8VKZ6enkWACyda7+y73FJHMPmWm1z6z6Qsh2/iGMiWB+icSfj666+LIX8OkO51ftIihApX0U/Rli1bptX5fnws6CJaNYaRlwPOBc5XHurum2BxRoF3M9xPcewAytZq5e0uI0VLSxH1C2KeYTi2D4uICwZoSUlJydyzZ48HtmDrpVfbrcYpehjbb5ESmYUtPVCU9ABMUVpF/NpsTfI5r8jtPXv29LXZbOWOHDmSARncxi4zZ878qMbXo0dD7hWBX152rR1xwY+Dhjhg90+sh3vKukMWKNzk8Eekg6QfS01NNdcxTAjlgqWLFy+a9mjDHcRx5GmYr+IQWJpG48eP94YiurAFLG4hYp6DxDFhwQCzwsPDS8089dq0U7XnxavsJ51ruPpEQVGBbls79Sma2LWPfNBmAITxhD0pWr32S+OYpR9I3xWhoaE1KQN9cVAWxHd7cNrOoHxAwIQJE5ynLZqDkivhEGEb8fb2vgyTOo2qol9Unjx43rx5TyAme3zy5Mn1v6kxIxB00RbZi9jyLHCFn2kHvMDJbrdzh5h2WAyTs3F+ilMYGM1aDlWYOBxMZUXUP0OrHTDBIZTmwgnDakrueCxwJlYk28coWQWH3y55oPugpAC3qG3btq3avHnzquTk5OU8XeudC2ujFSxR9CURsR6u9G5McHBwHfYFmUY5Sf4ec6G8Zah/7rPnJvgiZ+JYTD0LDuAELA0bNrxT4+sxk0D7FdB9Z7HBKXGZPRP2P/NOghbVCDQYvDrPHHC3DJAenhxbVYMzT/t8FQcmmTp1qpdS4gP8Tp3vx4W/+eabt4AbpcXHx5fcKP2miSg8t8j1J1P69kAI0gcO/2OFexwUwS1I2U5QM2bMOLnLzz2k2olRLTGbQ6KlAWK5mbC4UlwI+D/j8yp8PuRDEcFBovtzDMCZ8gyaBAAVKvPnz9+Hq1FPzGw7aC8BrIDnASYprSsaBKbpyAuVweIg+t4mnFhuKgdoBrSvzGjGaXTm31StWvUTMuEwYL0su96+B7buYNAyyx3wC0Y4Yhwx6l2hCAsUQRnskCCgOQ8SF/rIOqfGcxudQ/sWB8uHBiCX6Ohobgnp2LHjfnTCw6f42bNnqQhW5wdm7FwoXI229Soa181lU/vGJ2dUx8WeC6r2sBEG4Dt8+PDWwIEKFxRowZOLi4tzLnkamc7zUBwFGM5TRNHbZtw1uRVUCg4D+KKn4PeGsE5ELVy5cuX74vixnlsPRTSDTWWvsp001oFulDN79uyjLxwdFoIy01RfX9+3gHCALjgRb9hFnUJZLjRY3PLAgQNFgdsB0Cf+/pZ4T2YYxDrp3bv37R07dnx67ty5OATb0S1uL+yMBl+A/Ylv//beDFg0rTCLiwtagRNcEcTcy56v4sBs0UqVInuD85P3MgcY3hMnTrQCXgWApMvAGXvhkKgLhb6CbVMTcVj1qKioF1GuwhwW9nJERERtOO6XFyxYUIP1pJ19JbIOBNwEuJz3WtgJfdIajGJrfRfyFehMdeEjGXIQzwHwukLBvXyi01c3t6X7Izwpn1PpQG7cuFETq/e4o1gTt4pYBMtlHQvIvhxV+WfOOA61bgDy6/vGcdxSYBIooh7spR7wTL52ImfiCitc4pujQGHIpAOc8bodjw2K3e7uv367R8D6TS4D1m9U/WK3oYx8/ZYiA9cnFg1cD8e9fqubX+xmlwGxoCXAzw2FgOyJKdV83LhxfAYHSaRIkSIfAfkB4P7rr78ai4LftKDsTCqz7Yf0v2/jMIk6UG5sog+ubbhivbBx40a+0jQFbS6YqwLom68hb4hg+QMoGYedZEEelQHygxMWKScAzs2ZezCCLYVFEkkqNognUmUw3sTFl50CFbgThWhD8VRkOQ1/uI1eRF4DDashfxlQF+AJ8AJQ+TWR01cxrws+XI2kBmiPAdIBSOqHkiVLcoLARWrUqHEDCO/Bla5evUr/ZMIf0BSAA8modHRov+JJ/2iH8lFAHY1r28lacz+JutQqGa808aCx/y/L7O3XtPapcXygPA5aQyh0U1BQUDn4YafyFJRo5MKfmRx8OQmKo4IVKnQOEYhTcaALr0huzW2pdPr8UoRqtRohwwkgTKbh61dmz3j5XyH/97dv3+lU87uxbXCTaFnrZGhLZ048N5CeH7AtoAPktPb+aVrAO++8w21rxtGvX7/rSgtjRnWx4dL3rLZ0HiY5YwCicJhkwLq2tE6zdX3us8DOoK0B0L3QBTwhShLQb4d169YdmjNnzlavf0/Cpz+hC3gVrzq0vPJUHtpwUczccIIa6ybNCVAmdWTG5aQxJ5G5qYAZd1Fw+FpUGag49u0ia+awElpXzAEKW+rn8PDwnfBb2+G3EuGvduABYIczJ54bSM8P2JZAObD0k5QN0ADTV50zE4bhbLEB8DykI3Dj4FM3qqESEIGQz4JL/GkE5h8k+7v3EqVGgY5QRkWsanutL/o9i7FbAGr69Ok4ZfXy7HrxPlBu7AaEO8+ijGp2K1K0aFFe37D7JQtxKOULgl5jceDLk6g4gh3Xplcvvx5jglxwjJ//+ln//v37X4AZ81IOErxe9oBdHCcT2/1PQNkQ7BxY9uhBgK+14AHh5thqB4OgjAUguf3cOGYGbhP1gTvf7chPC7GA33X06NEv4rRvgvoshEqv9dlcKsInKj3CJzp9mo8tfRqsdr6I4i2I7XgINfz4qVHrQZ/XIjp9CnnP1IsMEcfvzp07RnGurq5YCDN3R012xomzc8G1KUjD0kCOw1PRLPgZbh1Xhzlr0J0py3Eykca2jwraIZuToCynfA0L1FQqgu7U3o/Fj0fFDsyi4mfPjudNhr6YfYIkBHuxYsXKHKs6dS34qBgPEOtrUb5wyOQPAddYrDksWLzB4wbgYkEbvF3oEVokVCs9nO1Qx5TeqFEjkEWwVel7M1C49z1uxIgRb4CbqyVwpGuVUpkOq8pEWPFU86jUYKstLcbHlrq0G74n4CrF0xCy0OrRkkIz0x7BaVurLTXKCvlWW3o4LIeHi1OpLtiiNzzPhfErVhoU0DQkJKQS2pqgGjnlyJkzZ6gsbjuQ5Cz4DgE56IADjjy7rOVTIYjxoaDpfVAqQ66DpCMMS3nh6LCV9KFox61K4yIIrM/0R7ohHDt2jNcSHtM7GjRo8E9W0KrgsOtsc/dLgCJ5tPfXWEV+T1j0nxbvwzdVJx8gRxjwQiU+QX37t/cSJPvq1h8TCPqy6tRtUFa/r776ipZBa5Q2bdrsFpxdgLKXLl1qhpxWp7FFifLJmxZI/AIOgY5hNY806V1sQ4turmt8AC18S2+2jq12wArcp1uRNVYD2XU+g8smtQa0MfWoG1VxT2vcw7dSGAEHBl9W+JqpWXaCUdzNm9yVGLaS43jT4rOMQEqb2AAACGdJREFUUcaxypNwQ1Cvg/ksTrkQ5DMB1wGdEosGjIBXpclToOEH/aEJk2WfGv7TCz6J/6eBO6q2lf1kIA4m2QIBz+IFZTICa3Nz8cS7HS/zSisqT35osJg3ALD9lmAJGh7dDZZ2Ed8aTpAfyr8xYMCAmwMAmNMtbPtbxO+Gdu3a3SQ46318fBgGUTjHKTAaLp7GJPPM0VSmp6cbotLCtyc20rCoZ7SoFihcq/rliG5JAe6zcHKNxYUalgGqyEu44rgarBB/4L8MNyyKW/JZUbJ54suHR69atSph5At7GXbwve/Zy5cvNyYj3u2yrenDNkdYxgzu36eWrIMHD7qRjz4SOef1KICmovkHPo6xZvYYSHCAURwidVNED1h9g8rx48dpTWxwuX79+s5YTmrXrn0MHPjyY8m6deuWEY5yQRO6EN5AXEsN2McAFXqTo3DENPkiVqv1J6UVHxTUL42WOd/jjGzdcSuDbYM/6M/169c5ZsZmzDm+R4GcLrBV2d6UEZrk4EZxMHV2IlqpnMHVqlWLTKyvHJvRoz+2ZZH4+PiSW938BkAKon67S+XKlcmDYoET+S0w/0ylLA4L0m9FRkZyW2bAt5TD6cZbizz7WaC56EMyv+FC4drcIJRFUkHLk/DCm6f8exagOPSdLRF6ysGpGIEC0kyV1t4IFPl9VIKCgn6G10sE3QW+aKaPLWPnsutt+eaFo10EErZ4eXkxxgEqVIgU5AcfZ9jwVE7L/Y+IemObu//W5ra0DzZKX8r3hMAvypYtmySOHx4GGJjWR/E23vMQyAIT4YOr8OfhQf9N7M8Do7h69eqloEtOxGvPk6N4fRFYhb11WvQwKG0p6ooLPiQLnr6Bp0NL4/haC7zQCT7OWHevXr2OwV8OggDeNV+FsjpCLu+xP7zwxfCJWMCLqDOuY4vrAH7M4an/bc2aNXnnZDiC6j8+4QXYHA7sKTOT36WJiRjFIXb6BcVNAFGicasaZ7YLrjNp072+GozDAV+4VATqJ+F+2ZD/vAecSeEP5ou/hUy0VjxAftjkytwW6HOUaFmLfEQH+/K/R0VFbYM4ys4IDAyEP1C8P2MD6FWOt0FxLgD4/tAExdHXcyx5+qHiDLFNevRSaI1bs8Lh5yfGjBw5ks82wgliq+xJ8isyBjeKybhf8nGQwghsSxmPCq6hoaGXaL1htY8MRB4BRf3oGKEGXv103Yg4lPk8FDe2+sElwJnYL/M/HOjb0Qnnd08ATItRQ4cO/emV0xMZDmwFodqJatPjrLa0EMRFddGY99UMbl8IYaL5Erjt8gAqC1N2hj/C2AttTYIfrAafNwZK2wWCFxb0kM+thTMQa5Gfk8AQUfMnJMyZfRHy9MZBkMAo3IIv9ufrn59M5fGJht8bZuwtM2ovLsoreO3ywWMhc6stdQRzZ5l4QcHZNoc/OnU4adbo1FHW6LSxeNFdcLB8aApMahYGVgGw/K2r4b7YAV8CB1m4MED/tMTFuq/inD7DAgv7cbrnCf9Su3v1wtC+B5QA9ITm52o8FjIXUfOYO8vECwrOtjn8WsF3qnmi1WzRMh1+DrcVKQf8U7xyDEHQPSAkJIRxpBJ4OcA96Y8MR/Clm8bFvvP0S2Jugh3bxAK/9l/EbGv+/uO0yaj8FYB5yDdoPQVjH45JzwONQSsyuSKiMHk9XGs9EvXB+QHroJQRqMOlWvjLUFqScFrjq70ORt1+EgG4HMj7wZX2tNrl77EIZZ6gHKcmnh/8weEIYx0XhYHn7psDyl02lue4rsjTTz+diKCYh4F4/zgtLMnffWKyv0ckDomR8DsfsyEEfoKDYzTpuwI85iEPzw9YR+fvsqnDTLbDShxpr5cPSPbzmEP+N69FkM5FUm9dnbe1RYsWV8FnDqCHnaC5La5UqVJmTpgD80cCGg/6ZluBxfFSwHGA9Fsylb8VszG8kxk/go8fV5TW/GgixYsX/ym7VowQWAv3PhyOSoQFEied8u4HrmwPy+MjgohSt3Bq8gQlPz/Q/BdWx4BaoAhjzZi84HdfS0OdSbQ4MGksooe3t7cJ5jGHRz68HAvF9vLli1N5IbBAvtGJ6RB/zKCR3z9pwXhEdpUYbsWkiWch0GsIKXzbz3juU38GztxOGkJAhi7lXsAqso63FF6acdfVjaC4to42klR8yBs6+yH1In5GJiZv2oDngSktLQ3zUKlapJI1OmMgXl4ade/e/fW+ffs2xitJDrCcH+TmyY3je287i1g6ODrX91y5HBW5M4whW2HwQXwUFKUk2Cc6fY3Vlj7/8+cnLoEGKyrRn+HBkwcItzjb5JaRB8cqmvpmzZp9h23Kz38ep+tGzIK8cJ+oNH7Uhv8TdCfz8Yh4WUTQBTjl4T83NzdYvOKrSGmMKeqHV5d8fPmN9/f+5G3bhyeqHGA5P8jNkxs/X3/RJhxQCP7NGDJh2ehHJCwsTGOlDPG+f+B/IjGFqWAoDuguovkEXRv4iRL/7OXbp08fHA7mBqJBe1BivaVjx45XXvp2zDhc5egj8ZlQB2GP9UXDEtBaTNcia/jaiyJ65d8Hg7HIEiVK8Ho2CWOLhly01/zI83sADEQtwsNDVPmD/lM4dg5HKfVAxXGiXHVJGuj27jP7fZtmxbfskrbO2rVoYtcu+ATYBlvpOwii8s0EgD8skU/Nnz//+OuX5/R4al//jqlrm78N6FFiV49mnfTKQD40Qgj7JS/QhydYsz3Z320JFtk/OcBjMPKA3wkGJfm7Ddnl5xG4YsWKDblHwknnLt+NG+VBw/bVq1d/tHv37oS9e/duwDeHBHwC/DeY2b7AEwQ/k5E5fvz4C2vXrv1w3759cYB1CQkJu3EPNYcDmMiDrFCJyi5Ug0Iy55H//wAAAP//t5OnhwAAAAZJREFUAwAIycQQX4nsYAAAAABJRU5ErkJggg==) center/contain no-repeat }',
      '.serv-outdoor { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-outdoor-active { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-parking { width: 46px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-parking-active { width: 46px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-reservations { width: 55px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-reservations-active { width: 55px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-restrooms { width: 49px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-restrooms-active { width: 49px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-takeaway { width: 34px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-takeaway-active { width: 34px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-valet { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-valet-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-wheelchair { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-wheelchair-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-wifi { width: 67px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-wifi-active { width: 67px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-curbside { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAHr0lEQVR4AeyZDYhVRRTH374kSqJPCdONrIwsKg1KLSwUsowstAwyihQsDPvQUktTUrJU1MqwD6jQysoC0UgpydAS0zJQU8qwD6PVLAyNLC1N+/3evnt33n333X27iiK4nP+bM2dmzpwzX2fmbj53hP8ddeBwT+DRGWjGDLRv27btj2A7bfuAA6JDPgMYfh8WtwMnw79sCppNh9yBzZs3fxlY2wonxgT5JrOH3AEsnAPWgogehOkAmkXVOtAC7ZeBa8BF4DjQXNrLLAwNGrdo06bNM0G+SWxjDhznFINfwCrwEVgHtoMX6akTKKPa2toplO8hnUehzpOU0FJy74AC1dTU9IJxYEiaRlkOtMaIFah7ArQCITkDgylfhZFTKAiNbLV///7hykg9ZZw1sqXELLxSKskl+0gUp2crOaDxS2iSOsLII2qBkcNxxLqti8IdpLtBgVge3QtM+c/eUES9C8l3Be1B1ZTmQGR8uLG2YegIRq0n6Iv2uSCkbkUnbKNhn0eFLA/3TpQN03DWctR7Hh0rwEawH/zK7M6gwbWgIiUdSDN+OUZfumXLlqloWQzmk+8HesDXgYg6MIrORAeMWR8JSVNHFAPPoSyLTmfQhlBvEVhOxc6gjEIHKhnvBgsNjZQsxYnLyYSj3Von6Pg05BGdEDGJtGUin5W9Eifcj3cmK0UOZBm/M9koyG/FCTepI1QQM/ruhdsKmfqfrPb1NfjF6bfQNZD2o8g+BX4AIeVx4nWW1eQSIZnmGq+hruOddOwsxU6gM6RtYaYSj+GrKJtVV1c3CX2PgXPBFci+ADHh6EicuDsS6JVntZsvkrnmNajiyDESU4GxYTtL5gP4cTReCdzAJCUU7oeSgioyK3GiC0Z7Z4qrkzcGna/AJdQk420EDP8kuRMYOZ19mIxwRmAbiPLVDbnmcRwg96Dn1aD1MczCc+bzeHg/zPdUeA9eYyqOPPUiWhQxjaS7WBLzG6lTVTF6BmHj11FlZsHjtaMzMBvD21PBqFmN8Tnq9wE3omw68BT6idTgZepF7TXyD1GnI6kykjL6J5Rg0L9hPo3HRiN8XMQs3KwDsSCbKSl1rS/AwKGgK2gHjgemnUgHAC9oG0taBRnKdwXZXD6f74lB47LAXnPd23eh6b59+25prgMFBQfzhxnoAx7PAv05KPE+Y0m1O5wO/I1BB0otD6cDv6VYvxmZeyYN7jGKS6hGB7wa3xGtPdbZzCKWkAovVz7Che8AL1pVgRhhrLCdWF3U9z6pfXjsxtawJ3qAWuA+SoN7rIbygXEjGAPZbBS+Ea09ZAOK8BosvIz5CBcnU1Y1sUaN1rYTXs3V1xsF9mEKG5MDGWcqMQy0uuJiZ6DSdTeudIgYnW1qVzt1ID6WaG0ccP19Ai88z8WTjOb4EJTf63QmgXxYWE8emfFCPb4j1GvsqOqORNss+l0HwqvyQgxy/XUnFZ7nYgxBZFwIyl9C86wkkD8b1pNHZrxQj+8I9Ro7RtD2gCnPCPkEjBQ1No3e8332XRI1OFgp+9AHTm0V+sI6e/Ns3sYcOIPTZDqb5w862QZ89q0l/Q+4FG6totOyKrQ9NSEci+xn8Bf9vUnZBaCMsDc8SOqcgU1BLUc4yOa6oHA9s/QADU8MC+Bdfp0pfxe4lBBVRxg4hJo+UUnKqCX93Y7Oryi5CSQpnIFNee4T4Wby00YUqk9DyQJaJ0cKURndxQw9WiZNF9yAgT7Wa9KLY2kL+vetUvIWZiDPimrAb81z104+OLxS5zBoJBV1iKRAhv6JcN4IR5P6wCepJ5SNhzsJZBJGTUtU+Ib8WJzya91Y+PBQMU49jSyiTtSL9yn8JpeBL6k4TNPBPLAMg/yKHDX02Xghp8loMA1MBD0p9HgkKdCxOP0ZbY3eqWDpeIR6oyw04GcxetQ7gdNqOvwEcB7ydSAiH/TqW4ZuH/aR3Gv9Ah3Q+GGxNJdzCXUjH381wFOPTOMD4gais5IvyzjtxymjbSrQc3VD65wGvBDmi/xu9NhfMZtzqalPm8JobVypy1sLQ2zg9IVBzaII4bRGMlMDn/+okG8OPk1rxLJ2VaQVRbK52DzITMEBGQRO38XwOmLEhK0nRsRRqM+U/4Zlnmguk0rYkGh+SiIfZY+NmGK6hnQhcPl66esHXxjs2AEE0oaiI1aITyccuM7CFBjUwnN5Mu2NtJVQ8mGKPVE4MJJ6WeslFz109gW9gQeIX7bjJkkH4gKMjh/urN1edDaJwnANdqWjmchiooOSkykuaGAcyThwotcv3+FHMPefSyO8an9Lc2eWpJwqOsA6NNAUpslmdPYIBu8CRss/ST0Rwk8yLrvvrJsB9YXHqP8nextde4BvBlO/AcUDxaA4cBVVVnSAFmuYhfB0QlQgI2Hye6dLb3Ch1J8MFA36OFHFkS+551tO/14pMqN8lgM5ZmEGHfZH0VYVVoAnwlWUxXsGPov8F5Nr35nwCE+ru4MZH0X/PnzSymNZpgPFWnNQdDaOXE/eE2o6yo26vgfOQ16y4alTDenEcNqeCfoX9U0zJe+GPZPA5tJxyWXqq8YBFThSH6Lco3YoysfBGzsaW/O2zYKzNqeob7gplf2SZ3yBbZyqdaBxTYepxhHvwP8AAAD//x4cbZEAAAAGSURBVAMAQnCJjjPPHq0AAAAASUVORK5CYII=) center/contain no-repeat }',
      '.serv-curbside-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      /* Inactive service icons - reduced brightness & saturation for lower contrast */
      '[class^="serv-"]:not([class*="-active"]) { opacity: 0.6}',
      /* Active service icons - enhanced brightness & full saturation for higher contrast */
      '[class*="-active"] { opacity: 1; filter: brightness(1) saturate(2);}',
      /* Dark theme inactive - even more reduced for visibility */
      '[wz-theme="dark"] [class^="serv-"]:not([class*="-active"]) { filter: brightness(5) saturate(1); }',
      /* Dark theme active - enhanced for visibility */
      '[wz-theme="dark"] [class*="-active"] { filter: brightness(1) saturate(1); }', //filter: brightness(1.8) saturate(1.3);
    ];
    $('head').append($('<style>', { type: 'text/css' }).html(cssArray.join('\n')));
  }

  function onVenuesChanged(venueProxies) {
    deleteDupeLabel();
    _previousVenueServices = null; // Reset when venue selection changes

    const venue = getSelectedVenue();
    if (venueProxies.map((proxy) => proxy.id).includes(venue?.id)) {
      if ($('#WMEPH_banner').length && venue?.id && !_isHarmonizing) {
        // Compare current services with previous state to detect services-only changes
        const currentServices = JSON.stringify((venue.services || []).sort());
        const isServicesOnlyChange = _previousVenueServices !== null && _previousVenueServices === currentServices;

        // Skip harmonization if ONLY services changed (UI sync handles it)
        if (!isServicesOnlyChange) {
          // Auto-harmonize when venue with banner is modified (but not if already harmonizing)
          harmonizePlaceGo(venue, 'harmonize');
          // Refresh all highlights to sync layer features with updated venue properties
          refreshAllHighlights();
        } else if (_previousVenueServices !== null) {
          // Log for dev visibility
          logDev('Skipped full re-run — services UI sync only');
        }

        // Update tracker for next change
        _previousVenueServices = currentServices;
      }

      updateWmephPanel();
    }
  }

  // This should be called after new venues are saved (using venues'objectssynced' event), so the new IDs can be retrieved and used
  // to replace the temporary IDs in the whitelist.  If WME errors during save, this function may not run.  At that point, the
  // temporary IDs can no longer be traced to the new IDs so the WL for those new venues will be orphaned, and the temporary IDs
  // will be removed from the WL store the next time the script starts.
  function syncWL(newVenues) {
    newVenues.forEach((newVenue) => {
      const oldID = newVenue._prevID;
      const newID = newVenue.id;
      if (oldID && newID && _venueWhitelist[oldID]) {
        _venueWhitelist[newID] = _venueWhitelist[oldID];
        delete _venueWhitelist[oldID];
      }
    });
    saveWhitelistToLS(true);
  }

  // Mutable state for X-ray mode (used by predicate in venues layer styling)
  // Stores original layer states before X-ray modifications
  const xrayState = {
    enabled: false,
    savedLayerStates: new Map()  // Stores original visibility/opacity of each layer
  };

  // Map layer names to their DOM IDs for state querying
  const layerDomIdMap = {
    'Roads': 'layer-switcher-item_road',
    'Paths': 'layer-switcher-item_paths',
    'JunctionBoxes': 'layer-switcher-item_junction_boxes',
    'Hazards': 'layer-switcher-item_hazards',
    'Closures': 'layer-switcher-item_closures',
    'HouseNumbers': 'layer-switcher-item_house_numbers'
  };

  function getLayerCheckboxState(layerName) {
    const domId = layerDomIdMap[layerName];
    if (!domId) return true;  // Default to visible if not found
    const checkbox = document.getElementById(domId);
    return checkbox?.hasAttribute('checked') ?? true;
  }

  // NOTE: House Numbers layer does not have an SDK setter (setHouseNumbersLayerCheckboxChecked doesn't exist)
  // So we toggle it via DOM manipulation instead. If SDK adds support later, replace this with the setter.
  function toggleLayerCheckboxViaDOM(layerName, isChecked) {
    const domId = layerDomIdMap[layerName];
    if (!domId) return false;
    const checkbox = document.getElementById(domId);
    if (!checkbox) return false;

    const shouldBeChecked = isChecked;
    const isCurrentlyChecked = checkbox.hasAttribute('checked');

    if (shouldBeChecked !== isCurrentlyChecked) {
      checkbox.click();  // Toggle by clicking
    }
    return true;
  }

  function toggleXrayMode(enable) {
    const layersToControl = [
      { name: 'Roads', setter: 'setRoadsLayerCheckboxChecked' },
      { name: 'Paths', setter: 'setPathsLayerCheckboxChecked' },
      { name: 'JunctionBoxes', setter: 'setJunctionBoxesLayerCheckboxChecked' },
      { name: 'Hazards', setter: 'setHazardsLayerCheckboxChecked' },
      { name: 'Closures', setter: 'setClosuresLayerCheckboxChecked' },
      { name: 'HouseNumbers', setter: 'setHouseNumbersLayerCheckboxChecked' },
    ];

    const xrayEnabled = enable;
    xrayState.enabled = enable;  // Update mutable state for predicate

    if (xrayEnabled) {
      // ENABLE X-RAY: Save current states, then hide layers
      logDev('X-Ray: Saving layer states and enabling X-ray mode');

      layersToControl.forEach((layer) => {
        try {
          // Query actual DOM state before hiding
          const isChecked = getLayerCheckboxState(layer.name);
          xrayState.savedLayerStates.set(layer.name, isChecked);
          logDev(`X-Ray: Saved ${layer.name} state: ${isChecked}`);

          // House Numbers doesn't have an SDK setter, use DOM toggle instead
          if (layer.name === 'HouseNumbers') {
            toggleLayerCheckboxViaDOM(layer.name, false);
            logDev(`X-Ray: Hid ${layer.name} layer (via DOM)`);
          } else {
            sdk.LayerSwitcher[layer.setter]({ isChecked: false });
            logDev(`X-Ray: Hid ${layer.name} layer`);
          }
        } catch (e) {
          logDev(`X-Ray: Could not hide ${layer.name} layer:`, e);
        }
      });

      // Save and reduce venues layer opacity
      try {
        const currentOpacity = sdk.Map.getLayerOpacity({ layerName: 'venues' });
        xrayState.savedLayerStates.set('venues', currentOpacity);
        logDev(`X-Ray: Saved venues opacity: ${currentOpacity}`);

        sdk.Map.addStyleRuleToLayer({
          layerName: 'venues',
          styleRules: [{
            predicate: () => xrayState.enabled,  // Only apply when X-ray is enabled
            style: { fillOpacity: 0.1, strokeOpacity: 0.1 }
          }]
        });
        redrawLayer('venues');
        logDev('X-Ray: Reduced venues layer opacity');
      } catch (e) {
        logDev('X-Ray: Could not update venues layer:', e);
      }

      redrawLayer(_dupeLayer);
    } else {
      // DISABLE X-RAY: Restore saved states
      logDev('X-Ray: Restoring saved layer states');

      layersToControl.forEach((layer) => {
        try {
          const savedVisibility = xrayState.savedLayerStates.get(layer.name) ?? true;

          // House Numbers doesn't have an SDK setter, use DOM toggle instead
          if (layer.name === 'HouseNumbers') {
            toggleLayerCheckboxViaDOM(layer.name, savedVisibility);
            logDev(`X-Ray: Restored ${layer.name} to ${savedVisibility} (via DOM)`);
          } else {
            sdk.LayerSwitcher[layer.setter]({ isChecked: savedVisibility });
            logDev(`X-Ray: Restored ${layer.name} to ${savedVisibility}`);
          }
        } catch (e) {
          logDev(`X-Ray: Could not restore ${layer.name} layer:`, e);
        }
      });

      // Restore venues layer (predicate will handle it since xrayState.enabled is now false)
      try {
        redrawLayer('venues');
        logDev('X-Ray: Restored venues layer');
      } catch (e) {
        logDev('X-Ray: Could not restore venues layer:', e);
      }
    }
  }

  /**
   * Applies highlighting to venues based on harmonization results and cache state.
   * Sets wmephSeverity on each venue; clears and rebuilds color highlight layer features.
   * Respects rank lock filtering and current UI checkbox states (ColorHighlighting, PLATypeFill, ShowFilterHighlight).
   * Trims results cache if it exceeds MAX_CACHE_SIZE.
   * @param {Array|Object} venues - Single venue or array of venues to highlight
   * @param {boolean} force - If true, bypass cache and recalculate severity for all venues
   */
  function applyHighlightsTest(venues, force) {
    if (!_layer) return;

    // Don't highlight if WME Venues layer is hidden
    if (!sdk.Map.isLayerVisible({ layerName: 'venues' })) {
      return;
    }

    // Make sure venues is an array, or convert it to one if not.
    if (venues) {
      if (!Array.isArray(venues)) {
        venues = [venues];
      }
    } else {
      venues = [];
    }

    const storedBannServ = _servicesBanner;
    const storedBannButt2 = _buttonBanner2;
    const t0 = performance.now();
    const doHighlight = $('#WMEPH-ColorHighlighting').prop('checked');
    const disableRankHL = $('#WMEPH-DisableRankHL').prop('checked');

    // Clear layer once at the beginning if needed
    const shouldRefreshLayer = doHighlight || $('#WMEPH-PLATypeFill').prop('checked') || $('#WMEPH-ShowFilterHighlight').prop('checked');
    if (shouldRefreshLayer) {
      try {
        sdk.Map.removeAllFeaturesFromLayer({ layerName: _layer });
      } catch (e) {
        logDev('Error clearing highlights layer:', e);
      }
    }

    const colorFeaturesToAdd = [];
    venues.forEach((venue) => {
      if (venue && venue.id) {
        // Don't artificially add PARKING_LOT category based on services
        // Only venues that actually have PARKING_LOT as their primary category should be treated as parking lots

        // Highlighting logic would go here
        // Severity can be: 0, 'lock', 1, 2, 3, 4, or 'high'. Set to
        // anything else to use default WME style.
        if (doHighlight && !(disableRankHL && venue.lockRank > USER.rank - 1)) {
          try {
            const id = venue.id;
            let severity;
            let cachedResult;
            // eslint-disable-next-line no-cond-assign
            if (force || (cachedResult = _resultsCache[id]) === undefined || venue.updatedOn > cachedResult.u) {
              severity = harmonizePlaceGo(venue, 'highlight', undefined, false); // false = cache miss
              addToResultsCache(id, { s: severity, u: venue.updatedOn || -1 });
            } else {
              severity = cachedResult.s;
              wmephStats.cacheHits++; // Direct cache hit (no harmonizePlaceGo call)
            }
            venue.wmephSeverity = severity;
            venue.wmephParkingType = sdk.DataModel.Venues.ParkingLot.getParkingLotType({ venueId: venue.id }) || null;

            // Add color feature to layer for visualization
            if (venue.geometry && severity !== undefined) {
              colorFeaturesToAdd.push({
                type: 'Feature',
                id: `color_${venue.id}`,
                geometry: venue.geometry,
                properties: {
                  wmephSeverity: severity,
                  venueId: venue.id,
                  name: venue.name,
                  isPoint: venue.geometry?.type === 'Point',
                  isResidential: venue.residential === true || venue.categories?.includes('RESIDENTIAL'),
                },
              });
            }
          } catch (err) {
            logDev('highlight error:', err);
          }
        } else {
          venue.wmephSeverity = 'default';
          venue.wmephParkingType = null;
        }
      }
    });

    // Add color highlight features to layer
    if (colorFeaturesToAdd.length > 0) {
      try {
        colorFeaturesToAdd.forEach((feature) => {
          sdk.Map.addFeatureToLayer({
            layerName: _layer,
            feature: feature,
          });
        });
      } catch (e) {
        logDev('Error adding color highlights:', e);
      }
    }

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
      venue.wmephSeverity = harmonizePlaceGo(venue, 'highlight');
      _servicesBanner = storedBannServ;
      _buttonBanner2 = storedBannButt2;
    }
  }

  /**
   * Sets up SDK event listeners for the color highlights system.
   * Listens for venue data changes, additions, removals, map zoom, and map movement.
   * Triggers refreshAllHighlights() on each event (with harmonization state check for data-changed events).
   */
  function bootstrapWmephColorHighlights() {
    // Listen for venue data changes (when existing venues are modified)
    sdk.Events.on({
      eventName: 'wme-data-model-objects-changed',
      eventHandler: () => {
        errorHandler(() => {
          // Only refresh highlights if not currently harmonizing (avoid clearing cache during harmonization)
          // harmonizePlaceGo will handle cache clearing and refresh for its own venue
          if (!_isHarmonizing && !_disableHighlightTest) {
            refreshAllHighlights();
          }
        });
      },
    });

    // Listen for new venues being added
    sdk.Events.on({
      eventName: 'wme-data-model-objects-added',
      eventHandler: () => {
        refreshAllHighlights();
      },
    });

    // Listen for venues being removed
    sdk.Events.on({
      eventName: 'wme-data-model-objects-removed',
      eventHandler: () => {
        refreshAllHighlights();
      },
    });

    // Listen for map zoom changes to refresh highlights for newly visible venues
    sdk.Events.on({
      eventName: 'wme-map-zoom-changed',
      eventHandler: () => {
        refreshAllHighlights();
      },
    });

    // Listen for map movement to refresh highlights for newly visible venues
    sdk.Events.on({
      eventName: 'wme-map-move-end',
      eventHandler: () => {
        refreshAllHighlights();
      },
    });

    // Rebuild all highlights based on current checkbox states
    refreshAllHighlights();
  }

  /**
   * Converts string to title case (first letter uppercase, rest lowercase).
   * Special handling for single-letter abbreviations and common short words.
   * @param {string} str - String to convert to title case
   * @returns {string} Title-cased string, or original value if null/empty
   */
  function titleCase(str) {
    if (!str) {
      return str;
    }
    str = str.trim();
    const parensParts = str.match(/\(.*?\)/g);
    if (parensParts) {
      for (let i = 0; i < parensParts.length; i++) {
        str = str.replace(parensParts[i], `%${i}%`);
      }
    }

    // Get indexes of Mac followed by a cap, as in MacMillan.
    const macIndexes = [];
    const macRegex = /\bMac[A-Z]/g;
    let macMatch;
    // eslint-disable-next-line no-cond-assign
    while ((macMatch = macRegex.exec(str)) !== null) {
      macIndexes.push(macMatch.index);
    }

    const allCaps = str === str.toUpperCase();
    // Cap first letter of each word
    str = str
      .replace(/([A-Za-z\u00C0-\u017F][^\s-/]*) */g, (txt) => {
        // If first letter is lower case, followed by a cap, then another lower case letter... ignore it.  Example: iPhone
        if (/^[a-z][A-Z0-9][a-z]/.test(txt)) {
          return txt;
        }
        // If word starts with De/Le/La followed by uppercase then lower case, is 5+ characters long... assume it should be like "DeBerry".
        if (/^([dDlL]e|[lL]a)[A-Z][a-zA-Z\u00C0-\u017F]{2,}/.test(txt)) {
          return txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase() + txt.charAt(2) + txt.substr(3).toLowerCase();
        }
        return txt === txt.toUpperCase() && !allCaps ? txt : txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      })
      // Cap O'Reilley's, L'Amour, D'Artagnan as long as 5+ letters
      .replace(/\b[oOlLdD]'[A-Za-z']{3,}/g, (txt) =>
        txt === txt.toUpperCase() && !allCaps ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1) + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase(),
      )
      // Cap McFarley's, as long as 5+ letters long
      .replace(/\b[mM][cC][A-Za-z']{3,}/g, (txt) =>
        txt === txt.toUpperCase() && !allCaps ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase() + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase(),
      )
      // anything with an "&" sign, cap the word after &
      .replace(/&\w+/g, (txt) => (txt === txt.toUpperCase() && !allCaps ? txt : txt.charAt(0) + txt.charAt(1).toUpperCase() + txt.substr(2)))
      // lowercase any from the ignoreWords list
      .replace(/[^ ]+/g, (txt) => {
        const txtLC = txt.toLowerCase();
        return TITLECASE_SETTINGS.ignoreWords.includes(txtLC) ? txtLC : txt;
      })
      // uppercase any from the capWords List
      .replace(/[^ ]+/g, (txt) => {
        const txtLC = txt.toUpperCase();
        return TITLECASE_SETTINGS.capWords.includes(txtLC) ? txtLC : txt;
      })
      // preserve any specific words
      .replace(/[^ ]+/g, (txt) => {
        const txtUC = txt.toUpperCase();
        return TITLECASE_SETTINGS.specWords.find((specWord) => specWord.toUpperCase() === txtUC) || txt;
      })
      // Fix 1st, 2nd, 3rd, 4th, etc.
      .replace(/\b(\d*1)st\b/gi, '$1st')
      .replace(/\b(\d*2)nd\b/gi, '$1nd')
      .replace(/\b(\d*3)rd\b/gi, '$1rd')
      .replace(/\b(\d+)th\b/gi, '$1th');

    // Cap first letter of entire name if it's not something like iPhone or eWhatever.
    if (!/^[a-z][A-Z0-9][a-z]/.test(str)) str = str.charAt(0).toUpperCase() + str.substr(1);
    if (parensParts) {
      for (let i = 0, len = parensParts.length; i < len; i++) {
        str = str.replace(`%${i}%`, parensParts[i]);
      }
    }

    // Fix any Mac... words.
    macIndexes.forEach((idx) => {
      str = str.substr(0, idx + 3) + str.substr(idx + 3, 1).toUpperCase() + str.substr(idx + 4);
    });

    return str;
  }

  /**
   * Normalizes and validates phone numbers (USA/CAN specific).
   * Removes formatting, validates area/exchange codes, strips leading 1, and handles extensions.
   * @param {string} s - Phone number string to normalize
   * @param {string} [outputFormat] - Optional output format preference
   * @returns {string} Normalized phone number, or original input if null/empty, or BAD_PHONE if invalid
   */
  function normalizePhone(s, outputFormat) {
    if (isNullOrWhitespace(s)) return s;
    s = s.replace(/(\d{3}.*[0-9A-Z]{4})\W+(?:extension|ext|xt|x).*/i, '$1');
    let s1 = s.replace(/\D/g, ''); // remove non-number characters

    // Ignore leading 1, and also don't allow area code or exchange to start with 0 or 1 (***USA/CAN specific)
    let m = s1.match(/^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/);

    if (!m) {
      // then try alphanumeric matching
      if (s) {
        s = s.toUpperCase();
      }
      s1 = s
        .replace(/[^0-9A-Z]/g, '')
        .replace(/^\D*(\d)/, '$1')
        .replace(/^1?([2-9][0-9]{2}[0-9A-Z]{7,10})/g, '$1');
      s1 = replaceLetters(s1);

      // Ignore leading 1, and also don't allow area code or exchange to start with 0 or 1 (***USA/CAN specific)
      m = s1.match(/^([2-9]\d{2})([2-9]\d{2})(\d{4})(?:.{0,3})$/);

      if (!m) {
        return BAD_PHONE;
      }
    }
    return phoneFormat(outputFormat, m[1], m[2], m[3]);
  }

  // Alphanumeric phone conversion
  function replaceLetters(number) {
    const conversionMap = _({
      2: /A|B|C/,
      3: /D|E|F/,
      4: /G|H|I/,
      5: /J|K|L/,
      6: /M|N|O/,
      7: /P|Q|R|S/,
      8: /T|U|V/,
      9: /W|X|Y|Z/,
    });
    number = typeof number === 'string' ? number.toUpperCase() : '';
    return number.replace(/[A-Z]/g, (letter) => conversionMap.findKey((re) => re.test(letter)));
  }

  /**
   * Executes multi-action updates. Currently a stub; changes accumulate as unsaved via SDK.
   * User commits changes via WME Save button.
   */
  function executeMultiAction() {
    // Changes accumulate as unsaved; user commits via WME Save button
  }

  /**
   * Splits a place name into base and suffix/localizer parts.
   * Suffix is anything after whitespace followed by dash or en-dash, e.g., "SUBWAY - inside Walmart" → base: "SUBWAY", suffix: " - inside Walmart".
   * @param {string} name - The place name to split
   * @returns {Object} Object with { base: string, suffix: string }; both empty strings if name is falsy
   */
  function getNameParts(name) {
    if (!name) return { base: '', suffix: '' };
    const splits = name.match(/(.*?)(\s+[-(–].*)*$/);
    return { base: splits[1], suffix: splits[2] };
  }

  /**
   * Updates a venue with new attributes via SDK, marks changed fields in UPDATED_FIELDS.
   * Optionally runs harmonizer after update (asynchronous via setTimeout) and refreshes the WMEPH panel.
   * Changes accumulate as unsaved; user commits via WME Save button.
   * @param {Object} venue - The venue object to update
   * @param {Object} newAttributes - Object containing attributes to update
   * @param {Array} _actions - Actions array (used to check for existing services updates)
   * @param {boolean} [runHarmonizer=false] - If true, run harmonizePlaceGo after update
   * @param {boolean} [dontHighlightFields=false] - If true, skip field-change tracking in UPDATED_FIELDS
   */
  function addUpdateAction(venue, newAttributes, _actions, runHarmonizer = false, dontHighlightFields = false) {
    if (Object.keys(newAttributes).length) {
      if (!dontHighlightFields) {
        UPDATED_FIELDS.checkNewAttributes(newAttributes, venue);
      }

      // SDK tracks changes as unsaved; no immediate save needed
      try {
        // SDK updateVenue supports all attributes including lockRank
        const updateableAttributes = { ...newAttributes };

        if (Object.keys(updateableAttributes).length > 0) {
          sdk.DataModel.Venues.updateVenue({ venueId: venue.id, ...updateableAttributes });
          logDev(`Updated venue ${venue.id} with:`, updateableAttributes);
        }
        // Changes accumulate for user to save via WME Save button
      } catch (e) {
        logDev('addUpdateAction: Failed to update venue', venue.id, newAttributes, e);
      }
    }
    if (runHarmonizer) {
      setTimeout(() => {
        // Get fresh venue object to ensure updated attributes are reflected
        const freshVenue = sdk.DataModel.Venues.getById({ venueId: venue.id });
        if (freshVenue) {
          harmonizePlaceGo(freshVenue, 'harmonize');
        }
        updateWmephPanel(); // Refresh banner to reflect changes
      }, 0);
    }
  }

  /**
   * Toggles a service checkbox for a venue. Adds or removes service from venue.services array.
   * If checked state differs from UI, marks field as updated via UPDATED_FIELDS.
   * Calls addUpdateAction to persist the service change.
   * @param {Object} servBtn - Service button object with servIDIndex and checked state
   * @param {boolean} [checked] - Desired checked state; if undefined, toggles current state
   * @param {Array} actions - Actions array to check for existing service updates
   */
  function setServiceChecked(servBtn, checked, actions) {
    const servID = WME_SERVICES_ARRAY[servBtn.servIDIndex];
    const checkboxChecked = $(`wz-checkbox[value="${servID}"]`).prop('checked');
    const venue = getSelectedVenue();

    if (checkboxChecked !== checked && UPDATED_FIELDS[`services_${servID}`]) {
      UPDATED_FIELDS[`services_${servID}`].updated = true;
    }
    const toggle = typeof checked === 'undefined';
    let noAdd = false;
    checked = toggle ? !servBtn.checked : checked;
    if (checkboxChecked === servBtn.checked && checkboxChecked !== checked) {
      servBtn.checked = checked;
      let services;
      if (actions) {
        for (let i = 0; i < actions.length; i++) {
          const existingAction = actions[i];
          if (existingAction.newAttributes && existingAction.newAttributes.services) {
            ({ services } = existingAction.newAttributes);
          }
        }
      }
      if (!services) {
        services = venue.services.slice();
      } else {
        noAdd = services.includes(servID);
      }
      if (checked) {
        services.push(servID);
      } else {
        const index = services.indexOf(servID);
        if (index > -1) {
          services.splice(index, 1);
        }
      }
      if (!noAdd) {
        addUpdateAction(venue, { services }, actions);
      }
    }
    updateServicesChecks(_servicesBanner);
    if (!toggle) servBtn.active = checked;
  }

  /**
   * Normalizes URLs by removing formatting, protocols, and redundant paths.
   * Removes parenthetical content, spaces, http:// prefix, and common default pages.
   * @param {string} url - URL string to normalize
   * @param {boolean} [makeLowerCase=true] - If true, lowercase entire domain; if false, only lowercase www and .com
   * @returns {string} Normalized URL, or BAD_URL constant if validation fails
   */
  function normalizeURL(url, makeLowerCase = true) {
    if (!url?.trim().length) {
      return url;
    }

    url = url.replace(/ \(.*/g, ''); // remove anything with parentheses after it
    url = url.replace(/ /g, ''); // remove any spaces
    let m = url.match(/^http:\/\/(.*)$/i); // remove http://
    if (m) {
      [, url] = m;
    }
    if (makeLowerCase) {
      // lowercase the entire domain
      url = url.replace(/[^/]+/i, (txt) => (txt === txt.toLowerCase() ? txt : txt.toLowerCase()));
    } else {
      // lowercase only the www and com
      url = url.replace(/www\./i, 'www.');
      url = url.replace(/\.com/i, '.com');
    }
    m = url.match(/^(.*)\/pages\/welcome.aspx$/i); // remove unneeded terms
    if (m) {
      [, url] = m;
    }
    m = url.match(/^(.*)\/pages\/default.aspx$/i); // remove unneeded terms
    if (m) {
      [, url] = m;
    }
    m = url.match(/^(.*)\/$/i); // remove final slash
    if (m) {
      [, url] = m;
    }
    if (!url || url.trim().length === 0 || !/(^https?:\/\/)?\w+\.\w+/.test(url)) url = BAD_URL;
    return url;
  }

  /**
   * Main entry point for place harmonization.
   * Runs Place Name Harmonization checks and actions on the currently selected venue.
   * Validates beta version access, checks for disabled categories, and processes all harmonization rules.
   * @returns {void} Updates are applied directly to the venue via harmonizePlaceGo()
   */
  function harmonizePlace() {
    logDev('harmonizePlace');
    // Beta version for approved users only
    if (IS_BETA_VERSION && !USER.isBetaUser) {
      WazeWrap.Alerts.error(SCRIPT_NAME, 'Please sign up to beta-test this script version.<br>Contact MapOMatic or Tonestertm in Discord, or post in the WMEPH forum thread. Thanks.');
      return;
    }
    // Only run if a single place is selected
    const venue = getSelectedVenue();
    if (venue) {
      UPDATED_FIELDS.reset();
      blurAll(); // focus away from current cursor position
      _disableHighlightTest = true;
      harmonizePlaceGo(venue, 'harmonize');
      _disableHighlightTest = false;
      refreshAllHighlights();
    } else {
      // Remove duplicate labels
      destroyDupeLabels();
    }
  }

  /**
   * Returns configuration for service action buttons in the WMEPH banner.
   * Each service button has: active (enabled in UI), checked (service exists on venue),
   * icon (CSS class name), value (text), title (tooltip), action (click handler),
   * actionOn/actionOff (convenience methods).
   * @returns {Object} Object mapping service names (addValet, addDriveThru, etc.) to button configs
   */
  function getServicesBanner() {
    return {
      addValet: {
        active: true,
        checked: false,
        icon: 'serv-valet',
        w2hratio: 50 / 50,
        value: 'Valet',
        title: 'Valet service',
        serviceId: 'VALLET_SERVICE',
        servIDIndex: 0,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addDriveThru: {
        active: true,
        checked: false,
        icon: 'serv-drivethru',
        w2hratio: 78 / 50,
        value: 'DriveThru',
        title: 'Drive-thru',
        serviceId: 'DRIVETHROUGH',
        servIDIndex: 1,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addWiFi: {
        active: true,
        checked: false,
        icon: 'serv-wifi',
        w2hratio: 67 / 50,
        value: 'WiFi',
        title: 'Wi-Fi',
        serviceId: 'WI_FI',
        servIDIndex: 2,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addRestrooms: {
        active: true,
        checked: false,
        icon: 'serv-restrooms',
        w2hratio: 49 / 50,
        value: 'Restroom',
        title: 'Restrooms',
        serviceId: 'RESTROOMS',
        servIDIndex: 3,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addCreditCards: {
        active: true,
        checked: false,
        icon: 'serv-credit',
        w2hratio: 73 / 50,
        value: 'CC',
        title: 'Accepts credit cards',
        serviceId: 'CREDIT_CARDS',
        servIDIndex: 4,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addReservations: {
        active: true,
        checked: false,
        icon: 'serv-reservations',
        w2hratio: 55 / 50,
        value: 'Reserve',
        title: 'Reservations',
        serviceId: 'RESERVATIONS',
        servIDIndex: 5,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addOutside: {
        active: true,
        checked: false,
        icon: 'serv-outdoor',
        w2hratio: 73 / 50,
        value: 'OusideSeat',
        title: 'Outdoor seating',
        serviceId: 'OUTSIDE_SEATING',
        servIDIndex: 6,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addAC: {
        active: true,
        checked: false,
        icon: 'serv-ac',
        w2hratio: 50 / 50,
        value: 'AC',
        title: 'Air conditioning',
        serviceId: 'AIR_CONDITIONING',
        servIDIndex: 7,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addParking: {
        active: true,
        checked: false,
        icon: 'serv-parking',
        w2hratio: 46 / 50,
        value: 'Customer parking',
        title: 'Parking',
        serviceId: 'PARKING_FOR_CUSTOMERS',
        servIDIndex: 8,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addDeliveries: {
        active: true,
        checked: false,
        icon: 'serv-deliveries',
        w2hratio: 86 / 50,
        value: 'Delivery',
        title: 'Deliveries',
        serviceId: 'DELIVERIES',
        servIDIndex: 9,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addTakeAway: {
        active: true,
        checked: false,
        icon: 'serv-takeaway',
        w2hratio: 34 / 50,
        value: 'Take-out',
        title: 'Take-out',
        serviceId: 'TAKE_AWAY',
        servIDIndex: 10,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addCurbside: {
        active: true,
        checked: false,
        icon: 'serv-curbside',
        w2hratio: 50 / 50,
        value: 'Curbside pickup',
        title: 'Curbside pickup',
        serviceId: 'CURBSIDE_PICKUP',
        servIDIndex: 11,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addWheelchair: {
        active: true,
        checked: false,
        icon: 'serv-wheelchair',
        w2hratio: 50 / 50,
        value: 'WhCh',
        title: 'Wheelchair accessible',
        serviceId: 'WHEELCHAIR_ACCESSIBLE',
        servIDIndex: 12,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addDisabilityParking: {
        active: true,
        checked: false,
        icon: 'serv-wheelchair',
        w2hratio: 50 / 50,
        value: 'DisabilityParking',
        title: 'Disability parking',
        serviceId: 'DISABILITY_PARKING',
        servIDIndex: 17,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addAirportShuttle: {
        active: true,
        checked: false,
        icon: 'serv-airportshuttle',
        w2hratio: 50 / 50,
        value: 'Airport shuttle',
        title: 'Airport shuttle',
        serviceId: 'AIRPORT_SHUTTLE',
        servIDIndex: 13,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addCarWash: {
        active: true,
        checked: false,
        icon: 'serv-carwash',
        w2hratio: 50 / 50,
        value: 'Car wash',
        title: 'Car wash',
        serviceId: 'CAR_WASH',
        servIDIndex: 14,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addCarpoolParking: {
        active: true,
        checked: false,
        icon: 'serv-carpool',
        w2hratio: 50 / 50,
        value: 'Carpool parking',
        title: 'Carpool parking',
        serviceId: 'CARPOOL_PARKING',
        servIDIndex: 15,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addCovered: {
        active: true,
        checked: false,
        icon: 'serv-covered',
        w2hratio: 50 / 50,
        value: 'Covered parking',
        title: 'Covered parking',
        serviceId: 'COVERED',
        servIDIndex: 16,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addEVChargingStation: {
        active: true,
        checked: false,
        icon: 'serv-ev',
        w2hratio: 50 / 50,
        value: 'EV charging',
        title: 'EV charging station',
        serviceId: 'EV_CHARGING_STATION',
        servIDIndex: 18,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addOnSiteAttendant: {
        active: true,
        checked: false,
        icon: 'serv-attendant',
        w2hratio: 50 / 50,
        value: 'On-site attendant',
        title: 'On-site attendant',
        serviceId: 'ON_SITE_ATTENDANT',
        servIDIndex: 19,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addParkAndRide: {
        active: true,
        checked: false,
        icon: 'serv-parkandride',
        w2hratio: 50 / 50,
        value: 'Park and ride',
        title: 'Park and ride',
        serviceId: 'PARK_AND_RIDE',
        servIDIndex: 20,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addSecurity: {
        active: true,
        checked: false,
        icon: 'serv-security',
        w2hratio: 50 / 50,
        value: 'Security',
        title: 'Security',
        serviceId: 'SECURITY',
        servIDIndex: 22,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addReservationsPL: {
        active: true,
        checked: false,
        icon: 'serv-reservations',
        w2hratio: 55 / 50,
        value: 'Reserve',
        title: 'Reservations accepted (Parking Lot)',
        serviceId: 'RESERVATIONS',
        servIDIndex: 21,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addValetPL: {
        active: true,
        checked: false,
        icon: 'serv-valet',
        w2hratio: 50 / 50,
        value: 'Valet',
        title: 'Valet parking (Parking Lot)',
        serviceId: 'VALET',
        servIDIndex: 23,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      addValletServicePL: {
        active: true,
        checked: false,
        icon: 'serv-valet-service',
        w2hratio: 50 / 50,
        value: 'Vallet',
        title: 'Vallet service (Parking Lot)',
        serviceId: 'VALLET_SERVICE',
        servIDIndex: 24,
        action(actions, checked) {
          setServiceChecked(this, checked, actions);
        },
        pnhOverride: false,
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
      add247: {
        active: true,
        checked: false,
        icon: 'serv-247',
        w2hratio: 73 / 50,
        value: '247',
        title: 'Hours: Open 24/7',
        action(actions, checked) {
          const toggle = typeof checked === 'undefined';
          const venue = getSelectedVenue();
          checked = toggle ? !_servicesBanner.add247.checked : checked;

          if (checked) {
            addUpdateAction(venue, { openingHours: [new OpeningHour({ days: [1, 2, 3, 4, 5, 6, 0], fromHour: '00:00', toHour: '00:00' })] }, actions);
          } else {
            addUpdateAction(venue, { openingHours: [] }, actions);
          }
        },
        actionOn(actions) {
          this.action(actions, true);
        },
        actionOff(actions) {
          this.action(actions, false);
        },
      },
    };
  } // END getServicesBanner()

  /**
   * Returns configuration for utility action buttons in the WMEPH banner (wiki links, whitelist management, etc.).
   * Each button has: active (enabled in UI), severity (highlighting level), message (status text),
   * value (button text), title (tooltip), and action (click handler).
   * @param {Object} venue - The currently selected venue (used for whitelist operations)
   * @param {Object} placePL - Place page info (for generating links or context)
   * @returns {Object} Object mapping button names (placesWiki, restAreaWiki, clearWL, etc.) to button configs
   */
  function getButtonBanner2(venue, placePL) {
    return {
      placesWiki: {
        active: true,
        severity: 0,
        message: '',
        value: 'Places wiki',
        title: 'Open the places Wazeopedia (wiki) page',
        action() {
          window.open(URLS.placesWiki);
        },
      },
      restAreaWiki: {
        active: true,
        severity: 0,
        message: '',
        value: 'Rest Area wiki',
        title: 'Open the Rest Area wiki page',
        action() {
          window.open(URLS.restAreaWiki);
        },
      },
      clearWL: {
        active: true,
        severity: 0,
        message: '',
        value: 'Clear place whitelist',
        title: 'Clear all Whitelisted fields for this place',
        action() {
          WazeWrap.Alerts.confirm(
            SCRIPT_NAME,
            'Are you sure you want to clear all whitelisted fields for this place?',
            () => {
              delete _venueWhitelist[venue.id];
              // Remove venue from the results cache so it can be updated again.
              delete _resultsCache[venue.id];
              saveWhitelistToLS(true);
              harmonizePlaceGo(venue, 'harmonize');
            },
            () => {},
            'Yes',
            'No',
          );
        },
      },
      //PlaceErrorForumPost: {
      //    active: true,
      //    severity: 0,
      //    message: '',
      //    value: 'Report script error',
      //    title: 'Report a script error',
      //    action() {
      //        window.open(URLS.forum, '_blank');
      //    }
      //}
    };
  } // END getButtonBanner2()

  /**
   * Core implementation of place harmonization. Validates venue data against PNH database,
   * applies harmonization rules (names, categories, services, hours, contact info), evaluates
   * all Flag conditions, and updates venue via SDK. Supports two modes: full harmonization
   * (useFlag='harmonize') or highlight-only (for performance). Prevents recursive harmonization
   * via _isHarmonizing flag. Cache is cleared for harmonized venues; results are cached for highlighting.
   * @param {Object} venue - The venue object to harmonize
   * @param {string} useFlag - Mode flag: 'harmonize' for full update, 'highlight' for severity-only
   * @param {Array} [actions] - Optional array to collect venue update actions
   * @returns {string|undefined} Severity value (for highlight-only mode) or undefined (for full harmonization)
   */
  function harmonizePlaceGo_impl(venue, useFlag, actions) {
    if (useFlag === 'harmonize') logDev('harmonizePlaceGo: useFlag="harmonize"');

    const venueID = venue.id;

    // Used for collecting all actions to be applied to the model.
    actions = actions || [];

    // Prevent recursive harmonization when venue data changes during harmonization
    const wasHarmonizing = _isHarmonizing;
    _isHarmonizing = true;

    try {
      FlagBase.currentFlags = new FlagContainer();
      const args = new HarmonizationArgs(venue, actions, !useFlag.includes('harmonize'));

      let pnhLockLevel;
      if (!args.highlightOnly) {
        // Get permalink for form submissions (Canada/Quebec only)
        args.placePL = sdk.Map.getPermalink({ includeLayers: false });

        _buttonBanner2 = getButtonBanner2(venue, args.placePL);
        _servicesBanner = getServicesBanner();

        // Update icons to reflect current WME place services
        updateServicesChecks(_servicesBanner);

        // Setting switch for the Places Wiki button
        if ($('#WMEPH-HidePlacesWiki').prop('checked')) {
          _buttonBanner2.placesWiki.active = false;
        }

        // NOTE: PlaceErrorForumPost button is not implemented (commented out in getButtonBanner2),
        // so we don't try to access it

        // reset PNH lock level
        pnhLockLevel = -1;

        // Calculate GPS coordinates early so all downstream code has access
        if (!args.venueGPS) {
          const centroidPt = turf.centroid(venue.geometry);
          args.venueGPS = { longitude: centroidPt.geometry.coordinates[0], latitude: centroidPt.geometry.coordinates[1] };
        }
      }

      // Some user submitted places have no data in the country, state and address fields.
      const result = Flag.FullAddressInference.eval(args);
      if (result?.exit) return result.severity;
      const inferredAddress = result?.inferredAddress;
      args.addr = inferredAddress ?? args.addr;

      // Whitelist breakout if place exists on the Whitelist and the option is enabled
      if (_venueWhitelist.hasOwnProperty(venueID) && (!args.highlightOnly || (args.highlightOnly && !$('#WMEPH-DisableWLHL').prop('checked')))) {
        // Enable the clear WL button if any property is true
        Object.keys(_venueWhitelist[venueID]).forEach((wlKey) => {
          // loop thru the venue WL keys
          if (_venueWhitelist[venueID].hasOwnProperty(wlKey) && (_venueWhitelist[venueID][wlKey].active || false)) {
            if (!args.highlightOnly) _buttonBanner2.clearWL.active = true;
            args.wl[wlKey] = _venueWhitelist[venueID][wlKey];
          }
        });
        if (_venueWhitelist[venueID].hasOwnProperty('dupeWL') && _venueWhitelist[venueID].dupeWL.length > 0) {
          if (!args.highlightOnly) _buttonBanner2.clearWL.active = true;
          args.wl.dupeWL = _venueWhitelist[venueID].dupeWL;
        }
        // Update address info for the place
        if (!args.highlightOnly) {
          _venueWhitelist[venueID].city = args.addr.city?.name; // Store city for the venue
          _venueWhitelist[venueID].state = args.addr.state?.name; // Store state for the venue
          _venueWhitelist[venueID].country = args.addr.country?.name; // Store country for the venue
          _venueWhitelist[venueID].gps = args.venueGPS; // Store GPS coords for the venue (calculated earlier)
        }
      }

      // Country restrictions (note that FullAddressInference should guarantee country/state exist if highlightOnly is true)
      if (!args.addr.country || !args.addr.state) {
        WazeWrap.Alerts.error(SCRIPT_NAME, 'Country and/or state could not be determined.  Edit the place address and run WMEPH again.');
        return undefined;
      }

      const countryName = args.addr.country?.name;
      const stateName = args.addr.state?.name;
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

      args.pnhCategoryInfos = PNH_DATA[args.countryCode].categoryInfos;

      // Parse state-based data
      for (let usdix = 1; usdix < PNH_DATA.states.length; usdix++) {
        _stateDataTemp = PNH_DATA.states[usdix].split('|');
        if (stateName === _stateDataTemp[_psStateIx]) {
          args.state2L = _stateDataTemp[_psState2LetterIx];
          args.regionCode = _stateDataTemp[_psRegionIx];
          args.gFormState = _stateDataTemp[_psGoogleFormStateIx];
          if (_stateDataTemp[_psDefaultLockLevelIx].match(/[1-5]{1}/) !== null) {
            args.defaultLockLevel = _stateDataTemp[_psDefaultLockLevelIx] - 1; // normalize by -1
          } else if (!args.highlightOnly) {
            WazeWrap.Alerts.warning(SCRIPT_NAME, 'Lock level sheet data is not correct');
          } else {
            return 3;
          }
          _areaCodeList = `${_areaCodeList},${_stateDataTemp[_psAreaCodeIx]}`;
          break;
        }
        // If State is not found, then use the country
        if (countryName === _stateDataTemp[_psStateIx]) {
          args.state2L = _stateDataTemp[_psState2LetterIx];
          args.regionCode = _stateDataTemp[_psRegionIx];
          args.gFormState = _stateDataTemp[_psGoogleFormStateIx];
          if (_stateDataTemp[_psDefaultLockLevelIx].match(/[1-5]{1}/) !== null) {
            args.defaultLockLevel = _stateDataTemp[_psDefaultLockLevelIx] - 1; // normalize by -1
          } else if (!args.highlightOnly) {
            WazeWrap.Alerts.warning(SCRIPT_NAME, 'Lock level sheet data is not correct');
          } else {
            return 3;
          }
          _areaCodeList = `${_areaCodeList},${_stateDataTemp[_psAreaCodeIx]}`;
          break;
        }
      }
      if (args.state2L === 'Unknown' || args.regionCode === 'Unknown') {
        // if nothing found:
        if (!args.highlightOnly) {
          WazeWrap.Alerts.error(SCRIPT_NAME, 'WMEPH: Localization Error!');
        }
        return SEVERITY.RED;
      }

      // Gas station treatment (applies to all including PNH)

      if (!args.highlightOnly && args.state2L === 'TN' && args.nameBase.toLowerCase().trim() === 'pilot') {
        // TODO: check what happens here if there's a name suffix.
        args.nameBase = 'Pilot Food Mart';
        addUpdateAction(venue, { name: args.nameBase }, actions);
      }

      // Clear attributes from residential places
      if (venue.residential) {
        if (!args.highlightOnly) {
          if (!$('#WMEPH-AutoLockRPPs').prop('checked')) {
            args.lockOK = false;
          }
          if (venue.name !== '') {
            // Set the residential place name to the address (to clear any personal info)
            logDev('Residential Name reset');
            try {
              actions.push(sdk.DataModel.Venues.updateVenue({ venueId: venue.id, name: '' }));
            } catch (e) {
              if (e.name === 'InvalidStateError') {
                logDev('InvalidStateError updating name - skipping');
              } else throw e;
            }
          }
          args.categories = ['RESIDENCE_HOME'];
          if (venue.description !== null && venue.description !== '') {
            // remove any description
            logDev('Residential description cleared');
            try {
              actions.push(sdk.DataModel.Venues.updateVenue({ venueId: venue.id, description: null }));
            } catch (e) {
              if (e.name === 'InvalidStateError') {
                logDev('InvalidStateError updating description - skipping');
              } else throw e;
            }
          }
          if (venue.phone !== null && venue.phone !== '') {
            // remove any phone info
            logDev('Residential Phone cleared');
            try {
              actions.push(sdk.DataModel.Venues.updateVenue({ venueId: venue.id, phone: null }));
            } catch (e) {
              if (e.name === 'InvalidStateError') {
                logDev('InvalidStateError updating phone - skipping');
              } else throw e;
            }
          }
          if (venue.url !== null && venue.url !== '') {
            // remove any url
            logDev('Residential URL cleared');
            try {
              actions.push(sdk.DataModel.Venues.updateVenue({ venueId: venue.id, url: null }));
            } catch (e) {
              if (e.name === 'InvalidStateError') {
                logDev('InvalidStateError updating url - skipping');
              } else throw e;
            }
          }
          if (venue.services.length > 0) {
            logDev('Residential services cleared');
            try {
              actions.push(sdk.DataModel.Venues.updateVenue({ venueId: venue.id, services: [] }));
            } catch (e) {
              if (e.name === 'InvalidStateError') {
                logDev('InvalidStateError updating services - skipping');
              } else throw e;
            }
          }
        }
      } else if (isVenueParkingLot(venue) || args.nameBase?.trim().length || containsAny(args.categories, ['SEA_LAKE_POOL'])) {
        // for non-residential places
        // Phone formatting
        if (containsAny(['CA', 'CO'], [args.regionCode, args.state2L]) && /^\d{3}-\d{3}-\d{4}$/.test(venue.phone)) {
          args.outputPhoneFormat = '{0}-{1}-{2}';
        } else if (args.regionCode === 'SER' && !/^\(\d{3}\) \d{3}-\d{4}$/.test(venue.phone)) {
          args.outputPhoneFormat = '{0}-{1}-{2}';
        } else if (args.regionCode === 'GLR') {
          args.outputPhoneFormat = '{0}-{1}-{2}';
        } else if (args.state2L === 'NV') {
          args.outputPhoneFormat = '{0}-{1}-{2}';
        } else if (args.countryCode === PNH_DATA.CAN.countryCode) {
          args.outputPhoneFormat = '+1-{0}-{1}-{2}';
        }

        args.almostAllDayHoursEntries = args.openingHours.filter((hoursEntry) => hoursEntry.toHour === '23:59' && /^0?0:00$/.test(hoursEntry.fromHour));
        if (!args.highlightOnly && args.almostAllDayHoursEntries.length) {
          const newHoursEntries = [];
          args.openingHours.forEach((hoursEntry) => {
            const isInvalid = args.almostAllDayHoursEntries.includes(hoursEntry);
            const newHoursEntry = new OpeningHour({
              days: hoursEntry.days.slice(),
              fromHour: isInvalid ? '00:00' : hoursEntry.fromHour,
              toHour: isInvalid ? '00:00' : hoursEntry.toHour,
            });
            newHoursEntries.push(newHoursEntry);
          });
          args.openingHours = newHoursEntries;
          addUpdateAction(venue, { openingHours: args.openingHours }, actions);
        }

        // Place Harmonization
        if (!args.highlightOnly) {
          if (isVenueParkingLot(venue) || isVenueResidential(venue)) {
            args.pnhMatch = ['NoMatch'];
          } else {
            // check against the PNH list
            args.pnhMatch = Pnh.findMatch(args.nameBase, args.state2L, args.regionCode, args.countryCode, args.categories, venue);
          }
        } else {
          args.pnhMatch = Pnh.findMatch(args.nameBase, args.state2L, args.regionCode, args.countryCode, args.categories, venue, true);
        }

        // DEBUG: Log what findMatch returned for multiple match detection
        if (args.pnhMatch?.length > 1 && args.pnhMatch[0] !== 'NoMatch' && args.pnhMatch[0] !== 'ApprovalNeeded') {
          logDev(`Multiple PNH matches found for "${args.nameBase}" (state: ${args.state2L}, region: ${args.regionCode})`);
          args.pnhMatch.forEach((match, idx) => {
            logDev(`  Match ${idx}: Order ${match.order}, Name: ${match.name}, Category: ${match.primaryCategory}, Regions: ${match.regions.join(', ')}, BrandParentLevel: ${match.brandParentLevel}`);
          });
        }

        args.pnhNameRegMatch = args.pnhMatch?.length && args.pnhMatch[0] !== 'NoMatch' && args.pnhMatch[0] !== 'ApprovalNeeded' && args.pnhMatch[0] !== 'Highlight';

        if (args.pnhNameRegMatch) {
          // *** Replace place data with PNH data
          let updatePNHName = true;

          // Retrieve the data from the PNH line(s)
          let nsMultiMatch = false;
          const orderList = [];
          if (args.pnhMatch.length > 1) {
            // If multiple matches, then
            let maxBrandParentLevel = -1;
            let pnhMatchHold = args.pnhMatch[0];
            for (let pnhEntryIdx = 0; pnhEntryIdx < args.pnhMatch.length; pnhEntryIdx++) {
              // For each of the matches,
              const pnhEntry = args.pnhMatch[pnhEntryIdx];
              orderList.push(pnhEntry.order); // Add Order number to a list
              if (pnhEntry.brandParentLevel > -1) {
                // If there is a brandParent flag, prioritize by highest match
                if (pnhEntry.brandParentLevel > maxBrandParentLevel) {
                  // if the match is more specific than the previous ones:
                  maxBrandParentLevel = pnhEntry.brandParentLevel; // Update the brandParent level
                  pnhMatchHold = pnhEntry; // Update the PNH data line
                }
              } else {
                // if any venue has no brandParent structure, use highest brandParent match but post an error
                nsMultiMatch = true;
              }
            }
            args.pnhMatch = pnhMatchHold;
          } else {
            [args.pnhMatch] = args.pnhMatch; // Single match
          }

          args.priPNHPlaceCat = args.pnhMatch.primaryCategory;

          // if the location has multiple matches, then pop an alert
          if (nsMultiMatch && !args.highlightOnly) {
            WazeWrap.Alerts.error(SCRIPT_NAME, 'WMEPH: Multiple matches found!<br>Double check the script changes.');
          }

          // Check special cases
          if (args.pnhMatch.hasSpecialCases) {
            // If the special cases column exists
            // find any button/message flags in the special case (format: buttOn_xyzXyz, etc.)
            if (args.pnhMatch.flagsToRemove.addConvStore) {
              FlagBase.currentFlags.remove(Flag.AddConvStore);
            }
            // } else if (match = specCase.match(/^messOn_(.+)/i)) {
            //    [, scFlag] = match;
            //    _buttonBanner[scFlag].active = true;
            // } else if (match = specCase.match(/^messOff_(.+)/i)) {
            //    [, scFlag] = match;
            //    _buttonBanner[scFlag].active = false;
            args.pnhMatch.servicesToAdd.forEach((scFlag) => {
              if (_servicesBanner[scFlag]) {
                _servicesBanner[scFlag].actionOn(actions);
                _servicesBanner[scFlag].pnhOverride = true;
              }
            });
            args.pnhMatch.servicesToRemove.forEach((scFlag) => {
              if (_servicesBanner[scFlag]) {
                _servicesBanner[scFlag].actionOff(actions);
                _servicesBanner[scFlag].pnhOverride = true;
              }
            });
            if (args.pnhMatch.forceBrand) {
              // If brand is going to be forced, use that.  Otherwise, use existing brand.
              [, args.brand] = args.pnhMatch.forceBrand;
            }
            if (args.pnhMatch.forceBrand && args.priPNHPlaceCat === 'GAS_STATION' && venue.brand !== args.pnhMatch.forceBrand) {
              try {
                actions.push(sdk.DataModel.Venues.updateVenue({ venueId: venue.id, brand: args.pnhMatch.forceBrand }));
              } catch (e) {
                if (e.name === 'InvalidStateError') {
                  logDev('InvalidStateError updating brand - skipping');
                } else throw e;
              }
              UPDATED_FIELDS.brand.updated = true;
              logDev('Gas brand updated from PNH');
            }
            if (args.pnhMatch.localizationRegEx) {
              args.showDispNote = false;
            }
            if (args.pnhMatch.recommendedPhone) {
              args.recommendedPhone = normalizePhone(args.pnhMatch.recommendedPhone, args.outputPhoneFormat);
            }
            if (args.pnhMatch.keepName) {
              // Prevent name change
              updatePNHName = false;
            }
            if (args.pnhMatch.chainIsClosed && !Flag.ChainIsClosed.isWhitelisted(args)) {
              args.chainIsClosed = true;
            }
          }

          if (!args.chainIsClosed) {
            // Category translations
            const { altCategories } = args.pnhMatch;

            // name parsing with category exceptions
            if (args.priPNHPlaceCat === 'HOTEL') {
              const nameToCheck = args.nameBase + (args.nameSuffix || '');
              if (nameToCheck.toUpperCase() === args.pnhMatch.name.toUpperCase()) {
                // If no localization
                args.nameBase = args.pnhMatch.name;
              } else {
                // Replace PNH part of name with PNH name
                const splix = args.nameBase.toUpperCase().replace(/[-/]/g, ' ').indexOf(args.pnhMatch.name.toUpperCase().replace(/[-/]/g, ' '));
                if (splix > -1) {
                  const frontText = args.nameBase.slice(0, splix);
                  const backText = args.nameBase.slice(splix + args.pnhMatch.name.length);
                  args.nameBase = args.pnhMatch.name;
                  if (frontText.length > 0) {
                    args.nameBase = `${frontText} ${args.nameBase}`;
                  }
                  if (backText.length > 0) {
                    args.nameBase = `${args.nameBase} ${backText}`;
                  }
                  args.nameBase = args.nameBase.replace(/ {2,}/g, ' ');
                } else {
                  args.nameBase = args.pnhMatch.name;
                }
              }
              if (altCategories && altCategories.length) {
                // if PNH alts exist
                insertAtIndex(args.categories, altCategories, 1); //  then insert the alts into the existing category array after the GS category
              }
              if (args.categories.includes('HOTEL')) {
                // Remove LODGING if it exists
                const lodgingIdx = args.categories.indexOf('LODGING');
                if (lodgingIdx > -1) {
                  args.categories.splice(lodgingIdx, 1);
                }
              }
              // If PNH match, set wifi service.
              if (args.pnhMatch && _servicesBanner?.addWiFi && !_servicesBanner.addWiFi.checked) {
                _servicesBanner.addWiFi.action();
              }
              // Set hotel hours to 24/7 for all hotels.
              if (_servicesBanner?.add247 && !_servicesBanner.add247.checked) {
                _servicesBanner.add247.action();
              }
            } else if (args.priPNHPlaceCat === 'BANK_FINANCIAL' && !args.pnhMatch.notABank) {
              if (/\batm\b/gi.test(args.nameBase)) {
                args.nameBase = `${args.pnhMatch.name} ATM`;
              } else {
                args.nameBase = args.pnhMatch.name;
              }
            } else if (args.priPNHPlaceCat === 'GAS_STATION') {
              // for PNH gas stations, don't replace existing sub-categories
              if (altCategories?.length) {
                // if PNH alts exist
                insertAtIndex(args.categories, altCategories, 1); //  then insert the alts into the existing category array after the GS category
              }
              args.nameBase = args.pnhMatch.name;
            } else if (updatePNHName) {
              // if not a special category then update the name
              args.nameBase = args.pnhMatch.name;
              args.categories = insertAtIndex(args.categories, args.priPNHPlaceCat, 0);
              if (altCategories?.length && !args.pnhMatch.flagsToAdd?.addCat2 && !args.pnhMatch.optionCat2) {
                args.categories = insertAtIndex(args.categories, altCategories, 1);
              }
            } else if (!updatePNHName) {
              // Strong title case option for non-PNH places
              Flag.TitleCaseName.eval(venue, args.nameBase, args.nameSuffix);
            }

            // *** need to add a section above to allow other permissible categories to remain? (optional)

            // Parse URL data
            if (!args.pnhMatch.localUrlCheckRegEx?.test(args?.url)) {
              args.pnhUrl = args.pnhMatch.url;
            }

            // Parse PNH Aliases
            if (!args.pnhMatch.noUpdateAlias && !containsAll(args.aliases, args.pnhMatch.aliases) && args.pnhMatch.aliases?.length && !args.pnhMatch.optionName2) {
              args.aliases = insertAtIndex(args.aliases, args.pnhMatch.aliases, 0);
              addUpdateAction(venue, { aliases: args.aliases }, actions);
            }

            // Remove unnecessary parent categories
            // TODO: This seems like it could be made more efficient.
            const parentCats = uniq(args.categories.map((category) => args.pnhCategoryInfos.getById(category).parent)).filter((parent) => parent.trim().length > 0);
            args.categories = args.categories.filter((cat) => !parentCats.includes(cat));

            // update categories if different and no Cat2 option
            if (!matchSets(uniq(venue.categories), uniq(args.categories))) {
              if (!args.pnhMatch.optionCat2 && !args.pnhMatch.flagsToAdd?.addCat2) {
                logDev(`Categories updated with ${args.categories}`);
                addUpdateAction(venue, { categories: args.categories }, actions);
              } else {
                // if second cat is optional
                logDev(`Primary category updated with ${args.priPNHPlaceCat}`);
                args.categories = insertAtIndex(args.categories, args.priPNHPlaceCat, 0);
                addUpdateAction(venue, { categories: args.categories });
              }
            }
            // Enable optional 2nd category button
            Flag.AddCat2.eval(args, altCategories?.[0]);

            // Description update
            args.description = args.pnhMatch.description;
            if (!isNullOrWhitespace(args.description) && !venue.description?.toUpperCase?.().includes(args.description.toUpperCase())) {
              if (!isNullOrWhitespace(venue.description)) {
                args.descriptionInserted = true;
              }
              args.description = `${args.description}\n${venue.description}`;
              try {
                actions.push(sdk.DataModel.Venues.updateVenue({ venueId: venue.id, description: args.description }));
                logDev('Description updated');
                UPDATED_FIELDS.description.updated = true;
              } catch (e) {
                if (e.name === 'InvalidStateError') {
                  logDev('InvalidStateError updating description - skipping (feed-controlled field)');
                } else throw e;
              }
            }

            // Special Lock by PNH
            if (args.pnhMatch.lockAt) {
              pnhLockLevel = args.pnhMatch.lockAt - 1;
            }
          }
        } // END PNH match/no-match updates

        if (!args.chainIsClosed) {
          const isPoint = isVenuePoint(venue);
          // Determine if venue is an area by checking if it's not a point (more reliable than is2D())
          const isArea = !isPoint;
          let highestCategoryLock = -1;
          // Category/Name-based Services, added to any existing services:
          args.categories.forEach((category) => {
            const pnhCategoryInfo = args.pnhCategoryInfos.getById(category);

            if (!pnhCategoryInfo) {
              throw new Error(`WMEPH: Unexpected category: ${category}`);
            }

            let pvaPoint = pnhCategoryInfo.point;
            let pvaArea = pnhCategoryInfo.area;
            if (pnhCategoryInfo.regPoint.includes(args.state2L) || pnhCategoryInfo.regPoint.includes(args.regionCode) || pnhCategoryInfo.regPoint.includes(args.countryCode)) {
              pvaPoint = '1';
              pvaArea = '';
            } else if (pnhCategoryInfo.regArea.includes(args.state2L) || pnhCategoryInfo.regArea.includes(args.regionCode) || pnhCategoryInfo.regArea.includes(args.countryCode)) {
              pvaPoint = '';
              pvaArea = '1';
            }

            // If Post Office and VPO or CPU is in the name, always a point.
            if (args.categories.includes('POST_OFFICE') && /\b(?:cpu|vpo)\b/i.test(venue.name)) {
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

            // TODO: Process this flag outside the loop.
            Flag.PnhCatMess.eval(venue, pnhCategoryInfo, args.categories, args.highlightOnly);

            // Set lock level
            for (let lockix = 1; lockix < 6; lockix++) {
              const categoryLock = pnhCategoryInfo[`lock${lockix}`];
              if (lockix - 1 > highestCategoryLock && (categoryLock.includes(args.state2L) || categoryLock.includes(args.regionCode) || categoryLock.includes(args.countryCode))) {
                highestCategoryLock = lockix - 1; // Offset by 1 since lock ranks start at 0
              }
            }
          });

          if (highestCategoryLock > -1) {
            args.defaultLockLevel = highestCategoryLock;
          }

          if (!args.highlightOnly) {
            // Update name:
            if (args.nameBase + (args.nameSuffix || '') !== venue.name) {
              logDev('Name updated');
              addUpdateAction(venue, { name: args.nameBase + (args.nameSuffix || '') }, actions);
            }

            // Update aliases
            const tempAliases = removeUnnecessaryAliases(args.nameBase, args.aliases);
            if (tempAliases !== null) {
              args.aliasesRemoved = true;
              args.aliases = tempAliases;
              logDev('Alt Names updated');
              addUpdateAction(venue, { aliases: args.aliases }, actions);
            }

            // PNH specific Services: Display available services for this category
            // These are services defined in the PNH Google Sheet for each category (ps_* columns).
            // They are optional suggestions - user controls whether to enable them on the venue.
            /*
            args.categories.forEach((category) => {
              const pnhCategoryInfo = args.pnhCategoryInfos.getById(category);
              pnhCategoryInfo.services.forEach((service) => {
                const serviceButton = _servicesBanner[service.pnhKey];
                // Just make the button active (visible) - user decides to enable or disable
                if (serviceButton) {
                  serviceButton.active = true;
                }
              });
            });
           */
          }

          args.hoursOverlap = venueHasOverlappingHours(args.openingHours);

          args.isUspsPostOffice = args.countryCode === PNH_DATA.USA.countryCode && !args.categories.includes('PARKING_LOT') && args.categories.includes('POST_OFFICE');

          if (!args.highlightOnly) {
            // Highlight 24/7 button if hours are set that way, and add button for all places
            if (_servicesBanner && _servicesBanner.add247) {
              if (isAlwaysOpen(venue)) {
                _servicesBanner.add247.checked = true;
              }
              _servicesBanner.add247.active = true;
            }

            if (!args.hoursOverlap) {
              const tempHours = args.openingHours.slice();
              for (let ohix = 0; ohix < args.openingHours.length; ohix++) {
                if (tempHours[ohix].days.length === 2 && tempHours[ohix].days[0] === 1 && tempHours[ohix].days[1] === 0) {
                  // separate hours
                  logDev('Correcting M-S entry...');
                  tempHours.push(new OpeningHour({ days: [0], fromHour: tempHours[ohix].fromHour, toHour: tempHours[ohix].toHour }));
                  tempHours[ohix].days = [1];
                  args.openingHours = tempHours;
                  addUpdateAction(venue, { openingHours: tempHours }, actions);
                }
              }
            }

            // URL updating
            // Invalid EVCS URL imported from PURs. Clear it.
            if (Flag.ClearThisUrl.venueIsFlaggable(args)) {
              args.url = null;
              addUpdateAction(venue, { url: args.url }, actions);
            }
            args.normalizedUrl = normalizeURL(args.url);
            if (args.isUspsPostOffice && args.url !== 'usps.com') {
              args.url = 'usps.com';
              addUpdateAction(venue, { url: args.url }, actions);
            } else if (!args.pnhUrl && args.normalizedUrl !== args.url) {
              if (args.normalizedUrl !== BAD_URL) {
                args.url = args.normalizedUrl;
                logDev('URL formatted');
                addUpdateAction(venue, { url: args.url }, actions);
              }
            } else if (args.pnhUrl && isNullOrWhitespace(args.url)) {
              args.url = args.pnhUrl;
              logDev('URL updated');
              addUpdateAction(venue, { url: args.url }, actions);
            }

            if (args.phone) {
              // Invalid EVCS phone # imported from PURs. Clear it.
              if (Flag.ClearThisPhone.venueIsFlaggable(args)) {
                args.phone = null;
              }
              const normalizedPhone = normalizePhone(args.phone, args.outputPhoneFormat);
              if (normalizedPhone !== BAD_PHONE) args.phone = normalizedPhone;
              if (args.phone !== venue.phone) {
                logDev('Phone updated');
                addUpdateAction(venue, { phone: args.phone }, actions);
              }
            }

            if (args.isUspsPostOffice) {
              const cleanNameParts = Flag.FormatUSPS.getCleanNameParts(args.nameBase, args.nameSuffix);
              const nameToCheck = cleanNameParts.join('');
              if (Flag.FormatUSPS.isNameOk(nameToCheck, args.state2L, args.addr)) {
                if (nameToCheck !== venue.name) {
                  [args.nameBase, args.nameSuffix] = cleanNameParts;
                  actions.push(sdk.DataModel.Venues.updateVenue({ venueId: venue.id, name: nameToCheck }));
                }
              }
            }
          }
        }
      } // END if (!residential && has name)

      if (!args.chainIsClosed) {
        if (!args.highlightOnly && args.categories.includes('REST_AREAS')) {
          if (venue.name.match(/^Rest Area.* - /) !== null && args.countryCode === PNH_DATA.USA.countryCode) {
            const newSuffix = args.nameSuffix.replace(/\bMile\b/i, 'mile');
            if (args.nameBase + newSuffix !== venue.name) {
              addUpdateAction(venue, { name: args.nameBase + newSuffix }, actions);
              logDev('Lower case "mile"');
            }
            // If names match after lowercasing "Mile", no action is needed
            // (would only have been a capitalization change, which is not desired)
          }

          // switch to rest area wiki button (only when not in highlight-only mode)
          if (!args.highlightOnly) {
            _buttonBanner2.restAreaWiki.active = true;
            _buttonBanner2.placesWiki.active = false;
          }
        } else {
          // For non-rest-area venues, ensure rest area button is hidden and places wiki is shown (only when not in highlight-only mode)
          if (!args.highlightOnly) {
            _buttonBanner2.restAreaWiki.active = false;
            _buttonBanner2.placesWiki.active = !$('#WMEPH-HidePlacesWiki').prop('checked');
          }
        }

        args.isLocked = venue.lockRank >= (pnhLockLevel > -1 ? pnhLockLevel : args.defaultLockLevel);
        args.currentHN = args.addr?.houseNumber;
        // Check to see if there's an action that is currently updating the house number.
        const updateHnAction = actions && actions.find((action) => action && action.newAttributes && action.newAttributes.houseNumber);
        if (updateHnAction) args.currentHN = updateHnAction.newAttributes.houseNumber;
        // Check if venue has a street and city (use actual address objects, not outdated venue properties)
        args.hasStreet = args.addr?.street && !args.addr.street.isEmpty;
        args.hasCity = args.addr?.city && !args.addr.city.isEmpty;
        args.ignoreParkingLots = $('#WMEPH-DisablePLAExtProviderCheck').prop('checked');

        if (!isVenueResidential(venue) && (isVenueParkingLot(venue) || args.nameBase?.trim().length)) {
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
            try {
              Flag.LocationFinder.eval(args);
            } catch (e) {
              logDev('LocationFinder error (needs SDK migration):', e.message);
            }
            Flag.AddPharm.eval(args);
            Flag.AddSuper.eval(args);
            Flag.AppendAMPM.eval(args);
            Flag.PlaceMatched.eval(args);
          } else if (!args.highlightOnly && args.categories.includes('POST_OFFICE')) {
            try {
              Flag.LocationFinder.eval(args);
            } catch (e) {
              logDev('LocationFinder error (needs SDK migration):', e.message);
            }
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

      // update Severity for banner messages
      const orderedFlags = FlagBase.currentFlags.getOrderedFlags();
      orderedFlags.forEach((flag) => {
        args.totalSeverity = Math.max(flag.severity, args.totalSeverity);
      });

      let placeLockedFlag;
      if (!args.chainIsClosed) {
        // final updating of desired lock levels
        if (pnhLockLevel !== -1 && !args.highlightOnly) {
          logDev(`PNHLockLevel: ${pnhLockLevel}`);
          args.levelToLock = pnhLockLevel;
        } else {
          args.levelToLock = args.defaultLockLevel;
        }
        if (args.regionCode === 'SER') {
          if (args.categories.includes('COLLEGE_UNIVERSITY') && args.categories.includes('PARKING_LOT')) {
            args.levelToLock = LOCK_LEVEL_4;
          } else if (
            isVenuePoint(venue) &&
            args.categories.includes('COLLEGE_UNIVERSITY') &&
            (!args.categories.includes('HOSPITAL_MEDICAL_CARE') || !args.categories.includes('HOSPITAL_URGENT_CARE'))
          ) {
            args.levelToLock = LOCK_LEVEL_4;
          }
        }

        if (args.levelToLock > USER.rank - 1) {
          args.levelToLock = USER.rank - 1;
        } // Only lock up to the user's level

        // Brand checking (be sure to check this after determining if brand will be forced, when harmonizing)
        Flag.GasNoBrand.eval(args);
        Flag.GasUnbranded.eval(args);

        Flag.IgnEdited.eval(args);
        Flag.WazeBot.eval(args);
        Flag.LockRPP.eval(args);

        // Allow flags to do any additional work before assigning severity and locks
        orderedFlags.forEach((flag) => flag.preProcess?.(args));

        if (!args.highlightOnly) {
          // Update the lockOK value if "noLock" is set on any flag.
          args.lockOK &&= !orderedFlags.some((flag) => flag.noLock);
          logDev(`Severity: ${args.totalSeverity}; lockOK: ${args.lockOK}`);
        }

        placeLockedFlag = Flag.PlaceLocked.eval(args);

        // Turn off unnecessary buttons
        // TODO: handle this in the flag class
        if (args.categories.includes('PHARMACY')) {
          FlagBase.currentFlags.remove(Flag.AddPharm);
        }
        if (args.categories.includes('SUPERMARKET_GROCERY')) {
          FlagBase.currentFlags.remove(Flag.AddSuper);
        }

        // Final alerts for non-severe locations
        Flag.ResiTypeName.eval(args);
        Flag.SuspectDesc.eval(args);

        _dupeHNRangeList = [];
        _dupeBanner = {};
        if (!args.highlightOnly) {
          try {
            runDuplicateFinder(venue, args.nameBase, args.aliases, args.addr, args.placePL);
          } catch (e) {
            logDev('Duplicate finder error (needs SDK migration):', e.message);
          }
        }
        // Check HN range (this depends on the returned dupefinder data, so must run after it)
        Flag.HNRange.eval(args);
      }

      // Return severity for highlighter (no dupe run))
      if (args.highlightOnly) {
        // get severities from the banners
        args.totalSeverity = SEVERITY.GREEN;
        orderedFlags.forEach((flag) => {
          args.totalSeverity = Math.max(flag.severity, args.totalSeverity);
        });

        // Special case flags
        if (venue.lockRank === 0 && venue.categories.some((cat) => ['HOSPITAL_MEDICAL_CARE', 'HOSPITAL_URGENT_CARE', 'GAS_STATION'].includes(cat))) {
          args.totalSeverity = SEVERITY.PINK;
        }

        if (args.totalSeverity === SEVERITY.GREEN && placeLockedFlag?.hlLockFlag) {
          args.totalSeverity = 'lock';
        }
        if (args.totalSeverity === SEVERITY.BLUE && placeLockedFlag?.hlLockFlag) {
          args.totalSeverity = 'lock1';
        }
        if (venue.adLocked) {
          args.totalSeverity = 'adLock';
        }

        return args.totalSeverity;
      }

      if (!args.highlightOnly) {
        // Update icons to reflect current WME place services
        updateServicesChecks(_servicesBanner);

        // Add green highlighting to edit panel fields that have been updated by WMEPH
        UPDATED_FIELDS.updateEditPanelHighlights();

        assembleBanner(args.chainIsClosed); // Run async without awaiting - Google links process in background

        executeMultiAction(actions);
      }

      // After full harmonization, invalidate this venue's cache and refresh highlights to show updated color
      if (!args.highlightOnly) {
        delete _resultsCache[venueID];
      }

      // Highlighting will return a value, but no need to return a value here (for end of harmonization).
      // Adding this line to satisfy eslint.
      return undefined;
    } finally {
      // Restore harmonization flag
      _isHarmonizing = wasHarmonizing;
      _previousVenueServices = null; // Reset after harmonization completes

      // After harmonization flag is restored, refresh highlights only if this was a full harmonization (not highlight-only)
      if (!wasHarmonizing && useFlag === 'harmonize') {
        refreshAllHighlights();
      }
    }
  } // END harmonizePlaceGo_impl function

  /**
   * Wrapper around harmonizePlaceGo_impl that adds performance tracking and statistics collection.
   * Measures execution time and updates wmephStats with harmonization metrics. Separately tracks
   * cache hits vs misses for performance analysis (highlight-only calls from cache system).
   * @param {Object} venue The WME venue object to harmonize.
   * @param {string} useFlag Flag type controlling harmonization behavior ('harmonize', 'flag', etc.).
   * @param {Array<Object>} actions Optional array of venue update actions to apply.
   * @param {boolean} isCacheHit Optional flag indicating if this is a highlight from cache lookup.
   * @returns {*} Result from harmonizePlaceGo_impl implementation.
   */
  function harmonizePlaceGo(venue, useFlag, actions, isCacheHit) {
    const startTime = performance.now();
    try {
      return harmonizePlaceGo_impl(venue, useFlag, actions);
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;
      wmephStats.harmonizeCount++;
      wmephStats.totalHarmonizeTime += duration;
      wmephStats.lastHarmonizeTime = duration;
      wmephStats.maxHarmonizeTime = Math.max(wmephStats.maxHarmonizeTime, duration);

      // Track cache performance separately for highlight-only calls
      if (useFlag === 'highlight' && isCacheHit !== undefined) {
        if (isCacheHit) {
          wmephStats.cacheHits++;
          wmephStats.totalCacheHitTime += duration;
          wmephStats.lastCacheHitTime = duration;
          wmephStats.maxCacheHitTime = Math.max(wmephStats.maxCacheHitTime, duration);
        } else {
          wmephStats.cacheMisses++;
          wmephStats.totalCacheMissTime += duration;
          wmephStats.lastCacheMissTime = duration;
          wmephStats.maxCacheMissTime = Math.max(wmephStats.maxCacheMissTime, duration);
        }
      }
    }
  }

  /**
   * Finds and processes nearby duplicate venues, then populates the duplicate banner.
   * Calls findNearbyDuplicate to search for matches and creates whitelisting UI for each found duplicate.
   * Updates _dupeBanner object which is later rendered in the harmonization banner.
   * @param {Object} venue The current WME venue object being checked for duplicates.
   * @param {string} name The venue name to search for duplicates of.
   * @param {Array<string>} aliases Alternative names to also check for duplicates.
   * @param {Object} addr The venue's address object (street, city, state, country).
   * @param {string} placePL The place permalink.
   */
  function runDuplicateFinder(venue, name, aliases, addr, placePL) {
    const venueID = venue.id;
    // Run nearby duplicate place finder function
    if (name.replace(/[^A-Za-z0-9]/g, '').length > 0 && !venue.residential && !isEmergencyRoom(venue) && !isRestArea(venue)) {
      // don't zoom and pan for results outside of FOV
      let duplicateName = findNearbyDuplicate(name, aliases, venue);
      if (duplicateName[1]) {
        new Flag.Overlapping();
      }
      [duplicateName] = duplicateName;
      if (duplicateName.length) {
        if (duplicateName.length + 1 !== _dupeIDList.length && USER.isDevUser) {
          // If there's an issue with the data return, allow an error report
          WazeWrap.Alerts.error(SCRIPT_NAME, 'WMEPH: Dupefinder Error!');
        } else {
          const wlAction = (dID) => {
            const wlKey = 'dupeWL';
            if (!_venueWhitelist.hasOwnProperty(venueID)) {
              // If venue is NOT on WL, then add it.
              _venueWhitelist[venueID] = { dupeWL: [] };
            }
            if (!_venueWhitelist[venueID].hasOwnProperty(wlKey)) {
              // If dupeWL key is not in venue WL, then initialize it.
              _venueWhitelist[venueID][wlKey] = [];
            }
            _venueWhitelist[venueID].dupeWL.push(dID); // WL the id for the duplicate venue
            _venueWhitelist[venueID].dupeWL = uniq(_venueWhitelist[venueID].dupeWL);
            // Make an entry for the opposite venue
            if (!_venueWhitelist.hasOwnProperty(dID)) {
              // If venue is NOT on WL, then add it.
              _venueWhitelist[dID] = { dupeWL: [] };
            }
            if (!_venueWhitelist[dID].hasOwnProperty(wlKey)) {
              // If dupeWL key is not in venue WL, then initialize it.
              _venueWhitelist[dID][wlKey] = [];
            }
            _venueWhitelist[dID].dupeWL.push(venueID); // WL the id for the duplicate venue
            _venueWhitelist[dID].dupeWL = uniq(_venueWhitelist[dID].dupeWL);
            saveWhitelistToLS(true); // Save the WL to local storage
            wmephWhitelistCounter();
            _buttonBanner2.clearWL.active = true;
            harmonizePlaceGo(venue, 'harmonize');
          };
          for (let ijx = 1; ijx < duplicateName.length + 1; ijx++) {
            _dupeBanner[_dupeIDList[ijx]] = {
              active: true,
              severity: SEVERITY.YELLOW,
              message: duplicateName[ijx - 1],
              WLactive: true,
              WLvalue: WL_BUTTON_TEXT,
              wlTooltip: 'Whitelist Duplicate',
              WLaction: wlAction,
            };
            if (_venueWhitelist.hasOwnProperty(venueID) && _venueWhitelist[venueID].hasOwnProperty('dupeWL') && _venueWhitelist[venueID].dupeWL.includes(_dupeIDList[ijx])) {
              // if the dupe is on the whitelist then remove it from the banner
              _dupeBanner[_dupeIDList[ijx]].active = false;
            } else {
              // Otherwise, activate the WL button
              _dupeBanner[_dupeIDList[ijx]].WLactive = true;
            }
          } // END loop for duplicate venues
        }
      }
    }
  }

  /**
   * Builds and renders the main harmonization banner UI containing all flags, duplicates, services, and tool buttons.
   * Retrieves current flags from FlagBase, constructs color-coded HTML rows, and attaches event handlers.
   * Also calls processGoogleLinks asynchronously to populate Google Places links.
   * @async
   * @param {boolean} chainIsClosed Whether the venue is part of a closed chain (affects display).
   */
  async function assembleBanner(chainIsClosed) {
    const flags = FlagBase.currentFlags.getOrderedFlags();
    const venue = getSelectedVenue();
    if (!venue) return;
    logDev('Building banners');
    let dupesFound = 0;
    let $rowDiv;
    let rowDivs = [];
    let totalSeverity = SEVERITY.GREEN;

    const func = (elem) => ({ id: elem.getAttribute('id'), val: elem.value });
    _textEntryValues = $('#WMEPH_banner input[type="text"]').toArray().map(func);
    _textEntryValues = _textEntryValues.concat($('#WMEPH_banner textarea').toArray().map(func));

    // Setup duplicates banners
    $rowDiv = $('<div class="banner-row yellow">');
    Object.keys(_dupeBanner).forEach((tempKey) => {
      const rowData = _dupeBanner[tempKey];
      if (rowData.active) {
        dupesFound += 1;
        const $dupeDiv = $('<div class="dupe">').appendTo($rowDiv);
        $dupeDiv.append($('<span style="margin-right:4px">').html(`&bull; ${rowData.message}`));
        if (rowData.value) {
          // Nothing happening here yet.
        }
        if (rowData.WLactive && rowData.WLaction) {
          // If there's a WL option, enable it
          totalSeverity = Math.max(rowData.severity, totalSeverity);
          $dupeDiv.append(
            $('<button>', {
              class: 'btn btn-success btn-xs wmephwl-btn',
              id: `WMEPH_WL${tempKey}`,
              title: rowData.wlTooltip,
            }).text(rowData.WLvalue),
          );
        }
      }
    });
    if (dupesFound) {
      // if at least 1 dupe
      $rowDiv.prepend(`Possible duplicate${dupesFound > 1 ? 's' : ''}:`);
      rowDivs.push($rowDiv);
    }

    // Build banners above the Services
    flags.forEach((flag) => {
      $rowDiv = $('<div class="banner-row">');
      let colorClass;
      switch (flag.severity) {
        case SEVERITY.RED:
          colorClass = 'red';
          break;
        case SEVERITY.YELLOW:
          colorClass = 'yellow';
          break;
        case SEVERITY.BLUE:
          colorClass = 'blue';
          break;
        case SEVERITY.GREEN:
          colorClass = 'gray';
          break;
        case SEVERITY.ORANGE:
          colorClass = 'orange';
          break;
        default:
          throw new Error(`WMEPH: Unexpected severity value while building banner: ${flag.severity}`);
      }
      $rowDiv.addClass(colorClass);
      if (flag.divId) {
        $rowDiv.attr('id', flag.divId);
      }
      if (flag.message && flag.message.length) {
        $rowDiv.append($('<span>').css({ 'margin-right': '4px' }).append(`&bull; ${flag.message}`));
      }
      if (flag.buttonText) {
        $rowDiv.append(
          $('<button>', {
            class: 'btn btn-default btn-xs wmeph-btn',
            id: `WMEPH_${flag.name}`,
            title: flag.title || '',
          })
            .css({ 'margin-right': '4px' })
            .html(flag.buttonText),
        );
      }
      if (flag.value2) {
        $rowDiv.append(
          $('<button>', {
            class: 'btn btn-default btn-xs wmeph-btn',
            id: `WMEPH_${flag.name}_2`,
            title: flag.title2 || '',
          })
            .css({ 'margin-right': '4px' })
            .html(flag.value2),
        );
      }
      if (flag.showWL) {
        if (flag.WLaction) {
          // If there's a WL option, enable it
          totalSeverity = Math.max(flag.severity, totalSeverity);
          $rowDiv.append($('<button>', { class: 'btn btn-success btn-xs wmephwl-btn', id: `WMEPH_WL${flag.name}`, title: flag.wlTooltip }).text('WL'));
        }
      } else {
        totalSeverity = Math.max(flag.severity, totalSeverity);
      }
      if (flag.suffixMessage) {
        $rowDiv.append($('<div>').css({ 'margin-top': '2px' }).append(flag.suffixMessage));
      }

      rowDivs.push($rowDiv);
    });

    if ($('#WMEPH-ColorHighlighting').prop('checked')) {
      venue.wmephSeverity = totalSeverity;
    }

    if ($('#WMEPH_banner').length === 0) {
      $('<div id="WMEPH_banner">').prependTo('#wmeph-panel');
    } else {
      $('#WMEPH_banner').empty();
    }
    const bgColor = SEVERITY_COLORS[totalSeverity] || SEVERITY_COLORS[SEVERITY.GREEN];
    $('#WMEPH_banner').css({ 'background-color': bgColor }).append(rowDivs);

    assembleServicesBanner(chainIsClosed);

    //  Build general banners (below the Services)
    rowDivs = [];
    const $buttonContainer = $('<div>');
    Object.keys(_buttonBanner2).forEach((tempKey) => {
      const banner2RowData = _buttonBanner2[tempKey];
      if (banner2RowData.active) {
        //  If the particular message is active
        if (banner2RowData.action) {
          $buttonContainer.append(
            ` <input class="btn btn-info btn-xs wmeph-clone-btn" id="WMEPH_${tempKey}" title="${
              banner2RowData.title
            }" type="button" value="${banner2RowData.value}" style="font-weight: normal; margin-left: 3px;">`,
          );
        }
        totalSeverity = Math.max(_buttonBanner2[tempKey].severity, totalSeverity);
      }
    });

    if ($buttonContainer.children().length > 0) {
      rowDivs.push($buttonContainer);
    }

    if ($('#WMEPH_tools').length === 0) {
      $('#WMEPH_services').after($('<div id="WMEPH_tools">'));
    } else {
      $('#WMEPH_tools').empty();
    }
    $('#WMEPH_tools').append(rowDivs);

    // Set up Duplicate onclicks
    if (dupesFound) {
      setupButtonsOld(_dupeBanner);
    }
    // Setup bannButt onclicks
    setupButtons(flags);

    // Setup bannButt2 onclicks
    setupButtonsOld(_buttonBanner2);

    // Set up click handlers for parking lot space buttons
    Flag.PlaSpaces.setupClickHandlers();

    // Format "no hours" section and hook up button events.
    $('#WMEPH_WLnoHours').css({ 'vertical-align': 'top' });

    if (_textEntryValues) {
      _textEntryValues.forEach((entry) => $(`#${entry.id}`).val(entry.val));
    }

    // Allow flags to do any additional work (hook up events, etc);
    flags.forEach((flag) => {
      flag.postProcess?.();
    });

    processGoogleLinks(venue); // Start Google links async without waiting
  } // END assemble Banner function

  /**
   * Processes Google Places links for external provider IDs and builds an informational banner row.
   * Fetches Google Place data asynchronously and renders clickable links with status indicators (open, closed, invalid).
   * Only renders if the original requesting venue is still selected. Includes hover interactions for map visualization.
   * @async
   * @param {Object} venue The WME venue object containing externalProviderIds.
   */
  async function processGoogleLinks(venue) {
    try {
      if (!venue?.externalProviderIds || !venue.externalProviderIds.length) {
        return; // No external provider IDs to process
      }

      const promises = venue.externalProviderIds.map((placeId) => _googlePlaces.getPlace(placeId));
      const googleResults = await Promise.all(promises);
      const selectedVenue = getSelectedVenue();
      $('#wmeph-google-link-info').remove();
      // Compare to venue to make sure a different place hasn't been selected since the results were requested.
      if (googleResults.length && venue?.id === selectedVenue?.id) {
        const $bannerDiv = $('<div>', { id: 'wmeph-google-link-info' });
        const googleLogoLetter = (letter, colorClass) => $('<span>', { class: 'google-logo' }).addClass(colorClass).text(letter);
        $bannerDiv.append(
          $('<div>', {
            class: 'banner-row gray',
            style: 'padding-top: 4px;color: #646464;padding-left: 8px;',
          })
            .text(' Links')
            .prepend(
              googleLogoLetter('G', 'blue'),
              googleLogoLetter('o', 'red'),
              googleLogoLetter('o', 'orange'),
              googleLogoLetter('g', 'blue'),
              googleLogoLetter('l', 'green'),
              googleLogoLetter('e', 'red'),
            )
            .prepend(
              $('<i>', {
                id: 'wmeph-ext-prov-jump',
                title: 'Jump to external providers section',
                class: 'fa fa-level-down',
                style: 'font-size: 15px;float: right;color: cadetblue;cursor: pointer;padding-left: 6px;',
              }),
            ),
        );
        venue.externalProviderIds.forEach((placeId) => {
          const result = googleResults.find((r) => r.placeId === placeId);
          if (result) {
            const linkStyle = 'margin-left: 5px;text-decoration: none;color: cadetblue;';
            let $nameSpan;
            const $row = $('<div>', { class: 'banner-row', style: 'border-top: 1px solid #ccc;' }).append(
              $('<table>', { style: 'width: 100%' }).append(
                $('<tbody>').append(
                  $('<tr>').append(
                    $('<td>').append(
                      '&bull;',
                      ($nameSpan = $('<span>', {
                        class: 'wmeph-google-place-name',
                        style: 'margin-left: 3px;font-weight: normal;',
                      }).text(`${result.requestStatus !== 'NOT_FOUND' ? result.name : result.placeId}`)),
                    ),
                    $('<td>', { style: 'text-align: right;font-weight: 500;padding: 2px 2px 2px 0px;min-width: 65px;' }).append(
                      result.website && result.requestStatus !== 'NOT_FOUND'
                        ? [
                            $('<a>', {
                              style: linkStyle,
                              href: result.website,
                              target: '_blank',
                              title: "Open the place's website, according to Google",
                            }).append(
                              $('<i>', {
                                class: 'fa fa-external-link',
                                style: 'font-size: 16px;position: relative;top: 1px;',
                              }),
                            ),
                            $('<span>', {
                              style: 'text-align: center;margin-left: 8px;margin-right: 4px;color: #c5c5c5;cursor: default;',
                            }).text('|'),
                          ]
                        : null,
                      result.requestStatus !== 'NOT_FOUND'
                        ? $('<a>', {
                            style: linkStyle,
                            href: result.url,
                            target: '_blank',
                            title: 'Open the place in Google Maps',
                          }).append(
                            $('<i>', {
                              class: 'fa fa-map-o',
                              style: 'font-size: 16px;',
                            }),
                          )
                        : null,
                    ),
                  ),
                ),
              ),
            );

            if (result.requestStatus === 'NOT_FOUND') {
              $row.addClass('red');
              $row.attr('title', 'This Google place ID was not found. Please update the link in the External Providers section.');
            } else if (result.business_status === 'CLOSED_PERMANENTLY') {
              $nameSpan.append(' [CLOSED]');
              $row.addClass('red');
              $row.attr('title', 'Google indicates this linked place is permanently closed. Please verify.');
            } else if (result.business_status === 'CLOSED_TEMPORARILY') {
              $nameSpan.append(' [TEMPORARILY&nbsp;CLOSED]');
              $row.addClass('yellow');
              $row.attr('title', 'Google indicates this linked place is TEMPORARILY closed. Please verify.');
            } else if (googleResults.filter((otherResult) => otherResult.placeId === result.placeId).length > 1) {
              $nameSpan.append(' [DUPLICATE]');
              $row.css('background-color', '#fde5c8');
              $row.attr('title', 'This place is linked more than once. Please remove extra links.');
            } else {
              $row.addClass('lightgray');
            }

            $bannerDiv.append($row);

            $row.attr('uuid', result.placeId);
            if (result.requestStatus !== 'NOT_FOUND') {
              addGoogleLinkHoverEvent($row);
            }
          }
        });
        $('#WMEPH_banner').append($bannerDiv);
        $('#wmeph-ext-prov-jump').click(() => {
          const extProvSelector = '#venue-edit-general > div.external-providers-control.form-group';
          document.querySelector('#edit-panel wz-tab.venue-edit-tab-general').isActive = true;
          setTimeout(() => {
            document.querySelector(extProvSelector).scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
              $(extProvSelector).addClass('highlight');
              setTimeout(() => {
                $(extProvSelector).removeClass('highlight');
              }, 1500);
            }, 250);
          }, 0);
        });
      }
    } catch (err) {
      logDev('processGoogleLinks error:', err);
    }
  }

  /**
   * Intercepts calls to Google Maps PlacesService.getDetails to cache results locally.
   * Wraps the original method to capture place data and store in _googlePlaces cache for later use.
   * Retries initialization if Google Maps API hasn't loaded yet. Called during script initialization.
   */
  function interceptGoogleGetDetails() {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places || !google.maps.places.PlacesService) {
      logDev('Google Maps PlacesService not loaded yet.');
      setTimeout(interceptGoogleGetDetails, 500); // Retry until it loads
      return;
    }

    const originalGetDetails = google.maps.places.PlacesService.prototype.getDetails;
    google.maps.places.PlacesService.prototype.getDetails = function interceptedGetDetails(request, callback) {
      logDev('Intercepted getDetails call:', request);
      const { placeId } = request;
      const customCallback = function (result, status) {
        const googleResult = { ...result };
        googleResult.placeId = placeId;
        googleResult.requestStatus = status;
        _googlePlaces.addPlace(placeId, googleResult);
        callback(result, status); // Pass the result to the original callback
      };

      return originalGetDetails.call(this, request, customCallback);
    };

    logDev('Google Maps PlacesService.getDetails intercepted successfully.');
  }

  /**
   * Draws a line and point on the map between the selected venue and a Google Places external provider.
   * Creates GeoJSON features and adds them to the wmeph_google_link layer. Includes distance label.
   * Automatically clears visualization after 4 seconds via timeoutDestroyGooglePlacePoint.
   * @async
   * @param {string} uuid Google Place ID to visualize on the map.
   */
  async function drawGooglePlacePoint(uuid) {
    if (!uuid) return;
    const link = await _googlePlaces.getPlace(uuid);
    if (link?.geometry) {
      const selectedVenue = getSelectedVenue();
      if (!selectedVenue?.geometry) {
        logDev('drawGooglePlacePoint: No selected venue');
        return;
      }

      const coord = link.geometry.location;
      // Google coords are already WGS84 [lng, lat]
      const poiPt = turf.point([coord.lng(), coord.lat()]);
      const placeCentroid = getVenueCentroid(selectedVenue);
      if (!placeCentroid) return;

      const placePt = turf.point(placeCentroid);
      const bbox = getMapBoundingBox();
      if (!bbox) return;

      // Create line from place to POI
      let lineCoords = [placeCentroid, [coord.lng(), coord.lat()]];

      // Check if line crosses bbox boundary - if so, only draw within bounds
      // This is a simplified check: if start or end is outside bbox, clip it
      const [minLon, minLat, maxLon, maxLat] = bbox;
      const startInBounds = placeCentroid[0] >= minLon && placeCentroid[0] <= maxLon && placeCentroid[1] >= minLat && placeCentroid[1] <= maxLat;
      const endInBounds = coord.lng() >= minLon && coord.lng() <= maxLon && coord.lat() >= minLat && coord.lat() <= maxLat;

      if (!startInBounds || !endInBounds) {
        // Line crosses boundary - for now just show it anyway (Turf will handle clipping)
        logDev('Line crosses map boundary');
      }

      let label = '';
      // Calculate distance in meters
      const distanceMeters = calculatePointDistance(placeCentroid, [coord.lng(), coord.lat()]);
      let unitConversion;
      let unit1;
      let unit2;

      // Check if using imperial units
      const isImperial = sdk.Settings?.getUserSettings?.()?.isImperial ?? false;
      let distance = distanceMeters;

      if (isImperial) {
        distance *= 3.28084; // Convert to feet
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
        label = Math.round(distance / (unitConversion / 10)) / 10 + unit2;
      } else {
        label = Math.round(distance) + unit1;
      }

      logDev('drawGooglePlacePoint: distance=', distanceMeters, 'label=', label);

      destroyGooglePlacePoint(); // Just in case it still exists.

      // Create GeoJSON features for SDK
      _googlePlacePtFeature = {
        type: 'Feature',
        id: 'google_place_pt',
        geometry: poiPt.geometry,
        properties: { poiCoord: true, label: '' },
      };

      _googlePlaceLineFeature = {
        type: 'Feature',
        id: 'google_place_line',
        geometry: {
          type: 'LineString',
          coordinates: lineCoords,
        },
        properties: { label },
      };

      // Add to custom layer
      try {
        sdk.Map.addFeatureToLayer({
          layerName: 'wmeph_google_link',
          feature: _googlePlacePtFeature,
        });
        sdk.Map.addFeatureToLayer({
          layerName: 'wmeph_google_link',
          feature: _googlePlaceLineFeature,
        });
      } catch (e) {
        logDev('drawGooglePlacePoint: Failed to add features', e);
      }

      timeoutDestroyGooglePlacePoint();
    }
  }

  /**
   * Schedules destruction of Google Place point visualization after 4 seconds.
   * Clears any existing timeout first to prevent multiple simultaneous timers.
   */
  function timeoutDestroyGooglePlacePoint() {
    if (_destroyGooglePlacePointTimeoutId) clearTimeout(_destroyGooglePlacePointTimeoutId);
    _destroyGooglePlacePointTimeoutId = setTimeout(() => destroyGooglePlacePoint(), 4000);
  }

  /**
   * Removes Google Place point and line features from the wmeph_google_link map layer.
   * Called when visualization timeout expires or when user interaction ends.
   */
  function destroyGooglePlacePoint() {
    if (_googlePlacePtFeature || _googlePlaceLineFeature) {
      try {
        // Remove features from the layer using SDK
        if (_googlePlacePtFeature?.id) {
          sdk.Map.removeAllFeaturesFromLayer({ layerName: 'wmeph_google_link' });
        }
      } catch (e) {
        logDev('destroyGooglePlacePoint: Failed to remove features', e);
      }
      _googlePlacePtFeature = null;
      _googlePlaceLineFeature = null;
    }
  }

  /**
   * Attaches hover event handlers to a Google Places link element.
   * On hover-in, draws the place point on map. On hover-out, destroys visualization.
   * @param {jQuery} $el jQuery element containing the Google place link row.
   */
  function addGoogleLinkHoverEvent($el) {
    $el.hover(
      () => drawGooglePlacePoint(getGooglePlaceUuidFromElement($el)),
      () => destroyGooglePlacePoint(),
    );
  }

  /**
   * Extracts the Google Place UUID from an HTML element's 'uuid' attribute.
   * @param {jQuery} $el jQuery element with a uuid attribute.
   * @returns {string} The Google Place ID.
   */
  function getGooglePlaceUuidFromElement($el) {
    return $el.attr('uuid');
  }

  /**
   * Builds and renders the services banner UI showing applicable services for the selected venue.
   * Populates checkboxes and buttons for adding/toggling services. Hidden for residential venues.
   * @param {boolean} chainIsClosed Whether the venue is part of a closed chain (affects display).
   */
  function assembleServicesBanner(chainIsClosed) {
    if ($('#WMEPH_services').length === 0) {
      $('#WMEPH_banner').after(
        $('<div id="WMEPH_services">').css({
          color: document.body.getAttribute('wz-theme') === 'dark' ? '#e8eaed' : '#202124',
          'font-size': '15px',
          'margin-left': '6px',
          'background-color': 'transparent',
          padding: '4px 0',
        }),
      );
    } else {
      $('#WMEPH_services').empty();
    }

    const venue = getSelectedVenue();
    if (venue && !chainIsClosed && !$('#WMEPH-HideServicesButtons').prop('checked')) {
      // setup Add Service Buttons for suggested services
      const rowDivs = [];
      if (!isVenueResidential(venue)) {
        const $rowDiv = $('<div id="WMEPH_servicesIconsContainer">').css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center',
        });
        const servButtHeight = '27';
        const buttons = [];
        const applicableServices = getApplicableServices(venue);
        const isParkingLot = isVenueParkingLot(venue);
        Object.keys(_servicesBanner).forEach((tempKey) => {
          const rowData = _servicesBanner[tempKey];
          const isApplicable = !rowData.serviceId || applicableServices.includes(rowData.serviceId);
          // Exclude non-PL versions on parking lots, and PL versions on general venues
          const isBtnForWrongVenueType =
            (isParkingLot && (tempKey === 'addValet' || tempKey === 'addReservations')) ||
            (!isParkingLot && (tempKey === 'addValetPL' || tempKey === 'addReservationsPL' || tempKey === 'addValletServicePL'));
          if (rowData.active && isApplicable && !isBtnForWrongVenueType) {
            //  If the particular service is active AND applicable to this venue type
            const $input = $('<input>', {
              class: rowData.icon,
              id: `WMEPH_${tempKey}`,
              type: 'button',
              title: rowData.title,
            }).css({
              border: 0,
              'background-size': 'contain',
              height: '27px',
              width: `${Math.ceil(servButtHeight * rowData.w2hratio).toString()}px`,
            });
            buttons.push($input);
            // Swap class based on checked state
            if (rowData.checked) {
              $input.removeClass(rowData.icon).addClass(rowData.icon + '-active');
            }
            $rowDiv.append($input);
          }
        });
        if ($rowDiv.length) {
          $rowDiv.prepend('<span class="control-label" title="Verify all Place services before saving">Services (select any that apply):</span><br>');
        }
        rowDivs.push($rowDiv);
      }
      $('#WMEPH_services').append(rowDivs);

      // Setup bannServ onclicks
      if (!isVenueResidential(venue)) {
        setupButtonsOld(_servicesBanner);
      }
    }
  }

  /**
   * Attaches onclick handlers to banner flag buttons using modern Flag class methods.
   * Loops through flags and binds primary action, secondary action, and whitelist buttons.
   * @param {Array<FlagBase>} flags Array of Flag objects from FlagBase.currentFlags.getOrderedFlags().
   */
  function setupButtons(flags) {
    flags.forEach((flag) => {
      // Loop through the banner possibilities
      if (flag.action && flag.buttonText) {
        // If there is an action, set onclick
        buttonAction(flag);
      }
      if (flag.action2 && flag.value2) {
        // If there is an action2, set onclick
        buttonAction2(flag);
      }
      // If there's a WL option, set up onclick
      if (flag.showWL && flag.WLaction) {
        buttonWhitelist(flag);
      }
    });
  }

  /**
   * Attaches onclick handlers to banner buttons using legacy object-based banner data.
   * Used for duplicate and service banners which use object key-value structure instead of Flag classes.
   * @param {Object} banner Object with banner data keyed by flagKey (e.g., _dupeBanner, _buttonBanner2).
   */
  function setupButtonsOld(banner) {
    Object.keys(banner).forEach((flagKey) => {
      const flag = banner[flagKey];
      if (flag?.active && flag.action && flag.value) {
        buttonActionOld(flagKey, flag);
      }
      if (flag?.WLactive && flag.WLaction) {
        buttonWhitelistOld(flagKey, flag);
      }
    });
  }

  /**
   * Sets onclick handler for a legacy banner button that executes the flag's action.
   * Calls harmonizePlaceGo to refresh the banner after action unless noBannerAssemble flag is set.
   * @param {string} flagKey The key identifying this flag (used to find the button element).
   * @param {Object} flag The legacy banner flag object containing the action callback.
   */
  function buttonActionOld(flagKey, flag) {
    const button = document.getElementById(`WMEPH_${flagKey}`);
    if (!button) return;
    button.onclick = () => {
      // Service buttons expect (actions, checked) parameters
      // Pass undefined for actions (no action list for service toggles) and undefined for checked (auto-toggle)
      flag.action(undefined, undefined);
      if (!flag.noBannerAssemble) harmonizePlaceGo(getSelectedVenue(), 'harmonize');
    };
  }
  /**
   * Sets onclick handler for a legacy banner whitelist button.
   * Passes flagKey as parameter to WLaction if it matches a venue ID pattern (5+ digits), otherwise no param.
   * Deactivates the button and sets severity to green after whitelisting.
   * @param {string} flagKey The key identifying this flag (venue ID or other identifier).
   * @param {Object} flag The legacy banner flag object containing the WLaction callback.
   * @returns {HTMLElement} The button element.
   */
  function buttonWhitelistOld(flagKey, flag) {
    const button = document.getElementById(`WMEPH_WL${flagKey}`);
    button.onclick = () => {
      if (flagKey.match(/^\d{5,}/) !== null) {
        flag.WLaction(flagKey);
      } else {
        flag.WLaction();
      }
      flag.WLactive = false;
      flag.severity = SEVERITY.GREEN;
    };
    return button;
  }

  /**
   * Sets onclick handler for a modern Flag class button that executes the flag's primary action.
   * Triggers banner refresh via harmonizePlaceGo unless noBannerAssemble is set.
   * @param {FlagBase} flag The modern Flag object containing the action callback and name.
   * @returns {HTMLElement} The button element.
   */
  function buttonAction(flag) {
    const button = document.getElementById(`WMEPH_${flag.name}`);
    button.onclick = () => {
      flag.action();
      if (!flag.noBannerAssemble) harmonizePlaceGo(getSelectedVenue(), 'harmonize');
    };
    return button;
  }

  /**
   * Sets onclick handler for a modern Flag class button that executes the flag's secondary action.
   * Triggers banner refresh via harmonizePlaceGo unless noBannerAssemble is set.
   * @param {FlagBase} flag The modern Flag object containing the action2 callback and name.
   * @returns {HTMLElement} The button element.
   */
  function buttonAction2(flag) {
    const button = document.getElementById(`WMEPH_${flag.name}_2`);
    button.onclick = () => {
      flag.action2();
      if (!flag.noBannerAssemble) harmonizePlaceGo(getSelectedVenue(), 'harmonize');
    };
    return button;
  }

  /**
   * Sets onclick handler for a modern Flag class whitelist button.
   * Passes flag.name to WLaction if it matches a venue ID pattern (5+ digits), otherwise no param.
   * @param {FlagBase} flag The modern Flag object containing the WLaction callback and name.
   * @returns {HTMLElement} The button element.
   */
  function buttonWhitelist(flag) {
    const button = document.getElementById(`WMEPH_WL${flag.name}`);
    button.onclick = () => {
      if (flag.name.match(/^\d{5,}/) !== null) {
        flag.WLaction(flag.name);
      } else {
        flag.WLaction();
      }
    };
    return button;
  }

  /**
   * Checks if a checkbox/setting ID is enabled by retrieving its stored value.
   * @param {string} id The setting ID to check.
   * @returns {boolean} True if the setting value equals '1', false otherwise.
   */
  function isChecked(id) {
    return getWMEPHSetting(id) === '1';
  }

  /**
   * Updates a checkbox's stored setting value and applies visual styling.
   * Toggles color (#0075e3 for checked, #999 for unchecked) and opacity.
   * Only updates if the current state differs from the target state.
   * @param {string} id The setting ID to update.
   * @param {boolean} checkedState The target checked state.
   */
  function setCheckbox(id, checkedState) {
    const currentState = isChecked(id);
    if (currentState !== checkedState) {
      setWMEPHSetting(id, checkedState ? '1' : '0');
      const $button = $(`#${id}`);
      $button.css({
        color: checkedState ? '#0075e3' : '#999',
        opacity: checkedState ? '1' : '0.5',
      });
    }
  }
  /**
   * Updates multiple checkboxes to the same checked state by calling setCheckbox for each ID.
   * @param {Array<string>} ids Array of setting IDs to update.
   * @param {boolean} checkedState The target checked state for all IDs.
   */
  function setCheckboxes(ids, checkedState) {
    ids.forEach((id) => {
      setCheckbox(id, checkedState);
    });
  }

  /**
   * Copies selected place information to clipboard as JSON for later pasting.
   * Captures address, URL, phone, description, services, hours, and parking lot flag.
   * Called when user clicks the "Copy" button in clone tool.
   */
  function onCopyClicked() {
    const venue = getSelectedVenue();
    const addr = getVenueAddress(venue);

    _cloneMaster = {
      addr: {
        houseNumber: addr.houseNumber,
        street: {
          id: addr?.street?.id,
          name: addr?.street?.name || ''
        },
        city: {
          id: addr?.city?.id,
          name: addr?.city?.name || ''
        },
        state: {
          id: addr?.state?.id,
          name: addr?.state?.name || ''
        },
        country: {
          id: addr?.country?.id,
          name: addr?.country?.name || ''
        }
      },
      url: venue.url || '',
      phone: venue.phone || '',
      description: venue.description || '',
      services: venue.services || [],
      openingHours: venue.openingHours || [],
      isPLA: isVenueParkingLot(venue),
    };

    GM_setClipboard(JSON.stringify(_cloneMaster, null, 2));
    logDev('Place Cloned');
  }
  /**
   * Pastes previously copied place information into the selected venue.
   * Called when user clicks the "Paste" button in clone tool.
   */
  function onPasteClicked() {
    clonePlace();
  }

  /**
   * Enables all clone checkboxes (house number, street, city, URL, phone, services, description, hours).
   * Called when user clicks the "All" preset button in clone tool.
   */
  function onCheckAllCloneClicked() {
    setCheckboxes(['WMEPH_CPhn', 'WMEPH_CPstr', 'WMEPH_CPcity', 'WMEPH_CPurl', 'WMEPH_CPph', 'WMEPH_CPserv', 'WMEPH_CPdesc', 'WMEPH_CPhrs'], true);
  }

  /**
   * Enables only address-related clone checkboxes (house number, street, city).
   * Called when user clicks the "Addr" preset button in clone tool.
   */
  function onCheckAddrCloneClicked() {
    setCheckboxes(['WMEPH_CPhn', 'WMEPH_CPstr', 'WMEPH_CPcity'], true);
    setCheckboxes(['WMEPH_CPurl', 'WMEPH_CPph', 'WMEPH_CPserv', 'WMEPH_CPdesc', 'WMEPH_CPhrs'], false);
  }

  /**
   * Disables all clone checkboxes.
   * Called when user clicks the "None" preset button in clone tool.
   */
  function onCheckNoneCloneClicked() {
    setCheckboxes(['WMEPH_CPhn', 'WMEPH_CPstr', 'WMEPH_CPcity', 'WMEPH_CPurl', 'WMEPH_CPph', 'WMEPH_CPserv', 'WMEPH_CPdesc', 'WMEPH_CPhrs'], false);
  }

  /**
   * Creates and displays the clone tool UI with copy/paste buttons and field checkboxes.
   * Buttons allow selecting which place fields to copy/paste. Only shown if clone mode is enabled.
   * Updates paste button visibility based on user edit permissions.
   */
  function showCloneButton() {
    if (!$('#clonePlace').length) {
      // Row 2: Copy, Paste, All, Addr, None buttons
      const $row2 = $('<div>', { class: 'wmeph-clone-row' });
      $row2.append(
        $('<input>', {
          class: 'btn btn-warning btn-xs wmeph-clone-btn',
          id: 'clonePlace',
          title: 'Copy place info',
          type: 'button',
          value: 'Copy',
          style: 'font-weight: normal',
        }).click(onCopyClicked),
        $('<input>', {
          class: 'btn btn-warning btn-xs wmeph-clone-btn',
          id: 'pasteClone',
          title: 'Apply the Place info. (Ctrl-Alt-O)',
          type: 'button',
          value: 'Paste (for ✓ boxes):',
          style: 'font-weight: normal; margin-left: 3px;',
        }).click(onPasteClicked),
        $('<input>', {
          class: 'btn btn-info btn-xs wmeph-clone-btn',
          id: 'checkAllClone',
          title: 'Check all',
          type: 'button',
          value: 'All',
          style: 'font-weight: normal; margin-left: 3px;',
        }).click(onCheckAllCloneClicked),
        $('<input>', {
          class: 'btn btn-info btn-xs wmeph-clone-btn',
          id: 'checkAddrClone',
          title: 'Check address',
          type: 'button',
          value: 'Addr',
          style: 'font-weight: normal; margin-left: 3px;',
        }).click(onCheckAddrCloneClicked),
        $('<input>', {
          class: 'btn btn-info btn-xs wmeph-clone-btn',
          id: 'checkNoneClone',
          title: 'Check none',
          type: 'button',
          value: 'None',
          style: 'font-weight: normal; margin-left: 3px;',
        }).click(onCheckNoneCloneClicked),
      );

      // Row 3: All checkboxes (HN, Str, City, URL, Ph, Desc, Serv, Hrs)
      const $row3 = $('<div>', { class: 'wmeph-clone-row' });
      $row3.append(
        createCloneCheckbox('wmeph-clone-row', 'WMEPH_CPhn', 'HN'),
        createCloneCheckbox('wmeph-clone-row', 'WMEPH_CPstr', 'Str'),
        createCloneCheckbox('wmeph-clone-row', 'WMEPH_CPcity', 'City'),
        createCloneCheckbox('wmeph-clone-row', 'WMEPH_CPurl', 'URL'),
        createCloneCheckbox('wmeph-clone-row', 'WMEPH_CPph', 'Ph'),
        createCloneCheckbox('wmeph-clone-row', 'WMEPH_CPdesc', 'Desc'),
        createCloneCheckbox('wmeph-clone-row', 'WMEPH_CPserv', 'Serv'),
        createCloneCheckbox('wmeph-clone-row', 'WMEPH_CPhrs', 'Hrs'),
      );

      $('#wmeph-run-panel').append($row2, $row3);
    }
    const venue = getSelectedVenue();
    const canEdit = venue?.approved && venue?.lockRank < USER.rank;
    updateElementEnabledOrVisible($('#pasteClone'), canEdit);
  }

  /**
   * Opens PlugShare website centered on the selected venue's location.
   * Respects user setting for opening in new tab or search results window.
   * Called when user clicks the "PS" (PlugShare) button in the main panel.
   */
  function onPlugshareSearchClick() {
    const venue = getSelectedVenue();
    const centroid = getVenueCentroid(venue);
    if (!centroid) {
      logDev('onPlugshareSearchClick: Unable to get venue centroid');
      return;
    }
    // centroid is already [lon, lat] in WGS84, no conversion needed
    const url = `https://www.plugshare.com/?latitude=${centroid[1]}&longitude=${centroid[0]}&spanLat=.005&spanLng=.005`;
    if ($('#WMEPH-WebSearchNewTab').prop('checked')) {
      window.open(url);
    } else {
      window.open(url, 'WMEPH - PlugShare Search', _searchResultsWindowSpecs);
    }
  }

  /**
   * Opens the venue's website URL in a browser.
   * Automatically prepends http:// if URL doesn't start with http/https. Shows error alert if no URL is set.
   * Respects user setting for opening in new tab or search results window.
   * Called when user clicks the "Website" button in the main panel.
   */
  function onOpenWebsiteClick() {
    const venue = getSelectedVenue();
    let url = venue.url;
    if (!url) {
      WazeWrap.Alerts.error(SCRIPT_NAME, 'No website set for this place.');
      return;
    }
    if (url.match(/^http/i) === null) {
      url = `http://${url}`;
    }
    try {
      if ($('#WMEPH-WebSearchNewTab').prop('checked')) {
        window.open(url);
      } else {
        window.open(url, SEARCH_RESULTS_WINDOW_NAME, _searchResultsWindowSpecs);
      }
    } catch (ex) {
      logDev(ex);
      WazeWrap.Alerts.error(SCRIPT_NAME, "Possible invalid URL. Check the place's Website field.");
    }
  }

  /**
   * Opens a Google search for the selected venue by name, address, and house number.
   * Shows error alert if state and country are not set. Respects user setting for tab vs. window.
   * Called when user clicks the "Google" button in the main panel.
   */
  function onGoogleSearchClick() {
    const venue = getSelectedVenue();
    const addr = getVenueAddress(venue);
    if (addr?.state && addr?.country) {
      const url = buildGLink(venue.name, addr, addr.houseNumber);
      if ($('#WMEPH-WebSearchNewTab').prop('checked')) {
        window.open(url);
      } else {
        window.open(url, SEARCH_RESULTS_WINDOW_NAME, _searchResultsWindowSpecs);
      }
    } else {
      WazeWrap.Alerts.error(SCRIPT_NAME, "The state and country haven't been set for this place yet.  Edit the address first.");
    }
  }

  /**
   * Controls visibility and enabled/disabled state of a jQuery DOM element.
   * Accepts an object with 'visible' and/or 'enabled' boolean properties.
   * @param {jQuery} $elem jQuery element to modify.
   * @param {Object} props Object with optional 'visible' and 'enabled' boolean properties.
   */
  function updateElementEnabledOrVisible($elem, props) {
    if (props.hasOwnProperty('visible')) {
      if (props.visible) {
        $elem.show();
      } else {
        $elem.hide();
      }
    }
    if (props.hasOwnProperty('enabled')) {
      $elem.prop('disabled', !props.enabled);
    }
  }

  /**
   * Creates or updates the main WMEPH panel UI in the edit pane when a venue is selected.
   * Builds buttons (Run, Website, Google, PlugShare), banner areas, and clone tool if enabled.
   * Checks for backend feeds and shows warning if place is connected to external data sources.
   * @param {boolean} clearBanner Whether to remove the entire WMEPH section (triggered when venue loses edit access).
   */
  function updateWmephPanel(clearBanner = false) {
    logDev(`updateWmephPanel: clearBanner=${clearBanner}`);

    const venue = getSelectedVenue();

    if (!venue) {
      $('#wmeph-section').remove();
      destroyDupeLabels(); // Clear dupe labels when no place is selected
      _dupeIDList = []; // Reset dupe list
      return;
    }

    if (!venue.approved || venue.lockRank >= USER.rank) {
      clearBanner = true;
    }

    if (clearBanner) {
      $('#wmeph-section').remove();
      destroyDupeLabels(); // Clear dupe labels when banner is cleared
    }

    let $wmephPanel;
    let $wmephPrePanel;
    let $wmephRunPanel;
    let $runButton;
    let $websiteButton;
    let $googleSearchButton;
    let $plugshareSearchButton;

    if (!$('#wmeph-section').length) {
      const devVersSuffix = IS_BETA_VERSION ? '-β' : '';

      // Create section wrapper and header
      const $wmephSection = $('<div>', { id: 'wmeph-section', class: 'wmeph-section' });
      const $sectionHeader = $('<div>', { class: 'wmeph-section-header' }).html('<span>⚙️ WMEPH</span>');
      const $sectionBody = $('<div>', { class: 'wmeph-section-body' });

      // Create panels
      $wmephPrePanel = $('<div>', { id: 'wmeph-pre-panel' });
      $wmephPanel = $('<div>', { id: 'wmeph-panel' });
      $wmephRunPanel = $('<div>', { id: 'wmeph-run-panel' });

      // Create Bootstrap buttons
      $runButton = $('<input>', {
        class: 'btn btn-primary btn-sm wmeph-run-btn',
        id: 'runWMEPH',
        title: `Run WMEPH${devVersSuffix} on Place`,
        type: 'button',
        value: `Run WMEPH${devVersSuffix}`,
      }).click(() => {
        harmonizePlace();
      });

      $websiteButton = $('<input>', {
        class: 'btn btn-success btn-sm wmeph-run-btn',
        id: 'WMEPHurl',
        title: 'Open place URL',
        type: 'button',
        value: 'Website',
      }).click(onOpenWebsiteClick);

      $googleSearchButton = $('<input>', {
        class: 'btn btn-danger btn-sm wmeph-run-btn',
        id: 'wmephSearch',
        title: 'Search the web for this place.  Do not copy info from 3rd party sources!',
        type: 'button',
        value: 'Google',
      }).click(onGoogleSearchClick);

      $plugshareSearchButton = $('<input>', {
        class: 'btn btn-danger btn-sm wmeph-run-btn',
        id: 'wmephPlugShareSearch',
        title: 'Open PlugShare website',
        type: 'button',
        value: 'PS',
      }).click(onPlugshareSearchClick);

      // Build panel hierarchy - buttons first in run panel
      $wmephRunPanel.append($runButton, $websiteButton, $googleSearchButton, $plugshareSearchButton);

      // Add panels to section body - run panel first (always at top), then the banner/services panel
      $sectionBody.append($wmephRunPanel, $wmephPrePanel, $wmephPanel);

      // Build section
      $wmephSection.append($sectionHeader, $sectionBody);

      // Insert section into edit panel
      $('#edit-panel > .contents').prepend($wmephSection);
    } else {
      $wmephPrePanel = $('#wmeph-pre-panel');
      $wmephPanel = $('#wmeph-panel');
      $wmephRunPanel = $('#wmeph-run-panel');
      $runButton = $('#runWMEPH');
      $websiteButton = $('#WMEPHurl');
      $googleSearchButton = $('#wmephSearch');
      $plugshareSearchButton = $('#wmephPlugShareSearch');
    }

    const canEdit = venue.approved && venue.lockRank < USER.rank;
    updateElementEnabledOrVisible($runButton, { enabled: canEdit });
    updateElementEnabledOrVisible($websiteButton, { enabled: venue.url?.trim().length, visible: !isVenueResidential(venue) });
    updateElementEnabledOrVisible($googleSearchButton, { enabled: !isVenueResidential(venue), visible: !isVenueResidential(venue) });
    updateElementEnabledOrVisible($plugshareSearchButton, { visible: isVenueChargingStation(venue) });

    if (getWMEPHSetting('WMEPH-EnableCloneMode') === '1') {
      showCloneButton();
    }
    // If the user selects a place in the dupe list, don't clear the labels yet
    if (_dupeIDList.includes(venue.id)) {
      destroyDupeLabels();
    }

    // Check if there's a backend feed
    // TODO: put this in a separate function?
    if (venue) {
      const venueID = venue.id; // Capture venue ID to verify response is for current venue
      $wmephPrePanel.empty(); // Clear old feed banners before fetching new ones

      // Abort previous request if still pending (prevents duplicate banners from race conditions)
      if (_pendingFeedRequest) _pendingFeedRequest.abort();

      // It doesn't seem to matter what we pass for lon/lat, so use first geometry point.
      const firstPoint = isVenuePoint(venue) ? venue.geometry.coordinates : venue.geometry.coordinates[0][0];
      const lon = firstPoint[0];
      const lat = firstPoint[1];
      const url = `https://${location.host}/SearchServer/mozi?lon=${lon}&lat=${lat}&format=PROTO_JSON_FULL&venue_id=venues.${venue.id}`;
      _pendingFeedRequest = $.getJSON(url)
        .done((res) => {
          // Only append if still on same venue (prevents stale responses from accumulating)
          const currentVenue = getSelectedVenue();
          if (!currentVenue || currentVenue.id !== venueID) return;

          let feedNames = res.venue.external_providers?.filter((prov) => !FEEDS_TO_SKIP.some((skipRegex) => skipRegex.test(prov.provider))).map((prov) => prov.provider);
          if (feedNames) feedNames = [...new Set(feedNames)]; // Remove duplicates
          if (feedNames?.length) {
            const $rowDiv = $('<div>').css({ padding: '3px 4px 0px 4px', 'background-color': 'yellow' });
            $rowDiv.append(
              $('<div>').text('PLEASE DO NOT DELETE').css({ 'font-weight': '500' }),
              $('<div>')
                .text(`Place is connected to the following feed${feedNames.length > 1 ? 's' : ''}:`)
                .css({ 'font-size': '13px' }),
              $('<div>').text(feedNames.join(', ')).css({ 'font-size': '13px' }),
            );
            $wmephPrePanel.append($rowDiv);
            // Potential code to hide the delete key if needed.
            // setTimeout(() => $('#delete-button').setAttribute('disabled', true), 200);
          }
          _pendingFeedRequest = null; // Clear request tracker when done
        })
        .fail(() => {
          _pendingFeedRequest = null;
        }); // Clear on error too
    }
  }

  /**
   * Applies previously copied place information to the selected venue based on enabled checkboxes.
   * Updates URL, phone, description, services, hours, and address fields as selected.
   * Shows log message if no data has been copied yet or if copy/paste is successful.
   */
  function clonePlace() {
    log('Cloning info...');
    if (_cloneMaster !== null && _cloneMaster.hasOwnProperty('url')) {
      const venue = getSelectedVenue();
      const cloneItems = {};
      let updateItem = false;
      if (isChecked('WMEPH_CPurl')) {
        cloneItems.url = _cloneMaster.url;
        updateItem = true;
      }
      if (isChecked('WMEPH_CPph')) {
        cloneItems.phone = _cloneMaster.phone;
        updateItem = true;
      }
      if (isChecked('WMEPH_CPdesc')) {
        cloneItems.description = _cloneMaster.description;
        updateItem = true;
      }
      if (isChecked('WMEPH_CPserv') && isVenueParkingLot(venue) === _cloneMaster.isPLA) {
        cloneItems.services = _cloneMaster.services;
        updateItem = true;
      }
      if (isChecked('WMEPH_CPhrs')) {
        cloneItems.openingHours = _cloneMaster.openingHours;
        updateItem = true;
      }
      if (updateItem) {
        addUpdateAction(venue, cloneItems);
        logDev('Venue details cloned');
      }

      const copyStreet = isChecked('WMEPH_CPstr');
      const copyCity = isChecked('WMEPH_CPcity');
      const copyHn = isChecked('WMEPH_CPhn');

      if (copyStreet || copyCity || copyHn) {
        const originalAddress = sdk.DataModel.Venues.getAddress({ venueId: venue.id });
        const newAddress = {
          street: copyStreet ? _cloneMaster.addr.street : originalAddress.street,
          city: copyCity ? _cloneMaster.addr.city : originalAddress.city,
          state: copyCity ? _cloneMaster.addr.state : originalAddress.state,
          country: copyCity ? _cloneMaster.addr.country : originalAddress.country,
          houseNumber: copyHn ? _cloneMaster.addr.houseNumber : originalAddress.houseNumber,
        };
        updateAddress(venue, newAddress);
        logDev('Venue address cloned');
      }
    } else {
      log('Please copy a place');
    }
  }

  /**
   * Converts an opening hours object into a human-readable string (e.g., "Monday 09:00-17:00").
   * @param {Object} hourEntry WME opening hours entry with fromHour, toHour, and days array.
   * @returns {string} Formatted hours string with day names and times.
   */
  function formatOpeningHour(hourEntry) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hours = `${hourEntry.fromHour}-${hourEntry.toHour}`;
    return hourEntry.days.map((day) => `${dayNames[day]} ${hours}`).join(', ');
  }

  /**
   * Converts a venue's opening hours into an array of human-readable strings.
   * Returns null if venue or openingHours are missing.
   * @param {Object} venue The WME venue object.
   * @returns {Array<string>|null} Array of formatted hour strings, or null if hours unavailable.
   */
  function getOpeningHours(venue) {
    return venue && venue.openingHours && venue.openingHours.map(formatOpeningHour);
  }

  /**
   * Detects if a venue has overlapping opening hours on any day of the week.
   * Compares all hour ranges for each day and returns true if any overlap is found.
   * @param {Array<Object>} openingHours Array of WME opening hours objects.
   * @returns {boolean} True if any overlapping hours detected, false otherwise.
   */
  function venueHasOverlappingHours(openingHours) {
    if (openingHours.length < 2) {
      return false;
    }

    for (let day2Ch = 0; day2Ch < 7; day2Ch++) {
      // Go thru each day of the week
      const daysObj = [];
      for (let hourSet = 0; hourSet < openingHours.length; hourSet++) {
        // For each set of hours
        if (openingHours[hourSet].days.includes(day2Ch)) {
          // pull out hours that are for the current day, add 2400 if it goes past midnight, and store
          const fromHourTemp = openingHours[hourSet].fromHour.replace(/:/g, '');
          let toHourTemp = openingHours[hourSet].toHour.replace(/:/g, '');
          if (toHourTemp <= fromHourTemp) {
            toHourTemp = parseInt(toHourTemp, 10) + 2400;
          }
          daysObj.push([fromHourTemp, toHourTemp]);
        }
      }
      if (daysObj.length > 1) {
        // If there's multiple hours for the day, check them for overlap
        for (let hourSetCheck2 = 1; hourSetCheck2 < daysObj.length; hourSetCheck2++) {
          for (let hourSetCheck1 = 0; hourSetCheck1 < hourSetCheck2; hourSetCheck1++) {
            if (daysObj[hourSetCheck2][0] > daysObj[hourSetCheck1][0] && daysObj[hourSetCheck2][0] < daysObj[hourSetCheck1][1]) {
              return true;
            }
            if (daysObj[hourSetCheck2][1] > daysObj[hourSetCheck1][0] && daysObj[hourSetCheck2][1] < daysObj[hourSetCheck1][1]) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Finds nearby duplicate venues by name/alias similarity and physical proximity.
   * Searches within 800m radius and performs name matching with variations (letters only, no numbers).
   * Returns array of duplicate venue names and a flag indicating overlapping geometry.
   * Populates _dupeIDList and draws map labels for all found duplicates.
   * @param {string} selectedVenueName The primary name of the venue to search duplicates for.
   * @param {Array<string>} selectedVenueAliases Alternative names for the venue.
   * @param {Object} selectedVenue The WME venue object with geometry and metadata.
   * @returns {Array} [duplicateNameArray, overlappingFlag] - duplicate names and overlap indicator.
   */
  function findNearbyDuplicate(selectedVenueName, selectedVenueAliases, selectedVenue) {
    const formatName = (name) =>
      name
        .toUpperCase()
        .replace(/ AND /g, '')
        .replace(/^THE /g, '')
        .replace(/[^A-Z0-9]/g, '');

    const allowedTwoLetters = ['BP', 'DQ', 'BK', 'BW', 'LQ', 'QT', 'DB', 'PO'];

    let overlappingFlag = false;

    const selectedCentroid = getVenueCentroid(selectedVenue);
    if (!selectedCentroid) {
      logDev('findNearbyDuplicate: Unable to get selected venue centroid');
      return [[], false];
    }

    let minLon = selectedCentroid[0];
    let minLat = selectedCentroid[1];
    let maxLon = minLon;
    let maxLat = minLat;

    const dupeNames = [];

    const selectedVenueNameRF = formatName(selectedVenueName);
    let currNameList = [];
    if (selectedVenueNameRF.length > 2 || allowedTwoLetters.includes(selectedVenueNameRF)) {
      currNameList.push(selectedVenueNameRF);
    } else {
      currNameList.push('PRIMNAMETOOSHORT_PJZWX');
    }

    const venueNameNoNum = selectedVenueNameRF.replace(/[^A-Z]/g, '');
    if (((venueNameNoNum.length > 2 && !NO_NUM_SKIP.includes(venueNameNoNum)) || allowedTwoLetters.includes(venueNameNoNum)) && !selectedVenue.categories?.includes('PARKING_LOT')) {
      currNameList.push(venueNameNoNum);
    }

    if (selectedVenueAliases.length > 0) {
      for (let aliix = 0; aliix < selectedVenueAliases.length; aliix++) {
        const aliasNameRF = formatName(selectedVenueAliases[aliix]);
        if ((aliasNameRF.length > 2 && !NO_NUM_SKIP.includes(aliasNameRF)) || allowedTwoLetters.includes(aliasNameRF)) {
          currNameList.push(aliasNameRF);
        }
        const aliasNameNoNum = aliasNameRF.replace(/[^A-Z]/g, '');
        if (((aliasNameNoNum.length > 2 && !NO_NUM_SKIP.includes(aliasNameNoNum)) || allowedTwoLetters.includes(aliasNameNoNum)) && !selectedVenue.categories?.includes('PARKING_LOT')) {
          currNameList.push(aliasNameNoNum);
        }
      }
    }
    currNameList = uniq(currNameList);

    let selectedVenueAddr = getVenueAddress(selectedVenue);
    const selectedVenueHN = selectedVenueAddr.houseNumber;

    const selectedVenueAddrIsComplete = selectedVenueAddr?.street && selectedVenueAddr.street.name && selectedVenueHN && selectedVenueHN.match(/\d/g) !== null;

    const venues = sdk.DataModel.Venues.getAll();
    const selectedVenueId = selectedVenue.id;

    _dupeIDList = [selectedVenueId];
    _dupeHNRangeList = [];
    _dupeHNRangeDistList = [];

    const selectedVenueWL = _venueWhitelist[selectedVenueId];
    const whitelistedDupes = selectedVenueWL && selectedVenueWL.dupeWL ? selectedVenueWL.dupeWL : [];

    const excludePLADupes = $('#WMEPH-ExcludePLADupes').prop('checked');
    let randInt = 100;

    venues.forEach((testVenue) => {
      if ((!excludePLADupes || (excludePLADupes && !(isVenueParkingLot(selectedVenue) || isVenueParkingLot(testVenue)))) && !isEmergencyRoom(testVenue)) {
        const testVenueId = testVenue.id;

        const testCentroid = getVenueCentroid(testVenue);
        if (!testCentroid) return;

        const pt2ptDistance = calculatePointDistance(selectedCentroid, testCentroid);
        if (isVenuePoint(selectedVenue) && isVenuePoint(testVenue) && pt2ptDistance < 2 && selectedVenueId !== testVenueId) {
          overlappingFlag = true;
        }

        let testVenueAddr = getVenueAddress(testVenue);
        const testVenueHN = testVenueAddr.houseNumber;

        if (
          selectedVenueAddrIsComplete &&
          testVenueAddr?.street &&
          testVenueAddr.street.name &&
          testVenueHN &&
          testVenueHN !== '' &&
          testVenueId !== selectedVenueId &&
          selectedVenueAddr.street.name === testVenueAddr.street.name &&
          testVenueHN < 1000000
        ) {
          _dupeHNRangeList.push(parseInt(testVenueHN, 10));
          _dupeHNRangeDistList.push(pt2ptDistance);
        }

        if (
          !whitelistedDupes.includes(testVenueId) &&
          _dupeIDList.length < 6 &&
          pt2ptDistance < 800 &&
          !isVenueResidential(testVenue) &&
          testVenueId !== selectedVenueId &&
          !testVenue.isNew &&
          testVenue.name &&
          testVenue.name.length > 1
        ) {
          let suppressMatch = false;
          if (selectedVenueAddrIsComplete && testVenueAddr?.street && testVenueAddr.street.name && testVenueHN && testVenueHN.match(/\d/g) !== null) {
            if (selectedVenue.lockRank > 0 && testVenue.lockRank > 0) {
              if (selectedVenueAddr.houseNumber !== testVenueHN || selectedVenueAddr.street.name !== testVenueAddr.street.name) {
                suppressMatch = true;
              }
            } else if (selectedVenueHN !== testVenueHN && selectedVenueAddr.street.name !== testVenueAddr.street.name) {
              suppressMatch = true;
            }
          }

          if (!suppressMatch) {
            let testNameList;
            const strippedTestName = formatName(testVenue.name).replace(/\s+[-(].*$/, '');
            if ((strippedTestName.length > 2 && !NO_NUM_SKIP.includes(strippedTestName)) || allowedTwoLetters.includes(strippedTestName)) {
              testNameList = [strippedTestName];
            } else {
              testNameList = [`TESTNAMETOOSHORTQZJXS${randInt}`];
              randInt++;
            }

            const testNameNoNum = strippedTestName.replace(/[^A-Z]/g, '');
            if (((testNameNoNum.length > 2 && !NO_NUM_SKIP.includes(testNameNoNum)) || allowedTwoLetters.includes(testNameNoNum)) && !testVenue.categories?.includes('PARKING_LOT')) {
              testNameList.push(testNameNoNum);
            }

            let nameMatch = false;
            for (let tnlix = 0; tnlix < testNameList.length; tnlix++) {
              for (let cnlix = 0; cnlix < currNameList.length; cnlix++) {
                if (testNameList[tnlix].includes(currNameList[cnlix]) || currNameList[cnlix].includes(testNameList[tnlix])) {
                  nameMatch = true;
                  break;
                }
              }
              if (nameMatch) break;
            }

            let altNameMatch = -1;
            if (!nameMatch && testVenue.aliases?.length > 0) {
              for (let aliix = 0; aliix < testVenue.aliases.length; aliix++) {
                const aliasNameRF = formatName(testVenue.aliases[aliix]);
                if ((aliasNameRF.length > 2 && !NO_NUM_SKIP.includes(aliasNameRF)) || allowedTwoLetters.includes(aliasNameRF)) {
                  testNameList = [aliasNameRF];
                } else {
                  testNameList = [`ALIASNAMETOOSHORTQOFUH${randInt}`];
                  randInt++;
                }
                const aliasNameNoNum = aliasNameRF.replace(/[^A-Z]/g, '');
                if (((aliasNameNoNum.length > 2 && !NO_NUM_SKIP.includes(aliasNameNoNum)) || allowedTwoLetters.includes(aliasNameNoNum)) && !testVenue.categories?.includes('PARKING_LOT')) {
                  testNameList.push(aliasNameNoNum);
                } else {
                  testNameList.push(`111231643239${randInt}`);
                  randInt++;
                }
              }
              for (let tnlix = 0; tnlix < testNameList.length; tnlix++) {
                for (let cnlix = 0; cnlix < currNameList.length; cnlix++) {
                  if (testNameList[tnlix].includes(currNameList[cnlix]) || currNameList[cnlix].includes(testNameList[tnlix])) {
                    altNameMatch = Math.floor(tnlix / 2);
                    break;
                  }
                }
                if (altNameMatch > -1) break;
              }
            }

            if (nameMatch || altNameMatch > -1) {
              _dupeIDList.push(testVenue.id);
              const labelText = nameMatch ? testVenue.name : `${testVenue.aliases[altNameMatch]} (Alt)`;
              logDev(`Possible duplicate found. WME place: ${selectedVenueName} / Nearby place: ${labelText}`);

              dupeNames.push(labelText);

              // Add Point feature to dupe labels layer
              try {
                const dupeFeature = {
                  id: `dupe_${testVenue.id}`,
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: testCentroid },
                  properties: {
                    label: labelText || 'Unknown',
                    venueId: testVenue.id,
                    dupeType: nameMatch ? 'name' : 'alias',
                  },
                };
                logDev(`Adding dupe feature: ${labelText} at [${testCentroid}]`);
                sdk.Map.addFeatureToLayer({
                  layerName: _dupeLayer,
                  feature: dupeFeature,
                });
              } catch (e) {
                logDev('Error adding dupe feature to layer:', e);
              }
            }
          }
        }
      }
    });

    if (_dupeIDList.length > 1) {
      // Add Point feature for the selected venue (primary place)
      try {
        const selectedFeature = {
          id: `dupe_primary_${selectedVenueId}`,
          type: 'Feature',
          geometry: { type: 'Point', coordinates: selectedCentroid },
          properties: {
            label: selectedVenueName || 'Primary',
            venueId: selectedVenueId,
            dupeType: 'primary',
          },
        };
        logDev(`Adding primary feature: ${selectedVenueName} at [${selectedCentroid}]`);
        sdk.Map.addFeatureToLayer({
          layerName: _dupeLayer,
          feature: selectedFeature,
        });
      } catch (e) {
        logDev('Error adding selected venue feature to layer:', e);
      }
    }

    return [dupeNames, overlappingFlag];
  } // END findNearbyDuplicate function

  /**
   * Infers a venue's address from nearby road segments using node-based search algorithm.
   * Algorithm:
   * 1. Find closest node to venue (point-to-point distance via Turf.js)
   * 2. Build segment index for O(1) node->segments lookups
   * 3. Search recursively from closest node outward, collecting all named streets at each depth
   * 4. Rank candidates by distance first (closest within 10m tolerance), then by road type priority
   * 5. Road type priority: PRIVATE_ROAD > STREET > PRIMARY_STREET > MAJOR_HIGHWAY > MINOR_HIGHWAY > ALLEY
   * 6. Excludes: freeways, ramps, walkways, railroads, parking lot roads, and other non-drivable types
   * @param {Object} venue The WME venue object with navigationPoints or geometry/centroid.
   * @param {number} maxRecursionDepth Maximum connectivity depth to search through segments.
   * @returns {Object|null} Address object with country, city, state, street fields, or null if unavailable.
   */
  function inferAddress(venue, maxRecursionDepth) {
    // Excluded road types (non-addressable/non-drivable): freeways, ramps, walkways, railroads,
    // pedestrian paths, ferries, and other non-street segments.
    // NOTE: Parking lot roads (18) are traversable for connectivity but won't be selected as final addresses.
    const IGNORE_ROAD_TYPES = [3, 4, 5, 8, 9, 10, 15, 16, 19, 20];
    let inferredAddress = {
      country: null,
      city: null,
      state: null,
      street: null,
    };

    // Get segments and nodes from SDK
    let segments, nodes;
    try {
      segments = sdk.DataModel.Segments.getAll() || [];
    } catch (e) {
      logDev('inferAddress: Unable to access SDK data', e);
      segments = [];
    }

    let stopPoint;

    // Make sure a place is selected and data is loaded.
    if (!(venue && segments.length)) {
      logDev('inferAddress: No venue or segment data available');
      return undefined;
    }

    // Check if segment has a named street (vs unnamed segment like connector roads).
    const hasStreetName = (segment) => {
      if (!segment) return false;
      const addr = getSegmentAddress(segment);
      return addr && !addr.isEmpty && addr.street?.name;
    };


    // Get venue's starting point: prefer primary navigation point, else first, else centroid.
    const { navigationPoints } = venue;
    if (navigationPoints?.length) {
      const primaryPoint = navigationPoints.find((pt) => pt.isPrimary === true) || navigationPoints[0];
      stopPoint = primaryPoint.point.coordinates;
      logDev('inferAddress: Using navigation point:', stopPoint);
    } else {
      const centroid = getVenueCentroid(venue);
      if (!centroid) {
        logDev('inferAddress: Unable to get venue centroid');
        return null;
      }
      stopPoint = centroid;
      logDev('inferAddress: Using centroid:', stopPoint);
    }

    // Scan all nearby segments and rank by distance to venue.
    // This avoids the node-connectivity problem and directly finds the closest named street.
    const ptCoords = [stopPoint.longitude || stopPoint[0], stopPoint.latitude || stopPoint[1]];
    const segmentsByDistance = [];

    logDev('inferAddress: Scanning', segments.length, 'segments for closest named street, venue coords:', ptCoords);

    for (const seg of segments) {
      if (!IGNORE_ROAD_TYPES.includes(seg.roadType)) {
        const dist = turf.pointToLineDistance(
          turf.point(stopPoint),
          turf.lineString(seg.geometry.coordinates),
          { units: 'meters' }
        );
        segmentsByDistance.push({
          segment: seg,
          distance: dist,
        });
      }
    }

    // Sort by distance to find closest segments first
    segmentsByDistance.sort((a, b) => a.distance - b.distance);

    logDev('inferAddress: Scanned', segmentsByDistance.length, 'valid segments. Top 3 by distance:');
    segmentsByDistance.slice(0, 3).forEach((item, idx) => {
      const addr = getSegmentAddress(item.segment);
      logDev(`  ${idx + 1}. segment:${item.segment.id} street:"${addr.street?.name || '(unnamed)'}" dist:${item.distance.toFixed(1)}m type:${item.segment.roadType}`);
    });

    // Find first named street within a reasonable search range
    const searchRadiusLimit = 1000; // meters
    for (const { segment, distance } of segmentsByDistance) {
      if (distance > searchRadiusLimit) {
        logDev('inferAddress: Reached search radius limit (' + searchRadiusLimit + 'm) without finding named street');
        break;
      }
      if (hasStreetName(segment)) {
        const addr = getSegmentAddress(segment);
        logDev('inferAddress: FOUND - segment:', segment.id, 'street:', addr.street?.name, 'roadType:', segment.roadType, 'distance:', distance.toFixed(1) + 'm');
        inferredAddress = addr;
        break;
      }
    }

    if (!inferredAddress.street?.name) {
      logDev('inferAddress: No named street found within', searchRadiusLimit + 'm');
    }

    return inferredAddress;
  } // END inferAddress function

  /**
   * Updates a venue's address using the WME SDK DataModel.
   * Supports updating country, state, city, street name, and house number.
   * @param {Object} feature The WME venue object to update (must have id property).
   * @param {Object} address Object containing country, state, city, street, houseNumber properties (IDs/names as required by SDK).
   */
  function updateAddress(feature, address) {
    logDev('updateAddress: Called with:', {
      venueId: feature?.id,
      street: address?.street?.name,
      streetId: address?.street?.id,
      city: address?.city?.name,
      cityId: address?.city?.id,
      state: address?.state,
      country: address?.country,
      houseNumber: address?.houseNumber
    });

    if (!feature || !address || !address.street?.id) {
      logDev('updateAddress: Validation failed - missing feature, address, or street ID');
      return;
    }

    try {
      const updatePayload = {
        venueId: feature.id,
        streetId: address.street.id,
        houseNumber: address.houseNumber,
      };
      logDev('updateAddress: Sending update payload:', updatePayload);
      sdk.DataModel.Venues.updateAddress(updatePayload);
      logDev('updateAddress: Address inferred and updated successfully');
    } catch (e) {
      logDev('updateAddress error:', e.message, e.stack);
    }
  }

  /**
   * Constructs a Google search URL for a venue based on name, address, and house number.
   * Formats street/state abbreviations (CR- → County Rd, SR- → State Hwy, etc.) for better search results.
   * @param {string} searchName The venue name to search for.
   * @param {Object} addr The venue's address object with street, city, state properties.
   * @param {string} HN The house number (optional, included if street name exists).
   * @returns {string} A fully-formed Google search URL with encoded parameters.
   */
  function buildGLink(searchName, addr, HN) {
    if (!addr) return null;
    let searchHN = '';
    let searchStreet = '';
    let searchCity = '';
    searchName = searchName.replace(/\//g, ' ');

    // Handle SDK SegmentAddress objects (property-based) vs legacy address objects (method-based)
    const hasStreetName = addr.street?.name && !addr.street.isEmpty;
    if (hasStreetName) {
      searchStreet = `${addr.street.name}, `
        .replace(/CR-/g, 'County Rd ')
        .replace(/SR-/g, 'State Hwy ')
        .replace(/US-/g, 'US Hwy ')
        .replace(/ CR /g, ' County Rd ')
        .replace(/ SR /g, ' State Hwy ')
        .replace(/ US /g, ' US Hwy ')
        .replace(/$CR /g, 'County Rd ')
        .replace(/$SR /g, 'State Hwy ')
        .replace(/$US /g, 'US Hwy ');
      if (HN && searchStreet !== '') {
        searchHN = `${HN} `;
      }
    }

    const city = addr.city;
    if (city?.name) {
      searchCity = `${city.name}, `;
    }

    const stateName = addr.state?.name || '';
    searchName = searchName + (searchName ? ', ' : '') + searchHN + searchStreet + searchCity + stateName;
    return `http://www.google.com/search?q=${encodeURIComponent(searchName)}`;
  }

  /**
   * Compares two arrays for equality regardless of element order.
   * Arrays must have same length and contain same elements (in any order).
   * @param {Array} array1 First array to compare.
   * @param {Array} array2 Second array to compare.
   * @returns {boolean} True if arrays contain same elements, false otherwise.
   */
  function matchSets(array1, array2) {
    if (array1.length !== array2.length) {
      return false;
    } // compare lengths
    for (let i = 0; i < array1.length; i++) {
      if (!array2.includes(array1[i])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if all elements from target array exist in source array.
   * Converts single strings to arrays automatically. Returns false if target is null/undefined.
   * @param {Array|string} source The source array to check against.
   * @param {Array|string} target The target item(s) to check for in source.
   * @returns {boolean} True if all target elements exist in source.
   */
  function containsAll(source, target) {
    if (typeof target === 'undefined' || target === null) return false;
    if (typeof target === 'string') {
      target = [target];
    } // if a single string, convert to an array
    for (let ixx = 0; ixx < target.length; ixx++) {
      if (!source.includes(target[ixx])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if any element from target array exists in source array.
   * Converts single strings to arrays automatically.
   * @param {Array|string} source The source array to check against.
   * @param {Array|string} target The target item(s) to check for in source.
   * @returns {boolean} True if any target element exists in source.
   */
  function containsAny(source, target) {
    if (typeof source === 'string') {
      source = [source];
    } // if a single string, convert to an array
    if (typeof target === 'string') {
      target = [target];
    } // if a single string, convert to an array
    return source.some((item) => target.includes(item));
  }

  /**
   * Creates a new array with items inserted at a specified index and duplicates removed.
   * Original array is not modified. Can be used to reposition items by removing then inserting.
   * @param {Array} sourceArray Original array (not modified).
   * @param {*|Array} toInsert Item or array of items to insert.
   * @param {number} atIndex The index position to insert at.
   * @returns {Array} New array with inserted item(s) and duplicates removed.
   */
  function insertAtIndex(sourceArray, toInsert, atIndex) {
    const sourceCopy = sourceArray.slice();
    if (!Array.isArray(toInsert)) toInsert = [toInsert];
    sourceCopy.splice(atIndex, 0, ...toInsert);
    return uniq(sourceCopy);
  }

  /**
   * Checks if two arrays are equal by comparing length and all elements at each index.
   * @param {Array} array1 First array to compare.
   * @param {Array} array2 Second array to compare.
   * @returns {boolean} True if arrays have same length and matching elements at all indices.
   */
  function arraysAreEqual(array1, array2) {
    return array1.legth === array2.length && array1.every((item, index) => item === array2[index]);
  }

  /**
   * Removes aliases that are substrings or prefixes of the main venue name.
   * Useful for eliminating redundant aliases. Returns null if no aliases are removed.
   * @param {string} venueName The primary venue name to compare against.
   * @param {Array<string>} aliases Array of alias names to filter.
   * @returns {Array<string>|null} Filtered aliases array, or null if no changes made.
   */
  function removeUnnecessaryAliases(venueName, aliases) {
    if (!venueName || !aliases?.length) return null;
    const newAliases = [];
    let aliasesRemoved = false;
    venueName = String(venueName).replace(/['=\\/]/i, '');
    venueName = venueName
      .toUpperCase()
      .replace(/'/g, '')
      .replace(/(-|\/ | \/| {2,})/g, ' ');
    for (let naix = 0; naix < aliases.length; naix++) {
      if (
        !venueName.startsWith(
          String(aliases[naix])
            .toUpperCase()
            .replace(/'/g, '')
            .replace(/(-|\/ | \/| {2,})/g, ' '),
        )
      ) {
        newAliases.push(aliases[naix]);
      } else {
        aliasesRemoved = true;
      }
    }
    return aliasesRemoved ? newAliases : null;
  }

  /**
   * String formatter for phone numbers using numbered placeholder syntax.
   * Replaces {0}, {1}, etc. in format string with corresponding arguments from rest array.
   * Returns null for undefined arguments, allowing flexible partial formatting.
   * @param {string} format String containing {0}, {1}, {2} placeholders for substitution.
   * @param {...*} rest Arguments to substitute into the format string by index.
   * @returns {string} Formatted string with placeholders replaced.
   */
  function phoneFormat(format, ...rest) {
    return format.replace(/{(\d+)}/g, (name, number) => (typeof rest[number] !== 'undefined' ? rest[number] : null));
  }

  /**
   * Loads a checkbox's persisted state and attaches a click handler to save changes.
   * Loads state BEFORE attaching handler to avoid spurious saves on initialization.
   * Skips handler attachment for checkboxes with custom handlers (PLATypeFill, ShowFilterHighlight).
   * @param {string} settingID The HTML id of the checkbox element (also used as the settings key).
   */
  function initSettingsCheckbox(settingID) {
    const $checkbox = $(`#${settingID}`);

    // Load Setting from WMEPH settings first (before attaching click handler to avoid triggering save)
    if (getWMEPHSetting(settingID) === '1') {
      $checkbox.prop('checked', true);
    }

    // Attach click handler AFTER loading state so initial prop() doesn't trigger a save
    // Skip for checkboxes that have custom handlers (they'll save and update themselves)
    if (settingID !== 'WMEPH-PLATypeFill' && settingID !== 'WMEPH-ShowFilterHighlight') {
      $checkbox.click(() => {
        saveSettingToLocalStorage(settingID);
      });
    }
  }

  /**
   * Creates a checkbox element with associated label and appends to a parent container.
   * Returns the checkbox jQuery object for further event binding or state management.
   * Used to build the settings UI in the PlaceHarmonizer tab.
   * @param {jQuery} $div Parent container to append the checkbox and label to.
   * @param {string} settingID The HTML id for the checkbox element (used as settings key).
   * @param {string} textDescription The label text displayed next to the checkbox.
   * @returns {jQuery} The created checkbox element (useful for attaching additional handlers).
   */
  function createSettingsCheckbox($div, settingID, textDescription) {
    const $checkbox = $('<input>', { type: 'checkbox', id: settingID });
    $div.append(
      $('<div>', { class: 'controls-container' })
        .css({ paddingTop: '2px' })
        .append($checkbox, $('<label>', { for: settingID }).text(textDescription).css({ whiteSpace: 'pre-line' })),
    );
    return $checkbox;
  }

  /**
   * Handles modifier key toggle (Ctrl vs Alt) for the harmonize keyboard shortcut.
   * Unregisters the old shortcut, updates _modifKey, re-registers with new modifier, and updates UI display.
   * Also updates the SDK keyboard shortcut registry to stay in sync.
   * Called when user clicks the modifier key checkbox in settings.
   */
  function onKBShortcutModifierKeyClick() {
    const $modifKeyCheckbox = $('#WMEPH-KBSModifierKey');
    const $shortcutInput = $('#WMEPH-KeyboardShortcut');
    const $warn = $('#PlaceHarmonizerKBWarn');
    const modifKeyNew = $modifKeyCheckbox.prop('checked') ? 'Ctrl+' : 'Alt+';

    _shortcutParse = parseKBSShift($shortcutInput.val());
    $warn.empty(); // remove any warning
    SHORTCUT.remove(_modifKey + _shortcutParse);
    _modifKey = modifKeyNew;
    SHORTCUT.add(_modifKey + _shortcutParse, harmonizePlace);
    $('#PlaceHarmonizerKBCurrent').empty().append(`<span style="font-weight:bold">Current shortcut: ${_modifKey}${_shortcutParse}</span>`);

    // Update SDK shortcut to match
    const newKey = loadHarmonizeShortcut();
    if (newKey) {
      registerShortcut('wmeph_harmonize_place', 'WMEPH: Harmonize selected place', newKey, () => {
        harmonizePlace();
      });
    }
  }

  /**
   * Handles keyboard shortcut key changes in the settings input field.
   * Validates that input is a single letter; if invalid, reverts to old value and shows error.
   * If valid, unregisters old shortcut, updates _shortcutParse, re-registers with new key, and updates SDK.
   * Called when user changes the keyboard shortcut key in settings.
   */
  function onKBShortcutChange() {
    const keyId = 'WMEPH-KeyboardShortcut';
    const $warn = $('#PlaceHarmonizerKBWarn');
    const $key = $(`#${keyId}`);
    const oldKey = getWMEPHSetting(keyId);
    const newKey = $key.val();

    $warn.empty(); // remove old warning
    if (newKey.match(/^[a-z]{1}$/i) !== null) {
      // If a single letter...
      _shortcutParse = parseKBSShift(oldKey);
      const shortcutParseNew = parseKBSShift(newKey);
      SHORTCUT.remove(_modifKey + _shortcutParse);
      _shortcutParse = shortcutParseNew;
      SHORTCUT.add(_modifKey + _shortcutParse, harmonizePlace);
      setWMEPHSetting(keyId, newKey);
      $('#PlaceHarmonizerKBCurrent').empty().append(`<span style="font-weight:bold">Current shortcut: ${_modifKey}${_shortcutParse}</span>`);

      // Update SDK shortcut to match
      const newSdkKey = loadHarmonizeShortcut();
      if (newSdkKey) {
        registerShortcut('wmeph_harmonize_place', 'WMEPH: Harmonize selected place', newSdkKey, () => {
          harmonizePlace();
        });
      }
    } else {
      // if not a letter then reset and flag
      $key.val(oldKey);
      $warn.append('<p style="color:red">Only letters are allowed<p>');
    }
  }

  /**
   * Sets a checkbox setting to checked ('1') if it has never been set before.
   * Used to initialize default checked state for various feature toggles.
   * @param {string} id The setting ID to initialize with default checked state.
   */
  function setCheckedByDefault(id) {
    if (getWMEPHSetting(id) === null) {
      setWMEPHSetting(id, '1');
    }
  }

  /**
   * Initializes the keyboard shortcut system from persisted settings.
   * Loads shortcut key and modifier from storage (with defaults: 'S' for beta, 'A' for prod).
   * Registers the shortcut globally if not already initialized, and attaches event handlers for future changes.
   * Called during script initialization to set up keyboard shortcut functionality.
   */
  function initShortcutKey() {
    const $current = $('#PlaceHarmonizerKBCurrent');
    const defaultShortcutKey = IS_BETA_VERSION ? 'S' : 'A';
    const shortcutID = 'WMEPH-KeyboardShortcut';
    let shortcutKey = getWMEPHSetting(shortcutID);
    const $shortcutInput = $(`#${shortcutID}`);

    // Set settings to default if none
    if (shortcutKey === null || !/^[a-z]{1}$/i.test(shortcutKey)) {
      setWMEPHSetting(shortcutID, defaultShortcutKey);
      shortcutKey = defaultShortcutKey;
    }
    $shortcutInput.val(shortcutKey);

    if (getWMEPHSetting('WMEPH-KBSModifierKey') === '1') {
      // Change modifier key code if checked
      _modifKey = 'Ctrl+';
    }
    _shortcutParse = parseKBSShift(shortcutKey);
    if (!_initAlreadyRun) SHORTCUT.add(_modifKey + _shortcutParse, harmonizePlace);
    $current.empty().append(`<span style="font-weight:bold">Current shortcut: ${_modifKey}${_shortcutParse}</span>`);

    $('#WMEPH-KBSModifierKey').click(onKBShortcutModifierKeyClick);

    // Upon change of the KB letter:
    $shortcutInput.change(onKBShortcutChange);
  }

  /**
   * Handles whitelist merge/reset operations from the WL Tools tab.
   * If input is 'resetWhitelist', prompts user for confirmation before wiping all WL data.
   * Otherwise, attempts to merge pasted whitelist data (tries uncompressed first, then compressed with LZString).
   * Shows colored feedback messages indicating success or error.
   */
  function onWLMergeClick() {
    const $wlToolsMsg = $('#PlaceHarmonizerWLToolsMsg');
    const $wlInput = $('#WMEPH-WLInput');

    $wlToolsMsg.empty();
    if ($wlInput.val() === 'resetWhitelist') {
      /* if (confirm('***Do you want to reset all Whitelist data?\nClick OK to erase.')) {
                // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                _venueWhitelist = { '1.1.1': { Placeholder: {} } }; // Populate with a dummy place
                saveWhitelistToLS(true);
            } */
      WazeWrap.Alerts.confirm(
        // if the category doesn't translate, then pop an alert that will make a forum post to the thread
        SCRIPT_NAME,
        '***Do you want to reset all Whitelist data?<br>Click OK to erase.',
        () => {
          _venueWhitelist = { '1.1.1': { Placeholder: {} } }; // Populate with a dummy place
          saveWhitelistToLS(true);
        },
        () => {},
      );
    } else {
      // try to merge uncompressed WL data
      let wlStringToMerge = validateWLS($('#WMEPH-WLInput').val());
      if (wlStringToMerge) {
        log('Whitelists merged!');
        _venueWhitelist = mergeWL(_venueWhitelist, wlStringToMerge);
        saveWhitelistToLS(true);
        $wlToolsMsg.append('<p style="color:green">Whitelist data merged<p>');
        $wlInput.val('');
      } else {
        // try compressed WL
        wlStringToMerge = validateWLS(LZString.decompressFromUTF16($('#WMEPH-WLInput').val()));
        if (wlStringToMerge) {
          log('Whitelists merged!');
          _venueWhitelist = mergeWL(_venueWhitelist, wlStringToMerge);
          saveWhitelistToLS(true);
          $wlToolsMsg.append('<p style="color:green">Whitelist data merged<p>');
          $wlInput.val('');
        } else {
          $wlToolsMsg.append('<p style="color:red">Invalid Whitelist data<p>');
        }
      }
    }
  }

  /**
   * Extracts the current whitelist from localStorage (tries compressed first, falls back to uncompressed).
   * Used for backing up or sharing whitelist data. Shows instructions to copy/paste data to safe location.
   * Resets the add-count reminder to show it once per session.
   */
  function onWLPullClick() {
    let wlToPull = '';
    const compressedWL = localStorage.getItem(WL_LOCAL_STORE_NAME_COMPRESSED);
    const uncompressedWL = localStorage.getItem(WL_LOCAL_STORE_NAME);

    if (compressedWL) {
      try {
        wlToPull = LZString.decompressFromUTF16(compressedWL);
        if (!wlToPull || wlToPull.length === 0) {
          throw new Error('Decompressed data is empty');
        }
      } catch (e) {
        logDev('Error decompressing WL for pull:', e.message);
        if (uncompressedWL) {
          wlToPull = uncompressedWL;
          logDev('Using uncompressed backup for pull');
        }
      }
    } else if (uncompressedWL) {
      wlToPull = uncompressedWL;
      logDev('Using uncompressed WL for pull (no compressed version found)');
    }

    if (wlToPull) {
      $('#WMEPH-WLInput').val(wlToPull);
      $('#PlaceHarmonizerWLToolsMsg').empty().append('<p style="color:green">To backup the data, copy & paste the text in the box to a safe location.<p>');
    } else {
      $('#PlaceHarmonizerWLToolsMsg').empty().append('<p style="color:red">Error: No whitelist data found to pull<p>');
    }
    setWMEPHSetting('WMEPH_WLAddCount', 1);
  }

  /**
   * Displays whitelist statistics showing count of whitelisted venues by state and country.
   * Decompresses the stored whitelist and generates summary tables of regional data.
   * Excludes the placeholder entry (1.1.1) from counts.
   */
  function onWLStatsClick() {
    let currWLData;
    try {
      const compressedWL = localStorage.getItem(WL_LOCAL_STORE_NAME_COMPRESSED);
      const uncompressedWL = localStorage.getItem(WL_LOCAL_STORE_NAME);

      if (compressedWL) {
        const decompressed = LZString.decompressFromUTF16(compressedWL);
        currWLData = JSON.parse(decompressed);
      } else if (uncompressedWL) {
        logDev('Using uncompressed WL for stats (no compressed version found)');
        currWLData = JSON.parse(uncompressedWL);
      } else {
        throw new Error('No whitelist data found');
      }
    } catch (e) {
      logDev('Error loading whitelist for stats:', e.message);
      $('#PlaceHarmonizerWLToolsMsg').empty().append(`<p style="color:red">Error: Could not load whitelist - ${e.message}<p>`);
      return;
    }
    const countryWL = {};
    const stateWL = {};
    const entries = Object.keys(currWLData).filter((key) => key !== '1.1.1');

    $('#WMEPH-WLInputBeta').val('');
    entries.forEach((venueKey) => {
      const country = currWLData[venueKey].country || 'None';
      const state = currWLData[venueKey].state || 'None';
      countryWL[country] = countryWL[country] + 1 || 1;
      stateWL[state] = stateWL[state] + 1 || 1;
    });

    const getSectionDiv = (title, list) =>
      $('<div>', { style: 'margin-bottom: 10px;' }).append(
        $('<div>', { style: 'font-weight: bold; text-decoration: underline' }).text(title),
        Object.keys(list).map((key) => $('<div>').text(`${key}: ${list[key]}`)),
      );

    $('#PlaceHarmonizerWLToolsMsg')
      .empty()
      .append($('<div>', { style: 'margin-bottom: 10px;' }).text(`Number of WL places: ${entries.length}`), getSectionDiv('States', stateWL), getSectionDiv('Countries', countryWL));
  }

  /**
   * Removes all whitelisted venues for a specified state from the user's whitelist.
   * Requires user confirmation before deletion. Input state name must match exactly as shown in Stats.
   * First creates a backup before deletion, and shows count of venues removed or error messages.
   */
  function onWLStateFilterClick() {
    const $wlInput = $('#WMEPH-WLInput');
    const stateToRemove = $wlInput.val().trim();
    let msgColor;
    let msgText;

    if (stateToRemove.length < 2) {
      msgColor = 'red';
      msgText = 'Invalid state. Enter the state name in the "Whitelist string" box above, ' + 'exactly as it appears in the Stats output.';
    } else {
      const currWLData = JSON.parse(LZString.decompressFromUTF16(localStorage.getItem(WL_LOCAL_STORE_NAME_COMPRESSED)));
      const venuesToRemove = Object.keys(currWLData).filter(
        (venueKey) => venueKey !== '1.1.1' && (currWLData[venueKey].state === stateToRemove || (!currWLData[venueKey].state && stateToRemove === 'None')),
      );
      if (venuesToRemove.length > 0) {
        if (getWMEPHSetting('WMEPH_WLAddCount') === 1) {
          WazeWrap.Alerts.confirm(
            SCRIPT_NAME,
            `Are you sure you want to clear all whitelist data for ${stateToRemove}? This CANNOT be undone. ` + 'Press OK to delete, cancel to preserve the data.',
            () => {
              backupWhitelistToLS(true);
              venuesToRemove.forEach((venueKey) => {
                delete _venueWhitelist[venueKey];
              });
              saveWhitelistToLS(true);
              $wlInput.val('');
              $('#PlaceHarmonizerWLToolsMsg')
                .empty()
                .append($('<p>').css({ color: 'green' }).text(`${venuesToRemove.length} venues removed from WL`));
            },
            () => {
              $('#PlaceHarmonizerWLToolsMsg')
                .empty()
                .append($('<p>').css({ color: 'blue' }).text('No changes made'));
            },
          );
          return;
        } // else {
        msgColor = 'red';
        msgText = 'Please backup your WL using the Pull button before removing state data';
        // }
      } else {
        msgColor = 'red';
        msgText = `No data for "${stateToRemove}". Use the state name exactly as listed in the Stats`;
      }
    }
    $('#PlaceHarmonizerWLToolsMsg')
      .empty()
      .append($('<p>').css({ color: msgColor }).text(msgText));
  }

  /**
   * Opens a Google Form to submit/share the user's whitelist data to a public repository.
   * Prepopulates the form with the user's name from WME SDK.
   */
  function onWLShareClick() {
    window.open(`https://docs.google.com/forms/d/1k_5RyOq81Fv4IRHzltC34kW3IUbXnQqDVMogwJKFNbE/viewform?entry.1173700072=${USER.name}`);
  }

  /**
   * Initializes all settings checkboxes and button handlers in the WMEPH settings tab.
   * Sets default values, attaches click handlers, and configures feature-specific behavior.
   * Handles role-based settings visibility (dev/beta users see additional options).
   * Called after the settings tab is added to the UI.
   */
  function initWmephTab() {
    const multicall = (func, names) => names.forEach((name) => func(name));

    // Enable certain settings by default if not set by the user:
    multicall(setCheckedByDefault, ['WMEPH-ColorHighlighting', 'WMEPH-ExcludePLADupes', 'WMEPH-DisablePLAExtProviderCheck']);

    // Initialize settings checkboxes
    multicall(initSettingsCheckbox, [
      'WMEPH-WebSearchNewTab',
      'WMEPH-EnableIAZoom',
      'WMEPH-HidePlacesWiki',
      'WMEPH-HideServicesButtons',
      'WMEPH-HidePURWebSearch',
      'WMEPH-ExcludePLADupes',
      'WMEPH-ShowPLAExitWhileClosed',
    ]);
    if (USER.isDevUser || USER.isBetaUser || USER.rank >= 2) {
      multicall(initSettingsCheckbox, ['WMEPH-DisablePLAExtProviderCheck', 'WMEPH-AddAddresses', 'WMEPH-EnableCloneMode', 'WMEPH-AutoLockRPPs']);
    }
    multicall(initSettingsCheckbox, [
      'WMEPH-ColorHighlighting',
      'WMEPH-DisableHoursHL',
      'WMEPH-DisableRankHL',
      'WMEPH-DisableWLHL',
      'WMEPH-PLATypeFill',
      'WMEPH-KBSModifierKey',
      'WMEPH-ShowFilterHighlight',
    ]);

    if (USER.isDevUser) {
      initSettingsCheckbox('WMEPH-RegionOverride');
    }

    // Turn this setting on one time.
    if (!_initAlreadyRun) {
      const runOnceDefaultIgnorePlaGoogleLinkChecks = getWMEPHSetting('WMEPH-runOnce-defaultToOff-plaGoogleLinkChecks');
      if (!runOnceDefaultIgnorePlaGoogleLinkChecks) {
        const $chk = $('#WMEPH-DisablePLAExtProviderCheck');
        if (!$chk.prop('checked')) {
          $chk.trigger('click');
        }
      }
      setWMEPHSetting('WMEPH-runOnce-defaultToOff-plaGoogleLinkChecks', true);
    }

    initShortcutKey();

    if (getWMEPHSetting('WMEPH_WLAddCount') === null) {
      setWMEPHSetting('WMEPH_WLAddCount', 2); // Counter to remind of WL backups
    }

    // Reload Data button click event
    $('#WMEPH-ReloadDataBtn').click(async () => {
      $('#WMEPH-ReloadDataBtn').attr('disabled', true);
      _resultsCache = {};
      _resultsCacheOrder = [];
      wmephStats = {
        harmonizeCount: 0,
        totalHarmonizeTime: 0,
        lastHarmonizeTime: 0,
        maxHarmonizeTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalCacheHitTime: 0,
        totalCacheMissTime: 0,
        lastCacheHitTime: 0,
        lastCacheMissTime: 0,
        maxCacheHitTime: 0,
        maxCacheMissTime: 0,
      };
      await Pnh.downloadPnhData();
      redrawLayer(_layer);
      $('#WMEPH-ReloadDataBtn').attr('disabled', false);
    });

    // WL button click events
    $('#WMEPH-WLMerge').click(onWLMergeClick);
    $('#WMEPH-WLPull').click(onWLPullClick);
    $('#WMEPH-WLStats').click(onWLStatsClick);
    $('#WMEPH-WLStateFilter').click(onWLStateFilterClick);
    $('#WMEPH-WLShare').click(onWLShareClick);

    // Color highlighting - these affect severity calculations, so clear cache when toggled
    $('#WMEPH-ColorHighlighting').click(bootstrapWmephColorHighlights);
    $('#WMEPH-DisableHoursHL').click(() => {
      saveSettingToLocalStorage('WMEPH-DisableHoursHL');
      _resultsCache = {};  // Clear cache to recalculate all severities
      bootstrapWmephColorHighlights();
    });
    $('#WMEPH-DisableRankHL').click(() => {
      saveSettingToLocalStorage('WMEPH-DisableRankHL');
      _resultsCache = {};  // Clear cache to recalculate all severities
      bootstrapWmephColorHighlights();
    });
    $('#WMEPH-DisableWLHL').click(() => {
      saveSettingToLocalStorage('WMEPH-DisableWLHL');
      _resultsCache = {};  // Clear cache to recalculate all severities
      bootstrapWmephColorHighlights();
    });
    $('#WMEPH-PLATypeFill').click(() => {
      saveSettingToLocalStorage('WMEPH-PLATypeFill');
      refreshAllHighlights();
    });
    $('#WMEPH-ShowFilterHighlight').click(() => {
      saveSettingToLocalStorage('WMEPH-ShowFilterHighlight');
      refreshAllHighlights();
    });

    $('#WMEPH-HideGreenPlaces').click(() => {
      saveSettingToLocalStorage('WMEPH-HideGreenPlaces');
      refreshAllHighlights();
    });

    _initAlreadyRun = true;
  }

  /**
   * Creates and registers the WMEPH settings tab in the WME sidebar.
   * Builds four tab panes: Harmonize settings, Highlighter settings, Whitelist Tools, and Moderators list.
   * Populates UI with checkboxes, buttons, and text inputs for user configuration.
   * Calls initWmephTab() to initialize event handlers after UI is built.
   * @async
   */
  async function addWmephTab() {
    // Set up the CSS
    GM_addStyle(_CSS);

    const $container = $('<div>');
    const $reloadDataBtn = $(
      '<div style="margin-bottom:6px; text-align:center;"><div style="position:relative; display:inline-block; width:75%"><input id="WMEPH-ReloadDataBtn" style="min-width:90px; width:50%" class="btn btn-success wmeph-fat-btn" type="button" title="Refresh Data" value="Refresh Data"/><div class="checkmark draw"></div></div></div>',
    );
    const $navTabs = $(
      '<ul class="nav nav-tabs"><li class="active"><a data-toggle="tab" href="#sidepanel-harmonizer">Harmonize</a></li>' +
        '<li><a data-toggle="tab" href="#sidepanel-highlighter">HL / Scan</a></li>' +
        '<li><a data-toggle="tab" href="#sidepanel-wltools">WL Tools</a></li>' +
        '<li><a data-toggle="tab" href="#sidepanel-pnh-moderators">Moderators</a></li></ul>',
    );
    const $tabContent = $('<div class="tab-content">');
    const $versionDiv = $('<div>').text(`WMEPH ${BETA_VERSION_STR} v${SCRIPT_VERSION}`).css({ color: '#999', fontSize: '13px' });
    const $harmonizerTab = $('<div class="tab-pane wmeph-pane active" id="sidepanel-harmonizer"></div>');
    const $highlighterTab = $('<div class="tab-pane wmeph-pane" id="sidepanel-highlighter"></div>');
    const $wlToolsTab = $('<div class="tab-pane wmeph-pane" id="sidepanel-wltools"></div>');
    const $moderatorsTab = $('<div class="tab-pane wmeph-pane" id="sidepanel-pnh-moderators"></div>');
    $tabContent.append($harmonizerTab, $highlighterTab, $wlToolsTab, $moderatorsTab);
    $container.append($reloadDataBtn, $navTabs, $tabContent, $versionDiv);

    // Harmonizer settings
    createSettingsCheckbox($harmonizerTab, 'WMEPH-WebSearchNewTab', 'Open URL & Search Results in new tab instead of new window');
    createSettingsCheckbox($harmonizerTab, 'WMEPH-EnableIAZoom', 'Enable zoom & center for places with no address');
    createSettingsCheckbox($harmonizerTab, 'WMEPH-HidePlacesWiki', 'Hide "Places Wiki" button in results banner');
    createSettingsCheckbox($harmonizerTab, 'WMEPH-HideServicesButtons', 'Hide services buttons in results banner');
    createSettingsCheckbox($harmonizerTab, 'WMEPH-HidePURWebSearch', 'Hide "Web Search" button on PUR popups');
    createSettingsCheckbox($harmonizerTab, 'WMEPH-ExcludePLADupes', 'Exclude parking lots when searching for duplicate places');
    createSettingsCheckbox($harmonizerTab, 'WMEPH-ShowPLAExitWhileClosed', 'Always ask if cars can exit parking lots');
    if (USER.isDevUser || USER.isBetaUser || USER.rank >= 2) {
      createSettingsCheckbox($harmonizerTab, 'WMEPH-DisablePLAExtProviderCheck', 'Disable check for "Google place link" on Parking Lot Areas');
      createSettingsCheckbox($harmonizerTab, 'WMEPH-AddAddresses', 'Add detected address fields to places with no address');
      createSettingsCheckbox($harmonizerTab, 'WMEPH-EnableCloneMode', 'Enable place cloning tools');
      createSettingsCheckbox($harmonizerTab, 'WMEPH-AutoLockRPPs', 'Lock residential place points to region default');
    }

    $harmonizerTab.append('<hr class="wmeph-hr" align="center" width="100%">');

    // Add Letter input box
    const $phShortcutDiv = $('<div id="PlaceHarmonizerKB">');
    // eslint-disable-next-line max-len
    $phShortcutDiv.append(
      '<div id="PlaceHarmonizerKBWarn"></div>Shortcut Letter (a-Z): <input type="text" maxlength="1" id="WMEPH-KeyboardShortcut" style="width: 30px;padding-left:8px"><div id="PlaceHarmonizerKBCurrent"></div>',
    );
    createSettingsCheckbox($phShortcutDiv, 'WMEPH-KBSModifierKey', 'Use Ctrl instead of Alt'); // Add Alt-->Ctrl checkbox

    if (USER.isDevUser) {
      // Override script regionality (devs only)
      $phShortcutDiv.append('<hr class="wmeph-hr" align="center" width="100%"><p>Dev Only Settings:</p>');
      createSettingsCheckbox($phShortcutDiv, 'WMEPH-RegionOverride', 'Disable Region Specificity');
    }

    $harmonizerTab.append(
      $phShortcutDiv,
      '<hr class="wmeph-hr" align="center" width="100%">',
      `<div><a href="${URLS.placesWiki}" target="_blank">Open the WME Places Wiki page</a></div>`,
      `<div><a href="${URLS.forum}" target="_blank">Submit script feedback & suggestions</a></div>`,
      '<hr class="wmeph-hr" align="center" width="95%">',
    );

    // Highlighter settings
    $highlighterTab.append('<p>Highlighter Settings:</p>');
    createSettingsCheckbox($highlighterTab, 'WMEPH-ColorHighlighting', 'Enable color highlighting of map to indicate places needing work');
    createSettingsCheckbox($highlighterTab, 'WMEPH-HideGreenPlaces', 'Disable highlighting for places NOT needing work (green places)');
    createSettingsCheckbox($highlighterTab, 'WMEPH-DisableHoursHL', 'Disable highlighting for missing hours');
    createSettingsCheckbox($highlighterTab, 'WMEPH-DisableRankHL', 'Disable highlighting for places locked above your rank');
    createSettingsCheckbox($highlighterTab, 'WMEPH-DisableWLHL', 'Disable Whitelist highlighting (shows all missing info regardless of WL)');
    createSettingsCheckbox($highlighterTab, 'WMEPH-PLATypeFill', 'Fill parking lots based on type (public=blue, restricted=yellow, private=red)');
    createSettingsCheckbox($highlighterTab, 'WMEPH-ShowFilterHighlight', 'Highlight places without Customer Parking service');
    if (USER.isDevUser || USER.isBetaUser || USER.rank >= 3) {
      // createSettingsCheckbox($highlighterTab 'WMEPH-UnlockedRPPs','Highlight unlocked residential place points');
    }

    // Scanner settings
    // $highlighterTab.append('<hr align="center" width="90%">');
    // $highlighterTab.append('<p>Scanner Settings (coming !soon)</p>');
    // createSettingsCheckbox($highlighterTab, 'WMEPH-PlaceScanner','Placeholder, under development!');

    // Whitelisting settings
    const phWLContentHtml = $(
      '<div id="PlaceHarmonizerWLTools">Whitelist string: <input onClick="this.select();" type="text" id="WMEPH-WLInput" style="width:100%;padding-left:1px;display:block">' +
        '<div style="margin-top:3px;">' +
        '<input class="btn btn-success btn-xs wmeph-fat-btn" id="WMEPH-WLMerge" title="Merge the string into your existing Whitelist" type="button" value="Merge">' +
        '<input class="btn btn-success btn-xs wmeph-fat-btn" id="WMEPH-WLPull" title="Pull your existing Whitelist for backup or sharing" type="button" value="Pull">' +
        '<input class="btn btn-success btn-xs wmeph-fat-btn" id="WMEPH-WLShare" title="Share your Whitelist to a public Google sheet" type="button" value="Share your WL">' +
        '</div>' +
        '<div style="margin-top:12px;">' +
        '<input class="btn btn-info btn-xs wmeph-fat-btn" id="WMEPH-WLStats" title="Display WL stats" type="button" value="Stats">' +
        '<input class="btn btn-danger btn-xs wmeph-fat-btn" id="WMEPH-WLStateFilter" title="Remove all WL items for a state.  Enter the state in the \'Whitelist string\' box." ' +
        '     type="button" value="Remove data for 1 State">' +
        '</div>' +
        '</div>' +
        '<div id="PlaceHarmonizerWLToolsMsg" style="margin-top:10px;"></div>',
    );
    $wlToolsTab.append(phWLContentHtml);

    $moderatorsTab.append(
      $('<div>', { style: 'margin-bottom: 10px;' }).text(
        'Moderators are responsible for reviewing chain submissions for their region.' + ' If you have questions or suggestions regarding a chain, please contact any of your regional moderators.',
      ),
      $('<table>').append(
        Object.keys(Pnh.MODERATORS)
          .sort()
          .map((region) =>
            $('<tr>').append(
              $('<td>', { class: 'wmeph-mods-table-cell title' }).append($('<div>').text(region)),
              $('<td>', { class: 'wmeph-mods-table-cell' }).append($('<div>').text(Pnh.MODERATORS[region].join(', '))),
            ),
          ),
      ),
    );

    const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
    tabLabel.innerHTML = `<span title="WME Place Harmonizer">WMEPH${IS_BETA_VERSION ? '-β' : ''}</span>`;
    tabPane.innerHTML = $container.html();
    tabPane.classList.add('wmeph-pane');
    // Fix tab content div spacing.
    $(tabPane).parent().css({ width: 'auto', padding: '8px !important' });
    initWmephTab();
  }

  /**
   * Creates an icon-based toggle button for clone tool field selection.
   * Uses Font Awesome icons for visual representation of each field (house, road, map, etc.).
   * Persists checkbox state to settings storage and updates button appearance on toggle.
   * @param {string} divID Not currently used, kept for compatibility.
   * @param {string} settingID The setting key for this clone field (e.g., WMEPH_CPhn for house number).
   * @param {string} textDescription Tooltip text describing what field this button controls.
   * @returns {jQuery} The created button element.
   */
  function createCloneCheckbox(divID, settingID, textDescription) {
    const iconMap = {
      WMEPH_CPhn: 'fa-home', // House Number
      WMEPH_CPstr: 'fa-road', // Street
      WMEPH_CPcity: 'fa-map-marker', // City
      WMEPH_CPurl: 'fa-link', // URL
      WMEPH_CPph: 'fa-phone', // Phone
      WMEPH_CPdesc: 'fa-file-text', // Description
      WMEPH_CPserv: 'fa-cog', // Services
      WMEPH_CPhrs: 'fa-clock-o', // Hours
    };

    const icon = iconMap[settingID];
    const isChecked = getWMEPHSetting(settingID) === '1';

    const $button = $('<button>', {
      id: settingID,
      type: 'button',
      class: 'wmeph-icon-toggle',
      title: textDescription,
      style: `
                background: none;
                border: none;
                padding: 4px 6px;
                cursor: pointer;
                font-size: 16px;
                color: ${isChecked ? '#0075e3' : '#999'};
                transition: all 0.2s ease;
                opacity: ${isChecked ? '1' : '0.5'};
            `,
    })
      .html(icon ? `<i class="fa ${icon}"></i>` : textDescription)
      .click(function () {
        const checked = getWMEPHSetting(settingID) === '1';
        const newState = checked ? '0' : '1';
        setWMEPHSetting(settingID, newState);
        $(this).css({
          color: newState === '1' ? '#0075e3' : '#999',
          opacity: newState === '1' ? '1' : '0.5',
        });
      });

    return $button;
  }

  /**
   * Prepends 'Shift+' to keyboard shortcut if key is uppercase letter.
   * Used to build complete keyboard shortcut combinations (e.g., 'Shift+A' or 'a').
   * @param {string} kbs Single keyboard character (uppercase triggers Shift modifier).
   * @returns {string} Keyboard shortcut with optional Shift prefix.
   */
  function parseKBSShift(kbs) {
    return (/^[A-Z]{1}$/g.test(kbs) ? 'Shift+' : '') + kbs;
  }

  /**
   * Persists a checkbox's state to WMEPH settings storage.
   * Reads current checked state from DOM and saves as '1' or '0'.
   * @param {string} settingID The HTML id and settings key for the checkbox.
   */
  function saveSettingToLocalStorage(settingID) {
    setWMEPHSetting(settingID, $(`#${settingID}`).prop('checked') ? '1' : '0');
  }

  /**
   * Validates that a string is valid JSON and returns parsed object if valid.
   * Returns false if JSON parsing fails or if parsed value is not an object.
   * @param {string} jsonString String to validate as JSON.
   * @returns {Object|boolean} Parsed JSON object if valid, false otherwise.
   */
  function validateWLS(jsonString) {
    try {
      const objTry = JSON.parse(jsonString);
      if (objTry && typeof objTry === 'object' && objTry !== null) {
        return objTry;
      }
    } catch (e) {
      // do nothing
    }
    return false;
  }

  /**
   * Merges whitelist data from wl2 into wl1, with wl2 data taking precedence.
   * For venues that exist in both, merges active whitelisting rules.
   * For array-based WL keys, appends wl2 data to wl1 arrays at index 100 and deduplicates.
   * Used when user pastes a shared whitelist to combine it with their existing WL.
   * @param {Object} wl1 The target whitelist object to merge into.
   * @param {Object} wl2 The source whitelist object to merge from.
   * @returns {Object} Updated wl1 with wl2 data merged in.
   */
  function mergeWL(wl1, wl2) {
    let wlVenue1;
    let wlVenue2;
    Object.keys(wl2).forEach((venueKey) => {
      if (wl1.hasOwnProperty(venueKey)) {
        // if the wl2 venue is in wl1, then update any keys
        wlVenue1 = wl1[venueKey];
        wlVenue2 = wl2[venueKey];
        // loop thru the venue WL keys
        Object.keys(wlVenue2).forEach((wlKey) => {
          // Only update if the wl2 key is active
          if (wlVenue2.hasOwnProperty(wlKey) && wlVenue2[wlKey].active) {
            // if the key is in the wl1 venue and it is active, then push any array data onto the key
            if (wlVenue1.hasOwnProperty(wlKey) && wlVenue1[wlKey].active) {
              if (wlVenue1[wlKey].hasOwnProperty('WLKeyArray')) {
                wl1[venueKey][wlKey].WLKeyArray = insertAtIndex(wl1[venueKey][wlKey].WLKeyArray, wl2[venueKey][wlKey].WLKeyArray, 100);
              }
            } else {
              // if the key isn't in the wl1 venue, or if it's inactive, then copy the wl2 key across
              wl1[venueKey][wlKey] = wl2[venueKey][wlKey];
            }
          }
        }); // END subLoop for venue keys
      } else {
        // if the venue doesn't exist in wl1, then add it
        wl1[venueKey] = wl2[venueKey];
      }
    });
    return wl1;
  }

  /**
   * Returns an array of boolean flags indicating which services are present on a venue.
   * Array index corresponds to service type in WME_SERVICES_ARRAY.
   * @param {Object} venue The WME venue object to check services for.
   * @returns {Array<boolean>} Boolean array where index i is true if service i is present.
   */
  function getServicesChecks(venue) {
    const servArrayCheck = [];
    const services = venue.services || [];
    for (let wsix = 0; wsix < WME_SERVICES_ARRAY.length; wsix++) {
      if (services.includes(WME_SERVICES_ARRAY[wsix])) {
        servArrayCheck[wsix] = true;
      } else {
        servArrayCheck[wsix] = false;
      }
    }
    return servArrayCheck;
  }

  /**
   * Updates service button UI states to reflect services currently on the selected venue.
   * Marks buttons as checked/unchecked based on venue's services array.
   * Also checks the 24/7 button if venue has 24/7 hours, and ensures it's visible.
   */
  function updateServicesChecks() {
    const venue = getSelectedVenue();
    if (venue) {
      if (!_servicesBanner) return;
      const services = venue.services || [];
      Object.keys(_servicesBanner).forEach((keys) => {
        if (_servicesBanner.hasOwnProperty(keys)) {
          const button = _servicesBanner[keys];
          const serviceId = button.serviceId;
          // Check if this service is in the venue's services array
          if (serviceId) {
            button.checked = services.includes(serviceId);
            button.active = button.active || button.checked; // display any manually checked non-active icons
          }
        }
      });
      // Highlight 24/7 button if hours are set that way, and add button for all places
      if (_servicesBanner && _servicesBanner.add247) {
        if (isAlwaysOpen(venue)) {
          _servicesBanner.add247.checked = true;
        }
        _servicesBanner.add247.active = true;
      }
    }
  }

  /**
   * Removes focus from the currently focused DOM element.
   * Creates a temporary input element, focuses it (moving focus away), then removes it.
   * Used to trigger onchange/blur events for text inputs and finalize pending edits.
   */
  function blurAll() {
    const tmp = document.createElement('input');
    document.body.appendChild(tmp);
    tmp.focus();
    document.body.removeChild(tmp);
  }

  /**
   * Retrieves user information from SDK and populates the USER object.
   * Converts SDK rank (0-based) to 1-based (1-7) for script logic.
   * Checks if user is in dev or beta lists to enable feature access and extra settings.
   * Shows warning if beta/dev lists are inaccessible (only for beta version builds).
   */
  function updateUserInfo() {
    const userInfo = sdk.State.getUserInfo();
    if (!userInfo) {
      logDev('updateUserInfo: SDK user info not available yet');
      return;
    }
    USER.name = userInfo.userName;
    USER.rank = userInfo.rank + 1; // SDK rank is 0-based (0-6), convert to 1-based (1-7)
    if (!_wmephBetaList || _wmephBetaList.length === 0) {
      if (IS_BETA_VERSION) {
        WazeWrap.Alerts.warning(SCRIPT_NAME, 'Beta user list access issue.  Please post in the GHO or PM/DM MapOMatic about this message.  Script should still work.');
      }
      USER.isBetaUser = false;
      USER.isDevUser = false;
    } else {
      const lcName = USER.name.toLowerCase();
      USER.isDevUser = _wmephDevList.includes(lcName) || lcName === 'js55ct'; // Allow JS55CT for testing
      USER.isBetaUser = _wmephBetaList.includes(lcName);
    }
    if (USER.isDevUser) {
      USER.isBetaUser = true; // dev users are beta users
    }
  }

  /**
   * Keyboard shortcut handler to toggle the "Show Filter Highlight" setting.
   * Programmatically clicks the checkbox to trigger its event handlers and state changes.
   */
  function onFilterHighlightToggleShortcutKey() {
    $('#WMEPH-ShowFilterHighlight').click();
  }

  /**
   * Keyboard shortcut handler to toggle the "Color Highlighting" setting.
   * Programmatically clicks the checkbox to trigger its event handlers and state changes.
   */
  function onShowHighlightColorsToggleShortcutKey() {
    $('#WMEPH-ColorHighlighting').click();
  }

  /**
   * Window beforeunload event handler for cleanup and state persistence.
   * SDK shortcuts are automatically saved via saveShortcut() in registerShortcut(),
   * so no manual save is required here. Handler is registered for potential future use.
   */
  function onWindowBeforeUnload() {
    // SDK shortcuts are saved automatically via saveShortcut() in registerShortcut()
    // No manual save needed on unload

    // Ensure X-ray mode is off on page unload to restore layer states
    if (xrayState.enabled) {
      toggleXrayMode(false);
    }
  }

  /**
   * Shows a script update notification with release notes when script version changes.
   * Uses WazeWrap.Interface.ShowScriptUpdate if available, falls back to debug log.
   * Updates the stored version number and displays formatted "What's New" list.
   */
  function showScriptInfoAlert() {
    const lastVersion = getWMEPHSetting('WMEPH_lastVersion');

    /* Check version and alert on update */
    if (SCRIPT_UPDATE_MESSAGE && SCRIPT_VERSION !== lastVersion) {
      let releaseNotes = '';
      releaseNotes += "<p>What's New:</p>";
      if (SCRIPT_UPDATE_MESSAGE.length > 0) {
        releaseNotes += '<ul>';
        for (let idx = 0; idx < SCRIPT_UPDATE_MESSAGE.length; idx++) releaseNotes += `<li>${SCRIPT_UPDATE_MESSAGE[idx]}`;
        releaseNotes += '</ul>';
      } else {
        releaseNotes += '<ul><li>Nothing major.</ul>';
      }
      if (WazeWrap?.Interface?.ShowScriptUpdate) {
        WazeWrap.Interface.ShowScriptUpdate(SCRIPT_NAME, SCRIPT_VERSION, releaseNotes, GF_URL);
      } else {
        logDev('WazeWrap.Interface.ShowScriptUpdate not available');
      }
    }
    setWMEPHSetting('WMEPH_lastVersion', SCRIPT_VERSION);
  }

  /**
   * Migrates legacy individual localStorage keys into a centralized WMEPH-Settings JSON object.
   * One-time migration that consolidates scattered settings for cleaner storage and easier management.
   * Removes migrated keys from localStorage and cleans up any stray WMEPH keys left behind.
   * Tracks migration version to avoid re-running on subsequent scripts loads.
   */
  function migrateSettingsToObject() {
    const MIGRATION_VERSION = 1;
    wmephSettings = JSON.parse(localStorage.getItem('WMEPH-Settings') || '{}');
    const currentVersion = wmephSettings._migrationVersion || 0;
    logDev(`migrateSettingsToObject: current version=${currentVersion}, target version=${MIGRATION_VERSION}`);

    // If already migrated, skip
    if (currentVersion === MIGRATION_VERSION) {
      logDev('Migration already complete, skipping');
      return;
    }

    const oldKeys = [
      'WMEPH-KeyboardShortcut',
      'WMEPH-KBSModifierKey',
      'WMEPH-WebSearchNewTab',
      'WMEPH-EnableCloneMode',
      'WMEPH-EnableIAZoom',
      'WMEPH-HidePlacesWiki',
      'WMEPH-HideServicesButtons',
      'WMEPH-HidePURWebSearch',
      'WMEPH-ExcludePLADupes',
      'WMEPH-ShowPLAExitWhileClosed',
      'WMEPH-DisablePLAExtProviderCheck',
      'WMEPH-AddAddresses',
      'WMEPH-AutoLockRPPs',
      'WMEPH-ColorHighlighting',
      'WMEPH-DisableHoursHL',
      'WMEPH-DisableRankHL',
      'WMEPH-DisableWLHL',
      'WMEPH-PLATypeFill',
      'WMEPH-ShowFilterHighlight',
      'WMEPH-RegionOverride',
      'WMEPH-featuresExamined',
      'WMEPH-runOnce-defaultToOff-plaGoogleLinkChecks',
      'WMEPH-OneTimeWLBU',
      'WMEPH_WLAddCount',
      'WMEPH_lastVersion',
      'WMEPH_ColorHighlighting',
      'WMEPH_FilterHighlightShortcut',
      'WMEPH_CPcity',
      'WMEPH_CPdesc',
      'WMEPH_CPhn',
      'WMEPH_CPhrs',
      'WMEPH_CPph',
      'WMEPH_CPserv',
      'WMEPH_CPstr',
      'WMEPH_CPurl',
      'WMEPH_shortcut_wmeph_color_highlighting',
      'WMEPH_shortcut_wmeph_harmonize_place',
      'WMEPH_shortcut_wmeph_zoom_place',
      // Note: WMEPH-venueWhitelistCompressed and WMEPH-venueWhitelistNew are kept separate
      // as independent localStorage keys since they're large data, not user settings
    ];

    // Collect all existing WMEPH settings
    oldKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        wmephSettings[key] = value;
      }
    });

    // Mark migration as complete
    wmephSettings._migrationVersion = MIGRATION_VERSION;
    localStorage.setItem('WMEPH-Settings', JSON.stringify(wmephSettings));
    logDev(`Migrated settings to WMEPH-Settings object`);

    // Clean up old keys
    const removedKeys = [];
    oldKeys.forEach((key) => {
      if (localStorage.getItem(key) !== null) {
        removedKeys.push(key);
        localStorage.removeItem(key);
      }
    });
    logDev(`Removed ${removedKeys.length} old keys: ${removedKeys.join(', ')}`);

    // Additional cleanup: remove any remaining top-level WMEPH keys (catch-all for missed keys)
    const strayKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('WMEPH-') || key.startsWith('WMEPH_')) && key !== 'WMEPH-Settings' && key !== 'WMEPH-venueWhitelistNew' && key !== 'WMEPH-venueWhitelistCompressed') {
        strayKeys.push(key);
        localStorage.removeItem(key);
        i--; // Adjust index since we removed an item
      }
    }
    if (strayKeys.length > 0) {
      logDev(`Removed ${strayKeys.length} stray keys: ${strayKeys.join(', ')}`);
    }
  }

  /**
   * Loads centralized WMEPH settings from localStorage into wmephSettings cache.
   * Ensures large whitelist data is never included in settings (kept as separate keys).
   * Removes whitelist entries if found as safeguard against bloated settings object.
   */
  function loadWMEPHSettings() {
    wmephSettings = JSON.parse(localStorage.getItem('WMEPH-Settings') || '{}');
    // Ensure whitelist data is never stored in settings object (kept as separate localStorage keys to avoid bloating)
    // These are removed here as a safeguard in case they are mistakenly added.
    delete wmephSettings['WMEPH-venueWhitelistCompressed'];
    delete wmephSettings['WMEPH-venueWhitelistNew'];
  }

  /**
   * Main initialization function called when script first runs.
   * Sets up UI, keyboard shortcuts, event listeners, data layers, and PNH data loading.
   * Creates map layers for venue highlighting, duplicate labels, and Google Places links.
   * Registers SDK event handlers for selection changes and data model updates.
   * Initializes settings tab, whitelist system, and color highlighting layer.
   * @async
   */
  async function placeHarmonizerInit() {
    interceptGoogleGetDetails();
    updateUserInfo();
    logDev('placeHarmonizerInit'); // Be sure to update User info before calling logDev()

    // Migrate legacy localStorage keys to centralized settings object
    migrateSettingsToObject();
    loadWMEPHSettings(); // Ensure settings are loaded into cache

    // Initialize custom keyboard shortcut (used by harmonize shortcut below)
    initShortcutKey();

    // Register SDK shortcuts with normalized key binding storage
    registerShortcut('wmeph_zoom_place', 'WMEPH: Zoom to selected place', 'A+Z', () => {
      zoomPlace();
    });
    registerShortcut('wmeph_color_highlighting', 'WMEPH: Toggle color highlighting', 'A+C', () => {
      toggleHighlightCheckbox();
    });
    // Third shortcut: Harmonize place with user-configurable key (from UI settings)
    const harmonizeKey = loadHarmonizeShortcut();
    logDev(`Harmonize shortcut key loaded: ${harmonizeKey}`);
    if (harmonizeKey) {
      registerShortcut('wmeph_harmonize_place', 'WMEPH: Harmonize selected place', harmonizeKey, () => {
        harmonizePlace();
      });
    } else {
      logDev('loadHarmonizeShortcut returned null or empty - harmonize shortcut not registered');
    }

    // Layer displays venues based on severity flags and parking lot types
    // Priority: wmephHighlight > lock types > (parking + severity) > severity alone > parking alone
    _layer = 'wmeph_highlights';
    try {
      sdk.Map.addLayer({
        layerName: _layer,
        zIndexing: true,
        styleContext: {
          getColor: ({ feature }) => {
            const parkingType = feature?.properties?.parkingType;
            return PARKING_TYPE_COLORS[parkingType];
          },
          getSeverityColor: ({ feature }) => {
            const severity = feature?.properties?.wmephSeverity;
            return SEVERITY_COLORS[severity];
          },
          getPointRadius: ({ zoomLevel }) => {
            return zoomLevel > 17 ? 12 : 8;
          },
          getGraphicName: ({ feature }) => {
            return feature?.properties?.isResidential ? 'triangle' : 'circle';
          },
          getStrokeDashstyle: ({ feature }) => {
            return feature?.properties?.isResidential ? '2 4' : '2 10';
          },
        },
        styleRules: [
          // Rule 1: Filter highlight (wmephHighlight = '1') - magenta stroke only, highest priority
          {
            predicate: (props, zoomLevel) => props.wmephHighlight === '1',
            style: {
              pointRadius: '${getPointRadius}',
              graphicName: '${getGraphicName}',
              fillOpacity: 0,
              strokeWidth: 5,
              strokeColor: '#F0F',
              strokeOpacity: 0.8,
            },
          },
          // Rule 2: Lock severity types (lock, lock1, adLock) - points with dashed style
          {
            predicate: (props, zoomLevel) => props.wmephHighlight !== '1' && (props.wmephSeverity === 'lock' || props.wmephSeverity === 'lock1' || props.wmephSeverity === 'adLock') && props.isPoint === true,
            style: {
              pointRadius: '${getPointRadius}',
              graphicName: '${getGraphicName}',
              fillOpacity: 0,
              strokeColor: '${getSeverityColor}',
              strokeWidth: 5,
              strokeOpacity: 1,
              strokeDashstyle: '${getStrokeDashstyle}'
            },
          },
          // Rule 2b: Lock severity types (lock, lock1, adLock) - polygons with dashed style
          {
            predicate: (props, zoomLevel) => props.wmephHighlight !== '1' && (props.wmephSeverity === 'lock' || props.wmephSeverity === 'lock1' || props.wmephSeverity === 'adLock') && props.isPoint !== true,
            style: {
              fillOpacity: 0,
              strokeColor: '${getSeverityColor}',
              strokeWidth: 8,
              strokeOpacity: 1,
              strokeDashstyle: '${getStrokeDashstyle}'
            },
          },
          // Rule 3: Parking lot with severity - both fill (parking type) and stroke (severity severity), excluding lock severities
          {
            predicate: (props, zoomLevel) => {
              const hideGreen = getWMEPHSetting('WMEPH-HideGreenPlaces') === '1';
              const isGreen = props.wmephSeverity === 0;
              if (hideGreen && isGreen) return false;
              return props.wmephHighlight !== '1' && props.parkingType !== undefined && props.wmephSeverity !== undefined && props.wmephSeverity !== 'lock' && props.wmephSeverity !== 'lock1' && props.wmephSeverity !== 'adLock';
            },
            style: {
              pointRadius: '${getPointRadius}',
              graphicName: '${getGraphicName}',
              fillColor: '${getColor}',
              fillOpacity: 0.5,
              strokeColor: '${getSeverityColor}',
              strokeWidth: 5,
              strokeOpacity: 1,
            },
          },
          // Rule 4: Severity only (no parking type) - stroke only, excluding lock severities
          {
            predicate: (props, zoomLevel) => {
              const hideGreen = getWMEPHSetting('WMEPH-HideGreenPlaces') === '1';
              const isGreen = props.wmephSeverity === 0;
              if (hideGreen && isGreen) return false;
              return props.wmephHighlight !== '1' && props.wmephSeverity !== undefined && props.wmephSeverity !== 'lock' && props.wmephSeverity !== 'lock1' && props.wmephSeverity !== 'adLock';
            },
            style: {
              pointRadius: '${getPointRadius}',
              graphicName: '${getGraphicName}',
              fillOpacity: 0,
              strokeColor: '${getSeverityColor}',
              strokeWidth: 5,
              strokeOpacity: 1,
            },
          },
          // Rule 5: Parking lot only (no severity) - fill only
          {
            predicate: (props, zoomLevel) => {
              const hideGreen = getWMEPHSetting('WMEPH-HideGreenPlaces') === '1';
              const isGreen = props.wmephSeverity === 0;
              if (hideGreen && isGreen) return false;
              return props.wmephHighlight !== '1' && props.parkingType !== undefined;
            },
            style: {
              pointRadius: '${getPointRadius}',
              graphicName: '${getGraphicName}',
              fillColor: '${getColor}',
              fillOpacity: 0.5,
              strokeOpacity: 0,
            },
          },
        ],
      });
    } catch (e) {
      logDev(`${_layer} layer error:`, e);
    }

    // Create layer for Google place links visualization
    try {
      sdk.Map.addLayer({
        layerName: 'wmeph_google_link',
        zIndexing: true,
        styleContext: {
          getLabel: (context) => context.feature?.properties?.label ?? '',
        },
        styleRules: [
          {
            predicate: (props) => props.poiCoord === true,
            style: {
              pointRadius: 6,
              strokeWidth: 30,
              strokeColor: '#FF0',
              fillColor: '#FF0',
              strokeOpacity: 0.5,
            },
          },
          {
            predicate: (props) => !props.poiCoord,
            style: {
              strokeColor: '#FF0',
              strokeWidth: 3,
              strokeOpacity: 1.0,
              strokeDashstyle: '12 8',
              label: '${getLabel}',
              labelOutlineWidth: 4,
              labelOutlineColor: '#000',
              labelYOffset: +45,
              fontColor: '#FF0',
              fontSize: '18px',
              fontWeight: 'bold',
            },
          },
        ],
      });
    } catch (e) {
      logDev('wmeph_google_link layer error:', e);
    }

    // Add CSS stuff here
    const css = ['.wmeph-mods-table-cell { border: solid 1px #bdbdbd; padding-left: 3px; padding-right: 3px; }', '.wmeph-mods-table-cell.title { font-weight: bold; }'].join('\n');
    $('head').append(`<style type="text/css">${css}</style>`);

    OpeningHour = require('Waze/Model/Objects/OpeningHour');

    // Append a form div for submitting to the forum, if it doesn't exist yet:
    const tempDiv = document.createElement('div');
    tempDiv.id = 'WMEPH_formDiv';
    tempDiv.style.display = 'none';
    $('body').append(tempDiv);

    _userLanguage = I18n.locale;

    appendServiceButtonIconCss();
    UPDATED_FIELDS.init();
    addPURWebSearchButton();

    // Use SDK layer for duplicate place names (created during initialization)
    _dupeLayer = 'wmeph_dupe_labels';

    // Create the dupe labels layer if it doesn't exist
    try {
      sdk.Map.addLayer({
        layerName: _dupeLayer,
        zIndexing: true,
        styleContext: {
          getColor: ({ feature }) => {
            if (feature?.properties?.dupeType === 'primary') {
              return '#00FF00'; // GREEN for primary
            }
            return '#ffff00'; // YELLOW for duplicates
          },
          getPointRadius: ({ zoomLevel }) => {
            return zoomLevel > 17 ? 12 : 8;
          },
          getLabel: ({ feature }) => {
            return feature?.properties?.label || 'Unknown';
          },
        },
        styleRules: [
          {
            style: {
              pointRadius: 20,
              fillColor: '${getColor}',
              fillOpacity: 0.8,
              strokeColor: '${getColor}',
              strokeWidth: 2,
              strokeOpacity: 1,
              label: '${getLabel}',
              labelYOffset: -15,
              fontColor: '#000000',
              fontSize: '11px',
              fontWeight: 'bold',
            },
          },
        ],
      });
    } catch (e) {
      logDev('wmeph_dupe_labels layer error:', e.message);
    }

    // Don't Add checkbox for dupe labels layer using LayerSwitcher
    // sdk.LayerSwitcher.addLayerCheckbox({ name: 'WMEPH Dupe Labels', isChecked: true });

    // Initialize layer z-indexes: venues as baseline, then stack custom layers on top
    // Order (bottom to top): venues < wmeph_google_link < wmeph_dupe_labels < wmeph_highlights
    try {
      const venuesZIndex = sdk.Map.getLayerZIndex({ layerName: 'venues' });
      sdk.Map.setLayerZIndex({ layerName: 'wmeph_google_link', zIndex: venuesZIndex + 1 });
      sdk.Map.setLayerZIndex({ layerName: _dupeLayer, zIndex: venuesZIndex + 2 });
      sdk.Map.setLayerZIndex({ layerName: _layer, zIndex: venuesZIndex + 3 });
      logDev(`Layer z-indexes initialized: venues=${venuesZIndex}, google_link=${venuesZIndex + 1}, dupe_labels=${venuesZIndex + 2}, highlights=${venuesZIndex + 3}`);
    } catch (e) {
      logDev('Error initializing layer z-indexes:', e);
    }

    if (getWMEPHSetting('WMEPH-featuresExamined') === null) {
      setWMEPHSetting('WMEPH-featuresExamined', '0'); // Storage for whether the User has pressed the button to look at updates
    }

    createObserver();

    // X-ray Mode: Fade roads/satellite/mapComments to see map details underneath
    // Uses sdk.Map.addStyleRuleToLayer() to reduce opacity of background layers
    // Always starts unchecked to avoid confusion if user forgets it's enabled
    sdk.LayerSwitcher.addLayerCheckbox({ name: 'WMEPH x-ray mode', isChecked: false });

    // If the SDK remembered X-ray mode as checked from a previous session, apply it immediately
    try {
      if (sdk.LayerSwitcher.isLayerCheckboxChecked({ name: 'WMEPH x-ray mode' })) {
        setTimeout(() => toggleXrayMode(true), 500);
      }
    } catch (e) {
      logDev('X-Ray: Could not check initial state:', e);
    }

    sdk.Events.on({
      eventName: 'wme-layer-checkbox-toggled',
      eventHandler: (payload) => {
        if (payload.name === 'WMEPH x-ray mode') {
          toggleXrayMode(payload.checked);
        } else if (payload.name === 'WMEPH Dupe Labels') {
          if (payload.checked) redrawLayer(_dupeLayer);
          else sdk.Map.removeAllFeaturesFromLayer({ layerName: _dupeLayer });
        }
      },
    });

    // Whitelist initialization - use only compressed version (uncompressed is optional backup)
    const compressedWL = localStorage.getItem(WL_LOCAL_STORE_NAME_COMPRESSED);
    const uncompressedWL = localStorage.getItem(WL_LOCAL_STORE_NAME);

    if (compressedWL) {
      // Try to decompress and load compressed version
      try {
        const decompressed = LZString.decompressFromUTF16(compressedWL);
        if (validateWLS(decompressed)) {
          loadWhitelistFromLS(true);
          // Log successful decompression with state breakdown
          const stateCount = {};
          let totalVenues = 0;
          for (const venueID in _venueWhitelist) {
            if (venueID !== '1.1.1') {
              totalVenues++;
              const state = _venueWhitelist[venueID].state || 'Unknown';
              stateCount[state] = (stateCount[state] || 0) + 1;
            }
          }
          logDev(`✓ Compressed whitelist decompressed OK - ${totalVenues} venues, by state: ${JSON.stringify(stateCount)}`);
        } else {
          throw new Error('Decompressed data failed validation');
        }
      } catch (e) {
        logDev('✗ Error with compressed whitelist:', e.message);
        if (uncompressedWL && validateWLS(uncompressedWL)) {
          // Fallback to uncompressed backup (exists only if WL was < 4.8MB when saved)
          loadWhitelistFromLS(false);
          const stateCount = {};
          let totalVenues = 0;
          for (const venueID in _venueWhitelist) {
            if (venueID !== '1.1.1') {
              totalVenues++;
              const state = _venueWhitelist[venueID].state || 'Unknown';
              stateCount[state] = (stateCount[state] || 0) + 1;
            }
          }
          logDev(`⚠ Using uncompressed backup - ${totalVenues} venues, by state: ${JSON.stringify(stateCount)}`);
        } else {
          logDev('✗ No valid whitelist found, creating new');
          _venueWhitelist = { '1.1.1': { Placeholder: {} } };
          saveWhitelistToLS(true);
        }
      }
    } else if (uncompressedWL && validateWLS(uncompressedWL)) {
      // Legacy: only uncompressed exists (shouldn't happen with current code)
      loadWhitelistFromLS(false);
      const stateCount = {};
      let totalVenues = 0;
      for (const venueID in _venueWhitelist) {
        if (venueID !== '1.1.1') {
          totalVenues++;
          const state = _venueWhitelist[venueID].state || 'Unknown';
          stateCount[state] = (stateCount[state] || 0) + 1;
        }
      }
      logDev(`⚠ Loading legacy uncompressed whitelist (no compressed found) - ${totalVenues} venues, by state: ${JSON.stringify(stateCount)}`);
      saveWhitelistToLS(true); // Create compressed version for future
    } else {
      // No whitelist found
      logDev('✗ No whitelist found, creating new');
      _venueWhitelist = { '1.1.1': { Placeholder: {} } };
      saveWhitelistToLS(true);
    }

    if (USER.name === 'ggrane') {
      _searchResultsWindowSpecs = `"resizable=yes, top=${Math.round(window.screen.height * 0.1)}, left=${Math.round(window.screen.width * 0.3)}, width=${Math.round(
        window.screen.width * 0.86,
      )}, height=${Math.round(window.screen.height * 0.8)}"`;
    }

    // Settings setup
    if (!localStorage.getItem(SETTING_IDS.gLinkWarning)) {
      // store settings so the warning is only given once
      localStorage.setItem(SETTING_IDS.gLinkWarning, '0');
    }
    if (!localStorage.getItem(SETTING_IDS.sfUrlWarning)) {
      // store settings so the warning is only given once
      localStorage.setItem(SETTING_IDS.sfUrlWarning, '0');
    }

    sdk.Events.on({
      eventName: 'wme-map-mouse-move',
      eventHandler: (e) =>
        errorHandler(() => {
          _wmephMousePosition = { lat: e.lat, lon: e.lon };
        }),
    });

    // Add zoom shortcut
    SHORTCUT.add('Control+Alt+Z', zoomPlace);

    // Add Color Highlighting shortcut
    SHORTCUT.add('Control+Alt+h', () => {
      $('#WMEPH-ColorHighlighting').trigger('click');
    });

    await addWmephTab(); // initialize the settings tab

    // Event listeners
    sdk.Events.on({
      eventName: 'wme-selection-changed',
      eventHandler: () => {
        logDev('selectionchanged');
        errorHandler(updateWmephPanel, true);
      },
    });
    sdk.Events.on({
      eventName: 'wme-data-model-objects-saved',
      eventHandler: () => errorHandler(destroyDupeLabels),
    });
    sdk.Events.on({
      eventName: 'wme-data-model-objects-saved',
      eventHandler: (event) =>
        errorHandler(() => {
          // SDK passes {dataModelName, objectIds}, convert to venue objects
          if (event?.objectIds && Array.isArray(event.objectIds)) {
            const savedVenues = event.objectIds.map((id) => sdk.DataModel.Venues.getById({ venueId: id })).filter((v) => v);
            syncWL(savedVenues);
          }
        }),
    });
    sdk.Events.on({
      eventName: 'wme-data-model-objects-changed',
      eventHandler: (event) =>
        errorHandler(() => {
          // SDK passes {dataModelName, objectIds}, convert to venue objects
          if (event?.objectIds && Array.isArray(event.objectIds)) {
            const changedVenues = event.objectIds.map((id) => sdk.DataModel.Venues.getById({ venueId: id })).filter((v) => v);
            onVenuesChanged(changedVenues);
          }
        }),
    });
    window.addEventListener('beforeunload', onWindowBeforeUnload, false);

    // Remove any temporary ID values (ID < 0) from the WL store at startup.
    let removedWLCount = 0;
    Object.keys(_venueWhitelist).forEach((venueID) => {
      if (venueID < 0) {
        delete _venueWhitelist[venueID];
        removedWLCount += 1;
      }
    });
    if (removedWLCount > 0) {
      saveWhitelistToLS(true);
      logDev(`Removed ${removedWLCount} venues with temporary ID's from WL store`);
    }

    _catTransWaze2Lang = I18n.translations[_userLanguage].venues.categories; // pulls the category translations

    // Split out state-based data
    const _stateHeaders = PNH_DATA.states[0].split('|');
    _psStateIx = _stateHeaders.indexOf('ps_state');
    _psState2LetterIx = _stateHeaders.indexOf('ps_state2L');
    _psRegionIx = _stateHeaders.indexOf('ps_region');
    _psGoogleFormStateIx = _stateHeaders.indexOf('ps_gFormState');
    _psDefaultLockLevelIx = _stateHeaders.indexOf('ps_defaultLockLevel');
    // ps_requirePhone_ix = _stateHeaders.indexOf('ps_requirePhone');
    // ps_requireURL_ix = _stateHeaders.indexOf('ps_requireURL');
    _psAreaCodeIx = _stateHeaders.indexOf('ps_areacode');

    // Set up Run WMEPH button once place is selected
    updateWmephPanel();

    sdk.Events.on({
      eventName: 'wme-data-model-objects-changed',
      eventHandler: () => {
        errorHandler(() => {
          if ($('#WMEPH_banner').length > 0) {
            updateServicesChecks();
            assembleServicesBanner();
          }
        });
      },
    });

    log('Starting Highlighter');

    // CRITICAL: Activate data model event tracking before setting up listeners
    sdk.Events.trackDataModelEvents({ dataModelName: 'venues' });

    bootstrapWmephColorHighlights();

    // Apply initial filter highlights
    if ($('#WMEPH-ShowFilterHighlight').prop('checked')) {
      updateFilterHighlights();
    }
  } // END placeHarmonizer_init function

  /**
   * Clears all highlights from the map layer and rebuilds based on enabled settings.
   * Calls individual highlight update functions (color severity, parking lot type, filter) if enabled.
   * Performs single layer redraw at the end for efficiency.
   * Called when user toggles highlight settings or when data changes significantly.
   */
  function refreshAllHighlights() {
    // Don't highlight if WME Venues layer is hidden
    const venuesLayerVisible = sdk.Map.isLayerVisible({ layerName: 'venues' });
    if (!venuesLayerVisible) {
      try {
        sdk.Map.removeAllFeaturesFromLayer({ layerName: _layer });
      } catch (e) {
        logDev('Error clearing highlights layer:', e);
      }
      return;
    }

    // Clear layer once
    try {
      sdk.Map.removeAllFeaturesFromLayer({ layerName: _layer });
    } catch (e) {
      logDev('Error clearing highlights layer:', e);
    }

    // Rebuild all enabled highlight types
    const colorHighlightingEnabled = getWMEPHSetting('WMEPH-ColorHighlighting') === '1';
    const parkingLotHighlightingEnabled = $('#WMEPH-PLATypeFill').prop('checked');
    const filterHighlightingEnabled = $('#WMEPH-ShowFilterHighlight').prop('checked');

    if (colorHighlightingEnabled) {
      applyHighlightsTest(sdk.DataModel.Venues.getAll(), false); // Use cache to avoid unnecessary recalculation on pan events
    }
    if (parkingLotHighlightingEnabled) {
      updateParkingLotHighlights(true); // Pass true to skip internal clear
    }
    if (filterHighlightingEnabled) {
      updateFilterHighlights(true); // Pass true to skip internal clear
    }

    // Redraw once after all updates
    if (_layer) {
      redrawLayer(_layer);
    }
  }

  /**
   * Updates map highlighting for parking lots based on their type (public, restricted, private).
   * Queries all venues, identifies parking lot types via SDK, and adds colored features to map layer.
   * Optionally skips clearing layer for efficiency when called from refreshAllHighlights.
   * Reapplies filter highlights on top if they are also enabled.
   * @param {boolean} skipClear If true, skips clearing the layer (assume caller will handle it).
   */
  function updateParkingLotHighlights(skipClear = false) {
    if (!$('#WMEPH-PLATypeFill').prop('checked')) {
      return;
    }

    // Don't highlight if WME Venues layer is hidden
    if (!sdk.Map.isLayerVisible({ layerName: 'venues' })) {
      return;
    }

    try {
      const venues = sdk.DataModel.Venues.getAll();
      const parkingLotsToAdd = [];

      venues.forEach((v) => {
        if (!v || !v.geometry || !v.id) return;
        try {
          const parkingType = sdk.DataModel.Venues.ParkingLot.getParkingLotType({ venueId: v.id });
          if (parkingType) {
            parkingLotsToAdd.push({ venue: v, parkingType });
          }
        } catch (e) {
          logDev(`Error checking ${v.name}:`, e.message);
        }
      });

      // Remove old parking lot features before adding new ones (unless skipClear from refreshAllHighlights)
      if (!skipClear) {
        try {
          // We need to identify and remove parking lot features
          // For now, we'll clear and rebuild both parking + filter
          sdk.Map.removeAllFeaturesFromLayer({ layerName: _layer });
        } catch (e) {
          logDev('Error clearing highlights layer:', e);
        }
      }

      parkingLotsToAdd.forEach(({ venue, parkingType }) => {
        try {
          const feature = {
            type: 'Feature',
            id: `parking_${venue.id}`,
            geometry: venue.geometry,
            properties: {
              name: venue.name,
              parkingType: parkingType,
              isPoint: venue.geometry?.type === 'Point',
              highlightType: 'parking',
              isResidential: venue.residential === true || venue.categories?.includes('RESIDENTIAL'),
            },
          };
          sdk.Map.addFeatureToLayer({
            layerName: _layer,
            feature: feature,
          });
        } catch (err) {
          logDev(`Error adding parking lot ${venue.id}:`, err);
        }
      });

      // Reapply filter highlights on top if enabled
      if ($('#WMEPH-ShowFilterHighlight').prop('checked')) {
        updateFilterHighlights(true);
      }
    } catch (err) {
      logDev('Error updating parking lot highlights:', err);
    }
  }

  /**
   * Updates map highlighting for venues that don't have PARKING_FOR_CUSTOMERS service.
   * Identifies places missing customer parking and highlights them on the map layer.
   * Excludes certain venue categories that shouldn't require parking service.
   * Optionally skips clearing layer for efficiency when called from refreshAllHighlights.
   * @param {boolean} skipClear If true, skips clearing the layer (assume caller will handle it).
   */
  function updateFilterHighlights(skipClear = false) {
    if (!$('#WMEPH-ShowFilterHighlight').prop('checked')) {
      return;
    }

    // Don't highlight if WME Venues layer is hidden
    if (!sdk.Map.isLayerVisible({ layerName: 'venues' })) {
      return;
    }

    try {
      const venues = sdk.DataModel.Venues.getAll();
      const featuresToAdd = [];
      // Do not highlight places if any of these are the primary category.
      const CATS_TO_IGNORE_CUSTOMER_PARKING_HIGHLIGHT = [
        'BRIDGE',
        'CANAL',
        'CHARGING_STATION',
        'CONSTRUCTION_SITE',
        'ISLAND',
        'JUNCTION_INTERCHANGE',
        'NATURAL_FEATURES',
        'PARKING_LOT',
        'RESIDENCE_HOME',
        'RIVER_STREAM',
        'SEA_LAKE_POOL',
        'SWAMP_MARSH',
        'TUNNEL',
        'RESIDENTIAL', // SDK residential category
      ];

      venues.forEach((v) => {
        // Filter: exclude venues with PARKING_FOR_CUSTOMERS service or certain categories (including PARKING_LOT)
        if (v.services?.includes('PARKING_FOR_CUSTOMERS') || v.categories?.some((cat) => CATS_TO_IGNORE_CUSTOMER_PARKING_HIGHLIGHT.includes(cat))) {
          return;
        }

        // Convert SDK geometry to GeoJSON feature
        const feature = {
          type: 'Feature',
          id: `filter_highlight_${v.id}`,
          geometry: v.geometry,
          properties: {
            wmephHighlight: '1',
            venueId: v.id,
            isPoint: v.geometry?.type === 'Point',
            highlightType: 'filter',
            isResidential: v.residential === true || v.categories?.includes('RESIDENTIAL'),
          },
        };
        featuresToAdd.push(feature);
      });

      // Add all filter features to highlights layer
      featuresToAdd.forEach((feature) => {
        sdk.Map.addFeatureToLayer({
          layerName: _layer,
          feature: feature,
        });
      });
    } catch (e) {
      logDev('Error updating filter highlights:', e);
    }
  }

  /*******************************************
   *   Performance monitoring FUNCTION
   ******************************************/
  let wmephStats = {
    harmonizeCount: 0,
    totalHarmonizeTime: 0,
    lastHarmonizeTime: 0,
    maxHarmonizeTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalCacheHitTime: 0,
    totalCacheMissTime: 0,
    lastCacheHitTime: 0,
    lastCacheMissTime: 0,
    maxCacheHitTime: 0,
    maxCacheMissTime: 0,
  };

  function estimateObjectSize(obj) {
    if (!obj) return 0;
    try {
      const json = JSON.stringify(obj);
      return (new TextEncoder().encode(json).length / 1048576).toFixed(1);
    } catch (e) {
      return 'N/A';
    }
  }

  function initPerformancePanel() {
    const panel = document.createElement('div');
    panel.id = 'wmeph-debug-panel';
    panel.style.cssText = `
      position: fixed; bottom: 20px; left: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: #0f0;
      font-family: monospace;
      font-size: 11px;
      padding: 10px;
      border: 1px solid #0f0;
      z-index: 10000;
      max-width: 250px;
      cursor: move;
      user-select: none;
    `;

    // Make panel draggable
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    panel.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragOffsetX = e.clientX - panel.getBoundingClientRect().left;
      dragOffsetY = e.clientY - panel.getBoundingClientRect().top;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panel.style.left = `${e.clientX - dragOffsetX}px`;
        panel.style.top = `${e.clientY - dragOffsetY}px`;
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    document.body.appendChild(panel);

    setInterval(() => {
      const totalMem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) : 'N/A';
      const pnhMem = estimateObjectSize(PNH_DATA);
      const cacheMem = estimateObjectSize(_resultsCache);
      const wlMem = estimateObjectSize(_venueWhitelist);
      const scriptMem = (parseFloat(pnhMem || 0) + parseFloat(cacheMem || 0) + parseFloat(wlMem || 0)).toFixed(1);
      const totalCacheOps = wmephStats.cacheHits + wmephStats.cacheMisses;
      const cacheHitRate = totalCacheOps > 0 ? ((wmephStats.cacheHits / totalCacheOps) * 100).toFixed(1) : 'N/A';
      const avgCacheHitTime = wmephStats.cacheHits > 0 ? (wmephStats.totalCacheHitTime / wmephStats.cacheHits).toFixed(0) : 0;
      const avgCacheMissTime = wmephStats.cacheMisses > 0 ? (wmephStats.totalCacheMissTime / wmephStats.cacheMisses).toFixed(0) : 0;

      panel.innerHTML = `
        <div>🔧 WMEPH Debug</div>
        <div>Harmonize count: ${wmephStats.harmonizeCount}</div>
        <div>Last time: ${wmephStats.lastHarmonizeTime.toFixed(0)}ms</div>
        <div>Max time: ${wmephStats.maxHarmonizeTime.toFixed(0)}ms</div>
        <div>Avg time: ${wmephStats.harmonizeCount > 0 ? (wmephStats.totalHarmonizeTime / wmephStats.harmonizeCount).toFixed(0) : 0}ms</div>
        <div style="border-top: 1px solid #0f0; margin-top: 5px; padding-top: 5px;">
          <div><strong>Cache Performance</strong></div>
          <div>Hits: ${wmephStats.cacheHits} | Misses: ${wmephStats.cacheMisses} (${cacheHitRate}%)</div>
          <div>Hit avg: ${avgCacheHitTime}ms | Miss avg: ${avgCacheMissTime}ms</div>
          <div>Hit max: ${wmephStats.maxCacheHitTime.toFixed(0)}ms | Miss max: ${wmephStats.maxCacheMissTime.toFixed(0)}ms</div>
        </div>
        <div style="border-top: 1px solid #0f0; margin-top: 5px; padding-top: 5px;">
          <div>Total heap: ${totalMem}MB</div>
          <div>Script memory: ${scriptMem}MB</div>
          <div style="font-size: 10px;">PNH: ${pnhMem}MB | Cache: ${cacheMem}MB | WL: ${wlMem}MB</div>
        </div>
      `;
    }, 1000);
  }

  function devTestCode() {
    const userInfo = sdk.State.getUserInfo();
    if (userInfo && (userInfo.userName === 'MapOMatic' || userInfo.userName === 'JS55CT')) {
      // For debugging purposes.  May be removed when no longer needed.
      unsafeWindow.PNH_DATA = PNH_DATA;
      unsafeWindow.WMEPH_FLAG = Flag;
      unsafeWindow._wmephBetaList = _wmephBetaList;
      initPerformancePanel();

      // Log full PNH data structure
      console.log('PNH_DATA:', PNH_DATA);
      console.log('_wmephBetaList:', _wmephBetaList);
    }
  }

  /*******************************************
   *   MAIN BOOTSTRAP FUNCTION
   ******************************************/

  async function wmephbootstrap() {
    // Quit if another version of WMEPH is already running.
    if (unsafeWindow.wmephRunning) {
      // Don't use WazeWrap alerts here. It isn't loaded yet.
      alert('Multiple versions of WME Place Harmonizer are turned on. Only one will be enabled.');
      return;
    }
    unsafeWindow.wmephRunning = 1;

    // Initialize SDK early and populate CAT before PNH data is downloaded
    log('Initializing SDK and categories...');
    sdk = await bootstrap({
      scriptName: SCRIPT_NAME,
      scriptUpdateMonitor: {
        downloadUrl: IS_BETA_VERSION ? dec(BETA_DOWNLOAD_URL) : PROD_DOWNLOAD_URL,
        scriptVersion: SCRIPT_VERSION,
      },
    });
    try {
      initializeCategories();
    } catch (e) {
      logDev('Failed to initialize categories:', e);
    }

    // Start downloading the PNH spreadsheet data in the background.  Starts the script once data is ready.
    await Pnh.downloadAllData();

    log('Starting Place Harmonizer initialization');
    await placeHarmonizerInit();
    //devTestCode();
    showScriptInfoAlert();
  }

  wmephbootstrap();
})();
