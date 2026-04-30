// ==UserScript==
// @name        WME Place Harmonizer (Beta)
// @namespace   WazeUSA
// @version     2026.04.30.001
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH Development Group
// @include      https://www.waze.com/editor*
// @include      https://www.waze.com/*/editor*
// @include      https://beta.waze.com/editor*
// @include      https://beta.waze.com/*/editor*
// @exclude      https://www.waze.com/user/editor*
// @exclude      https://www.waze.com/dashboard/editor
// @require     https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
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
  const SCRIPT_UPDATE_MESSAGE = ['Removing deprecated WazeWrap functionality', 'Shortcuts are non-functional', '(Some?) highlighting is broken due to it not being implemented in the SDK'];

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

  // Severity level colors (used for both map layer and banner background)
  const SEVERITY_COLORS = {
    [SEVERITY.GREEN]: '#00CC00', // complete
    [SEVERITY.BLUE]: '#0000FF', // minor issues
    [SEVERITY.YELLOW]: '#FFFF00', // moderate issues
    [SEVERITY.RED]: '#FF0000', // major issues
    [SEVERITY.PINK]: '#FF1493', // extreme issues
    [SEVERITY.ORANGE]: '#FFA500', // other issues
    lock: '#8B008B', // locked
    lock1: '#FF69B4', // lock issue
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
  const COMMON_EV_PAYMENT_METHODS = {
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
  const getPrimaryCatsToIgnoreMissingPhoneUrl = () => [CAT.ISLAND, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.JUNCTION_INTERCHANGE, CAT.SCENIC_LOOKOUT_VIEWPOINT];
  const getPrimaryCatsToFlagGreenMissingPhoneUrl = () => [CAT.BRIDGE, CAT.FOREST_GROVE, CAT.DAM, CAT.TUNNEL, CAT.CEMETERY];
  const getAnyCatsToFlagGreenMissingPhoneUrl = () => [CAT.REST_AREAS];
  const REGIONS_THAT_WANT_PLA_PHONE_URL = ['SER'];
  const getChainApprovalPrimaryCatsToIgnore = () => [
    CAT.POST_OFFICE,
    CAT.BRIDGE,
    CAT.FOREST_GROVE,
    CAT.DAM,
    CAT.TUNNEL,
    CAT.CEMETERY,
    CAT.ISLAND,
    CAT.SEA_LAKE_POOL,
    CAT.RIVER_STREAM,
    CAT.CANAL,
    CAT.JUNCTION_INTERCHANGE,
    CAT.SCENIC_LOOKOUT_VIEWPOINT,
  ];
  const getCatsThatDontNeedNames = () => [CAT.SEA_LAKE_POOL];
  const BAD_URL = 'badURL';
  const BAD_PHONE = 'badPhone';
  // Feeds that are not in use and it's safe to delete the place. Use regex.
  const FEEDS_TO_SKIP = [/^google$/i, /^yext\d?/i, /^wazeads$/i, /^parkme$/i, /^navads(na)?$/i];
  // Do not highlight places if any of these are the primary category.
  const CATS_TO_IGNORE_CUSTOMER_PARKING_HIGHLIGHT = [
    CAT.BRIDGE,
    CAT.CANAL,
    CAT.CHARGING_STATION,
    CAT.CONSTRUCTION_SITE,
    CAT.ISLAND,
    CAT.JUNCTION_INTERCHANGE,
    CAT.NATURAL_FEATURES,
    CAT.PARKING_LOT,
    CAT.RESIDENCE_HOME,
    CAT.RIVER_STREAM,
    CAT.SEA_LAKE_POOL,
    CAT.SWAMP_MARSH,
    CAT.TUNNEL,
    'RESIDENTIAL', // SDK residential category
  ];
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
      [
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
        'WHEELCHAIR_ACCESSIBLE',
        'DISABILITY_PARKING',
        'CURBSIDE_PICKUP',
        'CARPOOL_PARKING',
        'EV_CHARGING_STATION',
        'CAR_WASH',
        'SECURITY',
        'AIRPORT_SHUTTLE',
      ].forEach((service) => {
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
      wlString = LZString.decompressFromUTF16(wlString);
    } else {
      wlString = localStorage.getItem(WL_LOCAL_STORE_NAME);
    }
    _venueWhitelist = JSON.parse(wlString);
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
    return hours.days?.length === 7 && (hours.allDay === true || (hours.fromHour === '00:00' && hours.toHour === '00:00'));
  }

  function isEmergencyRoom(venue) {
    return /(?:emergency\s+(?:room|department|dept))|\b(?:er|ed)\b/i.test(venue.name);
  }

  function isRestArea(venue) {
    return venue.categories.includes(CAT.REST_AREAS) && /rest\s*area/i.test(venue.name);
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
   * @returns {boolean} True if venue's primary category is PARKING_LOT
   */
  function isVenueParkingLot(venue) {
    if (!venue) return false;
    const primaryCategory = venue.categories?.[0];
    return primaryCategory === 'PARKING_LOT';
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
                    ?.split(',')
                    .map((v) => v.trim())
                    .map((catName) => {
                      const cat = country.categoryInfos.getByName(catName)?.id;
                      if (!cat) {
                        result.warningMessages.push(`Unrecognized alternate category: ${catName}`);
                      }
                      return cat;
                    })
                    .filter((cat) => typeof cat === 'string');
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
                      if ((match = specialCase.match(/^buttOn_(.*)/i))) {
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
                      } else if ((match = specialCase.match(/^buttOff_(.+)/i))) {
                        const [, scFlag] = match;
                        switch (scFlag) {
                          case 'addConvStore':
                            this.flagsToRemove[scFlag] = true;
                            break;
                          default:
                            result.warningMessages.push(`Unrecognized ph_specCase value: ${specialCase}`);
                        }
                        // } else if (match = specCase.match(/^messOn_(.+)/i)) {
                        //    [, scFlag] = match;
                        //    _buttonBanner[scFlag].active = true;
                        // } else if (match = specCase.match(/^messOff_(.+)/i)) {
                        //    [, scFlag] = match;
                        //    _buttonBanner[scFlag].active = false;
                      } else if ((match = specialCase.match(/^psOn_(.+)/i))) {
                        const [, scFlag] = match;
                        // TODO: Add check for valid services.
                        this.servicesToAdd.push(scFlag);
                      } else if ((match = specialCase.match(/^psOff_(.+)/i))) {
                        const [, scFlag] = match;
                        // TODO: Add check for valid services.
                        this.servicesToRemove.push(scFlag);
                      } else if ((match = specialCase.match(/forceBrand<>([^,<]+)/i))) {
                        // If brand is going to be forced, use that.  Otherwise, use existing brand.
                        [, this.forceBrand] = match;
                      } else if ((match = specialCase.match(/^localURL_(.+)/i))) {
                        // parseout localURL data if exists (meaning place can have a URL distinct from the chain URL
                        [, this.localURLcheck] = new RegExp(match, 'i');
                      } else if ((match = specialCase.match(/^checkLocalization<>(.+)/i))) {
                        const [, localizationString] = match;
                        this.localizationRegEx = new RegExp(localizationString, 'g');
                      } else if ((match = specialCase.match(/phone<>(.*?)<>/))) {
                        [, this.recommendedPhone] = match;
                      } else if (/keepName/g.test(specialCase)) {
                        this.keepName = true;
                      } else if ((match = specialCase.match(/^optionAltName<>(.+)/i))) {
                        [, this.optionalAlias] = match;
                      } else if (/^closed$/i.test(specialCase)) {
                        this.chainIsClosed = true;
                      } else if ((match = specialCase.match(/^brandParent(\d+)/))) {
                        try {
                          this.brandParentLevel = parseInt(match[1], 10);
                        } catch {
                          result.warningMessages.push(`Invalid forceBrand value: ${specialCase}`);
                        }
                      } else if (/^strMatchAny$/i.test(specialCase)) {
                        this.strMatchAny = true;
                      } else if (/^pharmhours$/i.test(specialCase)) {
                        this.pharmhours = true;
                      } else if (/^notABank$/i.test(specialCase)) {
                        this.notABank = true;
                      } else if (/^optionCat2$/i.test(specialCase)) {
                        this.optionCat2 = true;
                      } else if (/^optionName2$/i.test(specialCase)) {
                        this.optionName2 = true;
                      } else if (/^altName2Desc$/i.test(specialCase)) {
                        this.altName2Desc = true;
                      } else if (/^subFuel$/i.test(specialCase)) {
                        this.subFuel = true;
                      } else if ((match = specialCase.match(/^regexNameMatch<>(.+)<>/i))) {
                        this.regexNameMatch = new RegExp(match[1].replace(/\\/, '\\').replace(/<or>/g, '|'), 'i');
                      } else if ((match = specialCase.match(/^lockAt(\d)$/i))) {
                        try {
                          this.lockAt = parseInt(match[1], 10);
                          if (this.lockAt < 1 || this.lockAt > 6) {
                            throw new Error();
                          }
                        } catch {
                          result.warningMessages.push(`Invalid ph_speccase lockAt value (must be between 1 and 6): ${specialCase}`);
                        }
                      } else if (/^noUpdateAlias$/i.test(specialCase)) {
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
        if (this.strMatchAny || this.primaryCategory === CAT.HOTEL) {
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
        if (categoryInfo.id === CAT.HOTEL) {
          appendWords.push('HOTEL');
        } else if (categoryInfo.id === CAT.BANK_FINANCIAL && !this.notABank) {
          appendWords.push('BANK', 'ATM');
        } else if (categoryInfo.id === CAT.SUPERMARKET_GROCERY) {
          appendWords.push('SUPERMARKET');
        } else if (categoryInfo.id === CAT.GYM_FITNESS) {
          appendWords.push('GYM');
        } else if (categoryInfo.id === CAT.GAS_STATION) {
          appendWords.push('GAS', 'GASOLINE', 'FUEL', 'STATION', 'GASSTATION');
        } else if (categoryInfo.id === CAT.CAR_RENTAL) {
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
      } else if (this.strMatchAny || this.primaryCategory === CAT.HOTEL) {
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
        if (categories[0] === CAT.GAS_STATION || PNHPriCat === CAT.GAS_STATION) {
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
            PNH_DATA.states = Pnh.processImportedDataColumn(values, 1);

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
                  categoryInfo.services.push({ wmeId: wmeServiceIds[iCol], pnhKey: pnhServiceKeys[iCol] });
                }
                break;
              case '':
                // ignore blank column
                break;
              default:
                throw new Error(`WMEPH: Unexpected category data from PNH sheet: ${headerValue}`);
            }
          });
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
      if (this.venueIsFlaggable(args)) {
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

    // 5/19/2019 (mapomatic) This base class action function doesn't seem to be necessary.
    // action() { } // overwrite this
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
        if (!args.highlightOnly) {
          if (!args.addr.state || !args.addr.country) {
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

              if (inferredAddress?.state && inferredAddress.country) {
                if ($('#WMEPH-AddAddresses').prop('checked')) {
                  // update the venue's address if option is enabled
                  updateAddress(args.venue, inferredAddress, args.actions);
                  UPDATED_FIELDS.address.updated = true;
                  result = new this(inferredAddress);
                } else if (![CAT.JUNCTION_INTERCHANGE].includes(args.categories[0])) {
                  new Flag.CityMissing(args);
                }
              } else {
                //  if the inference doesn't work...
                WazeWrap.Alerts.error(SCRIPT_NAME, 'This place has no address data and the address cannot be inferred from nearby segments. Please edit the address and run WMEPH again.');
                result = { exit: true }; // Don't bother returning a Flag. This will exit the rest of the harmonizePlaceGo function.
              }
            }
          }
        } else if (!args.addr.state || !args.addr.country) {
          // only highlighting
          result = { exit: true };
          if (args.venue.adLocked) {
            result.severity = 'adLock';
          } else {
            const cat = args.venue.categories;
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

      static venueIsFlaggable(args) {
        return (
          !args.categories.includes(CAT.RESIDENCE_HOME) &&
          !args.categories.includes('RESIDENTIAL') && // SDK residential category
          !args.nameBase?.replace(/[^A-Za-z0-9]/g, '') &&
          ![CAT.ISLAND, CAT.FOREST_GROVE, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.PARKING_LOT].includes(args.categories[0]) &&
          !(args.categories.includes(CAT.GAS_STATION) && args.brand)
        );
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
        return args.categories.includes(CAT.GAS_STATION) && isNullOrWhitespace(args.nameBase) && !isNullOrWhitespace(args.brand);
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
        return args.categories.includes(CAT.CHARGING_STATION) && args.url && ['https://www.nissan-europe.com/', 'https://www.eco-movement.com/'].includes(args.url);
      }
    },
    ClearThisPhone: class extends FlagBase {
      static defaultSeverity = SEVERITY.YELLOW;

      // Use this to highlight yellow any venues that have an invalid value and will be
      // auto-corrected when WMEPH is run.
      static venueIsFlaggable(args) {
        return args.categories.includes(CAT.CHARGING_STATION) && args.phone === '+33-1-72676914'; // Nissan Europe ph#
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
        if (!args.categories.includes(CAT.PARKING_LOT)) return false;
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
        return args.categories.includes(CAT.PARKING_LOT) && !args.nameBase?.replace(/[^A-Za-z0-9]/g, '').length && args.venue.lockRank < 2;
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
          !args.categories.includes(CAT.RESIDENCE_HOME) &&
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
            (categoryInfo.id === CAT.OTHER && Flag.UnmappedRegion.#regionsToFlagOther.includes(this.args.regionCode) && !this.args.isLocked) || !Flag.UnmappedRegion.isWhitelisted(this.args),
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
          if (categoryInfo.id === CAT.OTHER) {
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
        return !args.categories.includes(CAT.REST_AREAS) && !!this.#getRareCategoryInfos(args).length;
      }

      static #getRareCategoryInfos(args) {
        return args.categories
          .filter((cat) => cat !== 'RESIDENTIAL') // SDK has RESIDENTIAL as separate type, not a subcategory
          .map((cat) => args.pnhCategoryInfos.getById(cat))
          .filter((pnhCategoryInfo) => pnhCategoryInfo) // Filter out undefined category infos
          .filter((pnhCategoryInfo) => {
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

      static venueIsFlaggable(args) {
        return args.countryCode === PNH_DATA.USA.countryCode && args.categories.includes(CAT.REST_AREAS) && !/^Rest Area.* - /.test(args.nameBase + (args.nameSuffix ?? ''));
      }
    },
    RestAreaNoTransportation: class extends ActionFlag {
      static defaultSeverity = SEVERITY.YELLOW;
      static defaultMessage = 'Rest areas should not use the Transportation category.';
      static defaultButtonText = 'Remove it?';

      static venueIsFlaggable(args) {
        return args.categories.includes(CAT.REST_AREAS) && args.categories.includes(CAT.TRANSPORTATION);
      }

      action() {
        const categories = this.args.venue.categories.slice(); // create a copy
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

      static venueIsFlaggable(args) {
        return args.categories.includes(CAT.REST_AREAS) && args.categories.includes(CAT.GAS_STATION);
      }
    },
    RestAreaScenic: class extends WLActionFlag {
      static WL_KEY = 'restAreaScenic';
      static defaultWLTooltip = 'Whitelist place';
      static defaultMessage = 'Verify that the "Scenic Overlook" category is appropriate for this rest area. If not: ';
      static defaultButtonText = 'Remove it';
      static defaultButtonTooltip = 'Remove "Scenic Overlook" category.';

      static venueIsFlaggable(args) {
        return !this.isWhitelisted(args) && args.categories.includes(CAT.REST_AREAS) && args.categories.includes(CAT.SCENIC_LOOKOUT_VIEWPOINT);
      }

      action() {
        const categories = this.args.venue.categories.slice(); // create a copy
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

      static venueIsFlaggable(args) {
        return !this.isWhitelisted(args) && !args.categories.includes(CAT.REST_AREAS) && /rest (?:area|stop)|service plaza/i.test(args.nameBase);
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, CAT.REST_AREAS, 0);
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
        return !args.highlightOnly && args.categories.includes(CAT.CHARGING_STATION);
      }
    },
    EVCSAltNameMissing: class extends ActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'Public and restricted EV charging stations should have an alternate name of "EV Charging Station"';
      static defaultButtonText = 'Add it';
      static defaultButtonTooltip = 'Add EVCS alternate name';

      static venueIsFlaggable(args) {
        if (!args.categories.includes(CAT.CHARGING_STATION)) return false;
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
        if (!args.categories.includes(CAT.CHARGING_STATION)) return false;
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
        if (args.categories[0] === CAT.GAS_STATION && args.brand) {
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
        return args.categories.includes(CAT.GAS_STATION) && args.brand === 'Unbranded';
      }
    },
    GasMkPrim: class extends ActionFlag {
      static defaultSeverity = SEVERITY.RED;
      static defaultMessage = 'Gas Station should be the primary category';
      static defaultButtonText = 'Fix';
      static defaultButtonTooltip = 'Make the Gas Station category the primary category.';

      static venueIsFlaggable(args) {
        return args.categories.indexOf(CAT.GAS_STATION) > 0;
      }

      action() {
        // Move Gas category to the first position
        const categories = insertAtIndex(this.args.venue.categories, CAT.GAS_STATION, 0);
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
        return args.priPNHPlaceCat === CAT.HOTEL && args.categories.indexOf(CAT.HOTEL) !== 0;
      }

      action() {
        // Insert/move Hotel category in the first position
        const categories = insertAtIndex(this.args.venue.categories.slice(), CAT.HOTEL, 0);
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
            (args.categories.includes(CAT.HOSPITAL_URGENT_CARE) || args.categories.includes(CAT.DOCTOR_CLINIC)) &&
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

      static venueIsFlaggable(args) {
        if (!this.isWhitelisted(args)) {
          const testName = args.nameBase.toLowerCase().replace(/[^a-z]/g, ' ');
          const testNameWords = testName.split(' ');

          if (args.categories.includes(CAT.SCHOOL) && (containsAny(testNameWords, Pnh.SCHOOL_FULL_MATCH) || Pnh.SCHOOL_PART_MATCH.some((match) => testName.includes(match)))) {
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
        return !isVenuePoint(args.venue) && (args.categories.includes(CAT.RESIDENCE_HOME) || (args.maxAreaSeverity > SEVERITY.BLUE && !args.categories.includes(CAT.REST_AREAS)));
      }

      action() {
        if (this.isVenueResidential(args.venue)) {
          // Residential areas cannot be converted to points
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
        return isVenuePoint(args.venue) && (args.maxPointSeverity > SEVERITY.GREEN || args.categories.includes(CAT.REST_AREAS));
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
      static #CATEGORIES_TO_IGNORE = [CAT.BRIDGE, CAT.ISLAND, CAT.FOREST_GROVE, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.DAM, CAT.TUNNEL, CAT.JUNCTION_INTERCHANGE];

      static #TEXTBOX_ID = 'WMEPH-HNAdd';
      noBannerAssemble = true;

      get message() {
        let msg = `No HN: <input type="text" id="${Flag.HnMissing.#TEXTBOX_ID}" autocomplete="off" ` + 'style="font-size:0.85em;width:100px;padding-left:2px;color:#000;" > ';

        if (this.args.categories.includes(CAT.PARKING_LOT) && this.args.venue.lockRank < 2) {
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
        if (args.state2L === 'PR' || args.categories[0] === CAT.SCENIC_LOOKOUT_VIEWPOINT) {
          severity = SEVERITY.GREEN;
          showWL = false;
        } else if (args.categories.includes(CAT.PARKING_LOT)) {
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
        return args.hasStreet && args.hasCity && !args.currentHN?.replace(/\D/g, '') && !this.#CATEGORIES_TO_IGNORE.includes(args.categories[0]) && !args.categories.includes(CAT.REST_AREAS);
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
        if (args.categories[0] === CAT.SCENIC_LOOKOUT_VIEWPOINT) {
          this.severity = SEVERITY.BLUE;
        }
      }

      static venueIsFlaggable(args) {
        return (
          args.addr.city &&
          (!args.addr.street || args.addr.street.isEmpty) &&
          ![CAT.BRIDGE, CAT.ISLAND, CAT.FOREST_GROVE, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.DAM, CAT.TUNNEL, CAT.JUNCTION_INTERCHANGE].includes(args.categories[0]) &&
          !args.categories.includes(CAT.REST_AREAS)
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
        if (args.categories.includes(CAT.RESIDENCE_HOME) && args.highlightOnly) {
          this.severity = SEVERITY.BLUE;
        }
      }

      static venueIsFlaggable(args) {
        return (
          (!args.addr.city || args.addr.city.isEmpty) &&
          ![CAT.BRIDGE, CAT.ISLAND, CAT.FOREST_GROVE, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.DAM, CAT.TUNNEL, CAT.JUNCTION_INTERCHANGE].includes(args.categories[0]) &&
          !args.categories.includes(CAT.REST_AREAS)
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
          (!args.pnhNameRegMatch || (args.pnhNameRegMatch && args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank)) && args.categories[0] === CAT.OFFICES && /\batm\b/i.test(name)
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
        if (!args.priPNHPlaceCat || (args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank)) {
          const ixBank = args.categories.indexOf(CAT.BANK_FINANCIAL);
          const ixATM = args.categories.indexOf(CAT.ATM);
          const ixOffices = args.categories.indexOf(CAT.OFFICES);

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
        const newCategories = insertAtIndex(originalCategories, [CAT.BANK_FINANCIAL, CAT.ATM], 0); // Change to bank and atm cats
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
        if (!args.priPNHPlaceCat || (args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank)) {
          const ixBank = args.categories.indexOf(CAT.BANK_FINANCIAL);
          const ixATM = args.categories.indexOf(CAT.ATM);
          const ixOffices = args.categories.indexOf(CAT.OFFICES);

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

        const atmCategory = [CAT.ATM];
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
          flaggable = /\batm\b/gi.test(args.nameBase) && args.categories.indexOf(CAT.OFFICES) === 0;
        } else if (args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank) {
          flaggable = !containsAny(args.categories, [CAT.BANK_FINANCIAL, CAT.ATM]) && !/\bcorporate offices\b/i.test(args.nameSuffix);
        }
        return flaggable;
      }

      action() {
        const newAttributes = {};

        const officesCategory = [CAT.OFFICES];
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
        return !args.categories.includes(CAT.RESIDENCE_HOME) && args.venue.modificationData.updatedBy && /^ign_/i.test(args.venue.modificationData.updatedBy);
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
        let flaggable = isUnchanged && !args.categories.includes(CAT.RESIDENCE_HOME);
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
        return !isVenueResidential(args.venue) && args.totalSeverity < SEVERITY.RED && !this.isWhitelisted(args) && /(google|yelp)/i.test(args.description);
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
        return /('?s|my)\s+(house|home|work)/i.test(alphaName) && !containsAny(categories, [CAT.RESTAURANT, CAT.DESSERT, CAT.BAR]);
      }

      static #isPreflaggable(args) {
        return !args.categories.includes(CAT.RESIDENCE_HOME) && !args.pnhNameRegMatch && !this.isWhitelisted(args) && args.totalSeverity < SEVERITY.RED;
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
        return args.categories.includes(CAT.GAS_STATION) && !args.brand && args.venue.lockRank < args.levelToLock;
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
        if (args.categories.includes(CAT.CHARGING_STATION) && !this.isWhitelisted(args)) {
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

      get message() {
        try {
          const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.venue.id });
          this.originalNetwork = network;
          let msg = `These payment methods are uncommon for the ${network} network. Verify if they are needed here:`;
          const currentPaymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: this.args.venue.id }) ?? [];
          const translations = I18n.translations[I18n.locale].edit.venue.category_attributes.payment_methods;
          const list = currentPaymentMethods
            ?.filter((method) => !COMMON_EV_PAYMENT_METHODS[network]?.includes(method))
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
        if (args.categories.includes(CAT.CHARGING_STATION) && !this.isWhitelisted(args)) {
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
          const network = sdk.DataModel.Venues.ChargingStation.getNetwork({ venueId: this.args.venue.id });
          if (network !== this.originalNetwork) {
            WazeWrap.Alerts.info(SCRIPT_NAME, 'EV charging station network has changed. Please run WMEPH again.', false, false);
            return;
          }

          const commonPaymentMethods = COMMON_EV_PAYMENT_METHODS[network];
          const currentPaymentMethods = sdk.DataModel.Venues.ChargingStation.getPaymentMethods({ venueId: this.args.venue.id }) ?? [];
          const newPaymentMethods = currentPaymentMethods.slice().filter((method) => commonPaymentMethods?.includes(method));

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
        if (args.isUspsPostOffice) {
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
        return args.priPNHPlaceCat === CAT.HOTEL && (args.nameBase + (args.nameSuffix || '')).toUpperCase() === args.pnhMatch.name.toUpperCase();
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
            showFlag = !/\bpharmacy\b\s*\bh(ou)?rs\b/i.test(args.venue.description);
            // TODO: figure out what drivethruhours was supposed to be in PNH speccase column
          } else if (args.pnhMatch.drivethruhours) {
            showFlag = !/\bdrive[\s-]?(thru|through)\b\s*\bh(ou)?rs\b/i.test(args.venue.description);
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
        if (categories.includes(CAT.HOSPITAL_URGENT_CARE)) {
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
          const indexOfHospital = categories.indexOf(CAT.HOSPITAL_URGENT_CARE);
          if (indexOfHospital > -1) {
            categories[indexOfHospital] = CAT.DOCTOR_CLINIC;
            addUpdateAction(this.venue, { categories }, null, true);
          }
        }
      }
    },
    ExtProviderMissing: class extends ActionFlag {
      static defaultButtonTooltip = 'If no other properties need to be updated, click to nudge the place (force an edit).';
      static #categoriesToIgnore = [CAT.BRIDGE, CAT.TUNNEL, CAT.JUNCTION_INTERCHANGE, CAT.NATURAL_FEATURES, CAT.ISLAND, CAT.SEA_LAKE_POOL, CAT.RIVER_STREAM, CAT.CANAL, CAT.SWAMP_MARSH];

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
        if (USER.rank >= 2 && args.venue.externalProviderIds && !(args.categories.includes(CAT.PARKING_LOT) && args.ignoreParkingLots)) {
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
          CAT.STADIUM_ARENA,
          CAT.CEMETERY,
          CAT.TRANSPORTATION,
          CAT.FERRY_PIER,
          CAT.SUBWAY_STATION,
          CAT.BRIDGE,
          CAT.TUNNEL,
          CAT.JUNCTION_INTERCHANGE,
          CAT.ISLAND,
          CAT.SEA_LAKE_POOL,
          CAT.RIVER_STREAM,
          CAT.FOREST_GROVE,
          CAT.CANAL,
          CAT.SWAMP_MARSH,
          CAT.DAM,
        ]);
      }

      static isWhitelisted(args) {
        return (
          super.isWhitelisted(args) ||
          args.openingHours.length ||
          $('#WMEPH-DisableHoursHL').prop('checked') ||
          containsAny(args.categories, [
            CAT.SCHOOL,
            CAT.CONVENTIONS_EVENT_CENTER,
            CAT.CAMPING_TRAILER_PARK,
            CAT.COTTAGE_CABIN,
            CAT.COLLEGE_UNIVERSITY,
            CAT.GOLF_COURSE,
            CAT.SPORTS_COURT,
            CAT.MOVIE_THEATER,
            CAT.SHOPPING_CENTER,
            CAT.RELIGIOUS_CENTER,
            CAT.PARKING_LOT,
            CAT.PARK,
            CAT.PLAYGROUND,
            CAT.AIRPORT,
            CAT.FIRE_DEPARTMENT,
            CAT.POLICE_STATION,
            CAT.SEAPORT_MARINA_HARBOR,
            CAT.FARM,
            CAT.SCENIC_LOOKOUT_VIEWPOINT,
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
        if (hoursObject.allDay === true) return 'All day';
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
        const daysWithHours = [];
        const outputArray = hoursObjects.map((hoursObject) => {
          const days = this.#getOrderedDaysArray(hoursObject);
          daysWithHours.push(...days);

          // Concatenate the group strings and append hours range
          const daysString = this.#getDaysString(days);
          const hoursString = this.#getHoursString(hoursObject);
          return `${daysString}:&nbsp&nbsp${hoursString}`;
        });

        // Find closed days
        const closedDays = [1, 2, 3, 4, 5, 6, 7].filter((day) => !daysWithHours.includes(day));
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
      static #parentCategoriesToCheck = [CAT.SHOPPING_AND_SERVICES, CAT.FOOD_AND_DRINK, CAT.CULTURE_AND_ENTERTAINEMENT];

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
          args.categories.some((cat) => this.#categoriesToCheck.includes(cat))
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
        if (!args.categories.includes(CAT.PARKING_LOT)) return false;
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
        if (!args.categories.includes(CAT.PARKING_LOT)) return false;
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
        if (args.categories.includes(CAT.PARKING_LOT)) {
          const catAttr = args.venue.categoryAttributes;
          const parkAttr = catAttr ? catAttr.PARKING_LOT : undefined;
          if (parkAttr && parkAttr.costType && parkAttr.costType !== 'FREE' && parkAttr.costType !== 'UNKNOWN' && (!parkAttr.paymentType || !parkAttr.paymentType.length)) {
            return true;
          }
        }
        return false;
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
        if (!args.categories.includes(CAT.PARKING_LOT)) return false;
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
        if (args.highlightOnly || !args.categories.includes(CAT.PARKING_LOT)) return false;
        try {
          const spotEstimate = sdk.DataModel.Venues.ParkingLot.getEstimatedNumberOfSpots({ venueId: args.venue.id });
          return !spotEstimate || spotEstimate === 'R_1_TO_10';
        } catch {
          return false;
        }
      }
    },
    NoPlaStopPoint: class extends ActionFlag {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'Entry/exit point has not been created.';
      static defaultButtonText = 'Add point';
      static defaultButtonTooltip = 'Add an entry/exit point';

      static venueIsFlaggable(args) {
        if (!args.categories.includes(CAT.PARKING_LOT)) return false;
        try {
          const fullVenue = sdk.DataModel.Venues.getById({ venueId: args.venue.id });
          return !fullVenue?.navigationPoints?.length;
        } catch {
          return false;
        }
      }

      action() {
        $('wz-button.navigation-point-add-new').click();
        harmonizePlaceGo(this.args.venue, 'harmonize');
      }
    },
    PlaStopPointUnmoved: class extends FlagBase {
      static defaultSeverity = SEVERITY.BLUE;
      static defaultMessage = 'Entry/exit point has not been moved.';

      static venueIsFlaggable(args) {
        if (!isVenueParkingLot(args.venue)) return false;
        try {
          const fullVenue = sdk.DataModel.Venues.getById({ venueId: args.venue.id });
          if (!fullVenue?.navigationPoints?.length) return false;
          const stopPoint = fullVenue.navigationPoints[0].point.coordinates;
          const areaCenter = turf.centroid(args.venue.geometry).geometry.coordinates;
          return stopPoint[0] === areaCenter[0] && stopPoint[1] === areaCenter[1];
        } catch {
          return false;
        }
      }
    },
    PlaCanExitWhileClosed: class extends ActionFlag {
      static defaultMessage = 'Can cars exit when lot is closed? ';
      static defaultButtonText = 'Yes';

      static venueIsFlaggable(args) {
        if (args.highlightOnly || !args.categories.includes(CAT.PARKING_LOT)) return false;
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
        if (args.highlightOnly || !args.categories.includes(CAT.PARKING_LOT)) return false;
        try {
          const fullVenue = sdk.DataModel.Venues.getById({ venueId: args.venue.id });
          return !fullVenue?.services?.includes('DISABILITY_PARKING');
        } catch {
          return !args.venue.services?.includes('DISABILITY_PARKING');
        }
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
        return !args.highlightOnly && (args.categories.includes(CAT.RESIDENCE_HOME) || args.categories.includes('RESIDENTIAL')) && (USER.isDevUser || USER.isBetaUser || USER.rank >= 3);
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
        return args.pnhMatch.flagsToAdd?.addPharm && !args.categories.includes(CAT.PHARMACY);
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, CAT.PHARMACY, 1);
        addUpdateAction(this.args.venue, { categories }, null, true);
      }
    },
    AddSuper: class extends ActionFlag {
      static defaultMessage = 'Does this location have a supermarket?';
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Add Supermarket category';

      static venueIsFlaggable(args) {
        return args.pnhMatch.flagsToAdd?.addSuper && !args.categories.includes(CAT.SUPERMARKET_GROCERY);
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, CAT.SUPERMARKET_GROCERY, 1);
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
        const categories = insertAtIndex(this.args.venue.categories, CAT.CONVENIENCE_STORE, 1);
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
        } else if (!args.categories.includes(CAT.ATM) && args.categories.includes(CAT.BANK_FINANCIAL)) {
          if (args.priPNHPlaceCat === CAT.BANK_FINANCIAL) {
            if (args.categories.indexOf(CAT.OFFICES) !== 0) {
              flaggable = true;
            }
          } else {
            flaggable = true;
          }
        }
        return flaggable;
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, CAT.ATM, 1); // Insert ATM category in the second position
        addUpdateAction(this.args.venue, { categories }, null, true);
      }
    },
    AddConvStore: class extends ActionFlag {
      static defaultMessage = 'Add convenience store category? ';
      static defaultButtonText = 'Yes';
      static defaultButtonTooltip = 'Add the Convenience Store category to this place';

      static venueIsFlaggable(args) {
        return (
          (args.categories.includes(CAT.GAS_STATION) && !args.categories.includes(CAT.CONVENIENCE_STORE) && !this.currentFlags.hasFlag(Flag.SubFuel)) || // Don't flag if already asking if this is really a gas station
          args.pnhMatch?.flagsToAdd?.addConvStore
        );
      }

      action() {
        // Insert C.S. category in the second position
        const categories = insertAtIndex(this.args.venue.categories, CAT.CONVENIENCE_STORE, 1);
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
          !args.categories.includes(CAT.POST_OFFICE) &&
          /\bUSP[OS]\b|\bpost(al)?\s+(service|office)\b/i.test(args.nameBase.replace(/[/\-.]/g, ''))
        );
      }

      action() {
        const categories = insertAtIndex(this.args.venue.categories, CAT.POST_OFFICE, 0);
        addUpdateAction(this.args.venue, { categories }, null, true);
      }
    },
    ChangeToHospitalUrgentCare: class extends ActionFlag {
      static defaultMessage = 'If this place provides emergency medical care:';
      static defaultButtonText = 'Change to Hospital / Urgent Care';
      static defaultButtonTooltip = 'Change category to Hospital / Urgent Care';

      static venueIsFlaggable(args) {
        return !args.highlightOnly && args.categories.includes(CAT.DOCTOR_CLINIC);
      }

      action() {
        let categories = this.args.venue.categories;
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
    NotAHospital: class extends WLActionFlag {
      static defaultSeverity = SEVERITY.RED;
      static defaultMessage = 'Key words suggest this location may not be a hospital or urgent care location.';
      static defaultButtonText = 'Change to Doctor / Clinic';
      static defaultButtonTooltip = 'Change category to Doctor / Clinic';
      static WL_KEY = 'notAHospital';
      static defaultWLTooltip = 'Whitelist category';

      static venueIsFlaggable(args) {
        if (args.categories.includes(CAT.HOSPITAL_URGENT_CARE) && !this.isWhitelisted(args)) {
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
          ((args.categories.includes(CAT.PERSONAL_CARE) && !args.pnhNameRegMatch) || args.categories.includes(CAT.OFFICES))
        );
      }

      action() {
        let categories = this.args.venue.categories.slice();
        let updateIt = false;
        if (categories.length) {
          [CAT.OFFICES, CAT.PERSONAL_CARE].forEach((cat) => {
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
            addUpdateAction(this.args.venue, { name: name + (parts.suffix || '') });
          }
          harmonizePlaceGo(this.args.venue, 'harmonize');
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
          !args.categories.includes(CAT.REST_AREAS)
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
          !args.categories.includes(CAT.REST_AREAS)
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
        const isUsps = args.countryCode === PNH_DATA.USA.countryCode && !args.categories.includes(CAT.PARKING_LOT) && args.categories.includes(CAT.POST_OFFICE);
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
          const houseNumber = venue.houseNumber;

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
      this.description = venue.description;
      this.url = venue.url;
      this.phone = venue.phone;
      this.openingHours = venue.openingHours;
      // Set up a variable (newBrand) to contain the brand. When harmonizing, it may be forced to a new value.
      // Other brand flags should use it since it won't be updated on the actual venue until later.
      this.brand = venue.brand;
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
      logDev('initializeCategories called, sdk=', typeof sdk);
      logDev('sdk.DataModel=', typeof sdk?.DataModel);
      logDev('sdk.DataModel.Venues=', typeof sdk?.DataModel?.Venues);
      const subCategories = sdk.DataModel.Venues.getVenueSubCategories();
      logDev('Retrieved', subCategories.length, 'subcategories');
      subCategories.forEach((subCat) => {
        CAT[subCat.subCategoryId] = subCat.subCategoryId;
        SUBCATEGORIES_BY_ID[subCat.subCategoryId] = subCat;
      });
      log(`✓ Loaded ${Object.keys(CAT).length} venue categories from SDK`);
      logDev('Sample CAT values - HOTEL:', CAT.HOTEL, 'RESTAURANT:', CAT.RESTAURANT);
    } catch (e) {
      logDev('Failed to initialize categories from SDK:', e);
      logDev('CAT after error:', Object.keys(CAT).length, 'keys');
      throw e;
    }
  }

  function getCategoryLocalizedName(categoryId) {
    return SUBCATEGORIES_BY_ID[categoryId]?.localizedName ?? categoryId;
  }

  /**
   * Wraps a function call in try-catch to prevent unhandled errors from breaking script execution.
   * Logs errors to console for debugging purposes.
   * @param {function} callback - Function to execute safely
   * @param {...*} args - Arguments to pass to the callback function
   * @returns {void} Silently catches and logs any errors
   */
  function addPURWebSearchButton() {
    const purLayerObserver = new MutationObserver(panelContainerChanged);
    purLayerObserver.observe($('#map #panel-container')[0], { childList: true, subtree: true });

    function panelContainerChanged() {
      if (!$('#WMEPH-HidePURWebSearch').prop('checked')) {
        const $panelNav = $('.place-update-edit .place-update > div > span');
        if ($('#PHPURWebSearchButton').length === 0 && $panelNav.length) {
          const $btn = $('<div>')
            .css({
              paddingLeft: '15px',
              paddingBottom: '8px',
            })
            .append(
              $('<button>', {
                class: 'btn btn-danger',
                id: 'PHPURWebSearchButton',
                title: 'Search Google for this place. Do not copy info from 3rd party sources!',
              }) // NOTE: Don't use btn-block class. Causes conflict with URO+ "Done" button.
                .css({
                  marginTop: '-10px',
                  fontSize: '14px',
                })
                .text('Google')
                .click(() => {
                  openWebSearch();
                }),
            );
          $panelNav.after($btn);
        }
      }
    }

    function buildSearchUrl(searchName, address) {
      searchName = searchName.replace(/[/]/g, ' ').trim();
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

      searchName = encodeURIComponent(searchName + (address.length > 0 ? `, ${address}` : ''));
      return `http://www.google.com/search?q=${searchName}`;
    }

    function openWebSearch() {
      const nameElem = $('.place-update-edit.panel .name');
      let name = null;
      let addr = null;
      if (nameElem.length) {
        name = $('.place-update-edit.panel .name').first().text();
        addr = $('.place-update-edit.panel .address').first().text();
      } else {
        name = $('.place-update-edit.panel .changes div div')[0].textContent;
        addr = $('.place-update-edit.panel .changes div div')[1].textContent;
      }
      if (!name) return;
      if ($('#WMEPH-WebSearchNewTab').prop('checked')) {
        window.open(buildSearchUrl(name, addr));
      } else {
        window.open(buildSearchUrl(name, addr), SEARCH_RESULTS_WINDOW_NAME, _searchResultsWindowSpecs);
      }
    }
  }

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

  function clickGeneralTab() {
    // Make sure the General tab is selected before clicking on the external provider element.
    // These selector strings are very specific.  Could probably make them more generalized for robustness.
    const containerSelector = '#edit-panel > div > div.venue-feature-editor > div > div.venue-edit-section > wz-tabs';
    const shadowSelector = 'div > div > div > div > div:nth-child(1)';
    document.querySelector(containerSelector).shadowRoot.querySelector(shadowSelector).click();
  }

  function zoomPlace() {
    const venue = getSelectedVenue();
    if (venue) {
      const { longitude, latitude } = getVenueLonLat(venue);
      sdk.Map.setMapCenter({ lonLat: { lon: longitude, lat: latitude }, zoomLevel: 19 });
    } else if (_wmephMousePosition) {
      sdk.Map.setMapCenter({ lonLat: _wmephMousePosition, zoomLevel: 18 });
    }
  }

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
  }

  function destroyDupeLabels() {
    try {
      sdk.Map.removeAllFeaturesFromLayer({ layerName: _dupeLayer });
    } catch (e) {
      logDev('Error clearing dupe labels layer:', e);
    }
  }

  // When a dupe is deleted, delete the dupe label (handled via wme-data-model-objects-removed event with SDK)
  function deleteDupeLabel() {
    // Stub: dupe removal is now detected via SDK event listeners
    if (_dupeIDList.length === 0) {
      destroyDupeLabels();
    }
  }

  //  Whitelist a flag. Returns true if successful. False if not.
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

  // Keep track of how many whitelists have been added since the last pull, alert if over a threshold (100?)
  function wmephWhitelistCounter() {
    // eslint-disable-next-line camelcase
    localStorage.WMEPH_WLAddCount = parseInt(localStorage.WMEPH_WLAddCount, 10) + 1;
    if (localStorage.WMEPH_WLAddCount > 50) {
      WazeWrap.Alerts.warning(SCRIPT_NAME, "Don't forget to periodically back up your Whitelist data using the Pull option in the WMEPH settings tab.");
      // eslint-disable-next-line camelcase
      localStorage.WMEPH_WLAddCount = 2;
    }
  }

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
      '.serv-airportshuttle { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAADcElEQVR4AeyZv69MQRTHH5VKiNBQUEmIXyERHZXEr05BEAmFAonQ4w+gIGj8llDokCAKCkFBoaAQCQXxKzQqofD5bva8nDvuvTOzu3ff9bIv57vnzMw5Z873zn1zZ+9OHZskfyMibVvI0YqMVqShK5B7ay2ljkPgOnjYEC6Rdx9YCZIlh8hOsr4EJ8E2sLYh7CbvOfAcnAJJkkrkFtmugmHLASY8DaKSQuQwWTYDkx8Yd8HxhnCNvF+AyX6MXaBWUojscBnOY68GG8CxhqCiV5Db3wFHaNdKjMgMopcDkwcYb0HT8okJHgOTJRgzQaXEiHgS38iyCNhKHHW29VXpHF/LMZf834HJMjPKdIyIj5lNQwUZNKHZMZ3j63PNYs4kMSLz8NbO9A69CbRdtlCgtmc9y3SBx4zIGga0M81H658NVSqP6B0mmK5U1tOrB6aeZVuxx4ksVqOLDsOuHap1dAwTTFcq+l+1gTkybEVk/9cYEWnb8tmKvHKF6XnhmgVTu0QVmugvTO4ar539VbYReUrjNngP/NGAZkG0SwwThcld4z72C6Ad9CZ6fNf6QEN78wL0HdB20TNvFUVqB+3cQbYi9CVJvydePeHDHGV95pNUlJxyiWjSfqACw/iyPvNRjUnIJZKUdCKcBkVER4aNPRBQnDaPHkKLIYMg8oSU94A2iWfoVLE427ZT40r9+iWiU7MOnJZc3x518LR2lQ7jtCqdw19VQKy/XyJ/Sib4XdIXdpXFdbbR0DG13S+Rz0x0AZhcxPgIYhLGnSFADzdUb9IvEc26l49pXexBp4rFTSdAb0pQvcsgiGj2X3wIqCxRzM+siArnQRGpSD+87lwi9sSNab1AiPmkjCdfiVwiKjAFKjLFL+bTGJHkxMN2zF0RHfBCWM3aPsOxsK2V8n2KsXjfb7aNRXUuERXi4QvRZH6szFaBvl8xHn5Mth+rtXOJ1CabyMFcIjoTeQy6dsttOjl/jIhuHX2Pt4R2UvXaxs6akaGvOF/tYD6vbBtWDarF2v/oGBEF6L6WjqHzEiDmFIxfpq2XCKhaidaQQkSTLWSaE0BXJcRB+qeAXkUvEbYTHOZVWwT0QkQ14FItKUQU/YYP/WqktxYhkn7jI75ObjAY5lVbO5duK4brJZVIfZYWjI6ItGARCiWMVqRwOVrQ+AsAAP//HpiKUwAAAAZJREFUAwDkQDR0c6d2EwAAAABJRU5ErkJggg==) center/contain no-repeat; }',
      '.serv-airportshuttle-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAADuklEQVR4AeyZv2sUQRTH56zcRhTRxhSmEhR/kUBIFyvBH+ksFA2CFhYqiPa5/AFaGNTGH1FBC7soqFgkhahFUlhoIYIWir/QxuIQhfXzdjN3s5vZ3Zm722SVO9735s2beW/e92b37WSzQv0nnx6Rqm1kb0d6O1LSL+B7aW0jjzPgDpgpCTeIewIMAGfxIXJEBeFLcAEcBCMl4Shxr4A5WFwETuJKZJrAt5widnNSEJ4i3CQoFBciZyGx34j0QzVqD8FESbjNWl9ALEF4EmUM5EoxkSA83IzQqF0l+SH6e0C9JIyxxk7QugKC8Bxr5UoRkdV47wBanqC8BWXLJxZ4CrRsRVkDMqWIiEniG1E2A70T44aubVmtz1wdYwPxvwMt27Via4uImD7ruFfGDdQN3bTbdJ+5LX+l1poJ5OmaSB+TpDK9o90Hqi6j/IhzJCnPsnW0ShMZZkAq00aM2RWiUZvlJlw6kEyG7MY+QM4jtAdAk8gW6SwgYrigp5tdGJYSLGcVuVf1wHpR9I6I/k+jR6Rq26d35JWRmDwvjG5ClSqRhTLsicWNzmtD/yq6JvKcanQfw3vQOhrQSUgQlnXitcdNLJ7oPKY3T86ztPdAs2p9oDPKQD/tA1B1mSbXQZKUChpdQXpHsDlIo9bpibdOAukYNls8xyElPcWPiFL6HNRuO6EWx7DZdHymu4kvEbeoyzCrW0TkyLC3jfzFb6QNv0Uu3SDyjDPPIyBF4sWiFbIN2k+X7eyZDiOdEumDwHBznSAcQpeDJ02upP1kV6LDX65XzmCnRP5YYv+22NImm19URtMTXfudEvlMOb3WXKxRu47+ERRJ2u8SDvJwo2lPOiUiqx6HzMoISh0TgyO03yrmy5sSmvalG0Rk9V98CWi8RHx+enlkTO4WkYzwS2f2JaKfuEVtO29NbDGdfwk/IkHYesORr7f31iQd05mGap5+PVyqOdVvR2ynX80rfsMSn1pt82JbnepmzmmV3HjcHJPDpI5e2PoRUSp9HbcSUdEnPZ7uS3KmLXIyvswx0Y2hfNWXSH60ZRz1JTJCribodlV0bN06By8iIpeO/B0fBwzCGQ6JScQj8n1Zvjxxszk/rlhZsSUHyaU5Pa0UEVHRzZn2svejlwD2oUzrFCPzIF+kEOTPcCq/U5DZBM6DWQtOY6sVrJM93KgN4n8I2GJLFevHWQjTZEvxjsS+b2jkv0by1iKNScY6lbsESMeVvlQuuawYzhdXIvlRKjDaI1KBTUik0NuRxM9Rgc5fAAAA//8dmnQfAAAABklEQVQDAKRnTIMRjuoKAAAAAElFTkSuQmCC) center/contain no-repeat; }',
      '.serv-carwash { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAEPklEQVR4AeyaTchNURSGPwaSUoSRjER+MlAkPwOSkomBKIVkIImBgZQJRhiQiQxMUJSfIhMDCQMpExOKEhM/E4mhUrzPdvZp3e3ec/Y5Z+/zlT6t9+y11t7rfdc613e/ew+Tx/6TP7kHmar7tLsAvtw8lnOQRWr5oXCtAD45hekt1yCb1epzYZ3gDZ8cez6XbM0xyAF190CYIYRGjj3OhHud4tSDHFM3lwRrxxUALaVxhrNloquTcpDtauaMYG2/gtMF8OWWxllqykQXJ9UgNHQraGSO4suCN3xyPmalhlr8TkgxCI3QkG1kpoKvQmjk2LN5auGwucZ+10E2SZFGtJS2QN53YZSxxxm7DwdcNtfI7zLIbCmdFaytUfBOqDPOcNaegwtOm4v2uwyC8HKjtFU+vye0RBlnqfGH4YLTx43WtoMckso+wRtvr/d90GClhlpfAifcPo5e2wyyVuz2zt1VzFusllZGLRy+GG40fBy1thmEOzitYP+klVhLJ4MDLkjgJsaPRtNBeJvcYtgRfGPiti4ccPl6NNDyce3adJCDhvGifD7ZaklicMHpyayWz41cmwyyVyzrBYxfbHzEwE8JOOGGEy008WvRZBB7h66I+aOQ2uCE2/NaTZ8busYOsk3VKwXsly5XhVwGNxrwo4k2fiWaDOKJbsh5JYSWKoYbDc+XbJDpYrRk9xTnNquBNj1Uasa8IjvFMEXAeJu0v7zI5QAaaMGNNj3gj0TsIJ7gppyTPQEtSTlLMshcR/X3ckJLn5CcM9uDS4SXmFekliQkzRDX9lA3CN/m+Ozjezslpwv4axnWD8v5M5JzRg/04oJhl7pBwjuBaBfQYFg/LOfP2J7DXuzeWN0g3ImBgnEMKnupG+Rt0Diff/qElQ97sXu1r8gPnf4ieHssp09Izhk90IsLhl3qXhFqKu8EB3pAbQ8xgzw1jT6R3yck58z24BLhJWaQF6aIn489ijdkBhpoScaZ7cElwkvMIC+DoqNBnCMMNcIe/tGMGYQftHOm8rDxc7lWA216qNSKGQQCyD7gFPitNSdE7wxNtF1QdYkdhDsSRVgl1mIPTbRrS2MHgYgnHLdxegJaaEbJNRkEwh268IBAS2k8w92oaFJLUAuHyktDA60yUec0HQS+ebr4b29yx1br8kg4LzR5ms5ZaqiFQ+XO4EbDBbGXNoPAvViXC4K1IwqeCfzbIN+zl8gPjRx7nOEsNfYMnHDbXJTfdhDIaYKP4J8JCizUykO2O1pfCz8FnooAfHLscYaz2nYGB1xwukTTS5dB0OJ7wwo5NEEzcgeMBwdLlQH4cgeMGmrhgGtgs0nQdRC0eHukiWUKdgnXhW/CKGOPM5ylhlo4Rp2PyqcYxAvZBmcpyX8OmK91VQF8cuwxBMNQo+3ulnKQsBu+P7xXkg98AJ+cUukt5yDpu61gnBik4uaMy9YfAAAA///IQYvmAAAABklEQVQDABsqHnSHifI8AAAAAElFTkSuQmCC) center/contain no-repeat; }',
      '.serv-carwash-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAEtklEQVR4AexZO4jVQBTNWCyOIKyolViJ4gcLQRE/hSKC2FiIgqAiFiKixRYi2LhWaqHYiIWNLij4AcXGQkQtZMHGZgUF0cZPsyxrNSwI4zmZZJLMZpNJMnmKuNwzufdm5p57kpfkvey86B/561vIfBynIwnow+3H+hSyGi0/j6QeixFFzxEzh01460vIHjQ/Dmy3LUu9HfE44j1AcOtDyEk0/AydDgOuDSf7Tro7usahhZxDozcLTSlxPiLySak551w+1dUPKeQARFwuNKTECcSXYhgfbmJSc+6BJOq8CSWEIh4UulFiKeJbQGq3cGaYS+MIwrkmiJgQQspELEK3k4BrkxDDfVle6iBiugrZnRzVrDElViKYBuayaYjhnGy/EbM7SzT3ughZAhFXCpRKbEX8CaizTxDDudk8qVlrSZZo5nURQuINlk6JffD5nMDGy8YhhmvSyazFmmncaNtWyGmcjeOWydxen9rY33kKMeftdKlZ87SNGzhthGyDiOzIKfEYfLzFYtPKLkEMa5jF5iO2zQT+YxshPIILEopv2DLGppOxBmuxCGszpu+NpkJ4q91rq5uP1Acbt3c+4KxkzUtNjkbPl6ZCTtlelbgBfwwIZWMQw5ppvYwrzVRsmwg5hmtjR1KLDzt+xUjCYBvWZG0+9cl1zLeyvxCpsyOkxG0QfAVC21ecFdY2dfOcJjPn6CtkPypsAmi/MNwB+jLWJgfrk5Pc9CvRRIgppMQ9OBOAa6HiCZwVcqT1gglZiGsjX+xJytDjNuOQmtwL67h8zsghFBkCaLzVPqbTM8hBLtKQmz3QnxO+QkwBJe7DGR0IDBeoYgsgROplcSkOUl/Ax2xwICeR74FxCXzOSCakpMCAUrU91Anhrzl+9zH9KnERd5QuGC1ZX5YzHIaVI3tgL/RLUSfEPRJdr4+L6MKtUZZL52C6NbcXu4NOnRAeCc77G1DZS52Qj44Cfv8ZJPL0bi/5fVGdkJ+Y/QMwJvVL3LUGB8PKkT2wF/qlqBMS4eKsPBKlVUMnlajtoV5IFL22fSnxCsIGB0uc6yHLFTwfIW/tCql5fRxFvLNnHMVHmFygiS3rIQ5nDz5C3jnLzjpxH6HL4fYwi9NHyA98nK7alVKfsX5fTp5DCXLzYq9k8xHCAiz2hU4MqTVOfX+ISeKBnOSOg6rBV0jxrFRVDLnP82yQ0lcI597AR+whnYFACXLl36pU0jYRwkIHMRRfOijBd7i7IFK0BNe674zJQS7Q+VlTIXxALkfp9NcbX9tswfXyArlrQJO36Zx7LV4r9RasTY0v68iRxl7b5kJYVok1OPrX6VpIPYKm3iDm/wb5O3stfNeY4z7+r/EN5o8UJihxHXXXFHKeQTshpvgISPkV/LsJ43EVmrsMPALeAzPRfD0RQ+oZxMxxH1/ErYpXmOF7UqsozOzzGrsIIcEoGtgIuIK4jxiKRLQuRhQNMeHACFBiI/L8DYJNO+sqhKx8WFHQegg6DNxFcgqYy6biOUpw7npMogDWgNveQghJ2dk8RbDBxWh2GFgBbE5An7nFWHAY4FyugdvdQgpxu+Hvh89I8gsfQZ85pMJbn0LCd1tR8b+QioPzR3b9BgAA//9hliruAAAABklEQVQDAK+lLoMDbyYAAAAAAElFTkSuQmCC) center/contain no-repeat; }',
      '.serv-carpool { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-carpool-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-covered { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAE3ElEQVR4AeyZV6gkRRSGBwVFDKigYAIFRQSziFkMqAgq+mBaE/ggijmLWUyYMKL4YsCAETGAD+aEGDCLCgrm8KAiiKIg7vf1nWrOzu2e6ZlbdWdZdvj/Pqeqq6vqn+qKvUxvCfktFbK4NeR8tchaCD8QngAvh/fCl+BD8GZ4CtwSTozSQhRwCbV7Fz4Bb4cXwqPhbvBQqAjFvI//LbwVrgfHQikhy1KLS6ECtGvjd4ECTiLhG1CL6YYSQlalaP99WyIK+Iv49+AD8CJ4MDwK2krG49ZQkC1jPnXkMCe3ECvwJAXuDxP+w7kBbgy3gUfCK+Bj8H54IjTeZ8/Fj7Bf/R4j2vycQjahkKfgrjDhQZwd4FnwezgM3r+WBP4JP2ATbGHzTeFGm1OInTiOPP7zR1DqO3AcPEPideHTMEFxtmIKz7K5hBxAzgtgwt049gXMxDBPh+eUwQU4e8FG5BJyfsjdITSGw62x3cN5wkECU+Hs6tpwmUTI6uRjPzgDezw8Bm4HE3zFfk6BDFYxKRtbJIZTfG8cIXbYD3jyV/gKdCS6A3sPTHBSuy8FMlk7+l0hrz2CX7tdhCxHapcT12G3gMNgumH3J733Znhwz+DX7ighW5HyH+hyAlPjXzxn7ZexES/GQEb/85DXBvgrwkUwSsiri6Tu9RwadyRuZbgtvAwm/IJTqkU+Ju+INWJAf5iQq0mwEkw4BMfx3Ga2RQj2fvLS5/PYOMIQzIY/yOkbmNBZiJPZeekp7GbwUTiIL4hwUeh6ybUVwWJwkEmZ/5+cZNtaZO+UAHsV/AS2wdfL9dJXbQkyxK9CHlvDBF/j5Fe2TUgcnVzcVYlHXEredr0W8+8kZHme2BwK33nnBv1pMgpxtEx9tK5TU4vYH1KCz5IzZbt9KP+F4Nduk5C4hF6zTjk9xyXPPqF4WyQEZ9wmIQ6pX8/c7rnZWb/vT8NYtocVqezncBr7bJMQ0vai6oOMmBLjnsQquEzSzmKbkE9DyiuDP5+ue/ZNQ4E34dsimNloE+Ikl3Z2K/DYI3C+sBMFuaeJpyiuuk8nvhVtQnzgWC99euLxGr6HBJgicMi/hpxfh/ZNTIUfubp4xbRjmBBn89PCozvj23c8ovF1cyvqqngudESyH3jw8CH5nwMjbiSwDhyJYUJ82BNAWyHu+DyicSvrsY+r3bnQEWk/Chqs7HfEnQzdhWJGY5QQc/DwzGHQhaHhkvQ1uo0C7Cda3G7oIsSc3Fy5MNyIgP3Foxn3Jm6shpHkNZrSPczdW6D/vPt+W8aWsEWI7o6uQlKOX+I4IXnk6d5kd8JN9KDNvsPtCr5CTekO4+6p0L7wNnZijCuka0H+qymtQ+fFKVDKlhCiiH1DhR0YQrCMm1uIp+9+70i1dXZ+NgVK2txCzqSyG0Jhf/oNx1VC5HHEZUduIY4+qZIKch8/yDtJoDBMPuQWkq9mY+aUW8gulN80XxjHrQq+bvGUvYocuIwdzC3EBd/gfHE9tYpzinuKeHLI7bkjt5DBGvlR1MPvFP8WjkIweVFaiN8EB1vDb4p5VZBbSSHuL2Jr+OHzccosgpJCbI3V+rX+E1vklSLfCiWFLKhKmLko4qMZt8y1pJA05HpSqZAyCvq5lhTi90X7iIfPf/fLK2ZKCvGTg98Zi1U+ZrwQAAD//1JNvqYAAAAGSURBVAMAp5DcZYuY7eYAAAAASUVORK5CYII=) center/contain no-repeat; }',
      '.serv-covered-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFR0lEQVR4AeyZW2gdRRzGdxTUxQtVULAaiFARQatVpGpVqqIiaKgP8VoVfJBK2qo1WqmpibQqVkONKRVfvKAVrwTTgA9eUm+IGpqqFS0oaFtvD1UE6VChrL9vt7tnctxzck4yk0jp4fv2/5/bf+Y7M7s7u3tQtJ/8Dgj5v03kVM3I8QhfAO+Aq+ALcBi+AvvgUngmnDBCC5GA7ihORuAAXA+74C1wPrwOLoV9cBRuR0k/bIFNIZSQgxlFDwOTgB78mbARtNBmMfyEyothwwghZAa969/vxroCdpPeHFmzAa6E7fBmuD7N5+BAgjQzA05eXde3EC2Jt/hHr3Z63ctge+Ep8GzyF8LV8A34EuxI861pwS4nXUGcLCDWn5WM2p5PIafS6SC8qOjOmpcZ3HmkO+FOWA8qX0N9/Qk/OxVn4A/CuvAppIueKlcea/TP30TeF7AZDCHmRLixaBQnEqdZLLKqHV9C2piJG4vg1jyHvwFOBm2I0eU5ixEnD+BcBkvhS8gKJ7ouoW7aKWravYEWu2GOe3On2k5EyDEE0XmwDLsI3spszMVmsEZL7Lcs4eFojcRkgeJEM1JJZ7npsRkhnQx4C9wFP4C98Gn4fBopO4xiXoQ+McgSe9YJeInjF24jQg6h9jADfhx7BqwNa7TtqF0+8ZJPi6ZxcmnhO854QuYgYA+c77SR+w+HEf6pTVgX77sJj/53TqyT8A+HY1BfSJx8OKa2NUMM/nx4JDyHsodgjt9xQs3I18R2caybkF9PyKNUOAJmsOZaHF3PNc2aEZLRrzqktOZdrHuFIekNfxHpJ5ijYSELWU73560ia07Hfx1WYxtlPVD7Je2tqst9pnc5wRLHT91aM3J5WqqDNY9gtsJa0PLqoPAHGApHEfgsmEPLOPdTWy4kTtyrkzZ3aeVxDiGLtV9z4zck5FBazIaC1vyonGmmK2SEseTnKG6GshnR+ZCVRtG3uTPN9tyif2veK3zHKRPibqGPc+pOl9vFhecKp3PNiJPM3DIhuqT+mBVHelBq3edPh2lFhF5WZH1b8w5O6TlbJiSKrHFVX0Pj6cFhSeWZJBuBtkmZV3UsFxJF3xT14uThwp9apz8y0WlFl9Y8ia8ZwfwXtYTozUf+ZBfT7DU4VZjHctoO3bcoW+j8blgTtYRoed1WtIqTdvyPoF4eYIJAl/zHEPAx0XVuYlL8wlKfk3p1DrWFRNFWAtxVtI2TC+hE584AeVpubVjtiidDPYRtJO5O+CW8j5gVWLOWMZxQyajt1ROiVn0E0ixUnviyVzQr6FSvfYaxk+Eq2l9FR9WD3UG/S8jXUyhmfIwnRBE2E7QVamOodEhqGa2jr3l0sg42jEaEKNgeDh10cDJsh6vhENxUlzQqYE1Z3Vdp/xRcBudCzYxmYkfRrkGnUSF5uO9xdENaidWzycXYMq5hyejcoRhYo5taWb3rKb0TroWfwwmjWSGNdqR/Na+rS+eDeSKUDSFkCbNxZTFga3y94ypCljm+hcxEhD7aZH1Z04/zNgwO30LuYcSzoKDz6Q8c7RJc3k6ed/gVEifudX8Ws9NdwmdQIWEYf/ArxN+4mo7kV4g1F3IvKLtfuC/ytNwqb9nLh9x0rl8hUaQNX/X94gmWl3tP0TOF++aw6UGXNfAtpLoPfRTV16os35rPcCQE4xehhSwfMxtRJBF7/UrIooUUMhsR7mzow+ebWbf+jyGF6Avt0fuG/DdWs4EJg3BC4sT9pigRX4WRkEUNJ0Tb9qyPUYyEYMIhnJAoWsQ9pRPq5bMNJyGLHFLINrrohVOCfwEAAP//fmoudAAAAAZJREFUAwAaWYx0KvWryAAAAABJRU5ErkJggg==) center/contain no-repeat; }',
      '.serv-ev { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAADSUlEQVR4AeyYTchNQRjHb9aSlY8QGxsfK0lKoexEPvNVkrJhRVJWWCFiJQsLRSEbKVJK2FiIErGRsvCxk5CyUH7/8T635957zvvOfWfmvfe+3dv/P88zzz3zzPzPnDNnzpnSmCS/oZB+m8jhjAxnpNAZ6PbSmsM4zsI78HEir9L+JMyCboRspMeX8BjcBNckch/tT8DncC5MQjdCDtPTTJgby0l4BCYhVsh6etEMYAKuU55K5E3aG3SSFlilzU6jrsv5EnYRrESskPmu9QP8vVDXdwp3k+M3NPgTZTHZlRS6nA9ib8NKMbFCZpDAoGva/FTrc9XNyB/XyWL8SjGxQmjfMzyhZ13GmIBKMYMgRKPXJVwlpjmLgyKkToyWb/3XKCVEN64YOslYtM+MnkXh5i8hRJ3ZU7+UmG/u5GhVKzIjW10npdzXLvE8+blnZAtJl0DhF4VWHEx55Bay3Q35mvOLuzmFLGS0O6FBu1vzY+xqDrJ7S1bblmXEopBTiBfxjN5fwG6ghcHzAo2V4yh2TOQUcsj1pk2lqya552i9Co6KXEK20Ytt8XWTz6KuZdiodxlCo0JPbk9/8HlfqfJzCfGzMZWO9MT1vEtsDxwLJlxWeyo7fgVOczuC34FcQt50ZO4MaDHojNZH3rX9NSFCTtOpvyzMJ9zElaZXwMk1I18Zmy4Hz/DEJS7oZeyznFLMJaR9fNMJ7IeGorOhTkoJ2aHkI3yP1ecjTDmUEnLADdl/ZHDhvG4JIdpWiBrpX4oJ2XOVELKBwRs0Gx+sUtKWEOLHe8tXxuH71wDtw5RCzxPzVX+looQQLcFrSS7ex6bgqWusnYJ21NoZW/gTThBbQgi5G0ouNhJ/2gG/dTn0jq4ZsZD+/65KKSHKnYM/SKLvwv7VllDAZcqLMKDfhWiQDym0jd+FPQ71oF2H1SdUzH8MghCN9CeFFo4zWN0nj7AtGBQhLYOuqtQJmc3BWuKMVFtg8VTbkpSK5ZPVew2hONQJ+UJzLXNGLX2EAuRbPNVqwCEpRXveG8SiUSXEL2/RiQocuLSbnFVCPpJA2ww9B3rJzYwjGlVC1PgehZ7MvWTYejCOKNQJiWrcTwcNhfTTbGgswxnRWegn/gMAAP//bRj2twAAAAZJREFUAwDXEMJl1dNpJQAAAABJRU5ErkJggg==) center/contain no-repeat; }',
      '.serv-ev-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAADeElEQVR4AexYPWgUQRR+kyoLQayMouI1aYxWIhIIeAE7SfAX/0BCwCZWBglY5axUlLMSC4uAARUbERRBkJyNhSiIoo0IFv50IiquFjJ+bzc7O3vuXuacmfsJt7xv573ZmTfvm5mdndk+WiFXj0inDWRvRHoj4qkHmp1a6xHHBeAOsGiJedSvAE6kGSITFMjnwCywByhbYhL154CnYLIBsJJmiJxCS4OAa9kOhzOAlZgS2Y2eK6uWQrFAoThriZvKXyC5k0rKziqrYPJ0voJ0M5ArpkQ2qdqheAD9OMDz2wZH4eMnkEjaUUlOnI6gE2eBaeqXt5GVS8aUyBo4SITndKLbpaHQfRWNyG/ViKDhIjKmRJSvNii1aAonDReQ6QYiTKFSQEaNYrcQySdDNMcPGL6I8IvL4DZcIjsygZyE8+jl90GkghVmMQKRHzJEXyi9Rlh1T6Rf7mfHXhGKl5r/jay7JrKPBG1hx8APoAa0RFwTOaiiDsV1pbdAcUlkCO/FYS1m3t1q5rLqTpTQd9S8bdmGPCNxSSQlEYonaP0ZYC6BrN9NV9Ex7OO0iRN3RAJ5UmtwQdPt1EBehINRoKG4InIArQwCLPySr4WibygnYDeW+t10tvSlrPmv5YqIPhoDmBJ8YNJxF00fA5aTlHwohlXhQO6AXgIKxRWRV4UtpA+GUtVIe1NXqiVEzkWbusbT41pdYE5NVyPyGVGl04KI9eiLS3zFh7GPrPqCKyL18a3GezKlZXodDW7HF5FD7HwJb5Hy7yMk/sQPkUCeUCGHIv3JoDLdKz6I8LaCwdH+wa0ley4fRMYRfCzxaLyLDb93H0T0iG/pRtN6KPRjQHmpfgkLSaJz1gu++SDCx9ExfFfG0MB9wEYeq8qB5PP5PEjwDjnJ/gAlIuuDCHwTO2eQ5VUlSa+Vj/iMnn7hQ1HFs68A+SLCvl3gG/0SM3CkH21hQkJxFffLQCSdToSDfIhpOgocAc4AU8AuPJgGlPQprbOV7wiPF47zSPnk+QhpRrqFSCboPKOIyDoU5iUuAcyMJPm2acYpjMQfpwOwjSWfSCA/RctcIOMfbfHSFztlPc1Pnv9vygHn+yW6ET8wu+cRSZc3Mx9+SgVyazOO84i8x6owDtTajL22RLj+Pdz4y9xORFsPxGEkeSNiVLHTCvWI9EbEUw+smKn1FwAA//9Td3BqAAAABklEQVQDAOVxbXSFy3jMAAAAAElFTkSuQmCC) center/contain no-repeat; }',
      '.serv-attendant { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFtklEQVR4AeyZSeh9YxjHT4ooIRtTNihkSJkpbJCZhWHBSlEsKFIiw4IowoJigY0URcYiJZIpM5lJKKTMIjY+n9N5bs899z3TvZfQ/9fzPc/zPu8znnPue95zfhtV/5O/DY382y7khisycEU2ZX5bsBs4qIGyOudQrZfWeUX2obRLwJvgN/AVeA+80EBZnXPaaKsP06vTOho5hzJeBK+D68HeYIi00VYffY0x5NM7v0ojJn+F6LeDA0GJ/kT5TgNlxAXS1xjGMuaCwRjFso08SnCT7wsP+gnhKXANOBHsDDYBezVQVuecNtrqw3RNxjKmsWvFlMMyjbxFguNAplsY7AmOBJeDR8CnoE3qnNNGW330zXbGNkfWDcpTG/mBiJ5hWE0PczwcXAi+AFNJH32NYazwN4e5YjzIpzTyNdG2BEE3IpwEngWrkjGMZcyIZS5zxriXj23kCaJsA4IOQbgYjKFjMDoUjCFjGjtszWnuGHfyMY3ch/dRIGgXBJ8NsF46ltmPwOPgOeCtczp8iIxtjrAztzXEuMiHGnE5PDV5no/8CRhDJ2OUCzqB8VlgDJnDXGFrDdYS4wU+ppFw8ozeFoMR/JSCjSvS7gV9SWUuc8bc0o3o6NoegfIPMXR93B9we/4zFG5VYKMo57QWayo69l2Rs5OHa32psGSyID6woKmqqwu6PpU5zR02uabQ1byrEXesB9QWVfULPJ8ZhqPoHqy2BtcC/XeF3w2mkr7WoJ81WZvyHLoacU0Pw9cQfHDBJtP3eFwGXFY/hC9D5raG8M21ha7qasQVJ4xykNDJ3TPdivB0g3XwI4hVolxDrm1mW2rEFx9fgsLomRBa/ArG5wGTrws3EK9EuQZrs8Y5u1IjW81ZVFXXBu7nlt06hgsFNkHbNbRrrIYa8R3CHWsTb46dxsiHlitRHzCrqc8m5twN18atgzVYS6gnN/JBeBb4t+h8aF0F7wJTc9RlF/o549Yg1zKqkZb/f2NYurXye4Br/yqd+J4R/lkO3RSea8k11jGGGtkYq53AMuTt4moWvsrqYjyFW4O1hM/kRnTcw8NEWPSVBR91zhWmelXtz0ajGvmdkHm58ysHqklkweHwOYKA1ZTnasWIgy9nYWZt1hjjmpduLSfcJ8nF1EYsNJ91bydhLOFcHqsbQm4k1zbz62rkyZlFVblR2zGN+8R2kSa9CwehjFhTu9la2XE4Hv0OICjXFrriA9HJNzi8BKQtOFwExpAFhp0fDs6NAVxZHWJN2bZWdBzyO4g1WduCadcV0fBODw0ugB8G+sjbxSsSNu54f40BXFkdYk3a6lMPOg5eDV+RYzrXFLqa9zVyBxavgqC+q2JR+Qzfj1O+lRjWpM65esBBH30Ri5SvhrVYU9GwrxEdsqPb9q7d6ZkaN/gO7j4MViTntInJ7Bs6ubny1ci1OD+HMY08ljy8KgencYhfhgDfHwxRtsm+4WcOc8XYGlZqxEDep28rNHge7sdo2Iy81/0xb4/GnSqsl7TRVh99s7GxzRE6c1tDjIt86IqEk//P+DEG8I+BL1WwGXnG/EfOTDEgaKtPNjOmsUNnTnPHuJOPbcQAbp2/UWjga+5DyEOrGSaD5Bn3G5Yxw9hc5oxxL5/SiIH8H2B+ILkA+Bp6M5NjH5qYziga8F8N+YdtDnPNDIeEqY0Y72gOeQllWPmceRfBpm6C+4HAHSviHKnz8+e9aL212g2groxtDuXRWKYRg7uE+kN1bXcsNufgbeb/Ox5E9vvtH3B/rEJZnR+kz0DfPuPGMqaxmZ5GyzZiFn+o+yGY/GV4iXyH8D1cKJds9DWGsYxZshnUrdJIBDe5O2TX/utQvg+GSBtt9dHXGEM+vfPraCQS+G/mSxn4tX0z+HZA2WKFsjrnlLXVB7PVaZ2N5Gp88XGn65m3WKGszrlsuxb572pkLcVNCbKhkSln65+w/QsAAP//7v829QAAAAZJREFUAwBChRN0VgbWBAAAAABJRU5ErkJggg==) center/contain no-repeat; }',
      '.serv-attendant-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAGbklEQVR4AexZXahVRRRec0FxIlJ6yYpeMihJJdC6WWC+mJR/9ZD1UE+Bgj4kJIEUqQ9FgVI+JORD9iKBQZFakAihRJpo/kXaj5fIQCXo3+aiD9P3zZzZM/uc/XvuKUruZX0za9astWZ9e/aZs/e5Q3KV/I0T+a9t5PiO1OzIJMxPBe4A7u2AOm2cg2mwMsgduQulPSfangAMcB44DRzsgDptnDvhfEUYI4P4GwSRFSjkEIo9BrwKfRZQJ7Ocr7bH4HgIYA50/ctYiKxAMUeAN4HhkhKuiJUvHUSuFPpoO4x45jiC+b4J9Utkj1tcZDYW96LkdzFqH/ASsBSYBkyUUTXTwaiJGNPGOfrsE8b4aLazOzn3cNAW7YloexILLsotZNQW+UvNgG0B8AKwGxgBuoU2ztFngYthbOql7SLkP5mamujtiEyyvyLpTMCLUbtwlR/AYA1wDmgrjFnjcjBXjJ4pfq1oqdGaE9H2Am6FyVk+ozZDXwYcAMYqzLEMhJjT51IyGTtzwQ/q26ZEPkaqGwAvRt0HZS3QRB6C0/1AE1kLMswdfLkm1w7j0r4JkZ24Mg9mGYy6DfpBoE4eRty3wEfAp3DeBTwO1MlBkOEa3k9brr3TD8rbOiI8Yh/Lwo1aDf0s0EQegVNa0BKMnwKayFmQ4VreV1vWUHk0VxPRNgb7D+NWn7lBq+2jPV48kUSm99iLDVtBhrvoZ9NavCXXVhEhifg9IRI/iLkUJQOj+AHunvwehtNAU0nXZC2sqTC2nIi2T2cR/qwvKixzKVDe67EZtbHHVm04gF3ZkrmkNWVGr5QR4RPrPd5F/kSfXhkMG8kOFHE98DKwGbgdUW8DbYVrswbGsSbWRj2HMiL8fvCORn0BhV9c6FrLL4h4HuBR/Q36fuQcLgJrCLGxtmBBX0xEW544mHaSJnGGTrMU/RvAJx0Mop+PXEUSa8jXlvkWEeGLD1+CgtP+oOR6bV/E98MqYP4AsSm3RhykNbA21hhnoRURmQJ7KsUPcEb9kToNRLfSU2Anb3cN3TVKHZErSDQCFMly3LurgY2VCJE8seow6p6gQ0TaswbWEmxTghL6aiJWvg6OBf1PsPELcgP6MmAqJ2V+wZ5zzg3ytTQikov/vwyKdoTvHL5+JTz7vd5fy3eVEJnqwda8z9cSa+xkqCYiMgF+twL9yAZ3moVIbXm08hYKljY9a2AtIaY1EQbeyaYleCSv74nRljYS6pmqMXT/bNSIyCiSpsfdMMZthQWHmB+gEOicpHPO0KDhy1lwY22sMYxdP+Ta7saoHYmpLZH1uVvKqA1ChIT93GLaRiL52kLWwu8RTu5l43CN5YPaLU6vb3hLxc+BX3Q7wraDTLw47W6xxYi/GQgSawsW9MU7InIcC38u/LNyHbpngSaS3jb84WBlEkSdtmBKfYOtqI/vIEaxpuNFTmVE6PsWGwdtn0E/D6iS/CllFJ94LyUBl3BxaPOmZrfYYtymfEX2MSKxpmDp9FVEtsHnKBCkald4S8UrbNS7CIq3EgYd2QEynPPD+lss7oYIa2FNPrarrSIiWDQGasvH9rKn0yeTvD9DXw6UCefoE+bT2GBjvym3G0bFWjjbhWoiIttA5sMsRlvuytxsHJUfM9WouzO9TMn7xNjoPxckuJa3GMUaxkSEiXhqnKLioO1n6KcBqfCIXQnSN8E4AtTJiPM1igdAPOV81DSQ4Bp+JMK1WUMYF/Z1O+KDjJolVn7zA7Tafod2FZAKr9j51FCj05cxqRtf1Jjb27gm1/ajyrYZEaYYVXx0vkjVQVu+5n4Ave40g0ut8Irvwk4wZ3C+KH7NMK7smxNhGqOm4paIX0g8ALTla+jrmG76pQnXTAKB3SCxJLMatRfrTM3GDZR2RHzChVgkHqG08XtG26+g7gdeA/jjBZ9YoeaENv78+Q4KPw/kCdDVH90LqbZBP0SYn6+5/KDybOeYuBaFzQPWAO8DZ4HL+D/HKQdtL2NM2070TyCg+4ofxQViTh7PmG4n/RLhKjya53QWP0xDASaIkhkO4t5tClzksMth1BxMdn/4YWomQ83cKr1IaBjFzAVegecZoE7OOF+jGMOn674JhIUGQSTkOgRlHQqcDmjgRoA6iyWo08Y5/iK/Dv6MQTd2GRp7isIMo7DySZe7w2IJ6rRxDtODlX+KyGCrbJBtnEiDi/SvuvwNAAD//46KotEAAAAGSURBVAMAW63/dL+CZakAAAAASUVORK5CYII=) center/contain no-repeat; }',
      '.serv-parkandride { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFR0lEQVR4AeyZWeg9YxjHJ0WULKUQSshOimwXlgsk6w25V/SnUKSUwoWirIlQ3CFcyHZhKUuyZd8JKQkpIUXc+HymeX49vzmznpnjL/1Oz3ee533eZz1z5p135mxR/E8+G438107kxhnpOSNbM78L2B8cXUFZnXOo5qU5z8hhlHYleB/8Ab4Hn4LXKiirc04bbfVhejrN0cgFlPE6eBfcCA4FfaSNtvroa4w+n875KY2Y/C2i3wOOAk30N8qPKigjLpC+xjCWMRcMhiiWbeQpgpv8cHjQbwjPg+vBmWBvsBU4pIKyOue00VYfpksyljGNXSrGHJZp5AMSnAYy3c7gYHASuBo8Cb4GdVLnnDba6qNvtjO2ObKuVx7byC9E9BuGlfQEx+PBZeBbMJb00dcYxgp/c5grxr18TCM/EG17EHQzwlngZTCVjGEsY0Ysc5kzxp18aCPPEGVnEHQswhVgbjKmsSOuOc0d41Y+pJFH8D4ZBO2D4L0BthIytjkiuLmtIcaNvK8Rl8NzkufFyF+BVZM5zBV5rMFaYrzAhzQSTl6Md8WghftTOIG5NuzE3FAylznDfulGdHRtj0D5QgxdnXtxvoCyDT8x9zmwSFgv5ZzWYk2NTl1n5Pzk4VrvypJUC6JnYUHZoNgX3SbwM3BDCWslc5o7DHJNoSt5WyMmOLK0KIrf4fmbYTiIXsSqju/QBe2I4IW9JbyLzG0N2liTtSmvQ1sjrulh+A6CNy7YKDoR6zp2R3cdyHRrHjTI5raGmMq1ha5oa+TsNYuiyEGSekEcqrgWQ5dUWEmuTnuWUvsh15BrW/NoasQHHx+CwuilEGbkzxHLPRespAPLY/sh12Bt1rjOuqmRHdZZFMXoDVzNv234RZo4KMlNYr2Geo1FXyM+Q7hjbQo+VedeKmJ8E0ILtwZrienRjbjmh/OcfFeC+UAFK+nj8th9yLUMaqQ73PTZ/QjhA5RbdcTibQ6fgEnU9NPKzwEmXTaBq1Mdbv5eIeAZIOiWEHp4riXXWLr1NeLNaq/ScvzhGlzqcPOX91tPY/Mg6CNrsJawG92Ijn0rijZj4Suh83A6HQyh+mujQY38SeS83OWLkqnBVN+eOHazuIkIbjMehg+lU5OhtVljUhWNy68GD3iosGwj9e2JY+/idxPXYmCDKTeSa1sL0HSNOPmshwpu1Pao5M3B/PntlhLn2tbUbY28h8UbQNqOw+Vgc1F+BrEma1uopa0RDe/3UOFS+HGgi7wG4g59X5fhiDnPRl6qc03rwnQ1ci+W3qxgJQ05K14Hl2B9A5iD8tmwFmtqjNvViA7Z0VedN6nsgGfkDua/BFPJXPls5FoWYg9pxJtWOHpWjonBCrk5zBUprGFSIwbyd/qhQoVX4b6Mhq2EjG2OCG5ua4hxI+87I+Hk/xm/xgDuT+ci+NxkTGNHXHOaO8atfGgjBnDr/KNChTvhj4O+1QyTXvIb9x2WMcPYXOaMcScf04iB/A8w35BcAHwMvY3JZW6a0YCPvfnCNoe5CDuMxjZi1FM4PAoyeZ/xmcKmfCviCwJ3rNlGWZ074IcY+H9ivQHUhbHNoTwYyzRi8HM5XAhc22ElbcvRn5n/dzyG7Pvbv+BerEJZnc8k7nzr37ixjGls3MbRso2YxeXwCASTvwlvIp8h/FdKKDfZ6GsMYxmzyaZXN6WRCG5yd8iu/d7RP4uJDq6Ntvroa4wO8/6pORqJLP7NfBWDA8A2wBcMyhYrlNU5p6ytPphOpzkbydX44OObeb95ixXK6pzLtrPIq2pkluLGBNloZMy39W/Y/gMAAP//gnVt0AAAAAZJREFUAwDnpexl7WqkUwAAAABJRU5ErkJggg==) center/contain no-repeat; }',
      '.serv-parkandride-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-security { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAEG0lEQVR4AeyZS8gVZRjHp3ZBQUFBt0VQtAkqKGgV1CKo6H4h6AIVVIsooiKoiAoiCIqgRZQgXkEXijdceFdEUFBEUVHwgih4QcWF6MKF/n4f59Vnxm/mzMyZj3PQ8/H/z/O8t+d5/vPOmZlzvpuz6+RvLGTUNnK8I+MdmaIzcMNdWs9wIodJ0lej3458zPKFcN2QeYj8H8JSVAl5klV/wjfgsPEABcyAD8NJUSXkA1bcAUcJn5YVUyXk0bDoV/ybhsRnyZvwRHKKtkpIce5It8dCRm17xjsy3pEpOgOjcGn5sBtY3rCF/IICXz/kQIK6FEJNjfAzsyUmU4QvpVnbv2EJUYC7kerejbMUtkaVkAsh6q3BH9QtithBwDfhGTgZYu5YU25ulZAY+N7cqvaNoohthFLEPmwZYu5YU25+XSH35Fa1a3gpybR6C44iDmCr0KmQGKyYdC4du+A7sAwKcDfS+Cact+Bh2A/xJLbakb0hQwwWujMLfC/LskfgfOg3SkwOzokiNjCqiKPYOoi5Y025tVWXVrxub2PVZN/O3A2GrmA63hcwoShiDQOKOI6ti/gdJNaUW19XiIte9lDgftqvwvMw4R+c72FRxAr6FHEKWxdPMTFe1q2EWNxKAiW8lJyC9f7/Gn2xwN9px8tpOW1FnMU2wQthsrVYU+i66lbtiLP8BUUrffI+pDMJV9HnjxRHsEUsoeNteA42RTx5sZZr4vQTsrqwIp6hwlC2kQ7FxO03uSJKH2SsKYOXVfx8FGvJresn5CCzZ8OEL3HuhmXYyoDPhn+xf0FFXMS2wTdhkTVYS+jKu/2EOHuWhx69tH7o+WXG96bPGfwWXoJt8BGLPAmYCcQaJjqKhzpC1rJoMUzw9lp1iaV5ba07Hk+Wua2hMl4dIQb4kcMxmODtNfldW0W488Y1p7n1K1lXyB6ixIBP054Du4bPHnc8xTWnuVO71NYVYgB/e/1fp8f3sf/BrqCI+OwxlzlrxW8ixICeIb8/6MvPOPhDN2YgFEWYw1y1gzYVcprIPis2YxO8TVpIajextzP5bxh3wtjmMBdD9dBUiFG9n/t+5buTbWkhvoY8ZqMmfa3x/y5fhfnGNLY5Qnd/t40Qo57k8DpcABNexPHp+wm2Cvcx6C4swj4OE4xlTGOnvtq2rRAT+NrhQ+s3Gz3eiZ0Gve/7+cG9Ar8K/EFrO4y7QDMzhrGMabsxBxGSkv2E8y70no+ZgP/T8I7mS6QfWgs9wch38C6Y4BrXGiP1tbJdCDHxPA7Pw5kw4n4ailDMLfgRznWNa2N/K78rISbfycF3pOewy2AZHHOOc11TNq9Rf5dCUmI/8K/QeBB+Ddf3qG+fY86huztMhZBUnbdQ705+XqS+fWm8UzuVQjottF+w60bIZQAAAP//4+GiuQAAAAZJREFUAwD4/MNllGHOyAAAAABJRU5ErkJggg==) center/contain no-repeat; }',
      '.serv-security-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAEfElEQVR4AeyZS8hVVRiG12rUgoKCArsMBKNJUEFBoyAHgkV5TYIu0B9UgyiiIqgQDSQIDKFBWBB2EWyQVEqDblZEYFCEoqLgBVHwgooDcQsOls97zr6svT17n7332b/noOfne9f61uW7vGutffvPdeYq+ZsSmbSNnO7IdEdmaQWuuaP1CAs5ThC+WobtyAuYbzbO/z5mHCKP50GpVBF5kOTXgmWl1lduYC55bCDc3WCgVBF5DoubwSTJS2XJVBG5NzWK7PsmsnZMmJ/mYcwDgZ5Tq4jkJk56Y0pk0nZouiPTHZmlFZiEozW3C27jJrKaJ/ahHowZiVCXREzDv1UQWBXbiIReSuNm82pcRERidZquN7vRt4DWUkUkCrzeEOijqnkSxuwwF+xynJ4BgySMHeaUm1tFJHR8e86qfaNI4j/e30RiX4XLMHaYU86kLpHbclbtGrqws+MU2X9iEgeGuOuQiPOhs2LcjeZ6v4vOp0CZiERyYRsI/M3EJ8FhMEzCRWy1I3uDCKGzoNsowWeMNfdwB/rGGKMvSqqcaE5I4k9GReIodR0JY4c55WyrjlZ4bm/EatDX2Ub6M3H+cxqvgkSKJH5jQCSOU9cT58NvkDCnnH1dIjJ6QkUB+zkmi+k7D/ri/Mco74AiiZ/oE4lT1HXlISaGx7oVkfMk+TOOEnk8UQr1FuYtoS9L0PkPOGrhcfqRcZE4S91EHk0nR1a5ZAuWDvSVqh3RjM0qenBeT967evrlxS+Q0T8pjlw2FNkf6FsBzoFm4ny4eFkuA7wMI/JrwSZbocIAzb9iMtn2R1bBRaL0QYZdmehYhddHMZec3TAiB0nuq9TC+dfQ54Ay+Zf5y8En4CMmicRF6jbyZmoUWeVwMG0PUIYRkcmXKmLoaL0b62WV3pteYfAt4EEbmeEa0yIktmEOSV+urkNkG6v7fWrlvG6vVUcsndpSmQOJbLEiq9jbhvmqQ0Q+3qM4BhLR7TXRu65FQjsvv4qp2NIrUZfIHnYlc+j8w3j9GnQtevZox/t+I6uYe/qN6rIuEXnZAJlPpfTg/LPU60FXIhLhs0ex9P/eWv6bEJFDrdAOKT04/zL1WjCq5EnoG8UYxarttymR0+zKMrA9jeC8bpPZ63k6UEu5iVnruLjDndiOfz1cTzNWW5oSkWPdzxcTTO9Oaps4Eb2G3NfvqFUuwU6/u7yezo6sfOrdTTHS7jpKGyLye5JiKWS+pe6L84+RmJ6+L/Y7Sss7GNEufEd9P+hLZOVrKQ35pmombYkoil47VkBmjRoxboHMZ+i67+v6QU1FnwIfMv4/yHZBw5GVDz0A5VM9jTEKkSTYSsg8TUP3fCrE+fkkux7oJVIX7Rr0E+BtRm8FiRyLbVcmHW3rLogo9iYSWgi+UCPAnSQvEiLjgn7TmxvZhfRtAiNLV0SUyE6KGRJcALaiD5bIbmV8AYMzQDZUo0uXRJJsdMEvItl54A3wRwzp85i0CGgOVXcyG0SS7HQLXUdDvwEK0tVHV/cym0S6z7bC41VD5BIAAAD//2ZNLFAAAAAGSURBVAMAfdhwdNT6u3QAAAAASUVORK5CYII=) center/contain no-repeat; }',
      '.serv-valet-service { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFQElEQVR4AeyZZ6gcVRiGJ4IKdsEu+EP9oVhQVOy9oiL2ir2CBTtWLKBiRwRBURQLNmzYG3bFgogoWLAhKIqoSQghjeR5JnuW787ObGZ2704u4S7vO185Z86cb86cuktlS8hvMpCJ1pCTLTIOLbIbZSSujT4UFkeLnEGNv4DvBP7R0a9FDoS2A7mDWt4Lt4JF2DrX4DQd0QxtBvIEVbsAJsxE+Rb+DiNssQeio47eViCbUpmjYMJrKJtB/esht4PXwYRTUGwhRD20FchxoTrfox8Pf4IJn6LYP/5DJviZ6ZOn4lwOVqKtQPYONbgf/R9YhkuD0xYxGOk9f5J2NyxFW4HE4dV+UVaZdXHeBquwEgnnwKdgD9oKZJ3w5NWCnlT7yvsYK8OEF1Fuh7ZGDP4IfD3BtBXI0zw8Yd+kBHkC+vow4WSUg+DF8HS4E/wKJhjM1slQthXIWz6sQzt+DGZ5/LEP3YL9EIz4H2NL+C5McMBIetZWII/xxM9ggsPvqxgXQd/uFsgE8ya9KJ8Ljs2D3logM3joeTBiPww794PIiK+jUdAr09pqEevjXOHE97hGH45504V8lWltBmKdDOZYFPvIFcgnod99nBzPxVeGFXAeAxPeTIqy7UB8pnyDy03waLg7vAQmnIZiv0F0sSOafccWRc1hGbniZTwDsbxBaSd23kj3O0/8i+Fy/0fkh9DhGJHDdZlpueFlogRiXc7nYoUROVbl6nJ/Q2SEQbj+ir6hRq19KOkD+BucX5NTyefQ61yxBnrEzxgHwmdgGXzW4ST0BIFv4ECccV+nAGdcl+GoteB6yY5un3iPO/aEEQZqZdfC6Wzvc5z4HKp3wVcV5ECB+EZupdBhsREFPAxXhEX8heMR6FrrUaQvDVGNpn3EIFxWpxIdOWyVKTjq0MWjZZA9h7Y7wtwY5tIkECsQg3Ah6GfyUYMKuKews8a1lP2iXxGusRyO3SbvUJWxbiBlQRxZVWgN/ycVeZbBvwe8GjrhzUN+CR2OPbjwpT2LHfc3mFm3j2yPdSOMRzRRL7bEMEHwmCzO0NovcJkOZ8G34fVwL1j2og/B37NTNOO2JHwML4duL8tIUg4/pzpBrE7usnL8RHy7ppElh7qTnUuQ3FG4zMF2GSNRcxzG1a8EsRAGEvfJC73V1zpBnMTtf8PYokk3CIMhuRL2I4fZC8nhS/Zzcxkj7V+4c+yaXzsXAzm0oyvMXKT+JhzzgBo3fkMeD+WcNzZAdyRzLrkTPe5hMLPYKln8GUi01c2cqN2UvrV7uCmVUSZvIP0AuAr0fOsspPOGsztqKdzaxr4aV8zdzl5654DOX7nvbFhs2WhfRfor0Jkc0Rf7k+oe5nOk/QmR4/n82rmUtUgnabEK63UiNXAEexnpch/Rha3+UtdC8QbEhMGa1MR1mCcmTprOKbi68Lz4PqwxIxb2SD4ty63LtIi0Yq6Kf+BGV8b2G9QuPNe6DGsTeCbsQdstEivuZ+PRqQHYiV3umB4r6WbrYBwe4N2M/AWWYtSBeHLoWsq37LLEzp0q7mezdGmtsuwu/BtDJ0pnfdT+MBDPl1IuJ664SdJOacqYVkf3YM236ncf99uWlTgbxTqYxx3hFGx3i98ha8NAiudKtW8eIqPnvH5OO1PGstAh1jMuF4iYWWMaiMeZLhiL/xw1LqzPDR4U+I3bD/ycnP1dGMY9ep/bF51kIP65ciVZ3bLGSWu8dPvJNpTvqONGbC76uMNAYqFly4lhfdPiA0alFwMZ1XNGXu5kICN/xQ0fMNkiDV/YyLMvMS2yAAAA///v+X2cAAAABklEQVQDAK+bDnSbx62HAAAAAElFTkSuQmCC) center/contain no-repeat; }',
      '.serv-valet-service-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-247 { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-247-active { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-ac { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAD8GlDQ1BJQ0MgUHJvZmlsZQAAOI2NVd1v21QUP4lvXKQWP6Cxjg4Vi69VU1u5GxqtxgZJk6XpQhq5zdgqpMl1bhpT1za2021Vn/YCbwz4A4CyBx6QeEIaDMT2su0BtElTQRXVJKQ9dNpAaJP2gqpwrq9Tu13GuJGvfznndz7v0TVAx1ea45hJGWDe8l01n5GPn5iWO1YhCc9BJ/RAp6Z7TrpcLgIuxoVH1sNfIcHeNwfa6/9zdVappwMknkJsVz19HvFpgJSpO64PIN5G+fAp30Hc8TziHS4miFhheJbjLMMzHB8POFPqKGKWi6TXtSriJcT9MzH5bAzzHIK1I08t6hq6zHpRdu2aYdJYuk9Q/881bzZa8Xrx6fLmJo/iu4/VXnfH1BB/rmu5ScQvI77m+BkmfxXxvcZcJY14L0DymZp7pML5yTcW61PvIN6JuGr4halQvmjNlCa4bXJ5zj6qhpxrujeKPYMXEd+q00KR5yNAlWZzrF+Ie+uNsdC/MO4tTOZafhbroyXuR3Df08bLiHsQf+ja6gTPWVimZl7l/oUrjl8OcxDWLbNU5D6JRL2gxkDu16fGuC054OMhclsyXTOOFEL+kmMGs4i5kfNuQ62EnBuam8tzP+Q+tSqhz9SuqpZlvR1EfBiOJTSgYMMM7jpYsAEyqJCHDL4dcFFTAwNMlFDUUpQYiadhDmXteeWAw3HEmA2s15k1RmnP4RHuhBybdBOF7MfnICmSQ2SYjIBM3iRvkcMki9IRcnDTthyLz2Ld2fTzPjTQK+Mdg8y5nkZfFO+se9LQr3/09xZr+5GcaSufeAfAww60mAPx+q8u/bAr8rFCLrx7s+vqEkw8qb+p26n11Aruq6m1iJH6PbWGv1VIY25mkNE8PkaQhxfLIF7DZXx80HD/A3l2jLclYs061xNpWCfoB6WHJTjbH0mV35Q/lRXlC+W8cndbl9t2SfhU+Fb4UfhO+F74GWThknBZ+Em4InwjXIyd1ePnY/Psg3pb1TJNu15TMKWMtFt6ScpKL0ivSMXIn9QtDUlj0h7U7N48t3i8eC0GnMC91dX2sTivgloDTgUVeEGHLTizbf5Da9JLhkhh29QOs1luMcScmBXTIIt7xRFxSBxnuJWfuAd1I7jntkyd/pgKaIwVr3MgmDo2q8x6IdB5QH162mcX7ajtnHGN2bov71OU1+U0fqqoXLD0wX5ZM005UHmySz3qLtDqILDvIL+iH6jB9y2x83ok898GOPQX3lk3Itl0A+BrD6D7tUjWh3fis58BXDigN9yF8M5PJH4B8Gr79/F/XRm8m241mw/wvur4BGDj42bzn+Vmc+NL9L8GcMn8F1kAcXgSteGGAAAACXBIWXMAABcSAAAXEgFnn9JSAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAANuklEQVRoBcWaCYxW1RXHv1lgREBA9mVmGPYdWQcwLAJFKogEahCMtLgTQaKJxUSxg0ItokCpgFSTxq22JG3TNFUZsOhgAImoVBgcBgTBQWRRoeyzvP7+Z+59vPn4Pvbam7x595571nvuPefc900sdvVaCqzSePQO25AhQ2qNGDGiUQio7Hjc1Dj4ZQ/TL5uyKqEUC3jKHVgKahzs2LFjaUpKSi364yJzFfQ9rgNf2etyV0SK+5U3I4YOHdp64MCBY4MgEE8pao1x29OnTzd1Q+FWAEu74YYb7uzUqdMwB/evKF8P+1HeEmyL0bVr12m1atUKevbs+RyKCh7Tu0WLFu83atTog6g2GPGiprOysvIjcKNx42g/gnKVu4MGDcpk7zdwbM2QkSNHtmzQoME2YEGPHj1+50VmZmauxZAP/bhXr14vCAfcQvjkOLjxmDRpUr2JEyc2drCraoyYSYjeIeP69etvaNWqlVZVTfOmyNChQ7MbNmz4BWMZ88KiRYtyu3fvvrtp06af7N27t0bv3r29EduEK2JaSN+tW7e86667blfLli2bVE5V8qV/ThBx85f1ErPY9OnTMxC2o3Xr1n9yXLyBNn/rrbdmec8MGDDgIAaX1alT5yiGbQRfnvhCOI7WBxtbiPbt278snBo1agyIm3fDs4vpARd6m3Jydd++fYc+8sgjNTyBDKlbt25R27Zt33Qwb4iGphjhNrNx48aFjBW5ynh0+GXENs3RV/NGqG+GdOzYcRn94Nprr+0jIM1449XR/fv3b14JSmyMMXAI0Zcx2LdvX/eioqL3Vq9e/drzzz9vZyI9PT2VQxwrLy+PGuBppXR6fn7+Xg7/SLZZEWPbFpyTIg75zZoTDo9wq7SKigrjec0111RzE0GbNm3yNm/e/I/Dhw8PdLBkOlfh5QfGcMWKFWlsIR3cACXy582b10wIKPglWyaRRzy9rfbtt98+uEmTJv8B/xjbqZ+bjHrC45tyHTp0eAmAvNhFExjxrMbosI5t6pPqpRmSl5cXEhAm54khh3X1+PHjpxJmSzHkDxJGS+SZEAbeBiKXzodv4ZwH8DZZnBEzhGh2D9tpNvAA+u1Tp05t73DNuxG6S+82b978aTFmhbVicvnvHZfQ4AjXUFnySAHbqiDRXDzM8QyQdapatWoB53DTo48+2i6Cl7SbyM2GzLaqzmoE69atS2W/l2/YsGHhsmXLRu3Zs6enEKpXr+73cVLmmqA8iaWmpoaGJUHWfMD50yLFSkpKYgSLGIf/tQULFmxXsCHyWUkzePDgCnJYOXwN1/OLCjBmw4cPzyosLPwzh7kByEaMImp1Dx061PDUqVNGy779fNy4cePnz59fDEAuN1zH2Hipz7YqKC0tje3fv39Q/Jwby6NW0pA/3tm9e/dIB4/hyZPocABdTinA6EGPlNq1a0/ftWuXqoKQ9hyPlJWVnQDhE576MDEBMIoBLycRlpFDmh07dqzfzp07u65atWr5nDlzpjz55JNfgR9vDCCWGeFEI+sn+BMqwjaaU1xcPLJZs2b7CO/51Gdl0FVHh3QeW3B4pWBIKd4qwRBjn4CngYwg2aTgb7/9dsbdd9/dPScnx+olEt0qAkOWo5ExaiEfeSTJGZER1tq1a5dHJ+C97b777utcCb38vxIu5tFHsPgnlMD2msMg4Ay9t3DhQl/hVoksRLwCAkRBSFTZkQxrnMNf0QmIWB9pgRxYPIQTLzteR42rtHhAKKgKVuUghfzgVz6Gor8GrNrqHfJMC6FE5+WROENC3njgKdHi3eLHH3+8lWhpIe/K4Tl/Q3o3E+puHRJOdpcuXcbdcccdlvQuhSFhcwH4MiafM5PpBJjAuK0lWSYPmtmiwaub77///g6O5kJG2Dyea4asiTfeeKPPL8bTJgl1E9LS0gLi/ueTJ0/2e/6cYOAE+le4OtnZ2bbNSGSrn3jiiWyPgCEf6IzooHoYB/tp+vLEl5EzcV5Z3stz585tzCKsFz06T3Y8zQYTwIFNh7GSXIDwyzIGOttm3DneRaCdGYR+RJT50AmMcRbMCODbHn744bZRRTxO/Nsb8dBDD2VTxvyLeen4ikoohxsuUriyGGOlNJ7Zeu+999qeB9mvlgjin5grZ4wZnpkrQZQz7yP456zafs5RMV7q17lzZ4t04OxmC/d2Soh3PM9wTPIz2SpaOVN2FYD+FUerV6i7BiIMAVhrNQ8EW6dMmeL3vCkq5CQtnMcDc4n32joBGVlPKZHtKHSJaqck7AxsPClTMvHkWtHD25dGQvAy/duI7I6t3qxZs3K5rR2mKxcWTpgw4aLqnUouMXmoDUYcEj2PMr7eUiLgYC+lf9Ft2rRpOSzCKgi0MMfkWRFHz5zGKZz82lxD9cmmNat4hmyaVq9evcwjR460cNkzjatqSc2aNYvJ7tqTgUu0lrXFJNpUQnDDa/Ttt9+2oqSh9qssyShTAsr5GJn7yMmTJ3eeOXPmOHR+JWWoNfGWkugRZGRkxMDt8PXXX6uEL4deHzO++uGHH0qoNioUnMDLOHHixOx0BNWkHKgNY22tNBilHD169HsYNKJbA6axgwcPNkeRIxDJS2mCSWCkeUUCmKdCXxth1SgsJUhKxVAqgE8q5c0xFqUcWDWM1ltsVHpYKeN5wz/t+PHjKW7xTBQKB998802ALtJBNAEGVUdm4gIWpAy+UZk7KdD2cnAnr1mzxh/4iP5Vu2IuyIwZM7qRk/zWkqa2tdimFYT2nwkH3PBMapys3XLLLe0o6wuZVwlTQl1nkc7LSkZn4YyLzQgKxNMUb+VjxowZlQw5Dh66iDzxjASzJYPrr79eh72Mw6piVN+9VvmbJuMLGWM8iXCZbMmtoseY5bx98zL9+2zUoowfx+X/NOfkCNdbb4QMFHKyRwoZM5/syNhFhO+lfE08gieK8VIuMLs2R5OmyxHJ+ApuO0HGeM+Qg6KRq8pimCdIZD0p08vYTt9x1xgDE99MST+Ie4eMvBHcK3aSQyzSofzH0YRITrF7uL4BEN2yHC+TH8c3OjRjVHHgZdtmyFKK8M30M0U4B104kCcRembYsGE3OQwxuCgjWKU8cJUntiKwB31rRJlzShQMtQoAY1ZRmzV3qBdlDJ+ostlmW6DRlXiRozUb7A+xejjWFvDpc4ibPJ8BQol6YhbjAAV3P/DAA50cvSmGIdHqVzyNL9ttjmjkGXKDT7oXMsbmtc1YuBVcjbUgaufV9XyToREwfApGuk9silSxthUkAYULiP8F6rsW0mL4bGABZ2alr80YX8iYkN4zTPh2dZOQZUiiJ2REBMkDR1/V98RVseEiyJC4GyIkZ70JrRmDZ1bGXQG8Dnr7R3x9X3xCORpEW9KJKJL6eMC2Bqta5A82YO+JkE/c1hKpn5NC1jD2GTq6z6wmuvk7hptN+vJ8DCE6UD/g0lJ7+/btU8iqnciYpSSedJ4yMmg1gkEpmTaF8qUVHx9+SuQoys3NnfTGG2/oY4WM8J9BjZckyBCqhtiBAwcGaUwL5+jLGCVM3TR/w6emmbx3Evr15aUUsFUMkayfSiXwHenhhU8//fQg81FeYmPNVog80pXwa5kYaNI3+77krrvusk+b4MXvawmwJkPitlY451BMrjI1uOuAJZWpOX24Yxv6j9yhV8MOSLYyIG5n1XMJcQPp5+L2wUSzPqNGjVpEaFYle4YnRr7Jf/311xUGZYTgCZtW8wJNclOprQJkKkeoncb42NixY/9CiFUo74+8XPTphzd6o8+/Dcvp7PoX92IV5lGyBNxRJFhX4pcdZSJNw1V3HlkbkRLOxcOQYTdUFqyUEingJ413X3311foRvKTdREoIWausPW9CCbHPfvbZZ79kdTax9abpoqTqVYg028eV3XP/sooxldtuJpERIRHes13Rp0+fJXhk/saNG2/mM9Nf+cLS0iFJZvw2DunP2/HfnfDEXjJ2NyEjZBfufdMRnqOcv2M/+OCDLdku+ykcD44ePbqtw/eRzQ3tZTwoKF9kpGKzl6AcfPsVgDzzzsyZM+sY5tmo54bnf5nVMBgNmsqOj32y0wdl3F7ElvljIsbeCJX9VAt/E70elNuqjOxo4o0xQ9haSx2+3QKF60MzvH6hMe2SPGKMMaQ5RkzkA0CTSh4xXWOrs8JfICCRR2yrrly5siZ55rfQyAgFAj36SaLwtttuS2RMFY9ww+wLvprBuXaP79evX8dKUCXM9S/qZUwimLYS7jfEYpR6y835c+bfMS5VizgbCggBOSHgRniSc6ZcI2O2JTDGK2yHHUNyHe+EnovoFHZD4SHkbEerKQEyQHh2ECnvy0mMp7jGWhgGLi/Z/JIlS2qxz1/asmXLDD4DfUL4fIYAcZS8tJW5gcCW8fNCh/Xr17/LFsyCVAlUtGYIueR7+rpG+8Tqg4R0EI4fC+3KmhKX7i38yuo/c5oSixcvzsADi+GufPDWY489ZttR54vgsNZL5aKle4TOTKH+ycDBzdtsoRYk2nvgr+ikZrwru//7v+ZVQuad+sCQk5Pz9+XLl3tFdFjtPuLV0ELgGTvUeOufDi6Ff1SlvT7hdvAKcBO8iZV/Tp5xSGYgXlpDgnvfwUxZGcPqT6RW+4mD+5fmzTse8P9+mxFSAo9oa22KKBTORWBX3I2PClfC0G8PHUgFBo31BeU5FbJUv+ItmJ+TQR5Xc1fU/gtvcq906SZFbAAAAABJRU5ErkJggg==) center/contain no-repeat }',
      '.serv-ac-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-credit { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-credit-active { width: 75px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-deliveries { width: 86px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-deliveries-active { width: 86px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-drivethru { width: 78px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-drivethru-active { width: 78px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-outdoor { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-outdoor-active { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEkAAAAyCAYAAAAQlvbeAAAQAElEQVR4AeRaCVjU1Ra/M6L54VKWmlvu5gqxqcgiA4IggRHggiKYWj6XLM30ey0vbTGXLzPDNHMBARVwAFOWURQUIsANRNw1g1BzzWc9NYV5v99t/rwBLXMGC7/Hdw/n3P3c8z/33HPuHbUw709lXve/pLe5axTmDEAB6T/++ONmkyZNCsVf2KhRo8JGjx4dXhNCQkLCjYH1zBMrUDOvlP9ZzP4EticfYWFh46ZMmWKHz1AJIK9ApiVThcRJ9V9++aWlLk23dnnkF9Ex2uio9UmxUbGJMZE1YUPy+khjYD3zxArUzCvlfxazP4Htyce6hKjVy9ZEZA8aNMgdotEDTF2raZo0bNgwOWFMTIxr1p7MF1wdBlaMGDpyoa/78wFDNL7DgIPNhQDvF6vG+D3aeA628R7oE8z5XxgcEIj8EgjGckduRsycOXPagTZZo+RiMcADpYSEBE4omjRpMpQdu3fvPjcuLm52amrq5rS0tE3AWnMhOTm5aozfo43nYBudTqfl/Js3b05Cfrqns9cG8Nfm4sWLLYGZuAOIHwhMERInovqKhg0bPsPZKisrc4gB9QB1Icl11a9fvwzM6NVqdQWwyUkO9oC9KSApjLNnz0rhXL9+fcHixYt7Y5yKpUuXPhYfH9/gXpCZmWmh1+vr1Qbs3bu3vvEcSp7zY3yBLWZz7do1aroewgJrpidThMTZKCjRo0ePJLue9uUJW+P7znh7+m4rK6vcFStW6D766CPd3Llz08Fo+rx583Q4ASVMmzYtW2Up8moDxo0bl7lgwQI5/nvvvbcN+Z2LFi3SrVmzJt3GxmbXnPnvZeUe+KbHABunFEdHxyNkGiD5Bn6gZKqQaJPUkZGRJyCo6R4DBh2w7+XwfePGjTsc/q7Ereh4oabk9CH3J5980r3w2AHNgaP7JWB7du5v7WgJaAxoZABjWimrwv2s+jcioG1jh959G+GjMG8J7XDYd3ivHB+20c3CwsJ5z6ECDedDnZOLg+s5d0ePaAho0vDhw3+FVKrMBOgHSqYKiZNQUGL9+vUJq1evdoqKinKEpjgG+Qbns9JvkP8ef3//2MAhQWRQPO/hl/jqq69aoa3tp59+ajd//nwFbI1opawKQ1vsCGhjC02xi4iIsM/Pz7f28/PzdLJ1PsW5HBwcMgfjD3QZhCgGDBgwLzs7uw+2dxjmKke5yQJCX9NcAHY0AlWnTp1u9unT59dWrVqdKyujrRSiefPmU6BJ75aXl99B2xu9e/deAAfvAts5OTndcHd3v2kKsK9KparAds7BfDEYW2DO8xBiBlyCQ/uP7BM4zc6zDepoO80SEMaoFSHpNRqNBQf77LPP/AqK8/u7OgzcjK24Z+3atdb5B/MsX/QJTFy4cGEB2qhhP6i9ZNxkgJ/GxQtbW9tojPnzlu1fW2OuhvhYEchTSCORfwK0Waca+stEhiVhxj9VVlbWHZwo9aA1MzlOy5YtP6YwYDgXM//UU09J5klDA7hNaUBNBvhpXLzq3XffPQVbFSVUojdOuuHLli1LhW08AAfSBT5Td84H4McAMj3VipA4PU4XPxhOZxjXVK1Wm//dd99NRnlnt36ayFWrVuWBZqJgiM0GaJPkHds3g4Nhy40lbt26NT1t8csvv4QxDzBjTvRGkhMBm5r4lSoPHTrUAEKZyEHgfaeCblhaWjqV+a5du+qIsShuEbMZ5lgEaBM1UvTr1y+T2nPoVPEAHAxdHBwcUlF/BT5cCFyQPqA5p1nrNKszthSFJJYvX+6alZ85pJ9V/3JsgXXvvPOOM/LdcfrkeHt7bwOjQlkU6VoCLl5MnDjxWpcuXXZgzIbHjh2bCsFc8nIZvBnuQbPjx4/bopxJ8knCFDBLSLAvcs4DBw64ksBpswx+03Wo/izmmzZtuhQ+yhXQtapFGE8mfCTJ/3PPPccY7fZPP/00Ei7J0w0aNKBBF9CmILgBPFSkDZOdTPgnJzGhH7uwb+X06dPbwkBPQsE5Hx+fFa+99prX7j27BkOLiuDL7EQ5k9waJGoT8JHkuG+//fZ+zLcJJ2sraOxAlOfghD0DbfZeuXJlV8OcJmsTF2oY44GRnPTIkSNj0LMlnMjMyZMnX4XKv4K8wAkXPXXq1MugH4oWYVwlcXzRoUOHz1mAOHIa7NJteOGfIt8Q8VswsFnJJCEZ1Lxi1qxZba5cuTIOHFzs2bPnnLfeeuvp9F1pA2GbLsDr5RZAlZC2g8RDAqlNGo2mCOMXZnyz3eX111/3wAFCO3UnNTPlFXjdrVHHdvLDgn6gZJKQoM5yksOHD78CFe8GT1f74Ycfnti9e/c/UNESX3HZ7Nmzz4Lm+GQO5ENL/AgqGPD/IASSH+b06dMaCKbEx21IMmZ9prCw0BeY6S8Tklw4tKkjDCW1SLRv3z5l+/btj+fsy6ZvdK5jx45R5OgvBLn4Fi1aJHHOH3/8MRAGu2GjRo3WMo+DJBDOLtvwgxGz+E8DF1zVmAPdD+zt7aUNgHftAqE8AwO5FdcjWz///HMKqCWO3xQEsd9jUIYg4n7j1UY9PhimEwJ8nBzY102HUKg3wqD+Wq2WHnjBzm93OEHTWrERtmW9+82JdtUEqQiJhWoEhfr7wb59+25jEIGtFkBsZ2cXSefx0qVL1KpKBLKxLAdUYltW3m+82qjnPJhPcKw2bdosIn3r1i3pzOLW9Evknzhz5sw0YMEQiu3+CNCOW1iRjQxwKSAWVhYVFTXKyclpAg+6cU1Qyo8ePdrkpZdemotjPwj3NQK+UVdckbyGfFeEIJex1RjH1c/Ly2tac4yHmcd9d1NoSANsORWOimvQnkBoTyBOuiexaHH16tVxcDT7sc0f8YYbzsfRhruFW5NdpZAoIKHRaD7AYgtxYhVi8IN4SyMUG+hinFzMF7388svH1m5c8y/2zszbKdLT0+dvyfh6PvO7CrJaJCYm6tzc3I69+eabRcoYxJMnTy4GHAQU4z2sikZelgGzjMA8QaGJqwHHAxQDyBNxMW5DC3H1chyaniJU4nHwowatxYeRmoW4siUEmQnejs6YMYO8kY+q/hyLa0XdfsgiIwh/vArGOFJIwsXFZT4cr3ewyPaQ+HkYvrLz588TSg10KfKkf7hw4cKxHh16plt3ey6NGEZxm1VX66o8YrY8eLqyL/qUnTt3jn3LcMcjMcpKlTLSAKUt6wnMExSauCZUjYv+5KsU45eVl5d/j22fDd4kPz///PO2y5cvb0c+jQCf6VvMrfBSSj6xPtmf5ehbCkdYQA4abeqmTbm5ufJUVENaLWCAx0Ji118ZM9EfzqHziRMn3AFuhJMnT0qMOMiNgO3m8f777/shPvMnPnXq1JCDBw8+r+RhnzyVPsb9Ma7szzHMBeNxSSvjkYYzOxi8SP4w5xDkfZD3J4B3L7YxBqO+GrTVxK5a7xA2LDwO8hAwP9JbV0PazOtd7F2z4MLLYBRGjWUq/LsLWId4rFIB5KWxN8qjGxRe/D1Afox4+dO8oZ/AXz08k1/F4bMetGjWrJmGWG1paUkrrkajtpBcIxYCaLRoq/7foAJrF4giOhBXVFRcJ1Yjgr4G4kz23t12CBRXhYaGjg4MDBwDuxUaEBAggbRSFhwcPFrJ44uFKnmW1QT2r1lmSv73xlHKFVxzbIU38k4gv2xDmti4H+gxKB+Fe683ccLNhEyEWq2W74pqnAg3Q4PGfMLCrTu2jIzRRsckpmnXwXBFJ+uSJJBWyjalJMQo+fgtcdFKnmU1gf1rlpmS/71xlHIF1xxb4Y28E8gv25AmNu4Heh3KYxO2xi/ckZvR3tnO5TCeo3iB99vpNn78+MQZk97wGBMcFoJL++GI6EcEeL84ghgQ7O85VEshAm6jzQ8hAaPoUOqRF2gfO2LoyCC0U9r/7XiY3/CR/NHEcP8Rs/v26cedIrCGyolh/7gBniXfQ71eODV2xEuT8NQVhJhvJPkPwJrRdxjKQzQajS/iv9Nor6I9EtCmO3imzoyOjt6YlJSUAHc+Pjk5OZ4YoH3ssce2o7Ho1an313gDs8VTEa9kVQggNyYmJobHxcUlop3S/m/HuFOK448m8DiwEHGlfIyA7b3m6+sbOtjVO5FrwePEt3jRWZGSkoIlJMaRf64ZfTehfCP8Lhlaoa1eCgkEE+kqgCQtWAhnrDH8CUb3om/fvhvg9l9atiaCVw8C3u0nMPgVvXr1aoC2VX3rAq3wb2VltQb8nMGxr0Kosq1bt27zkBdwVXp+9dVXT5M2tDXmnx43T3YeYL9tNzYEsKAKEOOQFlA5P4QcNggcCyDhJIQk4Whr7z3QJxMvtCdAM47j9mP7OgPgX55Uc+bM+QGvydl4tHwCV7tj8ey0f4CN0zdwnu0LCgqcyD8+NregMe/syzJWVxOSLDD6JxvBAfNkWbt27ZYBq+B8Sa1q27ZtJE4L7ndKXbZFfV1K5InawVtLLZ+/4ZF7k0E8O8lbTEQLMo8tRqGw6p4gB6lZg6sHlusnTJjQ85v9OUGY4ERsbOwGPNkEI+8IrTrs6ur6taEfv4CBrHOIghK4qUzH48AuxG9+Y8eOtUIAy7e6X3GLGoiYUf7GyrDmey6AwrirAlcPcvCTJ0/yeuEJGLmFsD238SrC3/sI5Jdg2/2Ejuwv24Kui4m81YMdugXN30wGS0tLZ+FwugwDvhT5Foj9BgMLrJk2iORdwEVWKzRIVI+IuBf2Le+IysLDw+NnzpzpAS0ahVeJXLyCbDR0IhMGss4iySMeMdPB4WW87AYgXu2CLSfXgIB9QkxMTFPUccvdU1B3CQkSRXshIOHRIBrAD8qAF/5vXLLJF1rYpp3wq+ius69kAO3qcpI84s79CG5Rk3Br2RjR/VAY9BLEq8UI7h2zs7P5Kz0BBbm/kNCIC6984403OpSXl8u3dLy1L0e40havDh6QxEVra+tVwI9S0hvWJfCis5yMw2AHdOrU6SYuDFcwj1tLH2IoiF4IUtWBQqkqQSMpSVx9eO0t2dMO99UxH3zwwR7EMjPQqDmOTi2uHOhk8USrywYb7P4vYV1Sm1BSDNgHszEQJ7Mzjv4NOJSu6XanT4I70xx1bFdNJiir5gKwsgIX6N2wb//JSkg7Au/8bXGhNR75WzjRooCZOBjxowLkV71y5crbCDvkz4Bgi0ZibVehTYzPWlhYWDxvWIxUFAMtEQUjCeVfcXFxDziPnXF/nYNB8zMyMsbDEXscb2sbIMBa/wmNMu/Dxthycopnn32WIdbFGzduDINj2QovzfGswPXIDIQxvPa9y4DfJSTYojvshGOz5IsvvrCGAR/LfMeOHVcTA9iHXwbko5OULYdH1HODnDx3wYA/jcfU/iEhIUWezl43cWXbuqSk5CmuCAKtpk1cMMurAK+vMmbDK2jIli1bsrB/O+HYT4DA5N0KGj4ytgi8Gid+2Hrw9yo7d+4sDx9cPU/R6XQv496INlaFO25qkYBAjftVs0kcROANfR+OxOlFNQAAALxJREFUxly8qTdNy0ptBmP9PXwM+RqCnncJFWWPUpIf2MvLK0PT330zDievxcs/+ee2bF19+14OeREREaWGxUhZGOi7hKSC3Tnr6ekZNETjG46rkAm4RvFbsmTJfnSgCspJQD+qiYtX4WSrsLGxeR1+00JsvRPYbrEeHh4zoGWyHosjBvot1dQMVqrgaJ1PS0tbhze11fPmzTuEphQQ60A+8onrUOHDn4ETORuRhTMOp9BFixbxRuOe6/wvAAAA//9BL29UAAAABklEQVQDAMGWejByBIefAAAAAElFTkSuQmCC) center/contain no-repeat }',
      '.serv-parking { width: 46px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-parking-active { width: 46px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-reservations { width: 55px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-reservations-active { width: 55px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-restrooms { width: 49px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-restrooms-active { width: 49px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-takeaway { width: 34px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-takeaway-active { width: 34px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-valet { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IkxheWVyXzEiIGRhdGEtbmFtZT0iTGF5ZXIgMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6bm9uZTtzdHJva2U6IzAyMDIwMjtzdHJva2UtbWl0ZXJsaW1pdDoxMDtzdHJva2Utd2lkdGg6MS45MXB4O308L3N0eWxlPjwvZGVmcz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik03LjIzLDExLjA1SDEyTDEzLDguMThoOC42bC45NS0xLjkxLS45NS0xLjkxSDEzTDEyLDEuNUg3LjIzQTIuODcsMi44NywwLDAsMCw0LjM2LDQuMzZWOC4xOEEyLjg4LDIuODgsMCwwLDAsNy4yMywxMS4wNVoiLz48bGluZSBjbGFzcz0iY2xzLTEiIHgxPSI4LjE4IiB5MT0iOC4xOCIgeDI9IjguMTgiIHkyPSI0LjM2Ii8+PGxpbmUgY2xhc3M9ImNscy0xIiB4MT0iMTguNjgiIHkxPSI2LjI3IiB4Mj0iMTguNjgiIHkyPSI0LjM2Ii8+PGxpbmUgY2xhc3M9ImNscy0xIiB4MT0iMTUuODIiIHkxPSI2LjI3IiB4Mj0iMTUuODIiIHkyPSI0LjM2Ii8+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTMsOC4xOCwxNS43OSwxMWwtMS4zNSwyLjcsMiwyLDIsMiwyLDItLjY2LDItMiwuNjgtNi4wOC02LjA3TDksMTcuNzgsNS42NywxNC40YTIuODYsMi44NiwwLDAsMS0uMTMtMy45MSIvPjxsaW5lIGNsYXNzPSJjbHMtMSIgeDE9IjEwLjM4IiB5MT0iMTEuMDUiIHgyPSI4LjM3IiB5Mj0iMTMuMDUiLz48bGluZSBjbGFzcz0iY2xzLTEiIHgxPSIxNy4xNCIgeTE9IjE5LjEzIiB4Mj0iMTguNDkiIHkyPSIxNy43OCIvPjxsaW5lIGNsYXNzPSJjbHMtMSIgeDE9IjE1LjEyIiB5MT0iMTcuMSIgeDI9IjE2LjQ3IiB5Mj0iMTUuNzUiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik00Ljg5LDEyLjkzYTMuODIsMy44MiwwLDAsMS0uNTMtNy40OUEzLjgyLDMuODIsMCwwLDEsOC4xOCw2LjYyIi8+PC9zdmc+) center/contain no-repeat; }',
      '.serv-valet-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat; }',
      '.serv-wheelchair { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-wheelchair-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-wifi { width: 67px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-wifi-active { width: 67px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAAAyCAYAAAAHtGYXAAAPuElEQVR4AcSaCZSVZRmA/zt39hWGVVEx63CyIu2UWhGpmAqRViRwUlsUS2ixY0ZWhBYuIS6n0jRLUbPUEMUFNxYhEXdNzX1BTeCAM8zOMMPMndvz/N4frsO9MxeYoTnfO9/27v/7fd/7/f/NC/rvT97xHthXMrcvsH83GEl/LyAbrXyFGDh9WmTalwzlJ8izi38JwFIydOjQgwoKCqYDP8rPzz8nHo8vCEqSK4HVwMPd4AHmry8qKpopfmlp6akjRowYBaMCQL5CkraydFqfOEZm8NztIh9BJQUZfrK8vHwqTvgHhq58r3njsx35W68CLu8s6PhtorDzWJAOAPYGRqTBPrRHM39ye17bPPFbk5uvXVe39oWBAwcuA37F/BHDhg0ro1aWDtcxu+0UDYDnLhfpfSoqJYysqqo6m6d5Iw64tyXRfAtOOBHuhwKvDSgauCzYEpsBnABMjm/Nn1wSlE4uj1dMri4ZFNaOOQdMAU4oTBTNgvZpYGN9W90XgQvgvaK9vf0eImxeRUXFF5izRE5RH8GxnQKN2SmCFLLCfBI6IIkDPjRgwIDzUHJ149aGuTzNk8GrxvjlGHnqPoP2PQjDxjQ0NHyN8T8DtwELE4nEwi1btixsaWlZWFdXF9aOOQfcCty2devWC6E9CjhseNVe4yoLqn7P+IaG9vrDibCZzZ1Nq4YMGbKkrKzsFMarAaNEUD+6uZddcYZCFJYoLi7ev7CwcA4OeAjlfo3YEQOLqx/FCaei/KEYfwxGXrd27drnmasFNgPKzBWUJW4jdOs3bNiwoqmp6cyiruIx8D+G+irG36ppee/ozV0t83kYywcNGvQdxiwJ/wHSU/VeckaEVRQNCslng5vWFtuyamu8fTZzrvMnB5cNGVdfX/9FnHAdYy8ARo4GCcqSh2O5grLElU76kA9LZA28l1L/gGU2tqpwwC/pvwkcvKm19noiZTFL9SD6Fumltd0j5IQEB/HCaNh77733JSRvYoO7hvF9jATW+Yk8qXG1tbUrGOsExBdoBhokqJQ8HNtZkE76iI+8hYBltq6xsXEu8scQkT+D8TtEykSW6mqcMpd+MSCtjtSpdDOXkGHmqW2jMpFZGXvDjPUN614gJCczW1/QWXg6kTCedX4z/RZAXAWKLzDUL0XegrK0QdjY0NBwKXvKl4jQvyC1DKeczQa7rKSk5PP0daROFZfujiXrRApV42QygjP/OvaGK4NkUMmmuABHTOjo6FBoE7jiqZi4CmRojxRl6RRBW+LsKW8QoaeXxsq+Cqxmgx2zJWhdRK7y1ZRGEW6qu72SwfbeB1v5dN0kP8TGdAdnvtGwfkj50FlsilNxxOPM/7+cgOgdikb6MLQp3traehcwYVDp4MVgDiVXuYPlfS1tM19x1Z3u9iLh9t72lo5w7e/PJnkHw58BXufMn1BTU3MhbYvMFO7TsZ8rGEHKTQd5Celj4uXKMx1PQ9VLG5o3bdp0IqfOFSB0bO5qOZV95O+0ywBxlEnz/aLw91vb/8tER4wMipN69ZNMPVGRX3k8Z75HpAxUVGZM9VrEVY5gW+epcDrIS0gfE098QVqhV2FpCNogTTOnzo9ZMpOYq2MfOQ6HmMNU0Vem9tAMApHDRupf5Ij9WRp3B7Hg4zhhJTv11Obm5lfAkVAGKkq3xxJjVnxxIyNtB6TSownZo8lTjuSI/gr9WZxSM8F3bBxzR40aNWowffGFiD7iac10r0W60EaWzOKyvPIp7HmNOGQCaf0/oS4HtCfECf8xYFFxvTkSR9zFwGjC6x6cMI3224DzEtLssaiofDVCfI+2jwwePPgsNuFrKisrV21s2vA8IbuEJfggR/Td9M9fX79uHnIdW87cstfeffVJHDWfE+xKEqmvI3EvIOJprQyGei06RJ3yN2/evLw0r+ybPOQm0vpjiZAboHbJhDgRw9BQntT7EREEo4mIVYTXDJBNcMJ52h8oGTriqajMC7mofYM0fXFQmny6dnPNJWzC05o6Gg+B7jWe0Iuk1w+VBKUXE8K/Zj+aTfLkBvcEcyZsJTjqFE6wGSRSt+Oop3HkFZwKn4beogz1F+z3BOrkg3Zjva+6eNAJINcSIZNwyC9oW+IyEnyCQ3lShs5oZp4hIr5L/S6ggc7TzFrkIYhXwLl+Auf7/VzUFpKmH4VxHUTZvRh7OkvuU8DHgrbYJ0ivDydp+jkhfAH70fkkT6cxdxhzownpgzm+P8cxfkl+R8G/kDwYR/6QU+EpouWv9D8O6BDBJy8w1GNRvzin4VIegPYlcMhPoDgK6NQAvRZwx/gBA94u30YRLz25RoQ8VKgLL0/g6d3DuX4r5/uR8HudBOhc+I0jyiZirHnJy4yrFFVYpI8gMihGSG/g+H4MxWd2dnYeizMnwstL3jqi5TSi7RGi7g/orVO0QYjoQ8ZZ/qlrwAO4B56Xg1PBQXFbdXX1sSqRZDM5iTvGuUwEPJkzUcRTw800Xelwuts/o6aLDW8Y4XsOXr6Tp3c0OG8S9ufCawwJ0JwUP4bDDVuZ6UqrXAQaJJ61OPK3xpftS+E1A56H5rXHzyba2oi6M9D7Pu4h35cIkE7+NLOWbTgwncNSvYs9pArHTw8J2UzOkJSJP1GbV1CFdwrrbJDPhM4azrK4jfD9Lf0Cwno+Cn+ZsJ9DvwYQTzka1d1oprMWlZa/tbTyENZ3dXXNI5k6jnvRQ1Dvyz3kaqJEeXQDZYhnOxtEOPUs1ZOJ3GPYFqaFRMXJkrN4wTKVibNS1ApXiVR3h0o6N6RhLItFbI5jwHgHHkfW1dV5+rxGXxz5iKfwnviB3mORVh6CfPNIpp7gXnQEDpkFZYIomc2SmU/bt2fiKZtu1iKOvJqJ3KVg1dmJtbW1PcwLlgUMtAMyUTjNjMXQ7WKD/ChrbRnL4rNgvc16ngSPlbSll6/CeuID6i4V+QrKSOKQC4nEb8PpPZbMKZw6t7BsDqavbHFoZi3yUV9tiokcEYUDkNmnylgM+QQzB7NB3sla+wSb0BKUOZ71/AzjzlOFoWrdn6Ah6q+Mm9SBdOAROofEYrHfUatLOg5DGYv2alMyYiZROJAR/f1BcQ354Xjfo20Um+QiNqEpTP8HiOZlTnePFPX2ySr7cdb91zgyHyNCxrOh/yalQYST6mavZJJ9dvuMAmXqHrGQYS9uT7BJ+jLFV3JGlfNM5VzkqXxprYWo7VyujHS+sv2MUMORqU61bOiz2M8ih+TESwV6Q1QxBQZ4ezZ7hJvl2zyBnc1OlSMvZWq0PDXCiLQWorZzEZ400vYGHSBIs5ol81PaSXQ9F50n2gaUSZW9SJx9Nm2G1HoK3p7OUC2Z4WSegHuEAjSA4R6LBrmGNTIyuni//fY7gDuL6fU0Nr1pXNgO42PRPnAqAiI8aXLVU1xIgxvZ0MO8CZ2t/TajnurhfEboTYjECigltT4PDnFS6nkkKE/R1jgF0OyxKEMe7jdDwDyCD0uzCeEl/61551WO5afYg64hV7iGC9tj6+rWvkQmuxQnmTeMBd/w1zE6Xn0YylqUo7yADX0uG6rvZA/h+8ppKYoe6UPCFGJPVRvJ1AqSshtIqX1RIm6ujtCQAOO+wq31ZgxfwYelOYSwhm6AkZvvs9TPBcnAC1oDmexYnDQb3JU47S4ukKb2yttmLPjZivK0q4N3s+4fT3K6KCcb/rZxibZ1MjQU7nAXydR0kjIvN1sY0MPRHN2MRd4qdiB5/3UYdze3Vi9Er5Dx/eyAvT48lhvr51jfhwPjQmiL2T6U7PJoIvBquDY1dTSO5wJ5P9d47xGDGJOnUUIzaxHH+8cz8B1DJP8thRmOp9o7VCq8w2AvA7k4QmXDixtP9+66LZtCJw4oGvgTlBtLxnfpmjVrHubGuhZZ9SmooxY2kF0uIwKnc3SPBS5hvItr/I9I9EwMB9A3SpRBs8eirm6sbT1ipSZ3xhkyFnqLCHESRMP4mub3/ITwYSJhMY74GK/y/4hcv6xpiHuO8jOB8zGO7heAmSzR46F7g0RvHA65nXY1oEOkpZm1qKv6CFmRoonemEV41jIWbGcD+SU5ecYRDQvIUKt4m347kTAFR0Rvy8TREDdUwzYTOK8scWMs0aVE1PHcoR7FIUemHDIYJaQVh2bWIh8hK0I00RujCC+XWl4qV82t0pOngmhYXlNT40do9xkjQSPFyYWfOBGukfIyd6gZOPglHHI4G2uUUOVkqMx6Aw3oDSfX+TAUOTW+zdnuF6waosGXvJEjjIRceaXjaaxO1CHPVcQrzXU2sbF+j4RqAojO94kdfcIEheSjwkNrW2vCFy2cFBcx/m9AIzI5QudJlwkg26HIP879YxUR5/FeiNMvAKsSMILkR3PXi4rsOnU3SqLiRHKFA31nyUnhuwUxVNQ6HVTcJ+pcJlAvcdJpbEvjx2aPSt/Pfor9yV8AOZcJ3/GcQaE5I2dBVAkNiuOA8eKQXPm2zCPTqAgNcDwFyozGvp6Xl/dTMkR/mvRz2meyF/h+RH7iyDtFFlaO53FTXlMer/A1f8A7FE8WJ7vjOrZToGI7RdADchfJjQqt4/S4MYWnQalmWDmvQQHvTS8jB7m9qyhxaWdBxwW0L6J9WVNn4wO8kz0b7ApAemlofrD4TYXkzB+rvJiaCfmm2rtU9YUzVDgUnkwmzyGn8Ja4iQGNSFfQfoirI/hQdCY4reBfwv4yCZhCPnEry6yMd7JziRY3X1B2KPKMkZS9RXLmG/2HUxgh71R7l6q+cEYkOElkPE5UPJca6K6czvA1wIyUIzaSO3wL/Jksr0XAreQTU8glwp8hdeZ3nEEK7gcn+XTX0zH5CSlxu191F7K7HOUndOej0j7RPE6A8AbJmvckMJsU373FPCQgl7iZl7x+5/XD8KQUI3FSzW2VDhG2DexuI5OQ3eGpwUJGHiNHjhzGxEeBFtLsB6ktOspj0+NXh3SxkS5wIpFI+K5DRzknnsP9Bn3tjGyKhoawxr115rEvaHwkO/3phm3uNa/LiKt3OXUJsEdKpFB/CwuN5GOT95NWUupSToPISJ+88nVYqA+v/81gA5zhrdbfijkX8hCxvyAU3l/Mu/PlntJSWVC1jPECXtj4Fc/Xe16xNZbhwLZZ7PfscMe53xropicj/VD2iBD09qmGsjg1LqZfy/F5El/Tb+AG6tJxPuk7UJKu+SyjA3HaY9xtFoFryboPOdlXECrYV8x64aNBeRy/T3GkngRua+PWhqnNiaaHWDILAH+0soIL2MQgFrzc1NTkL47NYo0anQVJ/5Y96QwtCR1CYwlvrycOqxz+KFEwPFHYeRxwBOOtJF4Lg9aYX/KX099jjkBWsKedoczQIby9Xrlx48bPEyWfTgcTL5DWAXvUEcgL/gcAAP//ldgqUwAAAAZJREFUAwBTmUpSEuvfCgAAAABJRU5ErkJggg==) center/contain no-repeat }',
      '.serv-curbside { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '.serv-curbside-active { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) center/contain no-repeat }',
      '[wz-theme="dark"] [class^="serv-"] { filter: brightness(1.5); }',
    ];
    $('head').append($('<style>', { type: 'text/css' }).html(cssArray.join('\n')));
  }

  function onVenuesChanged(venueProxies) {
    deleteDupeLabel();

    const venue = getSelectedVenue();
    if (venueProxies.map((proxy) => proxy.id).includes(venue?.id)) {
      if ($('#WMEPH_banner').length && venue?.id && !_isHarmonizing) {
        // Auto-harmonize when venue with banner is modified (but not if already harmonizing)
        harmonizePlaceGo(venue, 'harmonize');
        // Refresh all highlights to sync layer features with updated venue properties
        refreshAllHighlights();
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

  function toggleXrayMode(enable) {
    setWMEPHSetting('WMEPH_xrayMode_enabled', enable);

    const layersToControl = [
      { name: 'Roads', setter: 'setRoadsLayerCheckboxChecked' },
      { name: 'Paths', setter: 'setPathsLayerCheckboxChecked' },
      { name: 'JunctionBoxes', setter: 'setJunctionBoxesLayerCheckboxChecked' },
      { name: 'Hazards', setter: 'setHazardsLayerCheckboxChecked' },
      { name: 'Closures', setter: 'setClosuresLayerCheckboxChecked' },
    ];

    if (enable) {
      // X-ray mode: Hide background layers to see details underneath
      logDev('X-Ray: Enabling - hiding background layers');

      layersToControl.forEach((layer) => {
        try {
          sdk.LayerSwitcher[layer.setter]({ isChecked: false });
          logDev(`X-Ray: Hid ${layer.name} layer`);
        } catch (e) {
          logDev(`X-Ray: Could not hide ${layer.name} layer:`, e);
        }
      });
    } else {
      // Disable X-ray mode: Restore all background layers
      logDev('X-Ray: Disabling - restoring all background layers');

      layersToControl.forEach((layer) => {
        try {
          sdk.LayerSwitcher[layer.setter]({ isChecked: true });
          logDev(`X-Ray: Restored ${layer.name} layer`);
        } catch (e) {
          logDev(`X-Ray: Could not restore ${layer.name} layer:`, e);
        }
      });

      // Restore editable data layers to normal opacity
      /*
            try {
                sdk.Map.addStyleRuleToLayer({
                    layerName: 'segments',
                    styleRules: [{
                        style: { strokeOpacity: 0, fillOpacity: 0 }
                    }]
                });
            } catch (e) {
                logDev('X-Ray: Could not restore segments layer:', e);
            }

            try {
                sdk.Map.addStyleRuleToLayer({
                    layerName: 'venues',
                    styleRules: [{
                        style: { fillOpacity: 1, strokeOpacity: 1 }
                    }]
                });
            } catch (e) {
                logDev('X-Ray: Could not restore venues layer:', e);
            }
            */

      redrawLayer(_dupeLayer);
    }
    if (!enable) return;
  }

  /**
   * To highlight a place, set the wmephSeverity attribute to the desired highlight level.
   * @param venues {array of venues, or single venue} Venues to check for highlights.
   * @param force {boolean} Force recalculation of highlights, rather than using cached results.
   */
  function applyHighlightsTest(venues, force) {
    if (!_layer) return;

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
              _resultsCache[id] = { s: severity, u: venue.updatedOn || -1 };
            } else {
              severity = cachedResult.s;
              wmephStats.cacheHits++; // Direct cache hit (no harmonizePlaceGo call)
            }
            venue.wmephSeverity = severity;

            // Add color feature to layer for visualization
            if (venue.geometry && severity !== 'default') {
              colorFeaturesToAdd.push({
                type: 'Feature',
                id: `color_${venue.id}`,
                geometry: venue.geometry,
                properties: {
                  wmephSeverity: severity,
                  venueId: venue.id,
                  name: venue.name,
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

  // Set up CH loop
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

  // SDK tracks unsaved changes automatically; no need to execute/save here
  function executeMultiAction() {
    // Changes accumulate as unsaved; user commits via WME Save button
  }

  // Split localizer (suffix) part of names, like "SUBWAY - inside Walmart".
  function getNameParts(name) {
    if (!name) return { base: '', suffix: '' };
    const splits = name.match(/(.*?)(\s+[-(–].*)*$/);
    return { base: splits[1], suffix: splits[2] };
  }

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

  function getServicesBanner() {
    // set up banner action buttons.  Structure:
    // active: false until activated in the script
    // checked: whether the service is already set on the place. Determines grey vs white icon color
    // icon: button icon name
    // value: button text  (Not used for Icons, keep as backup
    // title: tooltip text
    // action: The action that happens if the button is pressed
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
            addUpdateAction(venue, { openingHours: [new OpeningHour({ days: [1, 2, 3, 4, 5, 6, 0], fromHour: '00:00', toHour: '00:00', allDay: true })] }, actions);
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

  // Main script
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

        if ($('#WMEPH-HideReportError').prop('checked')) {
          _buttonBanner2.PlaceErrorForumPost.active = false;
        }

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
      } else if (isVenueParkingLot(venue) || args.nameBase?.trim().length || containsAny(args.categories, getCatsThatDontNeedNames())) {
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
              _servicesBanner[scFlag].actionOn(actions);
              _servicesBanner[scFlag].pnhOverride = true;
            });
            args.pnhMatch.servicesToRemove.forEach((scFlag) => {
              _servicesBanner[scFlag].actionOff(actions);
              _servicesBanner[scFlag].pnhOverride = true;
            });
            if (args.pnhMatch.forceBrand) {
              // If brand is going to be forced, use that.  Otherwise, use existing brand.
              [, args.brand] = args.pnhMatch.forceBrand;
            }
            if (args.pnhMatch.forceBrand && args.priPNHPlaceCat === CAT.GAS_STATION && venue.brand !== args.pnhMatch.forceBrand) {
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
            if (args.priPNHPlaceCat === CAT.HOTEL) {
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
              if (args.categories.includes(CAT.HOTEL)) {
                // Remove LODGING if it exists
                const lodgingIdx = args.categories.indexOf(CAT.LODGING);
                if (lodgingIdx > -1) {
                  args.categories.splice(lodgingIdx, 1);
                }
              }
              // If PNH match, set wifi service.
              if (args.pnhMatch && !_servicesBanner.addWiFi.checked) {
                _servicesBanner.addWiFi.action();
              }
              // Set hotel hours to 24/7 for all hotels.
              if (!_servicesBanner.add247.checked) {
                _servicesBanner.add247.action();
              }
            } else if (args.priPNHPlaceCat === CAT.BANK_FINANCIAL && !args.pnhMatch.notABank) {
              if (/\batm\b/gi.test(args.nameBase)) {
                args.nameBase = `${args.pnhMatch.name} ATM`;
              } else {
                args.nameBase = args.pnhMatch.name;
              }
            } else if (args.priPNHPlaceCat === CAT.GAS_STATION) {
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
            if (args.categories.includes(CAT.POST_OFFICE) && /\b(?:cpu|vpo)\b/i.test(venue.name)) {
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

            // PNH specific Services:
            args.categories.forEach((category) => {
              const pnhCategoryInfo = args.pnhCategoryInfos.getById(category);
              pnhCategoryInfo.services.forEach((service) => {
                const serviceButton = _servicesBanner[service.pnhKey];
                if (!serviceButton.pnhOverride) {
                  // This section of code previously checked for values of "1", "2", and state/region codes.
                  // A value of "2" or a state/region code would auto-add the service.  However, it was
                  // felt that this was a problem since it is difficult to prove that every place in a
                  // category would *always* offer a specific service.  So now, any value entered in the
                  // spreadsheet cell will only display the service button, not turn it on.
                  serviceButton.active = true;
                }
              });
            });
          }

          args.hoursOverlap = venueHasOverlappingHours(args.openingHours);

          args.isUspsPostOffice = args.countryCode === PNH_DATA.USA.countryCode && !args.categories.includes(CAT.PARKING_LOT) && args.categories.includes(CAT.POST_OFFICE);

          if (!args.highlightOnly) {
            // Highlight 24/7 button if hours are set that way, and add button for all places
            if (isAlwaysOpen(venue)) {
              _servicesBanner.add247.checked = true;
            }
            _servicesBanner.add247.active = true;

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
        if (!args.highlightOnly && args.categories.includes(CAT.REST_AREAS)) {
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
        args.hasStreet = (args.addr?.street && !args.addr.street.isEmpty);
        args.hasCity = (args.addr?.city && !args.addr.city.isEmpty);
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
          } else if (!args.highlightOnly && args.categories.includes(CAT.POST_OFFICE)) {
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
          if (args.categories.includes(CAT.COLLEGE_UNIVERSITY) && args.categories.includes(CAT.PARKING_LOT)) {
            args.levelToLock = LOCK_LEVEL_4;
          } else if (
            isVenuePoint(venue) &&
            args.categories.includes(CAT.COLLEGE_UNIVERSITY) &&
            (!args.categories.includes(CAT.HOSPITAL_MEDICAL_CARE) || !args.categories.includes(CAT.HOSPITAL_URGENT_CARE))
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
        if (args.categories.includes(CAT.PHARMACY)) {
          FlagBase.currentFlags.remove(Flag.AddPharm);
        }
        if (args.categories.includes(CAT.SUPERMARKET_GROCERY)) {
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
        if (venue.lockRank === 0 && venue.categories.some((cat) => [CAT.HOSPITAL_MEDICAL_CARE, CAT.HOSPITAL_URGENT_CARE, CAT.GAS_STATION].includes(cat))) {
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
   * @param {boolean} placePL Whether this venue is a parking lot.
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

    // Add click handlers for parking lot helper buttons.
    // TODO: move this to PlaSpaces class
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
      } catch (err) {
        logDev('Failed to set parking lot spots:', err);
      }
    });

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
        houseNumber: venue.houseNumber,
        street: { name: addr?.street?.name || '' },
        city: { name: addr?.city?.name || '' },
        state: { name: addr?.state?.name || '' },
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
      const url = buildGLink(venue.name, addr, venue.houseNumber);
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
      _pendingFeedRequest = $.getJSON(url).done((res) => {
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
      }).fail(() => { _pendingFeedRequest = null; }); // Clear on error too
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
    if (((venueNameNoNum.length > 2 && !NO_NUM_SKIP.includes(venueNameNoNum)) || allowedTwoLetters.includes(venueNameNoNum)) && !selectedVenue.categories?.includes(CAT.PARKING_LOT)) {
      currNameList.push(venueNameNoNum);
    }

    if (selectedVenueAliases.length > 0) {
      for (let aliix = 0; aliix < selectedVenueAliases.length; aliix++) {
        const aliasNameRF = formatName(selectedVenueAliases[aliix]);
        if ((aliasNameRF.length > 2 && !NO_NUM_SKIP.includes(aliasNameRF)) || allowedTwoLetters.includes(aliasNameRF)) {
          currNameList.push(aliasNameRF);
        }
        const aliasNameNoNum = aliasNameRF.replace(/[^A-Z]/g, '');
        if (((aliasNameNoNum.length > 2 && !NO_NUM_SKIP.includes(aliasNameNoNum)) || allowedTwoLetters.includes(aliasNameNoNum)) && !selectedVenue.categories?.includes(CAT.PARKING_LOT)) {
          currNameList.push(aliasNameNoNum);
        }
      }
    }
    currNameList = uniq(currNameList);

    let selectedVenueAddr = getVenueAddress(selectedVenue);
    const selectedVenueHN = selectedVenue.houseNumber;

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

        const testVenueHN = testVenue.houseNumber;
        let testVenueAddr = getVenueAddress(testVenue);

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
              if (selectedVenue.houseNumber !== testVenueHN || selectedVenueAddr.street.name !== testVenueAddr.street.name) {
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
            if (((testNameNoNum.length > 2 && !NO_NUM_SKIP.includes(testNameNoNum)) || allowedTwoLetters.includes(testNameNoNum)) && !testVenue.categories?.includes(CAT.PARKING_LOT)) {
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
                if (((aliasNameNoNum.length > 2 && !NO_NUM_SKIP.includes(aliasNameNoNum)) || allowedTwoLetters.includes(aliasNameNoNum)) && !testVenue.categories?.includes(CAT.PARKING_LOT)) {
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
   * Infers a venue's address from nearby road segments using branching search algorithm.
   * Starts with closest segment and recursively searches connected segments for street names.
   * Uses Turf.js for distance calculations. Returns object with country, city, state, street.
   * @param {Object} venue The WME venue object with geometry/centroid.
   * @param {number} maxRecursionDepth Maximum depth to search through connected segments.
   * @returns {Object|null} Object with country, city, state, street fields, or null if unavailable.
   */
  function inferAddress(venue, maxRecursionDepth) {
    let distanceToSegment;
    let foundAddresses = [];
    let i;
    // Ignore pedestrian boardwalk, stairways, runways, and railroads
    const IGNORE_ROAD_TYPES = [10, 16, 18, 19];
    let inferredAddress = {
      country: null,
      city: null,
      state: null,
      street: null,
    };
    let n;
    let orderedSegments = [];

    // Get segments from SDK
    let segments;
    try {
      segments = sdk.DataModel.Segments.getAll() || [];
    } catch (e) {
      logDev('inferAddress: Unable to access SDK segments', e);
      segments = [];
    }

    let stopPoint;

    // Make sure a place is selected and segments are loaded.
    if (!(venue && segments.length)) {
      logDev('inferAddress: No venue or segments available');
      return undefined;
    }

    const getFCRank = (FC) => {
      const typeToFCRank = {
        3: 0, // freeway
        6: 1, // major
        7: 2, // minor
        2: 3, // primary
        1: 4, // street
        20: 5, // PLR
        8: 6, // dirt
      };
      return typeToFCRank[FC] || 100;
    };

    const hasStreetName = (segment) => {
      if (!segment || segment.type !== 'segment') return false;
      const addr = getSegmentAddress(segment);
      return addr && !addr.isEmpty && addr.street?.name;
    };

    const findClosestNode = () => {
      const closestSegment = orderedSegments[0].segment;
      try {
        // Get nodes from SDK
        const nodeA = sdk.DataModel.Nodes.getById({ nodeId: closestSegment.fromNodeId });
        const nodeB = sdk.DataModel.Nodes.getById({ nodeId: closestSegment.toNodeId });
        if (nodeA && nodeB) {
          // Use Turf.js for distance calculation instead of OpenLayers
          const ptCoords = [stopPoint.longitude || stopPoint[0], stopPoint.latitude || stopPoint[1]];
          const distA = calculatePointDistance(ptCoords, [nodeA.geometry.coordinates[0], nodeA.geometry.coordinates[1]]);
          const distB = calculatePointDistance(ptCoords, [nodeB.geometry.coordinates[0], nodeB.geometry.coordinates[1]]);
          return distA < distB ? nodeA.id : nodeB.id;
        }
      } catch (e) {
        logDev('findClosestNode: Error', e);
      }
      return undefined;
    };

    const findConnections = (startingNodeID, recursionDepth) => {
      let newNode;

      // Limit search depth to avoid problems.
      if (recursionDepth > maxRecursionDepth) {
        return;
      }

      // Populate variable with segments connected to starting node.
      const connectedSegments = orderedSegments.filter((seg) => [seg.fromNodeId, seg.toNodeId].includes(startingNodeID));

      // Check connected segments for address info.
      const keys = Object.keys(connectedSegments);
      for (let idx = 0; idx < keys.length; idx++) {
        const k = keys[idx];
        if (hasStreetName(connectedSegments[k].segment)) {
          // Address found, push to array.
          foundAddresses.push({
            depth: recursionDepth,
            distance: connectedSegments[k].distance,
            segment: connectedSegments[k].segment,
          });
          break;
        } else {
          // If not found, call function again starting from the other node on this segment.
          const attr = connectedSegments[k].segment;
          newNode = attr.fromNodeId === startingNodeID ? attr.toNodeId : attr.fromNodeId;
          findConnections(newNode, recursionDepth + 1);
        }
      }
    };

    const { entryExitPoints } = venue;
    if (entryExitPoints?.length) {
      // Get the primary stop point, if one exists.  If none, get the first point.
      stopPoint = entryExitPoints.find((pt) => pt.primary === true) || entryExitPoints[0];
    } else {
      // If no stop points, just use the venue's centroid.
      const centroid = getVenueCentroid(venue);
      if (!centroid) {
        logDev('inferAddress: Unable to get venue centroid');
        return null;
      }
      stopPoint = centroid;
    }

    // Go through segment array and calculate distances to segments.
    for (i = 0, n = segments.length; i < n; i++) {
      // Make sure the segment is not an ignored roadType.
      if (!IGNORE_ROAD_TYPES.includes(segments[i].roadType)) {
        distanceToSegment = calculatePointDistance(stopPoint, segments[i].geometry);
        // Add segment object and its distanceTo to an array.
        orderedSegments.push({
          distance: distanceToSegment,
          fromNodeID: segments[i].fromNodeId,
          segment: segments[i],
          toNodeID: segments[i].toNodeId,
        });
      }
    }

    // Sort the array with segments and distance.
    orderedSegments = _.sortBy(orderedSegments, 'distance');

    // Check closest segment for address first.
    if (hasStreetName(orderedSegments[0].segment)) {
      inferredAddress = getSegmentAddress(orderedSegments[0].segment);
    } else {
      // If address not found on closest segment, try to find address through branching method.
      findConnections(findClosestNode(), 1);
      if (foundAddresses.length > 0) {
        // If more than one address found at same recursion depth, look at FC of segments.
        if (foundAddresses.length > 1) {
          foundAddresses.forEach((element) => {
            element.fcRank = getFCRank(element.segment.roadType);
          });
          foundAddresses = _.sortBy(foundAddresses, 'fcRank');
          foundAddresses = _.filter(foundAddresses, {
            fcRank: foundAddresses[0].fcRank,
          });
        }

        // If multiple segments with same FC, Use address from segment with address that is closest by connectivity.
        if (foundAddresses.length > 1) {
          foundAddresses = _.sortBy(foundAddresses, 'depth');
          foundAddresses = _.filter(foundAddresses, {
            depth: foundAddresses[0].depth,
          });
        }

        // If more than one of the closest segments by connectivity has the same FC, look for
        // closest segment geometrically.
        if (foundAddresses.length > 1) {
          foundAddresses = _.sortBy(foundAddresses, 'distance');
        }
        logDev(foundAddresses[0].streetName, foundAddresses[0].depth);
        inferredAddress = getSegmentAddress(foundAddresses[0].segment);
      } else {
        // Default to closest if branching method fails.
        // Go through sorted segment array until a country, state, and city have been found.
        const closestElem = orderedSegments.find((element) => hasStreetName(element.segment));
        inferredAddress = closestElem ? getSegmentAddress(closestElem.segment) || inferredAddress : inferredAddress;
      }
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
    logDev('updateAddress called with:', { feature: feature?.id, addressType: typeof address });
    if (!feature || !address) {
      logDev('updateAddress: missing feature or address');
      return;
    }

    try {
      logDev('updateAddress: calling SDK updateAddress');
      sdk.DataModel.Venues.updateAddress({
        venueId: feature.id,
        countryId: address.country?.id,
        stateId: address.state?.id,
        cityName: address.city?.name,
        streetName: address.street?.name,
      });

      if (address.houseNumber) {
        logDev('updateAddress: updating house number');
        sdk.DataModel.Venues.updateAddress({
          venueId: feature.id,
          houseNumber: address.houseNumber,
        });
      }
      logDev('Address inferred and updated');
    } catch (e) {
      logDev('updateAddress error:', e);
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
   * Extracts the current compressed whitelist from localStorage and decompresses it into the UI textarea.
   * Used for backing up or sharing whitelist data. Shows instructions to copy/paste data to safe location.
   * Resets the add-count reminder to show it once per session.
   */
  function onWLPullClick() {
    $('#WMEPH-WLInput').val(LZString.decompressFromUTF16(localStorage.getItem(WL_LOCAL_STORE_NAME_COMPRESSED)));
    $('#PlaceHarmonizerWLToolsMsg').empty().append('<p style="color:green">To backup the data, copy & paste the text in the box to a safe location.<p>');
    setWMEPHSetting('WMEPH_WLAddCount', 1);
  }

  /**
   * Displays whitelist statistics showing count of whitelisted venues by state and country.
   * Decompresses the stored whitelist and generates summary tables of regional data.
   * Excludes the placeholder entry (1.1.1) from counts.
   */
  function onWLStatsClick() {
    const currWLData = JSON.parse(LZString.decompressFromUTF16(localStorage.getItem(WL_LOCAL_STORE_NAME_COMPRESSED)));
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
        if (localStorage.WMEPH_WLAddCount === '1') {
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
      'WMEPH-HideReportError',
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

    // Color highlighting
    $('#WMEPH-ColorHighlighting').click(bootstrapWmephColorHighlights);
    $('#WMEPH-DisableHoursHL').click(bootstrapWmephColorHighlights);
    $('#WMEPH-DisableRankHL').click(bootstrapWmephColorHighlights);
    $('#WMEPH-DisableWLHL').click(bootstrapWmephColorHighlights);
    $('#WMEPH-PLATypeFill').click(() => {
      saveSettingToLocalStorage('WMEPH-PLATypeFill');
      refreshAllHighlights();
    });
    $('#WMEPH-ShowFilterHighlight').click(() => {
      saveSettingToLocalStorage('WMEPH-ShowFilterHighlight');
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
    createSettingsCheckbox($harmonizerTab, 'WMEPH-HideReportError', 'Hide "Report script error" button in results banner');
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
      if (isAlwaysOpen(venue)) {
        _servicesBanner.add247.checked = true;
      }
      _servicesBanner.add247.active = true;
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
      'WMEPH-HideReportError',
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
      'WMEPH_xrayMode_enabled',
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
      if (key && (key.startsWith('WMEPH-') || key.startsWith('WMEPH_')) && key !== 'WMEPH-Settings') {
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
            return PARKING_TYPE_COLORS[parkingType] || UI_COLORS.fallback;
          },
          getSeverityColor: ({ feature }) => {
            const severity = feature?.properties?.wmephSeverity;
            if (severity !== undefined && severity !== 'default') {
              return SEVERITY_COLORS[severity] || UI_COLORS.fallback;
            }
            return UI_COLORS.fallback;
          },
          getPointRadius: ({ zoomLevel }) => {
            return zoomLevel > 17 ? 15 : 10;
          },
        },
        styleRules: [
          // Rule 1: Filter highlight (wmephHighlight = '1') - magenta stroke only, highest priority
          {
            predicate: (props, zoomLevel) => props.wmephHighlight === '1',
            style: {
              pointRadius: '${getPointRadius}',
              fillOpacity: 0,
              strokeWidth: 5,
              strokeColor: '#F0F',
              strokeOpacity: 0.8,
            },
          },
          // Rule 2: Lock severity types (lock, lock1, adLock) - stroke only with dashed style
          {
            predicate: (props, zoomLevel) => props.wmephHighlight !== '1' && (props.wmephSeverity === 'lock' || props.wmephSeverity === 'lock1' || props.wmephSeverity === 'adLock'),
            style: {
              pointRadius: '${getPointRadius}',
              fillOpacity: 0,
              strokeColor: '${getSeverityColor}',
              strokeWidth: 5,
              strokeOpacity: 0.8,
              //strokeDashstyle: 'dash'
            },
          },
          // Rule 3: Parking lot with severity - both fill (parking type) and stroke (severity severity)
          {
            predicate: (props, zoomLevel) => props.wmephHighlight !== '1' && props.parkingType !== undefined && props.wmephSeverity !== undefined && props.wmephSeverity > 0,
            style: {
              pointRadius: '${getPointRadius}',
              fillColor: '${getColor}',
              fillOpacity: 0.5,
              strokeColor: '${getSeverityColor}',
              strokeWidth: 5,
              strokeOpacity: 0.8,
            },
          },
          // Rule 4: Severity only (no parking type) - stroke only
          {
            predicate: (props, zoomLevel) => props.wmephHighlight !== '1' && props.wmephSeverity !== undefined && props.wmephSeverity > 0,
            style: {
              pointRadius: '${getPointRadius}',
              fillOpacity: 0,
              strokeColor: '${getSeverityColor}',
              strokeWidth: 5,
              strokeOpacity: 0.8,
            },
          },
          // Rule 5: Parking lot only (no severity) - fill only
          {
            predicate: (props, zoomLevel) => props.wmephHighlight !== '1' && props.parkingType !== undefined,
            style: {
              pointRadius: '${getPointRadius}',
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

    if (getWMEPHSetting('WMEPH-featuresExamined') === null) {
      setWMEPHSetting('WMEPH-featuresExamined', '0'); // Storage for whether the User has pressed the button to look at updates
    }

    createObserver();

    const xrayMode = getWMEPHSetting('WMEPH_xrayMode_enabled') === 'true';

    // X-ray Mode: Fade roads/satellite/mapComments to see map details underneath
    // Uses sdk.Map.addStyleRuleToLayer() to reduce opacity of background layers
    sdk.LayerSwitcher.addLayerCheckbox({ name: 'WMEPH x-ray mode', isChecked: xrayMode });
    if (xrayMode) setTimeout(() => toggleXrayMode(true), 2000);
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

    // Whitelist initialization
    if (validateWLS(LZString.decompressFromUTF16(localStorage.getItem(WL_LOCAL_STORE_NAME_COMPRESSED))) === false) {
      // If no compressed WL string exists
      if (validateWLS(localStorage.getItem(WL_LOCAL_STORE_NAME)) === false) {
        // If no regular WL exists
        _venueWhitelist = { '1.1.1': { Placeholder: {} } }; // Populate with a dummy place
        saveWhitelistToLS(false);
        saveWhitelistToLS(true);
      } else {
        // if regular WL string exists, then transfer to compressed version
        setWMEPHSetting('WMEPH-OneTimeWLBU', localStorage.getItem(WL_LOCAL_STORE_NAME));
        loadWhitelistFromLS(false);
        saveWhitelistToLS(true);
        WazeWrap.Alerts.info(SCRIPT_NAME, 'Whitelists are being converted to a compressed format.  If you have trouble with your WL, please submit an error report.');
      }
    } else {
      loadWhitelistFromLS(true);
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
              highlightType: 'parking',
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

    try {
      const venues = sdk.DataModel.Venues.getAll();
      const featuresToAdd = [];

      venues.forEach((v) => {
        // Filter: exclude venues with PARKING_FOR_CUSTOMERS service or certain categories
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
      initPerformancePanel();
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
      // scriptUpdateMonitor disabled — WazeWrap currently unavailable
      // Uncomment when WazeWrap is back online
      // scriptUpdateMonitor: {
      //     downloadUrl: (IS_BETA_VERSION ? dec(BETA_DOWNLOAD_URL) : PROD_DOWNLOAD_URL),
      //     scriptVersion: SCRIPT_VERSION,
      // },
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
    devTestCode();
    //showScriptInfoAlert();
  }

  wmephbootstrap();
})();
