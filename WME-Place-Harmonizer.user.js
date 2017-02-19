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
/* global GM_getResourceText */
/* global GM_addStyle */

// ==UserScript==
// @name        WME Place Harmonizer Beta (refactor)
// @namespace   https://github.com/WazeUSA/WME-Place-Harmonizer/raw/master/WME-Place-Harmonizer.user.js
// @version     1.2.2-Refactor2017
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH Development Group
// @license     GNU GPL v3
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/.*$/
// @require     https://raw.githubusercontent.com/WazeUSA/WME-Place-Harmonizer/Beta/jquery-ui-1.11.4.custom.min.js
// @resource    CHANGELOG   https://raw.githubusercontent.com/WazeUSA/WME-Place-Harmonizer/Refactor2017/CHANGELOG.json
// @resource    WMEPH_CSS   https://raw.githubusercontent.com/WazeUSA/WME-Place-Harmonizer/Refactor2017/WME-Place-Harmonizer.user.css
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
    var CHANGE_LOG = JSON.parse(GM_getResourceText("CHANGELOG"));
    var CHANGE_LOG_TEXT;
    var NEW_FEATURES_LIST = [  // New in this major version
        'WMEPH is now available for R1 editors to use!',
        'Yellow "caution" map highlights.',
        'Missing external provider (Google linked place) is flagged if R3+.',
        'Optional setting to treat missing external provider link as a blue flag instead of red.',
        'Improvements to hospital, gas station, and PLA highlighting.',
        'Layout and data entry improvements.',
        'A boatload of bug fixes.'
    ];
    var NEW_FEATURES_TEXT = "WMEPH v" + WMEPH_VERSION_MAJOR + "\nMajor features:\n" + NEW_FEATURES_LIST.join("\n");
    // Script Name, Version, Meta info
    var WMEPH_VERSION_LONG = GM_info.script.version.toString(),             // Pull version from header
        WMEPH_VERSION_MAJOR = WMEPH_VERSION_LONG.match(/(\d+\.\d+)/i)[1],   // Get the X.X version number
        NEW_MAJOR_FEATURE = true,                                          // Set to true to make an alert pop up after script update with new feature
        SCRIPT_NAME = GM_info.script.name.toString(),
        IS_DEV_VERSION = (SCRIPT_NAME.match(/Beta/i) !== null);             // Enables dev messages and unique DOM options if the script is called "... Beta"
    // CSS Stuff
//    var WMEPH_CSS = GM_getResourceText("WMEPH_CSS"); GM_addStyle(WMEPH_CSS);
    var JQ_UI_CSS = GM_getResourceText("JQ_UI_CSS"); GM_addStyle(JQ_UI_CSS);
    // Was testing this, but I don't think the following line does anything. (mapomatic)
    //GM_addStyle('  <style> .ui-autocomplete {max-height: 100px;overflow-y: auto;overflow-x: hidden;}  * html .ui-autocomplete {height: 100px;}</style>');
    // Important Links
    var WMEPH_FORUM_URL     = 'https://www.waze.com/forum/posting.php?mode=reply&f=819&t=215657',   // WMEPH Forum thread URL
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
    var TOLL_FREE       = [ "800","822","833","844","855","866","877","888" ];


    //////////////////////////////////
    // Delayed-assignment Constants //
    //////////////////////////////////

    var NEW_SHEET_DATA;
    // User Lists
    var WMEPH_DEV_LIST,
        WMEPH_BETA_LIST;
    // Category Name Checking
    var NON_HOSPITAL_PART_MATCH,
        NON_HOSPITAL_FULL_MATCH,
        ANIMAL_PART_MATCH,
        ANIMAL_FULL_MATCH,
        SCHOOL_PART_MATCH,
        SCHOOL_FULL_MATCH;
    // Categories and Services
    var NA_CAT_DATA,
        REGION_DATA = {};
    // User-specific values
    var IS_DEV_USER,
        IS_BETA_USER,
        USER_NAME,
        USER_RANK;
    var USER_LANG = 'en';  // This will probably become a delayed constant once we add support for other languages.
    // Layers
    var DUPLICATE_LAYER;  // Gets created inside of createDuplicatePlaceLayer().
    var LANDMARK_LAYER;

    // This function is called by XXXXX to assign all of the constants that need to be assigned at the beginning of the script.
    // NOTE: I put it here because it's right next to the variable declarations, so it's easier to find. --RavenDT
    function assignDelayedConstants() {
        USER_NAME = W.loginManager.user.userName;
        USER_RANK = W.loginManager.user.normalizedLevel;
        //debug('REGION_DATA = ' + JSON.stringify(REGION_DATA));
        LANDMARK_LAYER = W.map.landmarkLayer;

        // Determine Dev User and Beta User
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
    }


    ////////////////////////
    // Waze Class Imports //
    ////////////////////////
    var UpdateObject = require("Waze/Action/UpdateObject");
    var MultiAction = require("Waze/Action/MultiAction");


    /////////////////////
    // Other Variables //
    /////////////////////

    var dataReadyCounter = 0;
    var panelFields = {};       // Fields in the Item Edit Sidebar
    var myState,
        myState2L,
        myCountry,
        myCountry2L,
        areaCodeList,
        gFormState = "";
    var currentWL = {};
    var _popupWindow;

    /////////////////////////////////////
    /////////////////////////////////////
    //// WMEPH function declarations ////
    /////////////////////////////////////
    /////////////////////////////////////

    ///////////////////////////////
    // Generic utility functions //
    ///////////////////////////////

    function _injectElement(o, type) {
        if (!type) { type = "script"; }
        var $ele = $("<" + type + ">");
        $ele.append(document.createTextNode(o));
        ($("body") || $("head") || $("html")).append($ele);
    }

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
        };
    }

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

    function openWindow(url) {
        if (!_popupWindow || _popupWindow.closed) {
            _popupWindow = window.open(url, '_blank');
        } else {
            _popupWindow.focus();
            _popupWindow.location = url;
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

    // Dereferences an object.  Useful when making copies instead of references.
    function deref(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Removes duplicate strings from string array
    function uniq(a) {
        //debug('- uniq(a) called -');
        var seen = {};
        return a.filter(function(item) {
            return seen.hasOwnProperty(item) ? false : (seen[item] = true);
        });
    }

    // Takes a JavaScript object and returns a DOM in jQuery of a structured list to be inserted into the document.
    function buildDOMList(obj) {
        var i, len, $x, $xList;
        var $domObj = $("<ul>");
        var proto = Object.prototype.toString.call(obj);
        if (proto === "[object Object]") {
            for (i in obj) {
                $xList = buildDOMList(obj[i]);
                $x = $("<li>"+i+"</li>");
                $x.attr("id","WMEPH_"+i);
                $domObj.append($x);
                $x.after($xList);
            }
        } else if (proto === "[object Array]") {
            for (i = 0, len = obj.length; i < len; i++) {
                if (typeof(obj[i]) === "object") {
                    $xList = buildDOMList(obj[i]);
                    $x = $domObj.append("<li>");
                    $x.after($xList);
                } else {
                    $domObj.append("<li>"+obj[i]+"</li>");
                }
            }
        } else {
            $domObj.append("<li>"+obj+"</li>");
        }

        return $domObj;
    }

    // NOTE: Is this reinventing the wheel?
    // Function that checks if any element of target are in source
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
        return uniq(arrayNew);  // remove any duplicates (so the function can be used to move the position of a string)
    }


    //////////////////////////////
    // Value-checking Functions //
    //////////////////////////////

    // Returns true if a place is a parking lot.
    function isPLA(venue) {
        return venue.attributes.categories && venue.attributes.categories[0] === 'PARKING_LOT';
    }

    // Returns the severity of a Point Versus Area warning flag based on the value determined in the PVA check algorithm.
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
        // NOTE: Had to prevent collisions with "Canada" matching on "CA" because "California"; use "CAN" for Canada in sheets.
        if ((aObj.psAbbrev).indexOf(bObj) > -1 && !(a === "Canada" && "CA".indexOf(bObj) > -1)) {
            return true;
        }
        // If the region is inside the list
        if (aObj.psRegion.indexOf(bObj) > -1 && !(a === "Canada" && "CA".indexOf(bObj) > -1)) {
            return true;
        }
        // If the region's region is inside the list
        if (REGION_DATA.regions.hasOwnProperty(aObj.psRegion) && (REGION_DATA.regions[aObj.psRegion].psRegion.indexOf(b) > -1) && !(a === "Canada" && "CA".indexOf(bObj) > -1)) {
            return true;
        }

        //debug('Fail-through 9 -- aObj.psAbbrev = '+aObj.psAbbrev+' // aObj.psRegion = '+aObj.psRegion+' // b = '+JSON.stringify(bObj));
        return false;
    }


    /////////////////////////////
    // Value-getting Functions //
    /////////////////////////////

    // NOTE: Not refactored yet.
    // Takes an id string and appends # if necessary.
    function getJQueryId(id) {
        if (id && id.length > 0) {
            id = id.trim();
            if (id[0] !== '#') id = '#' + id;
            return id;
        } else {
            throw 'ID cannot be empty.';
        }
    }

    // NOTE: Not refactored yet.
    // Returns a jquery object, or throws an error if it does not contain exactly one DOM element.
    function getJQueryObject(id, ignoreErrors) {
        var $obj = $(getJQueryId(id));
        if (!ignoreErrors) {
            if ( $obj.length === 0) {
                throw 'Element with ID = "' + id + '" does not exist.';
            } else if ( $obj.length > 1) {
                throw 'There is more than one element with ID = "' + id + '".';
            }
        }
        return $obj;
    }

    // NOTE: Not refactored yet.  This can probably be combined with the below function because the are both always used together.
    // Pulls the item PL
    function getItemLink() {
        //debug('- getItemLink() called -');
        // Append a form div if it doesn't exist yet:
        if ( $('#WMEPH_formDiv').length === 0 ) {
            var tempDiv = document.createElement('div');
            tempDiv.id = 'WMEPH_formDiv';
            tempDiv.style.display = 'inline';
            $(".WazeControlPermalink").append(tempDiv);
        }
        // Return the current PL
        if ($(".WazeControlPermalink").length === 0) {
            phlog("Waiting for PL div");
            setTimeout(getItemLink, 500);
            return;
        }
        if ( $(".WazeControlPermalink").children(".icon-link").length > 0 ) {
            return $(".WazeControlPermalink").children(".icon-link")[0].href;
        } else if ( $(".WazeControlPermalink").children(".fa-link").length > 0 ) {
            return $(".WazeControlPermalink").children(".fa-link")[0].href;
        }
        return '';
    }

    // NOTE: Not refactored yet.  This can probably be combined with the above function because the are both always used together.
    function removeLinkLayers(str) {
        // https://www.waze.com/editor/?env=usa&lon=-80.60757&lat=28.17850&layers=1957&zoom=4&segments=86124344&update_requestsFilter=false&problemsFilter=false&mapProblemFilter=0&mapUpdateRequestFilter=0&venueFilter=1
        str = str.replace(/\&layers=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
        str = str.replace(/\&update_requestsFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
        str = str.replace(/\&problemsFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
        str = str.replace(/\&mapProblemFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
        str = str.replace(/\&mapUpdateRequestFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
        str = str.replace(/\&venueFilter=[^\&]+(\&?)/g, '$1');  // remove Permalink Layers
        return str;
    }

    ///////////////////////
    // Parsing Functions //
    ///////////////////////

    // Alphanumeric phone conversion
    function replaceLetters(number) {
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


    //////////////////////////////
    // Display/UI/CSS Functions //
    //////////////////////////////

    // Focus away from the current cursor focus, to set text box changes
    function blurAll() {
        //debug('-- blurAll() called --');
        var tmp = document.createElement("input");
        document.body.appendChild(tmp);
        tmp.focus();
        document.body.removeChild(tmp);
    }

    // This function will build the Banner object in the sidebar.
    // Why did I rename it "constructBanner"? Because it should only be run once at runtime.
    // YOBO! You only build once!
    function constructBanner() {
        phlogdev('Building banner (ONCE!)');
        var $contents = $("#edit-panel");
        var hidden = !($contents.is(":visible"));
        var k;

        // Build the container.
        //if (hidden) { $contents.show(); }
        var $container = $("#WMEPH_Container");
        if ($container.length === 0) {
            $container = $('<div id="WMEPH_Container"></div>');
        } else {
            $container.empty();
        }
        //if (hidden) { $contents.hide(); }

        /* Build the banner. */
        var $banner = $('<div id="WMEPH_Banner" class="banner-severity--1">');
        // Add duplicate header
        var $dupeTitle = $('<div id="WMEPH_DupeTitle" class="banner-dupe banner-row-severity-2">');
        $dupeTitle.html('<span class="fa fa-exclamation-circle"></span> Possible duplicates:');
        var $dupeList = $('<ul id="WMEPH_DupeList" class="banner-dupe banner-row-severity-2">');
        $banner.append($dupeTitle,$dupeList,$bannerRows);

        // Add banner row container.
        var $bannerRows = $('<div id="WMEPH_BannerRows">');

        // Append to the container.
        $banner.append($dupeTitle,$dupeList,$bannerRows);
        $container.append($banner);

        /* Build the services. */
        var $services = $('<div id="WMEPH_Services">Add services<br /></div>');
        var _serviceButtons = {
            addValet:           "Valet",
            addDriveThru:       "Drive-Thru",
            addWiFi:            "WiFi",
            addRestrooms:       "Restrooms",
            addCreditCards:     "Credit Cards",
            addReservations:    "Reservations",
            addOutside:         "Outside Seating",
            addAC:              "Air-Conditioning",
            addParking:         "Parking",
            addDeliveries:      "Deliveries",
            addTakeAway:        "Take Out",
            addWheelchair:      "Wheelchair Accessible",
            add247:             "Hours: Open 24\/7"
        };
        var $serviceButton;
        for (k in _serviceButtons) {
            $serviceButton = $('<input type="button">');
            $serviceButton.attr("id", "WMEPH_" + k);
            $serviceButton.attr("title", _serviceButtons[k]);
            $serviceButton.addClass("wmeph-btn-service wmeph-btn-service-disabled");
            $services.append($serviceButton);
        }
        $container.append($services);

        /* Build the tools. */
        var $tools = $('<div id="WMEPH_Tools">');
        var _toolButtons = {
            placesWiki: {
                active: true, value: "Places Wiki", title: "Open the places wiki page",
                action: function() {
                    window.open(PLACES_WIKI_URL);
                }
            },
            restAreaWiki: {
                active: false, value: "Rest Area Wiki", title: "Open the Rest Area wiki page",
                action: function() {
                    window.open(RESTAREA_WIKI_URL);
                }
            },
            clearWL: {
                active: false, value: "Clear Whitelist for Place", title: "Clear all Whitelisted fields for this place",
                action: function() {
                    if (confirm('Are you sure you want to clear all whitelisted fields for this place?') ) {  // misclick check
                        delete venueWhitelist[W.selectionManager.selectedItems[0].model.id];
                        saveWL_LS(true);
                        harmonizePlaceGo(W.selectionManager.selectedItems[0].model,'harmonize');  // rerun the script to check all flags again
                    }
                }
            },
            PlaceErrorForumPost: {
                active: true, value: "Report Script Error", title: "Report a script error",
                action: function() {
                    var forumMsgInputs = {
                        subject: 'WMEPH Bug report: Scrpt Error',
                        message: 'Script version: ' + WMEPH_VERSION_LONG + devVersStr +
                        '\nPermalink: ' + W.selectionManager.selectedItems[0].model.attributes.harmony.permalink +
                        '\nPlace name: ' + W.selectionManager.selectedItems[0].model.attributes.name +
                        '\nCountry: ' + W.selectionManager.selectedItems[0].model.getAddress().country.name +
                        '\n--------\nDescribe the error:  \n '
                    };
                    WMEPH_errorReport(forumMsgInputs);
                }
            },
            whatsNew: {
                active: false, value: "Recent Script Updates", title: "Open a list of recent script updates",
                action: function() {
                    alert(CHANGE_LOG_TEXT);
                    localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');
                    //bannButt2.whatsNew.active = false;
                }
            }
        };
        var $toolButton;
        for (k in _toolButtons) {
            $toolButton = $('<input type="button">');
            $toolButton.attr("id", "WMEPH_" + k);
            $toolButton.attr("value", _toolButtons[k].value);
            $toolButton.attr("title", _toolButtons[k].title);
            $toolButton.addClass("btn btn-info btn-xs wmeph-btn");
            $tools.append($toolButton);
        }
        $container.append($tools);

        /* Build the run button. */
        var $runButtonDiv = $('<div id="WMEPH_RunButtonBox">');
        var $runButton = $('<input type="button">');
        $runButton.attr("id", "WMEPH_RunButton");
        var runStr = "Run WMEPH" + ((IS_DEV_VERSION) ? " " + devVersStr : "");
        $runButton.attr("value", runStr);
        $runButton.attr("title", runStr + " on selected place");
        $runButton.addClass("btn btn-primary");
        $runButton.click(function() { harmonizePlace(); });
        $runButtonDiv.append($runButton);
        $container.append($runButtonDiv);

        /* Build the cloning tools. */
        var $cloneTools = $('<div id="WMEPH_CloneTools">');
        var $cloneCopy = $('<input id="WMEPH_CloneCopyButton" type="button" value="Copy" title="Copy place information">');
        var $clonePaste = $('<input id="WMEPH_ClonePasteButton" type="button" value="Paste" '+
            'title="Apply copied place information (Ctrl+Alt+O)">')
        $cloneTools.append($cloneCopy,$clonePaste);
        $cloneCopy.addClass("btn btn-warning btn-xs wmeph-btn");
        $clonePaste.addClass("btn btn-warning btn-xs wmeph-btn");
        $cloneCopy.click(function() {
            var item = W.selectionManager.selectedItems[0].model;
            var cloneSession = sessionStorage;
            var cloneMaster = {};
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
            cloneSession.setItem("WMEPH_CloneMaster", cloneMaster);
            phlogdev("Place attributes copied.");
        });
        $($clonePaste).click(function() {
            phlog("Pasting place attributes...");
            var UO = require("Waze/Action/UpdateObject");
            var cloneSession = sessionStorage;
            var cloneMaster = cloneSession.getItem("WMEPH_CloneMaster");
            if (cloneMaster !== null && typeof(cloneMaster) === "object") {
                var item = W.selectionManager.selectedItems[0].model;
                var cloneItems = {};
                var updateItem = false;
                if (isChecked("WMEPH_CloneHN")) {
                    cloneItems.houseNumber = cloneMaster.houseNumber;
                    updateItem = true;
                }
                if (isChecked("WMEPH_CloneUrl")) {
                    cloneItems.url = cloneMaster.url;
                    updateItem = true;
                }
                if (isChecked("WMEPH_ClonePhone")) {
                    cloneItems.phone = cloneMaster.phone;
                    updateItem = true;
                }
                if (isChecked("WMEPH_CloneDesc")) {
                    cloneItems.description = cloneMaster.description;
                    updateItem = true;
                }
                if (isChecked("WMEPH_CloneServ")) {
                    cloneItems.services = cloneMaster.services;
                    updateItem = true;
                }
                if (isChecked("WMEPH_CloneHours")) {
                    cloneItems.openingHours = cloneMaster.openingHours;
                    updateItem = true;
                }
                if (updateItem) {
                    W.model.actionManager.add(new UpdateObject(item, cloneItems) );
                    phlogdev('Item details cloned');
                }

                var copyStreet = isChecked("WMEPH_CloneStreet");
                var copyCity = isChecked("WMEPH_CloneCity");

                if (copyStreet || copyCity) {
                    var originalAddress = item.getAddress();
                    var itemRepl = {
                        street: copyStreet ? cloneMaster.addr.street : originalAddress.attributes.street,
                        city: copyCity ? cloneMaster.addr.city : originalAddress.attributes.city,
                        state: copyCity ? cloneMaster.addr.state : originalAddress.attributes.state,
                        country: copyCity ? cloneMaster.addr.country : originalAddress.attributes.country
                    };
                    updateAddress(item, itemRepl);
                    phlogdev("Item address cloned.");
                }
            } else {
                phlog("Please copy a place first.");
            }
        });
        var _cloneCheckboxes = {
            CloneHN:    "HN",
            CloneStreet:"Str",
            CloneCity:  "City",
            CloneUrl:   "URL",
            ClonePhone: "Ph",
            CloneDesc:  "Desc",
            CloneServ:  "Serv",
            CloneHours: "Hrs"
        };
        var $cloneCheckbox, settingId, storedSetting;
        for (k in _cloneCheckboxes) {
            settingId = "WMEPH_" + _cloneCheckboxes[k];
            $cloneCheckbox = $('<input type="checkbox">');
            $cloneCheckbox.attr("id", settingId);
            $cloneCheckbox.click(function() { saveSettingToLocalStorage(settingId); });
            storedSetting = localStorage.getItem(settingId);
            if (!storedSetting) {
                phlogdev(settingId + " not found.");
            } else if(storedSetting === "1") {
                // We may have to revisit this.
                $cloneCheckbox.trigger("click");
            }
            $cloneTools.append($cloneCheckbox);
            $(document.createTextNode(_cloneCheckboxes[k])).insertAfter($cloneCheckbox);
        }
        var $quickSelect;
        ["All","Addr","None"].forEach(function(i){
            $quickSelect = $('<input type="button" id="WMEPH_CloneQuickSelect'+i+'" value="'+i+'">');
            $quickSelect.addClass("btn btn-info btn-xs wmeph-btn");
            $cloneTools.append($quickSelect);
        });
        $("#WMEPH_CloneQuickSelectAll").attr("title","Check All");
        $("#WMEPH_CloneQuickSelectAddr").attr("title","Check Address");
        $("#WMEPH_CloneQuickSelectNone").attr("title","Check None");
        $("#WMEPH_CloneQuickSelectAll").click(function() {
            setCheckedStateByClick("WMEPH_CloneHN", true);
            setCheckedStateByClick("WMEPH_CloneStreet", true);
            setCheckedStateByClick("WMEPH_CloneCity", true);
            setCheckedStateByClick("WMEPH_CloneUrl", true);
            setCheckedStateByClick("WMEPH_ClonePhone", true);
            setCheckedStateByClick("WMEPH_CloneServ", true);
            setCheckedStateByClick("WMEPH_CloneDesc", true);
            setCheckedStateByClick("WMEPH_CloneHours", true);
        });
        $("#WMEPH_CloneQuickSelectAddr").click(function() {
            setCheckedStateByClick("WMEPH_CloneHN", true);
            setCheckedStateByClick("WMEPH_CloneStreet", true);
            setCheckedStateByClick("WMEPH_CloneCity", true);
            setCheckedStateByClick("WMEPH_CloneUrl", false);
            setCheckedStateByClick("WMEPH_ClonePhone", false);
            setCheckedStateByClick("WMEPH_CloneServ", false);
            setCheckedStateByClick("WMEPH_CloneDesc", false);
            setCheckedStateByClick("WMEPH_CloneHours", false);
        });
        $("#WMEPH_CloneQuickSelectNone").click(function() {
            setCheckedStateByClick("WMEPH_CloneHN", false);
            setCheckedStateByClick("WMEPH_CloneStreet", false);
            setCheckedStateByClick("WMEPH_CloneCity", false);
            setCheckedStateByClick("WMEPH_CloneUrl", false);
            setCheckedStateByClick("WMEPH_ClonePhone", false);
            setCheckedStateByClick("WMEPH_CloneServ", false);
            setCheckedStateByClick("WMEPH_CloneDesc", false);
            setCheckedStateByClick("WMEPH_CloneHours", false);
        });
        $container.append($cloneTools);

        //if (hidden) { $contents.show(); }
        $container.prependTo($contents);
        //if (hidden) { $contents.hide(); }
    }

/*
    // REVISITING THIS
    // Setup div for banner messages and color
    function displayTools(sbm) {
        //debug('- displayTools(sbm) called -');
        //debug('sbm = ' + JSON.stringify(sbm));
        if ($("#WMEPH_tools").length === 0 ) {
            $("#WMEPH_banner").after('<div id="WMEPH_tools">');
            $("#WMEPH_tools").prepend("<ul>");
        } else {
            $("#WMEPH_tools > ul").empty();
        }
        //sbm = '<li><span style="position:relative;left:-10px;">' + sbm + '</span></li>';
        sbm = "<li>" + sbm + "</li>";
        $("#WMEPH_tools > ul").append(sbm);
        $('#select2-drop').hide();
    }
*/

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
                    WMEPH_DEV_LIST          = NEW_SHEET_DATA.devList;
                    WMEPH_BETA_LIST         = NEW_SHEET_DATA.betaList;
                    NON_HOSPITAL_PART_MATCH = NEW_SHEET_DATA.hmchp;
                    NON_HOSPITAL_FULL_MATCH = NEW_SHEET_DATA.hmchf;
                    ANIMAL_PART_MATCH       = NEW_SHEET_DATA.hmcap;
                    ANIMAL_FULL_MATCH       = NEW_SHEET_DATA.hmcaf;
                    SCHOOL_PART_MATCH       = NEW_SHEET_DATA.schp;
                    SCHOOL_FULL_MATCH       = NEW_SHEET_DATA.schf;
                    NA_CAT_DATA             = NEW_SHEET_DATA.catList;
                    //* Commented out while working on parsing data from old sheets into new format.
                    REGION_DATA.states      = NEW_SHEET_DATA.states;
                    REGION_DATA.countries   = NEW_SHEET_DATA.countries;
                    REGION_DATA.regions     = NEW_SHEET_DATA.regions;
                    //*/
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
                    ANIMAL_PART_MATCH       = response.feed.entry[0].gsx$hmcap.$t;
                    ANIMAL_FULL_MATCH       = response.feed.entry[0].gsx$hmcaf.$t;
                    SCHOOL_PART_MATCH       = response.feed.entry[0].gsx$schp.$t;
                    SCHOOL_FULL_MATCH       = response.feed.entry[0].gsx$schf.$t;
                    NON_HOSPITAL_PART_MATCH = NON_HOSPITAL_PART_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    NON_HOSPITAL_FULL_MATCH = NON_HOSPITAL_FULL_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    ANIMAL_PART_MATCH       = ANIMAL_PART_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    ANIMAL_FULL_MATCH       = ANIMAL_FULL_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    SCHOOL_PART_MATCH       = SCHOOL_PART_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
                    SCHOOL_FULL_MATCH       = SCHOOL_FULL_MATCH.toLowerCase().replace(/ \|/g,'|').replace(/\| /g,'|').split("|");
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
                        var key = arr[0];
                        services            = { "psValet"           :   parseInt(arr[14]) || "",
                                                "psDriveThru"       :   parseInt(arr[15]) || "",
                                                "psWiFi"            :   parseInt(arr[16]) || "",
                                                "psRestrooms"       :   parseInt(arr[17]) || "",
                                                "psCreditCards"     :   parseInt(arr[18]) || "",
                                                "psReservations"    :   parseInt(arr[19]) || "",
                                                "psOutside"         :   parseInt(arr[20]) || "",
                                                "psAirCond"         :   parseInt(arr[21]) || "",
                                                "psParking"         :   parseInt(arr[22]) || "",
                                                "psDelivery"        :   parseInt(arr[23]) || "",
                                                "psTakeAway"        :   parseInt(arr[24]) || "",
                                                "psWheelchair"      :   parseInt(arr[25]) || "" };
                        NA_CAT_DATA[key]    = { "pcPoint"           :   arr[2],
                                                "pcArea"            :   arr[3],
                                                "pcRegPoint"        :   arr[4].replace(/[^A-Z]+/g,",").split(/,/),
                                                "pcRegArea"         :   arr[5].replace(/[^A-Z]+/g,",").split(/,/),
                                                "pcLock1"           :   arr[6].replace(/[^A-Z]+/g,",").split(/,/),
                                                "pcLock2"           :   arr[7].replace(/[^A-Z]+/g,",").split(/,/),
                                                "pcLock3"           :   arr[8].replace(/[^A-Z]+/g,",").split(/,/),
                                                "pcLock4"           :   arr[9].replace(/[^A-Z]+/g,",").split(/,/),
                                                "pcLock5"           :   arr[10].replace(/[^A-Z]+/g,",").split(/,/),
                                                "pcRare"            :   arr[11].replace(/[^A-Z]+/g,",").split(/,/),
                                                "pcParent"          :   arr[12].replace(/[^A-Z]+/g,",").split(/,/),
                                                "pcMessage"         :   arr[13],
                                                "services"          :   services };
                    }
                }
            });

            // Pull State-based Data (includes CAN for now)
            $.ajax({
                type: 'GET',
                url: 'https://spreadsheets.google.com/feeds/list/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/os2g2ln/public/values',
                jsonp: 'callback', data: { alt: 'json-in-script' }, dataType: 'jsonp',
                success: function(response) {
                    var states = {},
                        countries = {},
                        regions = {};

                    for (var i = 1, len = response.feed.entry.length; i < len; i++) {
                        var arr = response.feed.entry[i].gsx$psdata.$t.split("|");
                        var key = arr[0];
                        states[key] = { "psAbbrev"      : arr[1],
                                        "psRegion"      : arr[2],
                                        "psGoogleForm"  : arr[3],
                                        "psDefaultLock" : arr[4],
                                        "psRequirePhone": arr[5],
                                        "psRequireUrl"  : arr[6],
                                        "psPhoneFormat" : "",
                                        "psAreaCode"    : (arr[7].replace(/\D+/g,",")).split(/,/) };
                        if (key.match(/(?:Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland And Labrador|Northwest Territories|Nova Scotia|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon)/)) {
                            states[key].psRegion = "CAN";
                        }
                    }
                    // Just copy/pasted from the New JSON.  So sue me.
                    countries = {"American Samoa":{psAbbrev:"AQ",psRegion:"ATR",psGoogleForm:"",psDefaultLock:"2",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:"684"},Canada:{psAbbrev:"CA",psRegion:"CAN",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:1,psAreaCode:""},"Northern Mariana Islands":{psAbbrev:"CQ",psRegion:"ATR",psGoogleForm:"",psDefaultLock:"2",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:"670"},Guam:{psAbbrev:"GQ",psRegion:"ATR",psGoogleForm:"",psDefaultLock:"2",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:"671"},"Marshal Islands":{psAbbrev:"MH",psRegion:"ATR",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},"Puerto Rico":{psAbbrev:"RQ",psRegion:"ATR",psGoogleForm:"",psDefaultLock:"2",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:"787,939"},"United States":{psAbbrev:"US",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:0,psAreaCode:""},"Virgin Islands (U.S.)":{psAbbrev:"VQ",psRegion:"ATR",psGoogleForm:"",psDefaultLock:"2",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:"340"}};
                    regions = {ATR:{psName:"Territories",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},GLR:{psName:"Great Lakes",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},MAR:{psName:"Mid-Atlantic",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},NER:{psName:"New England",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},NOR:{psName:"Northeast",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},NWR:{psName:"Northwest",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},PLN:{psName:"Plains",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},SAT:{psName:"South Atlantic",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},SCR:{psName:"South Central",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},SER:{psName:"Southeast",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},SWR:{psName:"Southwest",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},HI:{psName:"Hawaii",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},TX:{psName:"Texas",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"",psAreaCode:""},CAN:{psName:"Canada",psRegion:"CAN",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"1",psAreaCode:""},USA:{psName:"United States",psRegion:"USA",psGoogleForm:"",psDefaultLock:"",psRequirePhone:"",psRequireUrl:"",psPhoneFormat:"0",psAreaCode:""}};

                    REGION_DATA = { "states"    : states,
                                    "countries" : countries,
                                    "regions"   : regions };
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
            assignDelayedConstants();
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

    /////////////////////////
    // Whitelist Functions //
    /////////////////////////

    // NOTE: Haven't refactored this yet.
    //  Whitelist an item
    function whitelistAction(itemID, wlKeyName) {
        var item = W.selectionManager.selectedItems[0].model;
        var addressTemp = item.getAddress();
        if ( addressTemp.hasOwnProperty('attributes') ) {
            addressTemp = addressTemp.attributes;
        }
        var itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(item.attributes.geometry.getCentroid().x,item.attributes.geometry.getCentroid().y);
        if (!venueWhitelist.hasOwnProperty(itemID)) {  // If venue is NOT on WL, then add it.
            venueWhitelist[itemID] = currentWL;
        }
        currentWL[wlKeyName] = true;  // WL the flag for the venue
        currentWL.city = addressTemp.city.attributes.name;  // Store city for the venue
        currentWL.state = addressTemp.state.name;  // Store state for the venue
        currentWL.country = addressTemp.country.name;  // Store country for the venue
        currentWL.gps = itemGPS;  // Store GPS coords for the venue
        saveWL_LS(true);  // Save the WL to local storage
        WMEPH_WLCounter();
        bannButt2.clearWL.active = true;
    }

    // NOTE: Haven't refactored this yet.
    // Keep track of how many whitelists have been added since the last pull, alert if over a threshold (100?)
    function WMEPH_WLCounter() {
        //debug('- WMEPH_WLCounter() called -');
        localStorage.WMEPH_WLAddCount = parseInt(localStorage.WMEPH_WLAddCount)+1;
        if (localStorage.WMEPH_WLAddCount > 50) {
            alert('Don\'t forget to periodically back up your Whitelist data using the Pull option in the WMEPH settings tab.');
            localStorage.WMEPH_WLAddCount = 2;
        }
    }

    // NOTE: Haven't refactored this yet.
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


    /////////////////////
    // Layer Functions //
    /////////////////////

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
            DUPLICATE_LAYER = nameLayer;
        } else {
            DUPLICATE_LAYER = rlayers[0];
        }
    }

    // Destroy Dupe Labels
    function destroyDupeLabels(){
        DUPLICATE_LAYER.destroyFeatures();
        DUPLICATE_LAYER.setVisibility(false);
    }


    ////////////////////////////
    // Generic Task Functions //
    ////////////////////////////

    // Determines if checkbox state is set according to 'checked' argument.  If not, triggers a click event.
    function setCheckedStateByClick(id, checked, ignoreErrors) {
        id = getJQueryId(id, ignoreErrors);
        if ( isChecked(id, ignoreErrors) !== checked ) $(id).trigger('click');
    }

    // Returns true if the checkbox with the given id is currently checked.
    function isChecked(id, ignoreErrors) {
        id = getJQueryId(id);
        var $checkBox = getJQueryObject(id, ignoreErrors);
        var checked = $checkBox.prop('checked');
        if (!ignoreErrors && typeof checked === 'undefined') throw 'Element with ID = "' + id + '" does not have a "checked" property.';
        return checked;
    }

/*
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
        for (pfix=0; pfix<placeNavTabs.length; pfix++) {
            pfa = placeNavTabs[pfix].innerHTML;
            if (pfa.indexOf('landmark-edit') > -1) {
                panelFieldsList = placeNavTabs[pfix].children;
                panelFields.navTabsIX = pfix;
                break;
            }
        }
        for (pfix=0; pfix<panelFieldsList.length; pfix++) {
            pfa = panelFieldsList[pfix].innerHTML;
            if (pfa.indexOf('landmark-edit-general') > -1) {
                panelFields.navTabGeneral = pfix;
            }
            if (pfa.indexOf('landmark-edit-more') > -1) {
                panelFields.navTabMore = pfix;
            }
        }
    }
*/


    //////////////////////////////
    // Highlight Task Functions //
    //////////////////////////////



    //////////////////////////////
    // Harmonize Task Functions //
    //////////////////////////////



    ////////////////////////
    // Unsorted Functions //
    ////////////////////////

    //function makeCatCheckList(CH_DATA) {
    // Moved inside AJAX call

    // NOTE: Haven't refactored this yet.// This will be moved inside AJAX call when I get to PNH data.
    // This function runs at script load, and builds the search name dataset to compare the WME selected place name to.
    // NOTE: Some of this code runs once for every single entry on the spreadsheet.  We need to make this more efficient.
    function makeNameCheckList(PNH_DATA) {
        debug('- makeNameCheckList(PNH_DATA) called -');  // Builds the list of search names to match to the WME place name
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
        phlog("Built search list of " + PNH_DATA.length + " PNH places in " + (t1 - t0).toFixed(3) + " milliseconds.");
        return PNH_NAMES;
    }  // END makeNameCheckList


    ////////////////////////////
    // Script Setup Functions //
    ////////////////////////////

    // Builds stuff for alerts, New Features and Change Log.
    function assembleChangeLog() {
        // Build the text for the "What's New" alert.
        /* Put this back once we refactor this stuff.  I had to copy this part to the top of runPH().
        var wnlText = "WME Place Harmonizer (v" + WMEPH_VERSION_LONG + ")\n\nUpdates:\n";
        wnlText += JSON.stringify(WHATS_NEW_LIST, null, 2).replace(/[\[\{]/g,"").replace(/[ ]+[\]\}],?\n/g,"").replace(/\}$/,"\n").replace(/"([^\n]+)":/g,"$1").replace(/"([^\n]+)",?/g,"- $1").replace(/\\"/g,'"');
        WHATS_NEW_LIST_TEXT = wnlText;
        */

        // Build the stuff for the New Features
        var $newFeatures = $("#WMEPH_New_Features");
        var txt1 = "Major features for v" + WMEPH_VERSION_MAJOR + ":";
        $newFeatures.append(document.createTextNode(txt1));
        $newFeatures.append($("<ul><li>" + NEW_FEATURES_LIST.join("</li><li>") + "</li></ul>"));

        // Build the stuff for the Change Log.
        var $changeLog = $("#WMEPH_Change_Log");
        var txt2 = "Change Log:";
        $changeLog.append(document.createTextNode(txt2));
        $("#WMEPH_Change_Log").append(buildDOMList(CHANGE_LOG));
        // Making the list expandable/collapsable
        $("#WMEPH_Change_Log > ul li + ul").prev("li").removeClass();
        $("#WMEPH_Change_Log > ul li + ul").prev("li").addClass("collapsed");
        $("#WMEPH_Change_Log > ul li + ul").prev("li").click(function(){
            $(this).next("ul").slideToggle(200);
            $(this).toggleClass("collapsed expanded");
        });
        $("#WMEPH_Change_Log > ul li + ul").hide();
        $("#WMEPH_Change_Log #WMEPH_"+WMEPH_VERSION_MAJOR.replace(/\./g,"\\.")).click();
        $("#WMEPH_Change_Log #WMEPH_"+WMEPH_VERSION_LONG.replace(/\./g,"\\.").replace(/-.*$/,"")).click();
    }

    //////////////////////////////
    //////////////////////////////
    //// Begin old WMEPH code ////
    //////////////////////////////
    //////////////////////////////
    var USA_PNH_DATA, USA_PNH_NAMES = [];  // Storage for PNH and Category data
    var CAN_PNH_DATA, CAN_PNH_NAMES = [];  // var CAN_CH_DATA, CAN_CH_NAMES = [] not used for now
    var devVersStr='', devVersStrSpace='', devVersStrDash='';  // strings to differentiate DOM elements between regular and beta script
    var devVersStringMaster = "Beta";
    if (IS_DEV_VERSION) {
        devVersStr = devVersStringMaster; devVersStrSpace = " " + devVersStr; devVersStrDash = "-" + devVersStr;
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
    var bannButt2, bannDupl;  // Banner Buttons objects
    var RPPLockString = 'Lock?';


    /* ****** Pull PNH and Userlist data ****** */
    loadExternalData();


    // This function will need to be split up because it is way too big.
    function runPH() {
        debug('- runPH() called -');
        // TEST HOOKS HERE //
        constructBanner();
        // END TEST HOOKS //
        if ( localStorage.getItem('WMEPH-featuresExamined'+devVersStr) === null ) {
            localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '0');  // Storage for whether the User has pressed the button to look at updates
        }
        var _disableHighlightTest = false;  // Set to true to temporarily disable highlight checks immediately when venues change.

        modifyGoogleLinks();

        var wnlText = "WME Place Harmonizer (v" + WMEPH_VERSION_LONG + ")\n\nUpdates:\n";
        wnlText += JSON.stringify(CHANGE_LOG, null, 2).replace(/[\[\{]/g,"").replace(/[ ]+[\]\}],?\n/g,"").replace(/\}$/,"\n").replace(/"([^\n]+)":/g,"$1").replace(/"([^\n]+)",?/g,"- $1").replace(/\\"/g,'"');
        CHANGE_LOG_TEXT = wnlText;

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

        // If the editor installs for the 1st time, alert with the new elements
        if ( localStorage.getItem('WMEPH_VERSION_MAJOR'+devVersStr) === null ) {
            alert(NEW_FEATURES_TEXT);
            localStorage.setItem('WMEPH_VERSION_MAJOR'+devVersStr, WMEPH_VERSION_MAJOR);
            localStorage.setItem('WMEPH_VERSION_LONG'+devVersStr, WMEPH_VERSION_LONG);
            localStorage.setItem(GLinkWarning, '0');  // Reset warnings
            localStorage.setItem(SFURLWarning, '0');
            localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');  // disable the button
        } else if (localStorage.getItem('WMEPH_VERSION_MAJOR'+devVersStr) !== WMEPH_VERSION_MAJOR) { // If the editor installs a newer MAJOR version, alert with the new elements
            alert(NEW_FEATURES_TEXT);
            localStorage.setItem('WMEPH_VERSION_MAJOR'+devVersStr, WMEPH_VERSION_MAJOR);
            localStorage.setItem('WMEPH_VERSION_LONG'+devVersStr, WMEPH_VERSION_LONG);
            localStorage.setItem(GLinkWarning, '0');  // Reset warnings
            localStorage.setItem(SFURLWarning, '0');
            localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');  // disable the button
        } else if (localStorage.getItem('WMEPH_VERSION_LONG'+devVersStr) !== WMEPH_VERSION_LONG) {  // If MINOR version....
            if (NEW_MAJOR_FEATURE) {  //  with major feature update, then alert
                alert(CHANGE_LOG_TEXT);
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
        W.selectionManager.events.registerPriority("selectionchanged", null, checkSelection);
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

        //function syncWL(newVenues) {


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
        var item, /*itemID, newName, optionalAlias,*/ newURL, tempPNHURL = '', newPhone;
        var newAliasesTemp = [];
        //var newAliases = [], newAliasesTemp = [], newCategories = [];
        var numAttempts = 0;
        var ixBank, ixATM, ixOffices;

        // Set up Run WMEPH button once place is selected
        bootstrapRunButton();

        /**
         * Generates highlighting rules and applies them to the map.
         */
        //var layer = W.map.landmarkLayer;
        //function initializeHighlights() {
        function initializeHighlights() {
            debug('-- initializeHighlights() called --');
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

            Array.prototype.push.apply(LANDMARK_LAYER.styleMap.styles['default'].rules, [severity0, severityLock, severity1, severityLock1, severity2, severity3, severity4, severityHigh, severityAdLock]);
            // to make Google Script linter happy ^^^ Array.prototype.push.apply(layer.styleMap.styles.default.rules, [severity0, severityLock, severity1, severity2, severity3, severity4, severityHigh]);
            /* Can apply to normal view or selection/highlight views as well.
            _.each(layer.styleMap.styles, function(style) {
                style.rules = style.rules.concat([severity0, severityLock, severity1, severity2, severity3, severity4, severityHigh]);
            });
            */
        }

        // NOTE: Haven't refactored this yet.
        /**
         * To highlight a place, set the wmephSeverity attribute to the desired highlight level.
         * @param venues {array of venues, or single venue} Venues to check for highlights.
         */
        function applyHighlightsTest(venues) {
            debug('-- applyHighlightsTest(venues) called --');
            venues = venues ? _.isArray(venues) ? venues : [venues] : [];
            //var storedBannButt = bannButt, storedBannServ = bannServ, storedBannButt2 = bannButt2;
            var t0 = performance.now();  // Speed check start

            _.each(venues, function (venue) {
                if (venue.CLASS_NAME === 'Waze.Feature.Vector.Landmark' &&
                    venue.attributes) {
                    // Highlighting logic would go here
                    // Severity can be: 0, 'lock', 1, 2, 3, 4, or 'high'. Set to
                    // anything else to use default WME style.
                    if ( isChecked("WMEPH-ColorHighlighting") && !(isChecked("WMEPH-DisableRankHL") && venue.attributes.lockRank > (USER_RANK - 1))) {
                        try {
                            venue.attributes.wmephSeverity = harmonizePlaceGo(venue,"highlight");
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
                    venue.attributes.wmephSeverity = harmonizePlaceGo(venue,"highlight");
                    //bannButt = storedBannButt;
                    //bannServ = storedBannServ;
                    //bannButt2 = storedBannButt2;
                }
            }
            LANDMARK_LAYER.redraw();
            var t1 = performance.now();  // log search time
            phlogdev("Ran highlighter in " + (t1 - t0).toFixed(3) + " milliseconds.");

        }

        // Setup highlight colors
        initializeHighlights();

        // Set up CH loop
        function bootstrapWMEPH_CH() {
            debug('-- bootstrapWMEPH_CH() called --');
            if ( isChecked("WMEPH-ColorHighlighting") ) {
                // Turn off place highlighting in WMECH if it's on.
                setCheckedStateByClick('_cbHighlightPlaces', false, true);

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

        function toTitleCase(str, ignoreParensAtEnd) {
            if (!str) {
                return str;
            }
            str = str.trim();
            var parensPart = '';
            if (ignoreParensAtEnd) {
                var m = str.match(/.*(\(.*\))$/);
                if (m) {
                    parensPart = m[1];
                    str = str.slice(0,str.length - parensPart.length);
                }
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

            return str + parensPart;
        }
        // Change place.name to title case
        function toTitleCaseStrong(str, ignoreParensAtEnd) {
            if (!str) {
                return str;
            }
            str = str.trim();
            var parensPart = '';
            if (ignoreParensAtEnd) {
                var m = str.match(/.*(\(.*\))$/);
                if (m) {
                    parensPart = m[1];
                    str = str.slice(0,str.length - parensPart.length);
                }
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
            return str + parensPart;
        }

        //var MultiAction = require("Waze/Action/MultiAction");
        // Add array of actions to a MultiAction to be executed at once (counts as one edit for redo/undo purposes)
        //function executeMultiAction(actions) {


        // Only run the harmonization if a venue is selected
        function harmonizePlace() {
            debug('-- harmonizePlace() called --');
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
                    DUPLICATE_LAYER.destroyFeatures();
                }
            } else {  // Remove duplicate labels
                DUPLICATE_LAYER.destroyFeatures();
            }
        }

        // Main script
        function harmonizePlaceGo(item, useFlag) {
            debug('-- harmonizePlaceGo(item, "'+useFlag+'") called --');
            var harmony;
            var i, len;
            //debug('About to check if item.attributes.harmony is defined.');
            if (typeof(item.attributes.harmony) !== "undefined") {
                //debug('About to check item.attributes.harmony.CLASS_NAME');
                if (item.attributes.harmony.CLASS_NAME === "WMEPH.Harmony") {
                    harmony = item.attributes.harmony;
                } else {
                    throw "There's an imposter!";
                }
            } else {
                //debug("harmony wasn't found.  Creating new window.Harmony object.");
                harmony = new Harmony(item);
            }

            //debug("item.attributes.harmony.CLASS_NAME = " + item.attributes.harmony.CLASS_NAME);


            //actions = actions || []; // Used for collecting all actions to be applied to the model.
            //var itemID = item.attributes.id;
            var hpMode = {
                harmFlag: false,
                hlFlag: false,
            };

            if ( useFlag.indexOf('harmonize') > -1 ) {
                hpMode.harmFlag = true;
                phlog('Running script on selected place...');
            }
            if ( useFlag.indexOf('highlight') > -1 ) {
                hpMode.hlFlag = true;
            }

            // If it's an unlocked parking lot, return with severity 4.
            if (hpMode.hlFlag && isPLA(item) && item.attributes.lockRank === 2) {
                return 4;
            }

            /*var placePL = removeLinkLayers(getItemLink());*/

            //var newPlaceURL
            var approveRegionURL;//, servID, useState = true;
            var PNHOrderNum = '', PNHNameTemp = '', PNHNameTempWeb = '';
            severityButt = 0;
            var customStoreFinder = false;  // switch indicating place-specific custom store finder url
            var customStoreFinderLocal = false;  // switch indicating place-specific custom store finder url with localization option (GPS/addr)
            var customStoreFinderURL = "";  // switch indicating place-specific custom store finder url
            var customStoreFinderLocalURL = "";  // switch indicating place-specific custom store finder url with localization option (GPS/addr)

            // Whitelist: reset flags
            currentWL = venueWhitelist[harmony.id];
            if (!currentWL) {
                currentWL = {};
            }

            //bannButt = {   --- Now, a part of the Harmony class!

            var bannButt2 = {
                placesWiki: {
                    active: true, value: "Places Wiki", title: "Open the places wiki page",
                    action: function() {
                        window.open(PLACES_WIKI_URL);
                    }
                },
                restAreaWiki: {
                    active: false, value: "Rest Area Wiki", title: "Open the Rest Area wiki page",
                    action: function() {
                        window.open(RESTAREA_WIKI_URL);
                    }
                },
                clearWL: {
                    active: false, value: "Clear Whitelist for Place", title: "Clear all Whitelisted fields for this place",
                    action: function() {
                        if (confirm('Are you sure you want to clear all whitelisted fields for this place?') ) {  // misclick check
                            delete venueWhitelist[W.selectionManager.selectedItems[0].model.id];
                            saveWL_LS(true);
                            harmonizePlaceGo(W.selectionManager.selectedItems[0].model,'harmonize');  // rerun the script to check all flags again
                        }
                    }
                },
                PlaceErrorForumPost: {
                    active: true, value: "Report Script Error", title: "Report a script error",
                    action: function() {
                        var forumMsgInputs = {
                            subject: 'WMEPH Bug report: Scrpt Error',
                            message: 'Script version: ' + WMEPH_VERSION_LONG + devVersStr +
                            '\nPermalink: ' + W.selectionManager.selectedItems[0].model.attributes.harmony.permalink +
                            '\nPlace name: ' + W.selectionManager.selectedItems[0].model.attributes.name +
                            '\nCountry: ' + W.selectionManager.selectedItems[0].model.getAddress().country.name +
                            '\n--------\nDescribe the error:  \n '
                        };
                        WMEPH_errorReport(forumMsgInputs);
                    }
                },
                whatsNew: {
                    active: false, value: "Recent Script Updates", title: "Open a list of recent script updates",
                    action: function() {
                        alert(CHANGE_LOG_TEXT);
                        localStorage.setItem('WMEPH-featuresExamined'+devVersStr, '1');
                        //bannButt2.whatsNew.active = false;
                    }
                }
            };

            var wlKeys = [];
            Object.keys(harmony.flags).forEach(function(bannerKey) {
                var banner = harmony.flags[bannerKey];
                if (banner.WLkey) wlKeys.push(banner.WLkey);
            });


            if (hpMode.harmFlag) {
                // Update icons to reflect current WME place services
                harmony.updateServicesChecks();

                // Turn on New Features Button if not looked at yet
                if (localStorage.getItem('WMEPH-featuresExamined'+devVersStr) === '0') {
                    bannButt2.whatsNew.active = true;
                }
                //Setting switch for the Places Wiki button
                if ( isChecked("WMEPH-HidePlacesWiki") ) {
                    bannButt2.placesWiki.active = false;
                }
                // provide Google search link to places
                if (IS_DEV_USER || IS_BETA_USER || USER_RANK > 1) {  // enable the link for all places, for R2+ and betas
                    harmony.flags.webSearch.active = true;
                }
                // reset PNH lock level
                PNHLockLevel = -1;
            }


            // get GPS lat/long coords from place, call as itemGPS.lat, itemGPS.lon
            var itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(item.attributes.geometry.getCentroid().x,item.attributes.geometry.getCentroid().y);
            var lockOK = true;  // if nothing goes wrong, then place will be locked
            var categories = item.attributes.categories;
            harmony.newCategories = categories.slice(0);
            harmony.newName = item.attributes.name;
            harmony.newName = toTitleCase(harmony.newName, isPLA(item));
            // var nameShort = newName.replace(/[^A-Za-z]/g, '');  // strip non-letters for PNH name searching
            // var nameNumShort = newName.replace(/[^A-Za-z0-9]/g, ''); // strip non-letters/non-numbers for PNH name searching
            harmony.newAliases = item.attributes.aliases.slice(0);
            for (var naix=0; naix<harmony.newAliases.length; naix++) {
                harmony.newAliases[naix] = toTitleCase(harmony.newAliases[naix], isPLA(item));
            }
            //var brand = item.attributes.brand;
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
                        if ( isChecked("WMEPH-EnableIAZoom") ) {
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
                            if ( isChecked("WMEPH-AddAddresses") ) {  // update the item's address if option is enabled
                                updateAddress(item, addr, harmony.actions);
                                harmony.updatedFields.address = true;
                                if (item.attributes.houseNumber && item.attributes.houseNumber.replace(/[^0-9A-Za-z]/g,'').length > 0 ) {
                                    harmony.flags.fullAddressInference.active = true;
                                    lockOK = false;
                                }
                            } else {
                                harmony.flags.cityMissing.active = true;
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
            var WLMatch = false;
            if ( hpMode.harmFlag || ( hpMode.hlFlag && !isChecked("WMEPH-DisableWLHL") ) ) {
                WLMatch = true;
                // Enable the clear WL button if any property is true
                Object.keys(currentWL).forEach(function(WLKey) {  // loop thru the venue WL keys
                    if ( wlKeys.indexOf(WLKey) > -1) {
                        bannButt2.clearWL.active = true;
                        //currentWL[WLKey] = venueWhitelist[itemID][WLKey];  // update the currentWL settings
                    }
                });
                if (currentWL.dupeWL && currentWL.dupeWL.length > 0) {
                    bannButt2.clearWL.active = true;
                }
                // Update address and GPS info for the place
                currentWL.city = addr.city.attributes.name;  // Store city for the venue
                currentWL.state = addr.state.name;  // Store state for the venue
                currentWL.country = addr.country.name;  // Store country for the venue
                currentWL.gps = itemGPS;  // Store GPS coords for the venue
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
            myState = "Unknown"; myCountry = "Unknown";
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
            if (hpMode.harmFlag && item.attributes.categories[0] === 'GAS_STATION' && (!harmony.newName || harmony.newName.trim().length === 0) && item.attributes.brand) {
                harmony.newName = item.attributes.brand;
                harmony.queueUpdateAction({name: harmony.newName });
                harmony.updatedFields.name = true;
            }

            // Clear attributes from residential places
            if (item.attributes.residential) {
                if (hpMode.harmFlag) {
                    if ( !isChecked("WMEPH-AutoLockRPPs") ) {
                        lockOK = false;
                    }
                    if (item.attributes.name !== '') {  // Set the residential place name to the address (to clear any personal info)
                        phlogdev("Residential Name reset");
                        harmony.queueUpdateAction({name: ''});
                        // no field HL
                    }
                    harmony.newCategories = ["RESIDENCE_HOME"];
                    // newDescripion = null;
                    if (item.attributes.description !== null && item.attributes.description !== "") {  // remove any description
                        phlogdev("Residential description cleared");
                        harmony.queueUpdateAction({description: null});
                        // no field HL
                    }
                    // newPhone = null;
                    if (item.attributes.phone !== null && item.attributes.phone !== "") {  // remove any phone info
                        phlogdev("Residential Phone cleared");
                        harmony.queueUpdateAction({phone: null});
                        // no field HL
                    }
                    // newURL = null;
                    if (item.attributes.url !== null && item.attributes.url !== "") {  // remove any url
                        phlogdev("Residential URL cleared");
                        harmony.queueUpdateAction({url: null});
                        // no field HL
                    }
                    if (item.attributes.services.length > 0) {
                        phlogdev("Residential services cleared");
                        harmony.queueUpdateAction({services: [] });
                        // no field HL
                    }
                }
                if (item.is2D()) {
                    harmony.flags.pointNotArea.active = true;
                }
            } else if (isPLA(item) || (harmony.newName && harmony.newName.trim().length > 0)) {  // for non-residential places
                if (USER_RANK >= 3 && !(isPLA(item) && isChecked('WMEPH-DisablePLAExtProviderCheck'))) {
                    var provIDs = item.attributes.externalProviderIDs;
                    if (!provIDs || provIDs.length === 0) {
                        if (isChecked('WMEPH-ExtProviderSeverity')) {
                            harmony.flags.extProviderMissing.severity = 1;
                        }
                        harmony.flags.extProviderMissing.active = !currentWL.extProviderMissing;
                        harmony.flags.extProviderMissing.WLactive = !currentWL.extProviderMissing;
                    }
                }

                // Place Harmonization
                var PNHMatchData;
                if (hpMode.harmFlag) {
                    if (item.attributes.categories[0] === 'PARKING_LOT') {
                        PNHMatchData = ['NoMatch'];
                    } else {
                        PNHMatchData = harmoList(harmony.newName,myState2L,myPlace.psRegion,myCountry2L,harmony.newCategories,item);  // check against the PNH list
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
                                message: 'Error report: PNH Order Nos. "' + orderList.join(', ') + '" are ambiguous multiple matches.\n \nExample Permalink: ' + harmony.permalink + ''
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
                                harmony.flags[scFlag].active = true;
                            } else if ( specCases[scix].match(/^buttOff_/g) !== null ) {
                                scFlag = specCases[scix].match(/^buttOff_(.+)/i)[1];
                                harmony.flags[scFlag].active = false;
                            } else if ( specCases[scix].match(/^messOn_/g) !== null ) {
                                scFlag = specCases[scix].match(/^messOn_(.+)/i)[1];
                                harmony.flags[scFlag].active = true;
                            } else if ( specCases[scix].match(/^messOff_/g) !== null ) {
                                scFlag = specCases[scix].match(/^messOff_(.+)/i)[1];
                                harmony.flags[scFlag].active = false;
                            } else if ( specCases[scix].match(/^psOn_/g) !== null ) {
                                scFlag = specCases[scix].match(/^psOn_(.+)/i)[1];
                                harmony.services[scFlag].pnhOverride = true;
                                harmony.services[scFlag].action(true);
                            } else if ( specCases[scix].match(/^psOff_/g) !== null ) {
                                scFlag = specCases[scix].match(/^psOff_(.+)/i)[1];
                                harmony.services[scFlag].pnhOverride = true;
                                harmony.services[scFlag].action(false);
                            }
                            // parseout localURL data if exists (meaning place can have a URL distinct from the chain URL
                            if ( specCases[scix].match(/^localURL_/g) !== null ) {
                                localURLcheck = specCases[scix].match(/^localURL_(.+)/i)[1];
                            }
                            // parse out optional alt-name
                            if ( specCases[scix].match(/^optionAltName<>(.+)/g) !== null ) {
                                harmony.optAlias = specCases[scix].match(/^optionAltName<>(.+)/i)[1];
                                if (harmony.newAliases.indexOf(harmony.optAlias) === -1) {
                                    harmony.flags.addAlias.active = true;
                                }
                            }
                            // Gas Station forceBranding
                            if ( ["GAS_STATION"].indexOf(priPNHPlaceCat) > -1 && specCases[scix].match(/^forceBrand<>(.+)/i) !== null ) {
                                var forceBrand = specCases[scix].match(/^forceBrand<>(.+)/i)[1];
                                if (item.attributes.brand !== forceBrand) {
                                    harmony.queueUpdateAction({ brand: forceBrand });
                                    harmony.updatedFields.brand = true;
                                    phlogdev('Gas brand updated from PNH');
                                }
                            }
                            // Check Localization
                            if ( specCases[scix].match(/^checkLocalization<>(.+)/i) !== null ) {
                                updatePNHName = false;
                                var baseName = specCases[scix].match(/^checkLocalization<>(.+)/i)[1];
                                var baseNameRE = new RegExp(baseName, 'g');
                                if ( harmony.newName.match(baseNameRE) === null ) {
                                    harmony.flags.localizedName.active = true;
                                    if (currentWL.localizedName) {
                                        harmony.flags.localizedName.WLactive = false;
                                    }
                                    harmony.flags.PlaceWebsite.value = 'Place Website';
                                    if (ph_displaynote_ix > -1 && PNHMatchData[ph_displaynote_ix] !== '0' && PNHMatchData[ph_displaynote_ix] !== '') {
                                        harmony.flags.localizedName.message = PNHMatchData[ph_displaynote_ix];
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
                    if ( PNHMatchData[ph_speccase_ix] === 'subFuel' && harmony.newName.toUpperCase().indexOf('GAS') === -1 && harmony.newName.toUpperCase().indexOf('FUEL') === -1 ) {
                        harmony.flags.subFuel.active = true;
                        if (currentWL.subFuel) {
                            harmony.flags.subFuel.WLactive = false;
                        }
                    }

                    // Display any notes for the specific place
                    if (showDispNote && ph_displaynote_ix > -1 && PNHMatchData[ph_displaynote_ix] !== '0' && PNHMatchData[ph_displaynote_ix] !== '' ) {
                        if ( containsAny(specCases,['pharmhours']) ) {
                            if ( item.attributes.description.toUpperCase().indexOf('PHARMACY') === -1 || ( item.attributes.description.toUpperCase().indexOf('HOURS') === -1 && item.attributes.description.toUpperCase().indexOf('HRS') === -1 ) ) {
                                harmony.flags.specCaseMessage.active = true;
                                harmony.flags.specCaseMessage.message = PNHMatchData[ph_displaynote_ix];
                            }
                        } else if ( containsAny(specCases,['drivethruhours']) ) {
                            if ( item.attributes.description.toUpperCase().indexOf('DRIVE') === -1 || ( item.attributes.description.toUpperCase().indexOf('HOURS') === -1 && item.attributes.description.toUpperCase().indexOf('HRS') === -1 ) ) {
                                if ( isChecked("service-checkbox-DRIVETHROUGH") ) {
                                    harmony.flags.specCaseMessage.active = true;
                                    harmony.flags.specCaseMessage.message = PNHMatchData[ph_displaynote_ix];
                                } else {
                                    harmony.flags.specCaseMessageLow.active = true;
                                    harmony.flags.specCaseMessageLow.message = PNHMatchData[ph_displaynote_ix];
                                }
                            }
                        } else {
                            harmony.flags.specCaseMessageLow.active = true;
                            harmony.flags.specCaseMessageLow.message = PNHMatchData[ph_displaynote_ix];
                        }
                    }

                    // Localized Storefinder code:
                    if (ph_sfurl_ix > -1) {  // if the sfurl column exists...
                        if ( ph_sfurllocal_ix > -1 && PNHMatchData[ph_sfurllocal_ix] !== "" && PNHMatchData[ph_sfurllocal_ix] !== "0" ) {
                            if ( !harmony.flags.localizedName.active ) {
                                harmony.flags.PlaceWebsite.value = "Store Locator (L)";
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
                            if ( !harmony.flags.localizedName.active ) {
                                harmony.flags.PlaceWebsite.value = "Store Locator";
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
                        if (harmony.newName.toUpperCase() === PNHMatchData[ph_name_ix].toUpperCase()) {  // If no localization
                            harmony.flags.catHotel.message = 'Check hotel website for any name localization (e.g. '+ PNHMatchData[ph_name_ix] +' - Tampa Airport).';
                            harmony.flags.catHotel.active = true;
                            harmony.newName = PNHMatchData[ph_name_ix];
                        } else {
                            // Replace PNH part of name with PNH name
                            var splix = harmony.newName.toUpperCase().replace(/[-\/]/g,' ').indexOf(PNHMatchData[ph_name_ix].toUpperCase().replace(/[-\/]/g,' ') );
                            if (splix>-1) {
                                var frontText = harmony.newName.slice(0,splix);
                                var backText = harmony.newName.slice(splix+PNHMatchData[ph_name_ix].length);
                                harmony.newName = PNHMatchData[ph_name_ix];
                                if (frontText.length > 0) { harmony.newName = frontText + ' ' + harmony.newName; }
                                if (backText.length > 0) { harmony.newName = harmony.newName + ' ' + backText; }
                                harmony.newName = harmony.newName.replace(/ {2,}/g,' ');
                            } else {
                                harmony.newName = PNHMatchData[ph_name_ix];
                            }
                        }
                        if ( altCategories !== "0" && altCategories !== "" ) {  // if PNH alts exist
                            insertAtIX(harmony.newCategories, altCategories, 1);  //  then insert the alts into the existing category array after the GS category
                        }
                        if ( harmony.newCategories.indexOf('HOTEL') !== 0 ) {  // If no GS category in the primary, flag it
                            harmony.flags.hotelMkPrim.active = true;
                            if (currentWL.hotelMkPrim) {
                                harmony.flags.hotelMkPrim.WLactive = false;
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
                        if ( harmony.newName.match(/\batm\b/ig) !== null ) {
                            if ( ixOffices === 0 ) {
                                harmony.flags.bankType1.active = true;
                                harmony.flags.bankBranch.active = true;
                                harmony.flags.standaloneATM.active = true;
                                harmony.flags.bankCorporate.active = true;
                            } else if ( ixBank === -1 && ixATM === -1 ) {
                                harmony.flags.bankBranch.active = true;
                                harmony.flags.standaloneATM.active = true;
                            } else if ( ixATM === 0 && ixBank > 0 ) {
                                harmony.flags.bankBranch.active = true;
                            } else if ( ixBank > -1 ) {
                                harmony.flags.bankBranch.active = true;
                                harmony.flags.standaloneATM.active = true;
                            }
                            harmony.newName = PNHMatchData[ph_name_ix] + ' ATM';
                            harmony.newCategories = insertAtIX(harmony.newCategories, 'ATM', 0);
                            // Net result: If the place has ATM cat only and ATM in the name, then it will be green and renamed Bank Name ATM
                        } else if (ixBank > -1  || ixATM > -1) {  // if no ATM in name but with a banking category:
                            if ( ixOffices === 0 ) {
                                harmony.flags.bankBranch.active = true;
                            } else if ( ixBank > -1  && ixATM === -1 ) {
                                harmony.flags.addATM.active = true;
                            } else if ( ixATM === 0 && ixBank === -1 ) {
                                harmony.flags.bankBranch.active = true;
                                harmony.flags.standaloneATM.active = true;
                            } else if ( ixBank > 0 && ixATM > 0 ) {
                                harmony.flags.bankBranch.active = true;
                                harmony.flags.standaloneATM.active = true;
                            }
                            harmony.newName = PNHMatchData[ph_name_ix];
                            // Net result: If the place has Bank category first, then it will be green with PNH name replaced
                        } else {  // for PNH match with neither bank type category, make it a bank
                            harmony.newCategories = insertAtIX(harmony.newCategories, 'BANK_FINANCIAL', 1);
                            harmony.flags.standaloneATM.active = true;
                            harmony.flags.bankCorporate.active = true;
                        }// END PNH bank treatment
                    } else if ( ["GAS_STATION"].indexOf(priPNHPlaceCat) > -1 ) {  // for PNH gas stations, don't replace existing sub-categories
                        if ( altCategories !== "0" && altCategories !== "" ) {  // if PNH alts exist
                            insertAtIX(harmony.newCategories, altCategories, 1);  //  then insert the alts into the existing category array after the GS category
                        }
                        if ( harmony.newCategories.indexOf('GAS_STATION') !== 0 ) {  // If no GS category in the primary, flag it
                            harmony.flags.gasMkPrim.active = true;
                            lockOK = false;
                        } else {
                            harmony.newName = PNHMatchData[ph_name_ix];
                        }
                    } else if (updatePNHName) {  // if not a special category then update the name
                        harmony.newName = PNHMatchData[ph_name_ix];
                        harmony.newCategories = insertAtIX(harmony.newCategories, priPNHPlaceCat,0);
                        if (altCategories !== "0" && altCategories !== "") {
                            harmony.newCategories = insertAtIX(harmony.newCategories,altCategories,1);
                        }
                    }

                    // *** need to add a section above to allow other permissible categories to remain? (optional)

                    // Parse URL data
                    var localURLcheckRE;
                    if ( localURLcheck !== '') {
                        if (newURL !== null || newURL !== '') {
                            localURLcheckRE = new RegExp(localURLcheck, "i");
                            if ( newURL.match(localURLcheckRE) !== null ) {
                                newURL = harmony.normalizeUrl(newURL);
                            } else {
                                newURL = harmony.normalizeUrl(PNHMatchData[ph_url_ix]);
                                harmony.flags.localURL.active = true;
                            }
                        } else {
                            newURL = harmony.normalizeUrl(PNHMatchData[ph_url_ix]);
                            harmony.flags.localURL.active = true;
                        }
                    } else {
                        newURL = harmony.normalizeUrl(PNHMatchData[ph_url_ix]);
                    }
                    // Parse PNH Aliases
                    newAliasesTemp = PNHMatchData[ph_aliases_ix].match(/([^\(]*)/i)[0];
                    if (newAliasesTemp !== "0" && newAliasesTemp !== "") {  // make aliases array
                        newAliasesTemp = newAliasesTemp.replace(/,[^A-za-z0-9]*/g, ",");  // tighten up commas if more than one alias.
                        newAliasesTemp = newAliasesTemp.split(",");  // split by comma
                    }
                    if ( specCases.indexOf('noUpdateAlias') === -1 && (!containsAll(harmony.newAliases,newAliasesTemp) && newAliasesTemp !== "0" && newAliasesTemp !== "" && specCases.indexOf('optionName2') === -1 ))  {
                        harmony.newAliases = insertAtIX(harmony.newAliases,newAliasesTemp,0);
                    }
                    // Enable optional alt-name button
                    if (harmony.flags.addAlias.active) {
                        harmony.flags.addAlias.message = "Is there a " + harmony.optAlias + " at this location?";
                        harmony.flags.addAlias.title = 'Add ' + harmony.optAlias;
                    }
                    // update categories if different and no Cat2 option
                    //debug('3126 // About to call uniq() twice inside of harmonizePlaceGo()');
                    if ( !matchSets( uniq(item.attributes.categories),uniq(harmony.newCategories) ) ) {
                        if ( specCases.indexOf('optionCat2') === -1 && specCases.indexOf('buttOn_addCat2') === -1 ) {
                            phlogdev("Categories updated" + " with " + harmony.newCategories);
                            harmony.queueUpdateAction({ categories: harmony.newCategories });
                            //W.model.actionManager.add(new UpdateObject(item, { categories: harmony.newCategories }));
                            harmony.updatedFields.categories = true;
                        } else {  // if second cat is optional
                            phlogdev("Primary category updated with " + priPNHPlaceCat);
                            harmony.newCategories = insertAtIX(harmony.newCategories, priPNHPlaceCat, 0);
                            harmony.queueUpdateAction({ categories: harmony.newCategories });
                            harmony.updatedFields.categories = true;
                        }
                        // Enable optional 2nd category button
                        if (specCases.indexOf('buttOn_addCat2') > -1 && harmony.newCategories.indexOf(catTransWaze2Lang[altCategories[0]]) === -1 ) {
                            harmony.flags.addCat2.message = "Is there a " + catTransWaze2Lang[altCategories[0]] + " at this location?";
                            harmony.flags.addCat2.title = 'Add ' + catTransWaze2Lang[altCategories[0]];
                        }
                    }

                    // Description update
                    newDescripion = PNHMatchData[ph_description_ix];
                    if (newDescripion !== null && newDescripion !== "0" && item.attributes.description.toUpperCase().indexOf(newDescripion.toUpperCase()) === -1 ) {
                        if ( item.attributes.description !== "" && item.attributes.description !== null && item.attributes.description !== ' ' ) {
                            harmony.flags.checkDescription.active = true;
                        }
                        phlogdev("Description updated");
                        newDescripion = newDescripion + '\n' + item.attributes.description;
                        harmony.queueUpdateAction({ description: newDescripion });
                        harmony.updatedFields.description = true;
                    }

                    // Special Lock by PNH
                    if (specCases.indexOf('lockAt5') > -1 ) {
                        PNHLockLevel = 4;
                    }
                } else {  // if no PNH match found
                    if (PNHMatchData[0] === "ApprovalNeeded") {
                        //PNHNameTemp = PNHMatchData[1].join(', ');
                        PNHNameTemp = PNHMatchData[1][0];  // Just do the first match
                        PNHNameTempWeb = encodeURIComponent(PNHNameTemp);
                        PNHOrderNum = PNHMatchData[2].join(',');
                    }

                    // Strong title case option for non-PNH places
                    if (harmony.newName !== toTitleCaseStrong(harmony.newName, isPLA(item))) {
                        harmony.flags.STC.active = true;
                    }

                    newURL = harmony.normalizeUrl(newURL);  // Normalize url

                    // Generic Hotel Treatment
                    if ( harmony.newCategories.indexOf("HOTEL") > -1  && harmony.newName.indexOf(' - ') === -1 && harmony.newName.indexOf(': ') === -1) {
                        harmony.flags.catHotel.active = true;
                        if (currentWL.hotelLocWL) {
                            harmony.flags.catHotel.WLactive = false;
                        }
                    }

                    // Generic Bank treatment
                    ixBank = item.attributes.categories.indexOf("BANK_FINANCIAL");
                    ixATM = item.attributes.categories.indexOf("ATM");
                    ixOffices = item.attributes.categories.indexOf("OFFICES");
                    // if the name contains ATM in it
                    if ( harmony.newName.match(/\batm\b/ig) !== null ) {
                        if ( ixOffices === 0 ) {
                            harmony.flags.bankType1.active = true;
                            harmony.flags.bankBranch.active = true;
                            harmony.flags.standaloneATM.active = true;
                            harmony.flags.bankCorporate.active = true;
                        } else if ( ixBank === -1 && ixATM === -1 ) {
                            harmony.flags.bankBranch.active = true;
                            harmony.flags.standaloneATM.active = true;
                        } else if ( ixATM === 0 && ixBank > 0 ) {
                            harmony.flags.bankBranch.active = true;
                        } else if ( ixBank > -1 ) {
                            harmony.flags.bankBranch.active = true;
                            harmony.flags.standaloneATM.active = true;
                        }
                        // Net result: If the place has ATM cat only and ATM in the name, then it will be green
                    } else if (ixBank > -1  || ixATM > -1) {  // if no ATM in name:
                        if ( ixOffices === 0 ) {
                            harmony.flags.bankBranch.active = true;
                        } else if ( ixBank > -1  && ixATM === -1 ) {
                            harmony.flags.addATM.active = true;
                        } else if ( ixATM === 0 && ixBank === -1 ) {
                            harmony.flags.bankBranch.active = true;
                            harmony.flags.standaloneATM.active = true;
                        } else if ( ixBank > 0 && ixATM > 0 ) {
                            harmony.flags.bankBranch.active = true;
                            harmony.flags.standaloneATM.active = true;
                        }
                        // Net result: If the place has Bank category first, then it will be green
                    } // END generic bank treatment

                }  // END PNH match/no-match updates


                // Update name:
                if (hpMode.harmFlag && harmony.newName !== item.attributes.name) {
                    phlogdev("Name updated");
                    harmony.queueUpdateAction({ name: harmony.newName });
                    //actions.push(new UpdateObject(item, { name: newName }));
                    harmony.updatedFields.name = true;
                }

                // Update aliases
                harmony.newAliases = harmony.removeSFAliases(harmony.newName, harmony.newAliases);
                for (naix=0; naix<harmony.newAliases.length; naix++) {
                    harmony.newAliases[naix] = toTitleCase(harmony.newAliases[naix], isPLA(item));
                }
                if (hpMode.harmFlag && harmony.newAliases !== item.attributes.aliases && harmony.newAliases.length !== item.attributes.aliases.length) {
                    phlogdev("Alt Names updated");
                    harmony.queueUpdateAction({ aliases: harmony.newAliases });
                    harmony.updatedFields.aliases = true;
                }

                // Gas station treatment (applies to all including PNH)
                if (harmony.newCategories[0] === 'GAS_STATION') {
                    // Brand checking
                    if ( !item.attributes.brand || item.attributes.brand === null || item.attributes.brand === "" ) {
                        harmony.flags.gasNoBrand.active = true;
                        if (currentWL.gasNoBrand) {
                            harmony.flags.gasNoBrand.WLactive = false;
                        }
                    } else if (item.attributes.brand === 'Unbranded' ) {  //  Unbranded is not used per wiki
                        harmony.flags.gasUnbranded.active = true;
                        lockOK = false;
                    } else {
                        var brandNameRegEx = new RegExp('\\b'+item.attributes.brand.toUpperCase().replace(/[ '-]/g,''), "i");
                        if ( harmony.newName.toUpperCase().replace(/[ '-]/g,'').match(brandNameRegEx) === null ) {
                            harmony.flags.gasMismatch.active = true;
                            if (currentWL.gasMismatch) {
                                harmony.flags.gasMismatch.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                        }
                    }
                    // Add convenience store category to station
                    if (harmony.newCategories.indexOf("CONVENIENCE_STORE") === -1 && !harmony.flags.subFuel.active) {
                        if ( hpMode.harmFlag && isChecked("WMEPH-ConvenienceStoreToGasStations") ) {  // Automatic if user has the setting checked
                            harmony.newCategories = insertAtIX(harmony.newCategories, "CONVENIENCE_STORE", 1);  // insert the C.S. category
                            harmony.queueUpdateAction({ categories: harmony.newCategories });
                            harmony.updatedFields.categories = true;
                            phlogdev('Conv. store category added');
                        } else {  // If not checked, then it will be a banner button
                            harmony.flags.addConvStore.active = true;
                        }
                    }
                }  // END Gas Station Checks

                // Make PNH submission links
                var regionFormURL = '';
                var newPlaceAddon = '';
                var approvalAddon = '';
                var approvalMessage = 'Submitted via WMEPH. PNH order number ' + PNHOrderNum;
                var tempSubmitName = encodeURIComponent(harmony.newName);
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
                    harmony.newPlaceURL = regionFormURL + newPlaceAddon;
                    approveRegionURL = regionFormURL + approvalAddon;
                }

                // NOTE: Some of this code can run once instead of happening every time harmonizePlaceGo() gets called.
                // Category/Name-based Services, added to any existing services:


                // NOTE: We are inside harmonizePlaceGo()
                // NOTE: This code checks the servKeys and such to enable services.
                // Rewrite
                var catName;
                for (i = 0, len = harmony.newCategories.length; i < len; i++) {
                    catName = harmony.newCategories[i];
                    if (NA_CAT_DATA.hasOwnProperty(catName)) {
                        for (var service in WME_SERVICE_MAP) {
                            var act = WME_SERVICE_MAP[service].action;
                            if (!harmony.services[act].pnhOverride) {
                                var flag = NA_CAT_DATA[catName].services[service];
                                if (flag === 1) {
                                    harmony.services[act].active = true;
                                    if (hpMode.harmFlag && isChecked("WMEPH-EnableServices")) {
                                        // Automatically enable new services
                                        harmony.services[act].action(true);
                                    }
                                } else if (flag === 2) {  // these are never automatically added but shown
                                    harmony.services[act].active = true;
                                } else if (typeof(flag) === "object") {  // Check for state/region auto add
                                    harmony.services[act].active = true;
                                    if ( hpMode.harmFlag && isChecked("WMEPH-EnableServices")) {
                                        // If the sheet data matches the state or region, then auto add
                                        if (isMemberOfRegion(myState, flag) || isMemberOfRegion(myCountry, flag)) {
                                            harmony.services[act].action(false);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // PNH specific Services:

                // ### remove unnecessary parent categories (Restaurant doesn't need food and drink)
                if ( hpMode.harmFlag && harmony.newCategories.indexOf('FOOD_AND_DRINK') > -1 ) {
                    if (harmony.newCategories.indexOf('RESTAURANT') > -1 || harmony.newCategories.indexOf('FAST_FOOD') > -1 ) {
                        harmony.newCategories.splice(harmony.newCategories.indexOf('FOOD_AND_DRINK'),1);  // remove Food/Drink Cat
                        harmony.queueUpdateAction({ categories: harmony.newCategories });
                        harmony.updatedFields.categories = true;
                    }
                }

                var isPoint = item.isPoint();
                var isArea = item.is2D();
                var maxPointSeverity = 0;
                var maxAreaSeverity = 3;
                var highestCategoryLock = -1;

                // Area vs. Place checking, Category locking, and category-based messaging
                // NOTE: Since we have to keep looping through categories, maybe see about combining actions inside of the same loops.
                // NOTE: If it gets too complicated, the code should probably be segregated into other functions and then called within the same loop.
                for (i = 0, len = harmony.newCategories.length; i < len; i++) {
                    catName = harmony.newCategories[i];
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

                        // Display any messages regarding the category
                        if (pcMessage && pcMessage !== '0' && pcMessage !== '') {
                            harmony.flags.pnhCatMess.active = true;
                            harmony.flags.pnhCatMess.message = pcMessage;
                        }

                        // Unmapped categories
                        if (isMemberOfRegion(myState, pcRare) || isMemberOfRegion(myCountry, pcRare)) {
                            harmony.flags.unmappedRegion.active = true;
                            if (currentWL.unmappedRegion) {
                                harmony.flags.unmappedRegion.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                        }

                        // Parent Category
                        if (isMemberOfRegion(myState, pcParent) || isMemberOfRegion(myCountry, pcParent)) {
                            harmony.flags.parentCategory.active = true;
                            if (currentWL.parentCategory) {
                                harmony.flags.parentCategory.WLactive = false;
                            }
                        }

                        // Set lock level
                        for (i = 1; i < 6; i++) {
                            pcLockTemp = myCat['pcLock'+i];
                            if (i - 1 > highestCategoryLock && (isMemberOfRegion(myState, pcLockTemp) || isMemberOfRegion(myCountry, pcLockTemp))) {
                                highestCategoryLock = i - 1;
                            }
                        }
                    }
                }

                if (highestCategoryLock > -1) {
                    defaultLock = highestCategoryLock;
                }

                if (isPoint) {
                    if (maxPointSeverity === 3) {
                        harmony.flags.areaNotPoint.active = true;
                        if (currentWL.areaNotPoint || item.attributes.lockRank >= defaultLock) {
                            harmony.flags.areaNotPoint.WLactive = false;
                            harmony.flags.areaNotPoint.severity = 0;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxPointSeverity === 2) {
                        harmony.flags.areaNotPointMid.active = true;
                        if (currentWL.areaNotPoint || item.attributes.lockRank >= defaultLock) {
                            harmony.flags.areaNotPointMid.WLactive = false;
                            harmony.flags.areaNotPointMid.severity = 0;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxPointSeverity === 1) {
                        harmony.flags.areaNotPointLow.active = true;
                        if (currentWL.areaNotPoint || item.attributes.lockRank >= defaultLock) {
                            harmony.flags.areaNotPointLow.WLactive = false;
                            harmony.flags.areaNotPointLow.severity = 0;
                        }
                    }
                } else {
                    if (maxAreaSeverity === 3) {
                        harmony.flags.pointNotArea.active = true;
                        if (currentWL.pointNotArea || item.attributes.lockRank >= defaultLock) {
                            harmony.flags.pointNotArea.WLactive = false;
                            harmony.flags.pointNotArea.severity = 0;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxAreaSeverity === 2) {
                        harmony.flags.pointNotAreaMid.active = true;
                        if (currentWL.pointNotArea || item.attributes.lockRank >= defaultLock) {
                            harmony.flags.pointNotAreaMid.WLactive = false;
                            harmony.flags.pointNotAreaMid.severity = 0;
                        } else {
                            lockOK = false;
                        }
                    } else if (maxAreaSeverity === 1) {
                        harmony.flags.pointNotAreaLow.active = true;
                        if (currentWL.pointNotArea || item.attributes.lockRank >= defaultLock) {
                            harmony.flags.pointNotAreaLow.WLactive = false;
                            harmony.flags.pointNotAreaLow.severity = 0;
                        }
                    }
                }

                var anpNone = collegeAbbreviations.split('|'), anpNoneRE;
                for (var cii=0; cii<anpNone.length; cii++) {
                    anpNoneRE = new RegExp('\\b'+anpNone[cii]+'\\b', 'g');
                    if ( harmony.newName.match( anpNoneRE) !== null ) {
                        harmony.flags.areaNotPointLow.severity = 0;
                        harmony.flags.areaNotPointLow.WLactive = false;
                    }
                }


                // Check for missing hours field
                if (item.attributes.openingHours.length === 0) {  // if no hours...
                    if (!containsAny(harmony.newCategories,["STADIUM_ARENA","CEMETERY","MILITARY","TRANSPORTATION","FERRY_PIER","SUBWAY_STATION",
                                                    "BRIDGE","TUNNEL","JUNCTION_INTERCHANGE","ISLAND","SEA_LAKE_POOL","RIVER_STREAM","FOREST_GROVE","CANAL","SWAMP_MARSH","DAM"]) ) {
                        harmony.flags.noHours.active = true;
                        if (currentWL.noHours) {
                            harmony.flags.noHours.WLactive = false;
                        }
                        if ( containsAny(harmony.newCategories,["SCHOOL","CONVENTIONS_EVENT_CENTER","CAMPING_TRAILER_PARK","COTTAGE_CABIN","COLLEGE_UNIVERSITY","GOLF_COURSE","SPORTS_COURT","MOVIE_THEATER","SHOPPING_CENTER","RELIGIOUS_CENTER","PARKING_LOT","PARK","PLAYGROUND","AIRPORT","FIRE_DEPARTMENT","POLICE_STATION","SEAPORT_MARINA_HARBOR","FARM"]) ) {
                            harmony.flags.noHours.severity = 0;
                            harmony.flags.noHours.WLactive = false;
                        }
                    }
                    if (hpMode.hlFlag && isChecked("WMEPH-DisableHoursHL")) {
                        harmony.flags.noHours.severity = 0;
                    }
                } else {
                    if (item.attributes.openingHours.length === 1) {  // if one set of hours exist, check for partial 24hrs setting
                        if (item.attributes.openingHours[0].days.length < 7 && item.attributes.openingHours[0].fromHour==='00:00' &&
                            (item.attributes.openingHours[0].toHour==='00:00' || item.attributes.openingHours[0].toHour==='23:59' ) ) {
                            harmony.flags.mismatch247.active = true;
                        }
                    }
                    harmony.flags.noHours.active = true;
                    //harmony.flags.noHours.value = 'Add';
                    harmony.flags.noHours.severity = 0;
                    harmony.flags.noHours.WLactive = false;
                    harmony.flags.noHours.message = 'Hours';
                }
                if ( !checkHours(item.attributes.openingHours) ) {
                    //phlogdev('Overlapping hours');
                    harmony.flags.hoursOverlap.active = true;
                    harmony.flags.noHours.active = true;
                } else {
                    var tempHours = item.attributes.openingHours.slice(0);
                    for ( var ohix=0; ohix<item.attributes.openingHours.length; ohix++ ) {
                        if ( tempHours[ohix].days.length === 2 && tempHours[ohix].days[0] === 1 && tempHours[ohix].days[1] === 0) {
                            // separate hours
                            phlogdev('Correcting M-S entry...');
                            tempHours.push({days: [0], fromHour: tempHours[ohix].fromHour, toHour: tempHours[ohix].toHour});
                            tempHours[ohix].days = [1];
                            harmony.queueUpdateAction({ openingHours: tempHours });
                        }
                    }
                }

                // Highlight 24/7 button if hours are set that way, and add button for all places
                if ( item.attributes.openingHours.length === 1 && item.attributes.openingHours[0].days.length === 7 && item.attributes.openingHours[0].fromHour === '00:00' && item.attributes.openingHours[0].toHour ==='00:00' ) {
                    harmony.services.add247.checked = true;
                }
                harmony.services.add247.active = true;

                // URL updating
                var updateURL = true;
                if (newURL !== item.attributes.url && newURL !== "" && newURL !== "0") {
                    if ( PNHNameRegMatch && item.attributes.url !== null && item.attributes.url !== '' ) {  // for cases where there is an existing URL in the WME place, and there is a PNH url on queue:
                        var newURLTemp = harmony.normalizeUrl(newURL);  // normalize
                        var itemURL = harmony.normalizeUrl(item.attributes.url);
                        newURLTemp = newURLTemp.replace(/^www\.(.*)$/i,'$1');  // strip www
                        var itemURLTemp = itemURL.replace(/^www\.(.*)$/i,'$1');  // strip www
                        if ( newURLTemp !== itemURLTemp ) { // if formatted URLs don't match, then alert the editor to check the existing URL
                            harmony.flags.longURL.active = true;
                            if (currentWL.longURL) {
                                harmony.flags.longURL.WLactive = false;
                            }
                            harmony.flags.PlaceWebsite.value = "Place Website";
                            if (hpMode.harmFlag && updateURL && itemURL !== item.attributes.url) {  // Update the URL
                                phlogdev("URL formatted");
                                harmony.queueUpdateAction({ url: itemURL });
                                harmony.updatedFields.url = true;
                            }
                            updateURL = false;
                            tempPNHURL = newURL;
                        }
                    }
                    if (hpMode.harmFlag && updateURL && newURL !== item.attributes.url) {  // Update the URL
                        phlogdev("URL updated");
                        harmony.queueUpdateAction({ url: newURL });
                        harmony.updatedFields.url = true;
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

                newPhone = harmony.normalizePhone(item.attributes.phone, outputFormat, 'existing');

                // Check if valid area code  #LOC# USA and CAN only
                if (myCountry2L === "US" || myCountry2L === "CA") {
                    if (newPhone !== null && newPhone.match(/[2-9]\d{2}/) !== null) {
                        var areaCode = newPhone.match(/[2-9]\d{2}/)[0];
                        if ( areaCodeList.indexOf(areaCode) === -1 ) {
                            harmony.flags.badAreaCode.active = true;
                            if (currentWL.aCodeWL) {
                                harmony.flags.badAreaCode.WLactive = false;
                            }
                        }
                    }
                }
                if (hpMode.harmFlag && newPhone !== item.attributes.phone) {
                    phlogdev("Phone updated");
                    harmony.queueUpdateAction({phone: newPhone});
                    harmony.updatedFields.phone = true;
                }

                // Post Office cat check
                if (harmony.newCategories.indexOf("POST_OFFICE") > -1 && myCountry2L === "US" ) {
                    var USPSStrings = ['USPS','POSTOFFICE','USPOSTALSERVICE','UNITEDSTATESPOSTALSERVICE','USPO','USPOSTOFFICE','UNITEDSTATESPOSTOFFICE','UNITEDSTATESPOSTALOFFICE'];
                    var USPSMatch = false;
                    for (var uspix=0; uspix<USPSStrings.length; uspix++) {
                        if ( harmony.newName.toUpperCase().replace(/[ \/\-\.]/g,'').indexOf(USPSStrings[uspix]) > -1 ) {  // If it already has a USPS type term in the name, don't add the option
                            USPSMatch = true;
                            customStoreFinderURL = "https://tools.usps.com/go/POLocatorAction.action";
                            customStoreFinder = true;
                            if (hpMode.harmFlag && myPlace.psRegion === 'SER' && item.attributes.aliases.indexOf("United States Postal Service") === -1) {
                                harmony.queueUpdateAction({ aliases: ["United States Postal Service"], url: 'www.usps.com' });
                                harmony.updatedFields.aliases = true;
                                harmony.updatedFields.url = true;
                                phlogdev('USPS alt name added');
                            }
                            if ( harmony.newName.indexOf(' - ') === -1 && harmony.newName.indexOf(': ') === -1 ) {
                                harmony.flags.formatUSPS.active = true;
                            }
                            break;
                        }
                    }
                    if (!USPSMatch) {
                        lockOK = false;
                        harmony.flags.isitUSPS.active = true;
                        harmony.flags.catPostOffice.active = true;
                    }
                }  // END Post Office category check

            }  // END if (!residential && has name)

            // Name check
            if ( !item.attributes.residential && ( !harmony.newName || harmony.newName.replace(/[^A-Za-z0-9]/g,'').length === 0 )) {
                if (item.attributes.categories[0] === 'PARKING_LOT') {
                    if (currentWL.plaNameMissing) {
                        harmony.flags.plaNameMissing.active = false;
                    } else {
                        harmony.flags.plaNameMissing.active = true;
                    }
                } else if ( 'ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                    harmony.flags.nameMissing.active = true;
                    lockOK = false;
                }
            }

            // House number check
            if (item.attributes.streetID && (!item.attributes.houseNumber || item.attributes.houseNumber.replace(/\D/g,'').length === 0) ) {
                if ( 'BRIDGE|ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL|DAM|TUNNEL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                    if (myState2L === 'RQ') {
                        harmony.flags.hnMissing.active = true;
                        harmony.flags.hnMissing.severity = 0;
                    } else {
                        harmony.flags.hnMissing.active = true;
                        if (currentWL.HNWL) {
                            harmony.flags.hnMissing.severity = 0;
                            harmony.flags.hnMissing.WLactive = false;
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
                    harmony.flags.hnNonStandard.active = true;
                    if (currentWL.hnNonStandard) {
                        harmony.flags.hnNonStandard.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                }
                if ( updateHNflag ) {
                    harmony.flags.hnDashRemoved.active = true;
                    if (hpMode.harmFlag) {
                        harmony.queueUpdateAction({ houseNumber: hnTemp });
                        harmony.updatedFields.address = true;
                    } else if (hpMode.hlFlag) {
                        if (item.attributes.residential) {
                            harmony.flags.hnDashRemoved.severity = 3;
                        } else {
                            harmony.flags.hnDashRemoved.severity = 1;
                        }
                    }
                }
            }

            if ((!addr.city || addr.city.attributes.isEmpty) && 'BRIDGE|ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL|DAM|TUNNEL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                harmony.flags.cityMissing.active = true;
                if (item.attributes.residential && hpMode.hlFlag) {
                    harmony.flags.cityMissing.severity = 1;
                }
                lockOK = false;
            }
            if (addr.city && (!addr.street || addr.street.isEmpty) && 'BRIDGE|ISLAND|FOREST_GROVE|SEA_LAKE_POOL|RIVER_STREAM|CANAL|DAM|TUNNEL'.split('|').indexOf(item.attributes.categories[0]) === -1 ) {
                harmony.flags.streetMissing.active = true;
                lockOK = false;
            }

            // CATEGORY vs. NAME checks
            var testName = harmony.newName.toLowerCase().replace(/[^a-z]/g,' ');
            var testNameWords = testName.split(' ');
            // Hopsital vs. Name filter
            if (harmony.newCategories.indexOf("HOSPITAL_MEDICAL_CARE") > -1 && NON_HOSPITAL_PART_MATCH.length > 0) {
                var hpmMatch = false;
                if (containsAny(testNameWords,ANIMAL_FULL_MATCH)) {
                    harmony.flags.changeHMC2PetVet.active = true;
                    if (currentWL.changeHMC2PetVet) {
                        harmony.flags.changeHMC2PetVet.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                    harmony.flags.pnhCatMess.active = false;
                } else if (containsAny(testNameWords,NON_HOSPITAL_FULL_MATCH)) {
                    harmony.flags.changeHMC2Office.active = true;
                    if (currentWL.changeHMC2Office) {
                        harmony.flags.changeHMC2Office.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                    harmony.flags.pnhCatMess.active = false;
                } else {
                    for (var apmix=0; apmix<ANIMAL_PART_MATCH.length; apmix++) {
                        if (testName.indexOf(ANIMAL_PART_MATCH[apmix]) > -1) {
                            harmony.flags.changeHMC2PetVet.active = true;
                            if (currentWL.changeHMC2PetVet) {
                                harmony.flags.changeHMC2PetVet.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                            hpmMatch = true;  // don't run the human check if animal is found.
                            harmony.flags.pnhCatMess.active = false;
                            break;
                        }
                    }
                    if (!hpmMatch) {  // don't run the human check if animal is found.
                        for (var hpmix=0; hpmix<NON_HOSPITAL_PART_MATCH.length; hpmix++) {
                            if (testName.indexOf(NON_HOSPITAL_PART_MATCH[hpmix]) > -1) {
                                harmony.flags.changeHMC2Office.active = true;
                                if (currentWL.changeHMC2Office) {
                                    harmony.flags.changeHMC2Office.WLactive = false;
                                } else {
                                    lockOK = false;
                                }
                                hpmMatch = true;
                                harmony.flags.pnhCatMess.active = false;
                                break;
                            }
                        }
                    }
                    if (!hpmMatch) {
                        harmony.flags.changeHMC2OfficeButton.active = true;
                    }
                }
            }  // END HOSPITAL/Name check

            // School vs. Name filter
            if (harmony.newCategories.indexOf("SCHOOL") > -1 && SCHOOL_PART_MATCH.length>0) {
                if (containsAny(testNameWords,SCHOOL_FULL_MATCH)) {
                    harmony.flags.changeSchool2Offices.active = true;
                    if (currentWL.changeSchool2Offices) {
                        harmony.flags.changeSchool2Offices.WLactive = false;
                    } else {
                        lockOK = false;
                    }
                    harmony.flags.pnhCatMess.active = false;
                } else {
                    for (var schix=0; schix<SCHOOL_PART_MATCH.length; schix++) {
                        if (testName.indexOf(SCHOOL_PART_MATCH[schix]) > -1) {
                            harmony.flags.changeSchool2Offices.active = true;
                            if (currentWL.changeSchool2Offices) {
                                harmony.flags.changeSchool2Offices.WLactive = false;
                            } else {
                                lockOK = false;
                            }
                            harmony.flags.pnhCatMess.active = false;
                            break;
                        }
                    }
                }
            }  // END SCHOOL/Name check

            // Some cats don't need PNH messages and url/phone severities
            if ( 'BRIDGE|FOREST_GROVE|DAM|TUNNEL|CEMETERY'.split('|').indexOf(item.attributes.categories[0]) > -1 ) {
                harmony.flags.NewPlaceSubmit.active = false;
                harmony.flags.phoneMissing.severity = 0;
                harmony.flags.phoneMissing.WLactive = false;
                harmony.flags.urlMissing.severity = 0;
                harmony.flags.urlMissing.WLactive = false;
            }
            // Some cats don't need PNH messages and url/phone messages
            if ( 'ISLAND|SEA_LAKE_POOL|RIVER_STREAM|CANAL'.split('|').indexOf(item.attributes.categories[0]) > -1 ) {
                harmony.flags.NewPlaceSubmit.active = false;
                harmony.flags.phoneMissing.active = false;
                harmony.flags.urlMissing.active = false;
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
            if ( /rest area/i.test(harmony.newName) || /rest stop/i.test(harmony.newName) || /service plaza/i.test(harmony.newName) ||
                ( transCatIndex > -1 && lookoutCatIndex > -1 ) ) {
                if ( transCatIndex < 2 && transCatIndex > -1 && lookoutCatIndex < 2 && lookoutCatIndex > -1 ) {

                    if ( item.isPoint() ) {  // needs to be area
                        harmony.flags.areaNotPoint.active = true;
                    }
                    harmony.flags.pointNotArea.active = false;
                    harmony.flags.unmappedRegion.active = false;

                    if ( categories.indexOf('GAS_STATION') > -1 ) {
                        harmony.flags.restAreaGas.active = true;
                    }

                    if ( harmony.newName.match(/^Rest Area.* \- /) === null ) {
                        harmony.flags.restAreaName.active = true;
                        if (currentWL.restAreaName) {
                            harmony.flags.restAreaName.WLactive = false;
                        }
                    } else {
                        harmony.newName = harmony.newName.replace(/Mile/i, 'mile');
                        if (hpMode.harmFlag) {
                            if (harmony.newName !== item.attributes.name) {
                                harmony.queueUpdateAction({ name: harmony.newName });
                                harmony.updatedFields.name = true;
                                phlogdev('Lower case "mile"');
                            } else {
                                // The new name matches the original name, so the only change would have been to capitalize "Mile", which
                                // we don't want. So remove any previous name-change action.  Note: this feels like a hack and is probably
                                // a fragile workaround.  The name shouldn't be capitalized in the first place, unless necessary.
                                for (i = 0; i < harmony.actions.length; i++) {
                                    var action = harmony.actions[i];
                                    if (action.newAttributes.name) {
                                        harmony.actions.splice(i,1);
                                        harmony.updatedFields.name = false;
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
                    harmony.flags.streetMissing.active = false;
                    harmony.flags.cityMissing.active = false;
                    harmony.flags.hnMissing.active = false;
                    harmony.flags.urlMissing.severity = 0;
                    harmony.flags.phoneMissing.severity = 0;
                    //assembleBanner();


                } else {
                    harmony.flags.restAreaSpec.active = true;
                    if (currentWL.restAreaName) {
                        harmony.flags.restAreaSpec.WLactive = false;
                    } else {
                        harmony.flags.pointNotArea.active = false;
                    }
                }
            }

            // update Severity for banner messages
            for (var bannKey in harmony.flags) {
                if (harmony.flags.hasOwnProperty(bannKey) && harmony.flags[bannKey].active) {
                    severityButt = Math.max(harmony.flags[bannKey].severity, severityButt);
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
                if (harmony.newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && harmony.newCategories.indexOf("PARKING_LOT") > -1) {
                    levelToLock = lockLevel4;
                } else if ( item.isPoint() && harmony.newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && harmony.newCategories.indexOf("HOSPITAL_MEDICAL_CARE") === -1 ) {
                    levelToLock = lockLevel4;
                }
            }

            if (levelToLock > (USER_RANK - 1)) {levelToLock = (USER_RANK - 1);}  // Only lock up to the user's level
            if ( lockOK && severityButt < 2) {
                // Campus project exceptions
                if ( item.attributes.lockRank < levelToLock) {
                    if (hpMode.harmFlag) {
                        phlogdev("Venue locked!");
                        harmony.queueUpdateAction({ lockRank: levelToLock });
                        harmony.updatedFields.lockRank = true;
                    } else if (hpMode.hlFlag) {
                        hlLockFlag = true;
                    }
                }
                harmony.flags.placeLocked.active = true;
            }

            //IGN check
            if (!item.attributes.residential && item.attributes.updatedBy && W.model.users.get(item.attributes.updatedBy) &&
                W.model.users.get(item.attributes.updatedBy).userName && W.model.users.get(item.attributes.updatedBy).userName.match(/^ign_/i) !== null) {
                harmony.flags.ignEdited.active = true;
            }

            //waze_maint_bot check
            var updatedById = item.attributes.updatedBy ? item.attributes.updatedBy : item.attributes.createdBy;
            var updatedBy = W.model.users.get(updatedById);
            var updatedByName = updatedBy ? updatedBy.userName : null;
            var botNamesAndIDs = [
                '^waze-maint', '^105774162$',
                '^waze3rdparty$', '^361008095$',
                '^WazeParking1$', '^338475699$',
                '^admin$', '^-1$',
                '^avsus$', '^107668852$'
            ];
            var re = new RegExp(botNamesAndIDs.join('|'),'i');

            if (!item.attributes.residential && updatedById && (re.test(updatedById.toString()) || (updatedByName && re.test(updatedByName))))  {
                harmony.flags.wazeBot.active = true;
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
                    harmony.flags.lockRPP.message = 'Current lock: '+ (parseInt(item.attributes.lockRank)+1) +'. '+RPPLockString+' ?';
                    harmony.flags.lockRPP.active = true;
                }
            }

            // Turn off unnecessary buttons
            if (item.attributes.categories.indexOf('PHARMACY') > -1) {
                harmony.flags.addPharm.active = false;
            }
            if (item.attributes.categories.indexOf('SUPERMARKET_GROCERY') > -1) {
                harmony.flags.addSuper.active = false;
            }

            // Final alerts for non-severe locations
            if ( !item.attributes.residential && severityButt < 3) {
                var nameShortSpace = harmony.newName.toUpperCase().replace(/[^A-Z \']/g, '');
                if ( nameShortSpace.indexOf("'S HOUSE") > -1 || nameShortSpace.indexOf("'S HOME") > -1 || nameShortSpace.indexOf("'S WORK") > -1) {
                    if ( !containsAny(harmony.newCategories,['RESTAURANT','DESSERT','BAR']) && !PNHNameRegMatch ) {
                        harmony.flags.resiTypeNameSoft.active = true;
                    }
                }
                if ( ["HOME","MY HOME","HOUSE","MY HOUSE","PARENTS HOUSE","CASA","MI CASA","WORK","MY WORK","MY OFFICE","MOMS HOUSE","DADS HOUSE","MOM","DAD"].indexOf( nameShortSpace ) > -1 ) {
                    harmony.flags.resiTypeName.active = true;
                    if (currentWL.resiTypeName) {
                        harmony.flags.resiTypeName.WLactive = false;
                    }
                    harmony.flags.resiTypeNameSoft.active = false;
                }
                if ( item.attributes.description.toLowerCase().indexOf('google') > -1 || item.attributes.description.toLowerCase().indexOf('yelp') > -1 ) {
                    harmony.flags.suspectDesc.active = true;
                    if (currentWL.suspectDesc) {
                        harmony.flags.suspectDesc.WLactive = false;
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
                for ( var tempKey in harmony.flags ) {
                    if ( harmony.flags.hasOwnProperty(tempKey) && harmony.flags[tempKey].hasOwnProperty('active') && harmony.flags[tempKey].active ) {  //  If the particular message is active
                        if ( harmony.flags[tempKey].hasOwnProperty('WLactive') ) {
                            if ( harmony.flags[tempKey].WLactive ) {  // If there's a WL option, enable it
                                severityButt = Math.max(harmony.flags[tempKey].severity, severityButt);
                                //                                if ( harmony.flags[tempKey].severity > 0) {
                                //                                    phlogdev('Issue with '+item.attributes.name+': '+tempKey);
                                //                                    phlogdev('Severity: '+harmony.flags[tempKey].severity);
                                //                                }
                            }
                        } else {
                            severityButt = Math.max(harmony.flags[tempKey].severity, severityButt);
                            //                            if ( harmony.flags[tempKey].severity > 0) {
                            //                                phlogdev('Issue with '+item.attributes.name+': '+tempKey);
                            //                                phlogdev('Severity: '+harmony.flags[tempKey].severity);
                            //                            }
                        }
                    }

                }
                //phlogdev('calculated in harmGo: ' +severityButt + '; ' + item.attributes.name);

                // Special case flags
                if (  item.attributes.lockRank === 0 && (item.attributes.categories.indexOf("HOSPITAL_MEDICAL_CARE") > -1 || item.attributes.categories.indexOf("GAS_STATION") > -1) ) {
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
            if (harmony.newName.replace(/[^A-Za-z0-9]/g,'').length > 0 && !item.attributes.residential) {
                if ( isChecked("WMEPH-DisableDFZoom") ) {  // don't zoom and pan for results outside of FOV
                    duplicateName = findNearbyDuplicate(harmony.newName, harmony.newAliases, item, false);
                } else {
                    duplicateName = findNearbyDuplicate(harmony.newName, harmony.newAliases, item, true);
                }
                if (duplicateName[1]) {
                    harmony.flags.overlapping.active = true;
                }
                duplicateName = duplicateName[0];
                if (duplicateName.length > 0) {
                    if (duplicateName.length+1 !== dupeIDList.length && IS_DEV_USER) {  // If there's an issue with the data return, allow an error report
                        if (confirm('WMEPH: Dupefinder Error!\nClick OK to report this') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                            forumMsgInputs = {
                                subject: 'WMEPH Bug report DupeID',
                                message: 'Script version: ' + WMEPH_VERSION_LONG + devVersStr + '\nPermalink: ' + harmony.permalink + '\nPlace name: ' + item.attributes.name + '\nCountry: ' + addr.country.name + '\n--------\nDescribe the error:\nDupeID mismatch with dupeName list'
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
                                active: true, severity: 2, message: duplicateName[ijx-1],
                                WLactive: false, WLvalue: wlButtText, WLtitle: 'Whitelist Duplicate',
                                WLaction: function(dID) {
                                    wlKeyName = 'dupeWL';
                                    if (!currentWL.hasOwnProperty(wlKeyName)) {  // If dupeWL key is not in venue WL, then initialize it.
                                        currentWL[wlKeyName] = [];
                                    }
                                    currentWL.dupeWL.push(dID);  // WL the id for the duplicate venue
                                    //debug('4159 // About to call uniq() once inside of harmonizePlaceGo()');
                                    currentWL.dupeWL = uniq(venueWhitelist[harmony.id].dupeWL);
                                    // Make an entry for the opposite item
                                    if (!venueWhitelist.hasOwnProperty(dID)) {  // If venue is NOT on WL, then add it.
                                        venueWhitelist[dID] = { dupeWL: [] };
                                    }
                                    if (!venueWhitelist[dID].hasOwnProperty(wlKeyName)) {  // If dupeWL key is not in venue WL, then initialize it.
                                        venueWhitelist[dID][wlKeyName] = [];
                                    }
                                    venueWhitelist[dID].dupeWL.push(harmony.id);  // WL the id for the duplicate venue
                                    //debug('4169 // About to call uniq() once inside of harmonizePlaceGo()');
                                    venueWhitelist[dID].dupeWL = uniq(venueWhitelist[dID].dupeWL);
                                    saveWL_LS(true);  // Save the WL to local storage
                                    WMEPH_WLCounter();
                                    bannButt2.clearWL.active = true;
                                    bannDupl[dID].active = false;
                                    harmonizePlaceGo(item,'harmonize');
                                }
                            };
                            if ( currentWL.hasOwnProperty('dupeWL') && venueWhitelist[harmony.id].dupeWL.indexOf(dupeIDList[ijx]) > -1 ) {  // if the dupe is on the whitelist then remove it from the banner
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
                    harmony.flags.HNRange.active = true;
                    if (currentWL.HNRange) {
                        harmony.flags.HNRange.WLactive = false;
                    }
                    if (arrayHNRatio[arrayHNRatioCheckIX] > 5) {
                        harmony.flags.HNRange.severity = 3;
                    }
                    // show stats if HN out of range
                    phlogdev('HNs: ' + dupeHNRangeListSorted);
                    phlogdev('Distances: ' + dupeHNRangeDistList);
                    phlogdev('arrayHNRatio: ' + arrayHNRatio);
                    phlogdev('HN Ratio Score: ' + arrayHNRatio[Math.round(arrayHNRatio.length/2)]);
                }
            }

            harmony.submitMultiAction();

            if (hpMode.harmFlag) {
                // Update icons to reflect current WME place services
                harmony.updateServicesChecks();
            }

            // Turn on website linking button if there is a url
            if (newURL !== null && newURL !== "") {
                harmony.flags.PlaceWebsite.active = true;
            }

            // Highlight the changes made
            harmony.highlightChangedFields();

            // Assemble the banners
            assembleBanner(item);  // Make Messaging banners

        }  // END harmonizePlaceGo function

        // **** vvv Function definitions vvv ****




        // Set up banner messages
        function assembleBanner(item) {
            //debug('-- assembleBanner() called --');
            phlogdev('Building banners');
            // push together messages from active banner messages
            //var sidebarMessage = [];   // Initialize message array
            var sidebarTools = [];
            var sidebarSeverities = [];
            var tempKey, strButt1, dupesFound = false;
            var maxSeverity = 0;

            // Build banners above the Services
            var $bannerDiv = $('#WMEPH_banner');
            if ($bannerDiv.length === 0 ) {
                $bannerDiv = $('<div id="WMEPH_banner">').prependTo(".contents");
            } else {
                $bannerDiv.empty();
            }

            // Setup duplicates banners
            var keys = Object.keys(bannDupl);
            if (keys.length > 0) {
                var $dupeHeaderDiv = $('<div>').append($('<div>').html('<span class="fa fa-exclamation-circle"></span> Possible duplicates:')).addClass('banner-dupe').appendTo($bannerDiv);
                keys.forEach(function(tempKey){
                    var dupeRow = bannDupl[tempKey];
                    if (dupeRow.active) {
                        maxSeverity = Math.max(dupeRow.severity, maxSeverity);
                        $('<div>').append($('<div>').html('&nbsp;&nbsp;-- ' + dupeRow.message)).addClass('banner-row-severity-' + dupeRow.severity).addClass('banner-dupe').appendTo($bannerDiv);
                        // if (bannDupl[tempKey].hasOwnProperty('WLactive') && bannDupl[tempKey].WLactive && bannDupl[tempKey].hasOwnProperty('WLaction') ) {  // If there's a WL option, enable it
                        //     maxSeverity = Math.max(bannDupl[tempKey].severity, maxSeverity);
                        //     strButt1 += ' <input class="btn btn-success btn-xs wmeph-btn" id="WMEPH_WL' + tempKey + '" title="' + bannDupl[tempKey].WLtitle + '" type="button" value="' + bannDupl[tempKey].WLvalue + '">';
                        // }
                    }
                });
                $dupeHeaderDiv.addClass('banner-row-severity-' + maxSeverity);
            }

            for ( tempKey in item.attributes.harmony.flags ) {
                var bannerRowInfo = item.attributes.harmony.flags[tempKey];
                if ( bannerRowInfo && bannerRowInfo.active ) {  //  If the particular message is active
                    var $rowDiv = $('<div class="banner-row">').addClass('banner-row-severity-' + bannerRowInfo.severity).appendTo($bannerDiv);
                    if (bannerRowInfo.verticalLayout) $rowDiv.css('flex-direction', 'column');
                    if (bannerRowInfo.id) $rowDiv.attr('id', bannerRowInfo.id);
                    if (bannerRowInfo.message) {
                        var bullet;
                        switch (bannerRowInfo.severity) {
                            case -1:
                                bullet = 'fa-info-circle';
                                break;
                            case 0:
                                bullet = 'fa-check-circle';
                                break;
                            case 1:
                                bullet = 'fa-question-circle';
                                break;
                            case 2:
                                bullet = 'fa-exclamation-circle';
                                break;
                            case 3:
                                bullet = 'fa-times-circle';
                                break;
                            default:
                                bullet = '';
                        }
                        //var $msgDiv = $('<div class="banner-row-message">').html('<span class="fa ' + bullet + '"></span> ' + bannerRowInfo.message).appendTo($rowDiv);
                        $('<div class="banner-row-message">').html('<span class="fa ' + bullet + '"></span> ' + bannerRowInfo.message).appendTo($rowDiv);
                    }
                    //if (bannerRow.badInput) {
                    //    strButt1 = strButt1.replace(/#DDF/i,'pink');
                    //}
                    if (bannerRowInfo.input) {
                        var $inputDiv = $('<div class="banner-row-input">').appendTo($rowDiv);
                        $(bannerRowInfo.input).appendTo($inputDiv);
                    }
                    if (bannerRowInfo.buttons && bannerRowInfo.buttons.length > 0 || (bannerRowInfo.WLactive && !currentWL[tempKey])) {
                        var $btnDiv = $('<div class="banner-row-buttons">').appendTo($rowDiv);
                        var $btn;
                        if (bannerRowInfo.buttons) {
                            bannerRowInfo.buttons.forEach(function(btnInfo) {
                                $btn = $('<button>', {
                                    id: (btnInfo.id ? btnInfo.id : tempKey),
                                    class: "btn btn-default btn-xs wmeph-btn",
                                    title: btnInfo.title
                                }).html(btnInfo.text === 'Add' ? '<span class="fa fa-check"></span>' : btnInfo.text)
                                    .click(function() {
                                    btnInfo.action();
                                    assembleBanner(item);
                                }).appendTo($btnDiv);
                            });
                        }

                        if (bannerRowInfo.WLaction && bannerRowInfo.WLactive && !currentWL[tempKey]) {  // If there's a WL option, enable it
                            $btn = $('<button>', {
                                id: ('WMEPH_WL' + tempKey),
                                class: "btn btn-success btn-xs wmeph-btn wmeph-btn-wl",
                                title: bannerRowInfo.WLtitle
                            }).data('wl-key',bannerRowInfo.WLkey).data('banner-key',tempKey).html('WL')
                                .click(function(e) {
                                var bannerKey = $(this).data('banner-key');
                                var wlKey = $(this).data('wl-key');
                                var bannerRowInfo = item.attributes.harmony.flags[bannerKey];
                                bannerRowInfo.WLaction();
                                currentWL[wlKey] = true;
                                harmonizePlaceGo(item, 'harmonize');
                            }).appendTo($btnDiv);
                        }
                    }
                    maxSeverity = Math.max(bannerRowInfo.severity, maxSeverity);
                }
            }
            $bannerDiv.removeClass();
            $bannerDiv.addClass("banner-severity-" + maxSeverity);
            if ( isChecked("WMEPH-ColorHighlighting") ) {
                item = W.selectionManager.selectedItems[0].model;
                item.attributes.wmephSeverity = maxSeverity;
            }

            // setup Add Service Buttons for suggested services
            var sidebarServButts = '', servButtHeight = '27', greyOption;
            for ( tempKey in item.attributes.harmony.services ) {
                if ( item.attributes.harmony.services[tempKey].hasOwnProperty("active") && item.attributes.harmony.services[tempKey].active ) {  //  If the particular service is active
                    if ( item.attributes.harmony.services[tempKey].checked ) {
                        greyOption = '';
                    } else {
                        greyOption = '-webkit-filter: opacity(.25);filter: opacity(.25);';
                    }
                    //strButt1 = '&nbsp<input class="servButton" id="WMEPH_' + tempKey + '" title="' + item.attributes.harmony.services[tempKey].title + '" type="image" style="height:' + servButtHeight +
                    //    'px;background:none;border-color: none;border-style: none;" src="https://openmerchantaccount.com/img2/' + item.attributes.harmony.services[tempKey].icon + greyOption + '.png">';
                    strButt1 = '&nbsp<input class="'+item.attributes.harmony.services[tempKey].icon+'" id="WMEPH_' + tempKey + '" type="button" title="' + item.attributes.harmony.services[tempKey].title +
                        '" style="border:0;background-size: contain; height:' + servButtHeight + 'px;width: '+Math.ceil(servButtHeight*item.attributes.harmony.services[tempKey].w2hratio).toString()+'px;'+greyOption+'">';
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
                    maxSeverity = Math.max(bannButt2[tempKey].severity, maxSeverity);
                }
            }

            // Post the banners to the sidebar
            displayTools( sidebarTools.join("<li>") );
            $('#select2-drop').hide();

            // Set up Duplicate onclicks
            if ( dupesFound ) {
                setupButtons(bannDupl);
            }
            // Setup harmony.flags onclicks
            setupButtons(item.attributes.harmony.flags);
            // Setup harmony.services onclicks
            setupButtons(item.attributes.harmony.services);
            // Setup bannButt2 onclicks
            setupButtons(bannButt2);

            if (item.attributes.harmony.flags.noHours.active) {
                var button = document.getElementById('WMEPH_noHoursA2');
                if (button !== null) {
                    button.onclick = function() {
                        item.attributes.harmony.flags.noHours.action2();
                        assembleBanner();
                    };
                }
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

            function checkStreet(name) {
                name = (name || $("#WMEPH_missingStreet").val()).toUpperCase();
                var ix = streetNamesCap.indexOf(name);
                var enable = false;
                if (ix > -1) {
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
                        addStreetToVenue(item);
                    }
                }
            });

            // If pressing enter in the HN entry box, add the HN
            $("#WMEPH-HNAdd").keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-HNAdd').val() !== '' ){
                    $("#WMEPH_hnMissing").click();
                }
            });

            // If pressing enter in the phone entry box, add the phone
            $("#WMEPH-PhoneAdd").keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-PhoneAdd').val() !== '' ){
                    $("#WMEPH_phoneMissing").click();
                }
            });

            // If pressing enter in the URL entry box, add the URL
            $("#WMEPH-UrlAdd").keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-UrlAdd').val() !== '' ){
                    $("#WMEPH_urlMissing").click();
                }
            });

            // If pressing enter in the hours entry box, parse the entry
            $("#WMEPH-HoursPaste").keyup(function(event){
                if( event.keyCode === 13 && $('#WMEPH-HoursPaste').val() !== '' ){
                    $("#WMEPH_noHours").click();
                }
            });
            $("#WMEPH-HoursPaste").click(function(){
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
            if (button !== null) {
                button.onclick = function() {
                    b[bKey].action();
                    assembleBanner(item);
                };
            }
            return button;
        }
        function buttonWhitelist(b,bKey) {
            //debug('-- buttonWhitelist(b,bKey) called --');
            var button = document.getElementById('WMEPH_WL'+bKey);
            if (button !== null) {
                button.onclick = function() {
                    if ( bKey.match(/^\d{5,}/) !== null ) {
                        b[bKey].WLaction(bKey);
                    } else {
                        b[bKey].WLaction();
                    }
                    b[bKey].WLactive = false;
                    b[bKey].severity = 0;
                    assembleBanner(item);
                };
            }
            return button;
        }

        function displayTools(sbm) {
            //debug('- displayTools(sbm) called -');
            //debug('sbm = ' + JSON.stringify(sbm));
            if ($("#WMEPH_tools").length === 0 ) {
                $("#WMEPH_banner").after('<div id="WMEPH_tools">');
                $("#WMEPH_tools").prepend("<ul>");
            } else {
                $("#WMEPH_tools > ul").empty();
            }
            //sbm = '<li><span style="position:relative;left:-10px;">' + sbm + '</span></li>';
            sbm = "<li>" + sbm + "</li>";
            $("#WMEPH_tools > ul").append(sbm);
            $('#select2-drop').hide();
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
                if ($('#runWMEPH').length === 0 ) {
                    var strButt1 = '<input class="btn btn-primary" id="runWMEPH" title="Run WMEPH'+devVersStrSpace+' on Place" style="" type="button" value="Run WMEPH'+devVersStrSpace+'">';
                    $("#WMEPH_runButton").append(strButt1);
                }
                var btn = document.getElementById("runWMEPH");
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
                if (item) {
                    var openPlaceWebsiteURL = item.attributes.url;

                    if (openPlaceWebsiteURL !== null && openPlaceWebsiteURL.replace(/[^A-Za-z0-9]/g,'').length > 2 && (USER_NAME === 't0cableguy' || USER_NAME === 't0cableguy') ) {
                        if ($('#WMEPH_urlButton').length === 0 ) {
                            strButt1 = '<br><input class="btn btn-success btn-xs" id="WMEPH_urlButton" title="Open place URL" type="button" value="Open URL">';
                            $("#WMEPH_runButton").append(strButt1);
                        }
                        btn = document.getElementById("WMEPH_urlButton");
                        if (btn !== null) {
                            btn.onclick = function() {
                                var item = W.selectionManager.selectedItems[0];
                                if (item && item.model && item.model.attributes) {
                                    openPlaceWebsiteURL = item.model.attributes.url;
                                    if (openPlaceWebsiteURL.match(/^http/i) === null) {
                                        openPlaceWebsiteURL = 'http:\/\/'+openPlaceWebsiteURL;
                                    }
                                    if ( isChecked("WMEPH-WebSearchNewTab") ) {
                                        openWindow(openPlaceWebsiteURL);
                                    } else {
                                        window.open(openPlaceWebsiteURL, searchResultsWindowName, searchResultsWindowSpecs);
                                    }
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
                            setCheckedStateByClick("WMEPH_CPhn", true);
                            setCheckedStateByClick("WMEPH_CPstr", true);
                            setCheckedStateByClick("WMEPH_CPcity", true);
                            setCheckedStateByClick("WMEPH_CPurl", true);
                            setCheckedStateByClick("WMEPH_CPph", true);
                            setCheckedStateByClick("WMEPH_CPserv", true);
                            setCheckedStateByClick("WMEPH_CPdesc", true);
                            setCheckedStateByClick("WMEPH_CPhrs", true);
                        };
                    } else {
                        setTimeout(bootstrapRunButton,100);
                    }
                    btn = document.getElementById("checkAddrClone");
                    if (btn !== null) {
                        btn.onclick = function() {
                            setCheckedStateByClick("WMEPH_CPhn", true);
                            setCheckedStateByClick("WMEPH_CPstr", true);
                            setCheckedStateByClick("WMEPH_CPcity", true);
                            setCheckedStateByClick("WMEPH_CPurl", false);
                            setCheckedStateByClick("WMEPH_CPph", false);
                            setCheckedStateByClick("WMEPH_CPserv", false);
                            setCheckedStateByClick("WMEPH_CPdesc", false);
                            setCheckedStateByClick("WMEPH_CPhrs", false);
                        };
                    } else {
                        setTimeout(bootstrapRunButton,100);
                    }
                    btn = document.getElementById("checkNoneClone");
                    if (btn !== null) {
                        btn.onclick = function() {
                            setCheckedStateByClick("WMEPH_CPhn", false);
                            setCheckedStateByClick("WMEPH_CPstr", false);
                            setCheckedStateByClick("WMEPH_CPcity", false);
                            setCheckedStateByClick("WMEPH_CPurl", false);
                            setCheckedStateByClick("WMEPH_CPph", false);
                            setCheckedStateByClick("WMEPH_CPserv", false);
                            setCheckedStateByClick("WMEPH_CPdesc", false);
                            setCheckedStateByClick("WMEPH_CPhrs", false);
                        };
                    } else {
                        setTimeout(bootstrapRunButton,100);
                    }
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
                        //getPanelFields();
                        if (localStorage.getItem("WMEPH-EnableCloneMode" + devVersStr) === '1') {
                            displayCloneButton();
                        }
                    }


                } else {
                    setTimeout(bootstrapRunButton,1000);
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
            //var UpdateObject = require("Waze/Action/UpdateObject");
            if (cloneMaster !== null && cloneMaster.hasOwnProperty('url')) {
                item = W.selectionManager.selectedItems[0].model;
                var cloneItems = {};
                var updateItem = false;
                if ( isChecked("WMEPH_CPhn") ) {
                    cloneItems.houseNumber = cloneMaster.houseNumber;
                    updateItem = true;
                }
                if ( isChecked("WMEPH_CPurl") ) {
                    cloneItems.url = cloneMaster.url;
                    updateItem = true;
                }
                if ( isChecked("WMEPH_CPph") ) {
                    cloneItems.phone = cloneMaster.phone;
                    updateItem = true;
                }
                if ( isChecked("WMEPH_CPdesc") ) {
                    cloneItems.description = cloneMaster.description;
                    updateItem = true;
                }
                if ( isChecked("WMEPH_CPserv") ) {
                    cloneItems.services = cloneMaster.services;
                    updateItem = true;
                }
                if ( isChecked("WMEPH_CPhrs") ) {
                    cloneItems.openingHours = cloneMaster.openingHours;
                    updateItem = true;
                }
                if (updateItem) {
                    W.model.actionManager.add(new UpdateObject(item, cloneItems) );
                    phlogdev('Item details cloned');
                }

                var copyStreet = isChecked("WMEPH_CPstr");
                var copyCity = isChecked("WMEPH_CPcity");

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
            DUPLICATE_LAYER.destroyFeatures();
            var vecLyrPlaces = W.map.getLayersBy("uniqueName","landmarks")[0];
            DUPLICATE_LAYER.setZIndex(parseInt(vecLyrPlaces.getZIndex())+3);  // Move layer to just on top of Places layer

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
                    var excludePLADupes = isChecked('WMEPH-ExcludePLADupes');
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
                                    DUPLICATE_LAYER.setVisibility(true);  // If anything found, make visible the dupe layer
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
                                    //DUPLICATE_LAYER.addFeatures(labelFeatures);
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
                DUPLICATE_LAYER.addFeatures(labelFeatures);
            }
            if (IS_DEV_USER) {
                t1 = performance.now();  // log search time
                //phlogdev("Ran dupe search on " + numVenues + " nearby venues in " + (t1 - t0).toFixed(3) + " milliseconds.");
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
                    //getPanelFields();
                    if ( isChecked("WMEPH-EnableCloneMode") ) {
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
                DUPLICATE_LAYER.destroyFeatures();
                DUPLICATE_LAYER.setVisibility(false);
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


        function addStreetToVenue(item) {
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
            item.attributes.harmony.flags.streetMissing.active = false;
            assembleBanner(item);
        }

        /**
         * Updates the address for a place.
         * @param feature {WME Venue Object} The place to update.
         * @param address {Object} An object containing the country, state, city, and street
         * @param actions {Array of actions} Optional. If performing multiple actions at once.
         * objects.
         */
        function updateAddress(feature, address) {
            console.log("updateAddress(feature, address, actions) was called");
            console.log("feature.CLASS_NAME = " + feature.CLASS_NAME);
            console.log("address = " + JSON.stringify(address));
            console.log("actions = " + JSON.stringify(actions));
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
                W.model.actionManager.add(action);
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

        // NOTE: Why do we have this?
        // WME Category translation from Natural language to object language  (Bank / Financial --> BANK_FINANCIAL)
        function catTranslate(natCategories) {
            debug('-- catTranslate(natCategories) called --');
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

        // settings tab
        function add_PlaceHarmonizationSettingsTab() {
            //debug('-- add_PlaceHarmonizationSettingsTab() called --');
            //Create Settings Tab
            var phTabHtml = '<li><a href="#sidepanel-ph" data-toggle="tab" id="PlaceHarmonization">WMEPH' + devVersStrSpace + '</a></li>';
            $("#user-tabs ul.nav-tabs:first").append(phTabHtml);

            //Create Settings Tab Content
            var phContentHtml = '<div class="tab-pane" id="sidepanel-ph"><div id="PlaceHarmonizer">WMEPH' +
                devVersStrSpace + ' v' + WMEPH_VERSION_LONG + '</div></div>';
            $("#user-info div.tab-content:first").append(phContentHtml);

            var c = '<div id="wmephtab" class="active" style="padding-top: 5px;">' +
                '<ul class="nav nav-tabs"><li class="active"><a data-toggle="tab" href="#sidepanel-harmonizer">Harmonize</a></li>' +
                '<li><a data-toggle="tab" href="#sidepanel-highlighter">HL \/ Scan</a></li>' +
                '<li><a data-toggle="tab" href="#sidepanel-wltools">WL Tools</a></li></ul>' +
                '<div class="tab-content"><div class="tab-pane active" id="sidepanel-harmonizer"></div>' +
                '<div class="tab-pane" id="sidepanel-highlighter"></div>' +
                '<div class="tab-pane" id="sidepanel-wltools"></div></div></div>';

            //add the sub tabs to the scripts main tab
            $("#sidepanel-ph").append(c);

            // Enable certain settings by default if not set by the user:
            if (localStorage.getItem('WMEPH-ColorHighlighting'+devVersStr) === null) {
                localStorage.setItem('WMEPH-ColorHighlighting'+devVersStr, '1');
            }

            //Create Settings Checkboxes and Load Data
            //example condition:  if ( isChecked("WMEPH-DisableDFZoom") ) { }
            createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-WebSearchNewTab","Open URL & Search Results in new tab instead of new window");
            createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-DisableDFZoom","Disable zoom & center for duplicates");
            createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-EnableIAZoom","Enable zoom & center for places with no address");
            createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-HidePlacesWiki","Hide 'Places Wiki' button in results banner");
            createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-ExcludePLADupes","Exclude parking lots when searching for duplicate places.");
            if (IS_DEV_USER || IS_BETA_USER || USER_RANK >= 2) {
                createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-DisablePLAExtProviderCheck",'Disable check for "No external provider link(s)" on Parking Lot Areas');
                createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-ExtProviderSeverity",'Treat "No external provider link(s)" as non-critical (blue)');
                createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-EnableServices","Enable automatic addition of common services");
                createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-ConvenienceStoreToGasStations",'Automatically add "Convenience Store" category to gas stations');
                createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-AddAddresses","Add detected address fields to places with no address");
                createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-EnableCloneMode","Enable place cloning tools");
                createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-AutoLockRPPs","Lock residential place points to region default");
                createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-AutoRunOnSelect",'Automatically run the script when selecting a place');
            }

            ["#WMEPH-ExtProviderSeverity", "#WMEPH-DisablePLAExtProviderCheck"].map(function(id) {
                $(id).on('click', function() {
                    // Force highlight refresh on all venues.
                    applyHighlightsTest(W.model.venues.getObjectArray());
                });
            });

            // Highlighter settings
            var phDevContentHtml = '<p>Highlighter Settings:</p>';
            $("#sidepanel-highlighter").append(phDevContentHtml);
            createSettingsCheckbox("sidepanel-highlighter", "WMEPH-ColorHighlighting","Enable color highlighting of map to indicate places needing work");
            createSettingsCheckbox("sidepanel-highlighter", "WMEPH-DisableHoursHL","Disable highlighting for missing hours");
            createSettingsCheckbox("sidepanel-highlighter", "WMEPH-DisableRankHL","Disable highlighting for places locked above your rank");
            createSettingsCheckbox("sidepanel-highlighter", "WMEPH-DisableWLHL","Disable Whitelist highlighting (shows all missing info regardless of WL)");
            if (IS_DEV_USER || IS_BETA_USER || USER_RANK >= 3) {
                //createSettingsCheckbox("sidepanel-highlighter", "WMEPH-UnlockedRPPs","Highlight unlocked residential place points");
            }
            var phHRContentHtml = '<hr align="center" width="90%">';
            $("#sidepanel-highlighter").append(phHRContentHtml);
            phHRContentHtml = '<p>Scanner Settings (coming soon)</p>';
            $("#sidepanel-highlighter").append(phHRContentHtml);

            // Scanner settings
            //createSettingsCheckbox("sidepanel-highlighter", "WMEPH-PlaceScanner","Placeholder, under development!");

            // Whitelist settings

            phHRContentHtml = '<hr align="center" width="90%">';
            $("#sidepanel-harmonizer").append(phHRContentHtml);

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
            var phKBContentHtml = $('<div id="PlaceHarmonizerKB"><div id="PlaceHarmonizerKBWarn"></div>Shortcut Letter (a-Z): <input type="text" maxlength="1" id="WMEPH-KeyboardShortcut" style="width: 30px;padding-left:8px"><div id="PlaceHarmonizerKBCurrent"></div></div>');
            $("#sidepanel-harmonizer").append(phKBContentHtml);
            createSettingsCheckbox("PlaceHarmonizerKB", "WMEPH-KBSModifierKey", "Use Ctrl instead of Alt"); // Add Alt-->Ctrl checkbox
            if ( localStorage.getItem('WMEPH-KBSModifierKey'+devVersStr) === '1' ) {  // Change modifier key code if checked
                modifKey = 'Ctrl+';
            }
            $('#WMEPH-KeyboardShortcut').val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));  // Load letter key value from local storage
            if ($('#WMEPH-KeyboardShortcut').val().match(/^[a-z]{1}$/i) === null) {
                $('#WMEPH-KeyboardShortcut').val(defaultKBShortcut);
                $(localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, $('#WMEPH-KeyboardShortcut').val()));
            }
            shortcutParse = parseKBSShift($('#WMEPH-KeyboardShortcut').val());
            // Check for KBS conflict on Beta script load
            /* NOTE: We are probably going to remove this because we are removing side-by-side support for Prod and Beta
            if (IS_DEV_VERSION) {
                if (checkWMEPH_KBSconflict(shortcutParse)) {
                    alert('You have the same shortcut for the Beta version and the Production version of the script. The Beta version is disabled until you change the Beta shortcut');
                } else {
                    shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                    phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                    $("#PlaceHarmonizerKBCurrent").append(phKBContentHtml);
                }
            } else {  // Prod version always loads
                shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                $("#PlaceHarmonizerKBCurrent").append(phKBContentHtml);
            }
            */

            // Modifier on-click changes
            var modifKeyNew;
            $("#WMEPH-KBSModifierKey").click(function() {
                $("#PlaceHarmonizerKBWarn").empty();  // remove any warning
                if (isChecked("WMEPH-KBSModifierKey")) {
                    modifKeyNew = 'Ctrl+';
                } else {
                    modifKeyNew = 'Alt+';
                }
                shortcutParse = parseKBSShift($('#WMEPH-KeyboardShortcut').val());

                if (checkWMEPH_KBSconflict(shortcutParse)) {
                    $("#WMEPH-KBSModifierKey").trigger('click');
                    phKBContentHtml = '<p style="color:red">Shortcut conflict with other WMEPH version<p>';
                    $("#PlaceHarmonizerKBWarn").append(phKBContentHtml);
                } else {
                    shortcut.remove(modifKey + shortcutParse);
                    modifKey = modifKeyNew;
                    shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                }

                $("#PlaceHarmonizerKBCurrent").empty();
                phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                $("#PlaceHarmonizerKBCurrent").append(phKBContentHtml);
            });

            // Upon change of the KB letter:
            var shortcutParseNew;
            $("#WMEPH-KeyboardShortcut").change(function() {
                if ($('#WMEPH-KeyboardShortcut').val().match(/^[a-z]{1}$/i) !== null) {  // If a single letter...
                    $("#PlaceHarmonizerKBWarn").empty();  // remove old warning
                    // remove previous
                    shortcutParse = parseKBSShift(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
                    shortcutParseNew = parseKBSShift($('#WMEPH-KeyboardShortcut').val());

                    if (checkWMEPH_KBSconflict(shortcutParseNew)) {
                        $('#WMEPH-KeyboardShortcut').val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
                        //$("#PlaceHarmonizerKBWarn").empty();
                        phKBContentHtml = '<p style="color:red">Shortcut conflict with other WMEPH version<p>';
                        $("#PlaceHarmonizerKBWarn").append(phKBContentHtml);
                    } else {
                        shortcut.remove(modifKey + shortcutParse);
                        shortcutParse = shortcutParseNew;
                        shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
                        $(localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, $('#WMEPH-KeyboardShortcut').val()) );
                    }
                    $("#PlaceHarmonizerKBCurrent").empty();
                    phKBContentHtml = $('<span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span>');
                    $("#PlaceHarmonizerKBCurrent").append(phKBContentHtml);
                } else {  // if not a letter then reset and flag
                    $('#WMEPH-KeyboardShortcut').val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
                    $("#PlaceHarmonizerKBWarn").empty();
                    phKBContentHtml = '<p style="color:red">Only letters are allowed<p>';
                    $("#PlaceHarmonizerKBWarn").append(phKBContentHtml);
                }
            });


            if (IS_DEV_USER) {  // Override script regionality (devs only)
                phDevContentHtml = '<hr align="center" width="90%"><p>Dev Only Settings:</p>';
                $("#sidepanel-harmonizer").append(phDevContentHtml);
                createSettingsCheckbox("sidepanel-harmonizer", "WMEPH-RegionOverride","Disable Region Specificity");

            }

            // *** Whitelisting section
            if (localStorage.getItem('WMEPH_WLAddCount') === null) {
                localStorage.setItem('WMEPH_WLAddCount', 2);  // Counter to remind of WL backups
            }
            var phWLContentHtml = $('<div id="PlaceHarmonizerWLTools' + '">Whitelist string: <input onClick="this.select();" type="text" id="WMEPH-WLInput" style="width: 200px;padding-left:1px"><br>'+
                                    '<input class="btn btn-success btn-xs" id="WMEPH-WLMerge" title="Merge the string into your existing Whitelist" type="button" value="Merge">'+
                                    '<br><input class="btn btn-success btn-xs" id="WMEPH-WLPull" title="Pull your existing Whitelist for backup or sharing" type="button" value="Pull">'+
                                    '<br><input class="btn btn-success btn-xs" id="WMEPH-WLShare" title="Share your Whitelist to a public Google sheet" type="button" value="Share your WL">'+
                                    '<br><input class="btn btn-info btn-xs" id="WMEPH-WLStats" title="Display WL stats" type="button" value="Stats">'+
                                    '<br><input class="btn btn-danger btn-xs" id="WMEPH-WLStateFilter" title="Remove all WL items for a state" type="button" value="Remove data for 1 State">'+
                                    '</div><div id="PlaceHarmonizerWLToolsMsg"></div>');
            $("#sidepanel-wltools").append(phWLContentHtml);

            $("#WMEPH-WLMerge").click(function() {
                $("#PlaceHarmonizerWLToolsMsg").empty();
                if ($('#WMEPH-WLInput').val() === 'resetWhitelist') {
                    if (confirm('***Do you want to reset all Whitelist data?\nClick OK to erase.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                        venueWhitelist = { '1.1.1': { Placeholder: {  } } }; // Populate with a dummy place
                        saveWL_LS(true);
                    }
                } else {  // try to merge uncompressed WL data
                    WLSToMerge = validateWLS($('#WMEPH-WLInput').val());
                    if (WLSToMerge) {
                        phlog('Whitelists merged!');
                        venueWhitelist = mergeWL(venueWhitelist,WLSToMerge);
                        saveWL_LS(true);
                        phWLContentHtml = '<p style="color:green">Whitelist data merged<p>';
                        $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
                        $('#WMEPH-WLInputBeta').val('');
                    } else {  // try compressed WL
                        WLSToMerge = validateWLS( LZString.decompressFromUTF16($('#WMEPH-WLInput').val()) );
                        if (WLSToMerge) {
                            phlog('Whitelists merged!');
                            venueWhitelist = mergeWL(venueWhitelist,WLSToMerge);
                            saveWL_LS(true);
                            phWLContentHtml = '<p style="color:green">Whitelist data merged<p>';
                            $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
                            $('#WMEPH-WLInputBeta').val('');
                        } else {
                            phWLContentHtml = '<p style="color:red">Invalid Whitelist data<p>';
                            $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
                        }
                    }
                }
            });

            // Pull the data to the text field
            $("#WMEPH-WLPull").click(function() {
                $("#PlaceHarmonizerWLToolsMsg").empty();
                $('#WMEPH-WLInput').val( LZString.decompressFromUTF16(localStorage.getItem(WLlocalStoreNameCompressed)) );
                phWLContentHtml = '<p style="color:green">To backup the data, copy & paste the text in the box to a safe location.<p>';
                $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
                localStorage.setItem('WMEPH_WLAddCount', 1);
            });

            // WL Stats
            $("#WMEPH-WLStats").click(function() {
                $("#PlaceHarmonizerWLToolsMsg").empty();
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
                $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
                //localStorage.setItem('WMEPH_WLAddCount', 1);
            });

            // WL State Filter
            $("#WMEPH-WLStateFilter").click(function() {
                $("#PlaceHarmonizerWLToolsMsg").empty();
                stateToRemove = $('#WMEPH-WLInput').val();
                if ( stateToRemove.length < 2 ) {
                    phWLContentHtml = '<p style="color:red">Invalid state<p>';
                    $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
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
                                $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
                                $('#WMEPH-WLInputBeta').val('');
                            } else {
                                phWLContentHtml = '<p style="color:blue">No changes made<p>';
                                $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
                            }
                        } else {
                            phWLContentHtml = '<p style="color:red">Please backup your WL using the Pull button before removing state data<p>';
                            $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
                            //phlogdev('Please backup your WL using the Pull button before removing state data');
                        }
                    } else {
                        phWLContentHtml = '<p style="color:red">No data for that state. Use the state name exactly as listed in the Stats<p>';
                        $("#PlaceHarmonizerWLToolsMsg").append(phWLContentHtml);
                        //phlogdev('No data for that state. Use the state name exactly as listed in the Stats');
                    }
                }
            });

            // Share the data to a Google Form post
            $("#WMEPH-WLShare").click(function() {
                var submitWLURL = 'https://docs.google.com/forms/d/1k_5RyOq81Fv4IRHzltC34kW3IUbXnQqDVMogwJKFNbE/viewform?entry.1173700072='+USER_NAME;
                window.open(submitWLURL);
            });

            var feedbackString = 'Submit script feedback & suggestions';
            var placesWikiStr = 'Open the WME Places Wiki page';
            var phContentHtml2 = '<hr align="center" width="95%"><p><a href="' +
                PLACES_WIKI_URL + '" target="_blank" title="'+placesWikiStr+'">'+placesWikiStr+'</a><p><a href="' +
                WMEPH_FORUM_URL + '" target="_blank" title="'+feedbackString+'">'+feedbackString+'</a></p><hr align="center" width="95%">' +
                '<div id="WMEPH_New_Features"></div><div id="WMEPH_Change_Log">';
            $("#sidepanel-harmonizer").append(phContentHtml2);
            assembleChangeLog();

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
            $("#WMEPH-ColorHighlighting").click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-DisableHoursHL").click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-DisableRankHL").click( function() {
                bootstrapWMEPH_CH();
            });
            $("#WMEPH-DisableWLHL").click( function() {
                bootstrapWMEPH_CH();
            });
            if ( isChecked("WMEPH-ColorHighlighting") ) {
                phlog('Starting Highlighter');
                bootstrapWMEPH_CH();
            }


            // Add Color Highlighting shortcut
            shortcut.add("Control+Alt+h", function() {
                $("#WMEPH-ColorHighlighting").trigger('click');
            });

            // Add Autorun shortcut
            if (USER_NAME === 'bmtg') {
                shortcut.add("Control+Alt+u", function() {
                    $("#WMEPH-AutoRunOnSelect").trigger('click');
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
            if (isChecked(settingID)) {
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
        function harmoList(itemName,state2L,region3L,country,itemCats,item) {
            debug('-- harmoList(itemName,state2L,region3L,country,itemCats,item) called --');
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
            //var matchPNHData = [];  // array of matched data
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
               if (specCases.indexOf('regexNameMatch') > -1) {
                    // Check for regex name matching instead of "standard" name matching.
                    var match = specCases.match(/regexNameMatch<>(.+?)<>/i);
                    if (match !== null) {
                        var re = new RegExp(match[1].replace(/\\/,'\\'),'i');
                        PNHStringMatch = re.test(item.attributes.name);
                    }
                } else if (specCases.indexOf('strMatchAny') > -1 || currMatchData[ph_category1_ix] === 'Hotel') {  // Match any part of WME name with either the PNH name or any spaced names
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
                    phlogdev('Matched PNH Order No.: '+currMatchData[ph_order_ix]);

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
                            isChecked("WMEPH-RegionOverride")) {  // OR if region override is selected (dev setting
                            if (IS_DEV_USER) {
                                t1 = performance.now();  // log search time
                                //phlogdev("Found place in " + (t1 - t0).toFixed(3) + " milliseconds.");
                            }
                            matchPNHRegionData.push(PNHMatchData);
                            item.attributes.harmony.flags.placeMatched.active = true;
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
            if (item.attributes.harmony.flags.placeMatched.active) {
                return matchPNHRegionData;
            } else if (PNHNameMatch) {  // if a name match was found but not for region, prod the user to get it approved
                item.attributes.harmony.flags.ApprovalSubmit.active = true;
                //phlogdev("PNH data exists but not approved for this area.");
                if (IS_DEV_USER) {
                    t1 = performance.now();  // log search time
                    //phlogdev("Searched all PNH entries in " + (t1 - t0).toFixed(3) + " milliseconds.");
                }
                return ["ApprovalNeeded", PNHNameTemp, PNHOrderNum];
            } else {  // if no match was found, suggest adding the place to the sheet if it's a chain
                item.attributes.harmony.flags.NewPlaceSubmit.active = true;
                //phlogdev("Place not found in the " + country + " PNH list.");
                if (IS_DEV_USER) {
                    t1 = performance.now();  // log search time
                    //phlogdev("Searched all PNH entries in " + (t1 - t0).toFixed(3) + " milliseconds.");
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
                        DUPLICATE_LAYER.destroyFeatures();
                        DUPLICATE_LAYER.setVisibility(false);
                    } else {
                        var deletedDupe = DUPLICATE_LAYER.getFeaturesByAttribute('dupeID', lastAction.object.attributes.id) ;
                        DUPLICATE_LAYER.removeFeatures(deletedDupe);
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


    var _googleLinkHash = {};
    function modifyGoogleLinks() {
        //debug('- modifyGoogleLinks() called -');
        var events;
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


    ///////////////////////////////////////////
    ///////////////////////////////////////////
    //// Behold, the Harmony class object! ////
    ///////////////////////////////////////////
    ///////////////////////////////////////////

    // **** Set up banner action buttons.  Structure:
    // active: false until activated in the script
    // severity: determines the color of the banners and whether locking occurs
    // message: The text before the button option
    // value: button text
    // title: tooltip text
    // action: The action that happens if the button is pressed
    // WL terms are for whitelisting

    // BEHOLD! The Harmony class!
    function Harmony(item) {
        //console.log('Creating a new Harmony object!');
        if (!item) {
            throw new TypeError("Harmony.constructor requires more than 0 arguments");
        }
        if (item.CLASS_NAME !== "Waze.Feature.Vector.Landmark") {
            var _type = item.CLASS_NAME || typeof(item);
            _type.replace(/(?:^|\s|\.)[A-Za-z]/g, function(m) { return m.toUpperCase(); });
            throw new TypeError('Wrong type for parameter "item" of Harmony.constructor: Expected Waze.Feature.Vector.Landmark, but got ' + _type);
        }

        //////////////////////////////
        // Harmony Public Variables //
        //////////////////////////////

        // Verified
        this.item = item;
        this.CLASS_NAME = "WMEPH.Harmony";
        this.WME_SERVICES = [
            "VALLET_SERVICE",
            "DRIVETHROUGH",
            "WI_FI",
            "RESTROOMS",
            "CREDIT_CARDS",
            "RESERVATIONS",
            "OUTSIDE_SEATING",
            "AIR_CONDITIONING",
            "PARKING_FOR_CUSTOMERS",
            "DELIVERIES",
            "TAKE_AWAY",
            "WHEELCHAIR_ACCESSIBLE"
        ];
        this.severity = 0;  // Only use this to get the severity of the place without harmonizing.

        // Unverified
        this.id = this.item.attributes.id;
        this.permalink = $("a.permalink").attr("href").replace(/&(?:layers|(?:mapUpdateRequest|mapProblem|update_requests|problems|venue)Filter)=[^&]+/g,"");
        this.newName = "";
        this.optAlias = "";
        this.newAliases = [];
        this.newCategories = [];
        this.newURL = "";
        this.newPlaceURL = "";
        this.updatedFields = {
            name: false,
            aliases: false,
            categories: false,
            brand: false,
            description: false,
            lockRank: false,
            address: false,
            url: false,
            phone: false,
            openingHours: false,
            services: {
                VALLET_SERVICE: false,
                DRIVETHROUGH: false,
                WI_FI: false,
                RESTROOMS: false,
                CREDIT_CARDS: false,
                RESERVATIONS: false,
                OUTSIDE_SEATING: false,
                AIR_CONDITIONING: false,
                PARKING_FOR_CUSTOMERS: false,
                DELIVERIES: false,
                TAKE_AWAY: false,
                WHEELCHAIR_ACCESSIBLE: false
            }
        };

        ///////////////////////////////
        // Harmony Private Variables //
        ///////////////////////////////

        // Verified
        var _this = this;
        var _actions = [];

        // Unverified


        ///////////////////////
        // Other assignments //
        ///////////////////////

        // Verified
        item.attributes.harmony = this;

        // Unverified


        ////////////////////////////
        // Harmony Public Methods //
        ////////////////////////////

        // Functions that need to be called from the outside but do not need access to private variables.
        // These are declared after the constructor.


        ///////////////////////////////
        // Harmony Private Functions //
        ///////////////////////////////

        // Functions required by any Harmony-related functions that are not to be used external to the object.
        /* Example:
        function funcName(args) {
            return something;
        }
        */


        ////////////////////////////////    Functions that will be called from
        // Harmony Privileged Methods //    the outside that need access to
        ////////////////////////////////    private variables/functions.

        // This function queues an action for a MultiAction.  Use this during harmonization.
        this.queueUpdateAction = function(updateObj) {
            var a = _actions.length;
            var b = _actions.push(new UpdateObject(this.item, updateObj));
            if (a + 1 !== b) {
                return false;
            }
            return true;
        };

        // Add array of actions to a MultiAction to be executed at once (counts as one edit for redo/undo purposes)
        this.submitMultiAction = function() {
            if(_actions.length < 1) {
                // If there are no actions, then there's nothing to do.
                return false;
            }

            var a = W.model.actionManager.getActions().length;
            var ma = new MultiAction();
            console.log("submitMultiAction :: W.model.CLASS_NAME === " + W.model.CLASS_NAME);
            ma.setModel(W.model);
            _actions.forEach(function(act) {
                ma.doSubAction(act);
            });
            W.model.actionManager.add(ma);
            var b = W.model.actionManager.getActions().length;
                if (a + 1 !== b) {
                    return false;
                }

            _actions.length = 0;
            return true;
        };

        // Sets the given service as checked.
        this.setServiceChecked = function(servObj, checked) {
            var toggle = typeof checked === "undefined";
            checked = (toggle) ? !servObj.checked : checked;
            var checkboxChecked = isChecked("service-checkbox-" + servObj.id);
            var exists = false;
            var changed = false;
            if (checkboxChecked === servObj.checked && checkboxChecked !== checked) {
                servObj.checked = checked;
                // We have to see if there are already existing changes to services in the action manager.
                // If there are, we need the last copy of the array of enabled services.
                var amServices;
                var amActions = W.model.actionManager.getActions();
                for (var i = 0, len = amActions.length; i < len; i++) {
                    if (amActions[i].newAttributes && amActions[i].newAttributes.services) {
                        amServices = amActions[i].newAttributes.services;
                    }
                }

                if (!amServices) {
                    // If there were no updates to our place regarding services, copy the existing item services.
                    amServices = JSON.parse(JSON.stringify(this.item.attributes.services));
                }

                var index = amServices.indexOf(servObj.id);
                exists = index > -1;
                var a = amServices.length;
                var b;
                if (checked && !exists) {
                    // If we're adding, add the service to the array.
                    b = amServices.push(servObj.id);
                    if (a !== b) {
                        changed = true;
                    }
                } else if (!checked && exists) {
                    // If we're not adding, we're subtracting.
                    amServices.splice(index, 1);
                    if (a > amServices.length) {
                        changed = true;
                    }
                }
                if (changed) {
                    this.addUpdateAction({ "services": amServices });
                    this.updatedFields.services[servObj.id] = true;
                    this.updateServicesChecks();
                }
            }

            if (!toggle) this.services[servObj.name].active = checked;

            return changed;
        };

        // Updates all of the icons to match the place's checkboxes.
        this.updateServicesChecks = function() {
            var id;
            for (var key in this.services) {
                if(key === "add247") {
                    // Highlight 24/7 button if hours are set that way, and add button for all places
                    var oh = this.item.attributes.openingHours;
                    if (oh.length === 1 && oh[0].days.length === 7 && oh[0].fromHour === "00:00" && oh[0].toHour === "00:00") {
                        this.services.add247.checked = true;
                    } else {
                        this.services.add247.checked = false;
                    }
                    this.services.add247.active = true;
                } else {
                    id = this.services[key].id;
                    var checked = isChecked("service-checkbox-" + id);
                    this.services[key].checked = checked;
                    this.services[key].active = this.services[key].active || checked;   // Display any service that is checked.
                }
            }
        };

        // This highlights the changed fields as green.
        this.highlightChangedFields = function() {
            var _css = { "background-color":"#cec" };
            var tab1HL = false;
            var tab2HL = false;
            if (this.updatedFields.name) {
                $(".form-control[name=name]").css(_css);
                tab1HL = true;
            }
            if (this.updatedFields.aliases) {
                var field = $(".alias-name.form-control")[0];
                if (field) {
                    $(field).css(_css);
                    tab1HL = true;
                }
            }
            if (this.updatedFields.categories) {
                $(".select2-choices").css(_css);
                tab1HL = true;
            }
            if (this.updatedFields.brand) {
                $(".form-control[name=brand]").css(_css);
                tab1HL = true;
            }
            if (this.updatedFields.description) {
                $(".form-control[name=description]").css(_css);
                tab1HL = true;
            }
            if (this.updatedFields.lockRank) {
                $(".form-control[name=lockRank]").css(_css);
                tab1HL = true;
            }
            if (this.updatedFields.address) {
                $('.full-address')[0].css(_css);
                tab1HL = true;
            }
            if (this.updatedFields.url) {
                $(".form-control[name=url]").css(_css);
                tab2HL = true;
            }
            if (this.updatedFields.phone) {
                $(".form-control[name=phone]").css(_css);
                tab2HL = true;
            }
            if (this.updatedFields.openingHours) {
                $(".opening-hours").css(_css);
                tab2HL = true;
            }
            for (var k in this.updatedFields.services) {
                if (this.updatedFields.services[k]) {
                    var $scb = $("#service-checkbox-" + k);
                    if ($scb.length > 0) {
                        $scb.parent().css(_css);
                        tab2HL = true;
                    }
                }
            }

            if (tab1HL) {
                $("a[href='#landmark-edit-general']").css(_css);
            }
            if (tab2HL) {
                $("a[href='#landmark-edit-more-info']").css(_css);
            }
        };


        //////////////////////
        // Unsorted Methods //
        //////////////////////



        // Normalize url
        this.normalizeUrl = function(s) {
            if (!s || s.trim().length === 0) {  // Notify that url is missing and provide web search to find website and gather data (provided for all editors)
                this.flags.urlMissing.active = true;
                if (currentWL.urlWL) {
                    this.flags.urlMissing.WLactive = false;
                    this.flags.urlMissing.severity = 0;
                }
                this.flags.webSearch.active = true;  // Activate websearch button
                return s;
            }

            s = s.replace(/ \(.*/g, "");  // remove anything with parentheses after it
            s = s.replace(/ /g, "");  // remove any spaces
            s = s.replace(/^http:\/\//, "");  // remove http://
            s = s.replace(/^(?:https?:\/\/)?[^\/]+/i, function(t) { return t.toLowerCase(); });
            s = s.replace(/\/(?:(?:pages\/)?(?:welcome|default)\.aspx|index\.(?:html?|php))$/i, ""); // Remove unneeded terms
            s = s.replace(/\/$/i, "");  // remove final slash

            if (!s || s.trim().length === 0) {
                return 'badURL';
            }

            //this.item.attributes.url = str;
            return s;
        };

        // NOTE: Not refactored yet.
        // Normalize phone number
        this.normalizePhone = function(s, outputFormat, returnType) {
            if ( !s && returnType === 'existing' ) {
                this.flags.phoneMissing.active = true;
                if (currentWL.phoneWL) {
                    this.flags.phoneMissing.WLactive = false;
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
                        this.flags.phoneInvalid.active = true;
                        return s;
                    }
                } else {
                    return String.plFormat(outputFormat, m[1], m[2], m[3]);
                }
            } else {
                return String.plFormat(outputFormat, m[1], m[2], m[3]);
            }
        };

        // NOTE: Not refactored yet.
        // Function to remove unnecessary aliases
        this.removeSFAliases = function(nName, nAliases) {
            var newAliasesUpdate = [];
            nName = nName.toUpperCase().replace(/'/g,'').replace(/-/g,' ').replace(/\/ /g,' ').replace(/ \//g,' ').replace(/ {2,}/g,' ');
            for (var naix=0; naix<nAliases.length; naix++) {
                if ( !nName.startsWith( nAliases[naix].toUpperCase().replace(/'/g,'').replace(/-/g,' ').replace(/\/ /g,' ').replace(/ \//g,' ').replace(/ {2,}/g,' ') ) ) {
                    newAliasesUpdate.push(nAliases[naix]);
                } else {
                    //phlogdev('Unnecessary alias removed: ' + nAliases[naix]);
                    this.flags.sfAliases.active = true;
                }
            }
            return newAliasesUpdate;
        };


        ///////////////////////
        // Harmony Use-cases //   Formerly bannButt
        ///////////////////////
        this.flags = {
            // Simple flags that are NOT whitelistable.
            hnDashRemoved:          { active: false, severity: 0, message: "Dash removed from house number; verify." },
            fullAddressInference:   { active: false, severity: 3, message: 'Missing address was inferred from nearby segments. Verify the address and run script again.' },
            nameMissing:            { active: false, severity: 3, message: 'Name is missing.' },
            hoursOverlap:           { active: false, severity: 3, message: 'Overlapping hours of operation. Place might not save.' },
            restAreaGas:            { active: false, severity: 3, message: 'Gas stations at Rest Areas should be separate area places.' },
            gasUnbranded:           { active: false, severity: 3, message: '"Unbranded" should not be used for the station brand. Change to correct brand or use the blank entry at the top of the brand list.' },
            pnhCatMess:             { active: false, severity: -1, message: 'WMEPH: placeholder (please report this error if you see this message)' },
            bankType1:              { active: false, severity: 3, message: 'Clarify the type of bank: the name has ATM but the primary category is Offices' },
            checkDescription:       { active: false, severity: 2, message: 'Description field already contained info; PNH description was added in front of existing. Check for inconsistency or duplicate info.' },
            overlapping:            { active: false, severity: 2, message: 'Place points are stacked up.' },
            catPostOffice:          { active: false, severity: 2, message: 'If this is not a USPS post office, change the category, as "Post Office" is only used for USPS locations.' },
            ignEdited:              { active: false, severity: 2, message: 'Last edited by an IGN editor' },
            wazeBot:                { active: false, severity: 2, message: 'Edited last by an automated process. Please verify information is correct.' },
            mismatch247:            { active: false, severity: 2, message: 'Hours of operation listed as open 24hrs but not for all 7 days.' },
            phoneInvalid:           { active: false, severity: 2, message: 'Phone invalid.' },

            // Simple flags that ARE whitelistable.
            parentCategory:         { active: false, severity: 2, message: 'This parent category is usually not mapped in this region.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist parent Category', WLkey: 'parentCategory',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },
            suspectDesc:            { active: false, severity: 2, message: 'Description field might contain copyrighted info.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist description', WLkey: 'suspectDesc',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },
            resiTypeName:           { active: false, severity: 2, message: 'The place name suggests a residential place or personalized place of work.  Please verify.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist Residential-type name', WLkey: 'resiTypeName',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },
            areaNotPointMid:        { active: false, severity: 2, message: 'This category is usually an area place, but can be a point in some cases. Verify if point is appropriate.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist area (not point)', WLkey: 'areaNotPoint',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },
            pointNotAreaMid:        { active: false, severity: 2, message: 'This category is usually a point place, but can be a area in some cases. Verify if area is appropriate.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist point (not area)', WLkey: 'pointNotArea',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },
            plaNameMissing:         { active: false, severity: 1, message: 'Name is missing.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist missing name', WLkey: 'plaNameMissing',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },
            unmappedRegion:         { active: false, severity: 3, message: 'This category is usually not mapped in this region.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist unmapped category', WLkey: 'unmappedRegion',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },
            restAreaName:           { active: false, severity: 3, message: 'Rest area name is out of spec. Use the Rest Area wiki button below to view formats.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist rest area name', WLkey: 'restAreaName',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },
            hnNonStandard:          { active: false, severity: 3, message: 'House number is non-standard.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist non-standard HN', WLkey: 'hnNonStandard',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },
            HNRange:                { active: false, severity: 2, message: 'House number seems out of range for the street name. Verify.', value: '',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist HN range', WLkey: 'HNRange',
                WLaction: function() { whitelistAction(_this.id, this.WLkey); }
            },

            // Complex flags
            restAreaSpec: {  // if it appears to be a rest area
                active: false, severity: 3, message: "Is this a rest area?",
                buttons: [{
                    text: 'Yes',
                    title: 'Update with proper categories and services.',
                    action: function() {
                        //var actions = [];
                        // update categories according to spec
                        _this.newCategories = insertAtIX(_this.newCategories,"TRANSPORTATION",0);  // Insert/move TRANSPORTATION category in the first position
                        _this.newCategories = insertAtIX(_this.newCategories,"SCENIC_LOOKOUT_VIEWPOINT",1);  // Insert/move SCENIC_LOOKOUT_VIEWPOINT category in the 2nd position

                        _this.queueUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        // make it 24/7
                        _this.queueUpdateAction({ openingHours: [{days: [1,2,3,4,5,6,0], fromHour: "00:00", toHour: "00:00"}] });
                        _this.updatedFields.openingHours = true;
                        _this.services.add247.checked = true;
                        _this.services.addParking.action(true);  // add parking service
                        _this.services.addWheelchair.action(true);  // add parking service
                        _this.flags.restAreaSpec.active = false;  // reset the display flag

                        _this.submitMultiAction();

                        _disableHighlightTest = true;
                        harmonizePlaceGo(this.item,'harmonize');
                        _disableHighlightTest = false;
                        applyHighlightsTest(this.item);
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist place', WLkey: 'restAreaSpec',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            gasMismatch: {  // if the gas brand and name don't match
                active: false, severity: 3, message: "Gas name and brand don't match.  Move brand to name?",
                buttons: [{
                    text: 'Yes',
                    title: 'Change the primary name to the brand and make the current name the alt-name.',
                    action: function() {
                        _this.newAliases = insertAtIX(_this.newAliases, _this.newName, 0);
                        for (var naix=0; naix<_this.newAliases.length; naix++) {
                            _this.newAliases[naix] = toTitleCase(_this.newAliases[naix]);
                        }
                        _this.newName = this.item.attributes.brand;
                        _this.newAliases = _this.removeSFAliases(_this.newName, _this.newAliases);
                        //W.model.actionManager.add(new UpdateObject(_this.item, { name: _this.newName, aliases: _this.newAliases }));
                        _this.queueUpdateAction({ name: _this.newName, aliases: _this.newAliases });
                        _this.updatedFields.name = true;
                        _this.updatedFields.aliases = true;
                        _this.highlightChangedFields();
                        _this.flags.gasMismatch.active = false;  // reset the display flag
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist gas brand mismatch', WLkey: 'gasMismatch',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },


            gasMkPrim: {  // no WL
                active: false, severity: 3,  message: "Gas Station is not the primary category",
                buttons: [{
                    text: 'Fix',
                    title: 'Make the Gas Station category the primary category.',
                    action: function() {
                        _this.newCategories = insertAtIX(_this.newCategories,"GAS_STATION",0);  // Insert/move Gas category in the first position
                        //var actions = [];
                        _this.queueUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.flags.gasMkPrim.active = false;  // reset the display flag
                        _this.submitMultiAction();
                        harmonizePlaceGo(this.item,'harmonize');
                    }
                }]
            },

            hotelMkPrim: {
                active: false, severity: 3, message: "Hotel category is not first",
                buttons: [{
                    text: 'Fix',
                    title: 'Make the Hotel category the primary category.',
                    action: function() {
                        _this.newCategories = insertAtIX(_this.newCategories,"HOTEL",0);  // Insert/move Hotel category in the first position
                        //var actions = [];
                        _this.queueUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.flags.hotelMkPrim.active = false;  // reset the display flag
                        _this.submitMultiAction();
                        harmonizePlaceGo(this.item,'harmonize');
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist hotel as secondary category', WLkey: 'hotelMkPrim',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },
            changeHMC2OfficeButton: {
                active: false, severity: -1, message: '',
                buttons: [{
                    text: 'Change to Offices',
                    action: function() { _this.flags.changeHMC2Office.buttons[0].action(); }
                }]
            },

            changeHMC2Office: {
                active: false, severity: 3, message: "Keywords suggest this location may not be a hospital or urgent care location.",
                buttons: [{
                    text: 'Change to Offices',
                    title: 'Change to Office Category',
                    action: function() {
                        _this.newCategories[_this.newCategories.indexOf('HOSPITAL_MEDICAL_CARE')] = "OFFICES";
                        //var actions = [];
                        _this.queueUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.flags.changeHMC2Office.active = false;  // reset the display flag
                        _this.submitMultiAction();
                        harmonizePlaceGo(this.item,'harmonize');  // Rerun the script to update fields and lock
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist Hospital category', WLkey: 'changeHMC2Office',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            changeHMC2PetVet: {
                active: false, severity: 3, message: "This looks like it should be a Pet/Veterinarian category. Change?",
                buttons: [{
                    text: 'Yes',
                    title: 'Change to Pet/Veterinarian Category',
                    action: function() {
                        _this.newCategories[_this.newCategories.indexOf('HOSPITAL_MEDICAL_CARE')] = "PET_STORE_VETERINARIAN_SERVICES";
                        //var actions = [];
                        _this.queueUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.flags.changeHMC2PetVet.active = false;  // reset the display flag
                        _this.submitMultiAction();
                        harmonizePlaceGo(this.item,'harmonize');  // Rerun the script to update fields and lock
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist PetVet category', WLkey: 'changeHMC2PetVet',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            changeSchool2Offices: {
                active: false, severity: 3, message: "This doesn't look like it should be School category.",
                buttons: [{
                    text: 'Change to Office',
                    title: 'Change to Offices Category',
                    action: function() {
                        _this.newCategories[_this.newCategories.indexOf('SCHOOL')] = "OFFICES";
                        //var actions = [];
                        _this.queueUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.flags.changeSchool2Offices.active = false;  // reset the display flag
                        _this.submitMultiAction();
                        harmonizePlaceGo(this.item,'harmonize');  // Rerun the script to update fields and lock
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist School category', WLkey: 'changeSchool2Offices',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            pointNotArea: {  // Area 2 Point button
                active: false, severity: 3, message: "This category should be a point place.",
                buttons: [{
                    text: 'Change to point',
                    title: 'Change to point place',
                    action: function() {
                        // If a stop point is set, use it for the point, else use Centroid
                        var newGeometry;
                        if (this.item.attributes.entryExitPoints.length > 0) {
                            newGeometry = this.item.attributes.entryExitPoints[0].point;
                        } else {
                            newGeometry = this.item.geometry.getCentroid();
                        }
                        updateFeatureGeometry(this.item, newGeometry);
                        _this.flags.pointNotArea.active = false;
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist point (not area)', WLkey: 'pointNotArea',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            areaNotPoint: {  // Point 2 Area button
                active: false, severity: 3, message: "This category should be an area place.",
                buttons: [{
                    text: 'Change to area',
                    title: 'Change to Area',
                    action: function() {
                        // If a stop point is set, use it for the point, else use Centroid
                        updateFeatureGeometry(this.item, this.item.getPolygonGeometry());
                        _this.flags.areaNotPoint.active = false;
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist area (not point)', WLkey: 'areaNotPoint',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            hnMissing: {
                active: false, severity: 3, message: 'No HN',
                input: '<input type="text" id="WMEPH-HNAdd" autocomplete="off" class="wmeph-input-box">',
                badInput: false,
                buttons: [{
                    text: "Add",
                    title: 'Add HN to place',
                    action: function() {
                        var newHN = $('#WMEPH-HNAdd').val();
                        newHN = newHN.replace(/ +/g, '');
                        phlogdev(newHN);
                        var hnTemp = newHN.replace(/[^\d]/g, '');
                        var hnTempDash = newHN.replace(/[^\d-]/g, '');
                        if (hnTemp > 0 && hnTemp < 1000000) {
                            _this.addUpdateAction({ houseNumber: hnTempDash });
                            _this.updatedFields.address = true;
                            _this.flags.hnMissing.active = false;
                            this.badInput = false;
                        } else {
                            this.badInput = true;
                        }

                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist empty HN', WLkey: 'HNWL',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            streetMissing: {  // no WL
                active: false, severity: 3, message: 'No street',
                input: '<div class="ui-widget"><input id="WMEPH_missingStreet" class="ui-autocomplete-input"></div>',
                buttons: [{
                    text: 'Add',
                    id: "WMEPH_addStreetBtn",
                    title: "Add street to place",
                    action: function() {
                        addStreetToVenue(_this.item);
                    }
                }]
            },

            cityMissing: {  // no WL
                active: false, severity: 3, message: 'No city',
                buttons: [{
                    text: 'Edit address',
                    title: "Edit address to add city.",
                    action: function() {
                        $('.nav-tabs a[href="#landmark-edit-general"]').trigger('click');
                        $('.waze-icon-edit').trigger('click');
                        if (isChecked('.empty-city')) {
                            $('.empty-city').trigger('click');
                        }
                        $('.city-name').focus();
                    }
                }]
            },

            bankBranch: {  // no WL
                active: false, severity: 1, message: 'Is this a bank branch office?',
                buttons: [{
                    text: 'Yes',
                    title: 'Is this a bank branch?',
                    action: function() {
                        _this.newCategories = ['BANK_FINANCIAL','ATM'];  // Change to bank and atm cats
                        _this.newName = _this.newName.replace(/[\- (]*ATM[\- )]*/g, ' ').replace(/^ /g,'').replace(/ $/g,'');     // strip ATM from name if present
                        _this.addUpdateAction({ name: _this.newName, categories: _this.newCategories });
                        _this.updatedFields.name = true;
                        _this.updatedFields.categories = true;
                        _this.highlightChangedFields(_this.updatedFields);
                        _this.flags.bankCorporate.active = false;   // reset the bank Branch display flag
                        _this.flags.bankBranch.active = false;   // reset the bank Branch display flag
                        _this.flags.standaloneATM.active = false;   // reset the standalone ATM display flag
                        _this.flags.bankType1.active = false;  // remove bank type warning
                    }
                }]
            },

            standaloneATM: { // no WL
                active: false, severity: 2, message: 'Or is this a standalone ATM?',
                buttons: [{
                    text: 'Yes',
                    title: 'Is this a standalone ATM with no bank branch?',
                    action: function() {
                        if (_this.newName.indexOf('ATM') === -1) {
                            _this.newName = _this.newName + ' ATM';
                        }
                        _this.newCategories = ['ATM'];  // Change to ATM only
                        _this.addUpdateAction({ name: _this.newName, categories: _this.newCategories });
                        _this.updatedFields.name = true;
                        _this.updatedFields.categories = true;
                        _this.highlightChangedFields();
                        _this.flags.bankCorporate.active = false;   // reset the bank Branch display flag
                        _this.flags.bankBranch.active = false;   // reset the bank Branch display flag
                        _this.flags.standaloneATM.active = false;   // reset the standalone ATM display flag
                        _this.flags.bankType1.active = false;  // remove bank type warning
                    }
                }]
            },

            bankCorporate: {  // no WL
                active: false, severity: 1, message: "Or is this the bank's corporate offices?",
                buttons: [{
                    text: "Yes",
                    title: "Is this the bank's corporate offices?",
                    action: function() {
                        _this.newCategories = ["OFFICES"];  // Change to offices category
                        _this.newName = _this.newName.replace(/[\- (]*atm[\- )]*/ig, ' ').replace(/^ /g,'').replace(/ $/g,'').replace(/ {2,}/g,' ');     // strip ATM from name if present
                        _this.addUpdateAction({ name: _this.newName + ' - Corporate Offices', categories: _this.newCategories });
                        _this.updatedFields.name = true;
                        _this.updatedFields.categories = true;
                        _this.highlightChangedFields();
                        _this.flags.bankCorporate.active = false;   // reset the bank Branch display flag
                        _this.flags.bankBranch.active = false;   // reset the bank Branch display flag
                        _this.flags.standaloneATM.active = false;   // reset the standalone ATM display flag
                        _this.flags.bankType1.active = false;  // remove bank type warning
                    }
                }]
            },

            longURL: {
                active: false, severity: 1, message: 'Existing URL doesn\'t match the suggested PNH URL. Use the Place Website button below to verify. If existing URL is invalid:',
                buttons: [{
                    text: "Use PNH URL",
                    title: "Change URL to the PNH standard",
                    action: function() {
                        if (tempPNHURL !== '') {
                            _this.addUpdateAction({ url: tempPNHURL });
                            _this.updatedFields.url = true;
                            _this.highlightChangedFields();
                            _this.flags.longURL.active = false;
                            updateURL = true;
                        } else {
                            if (confirm('WMEPH: URL Matching Error!\nClick OK to report this error') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                                forumMsgInputs = {
                                    subject: 'WMEPH URL comparison Error report',
                                    message: 'Error report: URL comparison failed for "' + _this.item.attributes.name + '"\nPermalink: ' + _this.permalink
                                };
                                WMEPH_errorReport(forumMsgInputs);
                            }
                        }
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist existing URL', WLkey: 'longURL',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            gasNoBrand: {
                active: false, severity: 1, message: 'Verify that gas station has no brand.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist no gas brand', WLkey: 'gasNoBrand',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            subFuel: {
                active: false, severity: 1, message: 'Make sure this place is for the gas station itself and not the main store building.  Otherwise undo and check the categories.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist no gas brand', WLkey: 'subFuel',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            areaNotPointLow: {
                active: false, severity: 1, message: 'This category is usually an area place, but can be a point in some cases. Verify if point is appropriate.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist area (not point)', WLkey: 'areaNotPoint',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            pointNotAreaLow: {
                active: false, severity: 1, message: 'This category is usually a point place, but can be a area in some cases. Verify if area is appropriate.',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist point (not area)', WLkey: 'pointNotArea',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            formatUSPS: {  // ### needs WL or not?
                active: false, severity: 1, message: 'Localize the post office according to this region\'s standards for USPS locations (e.g., "USPS - Tampa")'
            },

            catHotel: {
                active: false, severity: 1, message: 'Check hotel website for any name localization (e.g. Hilton - Tampa Airport)',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist hotel localization', WLkey: 'hotelLocWL',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            localizedName: {
                active: false, severity: 1, message: 'Place needs localization information',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist localization', WLkey: 'localizedName',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            specCaseMessage: {  // no WL
                active: false, severity: 1, message: 'WMEPH: placeholder (please report this error if you see this message)'
            },

            specCaseMessageLow: {  // no WL
                active: false, severity: 0, message: 'WMEPH: placeholder (please report this error if you see this message)'
            },

            extProviderMissing: {
                active: false, severity: 3, message: 'No external provider link(s)',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist missing external provider', WLkey: 'extProviderMissing',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            urlMissing: {
                active: false, severity: 1, message: 'No URL',
                input: '<input type="text" id="WMEPH-UrlAdd" autocomplete="off" class="wmeph-input-box">',
                badInput: false,
                buttons: [{
                    text: "Add",
                    title: 'Add URL to place',
                    action: function() {
                        var newUrlValue = $('#WMEPH-UrlAdd').val();
                        var newUrl = this.normalizeURL(newUrlValue, true);
                        if ((!newUrl || newUrl.trim().length === 0) || newUrl === 'badURL') {
                            this.badInput = true;
                        } else {
                            phlogdev(newUrl);
                            _this.addUpdateAction({ url: newUrl });
                            _this.updatedFields.url = true;
                            _this.flags.urlMissing.active = false;
                            _this.flags.PlaceWebsite.active = true;
                            this.badInput = false;
                        }
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist empty URL', WLkey: 'urlWL',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            phoneMissing: {
                active: false, severity: 1, message: 'No Ph#',
                input: '<input type="text" id="WMEPH-PhoneAdd" autocomplete="off" class="wmeph-input-box">',
                badInput: false,
                buttons: [{
                    text: "Add",
                    title: 'Add phone to place',
                    action: function() {
                        var newPhoneVal = $('#WMEPH-PhoneAdd').val();
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
                                        _this.flags.badAreaCode.active = true;
                                        if (currentWL.aCodeWL) {
                                            _this.flags.badAreaCode.WLactive = false;
                                        }
                                    }
                                }
                            }
                            _this.addUpdateAction({ phone: newPhone });
                            _this.updatedFields.phone = true;
                            _this.flags.phoneMissing.active = false;
                        }
                    }
                }],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist empty phone', WLkey: 'phoneWL',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            badAreaCode: {
                active: false, severity: 1, message: '<span class="wmeph-label">Area Code mismatch</span>',
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist the area code', WLkey: 'aCodeWL',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
                }
            },

            noHours: {
                active: false, severity: 1, message: 'No hours',
                input: '<input type="textarea" value="Paste Hours Here" id="WMEPH-HoursPaste" autocomplete="off" class="wmeph-input-box">',
                buttons: [
                    {
                        text: '<span class="fa fa-plus"></span>',
                        title: 'Add pasted hours to existing',
                        action: function() {
                            var pasteHours = $('#WMEPH-HoursPaste').val();
                            phlogdev(pasteHours);
                            $('.nav-tabs a[href="#landmark-edit-more-info"]').tab('show');
                            pasteHours = pasteHours + ',' + getOpeningHours(this.item).join(',');
                            var hoursObjectArray = parseHours(pasteHours);
                            if (hoursObjectArray !== false) {
                                phlogdev(hoursObjectArray);
                                _this.addUpdateAction({ openingHours: hoursObjectArray });
                                _this.updatedFields.openingHours = true;
                                _this.highlightChangedFields();
                                _this.flags.noHours.severity = 0;
                                _this.flags.noHours.WLactive = false;
                                _this.flags.noHours.message = 'Hours';
                                _this.flags.noHours.input = '<input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste" class="wmeph-input-box">';
                            } else {
                                phlog('Can\'t parse those hours');
                                _this.flags.noHours.severity = 1;
                                _this.flags.noHours.WLactive = true;
                                _this.flags.noHours.input = '<input type="text" value="Can\'t parse, try again" id="WMEPH-HoursPaste" class="wmeph-input-box">';
                            }
                        }
                    },
                    {
                        text: '<span class="fa fa-refresh"></span>',
                        title: 'Replace existing hours with pasted hours',
                        id: 'WMEPH_noHours_replace',
                        action: function() {
                            var pasteHours = $('#WMEPH-HoursPaste').val();
                            phlogdev(pasteHours);
                            $('.nav-tabs a[href="#landmark-edit-more-info"]').tab('show');
                            var hoursObjectArray = parseHours(pasteHours);
                            if (hoursObjectArray !== false) {
                                phlogdev(hoursObjectArray);
                                this.item.attributes.openingHours.push.apply(this.item.attributes.openingHours, hoursObjectArray);
                                _this.addUpdateAction({ openingHours: hoursObjectArray });
                                _this.updatedFields.openingHours = true;
                                _this.highlightChangedFields();
                                _this.flags.noHours.severity = 0;
                                _this.flags.noHours.WLactive = false;
                                _this.flags.noHours.message = 'Hours';
                                _this.flags.noHours.input = '<input type="text" value="Paste Hours Here" id="WMEPH-HoursPaste" class="wmeph-input-box">';
                            } else {
                                phlog('Can\'t parse those hours');
                                _this.flags.noHours.severity = 1;
                                _this.flags.noHours.WLactive = true;
                                _this.flags.noHours.input = '<input type="text" value="Can\'t parse, try again" id="WMEPH-HoursPaste" class="wmeph-input-box">';
                            }

                        }
                    }
                ],
                WLactive: true, WLmessage: '', WLtitle: 'Whitelist no Hours', WLkey: 'noHours',
                WLaction: function() {
                    whitelistAction(_this.id, this.WLkey);
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
                active: false, severity: 0, message: 'Lock this residential point?',
                buttons: [{
                    text: "Lock",
                    title: 'Lock the residential point',
                    action: function() {
                        var RPPlevelToLock = $("#RPPLockLevel :selected").val() || defaultLock + 1;
                        phlogdev('RPPlevelToLock: '+ RPPlevelToLock);

                        RPPlevelToLock = RPPlevelToLock -1 ;
                        _this.addUpdateAction({ lockRank: RPPlevelToLock });
                        // no field highlight here
                        _this.flags.lockRPP.message = 'Current lock: '+ (parseInt(this.item.attributes.lockRank)+1) +'. '+RPPLockString+' ?';
                    }
                }]
            },

            addAlias: {    // no WL
                active: false, severity: 0, message: "Is " + _this.optAlias + " at this location?",
                buttons: [{
                    text: "Yes",
                    title: 'Add ' + _this.optAlias,
                    action: function() {
                        _this.newAliases = insertAtIX(_this.newAliases,_this.optAlias,0);
                        if (specCases.indexOf('altName2Desc') > -1 &&  this.item.attributes.description.toUpperCase().indexOf(_this.optAlias.toUpperCase()) === -1 ) {
                            newDescripion = _this.optAlias + '\n' + newDescripion;
                            _this.addUpdateAction({ description: newDescripion });
                            _this.updatedFields.description = true;
                            _this.highlightChangedFields();
                        }
                        _this.newAliases = _this.removeSFAliases(_this.newName, _this.newAliases);
                        _this.addUpdateAction({ aliases: _this.newAliases });
                        _this.updatedFields.aliases = true;
                        _this.highlightChangedFields();
                        _this.flags.addAlias.active = false;  // reset the display flag
                    }
                }]
            },

            addCat2: {   // no WL
                active: false, severity: 0, message: "Is there a " + _this.newCategories[0] + " at this location?",
                buttons: [{
                    text: "Yes",
                    title: 'Add ' + _this.newCategories[0],
                    action: function() {
                        _this.newCategories.push.apply(_this.newCategories,altCategories);
                        _this.addUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.highlightChangedFields();
                        _this.flags.addCat2.active = false;  // reset the display flag
                    }
                }]
            },

            addPharm: {   // no WL
                active: false, severity: 0, message: "Is there a Pharmacy at this location?",
                buttons: [{
                    text: "Yes",
                    title: 'Add Pharmacy category',
                    action: function() {
                        _this.newCategories = insertAtIX(_this.newCategories, 'PHARMACY', 1);
                        _this.addUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.highlightChangedFields();
                        _this.flags.addPharm.active = false;  // reset the display flag
                    }
                }]
            },

            addSuper: {   // no WL
                active: false, severity: 0, message: "Does this location have a supermarket?",
                buttons: [{
                    text: "Yes",
                    title: 'Add Supermarket category',
                    action: function() {
                        _this.newCategories = insertAtIX(_this.newCategories, 'SUPERMARKET_GROCERY', 1);
                        _this.addUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.highlightChangedFields();
                        _this.flags.addSuper.active = false;  // reset the display flag
                    }
                }]
            },

            appendAMPM: {   // no WL
                active: false, severity: 0, message: "Is there an ampm at this location?", id: "appendAMPM",
                buttons: [{
                    text: "Yes",
                    title: 'Add ampm to the place',
                    action: function() {
                        _this.newCategories = insertAtIX(_this.newCategories, 'CONVENIENCE_STORE', 1);
                        _this.newName = 'ARCO ampm';
                        newURL = 'ampm.com';
                        _this.addUpdateAction({ name: _this.newName, url: newURL, categories: _this.newCategories });
                        _this.updatedFields.name = true;
                        _this.updatedFields.url = true;
                        _this.updatedFields.categories = true;
                        _this.highlightChangedFields();
                        _this.flags.appendAMPM.active = false;  // reset the display flag
                        _this.flags.addConvStore.active = false;  // also reset the addConvStore display flag
                    }
                }]
            },

            addATM: {    // no WL
                active: false, severity: 0, message: "ATM at location? ",
                buttons: [{
                    text: "Yes",
                    title: "Add the ATM category to this place",
                    action: function() {
                        _this.newCategories = insertAtIX(_this.newCategories,"ATM",1);  // Insert ATM category in the second position
                        _this.addUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.highlightChangedFields();
                        _this.flags.addATM.active = false;   // reset the display flag
                    }
                }]
            },

            addConvStore: {  // no WL
                active: false, severity: 0, message: "Add convenience store category? ",
                buttons: [{
                    text: "Yes",
                    title: "Add the Convenience Store category to this place",
                    action: function() {
                        _this.newCategories = insertAtIX(_this.newCategories,"CONVENIENCE_STORE",1);  // Insert C.S. category in the second position
                        _this.addUpdateAction({ categories: _this.newCategories });
                        _this.updatedFields.categories = true;
                        _this.highlightChangedFields();
                        _this.flags.addConvStore.active = false;   // reset the display flag
                    }
                }]
            },

            isitUSPS: {  // no WL
                active: false, severity: 0, message: "Is this a USPS location? ",
                buttons: [{
                    text: "Yes",
                    title: "Is this a USPS location?",
                    action: function() {
                        _this.services.addAC.action(true);
                        _this.services.addCreditCards.action(true);
                        _this.services.addParking.action(true);
                        _this.services.addDeliveries.action(true);
                        _this.services.addWheelchair.action(true);
                        _this.addUpdateAction({ url: "usps.com" });
                        _this.updatedFields.url = true;
                        _this.highlightChangedFields();
                        if (myPlace.psRegion === 'SER') {
                            _this.addUpdateAction({ aliases: ["United States Postal Service"] });
                            _this.updatedFields.aliases = true;
                            _this.highlightChangedFields();
                        }
                        _this.flags.isitUSPS.active = false;
                    }
                }]
            },

            STC: {    // no WL
                active: false, severity: 0, message: "Force Title Case: ",
                buttons: [{
                    text: "Yes",
                    title: "Force Title Case to InterNal CaPs",
                    action: function() {
                        _this.newName = toTitleCaseStrong(this.item.attributes.name, isPLA(this.item));  // Get the Strong Title Case name
                        if (_this.newName !== this.item.attributes.name) {  // if they are not equal
                            _this.addUpdateAction({ name: _this.newName });
                            _this.updatedFields.name = true;
                            _this.highlightChangedFields();
                        }
                        _this.flags.STC.active = false;  // reset the display flag
                    }
                }]
            },

            sfAliases: {
                active: false, severity: 0, message: 'Unnecessary aliases were removed.'
            },

            placeMatched: {
                active: false, severity: 0, message: 'Place matched from PNH data.'
            },

            placeLocked: {
                active: false, severity: 0, message: 'Place locked  <span class="fa fa-lock"></span>'
            },

            PlaceWebsite: {
                active: false, severity: -1, message: "",
                buttons: [{
                    text: "Place Website",
                    title: "Direct link to place website", fullWidthButton: true,
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
                            if (/^https?:\/\//.test(this.item.attributes.url)) {
                                openPlaceWebsiteURL = this.item.attributes.url;
                            } else {
                                openPlaceWebsiteURL = 'http://' + this.item.attributes.url;
                            }
                        }
                        // open the link depending on new window setting
                        if (linkProceed) {
                            if ( isChecked("WMEPH-WebSearchNewTab") ) {
                                openWindow(openPlaceWebsiteURL);
                            } else {
                                window.open(openPlaceWebsiteURL, searchResultsWindowName, searchResultsWindowSpecs);
                            }
                        }
                    }
                }]
            },

            webSearch: {
                active: false, severity: -1, message: "",
                buttons: [{
                    text: 'Web Search <span class="fa fa-search"></span>',
                    title: "Search the web for this place.  Do not copy info from 3rd party sources!",
                    fullWidthButton: true,
                    action: function() {
                        if (localStorage.getItem(GLinkWarning) !== '1') {
                            if (confirm('***Please DO NOT copy info from Google or third party sources.*** This link is to help you find the business webpage.\nClick OK to agree and continue.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                                localStorage.setItem(GLinkWarning, '1');
                            }
                        }
                        if (localStorage.getItem(GLinkWarning) === '1') {
                            if ( isChecked("WMEPH-WebSearchNewTab") ) {
                                openWindow(buildGLink(_this.newName,_this.item.getAddress().attributes,_this.item.attributes.houseNumber));
                            } else {
                                window.open(buildGLink(_this.newName,_this.item.getAddress().attributes,_this.item.attributes.houseNumber), searchResultsWindowName, searchResultsWindowSpecs);
                            }
                        }
                    }
                }]
            },

            NewPlaceSubmit: {
                active: false, severity: -1, id: 'wmeph-no-pnh-row', message: "No PNH match. If it's a chain: ",
                buttons: [{
                    text: "Submit new chain data",
                    title: "Submit info for a new chain through the linked form",
                    fullWidthButton: true,
                    action: function() {
                        window.open(_this.newPlaceURL);
                    }
                }]
            },

            ApprovalSubmit: {
                active: false, severity: -1, message: "PNH data exists but is not approved for this region: ", verticalLayout: true,
                buttons: [{
                    text: "Request approval",
                    title: "Request region/country approval of this place",
                    action: function() {
                        if ( PMUserList.hasOwnProperty(myPlace.psRegion) && PMUserList[myPlace.psRegion].approvalActive ) {
                            var forumPMInputs = {
                                subject: 'PNH approval for "' + PNHNameTemp + '"',
                                message: ['Please approve "' + PNHNameTemp + '" for the ' + myPlace.psRegion + ' region.  Thanks',
                                          ' ',
                                          'PNH order number: ' + PNHOrderNum,
                                          ' ',
                                          'Example Permalink: ' + _this.permalink,
                                          ' ',
                                          'PNH Link: ' + USAPNHMasURL].join('\n'),
                                preview: 'Preview', attach_sig: 'on'
                            };
                            forumPMInputs['address_list[u]['+PMUserList[myPlace.psRegion].modID+']'] = 'to';  // Sends a PM to the regional mod instead of the submission form
                            WMEPH_newForumPost('https://www.waze.com/forum/ucp.php?i=pm&mode=compose', forumPMInputs);
                        } else {
                            window.open(approveRegionURL);
                        }
                    }
                }]
            }
        };  // END bannButt definitions


        //////////////////////
        // Harmony Services //   Formerly bannServ
        //////////////////////

        // active: false until activated in the script
        // checked: whether the service is already set on the place. Determines grey vs white icon color
        // icon: button icon name
        // value: button text  (Not used for Icons, keep as backup
        // title: tooltip text
        // action: The action that happens if the button is pressed

        this.services = {
            addValet: {  // append optional Alias to the name
                name: "addValet", id: "VALLET_SERVICE",
                active: false, checked: false, w2hratio: 50/50, value: "Valet", title: 'Valet',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addDriveThru: {  // append optional Alias to the name
                name: "addDriveThru", id: "DRIVETHROUGH",
                active: false, checked: false, w2hratio: 78/50, value: "DriveThru", title: 'Drive-Thru',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addWiFi: {  // append optional Alias to the name
                name: "addWiFi", id: "WI_FI",
                active: false, checked: false, w2hratio: 67/50, value: "WiFi", title: 'WiFi',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addRestrooms: {  // append optional Alias to the name
                name: "addRestrooms", id: "RESTROOMS",
                active: false, checked: false, w2hratio: 49/50, value: "Restroom", title: 'Restrooms',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addCreditCards: {  // append optional Alias to the name
                name: "addCreditCards", id: "CREDIT_CARDS",
                active: false, checked: false, w2hratio: 73/50, value: "CC", title: 'Credit Cards',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addReservations: {  // append optional Alias to the name
                name: "addReservations", id: "RESERVATIONS",
                active: false, checked: false, w2hratio: 55/50, value: "Reserve", title: 'Reservations',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addOutside: {  // append optional Alias to the name
                name: "addOutside", id: "OUTSIDE_SEATING",
                active: false, checked: false, w2hratio: 73/50, value: "OusideSeat", title: 'Outside Seating',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addAC: {  // append optional Alias to the name
                name: "addAC", id: "AIR_CONDITIONING",
                active: false, checked: false, w2hratio: 50/50, value: "AC", title: 'AC',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addParking: {  // append optional Alias to the name
                name: "addParking", id: "PARKING_FOR_CUSTOMERS",
                active: false, checked: false, w2hratio: 46/50, value: "Parking", title: 'Parking',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addDeliveries: {  // append optional Alias to the name
                name: "addDeliveries", id: "DELIVERIES",
                active: false, checked: false, w2hratio: 86/50, value: "Delivery", title: 'Deliveries',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addTakeAway: {  // append optional Alias to the name
                name: "addTakeAway", id: "TAKE_AWAY",
                active: false, checked: false, w2hratio: 34/50, value: "TakeOut", title: 'Take Out',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            addWheelchair: {  // add service
                name: "addWheelchair", id: "WHEELCHAIR_ACCESSIBLE",
                active: false, checked: false, w2hratio: 50/50, value: "WhCh", title: 'Wheelchair Accessible',
                pnhOverride: false, action: function(checked) { _this.setServiceChecked(this, checked); }
            },
            add247: {  // add 24/7 hours
                name: "add247",  // Not needed, but did it for consistency
                active: false, checked: false, w2hratio: 73/50, value: "247", title: 'Hours: Open 24\/7',
                action: function() {
                    // This could be moved into setServiceChecked.
                    if (!_this.services.add247.checked) {
                        _this.addUpdateAction({ openingHours: [{days: [1,2,3,4,5,6,0], fromHour: "00:00", toHour: "00:00"}] });
                        _this.updatedFields.openingHours = true;
                        _this.highlightChangedFields();
                        _this.services.add247.checked = true;
                        _this.flags.noHours.active = false;
                    }
                }
            }
        };
    }

    ////////////////////////////
    // Harmony Public Methods //
    ////////////////////////////

    // Functions that need to be called from the outside but do not need access to private variables.
    /* Example:
    Harmony.prototype.funcName = function(args) {
        return something;
    }
    */

    // Immediately adds an action to the action manager.
    Harmony.prototype.addUpdateAction = function(updateObj) {
        var a = W.model.actionManager.getActions().length;
        var act = new UpdateObject(this.item, updateObj);
        W.model.actionManager.add(act);
        var b = W.model.actionManager.getActions().length;
        if (a + 1 !== b) {
            return false;
        }
        return true;
    };

})();



















