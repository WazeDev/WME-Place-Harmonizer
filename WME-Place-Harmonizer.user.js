/* global I18n */
/* global OpenLayers */
/* global $ */
/* global W */
/* global GM_info */
/* global require */
/* global performance */
/* global OL */
/* global _ */
/* global define */
/* global Node */

// ==UserScript==
// @name        WME Place Harmonizer Beta
// @namespace   https://github.com/WazeUSA/WME-Place-Harmonizer/raw/master/WME-Place-Harmonizer.user.js
// @version     1.1.82-Refactor2017
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH development group
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/.*$/
// @require     https://raw.githubusercontent.com/WazeUSA/WME-Place-Harmonizer/Beta/jquery-ui-1.11.4.custom.min.js
// @resource    WMEPH_CSS   https://raw.githubusercontent.com/RavenDT/WME-Place-Harmonizer/Refactor2017/WME-Place-Harmonizer.user.css
// @resource    JQ_UI_CSS   https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css
// @grant       GM_addStyle
// @grant       GM_getResourceText
// ==/UserScript==


(function () {
    "use strict";
    ////////////////////////////////
    ////////////////////////////////
    //// Global WMEPH variables ////
    ////////////////////////////////
    ////////////////////////////////

    ///////////////
    // Constants //
    ///////////////

    // New in this version
    var WHATS_NEW_LIST = [
        '1.1.82: Added option to disable check for missing external provider on parking lots.',
        '1.1.81: Fix for incorrect capitalization when "mc" is in the middle of a word.',
        '1.1.80: Fix to allow entering phone #s longer than 10 digits, e.g. 800-THE-CRAVE',
        '1.1.79: Fixed area / point warning when multiple categories are present.',
        '1.1.78: Added yellow "caution" highlights.  Were previously red.',
        '1.1.77: Unlocked PLAs are highlighted with a bold red dotted outline',
        '1.1.75: Fix for Google hyperlinks not showing up after first click on place.',
        '1.1.74: Keep hours input visible at all times.',
        '1.1.73: Place Website button added when URL is added.',
        '1.1.72: Fixed lock issue with Missing External Provider flag.',
        '1.1.71: Added "avsus" to list of staff accounts.',
        '1.1.70: Fix for adding 24/7 service from PNH spreadsheet.',
        '1.1.69: Added input box to enter missing street.',
        '1.1.68: Added "Missing External Provider" and option to treat as non-critical.',
        '1.1.67: Fixed optional 2nd categories.',
        '1.1.66: Fixed highlighting for unlocked hospitals and gas stations (purple / dashed).',
        '1.1.65: Fix for bug that caused hang in v1.1.64.',
        '1.1.64: Added URL entry box when missing.',
        '1.1.64: Missing gas station name automatically set to brand name.',
        '1.1.64: Minor UI adjustments to fit some messages on one line.',
        '1.1.63: Added option to exclude PLAs when searching for duplicate places, and vice versa.',
        '1.1.62: FIXED - Whitelisted flags not saved for new (unsaved) places.',
        '1.1.61: Fixed issues with Rest Areas.',
        '1.1.60: Fix to get place category "special messages" to display.',
        '1.1.59: Fix for erroneous "stacked place" warning on area places.',
        '1.1.58: Fix for multi-edits when runnning harmonizer in some cases.',
        '1.1.57: Fix for Store Locator button not showing up on first run, and unpredictable Service button behavior.',
        '1.1.56: Fix for needing to run twice when useless alt names are removed.',
        '1.1.55: Added Waze3rdParty and renamed "edited by waze maint bot" to "account administered by waze staff',
        '1.1.53: Fixed bug where blank space was being inserted in front of hotel brandParent name',
        '1.1.52: Fixed bug reporting PMs.'
    ];
    var WHATS_NEW_META_LIST = [  // New in this major version
        '1.1: Built-in place highlighter shows which places on the map need work'
    ];
    // Script Name, Version, Meta info
    var WMEPH_VERSION_LONG = GM_info.script.version.toString(),             // Pull version from header
        WMEPH_VERSION_MAJOR = WMEPH_VERSION_LONG.match(/(\d+\.\d+)/i)[1],   // Get the X.X version number
        NEW_MAJOR_FEATURE = false,                                          // Set to true to make an alert pop up after script update with new feature
        SCRIPT_NAME = GM_info.script.name.toString(),
        IS_DEV_VERSION = (SCRIPT_NAME.match(/Beta/i) !== null);             // Enables dev messages and unique DOM options if the script is called "... Beta"
    // CSS Stuff
    var WMEPH_CSS = GM_getResourceText("WMEPH_CSS"); GM_addStyle(WMEPH_CSS);
    var JQ_UI_CSS = GM_getResourceText("JQ_UI_CSS"); GM_addStyle(JQ_UI_CSS);
    // Was testing this, but I don't think the following line does anything. (mapomatic)
    //GM_addStyle('  <style> .ui-autocomplete {max-height: 100px;overflow-y: auto;overflow-x: hidden;}  * html .ui-autocomplete {height: 100px;}</style>');
    // Important Links
    var WMEPH_FORUM_URL     = 'https://www.waze.com/forum/posting.php?mode=reply&f=819&t=164962',   // WMEPH Forum thread URL
        USA_PNH_MASTER_URL  = 'https://docs.google.com/spreadsheets/d/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/edit#gid=0',  // Master USA PNH link
        PLACES_WIKI_URL     = 'https://wiki.waze.com/wiki/Places',                                  // WME Places wiki
        RESTAREA_WIKI_URL   = 'https://wiki.waze.com/wiki/Rest_areas#Adding_a_Place';               // WME Places wiki
    // Cutover to new google sheets
    var USE_NEW_GOOGLE_SHEETS = true;
    var WME_SERVICE_MAP = { "psValet"       : { "action":"addValet",        "name":"VALLET_SERVICE"        },
                            "psDriveThru"   : { "action":"addDriveThru",    "name":"DRIVETHROUGH"          },
                            "psWiFi"        : { "action":"addWiFi",         "name":"WI_FI"                 },
                            "psRestrooms"   : { "action":"addRestrooms",    "name":"RESTROOMS"             },
                            "psCreditCards" : { "action":"addCreditCards",  "name":"CREDIT_CARDS"          },
                            "psReservations": { "action":"addReservations", "name":"RESERVATIONS"          },
                            "psOutside"     : { "action":"addOutside",      "name":"OUTSIDE_SEATING"       },
                            "psAirCond"     : { "action":"addAC",           "name":"AIR_CONDITIONING"      },
                            "psParking"     : { "action":"addParking",      "name":"PARKING_FOR_CUSTOMERS" },
                            "psDelivery"    : { "action":"addDeliveries",   "name":"DELIVERIES"            },
                            "psTakeAway"    : { "action":"addTakeAway",     "name":"TAKE_AWAY"             },
                            "psWheelchair"  : { "action":"addWheelchair",   "name":"WHEELCHAIR_ACCESSIBLE" } };
    var WME_SERVICES    = [ "VALLET_SERVICE","DRIVETHROUGH","WI_FI","RESTROOMS",
                            "CREDIT_CARDS","RESERVATIONS","OUTSIDE_SEATING",
                            "AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","DELIVERIES",
                            "TAKE_AWAY","WHEELCHAIR_ACCESSIBLE" ];
    var TOLL_FREE       = [ "800","822","833","844","855","866","877","888" ];


    //////////////////////////////////
    // Delayed-assignment Constants //
    //////////////////////////////////

    var NEW_SHEET_DATA,
    // User Lists
        WMEPH_DEV_LIST,
        WMEPH_BETA_LIST,
    // Category Name Checking
        NON_HOSPITAL_PART_MATCH,
        NON_HOSPITAL_FULL_MATCH,
        ANIMAL_PART_MATCH,
        ANIMAL_FULL_MATCH,
        SCHOOL_PART_MATCH,
        SCHOOL_FULL_MATCH,
    // Categories and Services
        NA_CAT_DATA,
        REGION_DATA = {};
    // User-specific values
    var IS_DEV_USER,
        IS_BETA_USER,
        USER_NAME,
        USER_RANK;
    var USER_LANG = 'en';  // This will probably become a delayed constant once we add support for other languages.
    // Duplicates
    var WMEPH_NAME_LAYER;


    ///////////////
    // Variables //
    ///////////////

    var dataReadyCounter = 0;
    var myState,
        myState2L,
        myCountry,
        myCountry2L,
        areaCodeList,
        gFormState = "";

    /////////////////////////////////////
    /////////////////////////////////////
    //// WMEPH Function declarations ////
    /////////////////////////////////////
    /////////////////////////////////////

    ///////////////////////////////
    // Generic utility functions //
    ///////////////////////////////

    // NOTE: My own debugging console.log function. (So I know to take these out later)
    function debug(m) {
        //if ('object' === typeof m) {
        //    m = JSON.stringify(m)
        //}
        console.log('[DEBUG]: ' + m);
    }

    // NOTE: This prevents circular references when invoking JSON.stringify.
    function censor(obj) {
        var cache = [];
        var value;
        value = doCensor(obj);
        cache = null; // Enable garbage collection
        return value;
    }

    function doCensor(obj) {
        var i = 0;
        return function(key, value) {
            if(i !== 0 && typeof(obj) === 'object' && typeof(value) == 'object' && obj == value) {
                return '[Circular]';
            }

            if(i >= 29) { // seems to be a harded maximum of 30 serialized objects?
                return '[Unknown]';
            }

            ++i; // so we know we aren't using the original object anymore

            return value;
        }
    }

    // NOTE: This allows me to dump large objects to a new window so it doesn't clog the console.
    function popUp(message) {
        var newWindow = window.open("","popUp","width=600,height=800,scrollbars=1,resizable=1");

        newWindow .document.open();
        newWindow .document.write("<pre>"+message+"</pre>");
        newWindow .document.close();
    }

    // Array prototype extensions (for Firefox fix)
    Array.prototype.toSet = function () {
        return this.reduce(function (e, t) {return e[t] = !0, e;}, {});
    };
    Array.prototype.first = function () {
        return this[0];
    };
    Array.prototype.isEmpty = function () {
        return 0 === this.length;
    };

    // Removes duplicate strings from string array
    function uniq(a) {
        //debug('- uniq(a) called -');
        var seen = {};
        return a.filter(function(item) {
            return seen.hasOwnProperty(item) ? false : (seen[item] = true);
        });
    }  // END uniq function

    // Logs important information to console for all users.
    function phlog(m) {
        console.log('WMEPH' + devVersStrDash + ': ' + m);
    }

    // Logs verbose information to console for developers.
    function phlogdev(msg, obj) {
        if (IS_DEV_USER) {
            console.log('WMEPH' + devVersStrDash + ': ' + msg, (obj ? obj : ''));
        }
    }


    //////////////////////////////
    // Value-checking Functions //
    //////////////////////////////

    function isPLA(venue) {
        return venue.attributes.categories && venue.attributes.categories[0] === 'PARKING_LOT';
    }

    function getPvaSeverity(pvaValue) {
        return (pvaValue ==='' || pvaValue === '0' || pvaValue === 'hosp') ? 3 : (pvaValue ==='2') ? 1 : (pvaValue ==='3') ? 2 : 0;
    }

    // Checks to see if State/Country "a" belongs to Region "b"
    // "a" = State or Country name as a string
    // "b" = Region code as a string or list object.
    /* Examples:  American Samoa -> AQ
                  American Samoa -> ATR
                  American Samoa -> USA */
    // Why you ask? Because states don't have abbreviations in W.
    function isMemberOfRegion(a, b) {
        // If "a" is not a string
        if (!(typeof(a) === "string" && a !== "")) {
            //debug('Trap 1');
            return false;
        }
        // If "a" and "b" are the same, easy money.
        if (a === b) {
            //debug('Condition 2');
            return true;
        }

        // If "b" is a string, make it an object.
        //debug('Changing "b" to an object.');
        var bObj;
        if (typeof(b) === "string") {
            if (b.match(/,/)) {
                bObj = b.split(/,/);
            } else {
                bObj = [ b ];
            }
        }

        // If "b" is not an object by now, then we got something bad.
        if (typeof(bObj) !== "object") {
            //debug('Trap 3');
            return false;
        }

        // If "a" is in the list of "b".
        if (a.indexOf(bObj) > -1) {
            //debug('Condition 4');
            return true;
        }

        //debug('Changing "a" to an object.');
            var aObj;
        if (REGION_DATA.states.hasOwnProperty(a)) {
            aObj = REGION_DATA.states[a];
        } else if (REGION_DATA.countries.hasOwnProperty(a)) {
            aObj = REGION_DATA.countries[a];
        } else {
            // "a" is not found in Region data; nothing more to do.
            //debug('Trap 5');
            return false;
        }

            // If the abbreviation is inside the list
        if ((aObj.psAbbrev).indexOf(bObj) > -1) {
            //debug('Condition 6 -- aObj.psAbbrev = '+aObj.psAbbrev+' // aObj.psRegion = '+aObj.psRegion+' // b = '+JSON.stringify(bObj));
            return true;
        }
        // If the region is inside the list
        if (aObj.psRegion.indexOf(bObj) > -1) {
            //debug('Condition 7 -- aObj.psAbbrev = '+aObj.psAbbrev+' // aObj.psRegion = '+aObj.psRegion+' // b = '+JSON.stringify(bObj));
                return true;
        }
        // If the region's region is inside the list
        if (REGION_DATA.regions.hasOwnProperty(aObj.psRegion) && (REGION_DATA.regions[aObj.psRegion].psRegion.indexOf(b) > -1)) {
            //debug('Condition 8 -- aObj.psAbbrev = '+aObj.psAbbrev+' // aObj.psRegion = '+aObj.psRegion+' // b = '+JSON.stringify(bObj));
            return true;
        }

        //debug('Fail-through 9 -- aObj.psAbbrev = '+aObj.psAbbrev+' // aObj.psRegion = '+aObj.psRegion+' // b = '+JSON.stringify(bObj));
        return false;
    }


    //////////////////////////////
    // Display/UI/CSS Functions //
    //////////////////////////////

    // Setup div for banner messages and color
    function displayBanners(sbm,sev) {
        debug('- displayBanners(sbm,sev) called -');
        debug('sbm = ' + JSON.stringify(sbm));
        if ($('#WMEPH_banner').length === 0 ) {
            $('<div id="WMEPH_banner">').prependTo(".contents");
            $('#WMEPH_banner').prepend('<ul>');
        } else {
            $('#WMEPH_banner').empty();
        }

        $('#WMEPH_banner').removeClass();
        $('#WMEPH_banner').addClass("banner-severity-" + sev);

        sbm = "<li>" + sbm + "</li>";
        $("#WMEPH_banner > ul").append(sbm);
        $('#select2-drop').hide();
    }

    // Setup div for banner messages and color
    function displayTools(sbm) {
        debug('- displayTools(sbm) called -');
        debug('sbm = ' + JSON.stringify(sbm));
        if ($("#WMEPH_tools").length === 0 ) {
            $('<div id="WMEPH_tools">').prependTo(".contents");
            $("#WMEPH_tools").prepend("<ul>");
        } else {
            $("#WMEPH_tools").empty();
        }
        //sbm = '<li><span style="position:relative;left:-10px;">' + sbm + '</span></li>';
        sbm = "<li>" + sbm + "</li>";
        $("#WMEPH_tools > ul").append(sbm);
        $('#select2-drop').hide();
    }

    /////////////////////////////
    // Database Load Functions //
    /////////////////////////////
    function loadExternalData() {
        if (USE_NEW_GOOGLE_SHEETS) {
            $.ajax({
                type: 'GET',
                url: 'https://raw.githubusercontent.com/WMEPH-Harmony/WMEPH-Test/master/WMEPH-Data.json',
                jsonp: 'callback',
                dataType: 'json',
                success: function(response) {
                    NEW_SHEET_DATA = response;
                    WMEPH_DEV_LIST          = NEW_SHEET_DATA["devList"],
                    WMEPH_BETA_LIST         = NEW_SHEET_DATA["betaList"],
                    NON_HOSPITAL_PART_MATCH = NEW_SHEET_DATA['hmchp'],
                    NON_HOSPITAL_FULL_MATCH = NEW_SHEET_DATA['hmchf'],
                    ANIMAL_PART_MATCH       = NEW_SHEET_DATA['hmcap'],
                    ANIMAL_FULL_MATCH       = NEW_SHEET_DATA['hmcaf'],
                    SCHOOL_PART_MATCH       = NEW_SHEET_DATA['schp'],
                    SCHOOL_FULL_MATCH       = NEW_SHEET_DATA['schf'],
                    NA_CAT_DATA             = NEW_SHEET_DATA['catList'];
                    REGION_DATA.states      = NEW_SHEET_DATA['states'];
                    REGION_DATA.countries   = NEW_SHEET_DATA['countries'];
                    REGION_DATA.regions     = NEW_SHEET_DATA['regions'];
                }
            });
        } else {
            // Pull name-category lists
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1pDmenZA-3FOTvhlCq9yz1dnemTmS9l_njZQbu_jLVMI/op17piq/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    NON_HOSPITAL_PART_MATCH = response.feed.entry[0].gsx$hmchp.$t;
                    NON_HOSPITAL_FULL_MATCH = response.feed.entry[0].gsx$hmchf.$t;
                    ANIMAL_PART_MATCH = response.feed.entry[0].gsx$hmcap.$t;
                    ANIMAL_FULL_MATCH = response.feed.entry[0].gsx$hmcaf.$t;
                    SCHOOL_PART_MATCH = response.feed.entry[0].gsx$schp.$t;
                    SCHOOL_FULL_MATCH = response.feed.entry[0].gsx$schf.$t;
                    NON_HOSPITAL_PART_MATCH = NON_HOSPITAL_PART_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    NON_HOSPITAL_FULL_MATCH = NON_HOSPITAL_FULL_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    ANIMAL_PART_MATCH = ANIMAL_PART_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    ANIMAL_FULL_MATCH = ANIMAL_FULL_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    SCHOOL_PART_MATCH = SCHOOL_PART_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    SCHOOL_FULL_MATCH = SCHOOL_FULL_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                }
            });

            // Pull dev and beta UserList Data
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1L82mM8Xg-MvKqK3WOfsMhFEGmVM46lA8BVcx8qwgmA8/ofblgob/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    var WMEPHuserList = response.feed.entry[0].gsx$phuserlist.$t;
                    WMEPHuserList = WMEPHuserList.split("|");
                    var betaix = WMEPHuserList.indexOf('BETAUSERS');
                    WMEPH_DEV_LIST = [];
                    WMEPH_BETA_LIST = [];
                    for (var ulix=1; ulix<betaix; ulix++) {
                        WMEPH_DEV_LIST.push(WMEPHuserList[ulix].toLowerCase());
                    }
                    for (ulix=betaix+1; ulix<WMEPHuserList.length; ulix++) {
                        WMEPH_BETA_LIST.push(WMEPHuserList[ulix].toLowerCase());
                    }
                }
            });

            // Pull Category Data
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/ov3dubz/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    // NOTE: Don't worry, this horrendous code will go away after cutover to new sheets.
                    NA_CAT_DATA = {};
                    var services = {};
                    for (var i = 3, len = response.feed.entry.length; i < len; i++) {
                        var arr = response.feed.entry[i].gsx$pcdata.$t.split("|");
                        var key                 = arr[0],
                            pcPoint             = arr[2],
                            pcArea              = arr[3],
                            pcRegPoint          = convertRegionsToBits(arr[4]),
                            pcRegArea           = convertRegionsToBits(arr[5]),
                            pcLock1             = convertRegionsToBits(arr[6]),
                            pcLock2             = convertRegionsToBits(arr[7]),
                            pcLock3             = convertRegionsToBits(arr[8]),
                            pcLock4             = convertRegionsToBits(arr[9]),
                            pcLock5             = convertRegionsToBits(arr[10]),
                            pcRare              = convertRegionsToBits(arr[11]),
                            pcParent            = convertRegionsToBits(arr[12]),
                            pcMessage           = arr[13],
                            psValet_temp        = arr[14],
                            psDriveThru_temp    = arr[15],
                            psWiFi_temp         = arr[16],
                            psRestrooms_temp    = arr[17],
                            psCreditCards_temp  = arr[18],
                            psReservations_temp = arr[19],
                            psOutside_temp      = arr[20],
                            psAirCond_temp      = arr[21],
                            psParking_temp      = arr[22],
                            psDelivery_temp     = arr[23],
                            psTakeAway_temp     = arr[24],
                            psWheelchair_temp   = arr[25];
                        var psValet                 = "",
                            psDriveThru             = "",
                            psWiFi                  = "",
                            psRestrooms             = "",
                            psCreditCards           = "",
                            psReservations          = "",
                            psOutside               = "",
                            psAirCond               = "",
                            psParking               = "",
                            psDelivery              = "",
                            psTakeAway              = "",
                            psWheelchair            = "";
                        if (psValet_temp.match(/\d/) || psValet_temp === "") {
                            psValet = psValet_temp;
                        } else {
                            psValet = convertRegionsToBits(psValet_temp);
                        }
                        if (psDriveThru_temp.match(/\d/) || psDriveThru_temp === "") {
                            psDriveThru = psDriveThru_temp;
                        } else {
                            psDriveThru = convertRegionsToBits(psDriveThru_temp);
                        }
                        if (psWiFi_temp.match(/\d/) || psWiFi_temp === "") {
                            psWiFi = psWiFi_temp;
                        } else {
                            psWiFi = convertRegionsToBits(psWiFi_temp);
                        }
                        if (psRestrooms_temp.match(/\d/) || psRestrooms_temp === "") {
                            psRestrooms = psRestrooms_temp;
                        } else {
                            psRestrooms = convertRegionsToBits(psRestrooms_temp);
                        }
                        if (psCreditCards_temp.match(/\d/) || psCreditCards_temp === "") {
                            psCreditCards = psCreditCards_temp;
                        } else {
                            psCreditCards = convertRegionsToBits(psCreditCards_temp);
                        }
                        if (psReservations_temp.match(/\d/) || psReservations_temp === "") {
                            psReservations = psReservations_temp;
                        } else {
                            psReservations = convertRegionsToBits(psReservations_temp);
                        }
                        if (psOutside_temp.match(/\d/) || psOutside_temp === "") {
                            psOutside = psOutside_temp;
                        } else {
                            psOutside = convertRegionsToBits(psOutside_temp);
                        }
                        if (psAirCond_temp.match(/\d/) || psAirCond_temp === "") {
                            psAirCond = psAirCond_temp;
                        } else {
                            psAirCond = convertRegionsToBits(psAirCond_temp);
                        }
                        if (psParking_temp.match(/\d/) || psParking_temp === "") {
                            psParking = psParking_temp;
                        } else {
                            psParking = convertRegionsToBits(psParking_temp);
                        }
                        if (psDelivery_temp.match(/\d/) || psDelivery_temp === "") {
                            psDelivery = psDelivery_temp;
                        } else {
                            psDelivery = convertRegionsToBits(psDelivery_temp);
                        }
                        if (psTakeAway_temp.match(/\d/) || psTakeAway_temp === "") {
                            psTakeAway = psTakeAway_temp;
                        } else {
                            psTakeAway = convertRegionsToBits(psTakeAway_temp);
                        }
                        if (psWheelchair_temp.match(/\d/) || psWheelchair_temp === "") {
                            psWheelchair = psWheelchair_temp;
                        } else {
                            psWheelchair = convertRegionsToBits(psWheelchair_temp);
                        }

                        services            = { "psValet"           :   psValet,
                                                "psDriveThru"       :   psDriveThru,
                                                "psWiFi"            :   psWiFi,
                                                "psRestrooms"       :   psRestrooms,
                                                "psCreditCards"     :   psCreditCards,
                                                "psReservations"    :   psReservations,
                                                "psOutside"         :   psOutside,
                                                "psAirCond"         :   psAirCond,
                                                "psParking"         :   psParking,
                                                "psDelivery"        :   psDelivery,
                                                "psTakeAway"        :   psTakeAway,
                                                "psWheelchair"      :   psWheelchair };
                        NA_CAT_DATA[key]    = { "pcPoint"           :   pcPoint,
                                                "pcArea"            :   pcArea,
                                                "pcRegPoint"        :   pcRegPoint,
                                                "pcRegArea"         :   pcRegArea,
                                                "pcLock1"           :   pcLock1,
                                                "pcLock2"           :   pcLock2,
                                                "pcLock3"           :   pcLock3,
                                                "pcLock4"           :   pcLock4,
                                                "pcLock5"           :   pcLock5,
                                                "pcRare"            :   pcRare,
                                                "pcParent"          :   pcParent,
                                                "pcMessage"         :   pcMessage,
                                                "services"          :   services };
                    }
                }
            });
        }

        // Pull USA PNH Data
        $.ajax({
            type: 'GET',
            url: 'https://spreadsheets.google.com/feeds/list/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/o6q7kx/public/values',
            jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
            success: function(response) {
                USA_PNH_DATA = [];
                for (var i = 0; i < response.feed.entry.length; i++) {
                    USA_PNH_DATA.push(response.feed.entry[i].gsx$pnhdata.$t);
                }
            }
        });
/*
        // Pull State-based Data (includes CAN for now)
        $.ajax({
            type: 'GET',
            url: 'https://spreadsheets.google.com/feeds/list/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/os2g2ln/public/values',
            jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
            success: function(response) {
                USA_STATE_DATA = {};
                for (var i = 1, len = response.feed.entry.length; i < len; i++) {
                    var arr = response.feed.entry[i].gsx$psdata.$t.split("|");
                    var key = arr[0];
                    USA_STATE_DATA[key] = { "psState2L"     : arr[1],
                                            "psRegion"      : arr[2],
                                            "psGoogleForm"  : arr[3],
                                            "psDefaultLock" : arr[4],
                                            "psRequirePhone": arr[5],
                                            "psRequireUrl"  : arr[6],
                                            "psAreaCode"    : (arr[7].replace(/[, ]+/g,",")).split(/,/),
                                            "psIsRegion"    : false };
                    //popUp(JSON.stringify(USA_STATE_DATA, null, 2));
                }
            }
        });
*/
        // Pull CAN PNH Data
        $.ajax({
            type: 'GET',
            url: 'https://spreadsheets.google.com/feeds/list/1TIxQZVLUbAJ8iH6LPTkJsvqFb_DstrHpKsJbv1W1FZs/o4ghhas/public/values',
            jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
            success: function(response) {
                CAN_PNH_DATA = [];
                for (var i = 0; i < response.feed.entry.length; i++) {
                    CAN_PNH_DATA.push(response.feed.entry[i].gsx$pnhdata.$t);
                }
            }
        });
    }


    /////////////////////////////////////
    // Bootstrap and Timeout Functions //
    /////////////////////////////////////

    // First function of script.  Checks to see if external data is loaded and ready
    // after the AJAX calls.  Continues to run until data is loaded or timeout is reached.
    function placeHarmonizer_bootstrap() {
        if ("undefined" !== typeof W.loginManager && "undefined" !== typeof W.map) {
            createDuplicatePlaceLayer();
            dataReadyCounter = 0;
            isDataReady();  //  Run the code to check for data return from the Sheets
        } else {
            if (dataReadyCounter % 20 === 0) {
                phlog("Waiting for WME map and login...");
            }
            if (dataReadyCounter<200) {
                dataReadyCounter++;
                setTimeout(placeHarmonizer_bootstrap, 100);
            } else {
                phlog("WME didn't load; please reload WME...");
            }
        }
    }

    // Checks to see if external data is loaded before proceeding with running the main script.
    // Calls isLoginReady() once data is confirmed to be loaded.
    function isDataReady() {
        // If the data has returned, then start the script, otherwise wait a bit longer
        if ("undefined" !== typeof CAN_PNH_DATA && "undefined" !== typeof USA_PNH_DATA  && "undefined" !== typeof NA_CAT_DATA &&
            "undefined" !== typeof WMEPH_DEV_LIST && "undefined" !== typeof WMEPH_BETA_LIST && "undefined" !== typeof NON_HOSPITAL_PART_MATCH ) {
            USA_PNH_NAMES = makeNameCheckList(USA_PNH_DATA);
            CAN_PNH_NAMES = makeNameCheckList(CAN_PNH_DATA);
            // CAN using USA_CH_NAMES at the moment
            isLoginReady();  //  start the main code
        } else {
            if (dataReadyCounter % 20 === 0) {
                var waitMessage = 'Waiting for ';
                if ("undefined" === typeof CAN_PNH_DATA) {
                    waitMessage = waitMessage + "CAN PNH Data; ";
                }
                if ("undefined" === typeof USA_PNH_DATA) {
                    waitMessage = waitMessage + "USA PNH Data; ";
                }
                if ("undefined" === typeof USA_STATE_DATA) {
                    waitMessage = waitMessage + "USA State Data; ";
                }
                if ("undefined" === typeof NA_CAT_DATA) {
                    waitMessage = waitMessage + "Cat-Name Data; ";
                }
                if ("undefined" === typeof WMEPH_DEV_LIST) {
                    waitMessage = waitMessage + "Dev User List Data; ";
                }
                if ("undefined" === typeof WMEPH_BETA_LIST) {
                    waitMessage = waitMessage + "Beta User List Data;";
                }
                phlog(waitMessage);
            }
            if (dataReadyCounter<200) {
                dataReadyCounter++;
                setTimeout(isDataReady, 100);
            } else {
                phlog("Data load took too long. Please reload WME.");
            }
        }
    }

    // Waits for WME Login to happen before running the main script.
    // Calls runPH() once WME Login is defined.
    function isLoginReady() {
        if ( W.loginManager.user !== null) {
            USER_NAME = W.loginManager.user.userName,
            USER_RANK = W.loginManager.user.normalizedLevel;
            //debug('REGION_DATA = ' + JSON.stringify(REGION_DATA));
            dataReadyCounter = 0;
            runPH();  //  start the main code
        } else {
            if (dataReadyCounter % 10 === 0) {
                phlog("Waiting for WME login...");
            }
            if (dataReadyCounter<50) {
                dataReadyCounter++;
                setTimeout(isLoginReady, 200);
            } else {
                phlog("WME Login failed. Please reload WME.");
            }
        }
    }

    ////////////////////
    // Task Functions //
    ////////////////////

    // Create __DuplicatePlaceNames layer
    function createDuplicatePlaceLayer() {
        var nameLayer;
        var rlayers = W.map.getLayersBy("uniqueName","__DuplicatePlaceNames");
        if(rlayers.length === 0) {
            var lname = "WMEPH Duplicate Names";
            var style = new OpenLayers.Style({  label : "${labelText}",
                                                labelOutlineColor: '#333',
                                                labelOutlineWidth: 3,
                                                labelAlign: '${labelAlign}',
                                                fontColor: "${fontColor}",
                                                fontOpacity: 1.0,
                                                fontSize: "20px",
                                                labelYOffset: -30,
                                                labelXOffset: 0,
                                                fontWeight: "bold",
                                                fill: false,
                                                strokeColor: "${strokeColor}",
                                                strokeWidth: 10,
                                                pointRadius: "${pointRadius}"
                                            });
            nameLayer = new OpenLayers.Layer.Vector(lname, {    displayInLayerSwitcher: false,
                                                                uniqueName: "__DuplicatePlaceNames",
                                                                styleMap: new OpenLayers.StyleMap(style)
                                                            });
            nameLayer.setVisibility(false);
            W.map.addLayer(nameLayer);
            WMEPH_NAME_LAYER = nameLayer;
        } else {
            WMEPH_NAME_LAYER = rlayers[0];
        }
    }

    // Destroy Dupe Labels
    function destroyDupeLabels(){
        WMEPH_NAME_LAYER.destroyFeatures();
        WMEPH_NAME_LAYER.setVisibility(false);
    }

    ////////////////////////
    // Unsorted Functions //
    ////////////////////////

    // This function runs at script load, and splits the category dataset into the searchable categories.
    // NOTE: This is only part of the code.  The rest gets run every time a place gets harmonized.  Not okay.
    // NOTE: Returns: ["pc_wmecat","","","CAR_SERVICES","GAS_STATION","PARKING_LOT","GARAGE_AUTOMOTIVE_SHOP","CAR_WASH","CHARGING_STATION","TRANSPORTATION","AIRPORT","BUS_STATION","FERRY_PIER","SEAPORT_MARINA_HARBOR","SUBWAY_STATION","TRAIN_STATION","BRIDGE","TUNNEL","TAXI_STATION","JUNCTION_INTERCHANGE","PROFESSIONAL_AND_PUBLIC","COLLEGE_UNIVERSITY","SCHOOL","CONVENTIONS_EVENT_CENTER","GOVERNMENT","LIBRARY","CITY_HALL","ORGANIZATION_OR_ASSOCIATION","PRISON_CORRECTIONAL_FACILITY","COURTHOUSE","CEMETERY","FIRE_DEPARTMENT","POLICE_STATION","MILITARY","HOSPITAL_MEDICAL_CARE","OFFICES","POST_OFFICE","RELIGIOUS_CENTER","KINDERGARDEN","FACTORY_INDUSTRIAL","EMBASSY_CONSULATE","INFORMATION_POINT","SHOPPING_AND_SERVICES","ARTS_AND_CRAFTS","BANK_FINANCIAL","SPORTING_GOODS","BOOKSTORE","PHOTOGRAPHY","CAR_DEALERSHIP","FASHION_AND_CLOTHING","CONVENIENCE_STORE","PERSONAL_CARE","DEPARTMENT_STORE","PHARMACY","ELECTRONICS","FLOWERS","FURNITURE_HOME_STORE","GIFTS","GYM_FITNESS","SWIMMING_POOL","HARDWARE_STORE","MARKET","SUPERMARKET_GROCERY","JEWELRY","LAUNDRY_DRY_CLEAN","SHOPPING_CENTER","MUSIC_STORE","PET_STORE_VETERINARIAN_SERVICES","TOY_STORE","TRAVEL_AGENCY","ATM","CURRENCY_EXCHANGE","CAR_RENTAL","FOOD_AND_DRINK","RESTAURANT","BAKERY","DESSERT","CAFE","FAST_FOOD","FOOD_COURT","BAR","ICE_CREAM","CULTURE_AND_ENTERTAINEMENT","ART_GALLERY","CASINO","CLUB","TOURIST_ATTRACTION_HISTORIC_SITE","MOVIE_THEATER","MUSEUM","MUSIC_VENUE","PERFORMING_ARTS_VENUE","GAME_CLUB","STADIUM_ARENA","THEME_PARK","ZOO_AQUARIUM","RACING_TRACK","THEATER","OTHER","RESIDENCE_HOME","CONSTRUCTION_SITE","LODGING","HOTEL","HOSTEL","CAMPING_TRAILER_PARK","COTTAGE_CABIN","BED_AND_BREAKFAST","OUTDOORS","PARK","PLAYGROUND","BEACH","SPORTS_COURT","GOLF_COURSE","PLAZA","PROMENADE","POOL","SCENIC_LOOKOUT_VIEWPOINT","SKI_AREA","NATURAL_FEATURES","ISLAND","SEA_LAKE_POOL","RIVER_STREAM","FOREST_GROVE","FARM","CANAL","SWAMP_MARSH","DAM","EMERGENCY_SHELTER"]
    //function makeCatCheckList(CH_DATA) {
        // Moved inside AJAX call

    // This function runs at script load, and builds the search name dataset to compare the WME selected place name to.
    // NOTE: Some of this code runs once for every single entry on the spreadsheet.  We need to make this more efficient.
    function makeNameCheckList(PNH_DATA) {
        //debug('- makeNameCheckList(PNH_DATA) called -');  // Builds the list of search names to match to the WME place name
        var PNH_NAMES = [];
        var PNH_DATA_headers = PNH_DATA[0].split("|");  // split the data headers out
        var ph_name_ix = PNH_DATA_headers.indexOf("ph_name");  // find the indices needed for the function
        var ph_aliases_ix = PNH_DATA_headers.indexOf("ph_aliases");
        var ph_category1_ix = PNH_DATA_headers.indexOf("ph_category1");
        var ph_searchnamebase_ix = PNH_DATA_headers.indexOf("ph_searchnamebase");
        var ph_searchnamemid_ix = PNH_DATA_headers.indexOf("ph_searchnamemid");
        var ph_searchnameend_ix = PNH_DATA_headers.indexOf("ph_searchnameend");
        var ph_disable_ix = PNH_DATA_headers.indexOf("ph_disable");
        var ph_speccase_ix = PNH_DATA_headers.indexOf("ph_speccase");

        var t0 = performance.now(); // Speed check start
        var newNameListLength;  // static list length

        for (var pnhix=0; pnhix<PNH_DATA.length; pnhix++) {  // loop through all PNH places
            var pnhEntryTemp = PNH_DATA[pnhix].split("|");  // split the current PNH data line
            if (pnhEntryTemp[ph_disable_ix] !== "1" || pnhEntryTemp[ph_speccase_ix].indexOf('betaEnable') > -1 ) {
                var newNameList = pnhEntryTemp[ph_name_ix].toUpperCase();  // pull out the primary PNH name & upper case it
                newNameList = newNameList.replace(/ AND /g, '');  // Clear the word "AND" from the name
                newNameList = newNameList.replace(/^THE /g, '');  // Clear the word "THE" from the start of the name
                newNameList = [newNameList.replace(/[^A-Z0-9]/g, '')];  // Clear non-letter and non-number characters, store in array

                if (pnhEntryTemp[ph_disable_ix] !== "altName") {
                    // Add any aliases
                    var tempAliases = pnhEntryTemp[ph_aliases_ix].toUpperCase();
                    if ( tempAliases !== '' && tempAliases !== '0' && tempAliases !== '') {
                        tempAliases = tempAliases.replace(/,[^A-za-z0-9]*/g, ",").split(",");  // tighten and split aliases
                        for (var alix=0; alix<tempAliases.length; alix++) {
                            newNameList.push( tempAliases[alix].replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '') );
                        }
                    }
                }

                // The following code sets up alternate search names as outlined in the PNH dataset.
                // Formula, with P = PNH primary; A1, A2 = PNH aliases; B1, B2 = base terms; M1, M2 = mid terms; E1, E2 = end terms
                // Search list will build: P, A, B, PM, AM, BM, PE, AE, BE, PME, AME, BME.
                // Multiple M terms are applied singly and in pairs (B1M2M1E2).  Multiple B and E terms are applied singly (e.g B1B2M1 not used).
                // Any doubles like B1E2=P are purged at the end to eliminate redundancy.
                if (pnhEntryTemp[ph_searchnamebase_ix] !== "0" || pnhEntryTemp[ph_searchnamebase_ix] !== "") {   // If base terms exist, otherwise only the primary name is matched
                    var pnhSearchNameBase = pnhEntryTemp[ph_searchnamebase_ix].replace(/[^A-Za-z0-9,]/g, '');  // clear non-letter and non-number characters (keep commas)
                    pnhSearchNameBase = pnhSearchNameBase.toUpperCase().split(",");  // upper case and split the base-name  list
                    newNameList.push.apply(newNameList,pnhSearchNameBase);   // add them to the search base list

                    if (pnhEntryTemp[ph_searchnamemid_ix] !== "0" || pnhEntryTemp[ph_searchnamemid_ix] !== "") {  // if middle search term add-ons exist
                        var pnhSearchNameMid = pnhEntryTemp[ph_searchnamemid_ix].replace(/[^A-Za-z0-9,]/g, '');  // clear non-letter and non-number characters
                        pnhSearchNameMid = pnhSearchNameMid.toUpperCase().split(",");  // upper case and split
                        if (pnhSearchNameMid.length > 1) {  // if there are more than one mid terms, it adds a permutation of the first 2
                            pnhSearchNameMid.push.apply( pnhSearchNameMid,[ pnhSearchNameMid[0]+pnhSearchNameMid[1],pnhSearchNameMid[1]+pnhSearchNameMid[0] ] );
                        }
                        newNameListLength = newNameList.length;
                        for (var extix=1; extix<newNameListLength; extix++) {  // extend the list by adding Mid terms onto the SearchNameBase names
                            for (var altix=0; altix<pnhSearchNameMid.length; altix++) {
                                newNameList.push(newNameList[extix]+pnhSearchNameMid[altix] );
                            }
                        }
                    }

                    if (pnhEntryTemp[ph_searchnameend_ix] !== "0" || pnhEntryTemp[ph_searchnameend_ix] !== "") {  // if end search term add-ons exist
                        var pnhSearchNameEnd = pnhEntryTemp[ph_searchnameend_ix].replace(/[^A-Za-z0-9,]/g, '');  // clear non-letter and non-number characters
                        pnhSearchNameEnd = pnhSearchNameEnd.toUpperCase().split(",");  // upper case and split
                        newNameListLength = newNameList.length;
                        for (var exetix=1; exetix<newNameListLength; exetix++) {  // extend the list by adding End terms onto all the SearchNameBase & Base+Mid names
                            for (var aletix=0; aletix<pnhSearchNameEnd.length; aletix++) {
                                newNameList.push(newNameList[exetix]+pnhSearchNameEnd[aletix] );
                            }
                        }
                    }
                }
                // Clear out any empty entries
                var newNameListTemp = [];
                for ( catix=0; catix<newNameList.length; catix++) {  // extend the list by adding Hotel to all items
                    if (newNameList[catix].length > 1) {
                        newNameListTemp.push(newNameList[catix]);
                    }
                }
                newNameList = newNameListTemp;
                // Next, add extensions to the search names based on the WME place category
                newNameListLength = newNameList.length;
                var catix;
                if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "HOTEL") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Hotel to all items
                        newNameList.push(newNameList[catix]+"HOTEL");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "BANKFINANCIAL") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Bank and ATM to all items
                        newNameList.push(newNameList[catix]+"BANK");
                        newNameList.push(newNameList[catix]+"ATM");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "SUPERMARKETGROCERY") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Supermarket to all items
                        newNameList.push(newNameList[catix]+"SUPERMARKET");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "GYMFITNESS") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Gym to all items
                        newNameList.push(newNameList[catix]+"GYM");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "GASSTATION") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Gas terms to all items
                        newNameList.push(newNameList[catix]+"GAS");
                        newNameList.push(newNameList[catix]+"GASOLINE");
                        newNameList.push(newNameList[catix]+"FUEL");
                        newNameList.push(newNameList[catix]+"STATION");
                        newNameList.push(newNameList[catix]+"GASSTATION");
                    }
                } else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "CARRENTAL") {
                    for ( catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Car Rental terms to all items
                        newNameList.push(newNameList[catix]+"RENTAL");
                        newNameList.push(newNameList[catix]+"RENTACAR");
                        newNameList.push(newNameList[catix]+"CARRENTAL");
                        newNameList.push(newNameList[catix]+"RENTALCAR");
                    }
                }
                //debug('566 // About to call uniq() once inside of makeNameCheckList()');
                newNameList = uniq(newNameList);  // remove any duplicate search names
                newNameList = newNameList.join("|");  // join the list with |
                newNameList = newNameList.replace(/\|{2,}/g, '|');
                newNameList = newNameList.replace(/\|+$/g, '');
                PNH_NAMES.push(newNameList);  // push the list to the master search list
            } else { // END if valid line
                PNH_NAMES.push('00');
            }
        }
        var t1 = performance.now();  // log search time
        phlog("Built search list of " + PNH_DATA.length + " PNH places in " + (t1 - t0) + " milliseconds.");
        return PNH_NAMES;
    }  // END makeNameCheckList



    //////////////////////////////
    //////////////////////////////
    //// Begin old WMEPH code ////
    //////////////////////////////
    //////////////////////////////
    var USA_PNH_DATA, USA_PNH_NAMES = [];  // Storage for PNH and Category data
    var CAN_PNH_DATA, CAN_PNH_NAMES = [];  // var CAN_CH_DATA, CAN_CH_NAMES = [] not used for now
    var devVersStr='', devVersStrSpace='', devVersStrDash='';  // strings to differentiate DOM elements between regular and beta script
    var devVersStringMaster = "Beta";
    var betaDataDelay = 10;
    if (IS_DEV_VERSION) {
        devVersStr = devVersStringMaster; devVersStrSpace = " " + devVersStr; devVersStrDash = "-" + devVersStr;
        betaDataDelay = 20;
    }
    var collegeAbbreviations = 'USF|USFSP|UF|UCF|UA|UGA|FSU|UM|SCP|FAU|FIU';
    var defaultKBShortcut,shortcutParse, modifKey = 'Alt+';
    var forumMsgInputs;
    var venueWhitelist, venueWhitelistStr, WLSToMerge, wlKeyName, wlButtText = 'WL';  // Whitelisting vars
    var WLlocalStoreName = 'WMEPH-venueWhitelistNew';
    var WLlocalStoreNameCompressed = 'WMEPH-venueWhitelistCompressed';
    var dupeIDList = [], dupeHNRangeList, dupeHNRangeIDList, dupeHNRangeDistList;
    // Web search Window forming:
    var searchResultsWindowSpecs = '"resizable=yes, top='+ Math.round(window.screen.height*0.1) +', left='+ Math.round(window.screen.width*0.3) +', width='+ Math.round(window.screen.width*0.7) +', height='+ Math.round(window.screen.height*0.8) +'"';
    var searchResultsWindowName = '"WMEPH Search Results"';
    var WMEPHmousePosition;
    var cloneMaster = null;
    var bannButt, bannButt2, bannServ, bannDupl, bannButtHL;  // Banner Buttons objects
    var RPPLockString = 'Lock?';
    var panelFields = {};  // the fields for the sidebar


    /* ****** Pull PNH and Userlist data ****** */
    loadExternalData();


    // This function will need to be split up because it is way too big.
    function runPH() {
        //debug('- runPH() called -');
        var newSep = '\n - ', listSep = '<li>';  // joiners for script and html messages
        var WMEPHWhatsNew = WHATS_NEW_LIST.join(newSep);
        var WMEPHWhatsNewMeta = WHATS_NEW_META_LIST.join(newSep);
        var WMEPHWhatsNewHList = WHATS_NEW_LIST.join(listSep);
        var WMEPHWhatsNewMetaHList = WHATS_NEW_META_LIST.join(listSep);
        WMEPHWhatsNew = 'WMEPH v. ' + WMEPH_VERSION_LONG + '\nUpdates:' + newSep + WMEPHWhatsNew;
        WMEPHWhatsNewMeta = 'WMEPH v. ' + WMEPH_VERSION_MAJOR + '\nMajor features:' + newSep + WMEPHWhatsNewMeta;
        if ( localStorage.getItem('WMEPH-featuresExamined'+devVersStr) === null ) {
            localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '0');  // Storage for whether the User has pressed the button to look at updates
        }
        var UpdateObject = require("Waze/Action/UpdateObject");
        var _disableHighlightTest = false;  // Set to true to temporarily disable highlight checks immediately when venues change.

        modifyGoogleLinks();

        // Whitelist initialization
        if ( validateWLS( LZString.decompressFromUTF16(localStorage.getItem(WLlocalStoreNameCompressed)) ) === false ) {  // If no compressed WL string exists
            if ( validateWLS(localStorage.getItem(WLlocalStoreName)) === false ) {  // If no regular WL exists
                venueWhitelist = { '1.1.1': { Placeholder: {  } } }; // Populate with a dummy place
                saveWL_LS(false);
                saveWL_LS(true);
            } else {  // if regular WL string exists, then transfer to compressed version
                localStorage.setItem('WMEPH-OneTimeWLBU', localStorage.getItem(WLlocalStoreName));
                loadWL_LS(false);
                saveWL_LS(true);
                alert('Whitelists are being converted to a compressed format.  If you have trouble with your WL, please submit an error report.');
            }
        } else {
            loadWL_LS(true);
        }

        if (USER_NAME === 'ggrane') {
            searchResultsWindowSpecs = '"resizable=yes, top='+ Math.round(window.screen.height*0.1) +', left='+ Math.round(window.screen.width*0.3) +', width='+ Math.round(window.screen.width*0.86) +', height='+ Math.round(window.screen.height*0.8) +'"';
        }

        // Initialize the WL Object
        var currentWL = {};

        // If the editor installs for the 1st time, alert with the new elements
        if ( localStorage.getItem('WMEPH_VERSION_MAJOR'+devVersStr) === null ) {
            alert(WMEPHWhatsNewMeta);
            localStorage.setItem('WMEPH_VERSION_MAJOR'+devVersStr, WMEPH_VERSION_MAJOR);
            localStorage.setItem('WMEPH_VERSION_LONG'+devVersStr, WMEPH_VERSION_LONG);
            localStorage.setItem(GLinkWarning, '0');  // Reset warnings
            localStorage.setItem(SFURLWarning, '0');
            localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');  // disable the button
        } else if (localStorage.getItem('WMEPH_VERSION_MAJOR'+devVersStr) !== WMEPH_VERSION_MAJOR) { // If the editor installs a newer MAJOR version, alert with the new elements
            alert(WMEPHWhatsNewMeta);
            localStorage.setItem('WMEPH_VERSION_MAJOR'+devVersStr, WMEPH_VERSION_MAJOR);
            localStorage.setItem('WMEPH_VERSION_LONG'+devVersStr, WMEPH_VERSION_LONG);
            localStorage.setItem(GLinkWarning, '0');  // Reset warnings
            localStorage.setItem(SFURLWarning, '0');
            localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');  // disable the button
        } else if (localStorage.getItem('WMEPH_VERSION_LONG'+devVersStr) !== WMEPH_VERSION_LONG) {  // If MINOR version....
            if (NEW_MAJOR_FEATURE) {  //  with major feature update, then alert
                alert(WMEPHWhatsNew);
                localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');  // disable the button
            } else {  //  if not major feature update, then keep the button
                localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '0');
            }
            localStorage.setItem('WMEPH_VERSION_LONG'+devVersStr, WMEPH_VERSION_LONG);  // store last installed version in localstorage
        }
        if (localStorage.getItem('WMEPH-plaNameWLWarning'+devVersStr) === null) {
            localStorage.setItem('WMEPH-plaNameWLWarning'+devVersStr, '1');
            alert('WME Place Harmonizer\n\nParking Lot Areas (PLA) now have the ability to be Whitelisted if they are unnamed. Please consult the wiki for when it is ok to have a PLA with no name.');
        }
        // Settings setup
        var GLinkWarning = 'GLinkWarning';  // Warning message for first time using Google search to not to use the Google info itself.
        if (!localStorage.getItem(GLinkWarning)) {  // store settings so the warning is only given once
            localStorage.setItem(GLinkWarning, '0');
        }
        var SFURLWarning = 'SFURLWarning';  // Warning message for first time using localized storefinder URL.
        if (!localStorage.getItem(SFURLWarning)) {  // store settings so the warning is only given once
            localStorage.setItem(SFURLWarning, '0');
        }

        setTimeout(add_PlaceHarmonizationSettingsTab, 50);  // initialize the settings tab

        // Event listeners
        W.selectionManager.events.registerPriority("selectionchanged", this, checkSelection);
        W.model.venues.on('objectschanged', deleteDupeLabel);
        W.accelerators.events.registerPriority('save', null, destroyDupeLabels);
        W.model.venues.on('objectssynced', syncWL);

        // Remove any temporary ID values (ID < 0) from the WL store at startup.
        var removedWLCount = 0;
        Object.keys(venueWhitelist).forEach(function(venueID) {
            if (venueID < 0) {
                delete venueWhitelist[venueID];
                removedWLCount += 1;
            }
        });
        if (removedWLCount > 0) {
            saveWL_LS(true);
            phlogdev('Removed ' + removedWLCount + ' venues with temporary ID\'s from WL store');
        }

        // This should be called after new venues are saved (using venues'objectssynced' event), so the new IDs can be retrieved and used
        // to replace the temporary IDs in the whitelist.  If WME errors during save, this function may not run.  At that point, the
        // temporary IDs can no longer be traced to the new IDs so the WL for those new venues will be orphaned, and the temporary IDs
        // will be removed from the WL store the next time the script starts.
        function syncWL(newVenues) {
            newVenues.forEach(function(newVenue) {
                var oldID = newVenue._prevID;
                var newID = newVenue.attributes.id;
                if (oldID && newID && venueWhitelist[oldID]) {
                    venueWhitelist[newID] = venueWhitelist[oldID];
                    delete venueWhitelist[oldID];
                }
            });
            saveWL_LS(true);
        }


        if (WMEPH_BETA_LIST.length === 0 || "undefined" === typeof WMEPH_BETA_LIST) {
            if (IS_DEV_VERSION) {
                alert('Beta user list access issue.  Please post in the GHO or PM/DM t0cableguy about this message.  Script should still work.');
            }
            IS_BETA_USER = false;
            IS_DEV_USER = false;
        } else {
            IS_DEV_USER = (WMEPH_DEV_LIST.indexOf(USER_NAME.toLowerCase()) > -1);
            IS_BETA_USER = (WMEPH_BETA_LIST.indexOf(USER_NAME.toLowerCase()) > -1);
        }
        if (IS_DEV_USER) {
            IS_BETA_USER = true; // dev users are beta users
        }

        // lock levels are offset by one
        var lockLevel1 = 0, lockLevel2 = 1, lockLevel3 = 2, lockLevel4 = 3, lockLevel5 = 4;
        var defaultLock = lockLevel2, PNHLockLevel;
        var PMUserList = { // user names and IDs for PM functions
            SER: {approvalActive: true, modID: '16941753', modName: 't0cableguy'},
            WMEPH: {approvalActive: true, modID: '16941753', modName: 't0cableguy'}
        };
        var severityButt=0;  // error tracking to determine banner color (action buttons)
        var duplicateName = '';
        var catTransWaze2Lang = I18n.translations[USER_LANG].venues.categories;  // pulls the category translations
        var item, itemID, newName, optionalAlias, newURL, tempPNHURL = '', newPhone;
        var newAliases = [], newAliasesTemp = [], newCategories = [];
        var numAttempts = 0;

        // Split out state-based data (USA_STATE_DATA)
        /* Already done
        var USA_STATE_HEADERS = USA_STATE_DATA[0].split("|");
        var ps_state_ix = USA_STATE_HEADERS.indexOf('ps_state');
        var ps_state2L_ix = USA_STATE_HEADERS.indexOf('ps_state2L');
        var ps_region_ix = USA_STATE_HEADERS.indexOf('ps_region');
        var ps_gFormState_ix = USA_STATE_HEADERS.indexOf('ps_gFormState');
        var ps_defaultLockLevel_ix = USA_STATE_HEADERS.indexOf('ps_defaultLockLevel');
        //var ps_requirePhone_ix = USA_STATE_HEADERS.indexOf('ps_requirePhone');
        //var ps_requireURL_ix = USA_STATE_HEADERS.indexOf('ps_requireURL');
        var ps_areacode_ix = USA_STATE_HEADERS.indexOf('ps_areacode');
        var stateDataTemp, areaCodeList = '800,822,833,844,855,866,877,888';  //  include toll free non-geographic area codes
        */
        var ixBank, ixATM, ixOffices;

        // Set up Run WMEPH button once place is selected
        bootstrapRunButton();

        /**
         * Generates highlighting rules and applies them to the map.
         */
        var layer = W.map.landmarkLayer;
        function initializeHighlights() {
            //debug('-- initializeHighlights() called --');
            var ruleGenerator = function(value, symbolizer) {
                return new W.Rule({
                    filter: new OL.Filter.Comparison({
                        type: '==',
                        value: value,
                        evaluate: function(venue) {
                            return venue && venue.model && venue.model.attributes.wmephSeverity === this.value;
                        }
                    }),
                    symbolizer: symbolizer
                });
            };

            var severity0 = ruleGenerator(0, {
                'pointRadius': '5',
                'strokeWidth': '4',
                'strokeColor': '#24ff14'
            });

            var severityLock = ruleGenerator('lock', {
                'pointRadius': '5',
                'strokeColor': '#24ff14',
                'strokeLinecap': '1',
                'strokeDashstyle': '7 2',
                'strokeWidth': '5'
            });

            var severity1 = ruleGenerator(1, {
                'strokeColor': '#0055ff',
                'strokeWidth': '4',
                'pointRadius': '7'
            });

            var severityLock1 = ruleGenerator('lock1', {
                'pointRadius': '5',
                'strokeColor': '#0055ff',
                'strokeLinecap': '1',
                'strokeDashstyle': '7 2',
                'strokeWidth': '5'
            });

            var severity2 = ruleGenerator(2, {
                'strokeColor': '#ff0',
                'strokeWidth': '6',
                'pointRadius': '8'
            });

            var severity3 = ruleGenerator(3, {
                'strokeColor': '#ff0000',
                'strokeWidth': '4',
                'pointRadius': '8'
            });

            var severity4 = ruleGenerator(4, {
                'fillColor': 'black',
                'fillOpacity': '0.35',
                'strokeColor': '#f42',
                'strokeLinecap': '1',
                'strokeWidth': '13',
                'strokeDashstyle': '4 2'
            });

            var severityHigh = ruleGenerator(5, {
                'pointRadius': '12',
                'fillColor': 'black',
                'fillOpacity': '0.4',
                'strokeColor': '#f4a',
                'strokeLinecap': '1',
                'strokeWidth': '10',
                'strokeDashstyle': '4 2'
            });

            var severityAdLock = ruleGenerator('adLock', {
                'pointRadius': '12',
                'fillColor': 'yellow',
                'fillOpacity': '0.4',
                'strokeColor': '#000',
                'strokeLinecap': '1',
                'strokeWidth': '10',
                'strokeDashstyle': '4 2'
            });

            Array.prototype.push.apply(layer.styleMap.styles['default'].rules, [severity0, severityLock, severity1, severityLock1, severity2, severity3, severity4, severityHigh, severityAdLock]);
            // to make Google Script linter happy ^^^ Array.prototype.push.apply(layer.styleMap.styles.default.rules, [severity0, severityLock, severity1, severity2, severity3, severity4, severityHigh]);
            /* Can apply to normal view or selection/highlight views as well.
            _.each(layer.styleMap.styles, function(style) {
                style.rules = style.rules.concat([severity0, severityLock, severity1, severity2, severity3, severity4, severityHigh]);
            });
            */
        }

        /**
         * To highlight a place, set the wmephSeverity attribute to the desired highlight level.
         * @param venues {array of venues, or single venue} Venues to check for highlights.
         */
        function applyHighlightsTest(venues) {
            //debug('-- applyHighlightsTest(venues) called --');
            venues = venues ? _.isArray(venues) ? venues : [venues] : [];
            var storedBannButt = bannButt, storedBannServ = bannServ, storedBannButt2 = bannButt2;
            var t0 = performance.now();  // Speed check start

            _.each(venues, function (venue) {
                if (venue.CLASS_NAME === 'Waze.Feature.Vector.Landmark' &&
                    venue.attributes) {
                    // Highlighting logic would go here
                    // Severity can be: 0, 'lock', 1, 2, 3, 4, or 'high'. Set to
                    // anything else to use default WME style.
                    if ( $("#WMEPH-ColorHighlighting" + devVersStr).prop('checked') && !($("#WMEPH-DisableRankHL" + devVersStr).prop('checked') && venue.attributes.lockRank > (USER_RANK - 1))) {
                        try {
                            venue.attributes.wmephSeverity = harmonizePlaceGo(venue,'highlight');
                        } catch (err) {
                            phlogdev("highlight error: ",err);
                        }
                    } else {
                        venue.attributes.wmephSeverity = 'default';
                    }

                }
            });
            if (W.selectionManager.selectedItems.length === 1) {
                var venue = W.selectionManager.selectedItems[0].model;
                if (venue.type === "venue") {
                    venue.attributes.wmephSeverity = harmonizePlaceGo(venue,'highlight');
                    bannButt = storedBannButt;
                    bannServ = storedBannServ;
                    bannButt2 = storedBannButt2;
                }
            }
            layer.redraw();
            var t1 = performance.now();  // log search time
            phlogdev("Ran highlighter in " + (t1 - t0) + " milliseconds.");

        }

        // Setup highlight colors
        initializeHighlights();

        // Set up CH loop
        function bootstrapWMEPH_CH() {
            //debug('-- bootstrapWMEPH_CH() called --');
            if ( $("#WMEPH-ColorHighlighting" + devVersStr).prop('checked') ) {
                // Turn off place highlighting in WMECH if it's on.
                if ( $("#_cbHighlightPlaces").prop('checked') ) {
                    $("#_cbHighlightPlaces").trigger('click');
                }
                // Add listeners
                W.model.venues.on('objectschanged', function (e) {
                    if (!_disableHighlightTest) {
                        applyHighlightsTest(e);
                    }
                });

                W.model.venues.on('objectsadded', function (e) {
                    applyHighlightsTest(e);
                });

                // Apply the colors
                applyHighlightsTest(W.model.venues.getObjectArray());

                //setTimeout(bootstrapWMEPH_CH,500);  // Refresh the Highlights periodically
            } else {
                // reset the colors to default
                applyHighlightsTest(W.model.venues.getObjectArray());
                //updateWMEPH_CH(false);
            }
        }

        // used for phone reformatting
        if (!String.plFormat) {
            String.plFormat = function(format) {
                var args = Array.prototype.slice.call(arguments, 1);
                return format.replace(/{(\d+)}/g, function(name, number) {
                    return typeof args[number] !== "undefined" ? args[number] : null;
                });
            };
        }

        // Change place.name to title case
        var ignoreWords = "an|and|as|at|by|for|from|hhgregg|in|into|of|on|or|the|to|with".split('|');
        var capWords = "3M|AAA|AMC|AOL|AT&T|ATM|BBC|BLT|BMV|BMW|BP|CBS|CCS|CGI|CISCO|CJ|CNN|CVS|DHL|DKNY|DMV|DSW|EMS|ER|ESPN|FCU|FCUK|FDNY|GNC|H&M|HP|HSBC|IBM|IHOP|IKEA|IRS|JBL|JCPenney|KFC|LLC|MBNA|MCA|MCI|NBC|NYPD|PDQ|PNC|TCBY|TNT|TV|UPS|USA|USPS|VW|XYZ|ZZZ".split('|');
        var specWords = "d'Bronx|iFix".split('|');

        function toTitleCase(str) {
            //debug('-- toTitleCase(str) called --');
            if (!str) {
                return str;
            }
            var allCaps = (str === str.toUpperCase());
            // Cap first letter of each word
            str = str.replace(/([A-Za-z\u00C0-\u017F][^\s-\/]*) */g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.substr(1);
            });
            // Cap O'Reilley's, L'Amour, D'Artagnan as long as 5+ letters
            str = str.replace(/\b[oOlLdD]'[A-Za-z']{3,}/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1) + txt.charAt(2).toUpperCase() + txt.substr(3);
            });
            // Cap McFarley's, as long as 5+ letters long
            str = str.replace(/\b[mM][cC][A-Za-z']{3,}/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase() + txt.charAt(2).toUpperCase() + txt.substr(3);
            });
            // anything with an "&" sign, cap the character after &
            str = str.replace(/&.+/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0) + txt.charAt(1).toUpperCase() + txt.substr(2);
            });
            // lowercase any from the ignoreWords list
            str = str.replace(/[^ ]+/g, function(txt) {
                var txtLC = txt.toLowerCase();
                return (ignoreWords.indexOf(txtLC) > -1) ? txtLC : txt;
            });
            // uppercase any from the capWords List
            str = str.replace(/[^ ]+/g, function(txt) {
                var txtUC = txt.toUpperCase();
                return (capWords.indexOf(txtUC) > -1) ? txtUC : txt;
            });
            // preserve any specific words
            str = str.replace(/[^ ]+/g, function(txt) {
                //var txtAC = txt.toUpperCase();
                for (var swix=0; swix<specWords.length; swix++) {
                    if ( txt.toUpperCase() === specWords[swix].toUpperCase() ) {
                        return specWords[swix];
                    }
                }
                return txt;
            });
            // Fix 1st, 2nd, 3rd, 4th, etc. to lowercase
            str = str.replace(/\b(\d*1)st\b/gi, '$1st');
            str = str.replace(/\b(\d*2)nd\b/gi, '$1nd');
            str = str.replace(/\b(\d*3)rd\b/gi, '$1rd');
            str = str.replace(/\b(\d+)th\b/gi, '$1th');
            // Cap first letter of entire name
            str = str.charAt(0).toUpperCase() + str.substr(1);
            return str;
        }

        // Change place.name to title case
        function toTitleCaseStrong(str) {
            //debug('-- toTitleCaseStrong(str) called --');
            if (!str) {
                return str;
            }
            var allCaps = (str === str.toUpperCase());
            // Cap first letter of each word
            str = str.replace(/([A-Za-z\u00C0-\u017F][^\s-\/]*) */g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
            // Cap O'Reilley's, L'Amour, D'Artagnan as long as 5+ letters
            str = str.replace(/\b[oOlLdD]'[A-Za-z']{3,}/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1) + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase();
            });
            // Cap McFarley's, as long as 5+ letters long
            str = str.replace(/\b[mM][cC][A-Za-z']{3,}/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase() + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase();
            });
            // anything sith an "&" sign, cap the word after &
            str = str.replace(/&\w+/g, function(txt) {
                return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0) + txt.charAt(1).toUpperCase() + txt.substr(2);
            });
            // lowercase any from the ignoreWords list
            str = str.replace(/[^ ]+/g, function(txt) {
                var txtLC = txt.toLowerCase();
                return (ignoreWords.indexOf(txtLC) > -1) ? txtLC : txt;
            });
            // uppercase any from the capWords List
            str = str.replace(/[^ ]+/g, function(txt) {
                var txtLC = txt.toUpperCase();
                return (capWords.indexOf(txtLC) > -1) ? txtLC : txt;
            });
            // Fix 1st, 2nd, 3rd, 4th, etc.
            str = str.replace(/\b(\d*1)st\b/gi, '$1st');
            str = str.replace(/\b(\d*2)nd\b/gi, '$1nd');
            str = str.replace(/\b(\d*3)rd\b/gi, '$1rd');
            str = str.replace(/\b(\d+)th\b/gi, '$1th');
            // Cap first letter of entire name
            str = str.charAt(0).toUpperCase() + str.substr(1);
            return str;
        }

        // normalize phone
        function normalizePhone(s, outputFormat, returnType) {
            if ( !s && returnType === 'existing' ) {
                bannButt.phoneMissing.active = true;
                if (currentWL.phoneWL) {
                    bannButt.phoneMissing.WLactive = false;
                }
                return s;
            }
            s = s.replace(/(\d{3}.*)(?:extension|ext|xt|x).*/i, '$1');
            var s1 = s.replace(/\D/g, '');  // remove non-number characters
            var m = s1.match(/^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/);  // Ignore leading 1, and also don't allow area code or exchange to start with 0 or 1 (***USA/CAN specific)
            if (!m) {  // then try alphanumeric matching
                if (s) { s = s.toUpperCase(); }
                s1 = s.replace(/[^0-9A-Z]/g, '').replace(/^\D*(\d)/,'$1').replace(/^1?([2-9][0-9]{2}[0-9A-Z]{7,10})/g,'$1');
                s1 = replaceLetters(s1);
                m = s1.match(/^([2-9]\d{2})([2-9]\d{2})(\d{4})(?:.{0,3})$/);  // Ignore leading 1, and also don't allow area code or exchange to start with 0 or 1 (***USA/CAN specific)
                if (!m) {
                    if ( returnType === 'inputted' ) {
                        return 'badPhone';
                    } else {
                        bannButt.phoneInvalid.active = true;
                        return s;
                    }
                } else {
                    return String.plFormat(outputFormat, m[1], m[2], m[3]);
                }
            } else {
                return String.plFormat(outputFormat, m[1], m[2], m[3]);
            }
        }

        // Alphanumeric phone conversion
        function replaceLetters(number) {
            //debug('-- replaceLetters(number) called --');
            var conversionMap = _({
                2: /A|B|C/,
                3: /D|E|F/,
                4: /G|H|I/,
                5: /J|K|L/,
                6: /M|N|O/,
                7: /P|Q|R|S/,
                8: /T|U|V/,
                9: /W|X|Y|Z/
            });
            number = typeof number === 'string' ? number.toUpperCase() : '';
            return number.replace(/[A-Z]/g, function(match, offset, string) {
                return conversionMap.findKey(function(re) {
                    return re.test(match);
                });
            });
        }

        var MultiAction = require("Waze/Action/MultiAction");
        // Add array of actions to a MultiAction to be executed at once (counts as one edit for redo/undo purposes)
        function executeMultiAction(actions) {
            if(actions.length > 0) {
                var m_action = new MultiAction();
                m_action.setModel(W.model);
                actions.forEach(function(action) {
                    m_action.doSubAction(action);
                });
                W.model.actionManager.add(m_action);
            }
        }

        // Normalize url
        function normalizeURL(s, lc, skipBannerActivate) {
            if (!s && !skipBannerActivate) {  // Notify that url is missing and provide web search to find website and gather data (provided for all editors)
                bannButt.urlMissing.active = true;
                if (currentWL.urlWL) {
                    bannButt.urlMissing.WLactive = false;
                }
                bannButt.webSearch.active = true;  // Activate websearch button
                return s;
            }

            s = s.replace(/ \(.*/g, '');  // remove anything with parentheses after it
            s = s.replace(/ /g, '');  // remove any spaces
            var m = s.match(/^http:\/\/(.*)$/i);  // remove http://
            if (m) { s = m[1]; }
            if (lc) {  // lowercase the entire domain
                s = s.replace(/[^\/]+/i, function(txt) { // lowercase the domain
                    return (txt === txt.toLowerCase()) ? txt : txt.toLowerCase();
                });
            } else {  // lowercase only the www and com
                s = s.replace(/www\./i, 'www.');
                s = s.replace(/\.com/i, '.com');
            }
            m = s.match(/^(.*)\/pages\/welcome.aspx$/i);  // remove unneeded terms
            if (m) { s = m[1]; }
            m = s.match(/^(.*)\/pages\/default.aspx$/i);  // remove unneeded terms
            if (m) { s = m[1]; }
            m = s.match(/^(.*)\/index.html$/i);  // remove unneeded terms
            if (m) { s = m[1]; }
            m = s.match(/^(.*)\/index.htm$/i);  // remove unneeded terms
            if (m) { s = m[1]; }
            m = s.match(/^(.*)\/index.php$/i);  // remove unneeded terms
            if (m) { s = m[1]; }
            m = s.match(/^(.*)\/$/i);  // remove final slash
            if (m) { s = m[1]; }

            return s;
        }  // END normalizeURL function

        // Only run the harmonization if a venue is selected
        function harmonizePlace() {
            //debug('-- harmonizePlace() called --');
            // Script is only for R2+ editors
            if (!IS_BETA_USER && USER_RANK < 2) {
                alert("Script is currently available for editors of Rank 2 and up.");
                return;
            }
            // Beta version for approved users only
            if (IS_DEV_VERSION && !IS_BETA_USER) {
                alert("Please sign up to beta-test this script version.\nSend a PM or Slack-DM to t0cableguy or Tonestertm, or post in the WMEPH forum thread. Thanks.");
                return;
            }
            // Only run if a single place is selected
            if (W.selectionManager.selectedItems.length === 1) {
                var item = W.selectionManager.selectedItems[0].model;
                if (item.type === "venue") {
                    blurAll();  // focus away from current cursor position
                    _disableHighlightTest = true;
                    harmonizePlaceGo(item,'harmonize');
                    _disableHighlightTest = false;
                    applyHighlightsTest(item);
                } else {  // Remove duplicate labels
                    WMEPH_NAME_LAYER.destroyFeatures();
                }
            } else {  // Remove duplicate labels
                WMEPH_NAME_LAYER.destroyFeatures();
            }
        }

        // Main script
        function harmonizePlaceGo(item, useFlag, actions) {
            //debug('-- harmonizePlaceGo() called --');
            //debug('  item = ' + JSON.stringify(item, censor(item), 2));
            //debug('  useFlag = ' + JSON.stringify(useFlag, null, 2));
            //debug('  actions = ' + JSON.stringify(actions, null, 2));
            actions = actions || []; // Used for collecting all actions to be applied to the model.

            var hpMode = {
                harmFlag: false,
                hlFlag: false,
                scanFlag: false
            };

            if ( useFlag.indexOf('harmonize') > -1 ) {
                hpMode.harmFlag = true;
                phlog('Running script on selected place...');
            }
            if ( useFlag.indexOf('highlight') > -1 ) {
                hpMode.hlFlag = true;
            }
            if ( useFlag.indexOf('scan') > -1 ) {
                hpMode.scanFlag = true;
            }

            // If it's an unlocked parking lot, return with severity 4.
            if (hpMode.hlFlag && isPLA(item) && item.attributes.lockRank < 2) {
                return 4;
            }

            var placePL = getItemPL();  //  set up external post div and pull place PL
            // https://www.waze.com/editor/?env=usa&lon=-80.60757&lat=28.17850&layers=1957&zoom=4&segments=86124344&update_requestsFilter=false&problemsFilter=false&mapProblemFilter=0&mapUpdateRequestFilter=0&venueFilter=1
            placePL = placePL.replace(/\&layers=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&update_requestsFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&problemsFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&mapProblemFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&mapUpdateRequestFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            placePL = placePL.replace(/\&venueFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
            var newPlaceURL, approveRegionURL, servID, useState = true;
            var PNHOrderNum = '', PNHNameTemp = '', PNHNameTempWeb = '';
            severityButt = 0;
            var customStoreFinder = false;  // switch indicating place-specific custom store finder url
            var customStoreFinderLocal = false;  // switch indicating place-specific custom store finder url with localization option (GPS/addr)
            var customStoreFinderURL = "";  // switch indicating place-specific custom store finder url
            var customStoreFinderLocalURL = "";  // switch indicating place-specific custom store finder url with localization option (GPS/addr)
            var fieldUpdateObject = {name: false, aliases: false, categories: false, brand: false, description: false, lockRank: false, address: false, url: false, phone: false, openingHours: false,
                                     services: { VALLET_SERVICE: false, DRIVETHROUGH: false, WI_FI: false, RESTROOMS: false, CREDIT_CARDS: false, RESERVATIONS: false,
                                                OUTSIDE_SEATING: false, AIR_CONDITIONING: false, PARKING_FOR_CUSTOMERS: false, DELIVERIES: false, TAKE_AWAY: false, WHEELCHAIR_ACCESSIBLE: false }
                                    };
            // Whitelist: reset flags
            currentWL = {
                dupeWL: [],
                restAreaName: false,
                restAreaSpec: false,
                unmappedRegion: false,
                gasMismatch: false,
                hotelMkPrim: false,
                changeHMC2Office: false,
                changeHMC2PetVet: false,
                changeSchool2Offices: false,
                pointNotArea: false,
                areaNotPoint: false,
                HNWL: false,
                hnNonStandard: false,
                HNRange: false,
                parentCategory: false,
                suspectDesc: false,
                resiTypeName: false,
                longURL: false,
                gasNoBrand: false,
                subFuel: false,
                hotelLocWL: false,
                localizedName: false,
                urlWL: false,
                phoneWL: false,
                aCodeWL: false,
                noHours: false,
                nameMissing: false,
                plaNameMissing: false,
                extProviderMissing: false
            };

            // **** Set up banner action buttons.  Structure:
            // active: false until activated in the script
            // severity: determines the color of the banners and whether locking occurs
            // message: The text before the button option
            // value: button text
            // title: tooltip text
            // action: The action that happens if the button is pressed
            // WL terms are for whitelisting
            bannButt = {
                hnDashRemoved: {
                    active: false, severity: 0, message: "Dash removed from house number. Verify"
                },

                fullAddressInference: {  // no WL
                    active: false, severity: 3, message: 'Missing address was inferred from nearby segments. Verify the address and run script again.'
                },

                nameMissing: {  // no WL
                    active: false, severity: 3, message: 'Name is missing.'
                },

                plaNameMissing: {
                    active: false, severity: 1, message: 'Name is missing.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist missing name',
                    WLaction: function() {
                        wlKeyName = 'plaNameMissing';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                hoursOverlap: {  // no WL
                    active: false, severity: 3, message: 'Overlapping hours of operation. Place might not save.'
                },

                unmappedRegion: {
                    active: false, severity: 3, message: 'This category is usually not mapped in this region.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist unmapped category',
                    WLaction: function() {
                        wlKeyName = 'unmappedRegion';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                restAreaName: {
                    active: false, severity: 3, message: 'Rest area name is out of spec. Use the Rest Area wiki button below to view formats.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist rest area name',
                    WLaction: function() {
                        wlKeyName = 'restAreaName';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                restAreaGas: { // no WL
                    active: false, severity: 3, message: 'Gas stations at Rest Areas should be separate area places.'
                },

                restAreaSpec: {  // if it appears to be a rest area
                    active: false, severity: 3, message: "Is this a rest area?", value: "Yes", title: 'Update with proper categories and services.',
                    action: function() {
                        var actions = [];
                        // update categories according to spec
                        newCategories = insertAtIX(newCategories,"TRANSPORTATION",0);  // Insert/move TRANSPORTATION category in the first position
                        newCategories = insertAtIX(newCategories,"SCENIC_LOOKOUT_VIEWPOINT",1);  // Insert/move SCENIC_LOOKOUT_VIEWPOINT category in the 2nd position

                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        // make it 24/7
                        actions.push(new UpdateObject(item, { openingHours: [{days: [1,2,3,4,5,6,0], fromHour: "00:00", toHour: "00:00"}] }));
                        fieldUpdateObject.openingHours='#dfd';
                        //highlightChangedFields(fieldUpdateObject,hpMode);

                        bannServ.add247.checked = true;
                        bannServ.addParking.actionOn(actions);  // add parking service
                        bannServ.addWheelchair.actionOn(actions);  // add parking service
                        bannButt.restAreaSpec.active = false;  // reset the display flag

                        executeMultiAction(actions);

                        _disableHighlightTest = true;
                        harmonizePlaceGo(item,'harmonize');
                        _disableHighlightTest = false;
                        applyHighlightsTest(item);
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist place',
                    WLaction: function() {
                        wlKeyName = 'restAreaSpec';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                gasMismatch: {  // if the gas brand and name don't match
                    active: false, severity: 3, message: "Gas name and brand don't match.  Move brand to name?", value: "Yes", title: 'Change the primary name to the brand and make the current name the alt-name.',
                    action: function() {
                        newAliases = insertAtIX(newAliases, newName, 0);
                        for (var naix=0; naix<newAliases.length; naix++) {
                            newAliases[naix] = toTitleCase(newAliases[naix]);
                        }
                        newName = item.attributes.brand;
                        newAliases = removeSFAliases(newName, newAliases);
                        W.model.actionManager.add(new UpdateObject(item, { name: newName, aliases: newAliases }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.aliases='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.gasMismatch.active = false;  // reset the display flag
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist gas brand mismatch',
                    WLaction: function() {
                        wlKeyName = 'gasMismatch';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                gasUnbranded: {  // no WL
                    active: false, severity: 3, message: '"Unbranded" should not be used for the station brand. Change to correct brand or use the blank entry at the top of the brand list.'
                },

                gasMkPrim: {  // no WL
                    active: false, severity: 3,  message: "Gas Station is not the primary category", value: "Fix", title: 'Make the Gas Station category the primary category.',
                    action: function() {
                        newCategories = insertAtIX(newCategories,"GAS_STATION",0);  // Insert/move Gas category in the first position
                        var actions = [];
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        bannButt.gasMkPrim.active = false;  // reset the display flag
                        executeMultiAction(actions);
                        harmonizePlaceGo(item,'harmonize');
                    }
                },

                hotelMkPrim: {
                    active: false, severity: 3, message: "Hotel category is not first", value: "Fix", title: 'Make the Hotel category the primary category.',
                    action: function() {
                        newCategories = insertAtIX(newCategories,"HOTEL",0);  // Insert/move Hotel category in the first position
                        var actions = [];
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        bannButt.hotelMkPrim.active = false;  // reset the display flag
                        executeMultiAction(actions);
                        harmonizePlaceGo(item,'harmonize');
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist hotel as secondary category',
                    WLaction: function() {
                        wlKeyName = 'hotelMkPrim';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                changeHMC2Office: {
                    active: false, severity: 3, message: "This doesn't look like a hospital or urgent care location.", value: "Change to Offices", title: 'Change to Office Category',
                    action: function() {
                        newCategories[newCategories.indexOf('HOSPITAL_MEDICAL_CARE')] = "OFFICES";
                        //phlogdev(newCategories);
                        var actions = [];
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        bannButt.changeHMC2Office.active = false;  // reset the display flag
                        executeMultiAction(actions);
                        harmonizePlaceGo(item,'harmonize');  // Rerun the script to update fields and lock
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist Hospital category',
                    WLaction: function() {
                        wlKeyName = 'changeHMC2Office';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                changeHMC2PetVet: {
                    active: false, severity: 3, message: "This looks like it should be a Pet/Veterinarian category. Change?", value: "Yes", title: 'Change to Pet/Veterinarian Category',
                    action: function() {
                        newCategories[newCategories.indexOf('HOSPITAL_MEDICAL_CARE')] = "PET_STORE_VETERINARIAN_SERVICES";
                        var actions = [];
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        bannButt.changeHMC2PetVet.active = false;  // reset the display flag
                        executeMultiAction(actions);
                        harmonizePlaceGo(item,'harmonize');  // Rerun the script to update fields and lock
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist PetVet category',
                    WLaction: function() {
                        wlKeyName = 'changeHMC2PetVet';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                changeSchool2Offices: {
                    active: false, severity: 3, message: "This doesn't look like it should be School category.", value: "Change to Office", title: 'Change to Offices Category',
                    action: function() {
                        newCategories[newCategories.indexOf('SCHOOL')] = "OFFICES";
                        var actions = [];
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        bannButt.changeSchool2Offices.active = false;  // reset the display flag
                        executeMultiAction(actions);
                        harmonizePlaceGo(item,'harmonize');  // Rerun the script to update fields and lock
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist School category',
                    WLaction: function() {
                        wlKeyName = 'changeSchool2Offices';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                pointNotArea: {  // Area 2 Point button
                    active: false, severity: 3, message: "This category should be a point place.", value: "Change to point", title: 'Change to point place',
                    action: function() {
                        // If a stop point is set, use it for the point, else use Centroid
                        var newGeometry;
                        if (item.attributes.entryExitPoints.length > 0) {
                            newGeometry = item.attributes.entryExitPoints[0].point;
                        } else {
                            newGeometry = item.geometry.getCentroid();
                        }
                        updateFeatureGeometry (item, newGeometry);
                        bannButt.pointNotArea.active = false;
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist point (not area)',
                    WLaction: function() {
                        wlKeyName = 'pointNotArea';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                areaNotPoint: {  // Point 2 Area button
                    active: false, severity: 3, message: "This category should be an area place.", value: "Change to area", title: 'Change to Area',
                    action: function() {
                        // If a stop point is set, use it for the point, else use Centroid
                        updateFeatureGeometry (item, item.getPolygonGeometry());
                        bannButt.areaNotPoint.active = false;
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist area (not point)',
                    WLaction: function() {
                        wlKeyName = 'areaNotPoint';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                hnMissing: {
                    active: false, severity: 3, message: 'No HN: <input type="text" id="WMEPH-HNAdd'+devVersStr+'" autocomplete="off" style="font-size:0.85em;width:100px;padding-left:3px;color:#000;background-color:#FDD">',
                    value: "Add", title: 'Add HN to place',
                    badInput: false,
                    action: function() {
                        var newHN = $('#WMEPH-HNAdd'+devVersStr).val();
                        newHN = newHN.replace(/ +/g, '');
                        phlogdev(newHN);
                        var hnTemp = newHN.replace(/[^\d]/g, '');
                        var hnTempDash = newHN.replace(/[^\d-]/g, '');
                        if (hnTemp > 0 && hnTemp < 1000000) {
                            W.model.actionManager.add(new UpdateObject(item, { houseNumber: hnTempDash }));
                            fieldUpdateObject.address='#dfd';
                            bannButt.hnMissing.active = false;
                            badInput = false;
                        } else {
                            badInput = true;
                        }

                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist empty HN',
                    WLaction: function() {
                        wlKeyName = 'HNWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                hnNonStandard: {
                    active: false, severity: 3, message: 'House number is non-standard.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist non-standard HN',
                    WLaction: function() {
                        wlKeyName = 'hnNonStandard';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                HNRange: {
                    active: false, severity: 2, message: 'House number seems out of range for the street name. Verify.', value: '',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist HN range',
                    WLaction: function() {
                        wlKeyName = 'HNRange';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                streetMissing: {  // no WL
                    active: false, severity: 3, message: 'No street:<div class="ui-widget" style="display:inline;"><input id="WMEPH_missingStreet" style="font-size:0.85em;color:#000;background-color:#FDD;width:170px;margin-right:3px;"></div><input class="btn btn-default btn-xs wmeph-btn disabled" id="WMEPH_addStreetBtn" title="Add street to place" type="button" value="Add" disabled>'
                },

                cityMissing: {  // no WL
                    active: false, severity: 3, message: 'City missing.'
                },

                bankType1: {   // no WL
                    active: false, severity: 3, message: 'Clarify the type of bank: the name has ATM but the primary category is Offices'
                },

                bankBranch: {  // no WL
                    active: false, severity: 1, message: "Is this a bank branch office? ", value: "Yes", title: "Is this a bank branch?",
                    action: function() {
                        newCategories = ["BANK_FINANCIAL","ATM"];  // Change to bank and atm cats
                        newName = newName.replace(/[\- (]*ATM[\- )]*/g, ' ').replace(/^ /g,'').replace(/ $/g,'');     // strip ATM from name if present
                        W.model.actionManager.add(new UpdateObject(item, { name: newName, categories: newCategories }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.bankCorporate.active = false;   // reset the bank Branch display flag
                        bannButt.bankBranch.active = false;   // reset the bank Branch display flag
                        bannButt.standaloneATM.active = false;   // reset the standalone ATM display flag
                        bannButt.bankType1.active = false;  // remove bank type warning
                    }
                },

                standaloneATM: { // no WL
                    active: false, severity: 2, message: "Or is this a standalone ATM? ", value: "Yes", title: "Is this a standalone ATM with no bank branch?",
                    action: function() {
                        if (newName.indexOf("ATM") === -1) {
                            newName = newName + ' ATM';
                        }
                        newCategories = ["ATM"];  // Change to ATM only
                        W.model.actionManager.add(new UpdateObject(item, { name: newName, categories: newCategories }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.bankCorporate.active = false;   // reset the bank Branch display flag
                        bannButt.bankBranch.active = false;   // reset the bank Branch display flag
                        bannButt.standaloneATM.active = false;   // reset the standalone ATM display flag
                        bannButt.bankType1.active = false;  // remove bank type warning
                    }
                },

                bankCorporate: {  // no WL
                    active: false, severity: 1, message: "Or is this the bank's corporate offices?", value: "Yes", title: "Is this the bank's corporate offices?",
                    action: function() {
                        newCategories = ["OFFICES"];  // Change to offices category
                        newName = newName.replace(/[\- (]*atm[\- )]*/ig, ' ').replace(/^ /g,'').replace(/ $/g,'').replace(/ {2,}/g,' ');     // strip ATM from name if present
                        W.model.actionManager.add(new UpdateObject(item, { name: newName + ' - Corporate Offices', categories: newCategories }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.bankCorporate.active = false;   // reset the bank Branch display flag
                        bannButt.bankBranch.active = false;   // reset the bank Branch display flag
                        bannButt.standaloneATM.active = false;   // reset the standalone ATM display flag
                        bannButt.bankType1.active = false;  // remove bank type warning
                    }
                },

                catPostOffice: {  // no WL
                    active: false, severity: 2, message: 'If this is not a USPS post office, change the category, as "Post Office" is only used for USPS locations.'
                },

                ignEdited: {  // no WL
                    active: false, severity: 2, message: 'Last edited by an IGN editor'
                },

                wazeBot: {  // no WL
                    active: false, severity: 2, message: 'Edited last by an automated process. Please verify information is correct.'
                },

                parentCategory: {
                    active: false, severity: 2, message: 'This parent category is usually not mapped in this region.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist parent Category',
                    WLaction: function() {
                        wlKeyName = 'parentCategory';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                checkDescription: {  // no WL
                    active: false, severity: 2, message: 'Description field already contained info; PNH description was added in front of existing. Check for inconsistency or duplicate info.'
                },

                overlapping: {  // no WL
                    active: false, severity: 2, message: 'Place points are stacked up.'
                },

                suspectDesc: {  // no WL
                    active: false, severity: 2, message: 'Description field might contain copyrighted info.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist description',
                    WLaction: function() {
                        wlKeyName = 'suspectDesc';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                resiTypeName: {
                    active: false, severity: 2, message: 'The place name suggests a residential place or personalized place of work.  Please verify.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist Residential-type name',
                    WLaction: function() {
                        wlKeyName = 'resiTypeName';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                mismatch247: {  // no WL
                    active: false, severity: 2, message: 'Hours of operation listed as open 24hrs but not for all 7 days.'
                },

                phoneInvalid: {  // no WL
                    active: false, severity: 2, message: 'Phone invalid.'
                },

                areaNotPointMid: {
                    active: false, severity: 2, message: 'This category is usually an area place, but can be a point in some cases. Verify if point is appropriate.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist area (not point)',
                    WLaction: function() {
                        wlKeyName = 'areaNotPoint';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                pointNotAreaMid: {
                    active: false, severity: 2, message: 'This category is usually a point place, but can be a area in some cases. Verify if area is appropriate.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist point (not area)',
                    WLaction: function() {
                        wlKeyName = 'pointNotArea';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                longURL: {
                    active: false, severity: 1, message: 'Existing URL doesn\'t match the suggested PNH URL. Use the Place Website button below to verify. If existing URL is invalid:', value: "Use PNH URL", title: "Change URL to the PNH standard",
                    action: function() {
                        if (tempPNHURL !== '') {
                            W.model.actionManager.add(new UpdateObject(item, { url: tempPNHURL }));
                            fieldUpdateObject.url='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                            bannButt.longURL.active = false;
                            updateURL = true;
                        } else {
                            if (confirm('WMEPH: URL Matching Error!\nClick OK to report this error') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                                forumMsgInputs = {
                                    subject: 'WMEPH URL comparison Error report',
                                    message: 'Error report: URL comparison failed for "' + item.attributes.name + '"\nPermalink: ' + placePL
                                };
                                WMEPH_errorReport(forumMsgInputs);
                            }
                        }
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist existing URL',
                    WLaction: function() {
                        wlKeyName = 'longURL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                gasNoBrand: {
                    active: false, severity: 1, message: 'Verify that gas station has no brand.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist no gas brand',
                    WLaction: function() {
                        wlKeyName = 'gasNoBrand';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                subFuel: {
                    active: false, severity: 1, message: 'Make sure this place is for the gas station itself and not the main store building.  Otherwise undo and check the categories.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist no gas brand',
                    WLaction: function() {
                        wlKeyName = 'subFuel';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                areaNotPointLow: {
                    active: false, severity: 1, message: 'This category is usually an area place, but can be a point in some cases. Verify if point is appropriate.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist area (not point)',
                    WLaction: function() {
                        wlKeyName = 'areaNotPoint';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                pointNotAreaLow: {
                    active: false, severity: 1, message: 'This category is usually a point place, but can be a area in some cases. Verify if area is appropriate.',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist point (not area)',
                    WLaction: function() {
                        wlKeyName = 'pointNotArea';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                formatUSPS: {  // ### needs WL or not?
                    active: false, severity: 1, message: 'Localize the post office according to this region\'s standards for USPS locations (e.g., "USPS - Tampa")'
                },

                catHotel: {
                    active: false, severity: 1, message: 'Check hotel website for any name localization (e.g. Hilton - Tampa Airport)',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist hotel localization',
                    WLaction: function() {
                        wlKeyName = 'hotelLocWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                localizedName: {
                    active: false, severity: 1, message: 'Place needs localization information',
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist localization',
                    WLaction: function() {
                        wlKeyName = 'localizedName';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                specCaseMessage: {  // no WL
                    active: false, severity: 1, message: 'WMEPH: placeholder (please report this error if you see this message)'
                },

                pnhCatMess: {  // no WL
                    active: false, severity: 0, message: 'WMEPH: placeholder (please report this error if you see this message)'
                },

                specCaseMessageLow: {  // no WL
                    active: false, severity: 0, message: 'WMEPH: placeholder (please report this error if you see this message)'
                },

                extProviderMissing: {
                    active:false, severity:3, message:'Missing External Provider ',
                    WLactive:true, WLmessage:'', WLtitle:'Whitelist missing external provider',
                    WLaction: function() {
                        wlKeyName = 'extProviderMissing';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                urlMissing: {
                    active: false, severity: 1, message: 'No URL: <input type="text" id="WMEPH-UrlAdd'+devVersStr+'" autocomplete="off" style="font-size:0.85em;width:100px;padding-left:3px;color:#000;background-color:#DDF">',
                    value: "Add", title: 'Add URL to place',
                    badInput: false,
                    action: function() {
                        var newUrlValue = $('#WMEPH-UrlAdd'+devVersStr).val();
                        var newUrl = normalizeURL(newUrlValue, true, false);
                        if (newUrl === 'badURL') {
                            this.badInput = true;
                        } else {
                            phlogdev(newUrl);
                            W.model.actionManager.add(new UpdateObject(item, { url: newUrl }));
                            fieldUpdateObject.url='#dfd';
                            bannButt.urlMissing.active = false;
                            bannButt.PlaceWebsite.active = true;
                            this.badInput = false;
                        }
                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist empty URL',
                    WLaction: function() {
                        wlKeyName = 'urlWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                phoneMissing: {
                    active: false, severity: 1, message: 'No ph#: <input type="text" id="WMEPH-PhoneAdd'+devVersStr+'" autocomplete="off" style="font-size:0.85em;width:100px;padding-left:3px;color:#000;background-color:#DDF">',
                    value: "Add", title: 'Add phone to place',
                    badInput: false,
                    action: function() {
                        var newPhoneVal = $('#WMEPH-PhoneAdd'+devVersStr).val();
                        var newPhone = normalizePhone(newPhoneVal, outputFormat, 'inputted');
                        if (newPhone === 'badPhone') {
                            this.badInput = true;
                        } else {
                            this.badInput = false;
                            phlogdev(newPhone);
                            if (myCountry2L === "US" || myCountry2L === "CA") {
                                if (newPhone !== null && newPhone.match(/[2-9]\d{2}/) !== null) {
                                    var areaCode = newPhone.match(/[2-9]\d{2}/)[0];
                                    if ( areaCodeList.indexOf(areaCode) === -1 ) {
                                        bannButt.badAreaCode.active = true;
                                        if (currentWL.aCodeWL) {
                                            bannButt.badAreaCode.WLactive = false;
                                        }
                                    }
                                }
                            }
                            W.model.actionManager.add(new UpdateObject(item, { phone: newPhone }));
                            fieldUpdateObject.phone='#dfd';
                            bannButt.phoneMissing.active = false;
                        }

                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist empty phone',
                    WLaction: function() {
                        wlKeyName = 'phoneWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                badAreaCode: {
                    active: false, severity: 1, message: "Area Code mismatch ",
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist the area code',
                    WLaction: function() {
                        wlKeyName = 'aCodeWL';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                noHours: {
                    active: false, severity: 1, message: 'No hours: <input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste'+devVersStr+'" autocomplete="off" style="font-size:0.85em;width:170px;padding-left:3px;color:#AAA">',
                    value: "Add hours", title: 'Add pasted hours to existing',
                    action: function() {
                        var pasteHours = $('#WMEPH-HoursPaste'+devVersStr).val();
                        phlogdev(pasteHours);
                        $('.nav-tabs a[href="#landmark-edit-more-info"]').tab('show');
                        pasteHours = pasteHours + ',' + getOpeningHours(item).join(',');
                        var hoursObjectArray = parseHours(pasteHours);
                        if (hoursObjectArray !== false) {
                            phlogdev(hoursObjectArray);
                            W.model.actionManager.add(new UpdateObject(item, { openingHours: hoursObjectArray }));
                            fieldUpdateObject.openingHours='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                            bannButt.noHours.value = 'Add hours';
                            bannButt.noHours.severity = 0;
                            bannButt.noHours.WLactive = false;
                            bannButt.noHours.message = 'Hours: <input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                        } else {
                            phlog('Can\'t parse those hours');
                            bannButt.noHours.severity = 1;
                            bannButt.noHours.WLactive = true;
                            bannButt.noHours.message = 'Hours: <input type="text" value="Can\'t parse, try again" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                        }
                    },
                    value2: "Replace all hours", title2: 'Replace existing hours with pasted hours',
                    action2: function() {
                        var pasteHours = $('#WMEPH-HoursPaste'+devVersStr).val();
                        phlogdev(pasteHours);
                        $('.nav-tabs a[href="#landmark-edit-more-info"]').tab('show');
                        var hoursObjectArray = parseHours(pasteHours);
                        if (hoursObjectArray !== false) {
                            phlogdev(hoursObjectArray);
                            item.attributes.openingHours.push.apply(item.attributes.openingHours, hoursObjectArray);
                            W.model.actionManager.add(new UpdateObject(item, { openingHours: hoursObjectArray }));
                            fieldUpdateObject.openingHours='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                            bannButt.noHours.value2 = 'Replace hours';
                            bannButt.noHours.severity = 0;
                            bannButt.noHours.WLactive = false;
                            bannButt.noHours.message = 'Hours: <input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                        } else {
                            phlog('Can\'t parse those hours');
                            bannButt.noHours.severity = 1;
                            bannButt.noHours.WLactive = true;
                            bannButt.noHours.message = 'Hours: <input type="text" value="Can\'t parse, try again" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                        }

                    },
                    WLactive: true, WLmessage: '', WLtitle: 'Whitelist no Hours',
                    WLaction: function() {
                        wlKeyName = 'noHours';
                        whitelistAction(itemID, wlKeyName);
                    }
                },

                resiTypeNameSoft: {  // no WL
                    active: false, severity: 0, message: 'The place name suggests a residential place or personalized place of work.  Please verify.'
                },

                localURL: {  // no WL
                    active: false, severity: 0, message: 'Some locations for this business have localized URLs, while others use the primary corporate site. Check if a local URL applies to this location.'
                },

                babiesRUs: {  // no WL
                    active: false, severity: 0, message: 'If there is a Toys R Us at this location, make it the primary name and Babies R Us the alt name and rerun the script.'
                },

                lockRPP: {    // no WL
                    active: false, severity: 0, message: 'Lock this residential point?', value: "Lock", title: 'Lock the residential point',
                    action: function() {
                        var RPPlevelToLock = $("#RPPLockLevel :selected").val() || defaultLock + 1;
                        phlogdev('RPPlevelToLock: '+ RPPlevelToLock);

                        RPPlevelToLock = RPPlevelToLock -1 ;
                        W.model.actionManager.add(new UpdateObject(item, { lockRank: RPPlevelToLock }));
                        // no field highlight here
                        bannButt.lockRPP.message = 'Current lock: '+ (parseInt(item.attributes.lockRank)+1) +'. '+RPPLockString+' ?';
                    }
                },

                addAlias: {    // no WL
                    active: false, severity: 0, message: "Is " + optionalAlias + " at this location?", value: "Yes", title: 'Add ' + optionalAlias,
                    action: function() {
                        newAliases = insertAtIX(newAliases,optionalAlias,0);
                        if (specCases.indexOf('altName2Desc') > -1 &&  item.attributes.description.toUpperCase().indexOf(optionalAlias.toUpperCase()) === -1 ) {
                            newDescripion = optionalAlias + '\n' + newDescripion;
                            W.model.actionManager.add(new UpdateObject(item, { description: newDescripion }));
                            fieldUpdateObject.description='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                        }
                        newAliases = removeSFAliases(newName, newAliases);
                        W.model.actionManager.add(new UpdateObject(item, { aliases: newAliases }));
                        fieldUpdateObject.aliases='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addAlias.active = false;  // reset the display flag
                    }
                },

                addCat2: {   // no WL
                    active: false, severity: 0, message: "Is there a " + newCategories[0] + " at this location?", value: "Yes", title: 'Add ' + newCategories[0],
                    action: function() {
                        newCategories.push.apply(newCategories,altCategories);
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addCat2.active = false;  // reset the display flag
                    }
                },

                addPharm: {   // no WL
                    active: false, severity: 0, message: "Is there a Pharmacy at this location?", value: "Yes", title: 'Add Pharmacy category',
                    action: function() {
                        newCategories = insertAtIX(newCategories, 'PHARMACY', 1);
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addPharm.active = false;  // reset the display flag
                    }
                },

                addSuper: {   // no WL
                    active: false, severity: 0, message: "Does this location have a supermarket?", value: "Yes", title: 'Add Supermarket category',
                    action: function() {
                        newCategories = insertAtIX(newCategories, 'SUPERMARKET_GROCERY', 1);
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addSuper.active = false;  // reset the display flag
                    }
                },

                appendAMPM: {   // no WL
                    active: false, severity: 0, message: "Is there an ampm at this location?", id: "appendAMPM", value: "Yes", title: 'Add ampm to the place',
                    action: function() {
                        newCategories = insertAtIX(newCategories, 'CONVENIENCE_STORE', 1);
                        newName = 'ARCO ampm';
                        newURL = 'ampm.com';
                        W.model.actionManager.add(new UpdateObject(item, { name: newName, url: newURL, categories: newCategories }));
                        fieldUpdateObject.name='#dfd';
                        fieldUpdateObject.url='#dfd';
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.appendAMPM.active = false;  // reset the display flag
                        bannButt.addConvStore.active = false;  // also reset the addConvStore display flag
                    }
                },

                addATM: {    // no WL
                    active: false, severity: 0, message: "ATM at location? ", value: "Yes", title: "Add the ATM category to this place",
                    action: function() {
                        newCategories = insertAtIX(newCategories,"ATM",1);  // Insert ATM category in the second position
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addATM.active = false;   // reset the display flag
                    }
                },

                addConvStore: {  // no WL
                    active: false, severity: 0, message: "Add convenience store category? ", value: "Yes", title: "Add the Convenience Store category to this place",
                    action: function() {
                        newCategories = insertAtIX(newCategories,"CONVENIENCE_STORE",1);  // Insert C.S. category in the second position
                        W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        bannButt.addConvStore.active = false;   // reset the display flag
                    }
                },

                isitUSPS: {  // no WL
                    active: false, severity: 0, message: "Is this a USPS location? ", value: "Yes", title: "Is this a USPS location?",
                    action: function() {
                        bannServ.addAC.actionOn();
                        bannServ.addCreditCards.actionOn();
                        bannServ.addParking.actionOn();
                        bannServ.addDeliveries.actionOn();
                        bannServ.addWheelchair.actionOn();
                        W.model.actionManager.add(new UpdateObject(item, { url: "usps.com" }));
                        fieldUpdateObject.url='#dfd';
                        highlightChangedFields(fieldUpdateObject,hpMode);
                        if (myPlace.psRegion === 'SER') {
                            W.model.actionManager.add(new UpdateObject(item, { aliases: ["United States Postal Service"] }));
                            fieldUpdateObject.aliases='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                        }
                        bannButt.isitUSPS.active = false;
                    }
                },

                STC: {    // no WL
                    active: false, severity: 0, message: "Force Title Case: ", value: "Yes", title: "Force Title Case to InterNal CaPs",
                    action: function() {
                        newName = toTitleCaseStrong(item.attributes.name);  // Get the Strong Title Case name
                        if (newName !== item.attributes.name) {  // if they are not equal
                            W.model.actionManager.add(new UpdateObject(item, { name: newName }));
                            fieldUpdateObject.name='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                        }
                        bannButt.STC.active = false;  // reset the display flag
                    }
                },

                sfAliases: {    // no WL
                    active: false, severity: 0, message: 'Unnecessary aliases were removed.'
                },

                placeMatched: {    // no WL
                    active: false, severity: 0, message: 'Place matched from PNH data.'
                },

                placeLocked: {    // no WL
                    active: false, severity: 0, message: 'Place locked.'
                },

                PlaceWebsite: {    // no WL
                    active: false, severity: 0, message: "", value: "Place Website", title: "Direct link to place website",
                    action: function() {
                        var openPlaceWebsiteURL, linkProceed = true;
                        if (updateURL) {
                            if (/^https?:\/\//.test(newURL)) {
                                openPlaceWebsiteURL = newURL;
                            } else {
                                openPlaceWebsiteURL = 'http://' + newURL;
                            }
                            // replace WME url with storefinder URLs if they are in the PNH data
                            if (customStoreFinder) {
                                openPlaceWebsiteURL = customStoreFinderURL;
                            } else if (customStoreFinderLocal) {
                                openPlaceWebsiteURL = customStoreFinderLocalURL;
                            }
                            // If the user has 'never' opened a localized store finder URL, then warn them (just once)
                            if (localStorage.getItem(SFURLWarning) === '0' && customStoreFinderLocal) {
                                linkProceed = false;
                                if (confirm('***Localized store finder sites often show multiple nearby results. Please make sure you pick the right location.\nClick OK to agree and continue.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                                    localStorage.setItem(SFURLWarning, '1');  // prevent future warnings
                                    linkProceed = true;
                                }
                            }
                        } else {
                            if (/^https?:\/\//.test(item.attributes.url)) {
                                openPlaceWebsiteURL = item.attributes.url;
                            } else {
                                openPlaceWebsiteURL = 'http://' + item.attributes.url;
                            }
                        }
                        // open the link depending on new window setting
                        if (linkProceed) {
                            if ( $("#WMEPH-WebSearchNewTab" + devVersStr).prop('checked') ) {
                                window.open(openPlaceWebsiteURL);
                            } else {
                                window.open(openPlaceWebsiteURL, searchResultsWindowName, searchResultsWindowSpecs);
                            }
                        }
                    }
                },

                webSearch: {  // no WL
                    active: false, severity: 0, message: "", value: "Web Search", title: "Search the web for this place.  Do not copy info from 3rd party sources!",
                    action: function() {
                        if (localStorage.getItem(GLinkWarning) !== '1') {
                            if (confirm('***Please DO NOT copy info from Google or third party sources.*** This link is to help you find the business webpage.\nClick OK to agree and continue.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                                localStorage.setItem(GLinkWarning, '1');
                            }
                        }
                        if (localStorage.getItem(GLinkWarning) === '1') {
                            if ( $("#WMEPH-WebSearchNewTab" + devVersStr).prop('checked') ) {
                                window.open(buildGLink(newName,addr,item.attributes.houseNumber));
                            } else {
                                window.open(buildGLink(newName,addr,item.attributes.houseNumber), searchResultsWindowName, searchResultsWindowSpecs);
                            }
                        }
                    }
                },

                NewPlaceSubmit: {    // no WL
                    active: false, severity: 0, message: "No PNH match. If it's a chain: ", value: "Submit new chain data", title: "Submit info for a new chain through the linked form",
                    action: function() {
                        window.open(newPlaceURL);
                    }
                },

                ApprovalSubmit: {  // no WL
                    active: false, severity: 0, message: "PNH data exists but is not approved for this region: ", value: "Request approval", title: "Request region/country approval of this place",
                    action: function() {
                        if ( PMUserList.hasOwnProperty(myPlace.psRegion) && PMUserList[myPlace.psRegion].approvalActive ) {
                            var forumPMInputs = {
                                subject: 'PNH approval for "' + PNHNameTemp + '"',
                                message: 'Please approve "' + PNHNameTemp + '" for the ' + myPlace.psRegion + ' region.  Thanks\n \nPNH order number: ' + PNHOrderNum + '\n \nExample Permalink: ' + placePL + '\n \nPNH Link: ' + USAPNHMasURL,
                                preview: 'Preview', attach_sig: 'on'
                            };
                            forumPMInputs['address_list[u]['+PMUserList[myPlace.psRegion].modID+']'] = 'to';  // Sends a PM to the regional mod instead of the submission form
                            WMEPH_newForumPost('https://www.waze.com/forum/ucp.php?i=pm&mode=compose', forumPMInputs);
                        } else {
                            window.open(approveRegionURL);
                        }
                    }
                }
            };  // END bannButt definitions

            // NOTE: Wait... Why?
            bannButtHL = bannButt;

            bannButt2 = {
                placesWiki: {
                    active: true, severity: 0, message: "", value: "Places wiki", title: "Open the places wiki page",
                    action: function() {
                        window.open(PLACES_WIKI_URL);
                    }
                },
                restAreaWiki: {
                    active: false, severity: 0, message: "", value: "Rest Area wiki", title: "Open the Rest Area wiki page",
                    action: function() {
                        window.open(RESTAREA_WIKI_URL);
                    }
                },
                clearWL: {
                    active: false, severity: 0, message: "", value: "Clear Place whitelist", title: "Clear all Whitelisted fields for this place",
                    action: function() {
                        if (confirm('Are you sure you want to clear all whitelisted fields for this place?') ) {  // misclick check
                            delete venueWhitelist[itemID];
                            saveWL_LS(true);
                            harmonizePlaceGo(item,'harmonize');  // rerun the script to check all flags again
                        }
                    }
                },  // END placesWiki definition
                PlaceErrorForumPost: {
                    active: true, severity: 0, message: "", value: "Report script error", title: "Report a script error",
                    action: function() {
                        var forumMsgInputs = {
                            subject: 'WMEPH Bug report: Scrpt Error',
                            message: 'Script version: ' + WMEPH_VERSION_LONG + devVersStr + '\nPermalink: ' + placePL + '\nPlace name: ' + item.attributes.name + '\nCountry: ' + addr.country.name + '\n--------\nDescribe the error:  \n '
                        };
                        WMEPH_errorReport(forumMsgInputs);
                    }
                },
                whatsNew: {
                    active: false, severity: 0, message: "", value: "*Recent script updates*", title: "Open a list of recent script updates",
                    action: function() {
                        alert(WMEPHWhatsNew);
                        localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');
                        bannButt2.whatsNew.active = false;
                    }
                }
            };  // END bannButt2 definitions

            function addUpdateAction(updateObj, actions) {
                var action = new UpdateObject(item, updateObj);
                if (actions) {
                    actions.push(action);
                } else {
                    W.model.actionManager.add(action);
                }
            }

            function setServiceChecked(servBtn, checked, actions) {
                var servID = WME_SERVICES[servBtn.servIDIndex];
                var checkboxChecked = $("#service-checkbox-"+servID).prop('checked');
                var toggle = typeof checked === 'undefined';
                var noAdd = false;
                checked = (toggle) ? !servBtn.checked : checked;
                if (checkboxChecked === servBtn.checked && checkboxChecked !== checked) {
                    servBtn.checked = checked;
                    var services;
                    if (actions) {
                        for (var i=0; i<actions.length; i++ ) {
                            var existingAction = actions[i];
                            if (existingAction.newAttributes && existingAction.newAttributes.services) {
                                services = existingAction.newAttributes.services;
                            }
                        }
                    }
                    if (!services) {
                        services = item.attributes.services.slice(0);
                    } else {
                        noAdd = services.indexOf(servID) > -1;
                    }
                    if (checked) {
                        services.push(servID);
                    } else {
                        var index = services.indexOf(servID);
                        if (index > -1) {
                            services.splice(index, 1);
                        }
                    }
                    if (!noAdd) {
                        addUpdateAction({services:services}, actions);
                        fieldUpdateObject.services[servID] = '#dfd';
                    }
                }
                updateServicesChecks(bannServ);
                if (!toggle) servBtn.active = checked;
            }

            // set up banner action buttons.  Structure:
            // active: false until activated in the script
            // checked: whether the service is already set on the place. Determines grey vs white icon color
            // icon: button icon name
            // value: button text  (Not used for Icons, keep as backup
            // title: tooltip text
            // action: The action that happens if the button is pressed
            bannServ = {
                addValet: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-valet", w2hratio: 50/50, value: "Valet", title: 'Valet', servIDIndex: 0,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addDriveThru: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-drivethru", w2hratio: 78/50, value: "DriveThru", title: 'Drive-Thru', servIDIndex: 1,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addWiFi: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-wifi", w2hratio: 67/50, value: "WiFi", title: 'WiFi', servIDIndex: 2,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addRestrooms: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-restrooms", w2hratio: 49/50, value: "Restroom", title: 'Restrooms', servIDIndex: 3,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addCreditCards: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-credit", w2hratio: 73/50, value: "CC", title: 'Credit Cards', servIDIndex: 4,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addReservations: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-reservations", w2hratio: 55/50, value: "Reserve", title: 'Reservations', servIDIndex: 5,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addOutside: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-outdoor", w2hratio: 73/50, value: "OusideSeat", title: 'Outside Seating', servIDIndex: 6,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addAC: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-ac", w2hratio: 50/50, value: "AC", title: 'AC', servIDIndex: 7,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addParking: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-parking", w2hratio: 46/50, value: "Parking", title: 'Parking', servIDIndex: 8,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addDeliveries: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-deliveries", w2hratio: 86/50, value: "Delivery", title: 'Deliveries', servIDIndex: 9,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addTakeAway: {  // append optional Alias to the name
                    active: false, checked: false, icon: "serv-takeaway", w2hratio: 34/50, value: "TakeOut", title: 'Take Out', servIDIndex: 10,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                addWheelchair: {  // add service
                    active: false, checked: false, icon: "serv-wheelchair", w2hratio: 50/50, value: "WhCh", title: 'Wheelchair Accessible', servIDIndex: 11,
                    action: function(actions, checked) {
                        setServiceChecked(this, checked, actions);
                    },
                    pnhOverride: false,
                    actionOn: function(actions) {
                        this.action(actions, true);
                    },
                    actionOff: function(actions) {
                        this.action(actions, false);
                    }
                },
                add247: {  // add 24/7 hours
                    active: false, checked: false, icon: "serv-247", w2hratio: 73/50, value: "247", title: 'Hours: Open 24\/7',
                    action: function(actions) {
                        if (!bannServ.add247.checked) {
                            addUpdateAction({ openingHours: [{days: [1,2,3,4,5,6,0], fromHour: "00:00", toHour: "00:00"}] }, actions);
                            fieldUpdateObject.openingHours='#dfd';
                            highlightChangedFields(fieldUpdateObject,hpMode);
                            bannServ.add247.checked = true;
                            bannButt.noHours.active = false;
                        }
                    },
                    actionOn: function(actions) {
                        this.action(actions);
                    }
                }
            };  // END bannServ definitions

            if (hpMode.harmFlag) {
                // Update icons to reflect current WME place services
                updateServicesChecks(bannServ);

                // Turn on New Features Button if not looked at yet
                if (localStorage.getItem('WMEPH-featuresExamined'+devVersStr) === '0') {
                    bannButt2.whatsNew.active = true;
                }
                //Setting switch for the Places Wiki button
                if ( $("#WMEPH-HidePlacesWiki" + devVersStr).prop('checked') ) {
                    bannButt2.placesWiki.active = false;
                }
                // provide Google search link to places
                if (IS_DEV_USER || IS_BETA_USER || USER_RANK > 1) {  // enable the link for all places, for R2+ and betas
                    bannButt.webSearch.active = true;
                }
                // reset PNH lock level
                PNHLockLevel = -1;
            }


            // get GPS lat/long coords from place, call as itemGPS.lat, itemGPS.lon
            var itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(item.attributes.geometry.getCentroid().x,item.attributes.geometry.getCentroid().y);
            var lockOK = true;  // if nothing goes wrong, then place will be locked
            var categories = item.attributes.categories;
            newCategories = categories.slice(0);
            newName = item.attributes.name;
            newName = toTitleCase(newName);
            // var nameShort = newName.replace(/[^A-Za-z]/g, '');  // strip non-letters for PNH name searching
            // var nameNumShort = newName.replace(/[^A-Za-z0-9]/g, ''); // strip non-letters/non-numbers for PNH name searching
            newAliases = item.attributes.aliases.slice(0);
            for (var naix=0; naix<newAliases.length; naix++) {
                newAliases[naix] = toTitleCase(newAliases[naix]);
            }
            var brand = item.attributes.brand;
            var newDescripion = item.attributes.description;
            newURL = item.attributes.url;
            var newURLSubmit = "";
            if (newURL !== null && newURL !== '') {
                newURLSubmit = newURL;
            }
            newPhone = item.attributes.phone;
            var addr = item.getAddress();
            if ( addr.hasOwnProperty('attributes') ) {
                addr = addr.attributes;
            }
            var PNHNameRegMatch;

            // Some user submitted places have no data in the country, state and address fields.
            if (!addr.state || !addr.country) {
                if (hpMode.harmFlag) {
                    if (W.map.getZoom() < 4 ) {
                        if ( $("#WMEPH-EnableIAZoom" + devVersStr).prop('checked') ) {
                            W.map.moveTo(W.selectionManager.selectedItems[0].model.geometry.getCentroid().toLonLat(), 5);
                            return;
                        } else {
                            alert("No address and the state cannot be determined. Please zoom in and rerun the script. You can enable autozoom for this type of case in the options.");
                            return;  //  don't run the rest of the script
                        }
                    } else {
                        var inferredAddress = WMEPH_inferAddress(7);  // Pull address info from nearby segments

                        if (inferredAddress && inferredAddress.state && inferredAddress.country ) {
                            addr = inferredAddress;
                            if ( $("#WMEPH-AddAddresses" + devVersStr).prop('checked') ) {  // update the item's address if option is enabled
                                updateAddress(item, addr, actions);
                                fieldUpdateObject.address='#dfd';
                                if (item.attributes.houseNumber && item.attributes.houseNumber.replace(/[^0-9A-Za-z]/g,'').length > 0 ) {
                                    bannButt.fullAddressInference.active = true;
                                    lockOK = false;
                                }
                            } else {
                                bannButt.streetMissing.active = true;
                                bannButt.cityMissing.active = true;
                                lockOK = false;
                            }
                        } else {  //  if the inference doesn't work...
                            alert("Place has no address data. Please set the address and rerun the script.");
                            return;  //  don't run the rest of the script
                        }
                    }
                } else if (hpMode.hlFlag) {
                    if ( item.attributes.adLocked ) {
                        return 'adLock';
                    } else if ( item.attributes.categories.indexOf("HOSPITAL_MEDICAL_CARE") > -1 || item.attributes.categories.indexOf("GAS_STATION") > -1 ) {
                        phlogdev('Unaddressed HMC/GS');
                        return 5;
                    } else {
                        return 3;
                    }

                }
            } else if (hpMode.harmFlag && $('.editing').length === 1 ) {
                $('.save-button').click();  // apply any address changes
            }

            // Whitelist breakout if place exists on the Whitelist and the option is enabled
            itemID = item.attributes.id;
            var WLMatch = false;
            if ( venueWhitelist.hasOwnProperty(itemID) ) {
                if ( hpMode.harmFlag || ( hpMode.hlFlag && !$("#WMEPH-DisableWLHL" + devVersStr).prop('checked')  ) ) {
                    WLMatch = true;
                    // Enable the clear WL button if any property is true
                    for (var WLKey in venueWhitelist[itemID]) {  // loop thru the venue WL keys
                        if ( venueWhitelist[itemID].hasOwnProperty(WLKey) && (venueWhitelist[itemID][WLKey].active || false) ) {
                            bannButt2.clearWL.active = true;
                            currentWL[WLKey] = venueWhitelist[itemID][WLKey];  // update the currentWL settings
                        }
                    }
                    if (venueWhitelist[itemID].hasOwnProperty('dupeWL') && venueWhitelist[itemID].dupeWL.length > 0) {
                        bannButt2.clearWL.active = true;
                        currentWL.dupeWL = venueWhitelist[itemID].dupeWL;
                    }
                    // Update address and GPS info for the place
                    venueWhitelist[itemID].city = addr.city.attributes.name;  // Store city for the venue
                    venueWhitelist[itemID].state = addr.state.name;  // Store state for the venue
                    venueWhitelist[itemID].country = addr.country.name;  // Store country for the venue
                    venueWhitelist[itemID].gps = itemGPS;  // Store GPS coords for the venue
                }
            }

            // Country restrictions
            if (addr.country.env !== "NA") {
                if (hpMode.harmFlag) {
                    alert("At present, this script is not supported in this country.");
                }
                return 3;
            }

            // Parse Regional Data
            var myPlace;
            myState = "Unknown", myCountry = "Unknown";
            if (typeof(addr.country.name) !== "undefined") {
                myCountry = addr.country.name;
                myCountry2L = REGION_DATA.countries[myCountry].psAbbrev || addr.country.abbr;
                myPlace = REGION_DATA.countries[myCountry];
            }
            if (typeof(addr.state.name) !== "undefined") {
                myState = addr.state.name;
                myState2L = REGION_DATA.states[myState].psAbbrev;
                myPlace = REGION_DATA.states[myState];      // I know this overwrites the previous assignment;
            }                                               // but that's ok, because State is more specific.

            //var myCountryCode;  // Do we need this still?

            if (typeof(myPlace) === "undefined") {
                if (hpMode.harmFlag) {
                    if (confirm('WMEPH: Localization Error!\nClick OK to report this error') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                        forumMsgInputs = {
                            subject: 'WMEPH Localization Error report',
                            message: 'Error report: Localization match failed for "' + addr.state.name + '".'
                        };
                        WMEPH_errorReport(forumMsgInputs);
                    }
                }
                return 3;
            }

            gFormState      = myPlace.psGoogleForm;
            areaCodeList    = myPlace.psAreaCode.concat(TOLL_FREE);
            defaultLock     = myPlace.psDefaultLock;
            if (defaultLock.match(/[1-5]/) !== null) {
                defaultLock -= 1;
            } else {
                if (hpMode.harmFlag) {
                    alert('Lock level sheet data is not correct');
                } else if (hpMode.hlFlag) {
                    return '3';
                }
            }


            // If no gas station name, replace with brand name
            if (hpMode.harmFlag && item.attributes.categories[0] === 'GAS_STATION' && (!newName || newName.trim().length === 0) && item.attributes.brand) {
                newName = item.attributes.brand;
                actions.push(new UpdateObject(item, {name: newName }));
                fieldUpdateObject.name = '#dfd';
            }

            // Clear attributes from residential places
            if (item.attributes.residential) {
                if (hpMode.harmFlag) {
                    if ( !$("#WMEPH-AutoLockRPPs" + devVersStr).prop('checked') ) {
                        lockOK = false;
                    }
                    if (item.attributes.name !== '') {  // Set the residential place name to the address (to clear any personal info)
                        phlogdev("Residential Name reset");
                        actions.push(new UpdateObject(item, {name: ''}));
                        // no field HL
                    }
                    newCategories = ["RESIDENCE_HOME"];
                    // newDescripion = null;
                    if (item.attributes.description !== null && item.attributes.description !== "") {  // remove any description
                        phlogdev("Residential description cleared");
                        actions.push(new UpdateObject(item, {description: null}));
                        // no field HL
                    }
                    // newPhone = null;
                    if (item.attributes.phone !== null && item.attributes.phone !== "") {  // remove any phone info
                        phlogdev("Residential Phone cleared");
                        actions.push(new UpdateObject(item, {phone: null}));
                        // no field HL
                    }
                    // newURL = null;
                    if (item.attributes.url !== null && item.attributes.url !== "") {  // remove any url
                        phlogdev("Residential URL cleared");
                        actions.push(new UpdateObject(item, {url: null}));
                        // no field HL
                    }
                    if (item.attributes.services.length > 0) {
                        phlogdev("Residential services cleared");
                        actions.push(new UpdateObject(item, {services: [] }));
                        // no field HL
                    }
                }
                if (item.is2D()) {
                    bannButt.pointNotArea.active = true;
                }
            } else if (isPLA(item) || (newName && newName.trim().length > 0)) {  // for non-residential places
                if (USER_RANK >= 3 && !(isPLA(item) && $('#WMEPH-DisablePLAExtProviderCheck' + devVersStr).prop('checked'))) {
                    var provIDs = item.attributes.externalProviderIDs;
                    if (!provIDs || provIDs.length === 0) {
                        if ($('#WMEPH-ExtProviderSeverity' + devVersStr).prop('checked')) {
                            bannButt.extProviderMissing.severity = 1;
                        }
                        bannButt.extProviderMissing.active = !currentWL.extProviderMissing;
                        bannButt.extProviderMissing.WLactive = !currentWL.extProviderMissing;
                    }
                }

                // Place Harmonization
                var PNHMatchData;
                if (hpMode.harmFlag) {
                    if (item.attributes.categories[0] === 'PARKING_LOT') {
                        PNHMatchData = ['NoMatch'];
                    } else {
                        PNHMatchData = harmoList(newName,myState2L,myPlace.psRegion,myCountry2L,newCategories);  // check against the PNH list
                    }
                } else if (hpMode.hlFlag) {
                    PNHMatchData = ['Highlight'];
                    //PNHMatchData = harmoList(newName,state2L,region,countryCode,newCategories);  // check against the PNH list
                }
                PNHNameRegMatch = false;
                if (PNHMatchData[0] !== "NoMatch" && PNHMatchData[0] !== "ApprovalNeeded" && PNHMatchData[0] !== "Highlight" ) { // *** Replace place data with PNH data
                    PNHNameRegMatch = true;
                    var showDispNote = true;
                    var updatePNHName = true;
                    // Break out the data headers
                    var PNH_DATA_headers;
                    if (myCountry2L === "US") {
                        PNH_DATA_headers = USA_PNH_DATA[0].split("|");
                    } else if (myCountry2L === "CA") {
                        PNH_DATA_headers = CAN_PNH_DATA[0].split("|");
                    }
                    var ph_name_ix = PNH_DATA_headers.indexOf("ph_name");
                    var ph_aliases_ix = PNH_DATA_headers.indexOf("ph_aliases");
                    var ph_category1_ix = PNH_DATA_headers.indexOf("ph_category1");
                    var ph_category2_ix = PNH_DATA_headers.indexOf("ph_category2");
                    var ph_description_ix = PNH_DATA_headers.indexOf("ph_description");
                    var ph_url_ix = PNH_DATA_headers.indexOf("ph_url");
                    var ph_order_ix = PNH_DATA_headers.indexOf("ph_order");
                    // var ph_notes_ix = PNH_DATA_headers.indexOf("ph_notes");
                    var ph_speccase_ix = PNH_DATA_headers.indexOf("ph_speccase");
                    var ph_sfurl_ix = PNH_DATA_headers.indexOf("ph_sfurl");
                    var ph_sfurllocal_ix = PNH_DATA_headers.indexOf("ph_sfurllocal");
                    // var ph_forcecat_ix = PNH_DATA_headers.indexOf("ph_forcecat");
                    var ph_displaynote_ix = PNH_DATA_headers.indexOf("ph_displaynote");

                    // Retrieve the data from the PNH line(s)
                    var nsMultiMatch = false, orderList = [];
                    //phlogdev('Number of PNH matches: ' + PNHMatchData.length);
                    if (PNHMatchData.length > 1) { // If multiple matches, then
                        var brandParent = -1, pmdTemp, pmdSpecCases, PNHMatchDataHold = PNHMatchData[0].split('|');
                        for (var pmdix=0; pmdix<PNHMatchData.length; pmdix++) {  // For each of the matches,
                            pmdTemp = PNHMatchData[pmdix].split('|');  // Split the PNH data line
                            orderList.push(pmdTemp[ph_order_ix]);  // Add Order number to a list
                            if (pmdTemp[ph_speccase_ix].match(/brandParent(\d{1})/) !== null) {  // If there is a brandParent flag, prioritize by highest match
                                pmdSpecCases = pmdTemp[ph_speccase_ix].match(/brandParent(\d{1})/)[1];
                                if (pmdSpecCases > brandParent) {  // if the match is more specific than the previous ones:
                                    brandParent = pmdSpecCases;  // Update the brandParent level
                                    PNHMatchDataHold = pmdTemp;  // Update the PNH data line
                                    //phlogdev('pmdSpecCases: ' + pmdSpecCases);
                                }
                            } else {  // if any item has no brandParent structure, use highest brandParent match but post an error
                                nsMultiMatch = true;
                            }
                        }
                        PNHMatchData = PNHMatchDataHold;
                    } else {
                        PNHMatchData = PNHMatchData[0].split('|');  // Single match just gets direct split
                    }



                    var priPNHPlaceCat = catTranslate(PNHMatchData[ph_category1_ix]);  // translate primary category to WME code

                    // if the location has multiple matches, then pop an alert that will make a forum post to the thread
                    if (nsMultiMatch) {
                        if (confirm('WMEPH: Multiple matches found!\nDouble check the script changes.\nClick OK to report this situation.') ) {
                            forumMsgInputs = {
                                subject: 'Order Nos. "' + orderList.join(', ') + '" WMEPH Multiple match report',
                                message: 'Error report: PNH Order Nos. "' + orderList.join(', ') + '" are ambiguous multiple matches.\n \nExample Permalink: ' + placePL + ''
                            };
                            WMEPH_errorReport(forumMsgInputs);
                        }
                    }

                    // Check special cases
                    var specCases, scFlag, localURLcheck = '';
                    if (ph_speccase_ix > -1) {  // If the special cases column exists
                        specCases = PNHMatchData[ph_speccase_ix];  // pulls the speccases field from the PNH line
                        if (specCases !== "0" && specCases !== "") {
                            specCases = specCases.replace(/, /g, ",").split(",");  // remove spaces after commas and split by comma
                        }
                        for (var scix = 0; scix < specCases.length; scix++) {
                            // find any button/message flags in the special case (format: buttOn_xyzXyz, etc.)
                            if ( specCases[scix].match(/^buttOn_/g) !== null ) {
                                scFlag = specCases[scix].match(/^buttOn_(.+)/i)[1];
                                bannButt[scFlag].active = true;
                            } else if ( specCases[scix].match(/^buttOff_/g) !== null ) {
                                scFlag = specCases[scix].match(/^buttOff_(.+)/i)[1];
                                bannButt[scFlag].active = false;
                            } else if ( specCases[scix].match(/^messOn_/g) !== null ) {
                                scFlag = specCases[scix].match(/^messOn_(.+)/i)[1];
                                bannButt[scFlag].active = true;
                            } else if ( specCases[scix].match(/^messOff_/g) !== null ) {
                                scFlag = specCases[scix].match(/^messOff_(.+)/i)[1];
                                bannButt[scFlag].active = false;
                            } else if ( specCases[scix].match(/^psOn_/g) !== null ) {
                                scFlag = specCases[scix].match(/^psOn_(.+)/i)[1];
                                bannServ[scFlag].actionOn(actions);
                                bannServ[scFlag].pnhOverride = true;
                            } else if ( specCases[scix].match(/^psOff_/g) !== null ) {
                                scFlag = specCases[scix].match(/^psOff_(.+)/i)[1];
                                bannServ[scFlag].actionOff(actions);
                                bannServ[scFlag].pnhOverride = true;
                            }
                            // parseout localURL data if exists (meaning place can have a URL distinct from the chain URL
                            if ( specCases[scix].match(/^localURL_/g) !== null ) {
                                localURLcheck = specCases[scix].match(/^localURL_(.+)/i)[1];
                            }
                            // parse out optional alt-name
                            if ( specCases[scix].match(/^optionAltName<>(.+)/g) !== null ) {
                                optionalAlias = specCases[scix].match(/^optionAltName<>(.+)/i)[1];
                                if (newAliases.indexOf(optionalAlias) === -1) {
                                    bannButt.addAlias.active = true;
                                }
                            }
                            // Gas Station forceBranding
                            if ( ["GAS_STATION"].indexOf(priPNHPlaceCat) > -1 && specCases[scix].match(/^forceBrand<>(.+)/i) !== null ) {
                                var forceBrand = specCases[scix].match(/^forceBrand<>(.+)/i)[1];
                                if (item.attributes.brand !== forceBrand) {
                                    actions.push(new UpdateObject(item, { brand: forceBrand }));
                                    fieldUpdateObject.brand='#dfd';
                                    phlogdev('Gas brand updated from PNH');
                                }
                            }
                            // Check Localization
                            if ( specCases[scix].match(/^checkLocalization<>(.+)/i) !== null ) {
                                updatePNHName = false;
                                var baseName = specCases[scix].match(/^checkLocalization<>(.+)/i)[1];
                                var baseNameRE = new RegExp(baseName, 'g');
                                if ( newName.match(baseNameRE) === null ) {
                                    bannButt.localizedName.active = true;
                                    if (currentWL.localizedName) {
                                        bannButt.localizedName.WLactive = false;
                                    }
                                    bannButt.PlaceWebsite.value = 'Place Website';
                                    if (ph_displaynote_ix > -1 && PNHMatchData[ph_displaynote_ix] !== '0' && PNHMatchData[ph_displaynote_ix] !== '') {
                                        bannButt.localizedName.message = PNHMatchData[ph_displaynote_ix];
                                    }
                                }
                                showDispNote = false;
                            }

                            // Prevent name change
                            if ( specCases[scix].match(/keepName/g) !== null ) {
                                updatePNHName = false;
                            }

                        }
                    }

                    // If it's a place that also sells fuel, enable the button
                    if ( PNHMatchData[ph_speccase_ix] === 'subFuel' && newName.toUpperCase().indexOf('GAS') === -1 && newName.toUpperCase().indexOf('FUEL') === -1 ) {
                        bannButt.subFuel.active = true;
                        if (currentWL.subFuel) {
                            bannButt.subFuel.WLactive = false;
                        }
                    }

                    // Display any notes for the specific place
                    if (showDispNote && ph_displaynote_ix > -1 && PNHMatchData[ph_displaynote_ix] !== '0' && PNHMatchData[ph_displaynote_ix] !== '' ) {
                        if ( containsAny(specCases,['pharmhours']) ) {
                            if ( item.attributes.description.toUpperCase().indexOf('PHARMACY') === -1 || ( item.attributes.description.toUpperCase().indexOf('HOURS') === -1 && item.attributes.description.toUpperCase().indexOf('HRS') === -1 ) ) {
                                bannButt.specCaseMessage.active = true;
                                bannButt.specCaseMessage.message = PNHMatchData[ph_displaynote_ix];
                            }
                        } else if ( containsAny(specCases,['drivethruhours']) ) {
                            if ( item.attributes.description.toUpperCase().indexOf('DRIVE') === -1 || ( item.attributes.description.toUpperCase().indexOf('HOURS') === -1 && item.attributes.description.toUpperCase().indexOf('HRS') === -1 ) ) {
                                if ( $("#service-checkbox-"+'DRIVETHROUGH').prop('checked') ) {
                                    bannButt.specCaseMessage.active = true;
                                    bannButt.specCaseMessage.message = PNHMatchData[ph_displaynote_ix];
                                } else {
                                    bannButt.specCaseMessageLow.active = true;
                                    bannButt.specCaseMessageLow.message = PNHMatchData[ph_displaynote_ix];
                                }
                            }
                        } else {
                            bannButt.specCaseMessageLow.active = true;
                            bannButt.specCaseMessageLow.message = PNHMatchData[ph_displaynote_ix];
                        }
                    }

                    // Localized Storefinder code:
                    if (ph_sfurl_ix > -1) {  // if the sfurl column exists...
                        if ( ph_sfurllocal_ix > -1 && PNHMatchData[ph_sfurllocal_ix] !== "" && PNHMatchData[ph_sfurllocal_ix] !== "0" ) {
                            if ( !bannButt.localizedName.active ) {
                                bannButt.PlaceWebsite.value = "Store Locator (L)";
                            }
                            var tempLocalURL = PNHMatchData[ph_sfurllocal_ix].replace(/ /g,'').split("<>");
                            var searchStreet = "", searchCity = "", searchState = "";
                            if ("string" === typeof addr.street.name) {
                                searchStreet = addr.street.name;
                            }
                            var searchStreetPlus = searchStreet.replace(/ /g, "+");
                            searchStreet = searchStreet.replace(/ /g, "%20");
                            if ("string" === typeof addr.city.attributes.name) {
                                searchCity = addr.city.attributes.name;
                            }
                            var searchCityPlus = searchCity.replace(/ /g, "+");
                            searchCity = searchCity.replace(/ /g, "%20");
                            if ("string" === typeof addr.state.name) {
                                searchState = addr.state.name;
                            }
                            var searchStatePlus = searchState.replace(/ /g, "+");
                            searchState = searchState.replace(/ /g, "%20");

                            for (var tlix = 1; tlix<tempLocalURL.length; tlix++) {
                                if (tempLocalURL[tlix] === 'ph_streetName') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchStreet;
                                } else if (tempLocalURL[tlix] === 'ph_streetNamePlus') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchStreetPlus;
                                } else if (tempLocalURL[tlix] === 'ph_cityName') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchCity;
                                } else if (tempLocalURL[tlix] === 'ph_cityNamePlus') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchCityPlus;
                                } else if (tempLocalURL[tlix] === 'ph_stateName') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchState;
                                } else if (tempLocalURL[tlix] === 'ph_stateNamePlus') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + searchStatePlus;
                                } else if (tempLocalURL[tlix] === 'ph_state2L') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + myState2L;
                                } else if (tempLocalURL[tlix] === 'ph_latitudeEW') {
                                    //customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS[0];
                                } else if (tempLocalURL[tlix] === 'ph_longitudeNS') {
                                    //customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS[1];
                                } else if (tempLocalURL[tlix] === 'ph_latitudePM') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS.lat;
                                } else if (tempLocalURL[tlix] === 'ph_longitudePM') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS.lon;
                                } else if (tempLocalURL[tlix] === 'ph_latitudePMBuffMin') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + (itemGPS.lat-0.15).toString();
                                } else if (tempLocalURL[tlix] === 'ph_longitudePMBuffMin') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + (itemGPS.lon-0.15).toString();
                                } else if (tempLocalURL[tlix] === 'ph_latitudePMBuffMax') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + (itemGPS.lat+0.15).toString();
                                } else if (tempLocalURL[tlix] === 'ph_longitudePMBuffMax') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + (itemGPS.lon+0.15).toString();
                                } else if (tempLocalURL[tlix] === 'ph_houseNumber') {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + item.attributes.houseNumber;
                                } else {
                                    customStoreFinderLocalURL = customStoreFinderLocalURL + tempLocalURL[tlix];
                                }
                            }
                            if ( customStoreFinderLocalURL.indexOf('http') !== 0 ) {
                                customStoreFinderLocalURL = 'http:\/\/' + customStoreFinderLocalURL;
                            }
                            customStoreFinderLocal = true;
                        } else if (PNHMatchData[ph_sfurl_ix] !== "" && PNHMatchData[ph_sfurl_ix] !== "0") {
                            if ( !bannButt.localizedName.active ) {
                                bannButt.PlaceWebsite.value = "Store Locator";
                            }
                            customStoreFinderURL = PNHMatchData[ph_sfurl_ix];
                            if ( customStoreFinderURL.indexOf('http') !== 0 ) {
                                customStoreFinderURL = 'http:\/\/' + customStoreFinderURL;
                            }
                            customStoreFinder = true;
                        }
                    }

                    // Category translations
                    var altCategories = PNHMatchData[ph_category2_ix];
                    if (altCategories !== "0" && altCategories !== "") {  //  translate alt-cats to WME code
                        altCategories = altCategories.replace(/,[^A-Za-z0-9]*/g, ",").split(",");  // tighten and split by comma
                        for (var catix = 0; catix<altCategories.length; catix++) {
                            var newAltTemp = catTranslate(altCategories[catix]);  // translate altCats into WME cat codes
                            if (newAltTemp === "ERROR") {  // if no translation, quit the loop
                                phlog('Category ' + altCategories[catix] + 'cannot be translated.');
                                return;
                            } else {
                                altCategories[catix] = newAltTemp;  // replace with translated element
                            }
                        }
                    }

                    // name parsing with category exceptions
                    if (["HOTEL"].indexOf(priPNHPlaceCat) > -1) {
                        if (newName.toUpperCase() === PNHMatchData[ph_name_ix].toUpperCase()) {  // If no localization
                            bannButt.catHotel.message = 'Check hotel website for any name localization (e.g. '+ PNHMatchData[ph_name_ix] +' - Tampa Airport).';
                            bannButt.catHotel.active = true;
                            newName = PNHMatchData[ph_name_ix];
                        } else {
                            // Replace PNH part of name with PNH name
                            var splix = newName.toUpperCase().replace(/[-\/]/g,' ').indexOf(PNHMatchData[ph_name_ix].toUpperCase().replace(/[-\/]/g,' ') );
                            if (splix>-1) {
                                var frontText = newName.slice(0,splix);
                                var backText = newName.slice(splix+PNHMatchData[ph_name_ix].length);
                                newName = PNHMatchData[ph_name_ix];
                                if (frontText.length > 0) { newName = frontText + ' ' + newName; }
                                if (backText.length > 0) { newName = newName + ' ' + backText; }
                                newName = newName.replace(/ {2,}/g,' ');
                            } else {
                                newName = PNHMatchData[ph_name_ix];
                            }
                        }
                        if ( altCategories !== "0" && altCategories !== "" ) {  // if PNH alts exist
                            insertAtIX(newCategories, altCategories, 1);  //  then insert the alts into the existing category array after the GS category
                        }
                        if ( newCategories.indexOf('HOTEL') !== 0 ) {  // If no GS category in the primary, flag it
                            bannButt.hotelMkPrim.active = true;
                            if (currentWL.hotelMkPrim) {
                                bannButt.hotelMkPrim.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                        }
                    } else if ( ["BANK_FINANCIAL"].indexOf(priPNHPlaceCat) > -1 && PNHMatchData[ph_speccase_ix].indexOf('notABank') === -1 ) {
                        // PNH Bank treatment
                        ixBank = item.attributes.categories.indexOf("BANK_FINANCIAL");
                        ixATM = item.attributes.categories.indexOf("ATM");
                        ixOffices = item.attributes.categories.indexOf("OFFICES");
                        // if the name contains ATM in it
                        if ( newName.match(/\batm\b/ig) !== null ) {
                            if ( ixOffices === 0 ) {
                                bannButt.bankType1.active = true;
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                                bannButt.bankCorporate.active = true;
                            } else if ( ixBank === -1 && ixATM === -1 ) {
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                            } else if ( ixATM === 0 && ixBank > 0 ) {
                                bannButt.bankBranch.active = true;
                            } else if ( ixBank > -1 ) {
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                            }
                            newName = PNHMatchData[ph_name_ix] + ' ATM';
                            newCategories = insertAtIX(newCategories, 'ATM', 0);
                            // Net result: If the place has ATM cat only and ATM in the name, then it will be green and renamed Bank Name ATM
                        } else if (ixBank > -1  || ixATM > -1) {  // if no ATM in name but with a banking category:
                            if ( ixOffices === 0 ) {
                                bannButt.bankBranch.active = true;
                            } else if ( ixBank > -1  && ixATM === -1 ) {
                                bannButt.addATM.active = true;
                            } else if ( ixATM === 0 && ixBank === -1 ) {
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                            } else if ( ixBank > 0 && ixATM > 0 ) {
                                bannButt.bankBranch.active = true;
                                bannButt.standaloneATM.active = true;
                            }
                            newName = PNHMatchData[ph_name_ix];
                            // Net result: If the place has Bank category first, then it will be green with PNH name replaced
                        } else {  // for PNH match with neither bank type category, make it a bank
                            newCategories = insertAtIX(newCategories, 'BANK_FINANCIAL', 1);
                            bannButt.standaloneATM.active = true;
                            bannButt.bankCorporate.active = true;
                        }// END PNH bank treatment
                    } else if ( ["GAS_STATION"].indexOf(priPNHPlaceCat) > -1 ) {  // for PNH gas stations, don't replace existing sub-categories
                        if ( altCategories !== "0" && altCategories !== "" ) {  // if PNH alts exist
                            insertAtIX(newCategories, altCategories, 1);  //  then insert the alts into the existing category array after the GS category
                        }
                        if ( newCategories.indexOf('GAS_STATION') !== 0 ) {  // If no GS category in the primary, flag it
                            bannButt.gasMkPrim.active = true;
                            lockOK = false;
                        } else {
                            newName = PNHMatchData[ph_name_ix];
                        }
                    } else if (updatePNHName) {  // if not a special category then update the name
                        newName = PNHMatchData[ph_name_ix];
                        newCategories = insertAtIX(newCategories, priPNHPlaceCat,0);
                        if (altCategories !== "0" && altCategories !== "") {
                            newCategories = insertAtIX(newCategories,altCategories,1);
                        }
                    }

                    // *** need to add a section above to allow other permissible categories to remain? (optional)

                    // Parse URL data
                    var localURLcheckRE;
                    if ( localURLcheck !== '') {
                        if (newURL !== null || newURL !== '') {
                            localURLcheckRE = new RegExp(localURLcheck, "i");
                            if ( newURL.match(localURLcheckRE) !== null ) {
                                newURL = normalizeURL(newURL,false);
                            } else {
                                newURL = normalizeURL(PNHMatchData[ph_url_ix],false);
                                bannButt.localURL.active = true;
                            }
                        } else {
                            newURL = normalizeURL(PNHMatchData[ph_url_ix],false);
                            bannButt.localURL.active = true;
                        }
                    } else {
                        newURL = normalizeURL(PNHMatchData[ph_url_ix],false);
                    }
                    // Parse PNH Aliases
                    newAliasesTemp = PNHMatchData[ph_aliases_ix].match(/([^\(]*)/i)[0];
                    if (newAliasesTemp !== "0" && newAliasesTemp !== "") {  // make aliases array
                        newAliasesTemp = newAliasesTemp.replace(/,[^A-za-z0-9]*/g, ",");  // tighten up commas if more than one alias.
                        newAliasesTemp = newAliasesTemp.split(",");  // split by comma
                    }
                    if ( specCases.indexOf('noUpdateAlias') === -1 && (!containsAll(newAliases,newAliasesTemp) && newAliasesTemp !== "0" && newAliasesTemp !== "" && specCases.indexOf('optionName2') === -1 ))  {
                        newAliases = insertAtIX(newAliases,newAliasesTemp,0);
                    }
                    // Enable optional alt-name button
                    if (bannButt.addAlias.active) {
                        bannButt.addAlias.message = "Is there a " + optionalAlias + " at this location?";
                        bannButt.addAlias.title = 'Add ' + optionalAlias;
                    }
                    // update categories if different and no Cat2 option
                    //debug('3126 // About to call uniq() twice inside of harmonizePlaceGo()');
                    if ( !matchSets( uniq(item.attributes.categories),uniq(newCategories) ) ) {
                        if ( specCases.indexOf('optionCat2') === -1 && specCases.indexOf('buttOn_addCat2') === -1 ) {
                            phlogdev("Categories updated" + " with " + newCategories);
                            actions.push(new UpdateObject(item, { categories: newCategories }));
                            //W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
                            fieldUpdateObject.categories='#dfd';
                        } else {  // if second cat is optional
                            phlogdev("Primary category updated with " + priPNHPlaceCat);
                            newCategories = insertAtIX(newCategories, priPNHPlaceCat, 0);
                            actions.push(new UpdateObject(item, { categories: newCategories }));
                            fieldUpdateObject.categories='#dfd';
                        }
                        // Enable optional 2nd category button
                        if (specCases.indexOf('buttOn_addCat2') > -1 && newCategories.indexOf(catTransWaze2Lang[altCategories[0]]) === -1 ) {
                            bannButt.addCat2.message = "Is there a " + catTransWaze2Lang[altCategories[0]] + " at this location?";
                            bannButt.addCat2.title = 'Add ' + catTransWaze2Lang[altCategories[0]];
                        }
                    }

                    // Description update
                    newDescripion = PNHMatchData[ph_description_ix];
                    if (newDescripion !== null && newDescripion !== "0" && item.attributes.description.toUpperCase().indexOf(newDescripion.toUpperCase()) === -1 ) {
                        if ( item.attributes.description !== "" && item.attributes.description !== null && item.attributes.description !== ' ' ) {
                            bannButt.checkDescription.active = true;
                        }
                        phlogdev("Description updated");
                        newDescripion = newDescripion + '\n' + item.attributes.description;
                        actions.push(new UpdateObject(item, { description: newDescripion }));
                        fieldUpdateObject.description='#dfd';
                    }

                    // Special Lock by PNH
                    if (specCases.indexOf('lockAt5') > -1 ) {
                        PNHLockLevel = 4;
                    }


                } else {  // if no PNH match found
                    if (PNHMatchData[0] === "ApprovalNeeded") {
                        //PNHNameTemp = PNHMatchData[1].join(', ');
                        PNHNameTemp = PNHMatchData[1][0];  // Just do the first match
                        PNHNameTempWeb = PNHNameTemp.replace(/\&/g, "%26");
                        PNHNameTempWeb = PNHNameTemp.replace(/\#/g, "%23");
                        PNHNameTempWeb = PNHNameTempWeb.replace(/\//g, "%2F");
                        PNHOrderNum = PNHMatchData[2].join(',');
                    }

                    // Strong title case option for non-PNH places
                    if (newName !== toTitleCaseStrong(newName)) {
                        bannButt.STC.active = true;
                    }

                    newURL = normalizeURL(newURL,true);  // Normalize url

                    // Generic Hotel Treatment
                    if ( newCategories.indexOf("HOTEL") > -1  && newName.indexOf(' - ') === -1 && newName.indexOf(': ') === -1) {
                        bannButt.catHotel.active = true;
                        if (currentWL.hotelLocWL) {
                            bannButt.catHotel.WLactive = false;
                        }
                    }

                    // Generic Bank treatment
                    ixBank = item.attributes.categories.indexOf("BANK_FINANCIAL");
                    ixATM = item.attributes.categories.indexOf("ATM");
                    ixOffices = item.attributes.categories.indexOf("OFFICES");
                    // if the name contains ATM in it
                    if ( newName.match(/\batm\b/ig) !== null ) {
                        if ( ixOffices === 0 ) {
                            bannButt.bankType1.active = true;
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                            bannButt.bankCorporate.active = true;
                        } else if ( ixBank === -1 && ixATM === -1 ) {
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                        } else if ( ixATM === 0 && ixBank > 0 ) {
                            bannButt.bankBranch.active = true;
                        } else if ( ixBank > -1 ) {
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                        }
                        // Net result: If the place has ATM cat only and ATM in the name, then it will be green
                    } else if (ixBank > -1  || ixATM > -1) {  // if no ATM in name:
                        if ( ixOffices === 0 ) {
                            bannButt.bankBranch.active = true;
                        } else if ( ixBank > -1  && ixATM === -1 ) {
                            bannButt.addATM.active = true;
                        } else if ( ixATM === 0 && ixBank === -1 ) {
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                        } else if ( ixBank > 0 && ixATM > 0 ) {
                            bannButt.bankBranch.active = true;
                            bannButt.standaloneATM.active = true;
                        }
                        // Net result: If the place has Bank category first, then it will be green
                    } // END generic bank treatment

                }  // END PNH match/no-match updates

                // Strip/add suffixes
                if ( hpMode.harmFlag && USER_NAME === 'bmtg' )  {
                    var suffixStr = ' - ZQXWCEVRBT';
                    var suffixStrRE = new RegExp(suffixStr, 'i');
                    if ( newName.indexOf(suffixStr) > -1 ) {
                        //newName = newName.replace(suffixStrRE, '');
                    }
                    if ( newName.indexOf(suffixStr) === -1 ) {
                        //newName = newName + suffixStr;
                    }
                }

                // Update name:
                if (hpMode.harmFlag && newName !== item.attributes.name) {
                    phlogdev("Name updated");
                    actions.push(new UpdateObject(item, { name: newName }));
                    //actions.push(new UpdateObject(item, { name: newName }));
                    fieldUpdateObject.name='#dfd';
                }

                // Update aliases
                newAliases = removeSFAliases(newName, newAliases);
                for (naix=0; naix<newAliases.length; naix++) {
                    newAliases[naix] = toTitleCase(newAliases[naix]);
                }
                if (hpMode.harmFlag && newAliases !== item.attributes.aliases && newAliases.length !== item.attributes.aliases.length) {
                    phlogdev("Alt Names updated");
                    actions.push(new UpdateObject(item, { aliases: newAliases }));
                    fieldUpdateObject.aliases='#dfd';
                }

                // Gas station treatment (applies to all including PNH)
                if (newCategories[0] === 'GAS_STATION') {
                    // Brand checking
                    if ( !item.attributes.brand || item.attributes.brand === null || item.attributes.brand === "" ) {
                        bannButt.gasNoBrand.active = true;
                        if (currentWL.gasNoBrand) {
                            bannButt.gasNoBrand.WLactive = false;
                        }
                    } else if (item.attributes.brand === 'Unbranded' ) {  //  Unbranded is not used per wiki
                        bannButt.gasUnbranded.active = true;
                        lockOK = false;
                    } else {
                        var brandNameRegEx = new RegExp('\\b'+item.attributes.brand.toUpperCase().replace(/[ '-]/g,''), "i");
                        if ( newName.toUpperCase().replace(/[ '-]/g,'').match(brandNameRegEx) === null ) {
                            bannButt.gasMismatch.active = true;
                            if (currentWL.gasMismatch) {
                                bannButt.gasMismatch.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                        }
                    }
                    // Add convenience store category to station
                    if (newCategories.indexOf("CONVENIENCE_STORE") === -1 && !bannButt.subFuel.active) {
                        if ( hpMode.harmFlag && $("#WMEPH-ConvenienceStoreToGasStations" + devVersStr).prop('checked') ) {  // Automatic if user has the setting checked
                            newCategories = insertAtIX(newCategories, "CONVENIENCE_STORE", 1);  // insert the C.S. category
                            actions.push(new UpdateObject(item, { categories: newCategories }));
                            fieldUpdateObject.categories='#dfd';
                            phlogdev('Conv. store category added');
                        } else {  // If not checked, then it will be a banner button
                            bannButt.addConvStore.active = true;
                        }
                    }
                }  // END Gas Station Checks

                // Make PNH submission links
                var regionFormURL = '';
                var newPlaceAddon = '';
                var approvalAddon = '';
                var approvalMessage = 'Submitted via WMEPH. PNH order number ' + PNHOrderNum;
                var tempSubmitName = newName.replace(/\&/g,'%26').replace(/\//g, "%2F").replace(/\#/g, "%23");
                if (hpMode.harmFlag) {
                    switch (myPlace.psRegion) {
                        case "NWR": regionFormURL = 'https://docs.google.com/forms/d/1hv5hXBlGr1pTMmo4n3frUx1DovUODbZodfDBwwTc7HE/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "SWR": regionFormURL = 'https://docs.google.com/forms/d/1Qf2N4fSkNzhVuXJwPBJMQBmW0suNuy8W9itCo1qgJL4/viewform';
                            newPlaceAddon = '?entry.1497446659='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.1497446659='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "HI": regionFormURL = 'https://docs.google.com/forms/d/1K7Dohm8eamIKry3KwMTVnpMdJLaMIyDGMt7Bw6iqH_A/viewform';
                            newPlaceAddon = '?entry.1497446659='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.1497446659='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "PLN": regionFormURL = 'https://docs.google.com/forms/d/1ycXtAppoR5eEydFBwnghhu1hkHq26uabjUu8yAlIQuI/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "SCR": regionFormURL = 'https://docs.google.com/forms/d/1KZzLdlX0HLxED5Bv0wFB-rWccxUp2Mclih5QJIQFKSQ/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "TX": regionFormURL = 'https://docs.google.com/forms/d/1x7VM7ofPOKVnWOaX7d70OWXpnVKf6Mkadn4dgYxx4ic/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "GLR": regionFormURL = 'https://docs.google.com/forms/d/19btj-Qt2-_TCRlcS49fl6AeUT95Wnmu7Um53qzjj9BA/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "SAT": regionFormURL = 'https://docs.google.com/forms/d/1bxgK_20Jix2ahbmUvY1qcY0-RmzUBT6KbE5kjDEObF8/viewform';
                            newPlaceAddon = '?entry.2063110249='+tempSubmitName+'&entry.2018912633='+newURLSubmit+'&entry.1924826395='+USER_NAME+gFormState;
                            approvalAddon = '?entry.2063110249='+PNHNameTempWeb+'&entry.123778794='+approvalMessage+'&entry.1924826395='+USER_NAME+gFormState;
                            break;
                        case "SER": regionFormURL = 'https://docs.google.com/forms/d/1jYBcxT3jycrkttK5BxhvPXR240KUHnoFMtkZAXzPg34/viewform';
                            newPlaceAddon = '?entry.822075961='+tempSubmitName+'&entry.1422079728='+newURLSubmit+'&entry.1891389966='+USER_NAME+gFormState;
                            approvalAddon = '?entry.822075961='+PNHNameTempWeb+'&entry.607048307='+approvalMessage+'&entry.1891389966='+USER_NAME+gFormState;
                            break;
                        case "ATR": regionFormURL = 'https://docs.google.com/forms/d/1v7JhffTfr62aPSOp8qZHA_5ARkBPldWWJwDeDzEioR0/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "NER": regionFormURL = 'https://docs.google.com/forms/d/1UgFAMdSQuJAySHR0D86frvphp81l7qhEdJXZpyBZU6c/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "NOR": regionFormURL = 'https://docs.google.com/forms/d/1iYq2rd9HRd-RBsKqmbHDIEBGuyWBSyrIHC6QLESfm4c/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "MAR": regionFormURL = 'https://docs.google.com/forms/d/1PhL1iaugbRMc3W-yGdqESoooeOz-TJIbjdLBRScJYOk/viewform';
                            newPlaceAddon = '?entry.925969794='+tempSubmitName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+USER_NAME+gFormState;
                            approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+USER_NAME+gFormState;
                            break;
                        case "CA_EN": regionFormURL = 'https://docs.google.com/forms/d/13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws/viewform';
                            newPlaceAddon = '?entry_839085807='+tempSubmitName+'&entry_1067461077='+newURLSubmit;
                            approvalAddon = '?entry_839085807='+PNHNameTempWeb+'&entry_1125435193='+approvalMessage;
                            break;
                        case "QC": regionFormURL = 'https://docs.google.com/forms/d/13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws/viewform';
                            newPlaceAddon = '?entry_839085807='+tempSubmitName+'&entry_1067461077='+newURLSubmit;
                            approvalAddon = '?entry_839085807='+PNHNameTempWeb+'&entry_1125435193='+approvalMessage;
                            break;
                        default: regionFormURL = "";
                    }
                    newPlaceURL = regionFormURL + newPlaceAddon;
                    approveRegionURL = regionFormURL + approvalAddon;
                }

                // NOTE: Some of this code can run once instead of happening every time harmonizePlaceGo() gets called.
                // Category/Name-based Services, added to any existing services:


                // NOTE: We are inside harmonizePlaceGo()
                // NOTE: This code checks the servKeys and such to enable services.
                // Rewrite
                for (var i = 0, len = newCategories.length; i < len; i++) {
                    var catName = newCategories[i];
                    if (NA_CAT_DATA.hasOwnProperty(catName)) {
                        for (var service in WME_SERVICE_MAP) {
                            var act = WME_SERVICE_MAP[service].action;
                            if (!bannServ[act].pnhOverride) {
                                var flag = NA_CAT_DATA[catName].services[service];
                                if (flag === 1) {
                                    bannServ[act].active = true;
                                    if (hpMode.harmFlag && $("#WMEPH-EnableServices" + devVersStr).prop('checked')) {
                                        // Automatically enable new services
                                        bannServ[act].actionOn(actions);
                                    }
                                } else if (flag === 2) {  // these are never automatically added but shown
                                    bannServ[act].active = true;
                                } else if (typeof(flag) === "object") {  // Check for state/region auto add
                                    bannServ[act].active = true;
                                    if ( hpMode.harmFlag && $("#WMEPH-EnableServices" + devVersStr).prop('checked')) {
                                        // If the sheet data matches the state or region, then auto add
                                        if (isMemberOfRegion(myState, flag) || isMemberOfRegion(myCountry, flag)) {
                                            bannServ[act].actionOn(actions);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // PNH specific Services:

                // ### remove unnecessary parent categories (Restaurant doesn't need food and drink)
                if ( hpMode.harmFlag && newCategories.indexOf('FOOD_AND_DRINK') > -1 ) {
                    if (newCategories.indexOf('RESTAURANT') > -1 || newCategories.indexOf('FAST_FOOD') > -1 ) {
                        newCategories.splice(newCategories.indexOf('FOOD_AND_DRINK'),1);  // remove Food/Drink Cat
                        actions.push(new UpdateObject(item, { categories: newCategories }));
                        fieldUpdateObject.categories='#dfd';
                    }
                }

                var isPoint = item.isPoint();
                var isArea = item.is2D();
                var maxPointSeverity = 0;
                var maxAreaSeverity = 3;

                // Area vs. Place checking, Category locking, and category-based messaging
                // NOTE: Since we have to keep looping through categories, maybe see about combining actions inside of the same loops.
                // NOTE: If it gets too complicated, the code should probably be segregated into other functions and then called within the same loop.
                for (var i = 0, len = newCategories.length; i < len; i++) {
                    var catName = newCategories[i];
                    if (NA_CAT_DATA.hasOwnProperty(catName)) {
                        var myCat       = NA_CAT_DATA[catName];
                        var pvaPoint    = myCat.pcPoint,
                            pvaArea     = myCat.pcArea,
                            regPoint    = myCat.pcRegPoint,
                            regArea     = myCat.pcRegArea,
                            pcMessage   = myCat.pcMessage,
                            pcLockTemp,
                            pcRare      = myCat.pcRare,
                            pcParent    = myCat.pcParent;

                        // Determine regional overrides for Point vs Area
                        if (isMemberOfRegion(myState, regPoint) || isMemberOfRegion(myCountry, regPoint)) {
                            pvaPoint = '1';
                            pvaArea = '';
                        } else if (isMemberOfRegion(myState, regArea) || isMemberOfRegion(myCountry, regArea)) {
                            pvaPoint = '';
                            pvaArea = '1';
                        }

                        var pointSeverity = getPvaSeverity(pvaPoint);
                        var areaSeverity = getPvaSeverity(pvaArea);

                        if (isPoint && pointSeverity > 0) {
                            maxPointSeverity = Math.max(pointSeverity, maxPointSeverity);
                        } else if (isArea) {
                            maxAreaSeverity = Math.min(areaSeverity, maxAreaSeverity);
                        }
                    }
                }

                if (isPoint) {
                    if (maxPointSeverity === 3) {
                        bannButt.areaNotPoint.active = true;
                        if (currentWL.areaNotPoint) {
                            bannButt.areaNotPoint.WLactive = false;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxPointSeverity === 2) {
                        bannButt.areaNotPointMid.active = true;
                        if (currentWL.areaNotPoint) {
                            bannButt.areaNotPointMid.WLactive = false;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxPointSeverity === 1) {
                        bannButt.areaNotPointLow.active = true;
                        if (currentWL.areaNotPoint) {
                            bannButt.areaNotPointLow.WLactive = false;
                        }
                    }
                } else {
                    if (maxAreaSeverity === 3) {
                        bannButt.pointNotArea.active = true;
                        if (currentWL.pointNotArea) {
                            bannButt.pointNotArea.WLactive = false;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxAreaSeverity === 2) {
                        bannButt.pointNotAreaMid.active = true;
                        if (currentWL.pointNotArea) {
                            bannButt.pointNotAreaMid.WLactive = false;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxAreaSeverity === 1) {
                        bannButt.areaNotPointLow.active = true;
                        if (currentWL.pointNotArea) {
                            bannButt.pointNotAreaLow.WLactive = false;
                        }
                    }
                }


                // Display any messaged regarding the category
                if (pcMessage && pcMessage !== '0' && pcMessage !== '') {
                    bannButt.pnhCatMess.active = true;
                    bannButt.pnhCatMess.message = pcMessage;
                }

                // Unmapped categories
                if (isMemberOfRegion(myState, pcRare) || isMemberOfRegion(myCountry, pcRare)) {
                    bannButt.unmappedRegion.active = true;
                    if (currentWL.unmappedRegion) {
                        bannButt.unmappedRegion.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                }

                // Parent Category
                if (isMemberOfRegion(myState, pcParent) || isMemberOfRegion(myCountry, pcParent)) {
                    bannButt.parentCategory.active = true;
                    if (currentWL.parentCategory) {
                        bannButt.parentCategory.WLactive = false;
                    }
                }

                // Set lock level
                for (var i = 1; i < 6; i++) {
                    pcLockTemp = myCat['pcLock'+i];
                    if (isMemberOfRegion(myState, pcLockTemp) || isMemberOfRegion(myCountry, pcLockTemp)) {
                        defaultLock = i - 1;  // Offset by 1 since lock ranks start at 0
                        break;
                    }
                }


                var anpNone = collegeAbbreviations.split('|'), anpNoneRE;
                for (var cii=0; cii<anpNone.length; cii++) {
                    anpNoneRE = new RegExp('\\b'+anpNone[cii]+'\\b', 'g');
                    if ( newName.match( anpNoneRE) !== null ) {
                        bannButt.areaNotPointLow.severity = 0;
                        bannButt.areaNotPointLow.WLactive = false;
                    }
                }



                // Check for missing hours field
                if (item.attributes.openingHours.length === 0) {  // if no hours...
                    if (!containsAny(newCategories,["STADIUM_ARENA","CEMETERY","MILITARY","TRANSPORTATION","FERRY_PIER","SUBWAY_STATION",
                                                    "BRIDGE","TUNNEL","JUNCTION_INTERCHANGE","ISLAND","SEA_LAKE_POOL","RIVER_STREAM","FOREST_GROVE","CANAL","SWAMP_MARSH","DAM"]) ) {
                        bannButt.noHours.active = true;
                        if (currentWL.noHours) {
                            bannButt.noHours.WLactive = false;
                        }
                        if ( containsAny(newCategories,["SCHOOL","CONVENTIONS_EVENT_CENTER","CAMPING_TRAILER_PARK","COTTAGE_CABIN","COLLEGE_UNIVERSITY","GOLF_COURSE","SPORTS_COURT","MOVIE_THEATER","SHOPPING_CENTER","RELIGIOUS_CENTER","PARKING_LOT","PARK","PLAYGROUND","AIRPORT","FIRE_DEPARTMENT","POLICE_STATION","SEAPORT_MARINA_HARBOR","FARM"]) ) {
                            bannButt.noHours.severity = 0;
                            bannButt.noHours.WLactive = false;
                        }
                    }
                    if (hpMode.hlFlag && $("#WMEPH-DisableHoursHL" + devVersStr).prop('checked')) {
                        bannButt.noHours.severity = 0;
                    }
                } else {
                    if (item.attributes.openingHours.length === 1) {  // if one set of hours exist, check for partial 24hrs setting
                        if (item.attributes.openingHours[0].days.length < 7 && item.attributes.openingHours[0].fromHour==='00:00' &&
                            (item.attributes.openingHours[0].toHour==='00:00' || item.attributes.openingHours[0].toHour==='23:59' ) ) {
                            bannButt.mismatch247.active = true;
                        }
                    }
                    bannButt.noHours.active = true;
                    bannButt.noHours.value = 'Add hours';
                    bannButt.noHours.severity = 0;
                    bannButt.noHours.WLactive = false;
                    bannButt.noHours.message = 'Hours: <input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste'+devVersStr+'" style="width:170px;padding-left:3px;color:#AAA">';
                }
                if ( !checkHours(item.attributes.openingHours) ) {
                    //phlogdev('Overlapping hours');
                    bannButt.hoursOverlap.active = true;
                    bannButt.noHours.active = true;
                } else {
                    var tempHours = item.attributes.openingHours.slice(0);
                    for ( var ohix=0; ohix<item.attributes.openingHours.length; ohix++ ) {
                        if ( tempHours[ohix].days.length === 2 && tempHours[ohix].days[0] === 1 && tempHours[ohix].days[1] === 0) {
                            // separate hours
                            phlogdev('Correcting M-S entry...');
                            tempHours.push({days: [0], fromHour: tempHours[ohix].fromHour, toHour: tempHours[ohix].toHour});
                            tempHours[ohix].days = [1];
                            actions.push(new UpdateObject(item, { openingHours: tempHours }));
                        }
                    }
                }

                // Highlight 24/7 button if hours are set that way, and add button for all places
                if ( item.attributes.openingHours.length === 1 && item.attributes.openingHours[0].days.length === 7 && item.attributes.openingHours[0].fromHour === '00:00' && item.attributes.openingHours[0].toHour ==='00:00' ) {
                    bannServ.add247.checked = true;
                }
                bannServ.add247.active = true;

                // URL updating
                var updateURL = true;
                if (newURL !== item.attributes.url && newURL !== "" && newURL !== "0") {
                    if ( PNHNameRegMatch && item.attributes.url !== null && item.attributes.url !== '' ) {  // for cases where there is an existing URL in the WME place, and there is a PNH url on queue:
                        var newURLTemp = normalizeURL(newURL,true);  // normalize
                        var itemURL = normalizeURL(item.attributes.url,true);
                        newURLTemp = newURLTemp.replace(/^www\.(.*)$/i,'$1');  // strip www
                        var itemURLTemp = itemURL.replace(/^www\.(.*)$/i,'$1');  // strip www
                        if ( newURLTemp !== itemURLTemp ) { // if formatted URLs don't match, then alert the editor to check the existing URL
                            bannButt.longURL.active = true;
                            if (currentWL.longURL) {
                                bannButt.longURL.WLactive = false;
                            }
                            bannButt.PlaceWebsite.value = "Place Website";
                            if (hpMode.harmFlag && updateURL && itemURL !== item.attributes.url) {  // Update the URL
                                phlogdev("URL formatted");
                                actions.push(new UpdateObject(item, { url: itemURL }));
                                fieldUpdateObject.url='#dfd';
                            }
                            updateURL = false;
                            tempPNHURL = newURL;
                        }
                    }
                    if (hpMode.harmFlag && updateURL && newURL !== item.attributes.url) {  // Update the URL
                        phlogdev("URL updated");
                        actions.push(new UpdateObject(item, { url: newURL }));
                        fieldUpdateObject.url='#dfd';
                    }
                }

                // Phone formatting
                var outputFormat = "{0}-{1}-{2}";
                switch (Number(myPlace.psPhoneFormat)) {
                    case 1:
                        outputFormat = "+1-{0}-{1}-{2}";
                        break;
                    case 2:
                        outputFormat = "({0}) {1}-{2}";
                        break;
                    default:
                        outputFormat = "{0}-{1}-{2}";
                }

                newPhone = normalizePhone(item.attributes.phone, outputFormat, 'existing');

                // Check if valid area code  #LOC# USA and CAN only
                if (myCountry2L === "US" || myCountry2L === "CA") {
                    if (newPhone !== null && newPhone.match(/[2-9]\d{2}/) !== null) {
                        var areaCode = newPhone.match(/[2-9]\d{2}/)[0];
                        if ( areaCodeList.indexOf(areaCode) === -1 ) {
                            bannButt.badAreaCode.active = true;
                            if (currentWL.aCodeWL) {
                                bannButt.badAreaCode.WLactive = false;
                            }
                        }
                    }
                }
                if (hpMode.harmFlag && newPhone !== item.attributes.phone) {
                    phlogdev("Phone updated");
                    actions.push(new UpdateObject(item, {phone: newPhone}));
                    fieldUpdateObject.phone='#dfd';
                }

                // Post Office cat check
                if (newCategories.indexOf("POST_OFFICE") > -1 && myCountry2L === "US" ) {
                    var USPSStrings = ['USPS','POSTOFFICE','USPOSTALSERVICE','UNITEDSTATESPOSTALSERVICE','USPO','USPOSTOFFICE','UNITEDSTATESPOSTOFFICE','UNITEDSTATESPOSTALOFFICE'];
                    var USPSMatch = false;
                    for (var uspix=0; uspix<USPSStrings.length; uspix++) {
                        if ( newName.toUpperCase().replace(/[ \/\-\.]/g,'').indexOf(USPSStrings[uspix]) > -1 ) {  // If it already has a USPS type term in the name, don't add the option
                            USPSMatch = true;
                            customStoreFinderURL = "https://tools.usps.com/go/POLocatorAction.action";
                            customStoreFinder = true;
                            if (hpMode.harmFlag && myPlace.psRegion === 'SER' && item.attributes.aliases.indexOf("United States Postal Service") === -1) {
                                actions.push(new UpdateObject(item, { aliases: ["United States Postal Service"], url: 'www.usps.com' }));
                                fieldUpdateObject.aliases='#dfd';
                                fieldUpdateObject.url='#dfd';
                                phlogdev('USPS alt name added');
                            }
                            if ( newName.indexOf(' - ') === -1 && newName.indexOf(': ') === -1 ) {
                                bannButt.formatUSPS.active = true;
                            }
                            break;
                        }
                    }
                    if (!USPSMatch) {
                        lockOK = false;
                        bannButt.isitUSPS.active = true;
                        bannButt.catPostOffice.active = true;
                    }
                }  // END Post Office category check

            }  // END if (!residential && has name)

            // Name check
            if ( !item.attributes.residential && ( !newName || newName.replace(/[^A-Za-z0-9]/g,'').length === 0 )) {
                if (item.attributes.categories[0] === 'PARKING_LOT') {
                    if (currentWL.plaNameMissing) {
                        bannButt.plaNameMissing.active = false;
                    } else {
                        bannButt.plaNameMissing.active = true;
                    }
                } else if ( 'ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                    bannButt.nameMissing.active = true;
                    lockOK = false;
                }
            }

            // House number check
            if (!item.attributes.houseNumber || item.attributes.houseNumber.replace(/\D/g,'').length === 0 ) {
                if ( 'BRIDGE|ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL|DAM|TUNNEL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                    if (myState2L === 'RQ') {
                        bannButt.hnMissing.active = true;
                        bannButt.hnMissing.severity = 0;
                    } else {
                        bannButt.hnMissing.active = true;
                        if (currentWL.HNWL) {
                            bannButt.hnMissing.WLactive = false;
                        } else {
                            lockOK = false;
                        }
                    }
                }
            } else if (item.attributes.houseNumber) {
                var hnOK = false, updateHNflag = false;
                var hnTemp = item.attributes.houseNumber.replace(/[^\d]/g, '');  // Digits only
                var hnTempDash = item.attributes.houseNumber.replace(/[^\d-]/g, '');  // Digits and dashes only
                if ( hnTemp < 1000000 && myState2L === "NY" && addr.city.attributes.name === 'Queens' && hnTempDash.match(/^\d{1,4}-\d{1,4}$/g) !== null ) {
                    updateHNflag = true;
                    hnOK = true;
                }
                if (hnTemp === item.attributes.houseNumber && hnTemp < 1000000) {  //  general check that HN is 6 digits or less, & that it is only [0-9]
                    hnOK = true;
                }
                if (myState2L === "HI" && hnTempDash.match(/^\d{1,2}-\d{1,4}$/g) !== null) {
                    if (hnTempDash === hnTempDash.match(/^\d{1,2}-\d{1,4}$/g)[0]) {
                        hnOK = true;
                    }
                }

                if (!hnOK) {
                    bannButt.hnNonStandard.active = true;
                    if (currentWL.hnNonStandard) {
                        bannButt.hnNonStandard.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                }
                if ( updateHNflag ) {
                    bannButt.hnDashRemoved.active = true;
                    if (hpMode.harmFlag) {
                        actions.push(new UpdateObject(item, { houseNumber: hnTemp }));
                        fieldUpdateObject.address='#dfd';
                    } else if (hpMode.hlFlag) {
                        if (item.attributes.residential) {
                            bannButt.hnDashRemoved.severity = 3;
                        } else {
                            bannButt.hnDashRemoved.severity = 1;
                        }
                    }
                }
            }

            if ((!addr.street || addr.street.isEmpty) && 'BRIDGE|ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL|DAM|TUNNEL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                bannButt.streetMissing.active = true;
                lockOK = false;
            }
            if ((!addr.city || addr.city.attributes.isEmpty) && 'BRIDGE|ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL|DAM|TUNNEL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                bannButt.cityMissing.active = true;
                if (item.attributes.residential && hpMode.hlFlag) {
                    bannButt.cityMissing.severity = 1;
                }
                lockOK = false;
            }

            // CATEGORY vs. NAME checks
            var testName = newName.toLowerCase().replace(/[^a-z]/g,' ');
            var testNameWords = testName.split(' ');
            // Hopsital vs. Name filter
            if (newCategories.indexOf("HOSPITAL_MEDICAL_CARE") > -1 && NON_HOSPITAL_PART_MATCH.length > 0) {
                var hpmMatch = false;
                if (containsAny(testNameWords,ANIMAL_FULL_MATCH)) {
                    bannButt.changeHMC2PetVet.active = true;
                    if (currentWL.changeHMC2PetVet) {
                        bannButt.changeHMC2PetVet.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                    bannButt.pnhCatMess.active = false;
                } else if (containsAny(testNameWords,NON_HOSPITAL_FULL_MATCH)) {
                    bannButt.changeHMC2Office.active = true;
                    if (currentWL.changeHMC2Office) {
                        bannButt.changeHMC2Office.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                    bannButt.pnhCatMess.active = false;
                } else {
                    for (var apmix=0; apmix<ANIMAL_PART_MATCH.length; apmix++) {
                        if (testName.indexOf(ANIMAL_PART_MATCH[apmix]) > -1) {
                            bannButt.changeHMC2PetVet.active = true;
                            if (currentWL.changeHMC2PetVet) {
                                bannButt.changeHMC2PetVet.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                            hpmMatch = true;  // don't run the human check if animal is found.
                            bannButt.pnhCatMess.active = false;
                            break;
                        }
                    }
                    if (!hpmMatch) {  // don't run the human check if animal is found.
                        for (var hpmix=0; hpmix<NON_HOSPITAL_PART_MATCH.length; hpmix++) {
                            if (testName.indexOf(NON_HOSPITAL_PART_MATCH[hpmix]) > -1) {
                                bannButt.changeHMC2Office.active = true;
                                if (currentWL.changeHMC2Office) {
                                    bannButt.changeHMC2Office.WLactive = false;
                                } else {
                                    lockOK = false;
                                }
                                bannButt.pnhCatMess.active = false;
                                break;
                            }
                        }
                    }
                }
            }  // END HOSPITAL/Name check

            // School vs. Name filter
            if (newCategories.indexOf("SCHOOL") > -1 && SCHOOL_PART_MATCH.length>0) {
                if (containsAny(testNameWords,SCHOOL_FULL_MATCH)) {
                    bannButt.changeSchool2Offices.active = true;
                    if (currentWL.changeSchool2Offices) {
                        bannButt.changeSchool2Offices.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                    bannButt.pnhCatMess.active = false;
                } else {
                    for (var schix=0; schix<SCHOOL_PART_MATCH.length; schix++) {
                        if (testName.indexOf(SCHOOL_PART_MATCH[schix]) > -1) {
                            bannButt.changeSchool2Offices.active = true;
                            if (currentWL.changeSchool2Offices) {
                                bannButt.changeSchool2Offices.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                            bannButt.pnhCatMess.active = false;
                            break;
                        }
                    }
                }
            }  // END SCHOOL/Name check

            // Some cats don't need PNH messages and url/phone severities
            if ( 'BRIDGE|FOREST_GROVE|DAM|TUNNEL|CEMETERY'.split('|').indexOf(item.attributes.categories[0]) > -1 ) {
                bannButt.NewPlaceSubmit.active = false;
                bannButt.phoneMissing.severity = 0;
                bannButt.phoneMissing.WLactive = false;
                bannButt.urlMissing.severity = 0;
                bannButt.urlMissing.WLactive = false;
            }
            // Some cats don't need PNH messages and url/phone messages
            if ( 'ISLAND|SEA_LAKE_POOL|RIVER_STREAM|CANAL'.split('|').indexOf(item.attributes.categories[0]) > -1 ) {
                bannButt.NewPlaceSubmit.active = false;
                bannButt.phoneMissing.active = false;
                bannButt.urlMissing.active = false;
            }


            // *** Rest Area parsing
            // check rest area name against standard formats or if has the right categories

            // ****************************************************************************************************
            // 1/2/2017 (mapomatic) Technically, TRANSPORTATION should be the 1st category according to the wiki,
            // but due to a bug in WME, we can't force that.  I've temporarily changed the check for TRANSPORTATION
            // and SCENIC_LOOKOUT_VIEWPOINT to be < 2 instead of === 0 and === 1, respectively.
            // ****************************************************************************************************
            var transCatIndex = categories.indexOf('TRANSPORTATION');
            var lookoutCatIndex = categories.indexOf('SCENIC_LOOKOUT_VIEWPOINT');
            if ( /rest area/i.test(newName) || /rest stop/i.test(newName) || /service plaza/i.test(newName) ||
                ( transCatIndex > -1 && lookoutCatIndex > -1 ) ) {
                if ( transCatIndex < 2 && transCatIndex > -1 && lookoutCatIndex < 2 && lookoutCatIndex > -1 ) {

                    if ( item.isPoint() ) {  // needs to be area
                        bannButt.areaNotPoint.active = true;
                    }
                    bannButt.pointNotArea.active = false;
                    bannButt.unmappedRegion.active = false;

                    if ( categories.indexOf('GAS_STATION') > -1 ) {
                        bannButt.restAreaGas.active = true;
                    }

                    if ( newName.match(/^Rest Area.* \- /) === null ) {
                        bannButt.restAreaName.active = true;
                        if (currentWL.restAreaName) {
                            bannButt.restAreaName.WLactive = false;
                        }
                    } else {
                        newName = newName.replace(/Mile/i, 'mile');
                        if (hpMode.harmFlag) {
                            if (newName !== item.attributes.name) {
                                actions.push(new UpdateObject(item, { name: newName }));
                                fieldUpdateObject.name='#dfd';
                                phlogdev('Lower case "mile"');
                            } else {
                                // The new name matches the original name, so the only change would have been to capitalize "Mile", which
                                // we don't want. So remove any previous name-change action.  Note: this feels like a hack and is probably
                                // a fragile workaround.  The name shouldn't be capitalized in the first place, unless necessary.
                                for (var i=0; i<actions.length; i++) {
                                    var action = actions[i];
                                    if (action.newAttributes.name) {
                                        actions.splice(i,1);
                                        fieldUpdateObject.name='';
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // switch to rest area wiki button
                    bannButt2.restAreaWiki.active = true;
                    bannButt2.placesWiki.active = false;

                    // missing address ok
                    bannButt.streetMissing.active = false;
                    bannButt.cityMissing.active = false;
                    bannButt.hnMissing.active = false;
                    bannButt.urlMissing.severity = 0;
                    bannButt.phoneMissing.severity = 0;
                    //assembleBanner();


                } else {
                    bannButt.restAreaSpec.active = true;
                    if (currentWL.restAreaName) {
                        bannButt.restAreaSpec.WLactive = false;
                    } else {
                        bannButt.pointNotArea.active = false;
                    }
                }
            }

            // update Severity for banner messages
            for (var bannKey in bannButt) {
                if (bannButt.hasOwnProperty(bannKey) && bannButt[bannKey].active) {
                    severityButt = Math.max(bannButt[bannKey].severity, severityButt);
                }
            }

            if (hpMode.harmFlag) {
                phlogdev('Severity: '+severityButt+'; lockOK: '+lockOK);
            }
            // Place locking
            // final formatting of desired lock levels
            var hlLockFlag = false, levelToLock;
            if (PNHLockLevel !== -1 && hpMode.harmFlag) {
                phlogdev('PNHLockLevel: '+PNHLockLevel);
                levelToLock = PNHLockLevel;
            } else {
                levelToLock = defaultLock;
            }
            if (myPlace.psRegion === "SER") {
                if (newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && newCategories.indexOf("PARKING_LOT") > -1) {
                    levelToLock = lockLevel4;
                } else if ( item.isPoint() && newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && newCategories.indexOf("HOSPITAL_MEDICAL_CARE") === -1 ) {
                    levelToLock = lockLevel4;
                }
            }

            if (levelToLock > (USER_RANK - 1)) {levelToLock = (USER_RANK - 1);}  // Only lock up to the user's level
            if ( lockOK && severityButt < 2) {
                // Campus project exceptions
                if ( item.attributes.lockRank < levelToLock) {
                    if (hpMode.harmFlag) {
                        phlogdev("Venue locked!");
                        actions.push(new UpdateObject(item, { lockRank: levelToLock }));
                        fieldUpdateObject.lockRank='#dfd';
                    } else if (hpMode.hlFlag) {
                        hlLockFlag = true;
                    }
                }
                bannButt.placeLocked.active = true;
            }

            //IGN check
            if (!item.attributes.residential && item.attributes.updatedBy && W.model.users.get(item.attributes.updatedBy) &&
                W.model.users.get(item.attributes.updatedBy).userName && W.model.users.get(item.attributes.updatedBy).userName.match(/^ign_/i) !== null) {
                bannButt.ignEdited.active = true;
            }

            //waze_maint_bot check
            if (!item.attributes.residential && item.attributes.updatedBy && W.model.users.get(item.attributes.updatedBy) &&
                W.model.users.get(item.attributes.updatedBy).userName && W.model.users.get(item.attributes.updatedBy).userName.match(/^waze-maint-bot|waze3rdparty|WazeParking1|admin|avsus/i) !== null) {
                bannButt.wazeBot.active = true;
            }

            // RPP Locking option for R3+
            if (item.attributes.residential) {
                if (IS_DEV_USER || IS_BETA_USER || USER_RANK >= 3) {  // Allow residential point locking by R3+
                    RPPLockString = 'Lock at <select id="RPPLockLevel">';
                    var ddlSelected = false;
                    for (var llix=1; llix<6; llix++) {
                        if (llix < USER_RANK+1) {
                            if ( !ddlSelected && (defaultLock === llix - 1 || llix === USER_RANK) ) {
                                RPPLockString += '<option value="'+llix+'" selected="selected">'+llix+'</option>';
                                ddlSelected = true;
                            } else {
                                RPPLockString += '<option value="'+llix+'">'+llix+'</option>';
                            }
                        }
                    }
                    RPPLockString += '</select>';
                    bannButt.lockRPP.message = 'Current lock: '+ (parseInt(item.attributes.lockRank)+1) +'. '+RPPLockString+' ?';
                    bannButt.lockRPP.active = true;
                }
            }

            // Turn off unnecessary buttons
            if (item.attributes.categories.indexOf('PHARMACY') > -1) {
                bannButt.addPharm.active = false;
            }
            if (item.attributes.categories.indexOf('SUPERMARKET_GROCERY') > -1) {
                bannButt.addSuper.active = false;
            }

            // Final alerts for non-severe locations
            if ( !item.attributes.residential && severityButt < 3) {
                var nameShortSpace = newName.toUpperCase().replace(/[^A-Z \']/g, '');
                if ( nameShortSpace.indexOf("'S HOUSE") > -1 || nameShortSpace.indexOf("'S HOME") > -1 || nameShortSpace.indexOf("'S WORK") > -1) {
                    if ( !containsAny(newCategories,['RESTAURANT','DESSERT','BAR']) && !PNHNameRegMatch ) {
                        bannButt.resiTypeNameSoft.active = true;
                    }
                }
                if ( ["HOME","MY HOME","HOUSE","MY HOUSE","PARENTS HOUSE","CASA","MI CASA","WORK","MY WORK","MY OFFICE","MOMS HOUSE","DADS HOUSE","MOM","DAD"].indexOf( nameShortSpace ) > -1 ) {
                    bannButt.resiTypeName.active = true;
                    if (currentWL.resiTypeName) {
                        bannButt.resiTypeName.WLactive = false;
                    }
                    bannButt.resiTypeNameSoft.active = false;
                }
                if ( item.attributes.description.toLowerCase().indexOf('google') > -1 || item.attributes.description.toLowerCase().indexOf('yelp') > -1 ) {
                    bannButt.suspectDesc.active = true;
                    if (currentWL.suspectDesc) {
                        bannButt.suspectDesc.WLactive = false;
                    }
                }

                // ### Review the ones below here
                /*
                if (newName === "UPS") {
                    sidebarMessageOld.push("If this is a 'UPS Store' location, please change the name to The UPS Store and run the script again.");
                    severity = Math.max(1, severity);
                }
                if (newName === "FedEx") {
                    sidebarMessageOld.push("If this is a FedEx Office location, please change the name to FedEx Office and run the script again.");
                    severity = Math.max(1, severity);
                }
                */

            }

            // Return severity for highlighter (no dupe run))
            if (hpMode.hlFlag) {
                // get severities from the banners
                severityButt = 0;
                for ( var tempKey in bannButt ) {
                    if ( bannButt.hasOwnProperty(tempKey) && bannButt[tempKey].hasOwnProperty('active') && bannButt[tempKey].active ) {  //  If the particular message is active
                        if ( bannButt[tempKey].hasOwnProperty('WLactive') ) {
                            if ( bannButt[tempKey].WLactive ) {  // If there's a WL option, enable it
                                severityButt = Math.max(bannButt[tempKey].severity, severityButt);
                                //                                if ( bannButt[tempKey].severity > 0) {
                                //                                    phlogdev('Issue with '+item.attributes.name+': '+tempKey);
                                //                                    phlogdev('Severity: '+bannButt[tempKey].severity);
                                //                                }
                            }
                        } else {
                            severityButt = Math.max(bannButt[tempKey].severity, severityButt);
                            //                            if ( bannButt[tempKey].severity > 0) {
                            //                                phlogdev('Issue with '+item.attributes.name+': '+tempKey);
                            //                                phlogdev('Severity: '+bannButt[tempKey].severity);
                            //                            }
                        }
                    }

                }
                //phlogdev('calculated in harmGo: ' +severityButt + '; ' + item.attributes.name);

                // Special case flags
                if (  item.attributes.lockRank < levelToLock && (item.attributes.categories.indexOf("HOSPITAL_MEDICAL_CARE") > -1 || item.attributes.categories.indexOf("GAS_STATION") > -1) ) {
                    severityButt = 5;
                }

                if ( severityButt === 0 && hlLockFlag ) {
                    severityButt = 'lock';
                }
                if ( severityButt === 1 && hlLockFlag ) {
                    severityButt = 'lock1';
                }
                if ( item.attributes.adLocked ) {
                    severityButt = 'adLock';
                }

                return severityButt;
            }

            // *** Below here is for harmonization only.  HL ends in previous step.

            // Run nearby duplicate place finder function
            var dupeBannMess = '', dupesFound = false;
            dupeHNRangeList = [];
            bannDupl = {};
            if (newName.replace(/[^A-Za-z0-9]/g,'').length > 0 && !item.attributes.residential) {
                if ( $("#WMEPH-DisableDFZoom" + devVersStr).prop('checked') ) {  // don't zoom and pan for results outside of FOV
                    duplicateName = findNearbyDuplicate(newName, newAliases, item, false);
                } else {
                    duplicateName = findNearbyDuplicate(newName, newAliases, item, true);
                }
                if (duplicateName[1]) {
                    bannButt.overlapping.active = true;
                }
                duplicateName = duplicateName[0];
                if (duplicateName.length > 0) {
                    if (duplicateName.length+1 !== dupeIDList.length && IS_DEV_USER) {  // If there's an issue with the data return, allow an error report
                        if (confirm('WMEPH: Dupefinder Error!\nClick OK to report this') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                            forumMsgInputs = {
                                subject: 'WMEPH Bug report DupeID',
                                message: 'Script version: ' + WMEPH_VERSION_LONG + devVersStr + '\nPermalink: ' + placePL + '\nPlace name: ' + item.attributes.name + '\nCountry: ' + addr.country.name + '\n--------\nDescribe the error:\nDupeID mismatch with dupeName list'
                            };
                            WMEPH_errorReport(forumMsgInputs);
                        }
                    } else {
                        dupesFound = true;
                        dupeBannMess = 'Possible duplicate: ';
                        if (duplicateName.length > 1) {
                            dupeBannMess = 'Possible duplicates: ';
                        }
                        for (var ijx=1; ijx<duplicateName.length+1; ijx++) {
                            bannDupl[dupeIDList[ijx]] = {
                                active: true, severity: 2, message: "&nbsp-- " + duplicateName[ijx-1],
                                WLactive: false, WLvalue: wlButtText, WLtitle: 'Whitelist Duplicate',
                                WLaction: function(dID) {
                                    wlKeyName = 'dupeWL';
                                    if (!venueWhitelist.hasOwnProperty(itemID)) {  // If venue is NOT on WL, then add it.
                                        venueWhitelist[itemID] = { dupeWL: [] };
                                    }
                                    if (!venueWhitelist[itemID].hasOwnProperty(wlKeyName)) {  // If dupeWL key is not in venue WL, then initialize it.
                                        venueWhitelist[itemID][wlKeyName] = [];
                                    }
                                    venueWhitelist[itemID].dupeWL.push(dID);  // WL the id for the duplicate venue
                                    //debug('4159 // About to call uniq() once inside of harmonizePlaceGo()');
                                    venueWhitelist[itemID].dupeWL = uniq(venueWhitelist[itemID].dupeWL);
                                    // Make an entry for the opposite item
                                    if (!venueWhitelist.hasOwnProperty(dID)) {  // If venue is NOT on WL, then add it.
                                        venueWhitelist[dID] = { dupeWL: [] };
                                    }
                                    if (!venueWhitelist[dID].hasOwnProperty(wlKeyName)) {  // If dupeWL key is not in venue WL, then initialize it.
                                        venueWhitelist[dID][wlKeyName] = [];
                                    }
                                    venueWhitelist[dID].dupeWL.push(itemID);  // WL the id for the duplicate venue
                                    //debug('4169 // About to call uniq() once inside of harmonizePlaceGo()');
                                    venueWhitelist[dID].dupeWL = uniq(venueWhitelist[dID].dupeWL);
                                    saveWL_LS(true);  // Save the WL to local storage
                                    WMEPH_WLCounter();
                                    bannButt2.clearWL.active = true;
                                    bannDupl[dID].active = false;
                                    harmonizePlaceGo(item,'harmonize');
                                }
                            };
                            if ( venueWhitelist.hasOwnProperty(itemID) && venueWhitelist[itemID].hasOwnProperty('dupeWL') && venueWhitelist[itemID].dupeWL.indexOf(dupeIDList[ijx]) > -1 ) {  // if the dupe is on the whitelist then remove it from the banner
                                bannDupl[dupeIDList[ijx]].active = false;
                            } else {  // Otherwise, activate the WL button
                                bannDupl[dupeIDList[ijx]].WLactive = true;
                            }
                        }  // END loop for duplicate venues
                    }
                }
            }

            // Check HN range (this depends on the returned dupefinder data, so has to run after it)
            if (dupeHNRangeList.length > 3) {
                var dhnix, dupeHNRangeListSorted = [];
                sortWithIndex(dupeHNRangeDistList);
                for (dhnix = 0; dhnix < dupeHNRangeList.length; dhnix++) {
                    dupeHNRangeListSorted.push(dupeHNRangeList[ dupeHNRangeDistList.sortIndices[dhnix] ]);
                }
                // Calculate HN/distance ratio with other venues
                // var sumHNRatio = 0;
                var arrayHNRatio = [];
                for (dhnix = 0; dhnix < dupeHNRangeListSorted.length; dhnix++) {
                    arrayHNRatio.push(Math.abs( (parseInt(item.attributes.houseNumber) - dupeHNRangeListSorted[dhnix]) / dupeHNRangeDistList[dhnix] ));
                }
                sortWithIndex(arrayHNRatio);
                // Examine either the median or the 8th index if length is >16
                var arrayHNRatioCheckIX = Math.min(Math.round(arrayHNRatio.length/2), 8);
                if (arrayHNRatio[arrayHNRatioCheckIX] > 1.4) {
                    bannButt.HNRange.active = true;
                    if (currentWL.HNRange) {
                        bannButt.HNRange.WLactive = false;
                    }
                    if (arrayHNRatio[arrayHNRatioCheckIX] > 5) {
                        bannButt.HNRange.severity = 3;
                    }
                    // show stats if HN out of range
                    phlogdev('HNs: ' + dupeHNRangeListSorted);
                    phlogdev('Distances: ' + dupeHNRangeDistList);
                    phlogdev('arrayHNRatio: ' + arrayHNRatio);
                    phlogdev('HN Ratio Score: ' + arrayHNRatio[Math.round(arrayHNRatio.length/2)]);
                }
            }

            executeMultiAction(actions);

            if (hpMode.harmFlag) {
                // Update icons to reflect current WME place services
                updateServicesChecks(bannServ);
            }

            // Turn on website linking button if there is a url
            if (newURL !== null && newURL !== "") {
                bannButt.PlaceWebsite.active = true;
            }

            // Highlight the changes made
            highlightChangedFields(fieldUpdateObject,hpMode);

            // Assemble the banners
            assembleBanner();  // Make Messaging banners

        }  // END harmonizePlaceGo function

        // **** vvv Function definitions vvv ****

        // highlight changed fields
        function highlightChangedFields(fieldUpdateObject,hpMode) {
            //debug('-- highlightChangedFields(fieldUpdateObject,hpMode) called --');

            if (hpMode.harmFlag) {
                //var panelFields = {};
                getPanelFields();
                var tab1HL = false;
                var tab2HL = false;
                //phlogdev(fieldUpdateObject);
                if (fieldUpdateObject.name) {
                    $('.form-control')[panelFields.name].style="background-color:"+fieldUpdateObject.name;
                    tab1HL = true;
                }
                if (fieldUpdateObject.aliases) {
                    var field = $('.alias-name')[0];
                    if (field) field.style="background-color:"+fieldUpdateObject.aliases;
                    tab1HL = true;
                }
                if (fieldUpdateObject.categories) {
                    $('.select2-choices')[0].style="background-color:"+fieldUpdateObject.categories;
                    tab1HL = true;
                }
                if (fieldUpdateObject.brand) {
                    $('.form-control')[panelFields.brand].style="background-color:"+fieldUpdateObject.brand;
                    tab1HL = true;
                }
                if (fieldUpdateObject.description) {
                    $('.form-control')[panelFields.description].style="background-color:"+fieldUpdateObject.description;
                    tab1HL = true;
                }
                if (fieldUpdateObject.lockRank) {
                    $('.form-control')[panelFields.lockRank].style="background-color:"+fieldUpdateObject.lockRank;
                    tab1HL = true;
                }
                if (fieldUpdateObject.address) {
                    $('.address-edit')[0].style='background-color:'+fieldUpdateObject.address;
                    tab1HL = true;
                }

                if (fieldUpdateObject.url) {
                    $('.form-control')[panelFields.url].style="background-color:"+fieldUpdateObject.url;
                    tab2HL = true;
                }
                if (fieldUpdateObject.phone) {
                    $('.form-control')[panelFields.phone].style="background-color:"+fieldUpdateObject.phone;
                    tab2HL = true;
                }
                if (fieldUpdateObject.openingHours) {
                    $('.opening-hours')[0].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.VALLET_SERVICE) {
                    $('.service-checkbox')[0].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.DRIVETHROUGH) {
                    $('.service-checkbox')[1].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.WI_FI) {
                    $('.service-checkbox')[2].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.RESTROOMS) {
                    $('.service-checkbox')[3].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.CREDIT_CARDS) {
                    $('.service-checkbox')[4].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.RESERVATIONS) {
                    $('.service-checkbox')[5].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.OUTSIDE_SEATING) {
                    $('.service-checkbox')[6].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.AIR_CONDITIONING) {
                    $('.service-checkbox')[7].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.PARKING_FOR_CUSTOMERS) {
                    $('.service-checkbox')[8].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.DELIVERIES) {
                    $('.service-checkbox')[9].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.TAKE_AWAY) {
                    $('.service-checkbox')[10].style="background-color:#dfd";
                    tab2HL = true;
                }
                if (fieldUpdateObject.services.WHEELCHAIR_ACCESSIBLE) {
                    $('.service-checkbox')[11].style="background-color:#dfd";
                    tab2HL = true;
                }

                var placeNavTabs = $('.nav');
                var panelFieldsList;
                for (var pfix=0; pfix<placeNavTabs.length; pfix++) {
                    var pfa = placeNavTabs[pfix].innerHTML;
                    if (pfa.indexOf('landmark-edit') > -1) {
                        panelFieldsList = placeNavTabs[pfix].children;
                        panelFields.navTabsIX = pfix;
                        break;
                    }
                }
                for (var pfix=0; pfix<panelFieldsList.length; pfix++) {
                    var pfa = panelFieldsList[pfix].innerHTML;
                    if (pfa.indexOf('landmark-edit-general') > -1) {
                        panelFields.navTabGeneral = pfix;
                    }
                    if (pfa.indexOf('landmark-edit-more') > -1) {
                        panelFields.navTabMore = pfix;
                    }
                }

                if (tab1HL) {
                    $('.nav')[panelFields.navTabsIX].children[panelFields.navTabGeneral].children[0].style='background-color:#dfd';
                }
                if (tab2HL) {
                    $('.nav')[panelFields.navTabsIX].children[panelFields.navTabMore].children[0].style='background-color:#dfd';
                }
            }
        }


        // Set up banner messages
        function assembleBanner() {
            //debug('-- assembleBanner() called --');
            phlogdev('Building banners');
            // push together messages from active banner messages
            var sidebarMessage = [], sidebarTools = [];  // Initialize message array
            var tempKey, strButt1, dupesFound = false;
            severityButt = 0;

            // Setup duplicates banners
            strButt1 = 'Possible duplicates: ';
            for ( tempKey in bannDupl ) {
                if (bannDupl.hasOwnProperty(tempKey) && bannDupl[tempKey].hasOwnProperty('active') && bannDupl[tempKey].active) {
                    dupesFound = true;
                    strButt1 += '<br>' + bannDupl[tempKey].message;
                    if (bannDupl[tempKey].hasOwnProperty('action')) {
                        // Nothing happening here yet.
                    }
                    if (bannDupl[tempKey].hasOwnProperty('WLactive') && bannDupl[tempKey].WLactive && bannDupl[tempKey].hasOwnProperty('WLaction') ) {  // If there's a WL option, enable it
                        severityButt = Math.max(bannDupl[tempKey].severity, severityButt);
                        strButt1 += ' <input class="btn btn-success btn-xs wmephwl-btn" id="WMEPH_WL' + tempKey + '" title="' + bannDupl[tempKey].WLtitle + '" type="button" value="' + bannDupl[tempKey].WLvalue + '">';
                    }
                }
            }
            if (dupesFound) {  // if at least 1 dupe
                sidebarMessage.push(strButt1);
            }

            // Build banners above the Services
            for ( tempKey in bannButt ) {
                if ( bannButt.hasOwnProperty(tempKey) && bannButt[tempKey].hasOwnProperty('active') && bannButt[tempKey].active ) {  //  If the particular message is active
                    strButt1 = bannButt[tempKey].message;
                    if (bannButt[tempKey].badInput) {
                        strButt1 = strButt1.replace(/#DDF/i,'pink');
                    }
                    if (bannButt[tempKey].hasOwnProperty('action')) {
                        strButt1 += ' <input class="btn btn-default btn-xs wmeph-btn" id="WMEPH_' + tempKey + '" title="' + bannButt[tempKey].title + '" type="button" value="' + bannButt[tempKey].value + '"></input>';
                        if (tempKey === 'noHours') {
                            strButt1 += ' <input class="btn btn-default btn-xs wmeph-btn" id="WMEPH_' + tempKey + 'A2" title="' + bannButt[tempKey].title2 + '" type="button" value="' + bannButt[tempKey].value2 + '"></input>';
                        }
                    }
                    if ( bannButt[tempKey].hasOwnProperty('WLactive') ) {
                        if ( bannButt[tempKey].WLactive && bannButt[tempKey].hasOwnProperty('WLaction') ) {  // If there's a WL option, enable it
                            severityButt = Math.max(bannButt[tempKey].severity, severityButt);
                            strButt1 += bannButt[tempKey].WLmessage + ' <input class="btn btn-success btn-xs wmephwl-btn" id="WMEPH_WL' + tempKey + '" title="' + bannButt[tempKey].WLtitle + '" type="button" value="WL">';
                            //strButt1 += bannButt[tempKey].WLmessage + ' <input class="fa fa-check-square" id="WMEPH_WL' + tempKey + '" title="' + bannButt[tempKey].WLtitle + '" type="button" style="color:green;" >';
                            //strButt1 += bannButt[tempKey].WLmessage + ' <button class="btn btn-default btn-xs wmephwl-btn" id="WMEPH_WL' + tempKey + '" title="' + bannButt[tempKey].WLtitle + '" type="button" ><i class="fa fa-check-square" style="color:green;></i></button>';
                        }
                    } else {
                        severityButt = Math.max(bannButt[tempKey].severity, severityButt);
                    }
                    sidebarMessage.push(strButt1);
                }
            }
            if ( $("#WMEPH-ColorHighlighting" + devVersStr).prop('checked') ) {
                item = W.selectionManager.selectedItems[0].model;
                item.attributes.wmephSeverity = severityButt;
            }

            // setup Add Service Buttons for suggested services
            var sidebarServButts = '', servButtHeight = '27', greyOption;
            for ( tempKey in bannServ ) {
                if ( bannServ.hasOwnProperty(tempKey) && bannServ[tempKey].hasOwnProperty('active') && bannServ[tempKey].active ) {  //  If the particular service is active
                    if ( bannServ[tempKey].checked ) {
                        greyOption = '';
                    } else {
                        greyOption = '-webkit-filter: opacity(.25);filter: opacity(.25);';
                        //greyOption = '-webkit-filter: brightness(3); filter: brightness(3);';
                    }
                    //strButt1 = '&nbsp<input class="servButton" id="WMEPH_' + tempKey + '" title="' + bannServ[tempKey].title + '" type="image" style="height:' + servButtHeight +
                    //    'px;background:none;border-color: none;border-style: none;" src="https://openmerchantaccount.com/img2/' + bannServ[tempKey].icon + greyOption + '.png">';
                    strButt1 = '&nbsp<input class="'+bannServ[tempKey].icon+'" id="WMEPH_' + tempKey + '" type="button" title="' + bannServ[tempKey].title +
                        '" style="border:0;background-size: contain; height:' + servButtHeight + 'px;width: '+Math.ceil(servButtHeight*bannServ[tempKey].w2hratio).toString()+'px;'+greyOption+'">';
                    sidebarServButts += strButt1;
                }
            }
            if (sidebarServButts.length>0) {
                sidebarTools.push('Add services:<br>' + sidebarServButts);
            }

            //  Build general banners (below the Services)
            for ( tempKey in bannButt2 ) {
                if ( bannButt2.hasOwnProperty(tempKey) && bannButt2[tempKey].hasOwnProperty('active') && bannButt2[tempKey].active ) {  //  If the particular message is active
                    strButt1 = bannButt2[tempKey].message;
                    if (bannButt2[tempKey].hasOwnProperty('action')) {
                        strButt1 += ' <input class="btn btn-info btn-xs wmeph-btn" id="WMEPH_' + tempKey + '" title="' + bannButt2[tempKey].title + '" type="button" value="' + bannButt2[tempKey].value + '">';
                    }
                    sidebarTools.push(strButt1);
                    severityButt = Math.max(bannButt2[tempKey].severity, severityButt);
                }
            }

            // Post the banners to the sidebar
            displayTools( sidebarTools.join("<li>") );
            displayBanners(sidebarMessage.join("<li>"), severityButt );

            // Set up Duplicate onclicks
            if ( dupesFound ) {
                setupButtons(bannDupl);
            }
            // Setup bannButt onclicks
            setupButtons(bannButt);
            // Setup bannServ onclicks
            setupButtons(bannServ);
            // Setup bannButt2 onclicks
            setupButtons(bannButt2);

            if (bannButt.noHours.active) {
                var button = document.getElementById('WMEPH_noHoursA2');
                button.onclick = function() {
                    bannButt.noHours.action2();
                    assembleBanner();
                };
            }

            // Street entry textbox stuff
            var streetNames = [];
            var streetNamesCap = [];
            W.model.streets.getObjectArray().forEach(function(st) {
                if (!st.isEmpty) {
                    streetNames.push(st.name);
                    streetNamesCap.push(st.name.toUpperCase());
                }
            });
            streetNames.sort();
            streetNamesCap.sort();
            $('#WMEPH_missingStreet').autocomplete({
                source: streetNames,
                change: onStreetChanged,
                select: onStreetSelected,
                response: function(e, ui) {
                    var maxListLength = 10;
                    if(ui.content.length > maxListLength) {
                        ui.content.splice(maxListLength, ui.content.length - maxListLength);
                    }
                }
            });
            function onStreetSelected(e, ui) {
                if (ui.item) {
                    checkStreet(ui.item.value);
                }
            }
            function onStreetChanged(e, ui) {
                checkStreet(null);
            }
            $('#WMEPH_addStreetBtn').on('click', addStreetToVenue);
            function addStreetToVenue() {
                var stName = $('#WMEPH_missingStreet').val();
                var street = W.model.streets.getByAttributes({name:stName})[0];
                var addr = item.getAddress().attributes;
                var newAddr = {
                    country: addr.country,
                    state: addr.state,
                    city: addr.city,
                    street: street
                };
                updateAddress(item, newAddr);
                console.log('ADDED', W.model.streets.getByAttributes({name:$('#WMEPH_missingStreet').val()})[0]);
                bannButt.streetMissing.active = false;
                assembleBanner();
            }
            function checkStreet(name) {
                name = (name || $("#WMEPH_missingStreet").val()).toUpperCase();
                var ix = streetNamesCap.indexOf(name);
                var enable = false;
                if (ix > -1) {
                    color = 'lightgreen';
                    $("#WMEPH_missingStreet").val(streetNames[ix]);
                    enable = true;
                    $('#WMEPH_addStreetBtn').prop("disabled", false).removeClass('disabled');
                } else {
                    $('#WMEPH_addStreetBtn').prop('disabled', true).addClass('disabled');
                }
                return enable;
            }
            // If pressing enter in the street entry box, add the street
            $("#WMEPH_missingStreet").keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH_missingStreet').val() !== '' ){
                    if(checkStreet(null)) {
                        addStreetToVenue();
                    }
                }
            });

            // If pressing enter in the HN entry box, add the HN
            $("#WMEPH-HNAdd"+devVersStr).keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-HNAdd'+devVersStr).val() !== '' ){
                    $("#WMEPH_hnMissing").click();
                }
            });

            // If pressing enter in the phone entry box, add the phone
            $("#WMEPH-PhoneAdd"+devVersStr).keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-PhoneAdd'+devVersStr).val() !== '' ){
                    $("#WMEPH_phoneMissing").click();
                }
            });

            // If pressing enter in the URL entry box, add the URL
            $("#WMEPH-UrlAdd"+devVersStr).keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-UrlAdd'+devVersStr).val() !== '' ){
                    $("#WMEPH_urlMissing").click();
                }
            });

            // If pressing enter in the hours entry box, parse the entry
            $("#WMEPH-HoursPaste"+devVersStr).keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-HoursPaste'+devVersStr).val() !== '' ){
                    $("#WMEPH_noHours").click();
                }
            });
            $("#WMEPH-HoursPaste"+devVersStr).click(function(){
                if (this.value === 'Paste Hours Here' || this.value === 'Can\'t parse, try again') {
                    this.value = '';
                }
                this.style.color = 'black';
            }).blur(function(){
                if ( this.value === '') {
                    this.value = 'Paste Hours Here';
                    this.style.color = '#999';
                }
            });
        }  // END assemble Banner function

        // Button onclick event handler
        function setupButtons(b) {
            //debug('-- setupButtons(b) called --');
            for ( var tempKey in b ) {  // Loop through the banner possibilities
                if ( b.hasOwnProperty(tempKey) && b[tempKey].active ) {  //  If the particular message is active
                    if (b[tempKey].hasOwnProperty('action')) {  // If there is an action, set onclick
                        buttonAction(b, tempKey);
                    }
                    // If there's a WL option, set up onclick
                    if ( b[tempKey].hasOwnProperty('WLactive') && b[tempKey].WLactive && b[tempKey].hasOwnProperty('WLaction') ) {
                        buttonWhitelist(b, tempKey);
                    }
                }
            }
        }  // END setupButtons function

        function buttonAction(b,bKey) {
            //debug('-- buttonAction(b,bKey) called --');
            var button = document.getElementById('WMEPH_'+bKey);
            button.onclick = function() {
                b[bKey].action();
                assembleBanner();
            };
            return button;
        }
        function buttonWhitelist(b,bKey) {
            //debug('-- buttonWhitelist(b,bKey) called --');
            var button = document.getElementById('WMEPH_WL'+bKey);
            button.onclick = function() {
                if ( bKey.match(/^\d{5,}/) !== null ) {
                    b[bKey].WLaction(bKey);
                } else {
                    b[bKey].WLaction();
                }
                b[bKey].WLactive = false;
                b[bKey].severity = 0;
                assembleBanner();
            };
            return button;
        }




        // Display run button on place sidebar
        function displayRunButton() {
            //debug('-- displayRunButton() called --');
            var betaDelay = 0;
            if (IS_DEV_VERSION) { betaDelay = 30; }
            setTimeout(function() {
                if ($('#WMEPH_runButton').length === 0 ) {
                    $('<div id="WMEPH_runButton">').prependTo(".contents");
                }
                if ($('#runWMEPH'+devVersStr).length === 0 ) {
                    var strButt1 = '<input class="btn btn-primary" id="runWMEPH'+devVersStr+'" title="Run WMEPH'+devVersStrSpace+' on Place" type="button" value="Run WMEPH'+devVersStrSpace+'">';
                    $("#WMEPH_runButton").append(strButt1);
                }
                var btn = document.getElementById("runWMEPH"+devVersStr);
                if (btn !== null) {
                    btn.onclick = function() {
                        harmonizePlace();
                    };
                } else {
                    setTimeout(bootstrapRunButton,100);
                }
                if ( W.selectionManager.selectedItems.length === 1 ) {
                    item = W.selectionManager.selectedItems[0].model;
                    if ( item.attributes.categories.length === 1 && item.attributes.categories[0] === 'SHOPPING_AND_SERVICES' ) {
                        $('.suggested-categories').remove();
                    }
                }
            }, betaDelay);
        }  // END displayRunButton funtion

        // WMEPH Clone Tool
        function displayCloneButton() {
            //debug('-- displayCloneButton() called --');
            var betaDelay = 80;
            if (IS_DEV_VERSION) { betaDelay = 300; }
            setTimeout(function() {
                if ($('#WMEPH_runButton').length === 0 ) {
                    $('<div id="WMEPH_runButton">').prependTo(".contents");
                }
                var strButt1, btn;
                item = W.selectionManager.selectedItems[0].model;
                var openPlaceWebsiteURL = item.attributes.url;

                if (openPlaceWebsiteURL !== null && openPlaceWebsiteURL.replace(/[^A-Za-z0-9]/g,'').length > 2 && (USER_NAME === 't0cableguy' || USER_NAME === 't0cableguy') ) {
                    if ($('#WMEPH_urlButton').length === 0 ) {
                        strButt1 = '<br><input class="btn btn-success btn-xs" id="WMEPH_urlButton" title="Open place URL" type="button" value="Open URL">';
                        $("#WMEPH_runButton").append(strButt1);
                    }
                    btn = document.getElementById("WMEPH_urlButton");
                    if (btn !== null) {
                        btn.onclick = function() {
                            if (openPlaceWebsiteURL.match(/^http/i) === null) {
                                openPlaceWebsiteURL = 'http:\/\/'+openPlaceWebsiteURL;
                            }
                            if ( $("#WMEPH-WebSearchNewTab" + devVersStr).prop('checked') ) {
                                window.open(openPlaceWebsiteURL);
                            } else {
                                window.open(openPlaceWebsiteURL, searchResultsWindowName, searchResultsWindowSpecs);
                            }
                        };
                    } else {
                        setTimeout(bootstrapRunButton,100);
                    }
                }
                if ($('#clonePlace').length === 0 ) {
                    strButt1 = '<div style="margin-bottom: 3px;"></div><input class="btn btn-warning btn-xs wmeph-btn" id="clonePlace" title="Copy place info" type="button" value="Copy">'+
                        ' <input class="btn btn-warning btn-xs wmeph-btn" id="pasteClone" title="Apply the Place info. (Ctrl-Alt-O)" type="button" value="Paste (for checked boxes):"><br>';
                    $("#WMEPH_runButton").append(strButt1);
                    createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPhn', 'HN');
                    createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPstr', 'Str');
                    createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPcity', 'City');
                    createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPurl', 'URL');
                    createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPph', 'Ph');
                    $("#WMEPH_runButton").append('<br>');
                    createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPdesc', 'Desc');
                    createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPserv', 'Serv');
                    createCloneCheckbox('WMEPH_runButton', 'WMEPH_CPhrs', 'Hrs');
                    strButt1 = '<input class="btn btn-info btn-xs wmeph-btn" id="checkAllClone" title="Check all" type="button" value="All">'+
                        ' <input class="btn btn-info btn-xs wmeph-btn" id="checkAddrClone" title="Check Address" type="button" value="Addr">'+
                        ' <input class="btn btn-info btn-xs wmeph-btn" id="checkNoneClone" title="Check none" type="button" value="None"><br>';
                    $("#WMEPH_runButton").append(strButt1);
                }
                btn = document.getElementById("clonePlace");
                if (btn !== null) {
                    btn.onclick = function() {
                        item = W.selectionManager.selectedItems[0].model;
                        cloneMaster = {};
                        cloneMaster.addr = item.getAddress();
                        if ( cloneMaster.addr.hasOwnProperty('attributes') ) {
                            cloneMaster.addr = cloneMaster.addr.attributes;
                        }
                        cloneMaster.houseNumber = item.attributes.houseNumber;
                        cloneMaster.url = item.attributes.url;
                        cloneMaster.phone = item.attributes.phone;
                        cloneMaster.description = item.attributes.description;
                        cloneMaster.services = item.attributes.services;
                        cloneMaster.openingHours = item.attributes.openingHours;
                        phlogdev('Place Cloned');
                    };
                } else {
                    setTimeout(bootstrapRunButton,100);
                    return;
                }
                btn = document.getElementById("pasteClone");
                if (btn !== null) {
                    btn.onclick = function() {
                        clonePlace();
                    };
                } else {
                    setTimeout(bootstrapRunButton,100);
                }
                btn = document.getElementById("checkAllClone");
                if (btn !== null) {
                    btn.onclick = function() {
                        if ( !$("#WMEPH_CPhn").prop('checked') ) { $("#WMEPH_CPhn").trigger('click'); }
                        if ( !$("#WMEPH_CPstr").prop('checked') ) { $("#WMEPH_CPstr").trigger('click'); }
                        if ( !$("#WMEPH_CPcity").prop('checked') ) { $("#WMEPH_CPcity").trigger('click'); }
                        if ( !$("#WMEPH_CPurl").prop('checked') ) { $("#WMEPH_CPurl").trigger('click'); }
                        if ( !$("#WMEPH_CPph").prop('checked') ) { $("#WMEPH_CPph").trigger('click'); }
                        if ( !$("#WMEPH_CPserv").prop('checked') ) { $("#WMEPH_CPserv").trigger('click'); }
                        if ( !$("#WMEPH_CPdesc").prop('checked') ) { $("#WMEPH_CPdesc").trigger('click'); }
                        if ( !$("#WMEPH_CPhrs").prop('checked') ) { $("#WMEPH_CPhrs").trigger('click'); }
                    };
                } else {
                    setTimeout(bootstrapRunButton,100);
                }
                btn = document.getElementById("checkAddrClone");
                if (btn !== null) {
                    btn.onclick = function() {
                        if ( !$("#WMEPH_CPhn").prop('checked') ) { $("#WMEPH_CPhn").trigger('click'); }
                        if ( !$("#WMEPH_CPstr").prop('checked') ) { $("#WMEPH_CPstr").trigger('click'); }
                        if ( !$("#WMEPH_CPcity").prop('checked') ) { $("#WMEPH_CPcity").trigger('click'); }
                        if ( $("#WMEPH_CPurl").prop('checked') ) { $("#WMEPH_CPurl").trigger('click'); }
                        if ( $("#WMEPH_CPph").prop('checked') ) { $("#WMEPH_CPph").trigger('click'); }
                        if ( $("#WMEPH_CPserv").prop('checked') ) { $("#WMEPH_CPserv").trigger('click'); }
                        if ( $("#WMEPH_CPdesc").prop('checked') ) { $("#WMEPH_CPdesc").trigger('click'); }
                        if ( $("#WMEPH_CPhrs").prop('checked') ) { $("#WMEPH_CPhrs").trigger('click'); }
                    };
                } else {
                    setTimeout(bootstrapRunButton,100);
                }
                btn = document.getElementById("checkNoneClone");
                if (btn !== null) {
                    btn.onclick = function() {
                        if ( $("#WMEPH_CPhn").prop('checked') ) { $("#WMEPH_CPhn").trigger('click'); }
                        if ( $("#WMEPH_CPstr").prop('checked') ) { $("#WMEPH_CPstr").trigger('click'); }
                        if ( $("#WMEPH_CPcity").prop('checked') ) { $("#WMEPH_CPcity").trigger('click'); }
                        if ( $("#WMEPH_CPurl").prop('checked') ) { $("#WMEPH_CPurl").trigger('click'); }
                        if ( $("#WMEPH_CPph").prop('checked') ) { $("#WMEPH_CPph").trigger('click'); }
                        if ( $("#WMEPH_CPserv").prop('checked') ) { $("#WMEPH_CPserv").trigger('click'); }
                        if ( $("#WMEPH_CPdesc").prop('checked') ) { $("#WMEPH_CPdesc").trigger('click'); }
                        if ( $("#WMEPH_CPhrs").prop('checked') ) { $("#WMEPH_CPhrs").trigger('click'); }
                    };
                } else {
                    setTimeout(bootstrapRunButton,100);
                }
            }, betaDelay);
        }  // END displayCloneButton funtion



        // Catch PLs and reloads that have a place selected already and limit attempts to about 10 seconds
        function bootstrapRunButton() {
            //debug('-- bootstrapRunButton() called --');
            if (numAttempts < 10) {
                numAttempts++;
                if (W.selectionManager.selectedItems.length === 1) {
                    if (W.selectionManager.selectedItems[0].model.type === "venue") {
                        displayRunButton();
                        getPanelFields();
                        if (localStorage.getItem("WMEPH-EnableCloneMode" + devVersStr) === '1') {
                            displayCloneButton();
                        }
                    }


                } else {
                    setTimeout(bootstrapRunButton,1000);
                }
            }
        }

        // Find field divs
        function getPanelFields() {
            //debug('-- getPanelFields() called --');
            var panelFieldsList = $('.form-control'), pfa;
            for (var pfix=0; pfix<panelFieldsList.length; pfix++) {
                pfa = panelFieldsList[pfix].name;
                if (pfa === 'name') {
                    panelFields.name = pfix;
                }
                if (pfa === 'lockRank') {
                    panelFields.lockRank = pfix;
                }
                if (pfa === 'description') {
                    panelFields.description = pfix;
                }
                if (pfa === 'url') {
                    panelFields.url = pfix;
                }
                if (pfa === 'phone') {
                    panelFields.phone = pfix;
                }
                if (pfa === 'brand') {
                    panelFields.brand = pfix;
                }
            }
            var placeNavTabs = $('.nav');
            for (var pfix=0; pfix<placeNavTabs.length; pfix++) {
                pfa = placeNavTabs[pfix].innerHTML;
                if (pfa.indexOf('landmark-edit') > -1) {
                    panelFieldsList = placeNavTabs[pfix].children;
                    panelFields.navTabsIX = pfix;
                    break;
                }
            }
            for (var pfix=0; pfix<panelFieldsList.length; pfix++) {
                pfa = panelFieldsList[pfix].innerHTML;
                if (pfa.indexOf('landmark-edit-general') > -1) {
                    panelFields.navTabGeneral = pfix;
                }
                if (pfa.indexOf('landmark-edit-more') > -1) {
                    panelFields.navTabMore = pfix;
                }
            }


        }

        // Catch PLs and reloads that have a place selected already and limit attempts to about 10 seconds
        numAttempts = 0;
        function bootstrapInferAddress() {
            //debug('-- bootstrapInferAddress() called --');
            if (numAttempts < 20) {
                numAttempts++;
                var inferredAddress = WMEPH_inferAddress(7);
                if (!inferredAddress) {
                    setTimeout(bootstrapInferAddress,500);
                } else {
                    return inferredAddress;
                }
            }
        }

        // Function to clone info from a place
        function clonePlace() {
            //debug('-- clonePlace() called --');
            phlog('Cloning info...');
            var UpdateObject = require("Waze/Action/UpdateObject");
            if (cloneMaster !== null && cloneMaster.hasOwnProperty('url')) {
                item = W.selectionManager.selectedItems[0].model;
                var cloneItems = {};
                var updateItem = false;
                if ( $("#WMEPH_CPhn").prop('checked') ) {
                    cloneItems.houseNumber = cloneMaster.houseNumber;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPurl").prop('checked') ) {
                    cloneItems.url = cloneMaster.url;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPph").prop('checked') ) {
                    cloneItems.phone = cloneMaster.phone;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPdesc").prop('checked') ) {
                    cloneItems.description = cloneMaster.description;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPserv").prop('checked') ) {
                    cloneItems.services = cloneMaster.services;
                    updateItem = true;
                }
                if ( $("#WMEPH_CPhrs").prop('checked') ) {
                    cloneItems.openingHours = cloneMaster.openingHours;
                    updateItem = true;
                }
                if (updateItem) {
                    W.model.actionManager.add(new UpdateObject(item, cloneItems) );
                    phlogdev('Item details cloned');
                }

                var copyStreet = $("#WMEPH_CPstr").prop('checked');
                var copyCity = $("#WMEPH_CPcity").prop('checked');

                if (copyStreet || copyCity) {
                    var originalAddress = item.getAddress();
                    var itemRepl = {
                        street: copyStreet ? cloneMaster.addr.street : originalAddress.attributes.street,
                        city: copyCity ? cloneMaster.addr.city : originalAddress.attributes.city,
                        state: copyCity ? cloneMaster.addr.state : originalAddress.attributes.state,
                        country: copyCity ? cloneMaster.addr.country : originalAddress.attributes.country
                    };
                    updateAddress(item, itemRepl);
                    phlogdev('Item address cloned');
                }
            } else {
                phlog('Please copy a place');
            }
        }

        // Formats "hour object" into a string.
        function formatOpeningHour(hourEntry) {
            //debug('-- formatOpeningHour(hourEntry) called --');
            var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            var hours = hourEntry.attributes.fromHour + '-' + hourEntry.attributes.toHour;
            return hourEntry.attributes.days.map(function(day) {
                return dayNames[day] + ' ' + hours;
            }).join(', ');
        }
        // Pull natural text from opening hours
        function getOpeningHours(venue) {
            //debug('-- getOpeningHours(venue) called --');
            return venue && venue.getOpeningHours && venue.getOpeningHours().map(formatOpeningHour);
        }
        // Parse hours paste for hours object array
        function parseHours(inputHours) {
            //debug('-- parseHours(inputHours) called --');
            var daysOfTheWeek = {
                SS: ['saturdays', 'saturday', 'satur', 'sat', 'sa'],
                UU: ['sundays', 'sunday', 'sun', 'su'],
                MM: ['mondays', 'monday', 'mondy', 'mon', 'mo'],
                TT: ['tuesdays', 'tuesday', 'tues', 'tue', 'tu'],
                WW: ['wednesdays', 'wednesday', 'weds', 'wed', 'we'],
                RR: ['thursdays', 'thursday', 'thurs', 'thur', 'thu', 'th'],
                FF: ['fridays', 'friday', 'fri', 'fr']
            };
            var monthsOfTheYear = {
                JAN: ['january', 'jan'],
                FEB: ['february', 'febr', 'feb'],
                MAR: ['march', 'mar'],
                APR: ['april', 'apr'],
                MAY: ['may', 'may'],
                JUN: ['june', 'jun'],
                JUL: ['july', 'jul'],
                AUG: ['august', 'aug'],
                SEP: ['september', 'sept', 'sep'],
                OCT: ['october', 'oct'],
                NOV: ['november', 'nov'],
                DEC: ['december', 'dec']
            };
            var dayCodeVec = ['MM','TT','WW','RR','FF','SS','UU','MM','TT','WW','RR','FF','SS','UU','MM','TT','WW','RR','FF'];
            var tfHourTemp, tfDaysTemp, newDayCodeVec = [];
            var tempRegex, twix, tsix;
            var inputHoursParse = inputHours.toLowerCase();
            inputHoursParse = inputHoursParse.replace(/paste hours here/i, "");  // make sure something is pasted
            phlogdev(inputHoursParse);
            inputHoursParse = inputHoursParse.replace(/can\'t parse\, try again/i, "");  // make sure something is pasted
            if (inputHoursParse === '' || inputHoursParse === ',') {
                phlogdev('No hours');
                return false;
            }
            inputHoursParse = inputHoursParse.replace(/\u2013|\u2014/g, "-");  // long dash replacing
            inputHoursParse = inputHoursParse.replace(/[^a-z0-9\:\-\. ~]/g, ' ');  // replace unnecessary characters with spaces
            inputHoursParse = inputHoursParse.replace(/\:{2,}/g, ':');  // remove extra colons
            inputHoursParse = inputHoursParse.replace(/closed/g, '99:99-99:99').replace(/not open/g, '99:99-99:99');  // parse 'closed'
            inputHoursParse = inputHoursParse.replace(/by appointment only/g, '99:99-99:99').replace(/by appointment/g, '99:99-99:99');  // parse 'appointment only'
            inputHoursParse = inputHoursParse.replace(/weekdays/g, 'mon-fri').replace(/weekends/g, 'sat-sun');  // convert weekdays and weekends to days
            inputHoursParse = inputHoursParse.replace(/12:00 noon/g, "12:00").replace(/12:00 midnight/g, "00:00");  // replace 'noon', 'midnight'
            inputHoursParse = inputHoursParse.replace(/12 noon/g, "12:00").replace(/12 midnight/g, "00:00");  // replace 'noon', 'midnight'
            inputHoursParse = inputHoursParse.replace(/noon/g, "12:00").replace(/midnight/g, "00:00");  // replace 'noon', 'midnight'
            inputHoursParse = inputHoursParse.replace(/every day/g, "mon-sun");  // replace 'seven days a week'
            inputHoursParse = inputHoursParse.replace(/seven days a week/g, "mon-sun");  // replace 'seven days a week'
            inputHoursParse = inputHoursParse.replace(/7 days a week/g, "mon-sun");  // replace 'seven days a week'
            inputHoursParse = inputHoursParse.replace(/daily/g, "mon-sun");  // replace 'open daily'
            inputHoursParse = inputHoursParse.replace(/open 24 ?ho?u?rs?/g, "00:00-00:00");  // replace 'open 24 hour or similar'
            inputHoursParse = inputHoursParse.replace(/open twenty\-? ?four ho?u?rs?/g, "00:00-00:00");  // replace 'open 24 hour or similar'
            inputHoursParse = inputHoursParse.replace(/24 ?ho?u?rs?/g, "00:00-00:00");  // replace 'open 24 hour or similar'
            inputHoursParse = inputHoursParse.replace(/twenty\-? ?four ho?u?rs?/g, "00:00-00:00");  // replace 'open 24 hour or similar'
            inputHoursParse = inputHoursParse.replace(/(\D:)([^ ])/g, "$1 $2");  // space after colons after words
            // replace thru type words with dashes
            var thruWords = 'through|thru|to|until|till|til|-|~'.split("|");
            for (twix=0; twix<thruWords.length; twix++) {
                tempRegex = new RegExp(thruWords[twix], "g");
                inputHoursParse = inputHoursParse.replace(tempRegex,'-');
            }
            inputHoursParse = inputHoursParse.replace(/\-{2,}/g, "-");  // replace any duplicate dashes
            phlogdev('Initial parse: ' + inputHoursParse);

            // kill extra words
            var killWords = 'paste|here|business|operation|times|time|walk-ins|walk ins|welcome|dinner|lunch|brunch|breakfast|regular|weekday|weekend|opening|open|now|from|hours|hour|our|are|EST|and|&'.split("|");
            for (twix=0; twix<killWords.length; twix++) {
                tempRegex = new RegExp('\\b'+killWords[twix]+'\\b', "g");
                inputHoursParse = inputHoursParse.replace(tempRegex,'');
            }
            phlogdev('After kill terms: ' + inputHoursParse);

            // replace day terms with double caps
            for (var dayKey in daysOfTheWeek) {
                if (daysOfTheWeek.hasOwnProperty(dayKey)) {
                    var tempDayList = daysOfTheWeek[dayKey];
                    for (var tdix=0; tdix<tempDayList.length; tdix++) {
                        tempRegex = new RegExp(tempDayList[tdix]+'(?!a-z)', "g");
                        inputHoursParse = inputHoursParse.replace(tempRegex,dayKey);
                    }
                }
            }
            phlogdev('Replace day terms: ' + inputHoursParse);

            // Replace dates
            for (var monthKey in monthsOfTheYear) {
                if (monthsOfTheYear.hasOwnProperty(monthKey)) {
                    var tempMonthList = monthsOfTheYear[monthKey];
                    for (var tmix=0; tmix<tempMonthList.length; tmix++) {
                        tempRegex = new RegExp(tempMonthList[tmix]+'\\.? ?\\d{1,2}\\,? ?201\\d{1}', "g");
                        inputHoursParse = inputHoursParse.replace(tempRegex,' ');
                        tempRegex = new RegExp(tempMonthList[tmix]+'\\.? ?\\d{1,2}', "g");
                        inputHoursParse = inputHoursParse.replace(tempRegex,' ');
                    }
                }
            }
            phlogdev('Replace month terms: ' + inputHoursParse);

            // replace any periods between hours with colons
            inputHoursParse = inputHoursParse.replace(/(\d{1,2})\.(\d{2})/g, '$1:$2');
            // remove remaining periods
            inputHoursParse = inputHoursParse.replace(/\./g, '');
            // remove any non-hour colons between letters and numbers and on string ends
            inputHoursParse = inputHoursParse.replace(/(\D+)\:(\D+)/g, '$1 $2').replace(/^ *\:/g, ' ').replace(/\: *$/g, ' ');
            // replace am/pm with AA/PP
            inputHoursParse = inputHoursParse.replace(/ *pm/g,'PP').replace(/ *am/g,'AA');
            inputHoursParse = inputHoursParse.replace(/ *p\.m\./g,'PP').replace(/ *a\.m\./g,'AA');
            inputHoursParse = inputHoursParse.replace(/ *p\.m/g,'PP').replace(/ *a\.m/g,'AA');
            inputHoursParse = inputHoursParse.replace(/ *p/g,'PP').replace(/ *a/g,'AA');
            // tighten up dashes
            inputHoursParse = inputHoursParse.replace(/\- {1,}/g,'-').replace(/ {1,}\-/g,'-');
            inputHoursParse = inputHoursParse.replace(/^(00:00-00:00)$/g,'MM-UU$1');
            phlogdev('AMPM parse: ' + inputHoursParse);

            //  Change all MTWRFSU to doubles, if any other letters return false
            if (inputHoursParse.match(/[bcdeghijklnoqvxyz]/g) !== null) {
                phlogdev('Extra words in the string');
                return false;
            } else {
                inputHoursParse = inputHoursParse.replace(/m/g,'MM').replace(/t/g,'TT').replace(/w/g,'WW').replace(/r/g,'RR');
                inputHoursParse = inputHoursParse.replace(/f/g,'FF').replace(/s/g,'SS').replace(/u/g,'UU');
            }
            phlogdev('MM/TT format: ' + inputHoursParse);

            // tighten up spaces
            inputHoursParse = inputHoursParse.replace(/ {2,}/g,' ');
            inputHoursParse = inputHoursParse.replace(/ {1,}AA/g,'AA');
            inputHoursParse = inputHoursParse.replace(/ {1,}PP/g,'PP');
            // Expand hours into XX:XX format
            for (var asdf=0; asdf<5; asdf++) {  // repeat a few times to catch any skipped regex matches
                inputHoursParse = inputHoursParse.replace(/([^0-9\:])(\d{1})([^0-9\:])/g, '$10$2:00$3');
                inputHoursParse = inputHoursParse.replace(/^(\d{1})([^0-9\:])/g, '0$1:00$2');
                inputHoursParse = inputHoursParse.replace(/([^0-9\:])(\d{1})$/g, '$10$2:00');

                inputHoursParse = inputHoursParse.replace(/([^0-9\:])(\d{2})([^0-9\:])/g, '$1$2:00$3');
                inputHoursParse = inputHoursParse.replace(/^(\d{2})([^0-9\:])/g, '$1:00$2');
                inputHoursParse = inputHoursParse.replace(/([^0-9\:])(\d{2})$/g, '$1$2:00');

                inputHoursParse = inputHoursParse.replace(/(\D)(\d{1})(\d{2}\D)/g, '$10$2:$3');
                inputHoursParse = inputHoursParse.replace(/^(\d{1})(\d{2}\D)/g, '0$1:$2');
                inputHoursParse = inputHoursParse.replace(/(\D)(\d{1})(\d{2})$/g, '$10$2:$3');

                inputHoursParse = inputHoursParse.replace(/(\D\d{2})(\d{2}\D)/g, '$1:$2');
                inputHoursParse = inputHoursParse.replace(/^(\d{2})(\d{2}\D)/g, '$1:$2');
                inputHoursParse = inputHoursParse.replace(/(\D\d{2})(\d{2})$/g, '$1:$2');

                inputHoursParse = inputHoursParse.replace(/(\D)(\d{1}\:)/g, '$10$2');
                inputHoursParse = inputHoursParse.replace(/^(\d{1}\:)/g, '0$1');
            }

            // replace 12AM range with 00
            inputHoursParse = inputHoursParse.replace( /12(\:\d{2}AA)/g, '00$1');
            // Change PM hours to 24hr time
            while (inputHoursParse.match(/\d{2}\:\d{2}PP/) !== null) {
                tfHourTemp = inputHoursParse.match(/(\d{2})\:\d{2}PP/)[1];
                tfHourTemp = parseInt(tfHourTemp) % 12 + 12;
                inputHoursParse = inputHoursParse.replace(/\d{2}(\:\d{2})PP/,tfHourTemp.toString()+'$1');
            }
            // kill the AA
            inputHoursParse = inputHoursParse.replace( /AA/g, '');
            phlogdev('XX:XX format: ' + inputHoursParse);

            // Side check for tabular input
            var inputHoursParseTab = inputHoursParse.replace( /[^A-Z0-9\:-]/g, ' ').replace( / {2,}/g, ' ');
            inputHoursParseTab = inputHoursParseTab.replace( /^ +/g, '').replace( / {1,}$/g, '');
            if (inputHoursParseTab.match(/[A-Z]{2}\:?\-? [A-Z]{2}\:?\-? [A-Z]{2}\:?\-? [A-Z]{2}\:?\-? [A-Z]{2}\:?\-?/g) !== null) {
                inputHoursParseTab = inputHoursParseTab.split(' ');
                var reorderThree = [0,7,14,1,8,15,2,9,16,3,10,17,4,11,18,5,12,19,6,13,20];
                var reorderTwo = [0,7,1,8,2,9,3,10,4,11,5,12,6,13];
                var inputHoursParseReorder = [], reix;
                if (inputHoursParseTab.length === 21) {
                    for (reix=0; reix<21; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderThree[reix]]);
                    }
                } else if (inputHoursParseTab.length === 18) {
                    for (reix=0; reix<18; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderThree[reix]]);
                    }
                } else if (inputHoursParseTab.length === 15) {
                    for (reix=0; reix<15; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderThree[reix]]);
                    }
                } else if (inputHoursParseTab.length === 14) {
                    for (reix=0; reix<14; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderTwo[reix]]);
                    }
                } else if (inputHoursParseTab.length === 12) {
                    for (reix=0; reix<12; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderTwo[reix]]);
                    }
                } else if (inputHoursParseTab.length === 10) {
                    for (reix=0; reix<10; reix++) {
                        inputHoursParseReorder.push(inputHoursParseTab[reorderTwo[reix]]);
                    }
                }
                //phlogdev('inputHoursParseTab: ' + inputHoursParseTab);
                phlogdev('inputHoursParseReorder: ' + inputHoursParseReorder);
                if (inputHoursParseReorder.length > 9) {
                    inputHoursParseReorder = inputHoursParseReorder.join(' ');
                    inputHoursParseReorder = inputHoursParseReorder.replace(/(\:\d{2}) (\d{2}\:)/g, '$1-$2');
                    inputHoursParse = inputHoursParseReorder;
                }

            }


            // remove colons after Days field
            inputHoursParse = inputHoursParse.replace(/(\D+)\:/g, '$1 ');

            // Find any double sets
            inputHoursParse = inputHoursParse.replace(/([A-Z \-]{2,}) *(\d{2}\:\d{2} *\-{1} *\d{2}\:\d{2}) *(\d{2}\:\d{2} *\-{1} *\d{2}\:\d{2})/g, '$1$2$1$3');
            inputHoursParse = inputHoursParse.replace(/(\d{2}\:\d{2}) *(\d{2}\:\d{2})/g, '$1-$2');
            phlogdev('Add dash: ' + inputHoursParse);

            // remove all spaces
            inputHoursParse = inputHoursParse.replace( / */g, '');

            // Remove any dashes acting as Day separators for 3+ days ("M-W-F")
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4$5$6$7');
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4$5$6');
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4$5');
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3$4');
            inputHoursParse = inputHoursParse.replace( /([A-Z]{2})-([A-Z]{2})-([A-Z]{2})/g, '$1$2$3');

            // parse any 'through' type terms on the day ranges (MM-RR --> MMTTWWRR)
            while (inputHoursParse.match(/[A-Z]{2}\-[A-Z]{2}/) !== null) {
                tfDaysTemp = inputHoursParse.match(/([A-Z]{2})\-([A-Z]{2})/);
                var startDayIX = dayCodeVec.indexOf(tfDaysTemp[1]);
                newDayCodeVec = [tfDaysTemp[1]];
                for (var dcvix=startDayIX+1; dcvix<startDayIX+7; dcvix++) {
                    newDayCodeVec.push(dayCodeVec[dcvix]);
                    if (tfDaysTemp[2] === dayCodeVec[dcvix]) {
                        break;
                    }
                }
                newDayCodeVec = newDayCodeVec.join('');
                inputHoursParse = inputHoursParse.replace(/[A-Z]{2}\-[A-Z]{2}/,newDayCodeVec);
            }

            // split the string between numerical and letter characters
            inputHoursParse = inputHoursParse.replace(/([A-Z])\-?\:?([0-9])/g,'$1|$2');
            inputHoursParse = inputHoursParse.replace(/([0-9])\-?\:?([A-Z])/g,'$1|$2');
            inputHoursParse = inputHoursParse.replace(/(\d{2}\:\d{2})\:00/g,'$1');  // remove seconds
            inputHoursParse = inputHoursParse.split("|");
            phlogdev('Split: ' + inputHoursParse);

            var daysVec = [], hoursVec = [];
            for (tsix=0; tsix<inputHoursParse.length; tsix++) {
                if (inputHoursParse[tsix][0].match(/[A-Z]/) !== null) {
                    daysVec.push(inputHoursParse[tsix]);
                } else if (inputHoursParse[tsix][0].match(/[0-9]/) !== null) {
                    hoursVec.push(inputHoursParse[tsix]);
                } else {
                    phlogdev('Filtering error');
                    return false;
                }
            }

            // check that the dayArray and hourArray lengths correspond
            if ( daysVec.length !== hoursVec.length ) {
                phlogdev('Hour and Day arrays are not matched');
                return false;
            }

            // Combine days with the same hours in the same vector
            var newDaysVec = [], newHoursVec = [], hrsIX;
            for (tsix=0; tsix<daysVec.length; tsix++) {
                if (hoursVec[tsix] !== '99:99-99:99') {  // Don't add the closed days
                    hrsIX = newHoursVec.indexOf(hoursVec[tsix]);
                    if (hrsIX > -1) {
                        newDaysVec[hrsIX] = newDaysVec[hrsIX] + daysVec[tsix];
                    } else {
                        newDaysVec.push(daysVec[tsix]);
                        newHoursVec.push(hoursVec[tsix]);
                    }
                }
            }

            var hoursObjectArray = [], hoursObjectArrayMinDay = [], hoursObjectArraySorted = [], hoursObjectAdd, daysObjArray, toFromSplit;
            for (tsix=0; tsix<newDaysVec.length; tsix++) {
                hoursObjectAdd = {};
                daysObjArray = [];
                toFromSplit = newHoursVec[tsix].match(/(\d{2}\:\d{2})\-(\d{2}\:\d{2})/);
                if (toFromSplit === null) {
                    phlogdev('Hours in wrong format');
                    return false;
                } else {  // Check for hours outside of 0-23 and 0-59
                    var hourCheck = toFromSplit[1].match(/(\d{2})\:/)[1];
                    if (hourCheck>23 || hourCheck < 0) {
                        phlogdev('Not a valid time');
                        return false;
                    }
                    hourCheck = toFromSplit[2].match(/(\d{2})\:/)[1];
                    if (hourCheck>23 || hourCheck < 0) {
                        phlogdev('Not a valid time');
                        return false;
                    }
                    hourCheck = toFromSplit[1].match(/\:(\d{2})/)[1];
                    if (hourCheck>59 || hourCheck < 0) {
                        phlogdev('Not a valid time');
                        return false;
                    }
                    hourCheck = toFromSplit[2].match(/\:(\d{2})/)[1];
                    if (hourCheck>59 || hourCheck < 0) {
                        phlogdev('Not a valid time');
                        return false;
                    }
                }
                // Make the days object
                if ( newDaysVec[tsix].indexOf('MM') > -1 ) {
                    daysObjArray.push(1);
                }
                if ( newDaysVec[tsix].indexOf('TT') > -1 ) {
                    daysObjArray.push(2);
                }
                if ( newDaysVec[tsix].indexOf('WW') > -1 ) {
                    daysObjArray.push(3);
                }
                if ( newDaysVec[tsix].indexOf('RR') > -1 ) {
                    daysObjArray.push(4);
                }
                if ( newDaysVec[tsix].indexOf('FF') > -1 ) {
                    daysObjArray.push(5);
                }
                if ( newDaysVec[tsix].indexOf('SS') > -1 ) {
                    daysObjArray.push(6);
                }
                if ( newDaysVec[tsix].indexOf('UU') > -1 ) {
                    daysObjArray.push(0);
                }
                // build the hours object
                hoursObjectAdd.fromHour = toFromSplit[1];
                hoursObjectAdd.toHour = toFromSplit[2];
                hoursObjectAdd.days = daysObjArray.sort();
                hoursObjectArray.push(hoursObjectAdd);
                // track the order
                if (hoursObjectAdd.days.length > 1 && hoursObjectAdd.days[0] === 0) {
                    hoursObjectArrayMinDay.push( hoursObjectAdd.days[1] * 100 + parseInt(toFromSplit[1][0])*10 + parseInt(toFromSplit[1][1]) );
                } else {
                    hoursObjectArrayMinDay.push( (((hoursObjectAdd.days[0]+6)%7)+1) * 100 + parseInt(toFromSplit[1][0])*10 + parseInt(toFromSplit[1][1]) );
                }
            }
            sortWithIndex(hoursObjectArrayMinDay);
            for (var hoaix=0; hoaix < hoursObjectArrayMinDay.length; hoaix++) {
                hoursObjectArraySorted.push(hoursObjectArray[hoursObjectArrayMinDay.sortIndices[hoaix]]);
            }
            if ( !checkHours(hoursObjectArraySorted) ) {
                phlogdev('Overlapping hours');
                return false;
            } else {
                for ( var ohix=0; ohix<hoursObjectArraySorted.length; ohix++ ) {
                    phlogdev(hoursObjectArraySorted[ohix]);
                    if ( hoursObjectArraySorted[ohix].days.length === 2 && hoursObjectArraySorted[ohix].days[0] === 0 && hoursObjectArraySorted[ohix].days[1] === 1) {
                        // separate hours
                        phlogdev('Splitting M-S entry...');
                        hoursObjectArraySorted.push({days: [0], fromHour: hoursObjectArraySorted[ohix].fromHour, toHour: hoursObjectArraySorted[ohix].toHour});
                        hoursObjectArraySorted[ohix].days = [1];
                    }
                }
            }
            return hoursObjectArraySorted;
        }

        // function to check overlapping hours
        function checkHours(hoursObj) {
            //debug('-- checkHours(hoursObj) called --');
            if (hoursObj.length === 1) {
                return true;
            }
            var daysObj, fromHourTemp, toHourTemp;
            for (var day2Ch=0; day2Ch<7; day2Ch++) {  // Go thru each day of the week
                daysObj = [];
                for ( var hourSet = 0; hourSet < hoursObj.length; hourSet++ ) {  // For each set of hours
                    if (hoursObj[hourSet].days.indexOf(day2Ch) > -1) {  // pull out hours that are for the current day, add 2400 if it goes past midnight, and store
                        fromHourTemp = hoursObj[hourSet].fromHour.replace(/\:/g,'');
                        toHourTemp = hoursObj[hourSet].toHour.replace(/\:/g,'');
                        if (toHourTemp < fromHourTemp) {
                            toHourTemp = parseInt(toHourTemp) + 2400;
                        }
                        daysObj.push([fromHourTemp, toHourTemp]);
                    }
                }
                if (daysObj.length > 1) {  // If there's multiple hours for the day, check them for overlap
                    for ( var hourSetCheck2 = 1; hourSetCheck2 < daysObj.length; hourSetCheck2++ ) {
                        for ( var hourSetCheck1 = 0; hourSetCheck1 < hourSetCheck2; hourSetCheck1++ ) {
                            if ( daysObj[hourSetCheck2][0] > daysObj[hourSetCheck1][0] && daysObj[hourSetCheck2][0] < daysObj[hourSetCheck1][1] ) {
                                return false;
                            }
                            if ( daysObj[hourSetCheck2][1] > daysObj[hourSetCheck1][0] && daysObj[hourSetCheck2][1] < daysObj[hourSetCheck1][1] ) {
                                return false;
                            }
                        }
                    }
                }
            }
            return true;
        }

        // Duplicate place finder  ###bmtg
        function findNearbyDuplicate(itemName, itemAliases, item, recenterOption) {
            dupeIDList = [item.attributes.id];
            dupeHNRangeList = [];
            dupeHNRangeIDList = [];
            dupeHNRangeDistList = [];
            var venueList = W.model.venues.objects, currNameList = [], testNameList = [], testVenueAtt, testName, testNameNoNum, itemNameRF, aliasNameRF, aliasNameNoNum;
            var t0, t1, wlDupeMatch = false, wlDupeList = [], nameMatch = false, altNameMatch = -1, aliix, cnlix, tnlix, randInt = 100;
            var outOfExtent = false, mapExtent = W.map.getExtent(), padFrac = 0.15;  // how much to pad the zoomed window
            // Initialize the cooridnate extents for duplicates
            var minLon = item.geometry.getCentroid().x, minLat = item.geometry.getCentroid().y;
            var maxLon = minLon, maxLat = minLat;
            // genericterms to skip if it's all that remains after stripping numbers
            var noNumSkip = 'BANK|ATM|HOTEL|MOTEL|STORE|MARKET|SUPERMARKET|GYM|GAS|GASOLINE|GASSTATION|CAFE|OFFICE|OFFICES|CARRENTAL|RENTALCAR|RENTAL|SALON|BAR|BUILDING|LOT';
            noNumSkip = noNumSkip + '|'+ collegeAbbreviations;
            noNumSkip = noNumSkip.split('|');
            // Make the padded extent
            mapExtent.left = mapExtent.left + padFrac * (mapExtent.right-mapExtent.left);
            mapExtent.right = mapExtent.right - padFrac * (mapExtent.right-mapExtent.left);
            mapExtent.bottom = mapExtent.bottom + padFrac * (mapExtent.top-mapExtent.bottom);
            mapExtent.top = mapExtent.top - padFrac * (mapExtent.top-mapExtent.bottom);

            var allowedTwoLetters = ['BP','DQ','BK','BW','LQ','QT','DB','PO'];

            var labelFeatures = [], dupeNames = [], labelText, labelTextReformat, pt, textFeature, labelColorIX = 0;
            var labelColorList = ['#3F3'];
            // Name formatting for the WME place name
            itemNameRF = itemName.toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');  // Format name
            if ( itemNameRF.length>2 || allowedTwoLetters.indexOf(itemNameRF) > -1 ) {
                currNameList.push(itemNameRF);
            } else {
                currNameList.push('PRIMNAMETOOSHORT_PJZWX');
            }
            var itemNameNoNum = itemNameRF.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )
            if ( ((itemNameNoNum.length>2 && noNumSkip.indexOf(itemNameNoNum) === -1) || allowedTwoLetters.indexOf(itemNameNoNum) > -1) && item.attributes.categories.indexOf('PARKING_LOT') === -1 ) {  //  only add de-numbered name if anything remains
                currNameList.push(itemNameNoNum);
            }
            if (itemAliases.length > 0) {
                for (aliix=0; aliix<itemAliases.length; aliix++) {
                    aliasNameRF = itemAliases[aliix].toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');  // Format name
                    if ( (aliasNameRF.length>2 && noNumSkip.indexOf(aliasNameRF) === -1) || allowedTwoLetters.indexOf(aliasNameRF) > -1 ) {  //  only add de-numbered name if anything remains
                        currNameList.push(aliasNameRF);
                    }
                    aliasNameNoNum = aliasNameRF.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )
                    if ( ((aliasNameNoNum.length>2 && noNumSkip.indexOf(aliasNameNoNum) === -1) || allowedTwoLetters.indexOf(aliasNameNoNum) > -1) && item.attributes.categories.indexOf('PARKING_LOT') === -1 ) {  //  only add de-numbered name if anything remains
                        currNameList.push(aliasNameNoNum);
                    }
                }
            }
            //debug('5456 // About to call uniq() once inside of findNearbyDuplicate()');
            currNameList = uniq(currNameList);  //  remove duplicates

            // Remove any previous search labels and move the layer above the places layer
            WMEPH_NAME_LAYER.destroyFeatures();
            var vecLyrPlaces = W.map.getLayersBy("uniqueName","landmarks")[0];
            WMEPH_NAME_LAYER.setZIndex(parseInt(vecLyrPlaces.getZIndex())+3);  // Move layer to just on top of Places layer

            if ( venueWhitelist.hasOwnProperty(item.attributes.id) ) {
                if ( venueWhitelist[item.attributes.id].hasOwnProperty('dupeWL') ) {
                    wlDupeList = venueWhitelist[item.attributes.id].dupeWL;
                }
            }

            if (IS_DEV_USER) {
                t0 = performance.now();  // Speed check start
            }
            var numVenues = 0, overlappingFlag = false;
            var addrItem = item.getAddress(), itemCompAddr = false;
            if ( addrItem.hasOwnProperty('attributes') ) {
                addrItem = addrItem.attributes;
            }
            if (addrItem.street !== null && addrItem.street.name !== null && item.attributes.houseNumber && item.attributes.houseNumber.match(/\d/g) !== null) {
                itemCompAddr = true;
            }

            for (var venix in venueList) {  // for each place on the map:
                if (venueList.hasOwnProperty(venix)) {  // hOP filter
                    numVenues++;
                    nameMatch = false;
                    altNameMatch = -1;
                    testVenueAtt = venueList[venix].attributes;
                    var excludePLADupes = $('#WMEPH-ExcludePLADupes' + devVersStr).prop('checked');
                    if (!excludePLADupes || isPLA(item) === isPLA(venueList[venix])) {

                        var pt2ptDistance =  item.geometry.getCentroid().distanceTo(venueList[venix].geometry.getCentroid());
                        if ( item.isPoint() && venueList[venix].isPoint() && pt2ptDistance < 2 && item.attributes.id !== testVenueAtt.id ) {
                            overlappingFlag = true;
                        }
                        wlDupeMatch = false;
                        if (wlDupeList.length>0 && wlDupeList.indexOf(testVenueAtt.id) > -1) {
                            wlDupeMatch = true;
                        }

                        // get HNs for places on same street
                        var addrDupe = venueList[venix].getAddress();
                        if ( addrDupe.hasOwnProperty('attributes') ) {
                            addrDupe = addrDupe.attributes;
                        }
                        if (itemCompAddr && addrDupe.street !== null && addrDupe.street.name !== null && testVenueAtt.houseNumber && testVenueAtt.houseNumber !== '' &&
                            venix !== item.attributes.id && addrItem.street.name === addrDupe.street.name && testVenueAtt.houseNumber < 1000000) {
                            dupeHNRangeList.push(parseInt(testVenueAtt.houseNumber));
                            dupeHNRangeIDList.push(testVenueAtt.id);
                            dupeHNRangeDistList.push(pt2ptDistance);
                        }


                        // Check for duplicates
                        if ( !wlDupeMatch && dupeIDList.length<6 && pt2ptDistance < 800 && !testVenueAtt.residential && venix !== item.attributes.id && 'string' === typeof testVenueAtt.id && testVenueAtt.name !== null && testVenueAtt.name.length>1 ) {  // don't do res, the point itself, new points or no name
                            // If item has a complete address and test venue does, and they are different, then no dupe
                            var suppressMatch = false;
                            if ( itemCompAddr && addrDupe.street !== null && addrDupe.street.name !== null && testVenueAtt.houseNumber && testVenueAtt.houseNumber.match(/\d/g) !== null ) {
                                if ( item.attributes.lockRank > 0 && testVenueAtt.lockRank > 0 ) {
                                    if ( item.attributes.houseNumber !== testVenueAtt.houseNumber || addrItem.street.name !== addrDupe.street.name ) {
                                        suppressMatch = true;
                                    }
                                } else {
                                    if ( item.attributes.houseNumber !== testVenueAtt.houseNumber && addrItem.street.name !== addrDupe.street.name ) {
                                        suppressMatch = true;
                                    }
                                }
                            }


                            if ( !suppressMatch ) {
                                //Reformat the testPlace name
                                testName = testVenueAtt.name.toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');  // Format test name
                                if (  (testName.length>2 && noNumSkip.indexOf(testName) === -1) || allowedTwoLetters.indexOf(testName) > -1  ) {
                                    testNameList = [testName];
                                } else {
                                    testNameList = ['TESTNAMETOOSHORTQZJXS'+randInt];
                                    randInt++;
                                }

                                testNameNoNum = testName.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match
                                if ( ((testNameNoNum.length>2 && noNumSkip.indexOf(testNameNoNum) === -1) || allowedTwoLetters.indexOf(testNameNoNum) > -1) && testVenueAtt.categories.indexOf('PARKING_LOT') === -1 ) {  //  only add de-numbered name if at least 2 chars remain
                                    testNameList.push(testNameNoNum);
                                }
                                // primary name matching loop

                                for (tnlix=0; tnlix < testNameList.length; tnlix++) {
                                    for (cnlix=0; cnlix < currNameList.length; cnlix++) {
                                        if ( (testNameList[tnlix].indexOf(currNameList[cnlix]) > -1 || currNameList[cnlix].indexOf(testNameList[tnlix]) > -1) ) {
                                            nameMatch = true;
                                            break;
                                        }
                                    }
                                    if (nameMatch) {break;}  // break if a match found
                                }
                                if (!nameMatch && testVenueAtt.aliases.length > 0) {
                                    for (aliix=0; aliix<testVenueAtt.aliases.length; aliix++) {
                                        aliasNameRF = testVenueAtt.aliases[aliix].toUpperCase().replace(/ AND /g, '').replace(/^THE /g, '').replace(/[^A-Z0-9]/g, '');  // Format name
                                        if ( (aliasNameRF.length>2 && noNumSkip.indexOf(aliasNameRF) === -1) || allowedTwoLetters.indexOf(aliasNameRF) > -1  ) {
                                            testNameList = [aliasNameRF];
                                        } else {
                                            testNameList = ['ALIASNAMETOOSHORTQOFUH'+randInt];
                                            randInt++;
                                        }
                                        aliasNameNoNum = aliasNameRF.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )
                                        if (((aliasNameNoNum.length>2 && noNumSkip.indexOf(aliasNameNoNum) === -1) || allowedTwoLetters.indexOf(aliasNameNoNum) > -1) && testVenueAtt.categories.indexOf('PARKING_LOT') === -1) {  //  only add de-numbered name if at least 2 characters remain
                                            testNameList.push(aliasNameNoNum);
                                        } else {
                                            testNameList.push('111231643239'+randInt);  //  just to keep track of the alias in question, always add something.
                                            randInt++;
                                        }
                                    }
                                    for (tnlix=0; tnlix < testNameList.length; tnlix++) {
                                        for (cnlix=0; cnlix < currNameList.length; cnlix++) {
                                            if ( (testNameList[tnlix].indexOf(currNameList[cnlix]) > -1 || currNameList[cnlix].indexOf(testNameList[tnlix]) > -1) ) {
                                                // get index of that match (half of the array index with floor)
                                                altNameMatch = Math.floor(tnlix/2);
                                                break;
                                            }
                                        }
                                        if (altNameMatch > -1) {break;}  // break from the rest of the alts if a match found
                                    }
                                }
                                // If a match was found:
                                if ( nameMatch || altNameMatch > -1 ) {
                                    dupeIDList.push(testVenueAtt.id);  // Add the item to the list of matches
                                    WMEPH_NAME_LAYER.setVisibility(true);  // If anything found, make visible the dupe layer
                                    if (nameMatch) {
                                        labelText = testVenueAtt.name;  // Pull duplicate name
                                    } else {
                                        labelText = testVenueAtt.aliases[altNameMatch] + ' (Alt)';  // Pull duplicate alt name
                                    }
                                    phlogdev('Possible duplicate found. WME place: ' + itemName + ' / Nearby place: ' + labelText);

                                    // Reformat the name into multiple lines based on length
                                    var startIX=0, endIX=0, labelTextBuild = [], maxLettersPerLine = Math.round(2*Math.sqrt(labelText.replace(/ /g,'').length/2));
                                    maxLettersPerLine = Math.max(maxLettersPerLine,4);
                                    while (endIX !== -1) {
                                        endIX = labelText.indexOf(' ', endIX+1);
                                        if (endIX - startIX > maxLettersPerLine) {
                                            labelTextBuild.push( labelText.substr(startIX,endIX-startIX) );
                                            startIX = endIX+1;
                                        }
                                    }
                                    labelTextBuild.push( labelText.substr(startIX) );  // Add last line
                                    labelTextReformat = labelTextBuild.join('\n');
                                    // Add photo icons
                                    if (testVenueAtt.images.length > 0 ) {
                                        labelTextReformat = labelTextReformat + ' ';
                                        for (var phix=0; phix<testVenueAtt.images.length; phix++) {
                                            if (phix===3) {
                                                labelTextReformat = labelTextReformat + '+';
                                                break;
                                            }
                                            //labelTextReformat = labelTextReformat + '\u25A3';  // add photo icons
                                            labelTextReformat = labelTextReformat + '\u25A3';  // add photo icons
                                        }
                                    }

                                    pt = venueList[venix].geometry.getCentroid();
                                    if ( !mapExtent.containsLonLat(pt.toLonLat()) ) {
                                        outOfExtent = true;
                                    }
                                    minLat = Math.min(minLat, pt.y); minLon = Math.min(minLon, pt.x);
                                    maxLat = Math.max(maxLat, pt.y); maxLon = Math.max(maxLon, pt.x);

                                    textFeature = new OpenLayers.Feature.Vector( pt, {labelText: labelTextReformat, fontColor: '#fff',
                                                                                      strokeColor: labelColorList[labelColorIX%labelColorList.length], labelAlign: 'cm', pointRadius: 25 , dupeID: testVenueAtt.id } );
                                    labelFeatures.push(textFeature);
                                    //WMEPH_NAME_LAYER.addFeatures(labelFeatures);
                                    dupeNames.push(labelText);
                                }
                                labelColorIX++;
                            }
                        }
                    }
                }
            }
            // Add a marker for the working place point if any dupes were found
            //phlogdev('dupeIDList: ' + dupeIDList);
            if (dupeIDList.length>1) {
                pt = item.geometry.getCentroid();
                if ( !mapExtent.containsLonLat(pt.toLonLat()) ) {
                    outOfExtent = true;
                }
                minLat = Math.min(minLat, pt.y); minLon = Math.min(minLon, pt.x);
                maxLat = Math.max(maxLat, pt.y); maxLon = Math.max(maxLon, pt.x);
                // Add photo icons
                var currentLabel = 'Current';
                if (item.attributes.images.length > 0 ) {
                    for (var ciix=0; ciix<item.attributes.images.length; ciix++) {
                        currentLabel = currentLabel + ' ';
                        if (ciix===3) {
                            currentLabel = currentLabel + '+';
                            break;
                        }
                        currentLabel = currentLabel + '\u25A3';  // add photo icons
                    }
                }
                textFeature = new OpenLayers.Feature.Vector( pt, {labelText: currentLabel, fontColor: '#fff', strokeColor: '#fff', labelAlign: 'cm', pointRadius: 25 , dupeID: item.attributes.id} );
                labelFeatures.push(textFeature);
                WMEPH_NAME_LAYER.addFeatures(labelFeatures);
            }
            if (IS_DEV_USER) {
                t1 = performance.now();  // log search time
                //phlogdev("Ran dupe search on " + numVenues + " nearby venues in " + (t1 - t0) + " milliseconds.");
            }
            if (recenterOption && dupeNames.length>0 && outOfExtent) {  // then rebuild the extent to include the duplicate
                var padMult = 1.0;
                mapExtent.left = minLon - (padFrac*padMult) * (maxLon-minLon);
                mapExtent.right = maxLon + (padFrac*padMult) * (maxLon-minLon);
                mapExtent.bottom = minLat - (padFrac*padMult) * (maxLat-minLat);
                mapExtent.top = maxLat + (padFrac*padMult) * (maxLat-minLat);
                W.map.zoomToExtent(mapExtent);
            }
            return [dupeNames, overlappingFlag];
        }  // END Dupefinder function

        // On selection of new item:
        function checkSelection() {
            //debug('-- checkSelection() called --');
            if (W.selectionManager.selectedItems.length > 0) {
                var newItem = W.selectionManager.selectedItems[0].model;
                if (newItem.type === "venue") {
                    displayRunButton();
                    getPanelFields();
                    if ( $("#WMEPH-EnableCloneMode" + devVersStr).prop('checked') ) {
                        displayCloneButton();
                    }
                    if (localStorage.getItem("WMEPH-AutoRunOnSelect" + devVersStr) === '1') {
                        setTimeout(harmonizePlace,200);
                    }
                    for (var dvtix=0; dvtix<dupeIDList.length; dvtix++) {
                        if (newItem.attributes.id === dupeIDList[dvtix]) {  // If the user selects a place in the dupe list, don't clear the labels yet
                            return;
                        }
                    }
                }
                // If the selection is anything else, clear the labels
                WMEPH_NAME_LAYER.destroyFeatures();
                WMEPH_NAME_LAYER.setVisibility(false);
            }
        }  // END checkSelection function

        // Functions to infer address from nearby segments
        function WMEPH_inferAddress(MAX_RECURSION_DEPTH) {
            //debug('-- WMEPH_inferAddress(MAX_RECURSION_DEPTH) called --');
            var distanceToSegment,
                foundAddresses = [],
                i,
                // Ignore pedestrian boardwalk, stairways, runways, and railroads
                IGNORE_ROAD_TYPES = [10, 16, 18, 19],
                inferredAddress = {
                    country: null,
                    city: null,
                    state: null,
                    street: null
                },
                //MAX_RECURSION_DEPTH = 8,
                n,
                orderedSegments = [],
                segments = W.model.segments.getObjectArray(),
                selectedItem,
                stopPoint,
                wmeSelectedItems = W.selectionManager.selectedItems;

            var findClosestNode = function () {
                var closestSegment = orderedSegments[0].segment,
                    distanceA,
                    distanceB,
                    nodeA = W.model.nodes.get(closestSegment.attributes.fromNodeID),
                    nodeB = W.model.nodes.get(closestSegment.attributes.toNodeID);
                if (nodeA && nodeB) {
                    var pt = stopPoint.point ? stopPoint.point : stopPoint;
                    distanceA = pt.distanceTo(nodeA.attributes.geometry);
                    distanceB = pt.distanceTo(nodeB.attributes.geometry);
                    return distanceA < distanceB ?
                        nodeA.attributes.id : nodeB.attributes.id;
                }
            };

            var findConnections = function (startingNodeID, recursionDepth) {
                var connectedSegments,
                    k,
                    newNode;

                // Limit search depth to avoid problems.
                if (recursionDepth > MAX_RECURSION_DEPTH) {
                    //console.debug('Max recursion depth reached');
                    return;
                }

                // Populate variable with segments connected to starting node.
                connectedSegments = _.where(orderedSegments, {
                    fromNodeID: startingNodeID
                });
                connectedSegments = connectedSegments.concat(_.where(orderedSegments, {
                    toNodeID: startingNodeID
                }));

                //console.debug('Looking for connections at node ' + startingNodeID);

                // Check connected segments for address info.
                for (k in connectedSegments) {
                    if (connectedSegments.hasOwnProperty(k)) {
                        if (hasStreetName(connectedSegments[k].segment)) {
                            // Address found, push to array.
                            /*
                            console.debug('Address found on connnected segment ' +
                            connectedSegments[k].segment.attributes.id +
                            '. Recursion depth: ' + recursionDepth);
                            */
                            foundAddresses.push({
                                depth: recursionDepth,
                                distance: connectedSegments[k].distance,
                                segment: connectedSegments[k].segment
                            });
                            break;
                        } else {
                            // If not found, call function again starting from the other node on this segment.
                            //console.debug('Address not found on connected segment ' + connectedSegments[k].segment.attributes.id);
                            newNode = connectedSegments[k].segment.attributes.fromNodeID === startingNodeID ?
                                connectedSegments[k].segment.attributes.toNodeID :
                            connectedSegments[k].segment.attributes.fromNodeID;
                            findConnections(newNode, recursionDepth + 1);
                        }
                    }
                }
            };

            var getFCRank = function (FC) {
                var typeToFCRank = {
                    3: 0, // freeway
                    6: 1, // major
                    7: 2, // minor
                    2: 3, // primary
                    1: 4, // street
                    20: 5, // PLR
                    8: 6 // dirt
                };
                if (FC && !isNaN(FC)) {
                    return typeToFCRank[FC] || 100;
                }
            };

            var hasStreetName = function (segment) {
                return segment && segment.type === 'segment' && segment.getAddressDetails().streetName !== 'No street';
            };

            // phlogdev("No address data, gathering ", 2);

            // Make sure a place is selected and segments are loaded.
            if (wmeSelectedItems.length > 0 && segments.length > 0 &&
                wmeSelectedItems[0].model.type === 'venue') {
                selectedItem = W.selectionManager.selectedItems[0];
            } else {
                return;
            }

            if (selectedItem.model.isPoint()) {
                stopPoint = selectedItem.geometry;
            } else {
                var entryExitPoints = selectedItem.model.attributes.entryExitPoints;
                if (entryExitPoints.length > 0) {
                    stopPoint = entryExitPoints[0];
                } else {
                    return;
                }
            }

            // Go through segment array and calculate distances to segments.
            for (i = 0, n = segments.length; i < n; i++) {
                // Make sure the segment is not an ignored roadType.
                if (IGNORE_ROAD_TYPES.indexOf(segments[i].attributes.roadType) === -1) {
                    distanceToSegment = (stopPoint.point ? stopPoint.point : stopPoint).distanceTo(segments[i].geometry);
                    // Add segment object and its distanceTo to an array.
                    orderedSegments.push({
                        distance: distanceToSegment,
                        fromNodeID: segments[i].attributes.fromNodeID,
                        segment: segments[i],
                        toNodeID: segments[i].attributes.toNodeID
                    });
                }
            }

            // Sort the array with segments and distance.
            orderedSegments = _.sortBy(orderedSegments, 'distance');

            // Check closest segment for address first.
            if (hasStreetName(orderedSegments[0].segment)) {
                inferredAddress = orderedSegments[0].segment.getAddress();
            } else {
                // If address not found on closest segment, try to find address through branching method.
                findConnections(findClosestNode(), 1);
                if (foundAddresses.length > 0) {
                    // If more than one address found at same recursion depth, look at FC of segments.
                    if (foundAddresses.length > 1) {
                        _.each(foundAddresses, function (element) {
                            element.fcRank = getFCRank(
                                element.segment.attributes.roadType);
                        });
                        foundAddresses = _.sortBy(foundAddresses, 'fcRank');
                        foundAddresses = _.filter(foundAddresses, {
                            fcRank: foundAddresses[0].fcRank
                        });
                    }

                    // If multiple segments with same FC, Use address from segment with address that is closest by connectivity.
                    if (foundAddresses.length > 1) {
                        foundAddresses = _.sortBy(foundAddresses, 'depth');
                        foundAddresses = _.filter(foundAddresses, {
                            depth: foundAddresses[0].depth
                        });
                    }

                    // If more than one of the closest segments by connectivity has the same FC, look for
                    // closest segment geometrically.
                    if (foundAddresses.length > 1) {
                        foundAddresses = _.sortBy(foundAddresses, 'distance');
                    }
                    console.debug(foundAddresses[0].streetName, foundAddresses[0].depth);
                    inferredAddress = foundAddresses[0].segment.getAddress();
                } else {
                    // Default to closest if branching method fails.
                    // Go through sorted segment array until a country, state, and city have been found.
                    inferredAddress = _.find(orderedSegments, function (element) {
                        return hasStreetName(element.segment);
                    }).segment.getAddress() || inferredAddress;
                }
            }
            return inferredAddress;
        }  // END inferAddress function

        /**
         * Updates the address for a place.
         * @param feature {WME Venue Object} The place to update.
         * @param address {Object} An object containing the country, state, city, and street
         * @param actions {Array of actions} Optional. If performing multiple actions at once.
         * objects.
         */
        function updateAddress(feature, address, actions) {
            var newAttributes,
                UpdateFeatureAddress = require('Waze/Action/UpdateFeatureAddress');
            feature = feature || item;
            if (feature && address) {
                newAttributes = {
                    countryID: address.country.id,
                    stateID: address.state.id,
                    cityName: address.city.attributes.name,
                    emptyCity: address.city.attributes.name ? null : true,
                    streetName: address.street.name,
                    emptyStreet: address.street.name ? null : true
                };
                var action = new UpdateFeatureAddress(feature, newAttributes);
                if(actions) {
                    actions.push(action);
                } else {
                    W.model.actionManager.add(action);
                }
                phlogdev('Address inferred and updated');
            }
        } // END updateAddress function

        // Build a Google search url based on place name and address
        function buildGLink(searchName,addr,HN) {
            //debug('-- buildGLink(searchName,addr,HN) called --');
            var searchHN = "", searchStreet = "", searchCity = "";
            searchName = searchName.replace(/&/g, "%26");
            searchName = searchName.replace(/[ \/]/g, "%20");
            if ("string" === typeof addr.street.name && addr.street.name !== null && addr.street.name !== '') {
                searchStreet = addr.street.name + ",%20";
            }
            searchStreet = searchStreet.replace(/ /g, "%20");
            searchStreet = searchStreet.replace(/CR-/g, "County%20Rd%20");
            searchStreet = searchStreet.replace(/SR-/g, "State%20Hwy%20");
            searchStreet = searchStreet.replace(/US-/g, "US%20Hwy%20");
            searchStreet = searchStreet.replace(/ CR /g, "%20County%20Rd%20");
            searchStreet = searchStreet.replace(/ SR /g, "%20State%20Hwy%20");
            searchStreet = searchStreet.replace(/ US /g, "%20US%20Hwy%20");
            searchStreet = searchStreet.replace(/$CR /g, "County%20Rd%20");
            searchStreet = searchStreet.replace(/$SR /g, "State%20Hwy%20");
            searchStreet = searchStreet.replace(/$US /g, "US%20Hwy%20");
            if ("string" === typeof HN && searchStreet !== "") {
                searchHN = HN + "%20";
            }
            if ("string" === typeof addr.city.attributes.name && addr.city.attributes.name !== '') {
                searchCity = addr.city.attributes.name + ",%20";
            }
            searchCity = searchCity.replace(/ /g, "%20");

            return "http://www.google.com/search?q=" + searchName + ",%20" + searchHN + searchStreet + searchCity + addr.state.name;
        } // END buildGLink function

        // WME Category translation from Natural language to object language  (Bank / Financial --> BANK_FINANCIAL)
        function catTranslate(natCategories) {
            //debug('-- catTranslate(natCategories) called --');
            //console.log(natCategories);
            var natCategoriesRepl = natCategories.toUpperCase().replace(/ AND /g, "").replace(/[^A-Z]/g, "");
            if (natCategoriesRepl.indexOf('PETSTORE') > -1) {
                return "PET_STORE_VETERINARIAN_SERVICES";
            }
            for(var keyCat in catTransWaze2Lang){
                if ( natCategoriesRepl ===  catTransWaze2Lang[keyCat].toUpperCase().replace(/ AND /g, "").replace(/[^A-Z]/g, "")) {
                    return keyCat;
                }
            }
            // if the category doesn't translate, then pop an alert that will make a forum post to the thread
            // Generally this means the category used in the PNH sheet is not close enough to the natural language categories used inside the WME translations
            if (confirm('WMEPH: Category Error!\nClick OK to report this error') ) {
                forumMsgInputs = {
                    subject: 'WMEPH Bug report: no tns',
                    message: 'Error report: Category "' + natCategories + '" is not translatable.'
                };
                WMEPH_errorReport(forumMsgInputs);
            }
            return "ERROR";
        }  // END catTranslate function

        // compares two arrays to see if equal, regardless of order
        function matchSets(array1, array2) {
            if (array1.length !== array2.length) {return false;}  // compare lengths
            for (var i = 0; i < array1.length; i++) {
                if (array2.indexOf(array1[i]) === -1) {
                    return false;
                }
            }
            return true;
        }

        // function that checks if all elements of target are in array:source
        function containsAll(source,target) {
            //debug('-- containsAll(source,target) called --');
            if (typeof(target) === "string") { target = [target]; }  // if a single string, convert to an array
            for (var ixx = 0; ixx < target.length; ixx++) {
                if ( source.indexOf(target[ixx]) === -1 ) {
                    return false;
                }
            }
            return true;
        }

        // function that checks if any element of target are in source
        function containsAny(source,target) {
            //debug('-- containsAny(source,target) called --');
            if (typeof(source) === "string") { source = [source]; }  // if a single string, convert to an array
            if (typeof(target) === "string") { target = [target]; }  // if a single string, convert to an array
            var result = source.filter(function(tt){ return target.indexOf(tt) > -1; });
            return (result.length > 0);
        }

        // Function that inserts a string or a string array into another string array at index ix and removes any duplicates
        function insertAtIX(array1, array2, ix) {  // array1 is original string, array2 is the inserted string, at index ix
            var arrayNew = array1.slice(0);  // slice the input array so it doesn't change
            if (typeof(array2) === "string") { array2 = [array2]; }  // if a single string, convert to an array
            if (typeof(array2) === "object") {  // only apply to inserted arrays
                var arrayTemp = arrayNew.splice(ix);  // split and hold the first part
                arrayNew.push.apply(arrayNew, array2);  // add the insert
                arrayNew.push.apply(arrayNew, arrayTemp);  // add the tail end of original
            }
            //debug('6021 // About to call uniq() once inside of insertAtIX()');
            return uniq(arrayNew);  // remove any duplicates (so the function can be used to move the position of a string)
        }

        // Function to remove unnecessary aliases
        function removeSFAliases(nName, nAliases) {
            var newAliasesUpdate = [];
            nName = nName.toUpperCase().replace(/'/g,'').replace(/-/g,' ').replace(/\/ /g,' ').replace(/ \//g,' ').replace(/ {2,}/g,' ');
            for (var naix=0; naix<nAliases.length; naix++) {
                if ( !nName.startsWith( nAliases[naix].toUpperCase().replace(/'/g,'').replace(/-/g,' ').replace(/\/ /g,' ').replace(/ \//g,' ').replace(/ {2,}/g,' ') ) ) {
                    newAliasesUpdate.push(nAliases[naix]);
                } else {
                    //phlogdev('Unnecessary alias removed: ' + nAliases[naix]);
                    bannButt.sfAliases.active = true;
                }
            }
            return newAliasesUpdate;
        }

        // settings tab
        function add_PlaceHarmonizationSettingsTab() {
            //debug('-- add_PlaceHarmonizationSettingsTab() called --');
            //Create Settings Tab
            var phTabHtml = '<li><a href="#sidepanel-ph' + devVersStr + '" data-toggle="tab" id="PlaceHarmonization' + devVersStr + '">WMEPH' + devVersStrSpace + '</a></li>';
            $("#user-tabs ul.nav-tabs:first").append(phTabHtml);

            //Create Settings Tab Content
            var phContentHtml = '<div class="tab-pane" id="sidepanel-ph' + devVersStr + '"><div id="PlaceHarmonizer' + devVersStr + '">WMEPH' +
                devVersStrSpace + ' v. ' + WMEPH_VERSION_LONG + '</div></div>';
            $("#user-info div.tab-content:first").append(phContentHtml);

            var c = '<div id="wmephtab" class="active" style="padding-top: 5px;">' +
                '<ul class="nav nav-tabs"><li class="active"><a data-toggle="tab" href="#sidepanel-harmonizer' + devVersStr + '">Harmonize</a></li>' +
                '<li><a data-toggle="tab" href="#sidepanel-highlighter' + devVersStr + '">HL \/ Scan</a></li>' +
                '<li><a data-toggle="tab" href="#sidepanel-wltools' + devVersStr + '">WL Tools</a></li></ul>' +
                '<div class="tab-content"><div class="tab-pane active" id="sidepanel-harmonizer' + devVersStr + '"></div>' +
                '<div class="tab-pane" id="sidepanel-highlighter' + devVersStr + '"></div>' +
                '<div class="tab-pane" id="sidepanel-wltools' + devVersStr + '"></div></div></div>';

            //add the sub tabs to the scripts main tab
            $("#sidepanel-ph"+devVersStr).append(c);

            // Enable certain settings by default if not set by the user:
            if (localStorage.getItem('WMEPH-ColorHighlighting'+devVersStr) === null) {
                localStorage.setItem('WMEPH-ColorHighlighting'+devVersStr, '1');
            }

            //Create Settings Checkboxes and Load Data
            //example condition:  if ( $("#WMEPH-DisableDFZoom" + devVersStr).prop('checked') ) { }
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-WebSearchNewTab" + devVersStr,"Open URL & Search Results in new tab instead of new window");
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-DisableDFZoom" + devVersStr,"Disable zoom & center for duplicates");
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-EnableIAZoom" + devVersStr,"Enable zoom & center for places with no address");
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-HidePlacesWiki" + devVersStr,"Hide 'Places Wiki' button in results banner");
            createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-ExcludePLADupes" + devVersStr,"Exclude parking lots when searching for duplicate places.");
            if (IS_DEV_USER || IS_BETA_USER || USER_RANK >= 2) {
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-DisablePLAExtProviderCheck" + devVersStr,'Disable check for "Missing External Provider" on Parking Lot Areas');
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-ExtProviderSeverity" + devVersStr,'Treat "Missing External Provider" as non-critical (blue)');
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-EnableServices" + devVersStr,"Enable automatic addition of common services");
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-ConvenienceStoreToGasStations" + devVersStr,'Automatically add "Convenience Store" category to gas stations');
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-AddAddresses" + devVersStr,"Add detected address fields to places with no address");
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-EnableCloneMode" + devVersStr,"Enable place cloning tools");
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-AutoLockRPPs" + devVersStr,"Lock residential place points to region default");
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-AutoRunOnSelect" + devVersStr,'Automatically run the script when selecting a place');
            }

            ["#WMEPH-ExtProviderSeverity" + devVersStr, "#WMEPH-DisablePLAExtProviderCheck" + devVersStr].map(function(id) {
                $(id).on('click', function() {
                    // Force highlight refresh on all venues.
                    applyHighlightsTest(W.model.venues.getObjectArray());
                });
            });

            // Highlighter settings
            var phDevContentHtml = '<p>Highlighter Settings:</p>';
            $("#sidepanel-highlighter" + devVersStr).append(phDevContentHtml);
            createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-ColorHighlighting" + devVersStr,"Enable color highlighting of map to indicate places needing work");
            createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-DisableHoursHL" + devVersStr,"Disable highlighting for missing hours");
            createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-DisableRankHL" + devVersStr,"Disable highlighting for places locked above your rank");
            createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-DisableWLHL" + devVersStr,"Disable Whitelist highlighting (shows all missing info regardless of WL)");
            if (IS_DEV_USER || IS_BETA_USER || USER_RANK >= 3) {
                //createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-UnlockedRPPs" + devVersStr,"Highlight unlocked residential place points");
            }
            var phHRContentHtml = '<hr align="center" width="90%">';
            $("#sidepanel-highlighter" + devVersStr).append(phHRContentHtml);
            phHRContentHtml = '<p>Scanner Settings (coming soon)</p>';
            $("#sidepanel-highlighter" + devVersStr).append(phHRContentHtml);

            // Scanner settings
            //createSettingsCheckbox("sidepanel-highlighter" + devVersStr, "WMEPH-PlaceScanner" + devVersStr,"Placeholder, under development!");

            // Whitelist settings

            phHRContentHtml = '<hr align="center" width="90%">';
            $("#sidepanel-harmonizer" + devVersStr).append(phHRContentHtml);

            // User pref for KB Shortcut:
            // Set defaults
            if (IS_DEV_VERSION) {
                if (USER_NAME.toLowerCase() === 't0cableguy') {
                    defaultKBShortcut = 'p';
                } else {
                    defaultKBShortcut = 'S';
                }
            } else {
                defaultKBShortcut = 'A';
            }
            // Set local storage to default if none
            if (localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr) === null) {
                localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, defaultKBShortcut);
            }

            // Add Letter input box
            var phKBContentHtml = $('<div id="PlaceHarmonizerKB' + devVersStr +
                                    '"><div id="PlaceHarmonizerKBWarn' + devVersStr + '"></div>Shortcut Letter (a-Z): <input type="text" maxlength="1" id="WMEPH-KeyboardShortcut'+devVersStr+
                                    '" style="width: 30px;padding-left:8px"><div id="PlaceHarmonizerKBCurrent' + devVersStr + '"></div></div>');
            $("#sidepanel-harmonizer" + devVersStr).append(phKBContentHtml);
            createSettingsCheckbox("PlaceHarmonizerKB" + devVersStr, "WMEPH-KBSModifierKey" + devVersStr, "Use Ctrl instead of Alt"); // Add Alt-->Ctrl checkbox
            if ( localStorage.getItem('WMEPH-KBSModifierKey'+devVersStr) === '1' ) {  // Change modifier key code if checked
                modifKey = 'Ctrl+';
            }
            $('#WMEPH-KeyboardShortcut'+devVersStr).val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));  // Load letter key value from local storage
            if ($('#WMEPH-KeyboardShortcut'+devVersStr).val().match(/^[a-z]{1}$/i) === null) {
                $('#WMEPH-KeyboardShortcut'+devVersStr).val(defaultKBShortcut);
                $(localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, $('#WMEPH-KeyboardShortcut'+devVersStr).val()));
            }
            shortcutParse = parseKBSShift($('#WMEPH-KeyboardShortcut'+devVersStr).val());
            // Check for KBS conflict on Beta script load
            /* NOTE: We are probably going to remove this because we are removing side-by-side support for Prod and Beta
            if (IS_DEV_VERSION) {
                if (checkWMEPH_KBSconflict(shortcutParse)) {
                    alert('You have the same shortcut for the Beta version and the Production version of the script. The Beta version is disabled until you change the Beta shortcut');
                } else {
                    shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                    phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                    $("#PlaceHarmonizerKBCurrent" + devVersStr).append(phKBContentHtml);
                }
            } else {  // Prod version always loads
                shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                $("#PlaceHarmonizerKBCurrent" + devVersStr).append(phKBContentHtml);
            }
            */

            // Modifier on-click changes
            var modifKeyNew;
            $("#WMEPH-KBSModifierKey" + devVersStr).click(function() {
                $("#PlaceHarmonizerKBWarn" + devVersStr).empty();  // remove any warning
                if ($("#WMEPH-KBSModifierKey" + devVersStr).prop('checked')) {
                    modifKeyNew = 'Ctrl+';
                } else {
                    modifKeyNew = 'Alt+';
                }
                shortcutParse = parseKBSShift($('#WMEPH-KeyboardShortcut'+devVersStr).val());

                if (checkWMEPH_KBSconflict(shortcutParse)) {
                    $("#WMEPH-KBSModifierKey" + devVersStr).trigger('click');
                    phKBContentHtml = '<p style="color:red">Shortcut conflict with other WMEPH version<p>';
                    $("#PlaceHarmonizerKBWarn" + devVersStr).append(phKBContentHtml);
                } else {
                    shortcut.remove(modifKey + shortcutParse);
                    modifKey = modifKeyNew;
                    shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                }

                $("#PlaceHarmonizerKBCurrent" + devVersStr).empty();
                phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                $("#PlaceHarmonizerKBCurrent" + devVersStr).append(phKBContentHtml);
            });

            // Upon change of the KB letter:
            var shortcutParseNew;
            $("#WMEPH-KeyboardShortcut"+devVersStr).change(function() {
                if ($('#WMEPH-KeyboardShortcut'+devVersStr).val().match(/^[a-z]{1}$/i) !== null) {  // If a single letter...
                    $("#PlaceHarmonizerKBWarn" + devVersStr).empty();  // remove old warning
                    // remove previous
                    shortcutParse = parseKBSShift(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
                    shortcutParseNew = parseKBSShift($('#WMEPH-KeyboardShortcut'+devVersStr).val());

                    if (checkWMEPH_KBSconflict(shortcutParseNew)) {
                        $('#WMEPH-KeyboardShortcut'+devVersStr).val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
                        //$("#PlaceHarmonizerKBWarn" + devVersStr).empty();
                        phKBContentHtml = '<p style="color:red">Shortcut conflict with other WMEPH version<p>';
                        $("#PlaceHarmonizerKBWarn" + devVersStr).append(phKBContentHtml);
                    } else {
                        shortcut.remove(modifKey + shortcutParse);
                        shortcutParse = shortcutParseNew;
                        shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                        $(localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, $('#WMEPH-KeyboardShortcut'+devVersStr).val()) );
                    }
                    $("#PlaceHarmonizerKBCurrent" + devVersStr).empty();
                    phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                    $("#PlaceHarmonizerKBCurrent" + devVersStr).append(phKBContentHtml);
                } else {  // if not a letter then reset and flag
                    $('#WMEPH-KeyboardShortcut'+devVersStr).val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
                    $("#PlaceHarmonizerKBWarn" + devVersStr).empty();
                    phKBContentHtml = '<p style="color:red">Only letters are allowed<p>';
                    $("#PlaceHarmonizerKBWarn" + devVersStr).append(phKBContentHtml);
                }
            });


            if (IS_DEV_USER) {  // Override script regionality (devs only)
                phDevContentHtml = '<hr align="center" width="90%"><p>Dev Only Settings:</p>';
                $("#sidepanel-harmonizer" + devVersStr).append(phDevContentHtml);
                createSettingsCheckbox("sidepanel-harmonizer" + devVersStr, "WMEPH-RegionOverride" + devVersStr,"Disable Region Specificity");

            }

            // *** Whitelisting section
            if (localStorage.getItem('WMEPH_WLAddCount') === null) {
                localStorage.setItem('WMEPH_WLAddCount', 2);  // Counter to remind of WL backups
            }
            var phWLContentHtml = $('<div id="PlaceHarmonizerWLTools' + devVersStr + '">Whitelist string: <input onClick="this.select();" type="text" id="WMEPH-WLInput'+devVersStr+
                                    '" style="width: 200px;padding-left:1px"><br>'+
                                    '<input class="btn btn-success btn-xs" id="WMEPH-WLMerge'+ devVersStr +'" title="Merge the string into your existing Whitelist" type="button" value="Merge">'+
                                    '<br><input class="btn btn-success btn-xs" id="WMEPH-WLPull'+ devVersStr +'" title="Pull your existing Whitelist for backup or sharing" type="button" value="Pull">'+
                                    '<br><input class="btn btn-success btn-xs" id="WMEPH-WLShare'+ devVersStr +'" title="Share your Whitelist to a public Google sheet" type="button" value="Share your WL">'+
                                    '<br><input class="btn btn-info btn-xs" id="WMEPH-WLStats'+ devVersStr +'" title="Display WL stats" type="button" value="Stats">'+
                                    '<br><input class="btn btn-danger btn-xs" id="WMEPH-WLStateFilter'+ devVersStr +'" title="Remove all WL items for a state" type="button" value="Remove data for 1 State">'+
                                    '</div><div id="PlaceHarmonizerWLToolsMsg' + devVersStr + '"></div>');
            $("#sidepanel-wltools" + devVersStr).append(phWLContentHtml);

            $("#WMEPH-WLMerge" + devVersStr).click(function() {
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).empty();
                if ($('#WMEPH-WLInput'+devVersStr).val() === 'resetWhitelist') {
                    if (confirm('***Do you want to reset all Whitelist data?\nClick OK to erase.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                        venueWhitelist = { '1.1.1': { Placeholder: {  } } }; // Populate with a dummy place
                        saveWL_LS(true);
                    }
                } else {  // try to merge uncompressed WL data
                    WLSToMerge = validateWLS($('#WMEPH-WLInput'+devVersStr).val());
                    if (WLSToMerge) {
                        phlog('Whitelists merged!');
                        venueWhitelist = mergeWL(venueWhitelist,WLSToMerge);
                        saveWL_LS(true);
                        phWLContentHtml = '<p style="color:green">Whitelist data merged<p>';
                        $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                        $('#WMEPH-WLInputBeta').val('');
                    } else {  // try compressed WL
                        WLSToMerge = validateWLS( LZString.decompressFromUTF16($('#WMEPH-WLInput'+devVersStr).val()) );
                        if (WLSToMerge) {
                            phlog('Whitelists merged!');
                            venueWhitelist = mergeWL(venueWhitelist,WLSToMerge);
                            saveWL_LS(true);
                            phWLContentHtml = '<p style="color:green">Whitelist data merged<p>';
                            $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                            $('#WMEPH-WLInputBeta').val('');
                        } else {
                            phWLContentHtml = '<p style="color:red">Invalid Whitelist data<p>';
                            $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                        }
                    }
                }
            });

            // Pull the data to the text field
            $("#WMEPH-WLPull" + devVersStr).click(function() {
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).empty();
                $('#WMEPH-WLInput'+devVersStr).val( LZString.decompressFromUTF16(localStorage.getItem(WLlocalStoreNameCompressed)) );
                phWLContentHtml = '<p style="color:green">To backup the data, copy & paste the text in the box to a safe location.<p>';
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                localStorage.setItem('WMEPH_WLAddCount', 1);
            });

            // WL Stats
            $("#WMEPH-WLStats" + devVersStr).click(function() {
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).empty();
                $('#WMEPH-WLInputBeta').val('');
                var currWLData;
                currWLData = JSON.parse( LZString.decompressFromUTF16( localStorage.getItem(WLlocalStoreNameCompressed) ) );
                var countryWL = {};
                var stateWL = {};
                var itemCount = 0;
                for (var venueKey in currWLData) {
                    if (currWLData.hasOwnProperty(venueKey)) {
                        if (venueKey !== '1.1.1') {  // Don't count the place holder
                            itemCount++;
                            if ( currWLData[venueKey].hasOwnProperty('country') ) {
                                if ( countryWL.hasOwnProperty(currWLData[venueKey].country) ) {
                                    countryWL[currWLData[venueKey].country]++;
                                } else {
                                    countryWL[currWLData[venueKey].country] = 1;
                                }
                            } else {
                                if ( countryWL.hasOwnProperty('None') ) {
                                    countryWL.None++;
                                } else {
                                    countryWL.None = 1;
                                }
                            }
                            if ( currWLData[venueKey].hasOwnProperty('state') ) {
                                if ( stateWL.hasOwnProperty(currWLData[venueKey].state) ) {
                                    stateWL[currWLData[venueKey].state]++;
                                } else {
                                    stateWL[currWLData[venueKey].state] = 1;
                                }
                            } else {
                                if ( stateWL.hasOwnProperty('None') ) {
                                    stateWL.None++;
                                } else {
                                    stateWL.None = 1;
                                }
                            }
                        }
                    }
                }

                var countryString = '';
                for (var countryKey in countryWL) {
                    countryString = countryString + '<br>' + countryKey + ': ' + countryWL[countryKey];
                }
                var stateString = '';
                for (var stateKey in stateWL) {
                    stateString = stateString + '<br>' + stateKey + ': ' + stateWL[stateKey];
                }

                phWLContentHtml = '<p style="color:black">Number of WL places: '+ itemCount +'</p><p>States:'+ stateString +'</p><p>Countries:'+ countryString + '<p>';
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                //localStorage.setItem('WMEPH_WLAddCount', 1);
            });

            // WL State Filter
            $("#WMEPH-WLStateFilter" + devVersStr).click(function() {
                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).empty();
                stateToRemove = $('#WMEPH-WLInput'+devVersStr).val();
                if ( stateToRemove.length < 2 ) {
                    phWLContentHtml = '<p style="color:red">Invalid state<p>';
                    $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                } else {
                    var currWLData, venueToRemove = [];
                    currWLData = JSON.parse( LZString.decompressFromUTF16( localStorage.getItem(WLlocalStoreNameCompressed) ) );

                    //var WLSize = _.size(currWLData);

                    for (var venueKey in currWLData) {
                        if (currWLData.hasOwnProperty(venueKey)) {
                            if (venueKey !== '1.1.1') {  // Don't examine the place holder
                                if ( currWLData[venueKey].hasOwnProperty('state') ) {
                                    if ( currWLData[venueKey].state === stateToRemove ) {
                                        venueToRemove.push(venueKey);
                                    }
                                }
                            }
                        }
                    }
                    //phlogdev(venueToRemove.length);
                    if (venueToRemove.length > 0) {
                        if (localStorage.WMEPH_WLAddCount === '1') {
                            if (confirm('Are you sure you want to clear all whitelist data for '+stateToRemove+'? This CANNOT be undone. Press OK to delete, cancel to preserve the data.') ) {  // misclick check
                                backupWL_LS(true);
                                for (var ixwl=0; ixwl<venueToRemove.length; ixwl++) {
                                    delete venueWhitelist[venueToRemove[ixwl]];
                                    //phlogdev(venueWhitelist[venueToRemove[ixwl]]);
                                }
                                saveWL_LS(true);
                                phWLContentHtml = '<p style="color:green">'+venueToRemove.length+' items removed from WL<p>';
                                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                                $('#WMEPH-WLInputBeta').val('');
                            } else {
                                phWLContentHtml = '<p style="color:blue">No changes made<p>';
                                $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                            }
                        } else {
                            phWLContentHtml = '<p style="color:red">Please backup your WL using the Pull button before removing state data<p>';
                            $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                            //phlogdev('Please backup your WL using the Pull button before removing state data');
                        }
                    } else {
                        phWLContentHtml = '<p style="color:red">No data for that state. Use the state name exactly as listed in the Stats<p>';
                        $("#PlaceHarmonizerWLToolsMsg" + devVersStr).append(phWLContentHtml);
                        //phlogdev('No data for that state. Use the state name exactly as listed in the Stats');
                    }
                }
            });

            // Share the data to a Google Form post
            $("#WMEPH-WLShare" + devVersStr).click(function() {
                var submitWLURL = 'https://docs.google.com/forms/d/1k_5RyOq81Fv4IRHzltC34kW3IUbXnQqDVMogwJKFNbE/viewform?entry.1173700072='+USER_NAME;
                window.open(submitWLURL);
            });

            var feedbackString = 'Submit script feedback & suggestions';
            var placesWikiStr = 'Open the WME Places Wiki page';
            var phContentHtml2 = '<hr align="center" width="95%"><p><a href="' +
                PLACES_WIKI_URL + '" target="_blank" title="'+placesWikiStr+'">'+placesWikiStr+'</a><p><a href="' +
                WMEPH_FORUM_URL + '" target="_blank" title="'+feedbackString+'">'+feedbackString+'</a></p><hr align="center" width="95%">Major features for v. ' +
                WMEPH_VERSION_MAJOR+':<ul><li>'+WMEPHWhatsNewMetaHList+'</ul>Recent updates:<ul><li>'+WMEPHWhatsNewHList+'</ul>';
            $("#sidepanel-harmonizer" + devVersStr).append(phContentHtml2);

            W.map.events.register("mousemove", W.map, function (e) {
                WMEPHmousePosition = W.map.getLonLatFromPixel( W.map.events.getMousePosition(e) );
            });

            // Add zoom shortcut
            shortcut.add("Control+Alt+Z", function() {
                zoomPlace();
            });

            if (USER_NAME === 't0cableguy' || USER_NAME === 't0cableguy') {
                shortcut.add("Control+Alt+E", function() {
                    clonePlace();
                });
            }

            // Color highlighting
            $("#WMEPH-ColorHighlighting" + devVersStr).click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-DisableHoursHL" + devVersStr).click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-DisableRankHL" + devVersStr).click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-DisableWLHL" + devVersStr).click( function() {
                bootstrapWMEPH_CH();
            });
            if ( $("#WMEPH-ColorHighlighting" + devVersStr).prop('checked') ) {
                phlog('Starting Highlighter');
                bootstrapWMEPH_CH();
            }


            // Add Color Highlighting shortcut
            shortcut.add("Control+Alt+h", function() {
                $("#WMEPH-ColorHighlighting" + devVersStr).trigger('click');
            });

            // Add Autorun shortcut
            if (USER_NAME === 'bmtg') {
                shortcut.add("Control+Alt+u", function() {
                    $("#WMEPH-AutoRunOnSelect" + devVersStr).trigger('click');
                });
            }

            // $("#user-info div.tab-content:first").append(phContentHtml2);
            phlog('Ready...!');
        } // END Settings Tab

        // This routine will create a checkbox in the #PlaceHarmonizer tab and will load the setting
        //        settingID:  The #id of the checkbox being created.
        //  textDescription:  The description of the checkbox that will be use
        function createSettingsCheckbox(divID, settingID, textDescription) {
            //Create settings checkbox and append HTML to settings tab
            var phTempHTML = '<input type="checkbox" id="' + settingID + '">'+ textDescription +'</input><br>';
            $("#" + divID).append(phTempHTML);
            //Associate click event of new checkbox to call saveSettingToLocalStorage with proper ID
            $("#" + settingID).click(function() {saveSettingToLocalStorage(settingID);});
            //Load Setting for Local Storage, if it doesn't exist set it to NOT checked.
            //If previously set to 1, then trigger "click" event.
            if (!localStorage.getItem(settingID))
            {
                //phlogdev(settingID + ' not found.');
            } else if (localStorage.getItem(settingID) === "1") {
                $("#" + settingID).trigger('click');
            }
        }

        function createCloneCheckbox(divID, settingID, textDescription) {
            //Create settings checkbox and append HTML to settings tab
            var phTempHTML = '<input type="checkbox" id="' + settingID + '">'+ textDescription +'</input>&nbsp&nbsp';
            $("#" + divID).append(phTempHTML);
            //Associate click event of new checkbox to call saveSettingToLocalStorage with proper ID
            $("#" + settingID).click(function() {saveSettingToLocalStorage(settingID);});
            //Load Setting for Local Storage, if it doesn't exist set it to NOT checked.
            //If previously set to 1, then trigger "click" event.
            if (!localStorage.getItem(settingID))
            {
                //phlogdev(settingID + ' not found.');
            } else if (localStorage.getItem(settingID) === "1") {
                $("#" + settingID).trigger('click');
            }
        }

        //Function to add Shift+ to upper case KBS
        function parseKBSShift(kbs) {
            //debug('-- parseKBSShift(kbs) called --');
            if (kbs.match(/^[A-Z]{1}$/g) !== null) { // If upper case, then add a Shift+
                kbs = 'Shift+' + kbs;
            }
            return kbs;
        }

        // Function to check shortcut conflict
        function checkWMEPH_KBSconflict(KBS) {
            //debug('-- checkWMEPH_KBSconflict(KBS) called --');
            var LSString = '';
            if (!IS_DEV_VERSION) {
                LSString = devVersStringMaster;
            }
            if ( localStorage.getItem('WMEPH-KeyboardShortcut'+LSString) === null || localStorage.getItem('WMEPH-KBSModifierKey'+LSString) === null ) {
                return false;
            } else if ( parseKBSShift(localStorage.getItem('WMEPH-KeyboardShortcut'+LSString)) === KBS && localStorage.getItem('WMEPH-KBSModifierKey'+devVersStringMaster) === localStorage.getItem('WMEPH-KBSModifierKey') ) {
                return true;
            } else {
                return false;
            }
        }

        // Save settings prefs
        function saveSettingToLocalStorage(settingID) {
            //debug('-- saveSettingToLocalStorage(settingID) called --');
            if ($("#" + settingID).prop('checked')) {
                localStorage.setItem(settingID, '1');
            } else {
                localStorage.setItem(settingID, '0');
            }
        }

        // This function validates that the inputted text is a JSON
        function validateWLS(jsonString) {
            //debug('-- validateWLS(jsonString) called --');
            try {
                var objTry = JSON.parse(jsonString);
                if (objTry && typeof objTry === "object" && objTry !== null) {
                    return objTry;
                }
            }
            catch (e) { }
            return false;
        }

        // This function merges and updates venues from object vWL_2 into vWL_1
        function mergeWL(vWL_1,vWL_2) {
            //debug('-- mergeWL(vWL_1,vWL_2) called --');
            var venueKey, WLKey, vWL_1_Venue, vWL_2_Venue;
            for (venueKey in vWL_2) {
                if (vWL_2.hasOwnProperty(venueKey)) {  // basic filter
                    if (vWL_1.hasOwnProperty(venueKey)) {  // if the vWL_2 venue is in vWL_1, then update any keys
                        vWL_1_Venue = vWL_1[venueKey];
                        vWL_2_Venue = vWL_2[venueKey];
                        for (WLKey in vWL_2_Venue) {  // loop thru the venue WL keys
                            if (vWL_2_Venue.hasOwnProperty(WLKey) && vWL_2_Venue[WLKey].active) {  // Only update if the vWL_2 key is active
                                if ( vWL_1_Venue.hasOwnProperty(WLKey) && vWL_1_Venue[WLKey].active ) {  // if the key is in the vWL_1 venue and it is active, then push any array data onto the key
                                    if (vWL_1_Venue[WLKey].hasOwnProperty('WLKeyArray')) {
                                        vWL_1[venueKey][WLKey].WLKeyArray = insertAtIX(vWL_1[venueKey][WLKey].WLKeyArray,vWL_2[venueKey][WLKey].WLKeyArray,100);
                                    }
                                } else {  // if the key isn't in the vWL_1 venue, or if it's inactive, then copy the vWL_2 key across
                                    vWL_1[venueKey][WLKey] = vWL_2[venueKey][WLKey];
                                }
                            }
                        } // END subLoop for venue keys
                    } else {  // if the venue doesn't exist in vWL_1, then add it
                        vWL_1[venueKey] = vWL_2[venueKey];
                    }
                }
            }
            return vWL_1;
        }

        // Get services checkbox status
        function getServicesChecks() {
            //debug('-- getServicesChecks() called --');
            var servArrayCheck = [];
            for (var wsix=0; wsix<WME_SERVICES.length; wsix++) {
                if ($("#service-checkbox-" + WME_SERVICES[wsix]).prop('checked')) {
                    servArrayCheck[wsix] = true;
                } else {
                    servArrayCheck[wsix] = false;
                }
            }
            return servArrayCheck;
        }

        function updateServicesChecks(bannServ) {
            //debug('-- updateServicesChecks(bannServ) called --');
            var servArrayCheck = getServicesChecks(), wsix=0;
            for (var keys in bannServ) {
                if (bannServ.hasOwnProperty(keys)) {
                    bannServ[keys].checked = servArrayCheck[wsix];  // reset all icons to match any checked changes
                    bannServ[keys].active = bannServ[keys].active || servArrayCheck[wsix];  // display any manually checked non-active icons
                    wsix++;
                }
            }
            // Highlight 24/7 button if hours are set that way, and add button for all places
            if ( item.attributes.openingHours.length === 1 && item.attributes.openingHours[0].days.length === 7 && item.attributes.openingHours[0].fromHour === '00:00' && item.attributes.openingHours[0].toHour ==='00:00' ) {
                bannServ.add247.checked = true;
            }
            bannServ.add247.active = true;
        }

        // Focus away from the current cursor focus, to set text box changes
        function blurAll() {
            //debug('-- blurAll() called --');
            var tmp = document.createElement("input");
            document.body.appendChild(tmp);
            tmp.focus();
            document.body.removeChild(tmp);
        }

        // Pulls the item PL
        function getItemPL() {
            //debug('-- getItemPL() called --');
            // Append a form div if it doesn't exist yet:
            if ( $('#WMEPH_formDiv').length ===0 ) {
                var tempDiv = document.createElement('div');
                tempDiv.id = 'WMEPH_formDiv';
                tempDiv.style.display = 'inline';
                $(".WazeControlPermalink").append(tempDiv);
            }
            // Return the current PL
            if ($(".WazeControlPermalink").length === 0) {
                phlog("Waiting for PL div");
                setTimeout(getItemPL, 500);
                return;
            }
            if ( $(".WazeControlPermalink").children(".icon-link").length > 0 ) {
                return $(".WazeControlPermalink").children(".icon-link")[0].href;
            } else if ( $(".WazeControlPermalink").children(".fa-link").length > 0 ) {
                return $(".WazeControlPermalink").children(".fa-link")[0].href;
            }
            return  '';
        }

        // Sets up error reporting
        function WMEPH_errorReport(data) {
            //debug('-- WMEPH_errorReport(data) called --');
            data.preview = 'Preview';
            data.attach_sig = 'on';
            if (PMUserList.hasOwnProperty('WMEPH') && PMUserList.WMEPH.approvalActive) {
                data['address_list[u]['+PMUserList.WMEPH.modID+']'] = 'to';
                WMEPH_newForumPost('https://www.waze.com/forum/ucp.php?i=pm&mode=compose', data);
            } else {
                data.addbbcode20 = 'to';
                data.notify = 'on';
                WMEPH_newForumPost(WMEPH_FORUM_URL + '#preview', data);
            }
        }  // END WMEPH_errorReport function

        // Make a populated post on a forum thread
        function WMEPH_newForumPost(url, data) {
            var form = document.createElement('form');
            form.target = '_blank';
            form.action = url;
            form.method = 'post';
            form.style.display = 'none';
            for (var k in data) {
                if (data.hasOwnProperty(k)) {
                    var input;
                    if (k === 'message') {
                        input = document.createElement('textarea');
                    } else if (k === 'username') {
                        input = document.createElement('username_list');
                    } else {
                        input = document.createElement('input');
                    }
                    input.name = k;
                    input.value = data[k];
                    input.type = 'hidden';
                    form.appendChild(input);
                }
            }
            document.getElementById('WMEPH_formDiv').appendChild(form);
            form.submit();
            document.getElementById('WMEPH_formDiv').removeChild(form);
            return true;
        }  // END WMEPH_newForumPost function

        /**
         * Updates the geometry of a place.
         * @param place {Waze venue object} The place to update.
         * @param newGeometry {OL.Geometry} The new geometry for the place.
         */
        function updateFeatureGeometry(place, newGeometry) {
            var oldGeometry,
                model = W.model.venues,
                wmeUpdateFeatureGeometry = require('Waze/Action/UpdateFeatureGeometry');
            if (place && place.CLASS_NAME === 'Waze.Feature.Vector.Landmark' &&
                newGeometry && (newGeometry instanceof OL.Geometry.Point ||
                                newGeometry instanceof OL.Geometry.Polygon)) {
                oldGeometry = place.attributes.geometry;
                W.model.actionManager.add(
                    new wmeUpdateFeatureGeometry(place, model, oldGeometry, newGeometry));
            }
        }

        // Function that checks current place against the Harmonization Data.  Returns place data or "NoMatch"
        function harmoList(itemName,state2L,region3L,country,itemCats) {
            //debug('-- harmoList(itemName,state2L,region3L,country,itemCats) called --');
            var PNH_DATA_headers;
            var ixendPNH_NAMES;
            if (country === 'US') {
                PNH_DATA_headers = USA_PNH_DATA[0].split("|");  // pull the data header names
                ixendPNH_NAMES = USA_PNH_NAMES.length;
            } else if (country === 'CA') {
                PNH_DATA_headers = CAN_PNH_DATA[0].split("|");  // pull the data header names
                ixendPNH_NAMES = CAN_PNH_NAMES.length;
            } else {
                alert("No PNH data exists for this country.");
                return ["NoMatch"];
            }
            var ph_name_ix = PNH_DATA_headers.indexOf("ph_name");
            var ph_category1_ix = PNH_DATA_headers.indexOf("ph_category1");
            var ph_forcecat_ix = PNH_DATA_headers.indexOf("ph_forcecat");  // Force the category match
            var ph_region_ix = PNH_DATA_headers.indexOf("ph_region");  // Find the index for regions
            var ph_order_ix = PNH_DATA_headers.indexOf("ph_order");
            var ph_speccase_ix = PNH_DATA_headers.indexOf("ph_speccase");
            var ph_searchnameword_ix = PNH_DATA_headers.indexOf("ph_searchnameword");
            var nameComps;  // filled with search names to compare against place name
            var PNHPriCat;  // Primary category of PNH data
            var PNHForceCat;  // Primary category of PNH data
            var approvedRegions;  // filled with the regions that are approved for the place, when match is found
            var matchPNHData = [];  // array of matched data
            var matchPNHRegionData = [];  // array of matched data with regional approval
            var currMatchData, PNHMatchData, specCases, nmix, allowMultiMatch = false;
            var currMatchNum = 0;  // index for multiple matches, currently returns on first match
            var PNHOrderNum = [];
            var PNHNameTemp = [];
            var PNHNameMatch = false;  // tracks match status
            var PNHStringMatch = false;  // compares name string match
            var PNHMatchProceed;  // tracks match status
            itemName = itemName.toUpperCase();  // UpperCase the current place name (The Holly And Ivy Pub #23 --> THE HOLLY AND IVY PUB #23 )
            itemName = itemName.replace(/ AND /g, ' ');  // Clear the word " AND " from the name (THE HOLLY AND IVY PUB #23 --> THE HOLLY IVY PUB #23 )
            itemName = itemName.replace(/^THE /g, '');  // Clear the word "THE " from the start of the name ( THE HOLLYIVY PUB #23 -- > HOLLY IVY PUB #23 )
            var itemNameSpace = itemName.replace(/[^A-Z0-9 ]/g, ' ');  // Clear all non-letter and non-number characters except spaces ( HOLLYIVY PUB #23 -- > HOLLY IVY PUB  23 )
            itemNameSpace = ' '+itemNameSpace.replace(/ {2,}/g, ' ')+' ';  // Make double spaces into singles ( HOLLY IVY PUB  23 -- > HOLLY IVY PUB 23 )
            itemName = itemName.replace(/[^A-Z0-9]/g, '');  // Clear all non-letter and non-number characters ( HOLLYIVY PUB #23 -- > HOLLYIVYPUB23 )
            var itemNameNoNum = itemName.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )

            // Search performance stats
            var t0; var t1;
            if (IS_DEV_USER) {
                t0 = performance.now();  // Speed check start
            }

            // for each place on the PNH list (skipping headers at index 0)
            // phlogdev(ixendPNH_NAMES);
            for (var phnum=1; phnum<ixendPNH_NAMES; phnum++) {
                PNHMatchProceed = false;
                PNHStringMatch = false;
                if (country === 'US') {
                    nameComps = USA_PNH_NAMES[phnum].split("|");  // splits all possible search names for the current PNH entry
                    PNHMatchData = USA_PNH_DATA[phnum];
                } else if (country === 'CA') {
                    nameComps = CAN_PNH_NAMES[phnum].split("|");  // splits all possible search names for the current PNH entry
                    PNHMatchData = CAN_PNH_DATA[phnum];
                }
                currMatchData = PNHMatchData.split("|");  // Split the PNH place data into string array
                // Name Matching
                specCases = currMatchData[ph_speccase_ix];
                if (specCases.indexOf('strMatchAny') > -1 || currMatchData[ph_category1_ix] === 'Hotel') {  // Match any part of WME name with either the PNH name or any spaced names
                    allowMultiMatch = true;
                    var spaceMatchList = [];
                    spaceMatchList.push( currMatchData[ph_name_ix].toUpperCase().replace(/ AND /g, ' ').replace(/^THE /g, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/ {2,}/g, ' ') );
                    if (currMatchData[ph_searchnameword_ix] !== '') {
                        spaceMatchList.push.apply( spaceMatchList,currMatchData[ph_searchnameword_ix].toUpperCase().replace(/, /g,',').split(',') );
                    }
                    for (nmix=0; nmix<spaceMatchList.length; nmix++) {
                        if ( itemNameSpace.includes(' '+spaceMatchList[nmix]+' ') ) {
                            PNHStringMatch = true;
                        }
                    }
                } else if (specCases.indexOf('strMatchStart') > -1) {  //  Match the beginning part of WME name with any search term
                    for (nmix=0; nmix<nameComps.length; nmix++) {
                        if ( itemName.startsWith(nameComps[nmix]) || itemNameNoNum.startsWith(nameComps[nmix]) ) {
                            PNHStringMatch = true;
                        }
                    }
                } else if (specCases.indexOf('strMatchEnd') > -1) {  //  Match the end part of WME name with any search term
                    for (nmix=0; nmix<nameComps.length; nmix++) {
                        if ( itemName.endsWith(nameComps[nmix]) || itemNameNoNum.endsWith(nameComps[nmix]) ) {
                            PNHStringMatch = true;
                        }
                    }
                } else {  // full match of any term only
                    if ( nameComps.indexOf(itemName) > -1 || nameComps.indexOf(itemNameNoNum) > -1 ) {
                        PNHStringMatch = true;
                    }
                }
                // if a match was found:
                if ( PNHStringMatch ) {  // Compare WME place name to PNH search name list
                    console.log('Matched PNH Order No.: '+currMatchData[ph_order_ix]);

                    PNHPriCat = catTranslate(currMatchData[ph_category1_ix]);
                    PNHForceCat = currMatchData[ph_forcecat_ix];
                    if (itemCats[0] === "GAS_STATION") {  // Gas stations only harmonized if the WME place category is already gas station (prevents Costco Gas becoming Costco Store)
                        PNHForceCat = "1";
                    }
                    if ( PNHForceCat === "1" && itemCats.indexOf(PNHPriCat) === 0 ) {  // Name and primary category match
                        PNHMatchProceed = true;
                    } else if ( PNHForceCat === "2" && itemCats.indexOf(PNHPriCat) > -1 ) {  // Name and any category match
                        PNHMatchProceed = true;
                    } else if ( PNHForceCat === "0" || PNHForceCat === "") {  // Name only match
                        PNHMatchProceed = true;
                    }

                    if (PNHMatchProceed) {
                        approvedRegions = currMatchData[ph_region_ix].replace(/ /g, '').toUpperCase().split(",");  // remove spaces, upper case the approved regions, and split by commas
                        if (approvedRegions.indexOf(state2L) > -1 || approvedRegions.indexOf(region3L) > -1 ||  // if the WME-selected item matches the state, region
                            approvedRegions.indexOf(country) > -1 ||  //  OR if the country code is in the data then it is approved for all regions therein
                            $("#WMEPH-RegionOverride" + devVersStr).prop('checked')) {  // OR if region override is selected (dev setting
                            if (IS_DEV_USER) {
                                t1 = performance.now();  // log search time
                                //phlogdev("Found place in " + (t1 - t0) + " milliseconds.");
                            }
                            matchPNHRegionData.push(PNHMatchData);
                            bannButt.placeMatched.active = true;
                            if (!allowMultiMatch) {
                                return matchPNHRegionData;  // Return the PNH data string array to the main script
                            }
                        } else {
                            PNHNameMatch = true;  // PNH match found (once true, stays true)
                            //matchPNHData.push(PNHMatchData);  // Pull the data line from the PNH data table.  (**Set in array for future multimatch features)
                            PNHNameTemp.push(currMatchData[ph_name_ix]);  // temp name for approval return
                            PNHOrderNum.push(currMatchData[ph_order_ix]);  // temp order number for approval return
                        }

                        currMatchNum++;  // *** Multiple matches for future work
                    }
                }
            }  // END loop through PNH places

            // If NO (name & region) match was found:
            if (bannButt.placeMatched.active) {
                return matchPNHRegionData;
            } else if (PNHNameMatch) {  // if a name match was found but not for region, prod the user to get it approved
                bannButt.ApprovalSubmit.active = true;
                //phlogdev("PNH data exists but not approved for this area.");
                if (IS_DEV_USER) {
                    t1 = performance.now();  // log search time
                    //phlogdev("Searched all PNH entries in " + (t1 - t0) + " milliseconds.");
                }
                return ["ApprovalNeeded", PNHNameTemp, PNHOrderNum];
            } else {  // if no match was found, suggest adding the place to the sheet if it's a chain
                bannButt.NewPlaceSubmit.active = true;
                //phlogdev("Place not found in the " + country + " PNH list.");
                if (IS_DEV_USER) {
                    t1 = performance.now();  // log search time
                    //phlogdev("Searched all PNH entries in " + (t1 - t0) + " milliseconds.");
                }
                return ["NoMatch"];
            }
        } // END harmoList function

        // KB Shortcut object
        var shortcut = {
            'all_shortcuts': {}, //All the shortcuts are stored in this array
            'add': function(shortcut_combination, callback, opt) {
                //Provide a set of default options
                var default_options = { 'type': 'keydown', 'propagate': false, 'disable_in_input': false, 'target': document, 'keycode': false };
                if (!opt) {opt = default_options;}
                else {
                    for (var dfo in default_options) {
                        if (typeof opt[dfo] === 'undefined') {opt[dfo] = default_options[dfo];}
                    }
                }
                var ele = opt.target;
                if (typeof opt.target === 'string') {ele = document.getElementById(opt.target);}
                // var ths = this;
                shortcut_combination = shortcut_combination.toLowerCase();
                //The function to be called at keypress
                var func = function(e) {
                    e = e || window.event;
                    if (opt.disable_in_input) { //Don't enable shortcut keys in Input, Textarea fields
                        var element;
                        if (e.target) {element = e.target;}
                        else if (e.srcElement) {element = e.srcElement;}
                        if (element.nodeType === 3) {element = element.parentNode;}
                        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {return;}
                    }
                    //Find Which key is pressed
                    var code;
                    if (e.keyCode) {code = e.keyCode;}
                    else if (e.which) {code = e.which;}
                    var character = String.fromCharCode(code).toLowerCase();
                    if (code === 188) {character = ",";} //If the user presses , when the type is onkeydown
                    if (code === 190) {character = ".";} //If the user presses , when the type is onkeydown
                    var keys = shortcut_combination.split("+");
                    //Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
                    var kp = 0;
                    //Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
                    var shift_nums = { "`": "~","1": "!","2": "@","3": "#","4": "$","5": "%","6": "^","7": "&",
                                      "8": "*","9": "(","0": ")","-": "_","=": "+",";": ":","'": "\"",",": "<",".": ">","/": "?","\\": "|" };
                    //Special Keys - and their codes
                    var special_keys = { 'esc': 27,'escape': 27,'tab': 9,'space': 32,'return': 13,'enter': 13,'backspace': 8,'scrolllock': 145,
                                        'scroll_lock': 145,'scroll': 145,'capslock': 20,'caps_lock': 20,'caps': 20,'numlock': 144,'num_lock': 144,'num': 144,
                                        'pause': 19,'break': 19,'insert': 45,'home': 36,'delete': 46,'end': 35,'pageup': 33,'page_up': 33,'pu': 33,'pagedown': 34,
                                        'page_down': 34,'pd': 34,'left': 37,'up': 38,'right': 39,'down': 40,'f1': 112,'f2': 113,'f3': 114,'f4': 115,'f5': 116,
                                        'f6': 117,'f7': 118,'f8': 119,'f9': 120,'f10': 121,'f11': 122,'f12': 123 };
                    var modifiers = {
                        shift: { wanted: false, pressed: false },
                        ctrl: { wanted: false, pressed: false },
                        alt: { wanted: false, pressed: false },
                        meta: { wanted: false, pressed: false } //Meta is Mac specific
                    };
                    if (e.ctrlKey) {modifiers.ctrl.pressed = true;}
                    if (e.shiftKey) {modifiers.shift.pressed = true;}
                    if (e.altKey) {modifiers.alt.pressed = true;}
                    if (e.metaKey) {modifiers.meta.pressed = true;}
                    for (var i = 0; i < keys.length; i++) {
                        var k = keys[i];
                        //Modifiers
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
                        } else if (k.length > 1) { //If it is a special key
                            if (special_keys[k] === code) {kp++;}
                        } else if (opt.keycode) {
                            if (opt.keycode === code) {kp++;}
                        } else { //The special keys did not match
                            if (character === k) {kp++;}
                            else {
                                if (shift_nums[character] && e.shiftKey) { //Stupid Shift key bug created by using lowercase
                                    character = shift_nums[character];
                                    if (character === k) {kp++;}
                                }
                            }
                        }
                    }

                    if (kp === keys.length && modifiers.ctrl.pressed === modifiers.ctrl.wanted && modifiers.shift.pressed === modifiers.shift.wanted &&
                        modifiers.alt.pressed === modifiers.alt.wanted && modifiers.meta.pressed === modifiers.meta.wanted) {
                        callback(e);
                        if (!opt.propagate) { //Stop the event
                            //e.cancelBubble is supported by IE - this will kill the bubbling process.
                            e.cancelBubble = true;
                            e.returnValue = false;
                            //e.stopPropagation works in Firefox.
                            if (e.stopPropagation) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                            return false;
                        }
                    }
                };
                this.all_shortcuts[shortcut_combination] = { 'callback': func, 'target': ele, 'event': opt.type };
                //Attach the function with the event
                if (ele.addEventListener) {ele.addEventListener(opt.type, func, false);}
                else if (ele.attachEvent) {ele.attachEvent('on' + opt.type, func);}
                else {ele['on' + opt.type] = func;}
            },
            //Remove the shortcut - just specify the shortcut and I will remove the binding
            'remove': function(shortcut_combination) {
                shortcut_combination = shortcut_combination.toLowerCase();
                var binding = this.all_shortcuts[shortcut_combination];
                delete(this.all_shortcuts[shortcut_combination]);
                if (!binding) {return;}
                var type = binding.event;
                var ele = binding.target;
                var callback = binding.callback;
                if (ele.detachEvent) {ele.detachEvent('on' + type, callback);}
                else if (ele.removeEventListener) {ele.removeEventListener(type, callback, false);}
                else {ele['on' + type] = false;}
            }
        };  // END Shortcut function

    } // END runPH Function


    // Whitelist stringifying and parsing
    function saveWL_LS(compress) {
        //debug('- saveWL_LS(compress) called -');
        venueWhitelistStr = JSON.stringify(venueWhitelist);
        if (compress) {
            if (venueWhitelistStr.length < 4800000 ) {  // Also save to regular storage as a back up
                localStorage.setItem(WLlocalStoreName, venueWhitelistStr);
            }
            venueWhitelistStr = LZString.compressToUTF16(venueWhitelistStr);
            localStorage.setItem(WLlocalStoreNameCompressed, venueWhitelistStr);
        } else {
            localStorage.setItem(WLlocalStoreName, venueWhitelistStr);
        }
    }
    function loadWL_LS(decompress) {
        //debug('- loadWL_LS(decompress) called -');
        if (decompress) {
            venueWhitelistStr = localStorage.getItem(WLlocalStoreNameCompressed);
            venueWhitelistStr = LZString.decompressFromUTF16(venueWhitelistStr);
        } else {
            venueWhitelistStr = localStorage.getItem(WLlocalStoreName);
        }
        venueWhitelist = JSON.parse(venueWhitelistStr);
    }
    function backupWL_LS(compress) {
        //debug('- backupWL_LS(compress) called -');
        venueWhitelistStr = JSON.stringify(venueWhitelist);
        if (compress) {
            venueWhitelistStr = LZString.compressToUTF16(venueWhitelistStr);
            localStorage.setItem(WLlocalStoreNameCompressed+Math.floor(Date.now() / 1000), venueWhitelistStr);
        } else {
            localStorage.setItem(WLlocalStoreName+Math.floor(Date.now() / 1000), venueWhitelistStr);
        }
    }

    function zoomPlace() {
        //debug('- zoomPlace() called -');
        if (W.selectionManager.selectedItems.length === 1 && W.selectionManager.selectedItems[0].model.type === "venue") {
            W.map.moveTo(W.selectionManager.selectedItems[0].model.geometry.getCentroid().toLonLat(), 7);
        } else {
            W.map.moveTo(WMEPHmousePosition, 5);
        }
    }

    function sortWithIndex(toSort) {
        //debug('- sortWithIndex(toSort) called -');
        for (var i = 0; i < toSort.length; i++) {
            toSort[i] = [toSort[i], i];
        }
        toSort.sort(function(left, right) {
            return left[0] < right[0] ? -1 : 1;
        });
        toSort.sortIndices = [];
        for (var j = 0; j < toSort.length; j++) {
            toSort.sortIndices.push(toSort[j][1]);
            toSort[j] = toSort[j][0];
        }
        return toSort;
    }


    // When a dupe is deleted, delete the dupe label
    function deleteDupeLabel(){
        //phlog('Clearing dupe label...');
        setTimeout(function() {
            var actionsList = W.model.actionManager.actions;
            var lastAction = actionsList[actionsList.length-1];
            if ( 'undefined' !== typeof lastAction && lastAction.hasOwnProperty('object') && lastAction.object.hasOwnProperty('state') && lastAction.object.state === 'Delete' ) {
                if ( dupeIDList.indexOf(lastAction.object.attributes.id) > -1 ) {
                    if (dupeIDList.length === 2) {
                        WMEPH_NAME_LAYER.destroyFeatures();
                        WMEPH_NAME_LAYER.setVisibility(false);
                    } else {
                        var deletedDupe = WMEPH_NAME_LAYER.getFeaturesByAttribute('dupeID', lastAction.object.attributes.id) ;
                        WMEPH_NAME_LAYER.removeFeatures(deletedDupe);
                        dupeIDList.splice(dupeIDList.indexOf(lastAction.object.attributes.id),1);
                    }
                    phlog('Deleted a dupe');
                }
            }
            /*
            else if ('undefined' !== typeof lastAction && lastAction.hasOwnProperty('feature') && lastAction.feature.hasOwnProperty('state') && lastAction.object.state === 'Update' &&
            lastAction.hasOwnProperty('newGeometry') ) {
                // update position of marker
            }
            */
        },20);
    }

    //  Whitelist an item
    function whitelistAction(itemID, wlKeyName) {
        var item = W.selectionManager.selectedItems[0].model;
        var addressTemp = item.getAddress();
        if ( addressTemp.hasOwnProperty('attributes') ) {
            addressTemp = addressTemp.attributes;
        }
        var itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(item.attributes.geometry.getCentroid().x,item.attributes.geometry.getCentroid().y);
        if (!venueWhitelist.hasOwnProperty(itemID)) {  // If venue is NOT on WL, then add it.
            venueWhitelist[itemID] = { };
        }
        venueWhitelist[itemID][wlKeyName] = {active: true};  // WL the flag for the venue
        venueWhitelist[itemID].city = addressTemp.city.attributes.name;  // Store city for the venue
        venueWhitelist[itemID].state = addressTemp.state.name;  // Store state for the venue
        venueWhitelist[itemID].country = addressTemp.country.name;  // Store country for the venue
        venueWhitelist[itemID].gps = itemGPS;  // Store GPS coords for the venue
        saveWL_LS(true);  // Save the WL to local storage
        WMEPH_WLCounter();
        bannButt2.clearWL.active = true;
    }

    // Keep track of how many whitelists have been added since the last pull, alert if over a threshold (100?)
    function WMEPH_WLCounter() {
        //debug('- WMEPH_WLCounter() called -');
        localStorage.WMEPH_WLAddCount = parseInt(localStorage.WMEPH_WLAddCount)+1;
        if (localStorage.WMEPH_WLAddCount > 50) {
            alert('Don\'t forget to periodically back up your Whitelist data using the Pull option in the WMEPH settings tab.');
            localStorage.WMEPH_WLAddCount = 2;
        }
    }

    var _googleLinkHash = {};
    function modifyGoogleLinks() {
        //debug('- modifyGoogleLinks() called -');
        // MutationObserver will be notified when Google place ID divs are added, then update them to be hyperlinks.
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // Mutation is a NodeList and doesn't support forEach like an array
                for (var i = 0; i < mutation.addedNodes.length; i++) {
                    var addedNode = mutation.addedNodes[i];
                    // Only fire up if it's a node
                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        if(addedNode.querySelector('div .placeId')) {
                            var placeLinkDivs = $(addedNode).find('.placeId');
                            for(i=0; i<placeLinkDivs.length; i++) {
                                var placeLinkDiv = placeLinkDivs[i];
                                var placeLinkId = placeLinkDiv.innerHTML;
                                if (_googleLinkHash.hasOwnProperty(placeLinkId)) {
                                    placeLinkDiv.innerHTML = _googleLinkHash[placeLinkId];
                                }
                            }
                        }
                    }
                }
            });
        });
        observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });
        $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
            try {
                if (originalOptions.type === "GET") {
                    if (originalOptions.url === "/maps/api/place/autocomplete/json" && !originalOptions.data.hasOwnProperty("location")) {
                        options.data = $.param($.extend(originalOptions.data, {
                            location: W.map.getCenter().transform(W.map.getProjection(), W.map.displayProjection).lat + "," + W.map.getCenter().transform(W.map.getProjection(), W.map.displayProjection).lon,
                            radius: 3200
                        }));
                    }
                }
            } catch(e) {}
        });
        $(document).ajaxSuccess(function(event, jqXHR, ajaxOptions, data) {
            try {
                var ix;
                if (ajaxOptions && ajaxOptions.hasOwnProperty("url")) {
                    if (ajaxOptions.url.startsWith("/maps/api/place/details/json")) {
                        if (data && data.hasOwnProperty("status") && data.status === "OK") {
                            if (data.hasOwnProperty("result") && data.result.hasOwnProperty("url") && data.result.hasOwnProperty("place_id")) {
                                var gpids = document.getElementsByClassName("placeId");
                                for (ix = 0; ix < gpids.length; ix++) {
                                    if (data.result.place_id === gpids[ix].innerHTML) {
                                        var html = "<a href='" + data.result.url + "' target='_wmegpid'>" + data.result.place_id + "</a>";
                                        _googleLinkHash[data.result.place_id] = html;
                                        gpids[ix].innerHTML = html;
                                    }
                                }
                            }
                        }
                    }
                    if (ajaxOptions.url.startsWith("/maps/api/place/autocomplete/json")) {
                        var uuids = document.getElementsByClassName("uuid");
                        for (ix = 0; ix < uuids.length; ix++) {
                            if (uuids[ix].className === "uuid") {
                                events = $._data(uuids[ix], "events");
                                if (events && events.hasOwnProperty("change") && events.change.length === 1) {
                                    $(uuids[ix]).change(function(event) {
                                        if (event && event.hasOwnProperty("val")) {
                                            $.get(W.Config.places_api.url.details, {placeid: event.val, key: W.Config.places_api.key});
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            } catch(e) {}
        });
    }

    // Run the script...
    placeHarmonizer_bootstrap();


    // LZ Compressor
    // Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
    // This work is free. You can redistribute it and/or modify it
    // under the terms of the WTFPL, Version 2
    // LZ-based compression algorithm, version 1.4.4
    var LZString = (function() {
        // private property
        var f = String.fromCharCode;
        var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
        var baseReverseDic = {};

        function getBaseValue(alphabet, character) {
            if (!baseReverseDic[alphabet]) {
                baseReverseDic[alphabet] = {};
                for (var i = 0; i < alphabet.length; i++) {
                    baseReverseDic[alphabet][alphabet.charAt(i)] = i;
                }
            }
            return baseReverseDic[alphabet][character];
        }
        var LZString = {
            compressToBase64: function(input) {
                if (input === null) return "";
                var res = LZString._compress(input, 6, function(a) {
                    return keyStrBase64.charAt(a);
                });
                switch (res.length % 4) { // To produce valid Base64
                    default: // When could this happen ?
                    case 0:
                        return res;
                    case 1:
                        return res + "===";
                    case 2:
                        return res + "==";
                    case 3:
                        return res + "=";
                }
            },
            decompressFromBase64: function(input) {
                if (input === null) return "";
                if (input === "") return null;
                return LZString._decompress(input.length, 32, function(index) {
                    return getBaseValue(keyStrBase64, input.charAt(index));
                });
            },
            compressToUTF16: function(input) {
                if (input === null) return "";
                return LZString._compress(input, 15, function(a) {
                    return f(a + 32);
                }) + " ";
            },
            decompressFromUTF16: function(compressed) {
                if (compressed === null) return "";
                if (compressed === "") return null;
                return LZString._decompress(compressed.length, 16384, function(index) {
                    return compressed.charCodeAt(index) - 32;
                });
            },

            compress: function(uncompressed) {
                return LZString._compress(uncompressed, 16, function(a) {
                    return f(a);
                });
            },
            _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
                if (uncompressed === null) return "";
                var i, value,
                    context_dictionary = {},
                    context_dictionaryToCreate = {},
                    context_c = "",
                    context_wc = "",
                    context_w = "",
                    context_enlargeIn = 2, // Compensate for the first entry which should not count
                    context_dictSize = 3,
                    context_numBits = 2,
                    context_data = [],
                    context_data_val = 0,
                    context_data_position = 0,
                    ii;
                for (ii = 0; ii < uncompressed.length; ii += 1) {
                    context_c = uncompressed.charAt(ii);
                    if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                        context_dictionary[context_c] = context_dictSize++;
                        context_dictionaryToCreate[context_c] = true;
                    }
                    context_wc = context_w + context_c;
                    if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                        context_w = context_wc;
                    } else {
                        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                            if (context_w.charCodeAt(0) < 256) {
                                for (i = 0; i < context_numBits; i++) {
                                    context_data_val = (context_data_val << 1);
                                    if (context_data_position === bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                }
                                value = context_w.charCodeAt(0);
                                for (i = 0; i < 8; i++) {
                                    context_data_val = (context_data_val << 1) | (value & 1);
                                    if (context_data_position === bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                    value = value >> 1;
                                }
                            } else {
                                value = 1;
                                for (i = 0; i < context_numBits; i++) {
                                    context_data_val = (context_data_val << 1) | value;
                                    if (context_data_position === bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                    value = 0;
                                }
                                value = context_w.charCodeAt(0);
                                for (i = 0; i < 16; i++) {
                                    context_data_val = (context_data_val << 1) | (value & 1);
                                    if (context_data_position === bitsPerChar - 1) {
                                        context_data_position = 0;
                                        context_data.push(getCharFromInt(context_data_val));
                                        context_data_val = 0;
                                    } else {
                                        context_data_position++;
                                    }
                                    value = value >> 1;
                                }
                            }
                            context_enlargeIn--;
                            if (context_enlargeIn === 0) {
                                context_enlargeIn = Math.pow(2, context_numBits);
                                context_numBits++;
                            }
                            delete context_dictionaryToCreate[context_w];
                        } else {
                            value = context_dictionary[context_w];
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn === 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        // Add wc to the dictionary.
                        context_dictionary[context_wc] = context_dictSize++;
                        context_w = String(context_c);
                    }
                }
                // Output the code for w.
                if (context_w !== "") {
                    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                        if (context_w.charCodeAt(0) < 256) {
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1);
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 8; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        } else {
                            value = 1;
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1) | value;
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = 0;
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 16; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position === bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn === 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        delete context_dictionaryToCreate[context_w];
                    } else {
                        value = context_dictionary[context_w];
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position === bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn === 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                }
                // Mark the end of the stream
                value = 2;
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
                // Flush the last char
                while (true) {
                    context_data_val = (context_data_val << 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data.push(getCharFromInt(context_data_val));
                        break;
                    } else context_data_position++;
                }
                return context_data.join('');
            },
            decompress: function(compressed) {
                if (compressed === null) return "";
                if (compressed === "") return null;
                return LZString._decompress(compressed.length, 32768, function(index) {
                    return compressed.charCodeAt(index);
                });
            },
            _decompress: function(length, resetValue, getNextValue) {
                var dictionary = [],
                    next,
                    enlargeIn = 4,
                    dictSize = 4,
                    numBits = 3,
                    entry = "",
                    result = [],
                    i,
                    w,
                    bits, resb, maxpower, power,
                    c,
                    data = {
                        val: getNextValue(0),
                        position: resetValue,
                        index: 1
                    };
                for (i = 0; i < 3; i += 1) {
                    dictionary[i] = i;
                }
                bits = 0;
                maxpower = Math.pow(2, 2);
                power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                switch (next = bits) {
                    case 0:
                        bits = 0;
                        maxpower = Math.pow(2, 8);
                        power = 1;
                        while (power !== maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position === 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        c = f(bits);
                        break;
                    case 1:
                        bits = 0;
                        maxpower = Math.pow(2, 16);
                        power = 1;
                        while (power !== maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position === 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        c = f(bits);
                        break;
                    case 2:
                        return "";
                }
                dictionary[3] = c;
                w = c;
                result.push(c);
                while (true) {
                    if (data.index > length) {
                        return "";
                    }
                    bits = 0;
                    maxpower = Math.pow(2, numBits);
                    power = 1;
                    while (power !== maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position === 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    switch (c = bits) {
                        case 0:
                            bits = 0;
                            maxpower = Math.pow(2, 8);
                            power = 1;
                            while (power !== maxpower) {
                                resb = data.val & data.position;
                                data.position >>= 1;
                                if (data.position === 0) {
                                    data.position = resetValue;
                                    data.val = getNextValue(data.index++);
                                }
                                bits |= (resb > 0 ? 1 : 0) * power;
                                power <<= 1;
                            }
                            dictionary[dictSize++] = f(bits);
                            c = dictSize - 1;
                            enlargeIn--;
                            break;
                        case 1:
                            bits = 0;
                            maxpower = Math.pow(2, 16);
                            power = 1;
                            while (power !== maxpower) {
                                resb = data.val & data.position;
                                data.position >>= 1;
                                if (data.position === 0) {
                                    data.position = resetValue;
                                    data.val = getNextValue(data.index++);
                                }
                                bits |= (resb > 0 ? 1 : 0) * power;
                                power <<= 1;
                            }
                            dictionary[dictSize++] = f(bits);
                            c = dictSize - 1;
                            enlargeIn--;
                            break;
                        case 2:
                            return result.join('');
                    }
                    if (enlargeIn === 0) {
                        enlargeIn = Math.pow(2, numBits);
                        numBits++;
                    }
                    if (dictionary[c]) {
                        entry = dictionary[c];
                    } else {
                        if (c === dictSize) {
                            entry = w + w.charAt(0);
                        } else {
                            return null;
                        }
                    }
                    result.push(entry);
                    // Add w+entry[0] to the dictionary.
                    dictionary[dictSize++] = w + entry.charAt(0);
                    enlargeIn--;
                    w = entry;
                    if (enlargeIn === 0) {
                        enlargeIn = Math.pow(2, numBits);
                        numBits++;
                    }
                }
            }
        };
        return LZString;
    })();
    if (typeof define === 'function' && define.amd) {
        define(function() {
            return LZString;
        });
    } else if (typeof module !== 'undefined' && module !== null) {
        module.exports = LZString;
    }

})();

