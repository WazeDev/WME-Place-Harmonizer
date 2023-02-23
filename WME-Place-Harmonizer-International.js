// ==UserScript==
// @name        WME Place Harmonizer - International
// @namespace   WazeUSA
// @version     2023.02.22.001
// @description Harmonizes, formats, and locks a selected place
// @author      WMEPH Development Group
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @require     https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require     https://greasyfork.org/scripts/37486-wme-utils-hoursparser/code/WME%20Utils%20-%20HoursParser.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// @license     GNU GPL v3
// @connect     greasyfork.org
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// ==/UserScript==

/* global W */
/* global OpenLayers */
/* global _ */
/* global WazeWrap */
/* global LZString */

/* eslint-disable max-classes-per-file */
/* eslint-disable max-len */

(function main() {
    'use strict';

    // Script update info

    // BE SURE TO SET THIS TO NULL OR AN EMPTY STRING WHEN RELEASING A NEW UPDATE.
    const _SCRIPT_UPDATE_MESSAGE = '';
    const _CSS = `
    #edit-panel .venue-feature-editor {
        overflow: initial;
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
    }
    #WMEPH_banner .banner-row.red {
        color:#b51212;
        background-color:#f0dcdc;
    }
    #WMEPH_banner .banner-row.blue {
        color:#3232e6;
        background-color:#dcdcf0;
    }
    #WMEPH_banner .banner-row.yellow {
        color:#584a04;
        background-color:#f0f0c2;
    }
    #WMEPH_banner .banner-row.gray {
        color:#3a3a3a;
        background-color:#eeeeee;
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
    #WMEPH_runButton {
        padding-bottom: 6px;
        padding-top: 3px;
        width: 290;
        color: black;
        font-size: 15px;
        margin-right: auto;
        margin-left: 4px;
    }
    #WMEPH_tools div {
        padding-bottom: 2px !important;
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
    .checkmark{
        display: none
    }',
    .checkmark.draw:after {
        animation-duration: .8s;
        animation-timing-function: ease;
        animation-name: checkmark;
        transform: scaleX(-1) rotate(135deg)}
    .checkmark:after {
        opacity: 1; 
        height: 2em;
        width: 1em;
        transform-origin: left top;
        border-right: 3px solid #5cb85c;
        border-top: 3px solid #5cb85c;
        content: "";
        right: 1em;
        top: 1em;
        position: absolute
    }
    @keyframes checkmark {
        0% {
            height: 0;
            width: 0;
            opacity: 1
        } 
        20%{
            height: 0;
            width: 1em;
            opacity: 1
        }
        40%{
            height: 2em;
            width: 1em;
            opacity: 1
        }
        100%{
            height: 2em;
            width: 1em;
            opacity: 1
        }
    }`;

    let MultiAction;
    let UpdateObject;
    let OpeningHour;

    const _SCRIPT_VERSION = GM_info.script.version.toString(); // pull version from header
    const _SCRIPT_NAME = GM_info.script.name;
    const _IS_BETA_VERSION = /Beta/i.test(_SCRIPT_NAME); //  enables dev messages and unique DOM options if the script is called "... Beta"
    const _BETA_VERSION_STR = _IS_BETA_VERSION ? 'Beta' : ''; // strings to differentiate DOM elements between regular and beta script
    const _DEFAULT_HOURS_TEXT = 'Paste Hours Here';
    const _MAX_CACHE_SIZE = 25000;
    let _resultsCache = {};
    let _initAlreadyRun = false; // This is used to skip a couple things if already run once.  This could probably be handled better...
    let _textEntryValues = null; // Store the values entered in text boxes so they can be re-added when the banner is reassembled.

    // Userlists
    let _wmephDevList;
    let _wmephBetaList;

    let _shortcutParse;
    let _modifKey = 'Alt+';

    // Whitelisting vars
    let _venueWhitelist;
    let _venueWhitelistStr;
    let _WLSToMerge;
    const _WL_LOCAL_STORE_NAME = 'WMEPH-venueWhitelistNew';
    const _WL_LOCAL_STORE_NAME_COMPRESSED = 'WMEPH-venueWhitelistCompressed';

    // Web search Window forming:
    let _searchResultsWindowSpecs = `"resizable=yes, top=${Math.round(window.screen.height * 0.1)}, left=${
        Math.round(window.screen.width * 0.3)}, width=${Math.round(window.screen.width * 0.7)}, height=${Math.round(window.screen.height * 0.8)}"`;
    const _SEARCH_RESULTS_WINDOW_NAME = '"WMEPH Search Results"';
    let _wmephMousePosition;

    // Banner Buttons objects
    let _buttonBanner;
    let _buttonBanner2;
    let _servicesBanner;

    const _PANEL_FIELDS = {}; // the fields for the sidebar
    let _disableHighlightTest = false; // Set to true to temporarily disable highlight checks immediately when venues change.
    let _wl = {};
    const _USER = {
        ref: null,
        rank: null,
        name: null,
        isBetaUser: false,
        isDevUser: false
    };
    const _SETTING_IDS = {
        sfUrlWarning: 'SFURLWarning', // Warning message for first time using localized storefinder URL.
        gLinkWarning: 'GLinkWarning' // Warning message for first time using Google search to not to use the Google info itself.
    };
    const _URLS = {
        forum: 'https://www.waze.com/forum/posting.php?mode=reply&f=819&t=215657'
    };

    // const _PM_USER_LIST = { // user names and IDs for PM functions
    //     SER: {
    //         approvalActive: true,
    //         mods: [
    //             { id: '16888799', name: 'willdanneriv' },
    //             // { id: '17083181', name: 'itzwolf' },
    //             { id: '17077334', name: 'ardan74' }
    //         ]
    //     },
    //     WMEPH: {
    //         approvalActive: true,
    //         mods: [
    //             { id: '2647925', name: 'MapOMatic' }
    //         ]
    //     }
    // };
    // An enum to help clarify flag severity levels
    const _SEVERITY = {
        GREEN: 0,
        BLUE: 1,
        YELLOW: 2,
        RED: 3,
        // 4 isn't used anymore
        PINK: 5
        // TODO: There is also 'lock' and 'lock1' severity. Add those here? Also investigate 'adLock' severity (is it still useful in WME???).
    };
    let _severityButt = _SEVERITY.GREEN; // error tracking to determine banner color (action buttons)

    const _WME_SERVICES_ARRAY = ['VALLET_SERVICE', 'DRIVETHROUGH', 'WI_FI', 'RESTROOMS', 'CREDIT_CARDS', 'RESERVATIONS', 'OUTSIDE_SEATING',
        'AIR_CONDITIONING', 'PARKING_FOR_CUSTOMERS', 'DELIVERIES', 'TAKE_AWAY', 'CURBSIDE_PICKUP', 'WHEELCHAIR_ACCESSIBLE', 'DISABILITY_PARKING'];

    let _layer;

    const _UPDATED_FIELDS = {
        name: {
            updated: false,
            selector: '#venue-edit-general wz-text-input[name="name"]',
            shadowSelector: '#id',
            tab: 'general'
        },
        aliases: {
            updated: false,
            selector: '#venue-edit-general > div.aliases.form-group > wz-list',
            tab: 'general'
        },
        address: {
            updated: false,
            selector: '#venue-edit-general div.address-edit-view div.full-address-container',
            tab: 'general'
        },
        categories: {
            updated: false,
            selector: '#venue-edit-general > div.categories-control.form-group > wz-card',
            shadowSelector: 'div',
            tab: 'general'
        },
        description: {
            updated: false,
            selector: '#venue-edit-general wz-textarea[name="description"]',
            shadowSelector: '#id',
            tab: 'general'
        },
        lock: {
            updated: false,
            selector: '#venue-edit-general > div.lock-edit',
            tab: 'general'
        },
        externalProvider: {
            updated: false,
            selector: '#venue-edit-general > div.external-providers-control.form-group > wz-list',
            tab: 'general'
        },
        brand: { updated: false, selector: '.venue .brand .select2-container', tab: 'general' },
        url: {
            updated: false,
            selector: '#venue-url',
            shadowSelector: '#id',
            tab: 'more-info'
        },
        phone: {
            updated: false,
            selector: '#venue-phone',
            shadowSelector: '#id',
            tab: 'more-info'
        },
        openingHours: {
            updated: false,
            selector: '#venue-edit-more-info div.opening-hours.form-group > wz-list',
            tab: 'more-info'
        },
        cost: { updated: false, selector: '.venue .form-control[name="costType"]', tab: 'more-info' },
        canExit: { updated: false, selector: '.venue label[for="can-exit-checkbox"]', tab: 'more-info' },
        hasTBR: { updated: false, selector: '.venue label[for="has-tbr"]', tab: 'more-info' },
        lotType: { updated: false, selector: '#venue-edit-more-info > form > div:nth-child(1) > wz-radio-group', tab: 'more-info' },
        parkingSpots: {
            updated: false,
            selector: '#venue-edit-more-info wz-select[name="estimatedNumberOfSpots"]',
            shadowSelector: '#select-wrapper > div',
            tab: 'more-info'
        },
        lotElevation: { updated: false, selector: '.venue .lot-checkbox', tab: 'more-info' },
        evNetwork: { updated: false, selector: '', tab: 'general' },
        evPaymentMethods: {
            updated: false,
            selector: '#venue-edit-general > div.charging-station-controls div.wz-multiselect > wz-card',
            shadowSelector: 'div',
            tab: 'general'
        },

        getFieldProperties() {
            return Object.keys(this)
                .filter(key => this[key].hasOwnProperty('updated'))
                .map(key => this[key]);
        },
        getUpdatedTabNames() {
            return _.uniq(this.getFieldProperties()
                .filter(prop => prop.updated)
                .map(prop => prop.tab));
        },
        // checkAddedNode(addedNode) {
        //     this.getFieldProperties()
        //         .filter(prop => prop.updated && addedNode.querySelector(prop.selector))
        //         .forEach(prop => {
        //             $(prop.selector).css({ 'background-color': '#dfd' });
        //             $(`a[href="#venue-edit-${prop.tab}"]`).css({ 'background-color': '#dfd' });
        //         });
        // },
        reset() {
            this.clearEditPanelHighlights();
            this.getFieldProperties().forEach(prop => {
                prop.updated = false;
            });
        },
        init() {
            ['VALLET_SERVICE', 'DRIVETHROUGH', 'WI_FI', 'RESTROOMS', 'CREDIT_CARDS', 'RESERVATIONS', 'OUTSIDE_SEATING', 'AIR_CONDITIONING',
                'PARKING_FOR_CUSTOMERS', 'DELIVERIES', 'TAKE_AWAY', 'WHEELCHAIR_ACCESSIBLE', 'DISABILITY_PARKING', 'CURBSIDE_PICKUP', 'CARPOOL_PARKING',
                'EV_CHARGING_STATION', 'CAR_WASH', 'SECURITY', 'AIRPORT_SHUTTLE']
                .forEach(service => {
                    const propName = `services_${service}`;
                    this[propName] = { updated: false, selector: `.venue label[for="service-checkbox-${service}"]`, tab: 'more-info' };
                });

            // 5/24/2019 (mapomatic) This observer doesn't seem to work anymore.  I've added the updateEditPanelHighlights
            // function that can be called after harmonizePlaceGo runs.

            // const observer = new MutationObserver(mutations => {
            //     mutations.forEach(mutation => {
            //         // Mutation is a NodeList and doesn't support forEach like an array
            //         for (let i = 0; i < mutation.addedNodes.length; i++) {
            //             const addedNode = mutation.addedNodes[i];
            //             // Only fire up if it's a node
            //             if (addedNode.nodeType === Node.ELEMENT_NODE) {
            //                 _UPDATED_FIELDS.checkAddedNode(addedNode);
            //             }
            //         }
            //     });
            // });
            // observer.observe(document.getElementById('edit-panel'), { childList: true, subtree: true });

            W.selectionManager.events.register('selectionchanged', null, () => errorHandler(() => this.reset()));
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
                return [...tabElements].filter(elem => elem.textContent === tabText)[0];
            }
            return null;
        },
        clearEditPanelHighlights() {
            this.getFieldProperties().filter(prop => prop.updated).forEach(prop => {
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
                this.getFieldProperties().filter(prop => prop.updated).forEach(prop => {
                    if (prop.shadowSelector) {
                        $(document.querySelector(prop.selector)?.shadowRoot?.querySelector(prop.shadowSelector)).css('background-color', '#dfd');
                    } else {
                        $(prop.selector).css({ 'background-color': '#dfd' });
                    }
                    $(this.getTabElement(prop.tab)).css({ 'background-color': '#dfd' });
                });
            }, 100);
        }
    };

    // KB Shortcut object
    const _SHORTCUT = {
        allShortcuts: {}, // All the shortcuts are stored in this array
        add(shortcutCombo, callback, opt) {
            // Provide a set of default options
            const defaultOptions = {
                type: 'keydown', propagate: false, disableInInput: false, target: document, keycode: false
            };
            if (!opt) {
                opt = defaultOptions;
            } else {
                Object.keys(defaultOptions).forEach(dfo => {
                    if (typeof opt[dfo] === 'undefined') { opt[dfo] = defaultOptions[dfo]; }
                });
            }
            let ele = opt.target;
            if (typeof opt.target === 'string') { ele = document.getElementById(opt.target); }
            // var ths = this;
            shortcutCombo = shortcutCombo.toLowerCase();
            // The function to be called at keypress
            // eslint-disable-next-line func-names
            const func = function keyPressFunc(e) {
                e = e || window.event;
                if (opt.disableInInput) { // Don't enable shortcut keys in Input, Textarea fields
                    let element;
                    if (e.target) {
                        element = e.target;
                    } else if (e.srcElement) {
                        element = e.srcElement;
                    }
                    if (element.nodeType === 3) { element = element.parentNode; }
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') { return; }
                }
                // Find Which key is pressed
                let code;
                if (e.keyCode) {
                    code = e.keyCode;
                } else if (e.which) {
                    code = e.which;
                }
                let character = String.fromCharCode(code).toLowerCase();
                if (code === 188) { character = ','; } // If the user presses , when the type is onkeydown
                if (code === 190) { character = '.'; } // If the user presses , when the type is onkeydown
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
                    '\'': '"',
                    ',': '<',
                    '.': '>',
                    '/': '?',
                    '\\': '|'
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
                    f12: 123
                };
                const modifiers = {
                    shift: { wanted: false, pressed: false },
                    ctrl: { wanted: false, pressed: false },
                    alt: { wanted: false, pressed: false },
                    meta: { wanted: false, pressed: false } // Meta is Mac specific
                };
                if (e.ctrlKey) { modifiers.ctrl.pressed = true; }
                if (e.shiftKey) { modifiers.shift.pressed = true; }
                if (e.altKey) { modifiers.alt.pressed = true; }
                if (e.metaKey) { modifiers.meta.pressed = true; }
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
                    } else if (k.length > 1) { // If it is a special key
                        if (specialKeys[k] === code) { kp++; }
                    } else if (opt.keycode) {
                        if (opt.keycode === code) { kp++; }
                    } else if (character === k) { // The special keys did not match
                        kp++;
                    } else if (shiftNums[character] && e.shiftKey) { // Stupid Shift key bug created by using lowercase
                        character = shiftNums[character];
                        if (character === k) { kp++; }
                    }
                }

                if (kp === keys.length && modifiers.ctrl.pressed === modifiers.ctrl.wanted && modifiers.shift.pressed === modifiers.shift.wanted
                    && modifiers.alt.pressed === modifiers.alt.wanted && modifiers.meta.pressed === modifiers.meta.wanted) {
                    callback(e);
                    if (!opt.propagate) { // Stop the event
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
        // Remove the shortcut - just specify the shortcut and I will remove the binding
        remove(shortcutCombo) {
            shortcutCombo = shortcutCombo.toLowerCase();
            const binding = this.allShortcuts[shortcutCombo];
            delete (this.allShortcuts[shortcutCombo]);
            if (!binding) { return; }
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
        }
    }; // END Shortcut function

    function errorHandler(callback) {
        try {
            callback();
        } catch (ex) {
            console.error(`${_SCRIPT_NAME}:`, ex);
        }
    }

    function getSelectedVenue() {
        const features = WazeWrap.getSelectedFeatures();
        // Be sure to check for features.length === 1, in case multiple venues are currently selected.
        return features.length === 1 && features[0].model.type === 'venue'
            ? features[0].model : undefined;
    }

    function getVenueLonLat(venue) {
        const pt = venue.geometry.getCentroid();
        return new OpenLayers.LonLat(pt.x, pt.y);
    }

    function isAlwaysOpen(venue) {
        const hours = venue.attributes.openingHours;
        return hours.length === 1 && hours[0].days.length === 7 && hours[0].isAllDay();
    }

    function addPURWebSearchButton() {
        const purLayerObserver = new MutationObserver(panelContainerChanged);
        purLayerObserver.observe($('#map #panel-container')[0], { childList: true, subtree: true });

        function panelContainerChanged() {
            if (!$('#WMEPH-HidePURWebSearch').prop('checked')) {
                const $panelNav = $('.place-update-edit.panel .categories.small');
                if ($('#PHPURWebSearchButton').length === 0 && $panelNav.length > 0) {
                    const $btn = $('<button>', {
                        class: 'btn btn-primary', id: 'PHPURWebSearchButton', title: 'Search the web for this place.  Do not copy info from 3rd party sources!'
                    }) // NOTE: Don't use btn-block class. Causes conflict with URO+ "Done" button.
                        .css({
                            width: '100%', display: 'block', marginTop: '4px', marginBottom: '4px'
                        })
                        .text('Web Search')
                        .click(() => { openWebSearch(); });
                    $panelNav.after($btn);
                }
            }
        }

        function buildSearchUrl(searchName, address) {
            searchName = searchName
                .replace(/[/]/g, ' ')
                .trim();
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
            const newName = $('.place-update-edit.panel .name').first().text();
            const addr = $('.place-update-edit.panel .address').first().text();
            if ($('#WMEPH-WebSearchNewTab').prop('checked')) {
                window.open(buildSearchUrl(newName, addr));
            } else {
                window.open(buildSearchUrl(newName, addr), _SEARCH_RESULTS_WINDOW_NAME, _searchResultsWindowSpecs);
            }
        }
    }

    // Whitelist stringifying and parsing
    function saveWhitelistToLS(compress) {
        _venueWhitelistStr = JSON.stringify(_venueWhitelist);
        if (compress) {
            if (_venueWhitelistStr.length < 4800000) { // Also save to regular storage as a back up
                localStorage.setItem(_WL_LOCAL_STORE_NAME, _venueWhitelistStr);
            }
            _venueWhitelistStr = LZString.compressToUTF16(_venueWhitelistStr);
            localStorage.setItem(_WL_LOCAL_STORE_NAME_COMPRESSED, _venueWhitelistStr);
        } else {
            localStorage.setItem(_WL_LOCAL_STORE_NAME, _venueWhitelistStr);
        }
    }
    function loadWhitelistFromLS(decompress) {
        if (decompress) {
            _venueWhitelistStr = localStorage.getItem(_WL_LOCAL_STORE_NAME_COMPRESSED);
            _venueWhitelistStr = LZString.decompressFromUTF16(_venueWhitelistStr);
        } else {
            _venueWhitelistStr = localStorage.getItem(_WL_LOCAL_STORE_NAME);
        }
        _venueWhitelist = JSON.parse(_venueWhitelistStr);
    }
    function backupWhitelistToLS(compress) {
        _venueWhitelistStr = JSON.stringify(_venueWhitelist);
        if (compress) {
            _venueWhitelistStr = LZString.compressToUTF16(_venueWhitelistStr);
            localStorage.setItem(_WL_LOCAL_STORE_NAME_COMPRESSED + Math.floor(Date.now() / 1000), _venueWhitelistStr);
        } else {
            localStorage.setItem(_WL_LOCAL_STORE_NAME + Math.floor(Date.now() / 1000), _venueWhitelistStr);
        }
    }

    function phlog(msg) {
        console.log(`WMEPH${_IS_BETA_VERSION ? '-β' : ''}:`, msg);
    }
    function phlogdev(msg) {
        if (_USER.isDevUser) {
            console.log(`WMEPH${_IS_BETA_VERSION ? '-β' : ''} (dev):`, msg);
        }
    }

    function zoomPlace() {
        const venue = getSelectedVenue();
        if (venue) {
            W.map.moveTo(getVenueLonLat(venue), 7);
        } else {
            W.map.moveTo(_wmephMousePosition, 5);
        }
    }

    //  Whitelist an item. Returns true if successful. False if not.
    function whitelistAction(itemID, wlKeyName) {
        const venue = getSelectedVenue();
        let addressTemp = venue.getAddress();
        if (addressTemp.hasOwnProperty('attributes')) {
            addressTemp = addressTemp.attributes;
        }
        if (!addressTemp.country) {
            WazeWrap.Alerts.error(_SCRIPT_NAME, 'Whitelisting requires an address. Enter the place\'s address and try again.');
            return false;
        }
        const centroid = venue.attributes.geometry.getCentroid();
        const itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(centroid.x, centroid.y);
        if (!_venueWhitelist.hasOwnProperty(itemID)) { // If venue is NOT on WL, then add it.
            _venueWhitelist[itemID] = {};
        }
        _venueWhitelist[itemID][wlKeyName] = { active: true }; // WL the flag for the venue
        _venueWhitelist[itemID].city = addressTemp.city.attributes.name; // Store city for the venue
        _venueWhitelist[itemID].state = addressTemp.state.name; // Store state for the venue
        _venueWhitelist[itemID].country = addressTemp.country.name; // Store country for the venue
        _venueWhitelist[itemID].gps = itemGPS; // Store GPS coords for the venue
        saveWhitelistToLS(true); // Save the WL to local storage
        wmephWhitelistCounter();
        _buttonBanner2.clearWL.active = true;
        return true;
    }

    // Keep track of how many whitelists have been added since the last pull, alert if over a threshold (100?)
    function wmephWhitelistCounter() {
        // eslint-disable-next-line camelcase
        localStorage.WMEPH_WLAddCount = parseInt(localStorage.WMEPH_WLAddCount, 10) + 1;
        if (localStorage.WMEPH_WLAddCount > 50) {
            WazeWrap.Alerts.warning(_SCRIPT_NAME, 'Don\'t forget to periodically back up your Whitelist data using the Pull option in the WMEPH settings tab.');
            // eslint-disable-next-line camelcase
            localStorage.WMEPH_WLAddCount = 2;
        }
    }

    function createObserver() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
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
            '.serv-247 { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-ac { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-credit { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-deliveries { width: 86px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-drivethru { width: 78px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-outdoor { width: 73px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-parking { width: 46px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-reservations { width: 55px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-restrooms { width: 49px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAAyCAYAAAD1CDOyAAAD8GlDQ1BJQ0MgUHJvZmlsZQAAOI2NVd1v21QUP4lvXKQWP6Cxjg4Vi69VU1u5GxqtxgZJk6XpQhq5zdgqpMl1bhpT1za2021Vn/YCbwz4A4CyBx6QeEIaDMT2su0BtElTQRXVJKQ9dNpAaJP2gqpwrq9Tu13GuJGvfznndz7v0TVAx1ea45hJGWDe8l01n5GPn5iWO1YhCc9BJ/RAp6Z7TrpcLgIuxoVH1sNfIcHeNwfa6/9zdVappwMknkJsVz19HvFpgJSpO64PIN5G+fAp30Hc8TziHS4miFhheJbjLMMzHB8POFPqKGKWi6TXtSriJcT9MzH5bAzzHIK1I08t6hq6zHpRdu2aYdJYuk9Q/881bzZa8Xrx6fLmJo/iu4/VXnfH1BB/rmu5ScQvI77m+BkmfxXxvcZcJY14L0DymZp7pML5yTcW61PvIN6JuGr4halQvmjNlCa4bXJ5zj6qhpxrujeKPYMXEd+q00KR5yNAlWZzrF+Ie+uNsdC/MO4tTOZafhbroyXuR3Df08bLiHsQf+ja6gTPWVimZl7l/oUrjl8OcxDWLbNU5D6JRL2gxkDu16fGuC054OMhclsyXTOOFEL+kmMGs4i5kfNuQ62EnBuam8tzP+Q+tSqhz9SuqpZlvR1EfBiOJTSgYMMM7jpYsAEyqJCHDL4dcFFTAwNMlFDUUpQYiadhDmXteeWAw3HEmA2s15k1RmnP4RHuhBybdBOF7MfnICmSQ2SYjIBM3iRvkcMki9IRcnDTthyLz2Ld2fTzPjTQK+Mdg8y5nkZfFO+se9LQr3/09xZr+5GcaSufeAfAww60mAPx+q8u/bAr8rFCLrx7s+vqEkw8qb+p26n11Aruq6m1iJH6PbWGv1VIY25mkNE8PkaQhxfLIF7DZXx80HD/A3l2jLclYs061xNpWCfoB6WHJTjbH0mV35Q/lRXlC+W8cndbl9t2SfhU+Fb4UfhO+F74GWThknBZ+Em4InwjXIyd1ePnY/Psg3pb1TJNu15TMKWMtFt6ScpKL0ivSMXIn9QtDUlj0h7U7N48t3i8eC0GnMC91dX2sTivgloDTgUVeEGHLTizbf5Da9JLhkhh29QOs1luMcScmBXTIIt7xRFxSBxnuJWfuAd1I7jntkyd/pgKaIwVr3MgmDo2q8x6IdB5QH162mcX7ajtnHGN2bov71OU1+U0fqqoXLD0wX5ZM005UHmySz3qLtDqILDvIL+iH6jB9y2x83ok898GOPQX3lk3Itl0A+BrD6D7tUjWh3fis58BXDigN9yF8M5PJH4B8Gr79/F/XRm8m241mw/wvur4BGDj42bzn+Vmc+NL9L8GcMn8F1kAcXgSteGGAAAACXBIWXMAABcSAAAXEgFnn9JSAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAAPgElEQVRoBZ2aeXBV1R3H38sGCWENS1gTAiEsZQthVShbqcDAWARadeqIozDttI78Y8exTm1nurh0GaZ2HO2IM2htoVORVJCtbAJiRQQCsgVQdgiBEELI9l4/31/uudz38hKkZ+a+e87v/PblLDcJhe7ekhzKiy++mDJz5sxW0Wg07GC8/fkA7F67Pg/xnjx5cmvJCjBJDvTvqStFTVmYdhgwYMBzvXv33t6zZ889ffv2LR4+fPj3V65c6Zj7StyThEZkoxWv/Pz8Rbm5ueslIycnZ+PgwYN/Onfu3LYez2ZlBD0aL19EkdGjR2dfvnz5rYaGhpl46UxycnIV7/xwOJyclpb23IkTJ34XEBKJZ3KXscnASSmnT59+pa6u7hn4liHjTCQSyYW2Y3p6+qqCgoIfFxcXlzGW0xp4YprzZAyQgeCmUGpq6m8w4NFWrVotg+EjHTp0eIP+B5WVlSMROr9r167br1279nWQJp5ZM2M5MKq5lJSUx2tqan7bunXrj9q3b/9gVlbWsszMzJUVFRUd6uvrH66urq65cuXKFg+/JceLnd8sH/Py8vpkZ2ef7NWr1zp/xuuMGDHiPuD1pNjywFyzIQ/guK7hDhkyJBMeX/CcInW6uUm9iVA2aXUeOUfod/bmmji+RaF4IgPCOtJmt8cgvX///u3Ub9OmzQFCX8KTt3jx4lTBENQiP+HEt/Ly8iy83Y8o7F2zZs0l5pNIH6uDrVu3XkxKStpYW1vb6auvvsryaJtEokWh7dq1i8Ikgxzt6TGopgZq1Kcu0nk6Ml8/ffr0e60FsTBlSE3xqyI1uwhIixw9etRkqNiR0QdH1ZFmBmtE+Wa/lk54tkOfPn12du/e/RrpMyFISkReYy6K114IwJt4KTAX3/UdSNq+S21FWZ0eCiINGzbsGdIpyrMiAG8iownAQxZcT2TQoEGzbt68+SHFXdO2bdsVFOHXVVVVkwnxVCL0AQIWffzxx9fAVa42WTmANdfEX4Y0sAKOpnDXwTMrIyOjWKlFMRfU1tQ8HIlGv6Qu5+3du/cIuHJuPU9Ma1IkbnbUqFEpFy5ciJSVlR1n7T50+/btXEL+AM/9GNSRNFhBuj392WefyQDVhFLKVhvHo4W3c5Lhn6exJ+zAWZkYUkiNTOfJS05JWUMaPbl///7jHi/hN9FZzOKbExCT50qtq1evFrF+Z+CpU3jmYDwhY3k2hi4BjvjHGDt+/Pj03bt3Vy9YsCD98OHDA5CRR5SvsamWUOzlU6ZMydiyZUsVtRGk82XFG+ELQOlsVoTZeL0I77dnv+gE40wEKKTVeKyMoq4mvcp4iktLS7d4CvvMExjgz7Hjj2GveQjew1EuBzmSXU2/Fr4iTUJWK97p3lgb4NaOHTt+ePDgwb1CoBm/oBGuH6WIR7CBLSekI1gdzsP4Estsa1ExDjEOI7SO+XrGBYBJ5YzX+/Xr94sNGzZcZpyoPnwHUcgPsbktRyktpSXwjuCgFHiZ9rwVTdMHAyLIqsdYGTSQcT0b4c+OHDnyB8ZqSU5xDUyw0ubUqVP/xtP3odirFPMbMClj9UhCsJ8q2JFy7ty5WhiOwqMvgz8K/D8dP358qZjRgoY4OVHOYA/euHFjJSl5necJ/LCdwrU8J6JRxg5XO3mU2jO5t27dSuaZfv369ZfgnUOtLDl06NAbJsn7MQ+oj5cWsXtquXsliNBSf9asWdnsqiUc3MpJkyEerm2AXt/4s5+0B+8Q/CvGjBkzviWezc2x7BZAXw6f0yNHjuwhPKe8WU9hJePhR4CfRSFZrKY0kkLyVszDkSENWMratWsvEpHXoe2Il6cAU6vjcV6199mzZ4eQFjl4+OVPP/3UTgGsfOIfwzfR2MMLHThw4CgR/CMp1wdZY8H1jVA/xE7ZnzwdTgi3seXr1Kh2m0cKKZW0D/gP4axlbOt2ly5dtpOvV0m5+4C55pxk+wd5P5H8b4PB5xwCp1fx93km6JtcD882YZbirRhxC6dNFR8JkZdMCLlfiKcyWYk2aJKWTI13oE5EHFzebFKHN+YyNdixY8cB8nk3tIUTJ07sbgh3+NsQwT0xIsRp2JQBmKTl1cNN9JJuJpcsUdStj5PrcBiiUoctXbo03RlhDPBiPoJqeA4JgJKzKKQPz5w5M8kQ7oTd4f+SfeovynUB8PQxXgPYIEcaQtyeAd96hAvPlKH+HmBDfUd57uG79POGjenIYjBm3759K9DnO5qARwpRUDdKgYd9I3TtJArfRsBFNhnbIdmlZ5NeEyCwSEEUxiMitsZcLqvSDzmJjhKA1ekTYFphJjRihBqIlK083jgJQ7xuKARtEeN54A/0gNLMGSLdbDUketPBWwjvIuGhj5gIL2qHVAHV8HZXjMgjRPvXrVt3QzCNeZ3ifFSiMS26atUqGSQB8sgmcCqJlt0DMGInKXkMpUa4OzLLr1MqxFyMEThM+0wI5UxZ8RdfNejtrR8WAlvpQFNthuAf9SIRprgtEo5BEQbkMnlAiIROR+ABCDmyefPmq4LRnBDzLrl5EEPqwLNIUNwV8LiJsqPff/99OSDE8UQva1I42KCL8Nh+EIQn6Jux8PWnPF5R7jy2QxpnLBoNRhSrdwoT5uNBzGE5+9yjtPCpz+HQQBwBDmHEBZjfj9Fp7NZVhH4v4/Yw7+HR+a87Dm8EgWcRRY4fLR850GE+ScYSOYN6+IqG6W5MNIOAQTDdzyb3X42ph4GMq1lJtmhME64RzZkzx1yiIzhGH4a2J2nVS0jQbIN5K+CuLpQCCZWUEjSR3a3F0BNtGSDiMBtfY26PGzcuF48OhVMpXxVuiSPKDAGvgsI5pTEF6jMiXyXZHIDyilQX6G1Fgu5LmAOumyohoqUFi1u1ZEBwpYj1W/oRvvDAj0fzayJE8cmAvtybS4WlesC7E7H4Aje4csHY/FztaOgbQbrtZ6wD4SRNcC8oJQrHoM/DOV0FCzYpw5yBnDHB+UR9aPyM8ebNePFhiW/0Jkb0QIkqFPpISHgxn3E2Rvzn7bffvu4RJnQZ4fwcZsehKZAwrWyMN9LP5gZoSyL05kIpTXQ9dlZ3bpXxYa7DacBHhJff9+YBBZwhIMWoo0IFih/2kIZJGIVk9QGsyY7NfmFGLVmyRPeK8zAt4JaZL3r4neSVzuY5TmOa4YIXjKbBg0YZpvdDNvhOA8f67g2KGYXMCNkTTdKxQus6AkpLSkr0yUS5Nw6CKoz4UuPJkyfrFdPYL4zxwoULG1BaO3Uum54Z0blzZ93CQtxJ4o8UaYoGj1NCXzNi+LpBMBLAnBFWW0RdNaIvManoyCJfV5eEERLWY9myZa10FmGsNfRzjrpWI3H14OTIq3YGIu02Kz95+msSnqlSln0kJg2AXYW3nFTtMUn0GUY0MXQerl6Gj/61OCkMv+uzZ8+uScLicmqhGIR8jHiHY/XzCNId98CKFSuqPAaJ3eUJo5C1Il0B9wcs0Y9cunTpWcahTp067fDo3eq0nRQLcVdX+uoDnB0U0cfxl/JyjjsZCM2aIotOFln68+GvXbyY+3e9VT3Hipfw5nI+k8znCPE8SGGW1rOO3ns3eZFmJrxbt24XMKSEvWUsm+a7eKgNKfYUd+HVIgLPPItRnwBfD96P+vbtu4vCX0RUdJR3RkSGDh2ahyPmcSj0VzaUr1UEWYAeh247EX8WPp/Az/jLiCSOFZcee+yxJwEuQRntE9fx0jbeasJxQgzgfkgzW3U2bdpUgeIb5S3OT9v4qDaNL4V/9fDC4EnR8M6dOyu55j4thxGRdijWERp53k8f4NMx8s9cRfs5OXjdjh0cGPsw1wma17jSLt61a5fu86agmKSxgUW4Nb1Jap0A6TJHXDuOO0beW2nhUkMgGacLfIgI7OJVgzHFKGu0RCC4qpkjuNEdO3ny5BMzZswoItq/xssEo8FqS3xQtDXGteZtWSIYnkelsFa9N1kNCzms/oRPPAc1R7MDoDrm0YEDBw6gKLsRjX3uJOvNOU8Jz3BFRBPcio3PmbqlpBHyb9kMP0QgUQRNYfYfnHp7M2i3MNw3gr7uHLd5gnKStXBg3BGcXevxdzS2E0oRI0D5kSB24xnKTv0kz3fxpm5upkxRUVFBYWFh4+mvkZO+XgwkfRbwGfIJQGE8yzeAMVmaZq0PRq2RAllehLRMZvLEGMpQ+vDxL8U5ztHpra/0ajJAKWrND5lGhKyS13nysjcefZPCe5Xc9E+jFP5iVpbfa28xan7w5lxCrz+IPMw7RDRK3RypGaOgg7taQl5jnjStOdHF0CqdaEp9NTndN1IWCVkAOWUbhTkHI9qQpy8QwhH0tZRZI9W6onQOxsgjdhwB1g6vaU94i2cFaVAGjwoRcJfwvWUMmv/xFXIoZIPrJnqbvm7CzysB2DNu8rL7A1/z1qPsAJTyPUL/FgpXYpjziHZfzTdgwD/4jrpDfLwWI8gB499eNvky4ufjxgnxYtLJy1WDEQVtLPoe6nuJkOqYEJPnwFKBhUklB7fVCtqEAuOUckNfhgM0806IF2MEuSoP+1728tDnpxWCVofCwVjr1qWCdryCcz5tcx1PRozBXnSakCA/Bs8hOMFuHHzDKyFNEEd9FZl/VaSf0FtCTNQ8I3waz1FNUD1dfLwgQktGBPH8frxhKGGWAk8owCe8x44Wi0BDTNjVXwDc2L2rEfHKiRv3bp+OoUnj/Y3CFq9BvFOYT+QMf4WMp9fYVybRJDD93cCvEVYircMxxc5SrGPx/2UA/EUn/kF6pWaEFdA2YOa0f9micc814RGmBXdO1m59A23HPuBWIO0P2jN0LLibQ6RPTIOXVrtWOMKHM9bXkSwOo3kOyLw+Ouvs5HIsaHTzkSBlyolCd47mD4rBtGnTstjoBiGkD8bMFmzq1Kn9UF79eg5z9tVQ8G/QLGX494dyGcHJYHqAZjz809ijHhCMv9WlMD9GBc93Lv2RU030viGJ8k+haxg7dmy3ixcvvofiU4jGv4D1htFoIkQ3dAMv6mOA/lFlGMeLNdwCH+XKelN7DUv13ZZZRS3CYS6Ni9d7HG3m4bD18NdXjBlKW/r1yN0E/wyMmgT8n+j01OrVq3VSMHopopbICN9Kfa3miP0rmMyDYTnnor8j4AuOGt8jxHOAV5JO7/L58g979uw57vHzPWQSEv84uVEUy+cr+rPwnIeiychYS1Q3cEbLw5D5GNcbmX9D/s+5o+j2GGNAYvZ3oCYIb6VMmDBhNH9H6O+m+NKRznga35UKHYy3UywAumvXp5k0adIg/q4xGEN8mP5NCTnui7mY+XNBzv8DLtltFbPOUeIAAAAASUVORK5CYII=) top center no-repeat; }',
            '.serv-takeaway { width: 34px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-valet { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-wheelchair { width: 50px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAD8GlDQ1BJQ0MgUHJvZmlsZQAAOI2NVd1v21QUP4lvXKQWP6Cxjg4Vi69VU1u5GxqtxgZJk6XpQhq5zdgqpMl1bhpT1za2021Vn/YCbwz4A4CyBx6QeEIaDMT2su0BtElTQRXVJKQ9dNpAaJP2gqpwrq9Tu13GuJGvfznndz7v0TVAx1ea45hJGWDe8l01n5GPn5iWO1YhCc9BJ/RAp6Z7TrpcLgIuxoVH1sNfIcHeNwfa6/9zdVappwMknkJsVz19HvFpgJSpO64PIN5G+fAp30Hc8TziHS4miFhheJbjLMMzHB8POFPqKGKWi6TXtSriJcT9MzH5bAzzHIK1I08t6hq6zHpRdu2aYdJYuk9Q/881bzZa8Xrx6fLmJo/iu4/VXnfH1BB/rmu5ScQvI77m+BkmfxXxvcZcJY14L0DymZp7pML5yTcW61PvIN6JuGr4halQvmjNlCa4bXJ5zj6qhpxrujeKPYMXEd+q00KR5yNAlWZzrF+Ie+uNsdC/MO4tTOZafhbroyXuR3Df08bLiHsQf+ja6gTPWVimZl7l/oUrjl8OcxDWLbNU5D6JRL2gxkDu16fGuC054OMhclsyXTOOFEL+kmMGs4i5kfNuQ62EnBuam8tzP+Q+tSqhz9SuqpZlvR1EfBiOJTSgYMMM7jpYsAEyqJCHDL4dcFFTAwNMlFDUUpQYiadhDmXteeWAw3HEmA2s15k1RmnP4RHuhBybdBOF7MfnICmSQ2SYjIBM3iRvkcMki9IRcnDTthyLz2Ld2fTzPjTQK+Mdg8y5nkZfFO+se9LQr3/09xZr+5GcaSufeAfAww60mAPx+q8u/bAr8rFCLrx7s+vqEkw8qb+p26n11Aruq6m1iJH6PbWGv1VIY25mkNE8PkaQhxfLIF7DZXx80HD/A3l2jLclYs061xNpWCfoB6WHJTjbH0mV35Q/lRXlC+W8cndbl9t2SfhU+Fb4UfhO+F74GWThknBZ+Em4InwjXIyd1ePnY/Psg3pb1TJNu15TMKWMtFt6ScpKL0ivSMXIn9QtDUlj0h7U7N48t3i8eC0GnMC91dX2sTivgloDTgUVeEGHLTizbf5Da9JLhkhh29QOs1luMcScmBXTIIt7xRFxSBxnuJWfuAd1I7jntkyd/pgKaIwVr3MgmDo2q8x6IdB5QH162mcX7ajtnHGN2bov71OU1+U0fqqoXLD0wX5ZM005UHmySz3qLtDqILDvIL+iH6jB9y2x83ok898GOPQX3lk3Itl0A+BrD6D7tUjWh3fis58BXDigN9yF8M5PJH4B8Gr79/F/XRm8m241mw/wvur4BGDj42bzn+Vmc+NL9L8GcMn8F1kAcXgSteGGAAAACXBIWXMAABcSAAAXEgFnn9JSAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAAOV0lEQVRoBc2aCXBV1RnH35aFJBAIe0AkrGGTRZRdCUwRkM1d9hERFIoWcXfGUrWWlhY6pThAUVqQQWGUgoFQXFiKSpCdEkAEWSSyhpAESEjyXn//k3ufL8/3kiBxhjNzc+895zvfvp374nT8OJw8+h566KGES5cu1SksLHRrKSIiwsl1Zc2aNUctUANnPd80NzGl4eLy9uzZs8uJEyc+ys/Pr+VyuTxORnFxcRFr7ho1aiw4dOjQUwK+GUcpQRo1arSkoKBgVKtWrS7C+OmioiKtRx85cqTx2bNnHQkJCb2++eabLczJWsU3k0AeixkjUHR09Mlr1645sEqNzMzMGK/X68Io3itXrjiioqKyES7LgvfdTEKIF7mUhld/2rdv/1a1atVewa02EyM7cauvEObbq1evOpg/NXny5OOCY9x0gpSwVfLXdjPz5vP5TLDPmjUroUmTJt+1bNly19q1a6NYFJwsqfUbuYTDViSPlTvE5E+QN2/efCeCZFQuKT+2n9Dzr1zHQykrBO4jDbtXrFhRPGnSpHpYIh0XS2zatOkbuNtx4iWOWLrmdrs9pOZIrOdj3Us8+UgQhdxdrLl1x0ULNM9rJHuLATMwJI+smJiY3Yxj0JUwxr0Debie53CCaN7Xu3fvWgR+KsHeBUYcxI4Dng1+mAtJR+vBa3q355HF4EFA3S+QQAbs37//a5DdkDB21gpmSkiLKYxDJQQxsqZ+/fpzCHonGjWugGDFXFdlDBjycndyeXTBrCxg5vUs5MC4rHWn9oKn/969e1+AxgSWJUhozWhzBUY4QcxWakquHmCg6Pz589cQJFLahQkNFczYQBq8G6aBD8WUsbLgESSfmlTF4/EIl0kqIhOI63qfwwli/JWYSMUFPqEIDoW4LrlNHsT9dGzmrQlbAGTxseQUvOLHPw/z0Vgpgi7BERcXd+HWW29ddOzYMT++n/tgEwi13/is0u+cOXN2wEx1Kv5g2peDCnB5ijYFMGlw2PN6QXADYxVUJxb2JSYmRmVkZPyJYH+4bdu2/davX/+JQLl+sU7BL2RSUtIu0u9BMVcZo1OnToMaNGiQP3jw4CQLn4m7G8FdLgJcxI2W5YI+sktkIDHWXKNGjWp27733th04cGC7ESNGNAlct55dt99+ewTPLrKgcWUso9ZH7hfOtUOgKXuqIogMRdwpZsmSJYn33HOPh5Q8PC8vr8ctt9xSHyHbSiCRgblCNL2Lu9LqV1zvbd68+bsdO3aYoNq4caMd2IYr4u+GAjxQtLCCTJ8+3cmliC3CrfLOnTvXbtmyZbspePEw7qhSpUoGQuwmeLdzMV2klBrFVQUGO1y8eHEAme51hP2ibt26v9++fXsahAtFHFjDA4XV3H/JP4oPEyN33333gIYNG16rWbOmr3HjxnsJ+PG9evXqVB7x7t27d2jduvU4BDmNID4y4JauXbt20T5wDARnPtZtZuEp18XLoxfKIkJqXIGg/A2pdzbvxymK74wfP37GxIkTjVanTJkSRQpNzM3NbYkFumA5N1aSdfY3a9bshwULFuxm327gln755ZdTTp8+PZM0u7Vbt26PEyNNKITuyrSIPzNZEuvd+C2Mz7p8+fLUyMjIlR07dhy7evVqUxzvYGRlZY0nRkaSXlUUo1Rf5G5W+1HAs4+zzQqK3pyvGcI9bNiwxrt27ZqN0MPYI0XlgveO1NTUwzz7lSfYnzMCBfEL0aJFi7/k5OQ8W7t27bn79u37tRCjyWTiZBbVfQB8FnE+WY5GVyPoJSyRgyUc7Imnl4yl1gxC0LESjLXl9erVe3Hr1q3HhAd3mweeiSSPHM4/3dLS0jKIRRfXj1VWgDcwTEYhVT5NX+Vr167dIhsXc09RyHwwlAsjL+Pb9e21cHdSbcPbbrvtz8SCjxjJJj4G27DJycnvKm4oiK9ac6Fc3Aav+F0tu6AJ4jtJnz58/DO0bgIQxqdpjqK4dciQIXUDsMqC2ie4wEtzfksPHTq0NUliq5SDYM+zZgZzH2kuJSXFJAAmDT1r+Wfd/ETJMOkQyEGwBsKEDxtLoMGPSJ8qahrSXkWI2sI5li9f7kY5K2VVrDtMSBQzeie1f6H3yhjGGsTwE0KMS6mtduA+KbIEQf+FLYRdma+HqL1nw4YNHpSUjktdws0aCweKmiaa0O6v9zZt2qhzED/25Vey1ssd8+fPj+E4u5/PQd8SdNHaQFe6Bf/Oxjr19G4zpOfrHfZeeqtkrC7XXS4cvMdAJ4u5zWXgrLgwPXr0aCMCxMNzQti5c+eh0lSHDh1esAiEC0YRkQvpHvhsbSt1M+5IbZpF0vBhFVNUscbrZEfRekaWgfYQXWTJQSggzsJQrjAGOe1EH1oLBwQ+10bS6GBqw2Uq8L8sRKFSo5Cr5mhN98DnsIRJ139T3YHmZPao/vyHuuL4/vvv/3rmzJk0CueqU6dOraJ4fkzRvF8wjLD4SpZLfNFRtWrVmSD08iHgZYpgLLXj7wi2kYr8LoDy12BBjBDsca5bt24gB6S3aGEew2UKYML+2hJMXII6YTgbhSVD58Fp06bNJGZyjh49+ohoJCUlTaeIvh8bG3syOzv7Tu67EW6T9nFpf/gxZsyYBnIjAi1VUPhsitwM846xdplkEIDBzyCu+I5SKAwUsK9QeCimC0LBBuIiUz1IIsnv169fkubZs5JEsMPeN3fu3DjiMweeXrLmjOfY66HuLiqxPgo4aCnOWwD1Zfr4+PizoTYwZ5BSE4ajtXEQXMh5JIkak0jbvpDT4BPUowesvX6hrXejVTzgCu9RWCVZ81j/PDwkjxs3rone9+zZ42ZOn5sC65aWwg4PyHBR5zXaiS2CQoAGtN95IN5n7Qo2qXkHXu5wdtu2bRPYb+ZoEF9ZtWrV2AsXLoxm7UOu4L0GJe1/ruICGq2YSKON8dBIxhA3MQag5I+PuePWe7BCAsBKHo12ZRGGeaZn0qZogtLOGCWQQX/RWD7MxM6ePdukay2jlAhwOWG0IAi81CswkeyXJcxHcXlA4KCH0zmIZW924HxZzy4CCry+SAToKkC0eYqGzgOSFtbGkNoAfjEwsYsXL56n2sMVmZ6e/gfmPNWrV19U1l5pn/VC6O4UHA1mEcJfIfDz9M66TqWiG5K2YIKHhy62SBrhXGH8EU0codV2kAbD+acymJPMtpagnQnc8wsXLnwYV4sEjwt8f9yyZcs6i1CobOcAv76HFRNTORZcPPv3zJs375jeEUze4WJOrxUaLg5APxDonxKkzaWF++67bw/azuTMYXoisIT0c2HnYPUC2h+CGy7jO+57pOEhBw4csDNNKG0awUgww6HlpShmqg/jvTNKsH97cZDKJYE32OVEs8xBmpukvqpv3753CJB6sIB0eokToW0VEz8hkIRiNpxLGBx9+vRpqpTN0Xee8NFEdlGrz9nkRRs/2asqqfwsbdNj1lzpILIBA+4GOVrdhEs5+JWqn9bQyBo+EFQjIz1pwYYTRNYSkcBLc6GsaIQmBp8mHhzEwzvCzUGtjz5G4GZL9a6BR4heKCWZ9bB/MG8k0u+iaTwxderUKgKkdd+kokVj10jvduOn5+sd9l59+5I1wG2K74QJEyKgeQrrb7BwGoWRxqthkXMUyvGat85LtqWD7352jNloHO+Xe1HontEKVbe7KjUVN13dseZshvRc0YHrmHMMWS0GptVh5+PCJiPSKP4Wy6iN7yt8Nn65Frycp9ebZNEpyzqlvMUAwvQm/PUCAV9TCBBqrAihwQ22MEzbB6uykGu7CJiuWUJwrvlM1pDCtKiDFcx6icfP9c4QPsOUBKEfO0OnnIq3xJEY3DoTBV9mV8mfEl7soy7HzvayCm72qdxNMBy0nhADmH97//79G5fs8/+1Y0MM2M+6+4W86667klDObiugn9VOZSqUtr5OnTqFOkJojiEcZp9cC0G+Ey8o8X/w8xVuto37Nu7pXOYdRX9I5lN3UGqIAf2yO1WMA/S+vYp7jBAjWMdL7Zjx6KOPJtpr4e7qvYB9XczgTpchONKGhZFlclvOHMOtOUObZyMIiq3NvuM6p8C8DxdTM2ouveuZrOdDET7gDgMf79ecjYS7AH9HQ/gagMvRzih9lCPoex4+fPgN2pDeZLir1J7ttBIf0HYfhWAkn4AKOT84qT8tKK4DKWY9cQnAov8Nvpdo9w/hYp6lS5e+z3nngVq1as3io/g06MkSduE0z7h2HY4QB+g6ErDceTqNI+DzKNtxL9Yd3BEnT57syKclfapqGigI+IxGTOqUMBB8DWSfYZ1HVq5ceUEAuMIAUmh/GB9GhW4kpCpcIFbvpO+6XvZkQnw1An7AR+zN2kdMNOUD3T8ofikI8QadwWuaZ4iHwHRt3tH8m1T4V1UWhNsAWs+a00Ampe35Bw8efDJYEK37NURWeY4fZGYyp6/rb/IdeOHbb79t+qFFixZFz5gxoy1WSKKiV6O6e3g+hQUOjh49OhPtq1V3jBw5strOnTsfgynhieCsMxFt22cWPy3BWsMvGPHRjY6jKYIUgv8SiqrKpZ//9ME8AoUdppPYqn2hBAmc13en9pzgZqPpFDR/Gqb/ScFM5TmdnwlKPqtbHATcXJi7K4I9jlUHoLn6uOHHsjK/UOkAZdMNtETAdvPoFyh4Iejd4LIRBq35EUljpnPj6/qDWOc5XKqLBZxJf5VBFc7joHQOrRWjvRp0rgnEUWtgGsglEGAdjeRb/IL7X2ufcEqAsoSwQB1uEo2L31f8sNQas0YcOq3fXQx/ZQliNig1848DCkb48rn5V6hmuEkKTA+C4V8xb84WmNtHvOgQUYzV1mH2NARdhxsdMYhwWXA59U8I1nul3soVJICaUmQpJlS4EK46/ZIBQ/NOTnlZMGviyNorGn7LWnOVfvs/TAuB+i4VlQIAAAAASUVORK5CYII=) top center no-repeat; }',
            '.serv-wifi { width: 67px; height: 50px; display: inline-block; background: transparent url(data:image/png;base64,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) top center no-repeat; }',
            '.serv-curbside { width: 65px; height: 65px; display: inline-block; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAABaCAQAAABKrS2DAAAACXBIWXMAABYlAAAWJQFJUiTwAAAFmmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDYgNzkuZGFiYWNiYiwgMjAyMS8wNC8xNC0wMDozOTo0NCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIyLjQgKE1hY2ludG9zaCkiIHhtcDpDcmVhdGVEYXRlPSIyMDE2LTAyLTE3VDA5OjMzOjQ0LTA1OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMS0wNy0xMlQxNzowNjoxNC0wNDowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMS0wNy0xMlQxNzowNjoxNC0wNDowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjEiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJEb3QgR2FpbiAyMCUiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MTNiZTY4ZmItODFjNy00ZWRj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) top center no-repeat; }'
        ];
        $('head').append($('<style>', { type: 'text/css' }).html(cssArray.join('\n')));
    }

    function onObjectsChanged() {
        // This is code to handle updating the banner when changes are made external to the script.
        const venue = getSelectedVenue();
        if ($('#WMEPH_banner').length > 0 && venue) {
            const actions = W.model.actionManager.getActions();
            const lastAction = actions[actions.length - 1];
            if (lastAction && lastAction.object && lastAction.object.type === 'venue' && lastAction.attributes && lastAction.attributes.id === venue.attributes.id) {
                if (lastAction.newAttributes && lastAction.newAttributes.entryExitPoints) {
                    harmonizePlaceGo(venue, 'harmonize');
                }
            }
        }
    }

    // This should be called after new venues are saved (using venues'objectssynced' event), so the new IDs can be retrieved and used
    // to replace the temporary IDs in the whitelist.  If WME errors during save, this function may not run.  At that point, the
    // temporary IDs can no longer be traced to the new IDs so the WL for those new venues will be orphaned, and the temporary IDs
    // will be removed from the WL store the next time the script starts.
    function syncWL(newVenues) {
        newVenues.forEach(newVenue => {
            const oldID = newVenue._prevID;
            const newID = newVenue.attributes.id;
            if (oldID && newID && _venueWhitelist[oldID]) {
                _venueWhitelist[newID] = _venueWhitelist[oldID];
                delete _venueWhitelist[oldID];
            }
        });
        saveWhitelistToLS(true);
    }

    function toggleXrayMode(enable) {
        localStorage.setItem('WMEPH_xrayMode_enabled', $('#layer-switcher-item_wmeph_x-ray_mode').prop('checked'));

        const commentsLayer = W.map.getLayerByUniqueName('mapComments');
        const gisLayer = W.map.getLayerByUniqueName('__wmeGISLayers');
        const satLayer = W.map.getLayerByUniqueName('satellite_imagery');
        const roadLayer = W.map.roadLayers[0];
        const commentRuleSymb = commentsLayer.styleMap.styles.default.rules[0].symbolizer;
        if (enable) {
            _layer.styleMap.styles.default.rules = _layer.styleMap.styles.default.rules.filter(rule => rule.wmephDefault !== 'default');
            roadLayer.opacity = 0.25;
            satLayer.opacity = 0.25;
            commentRuleSymb.Polygon.strokeColor = '#888';
            commentRuleSymb.Polygon.fillOpacity = 0.2;
            if (gisLayer) gisLayer.setOpacity(0.4);
        } else {
            _layer.styleMap.styles.default.rules = _layer.styleMap.styles.default.rules.filter(rule => rule.wmephStyle !== 'xray');
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
        const ruleGenerator = (value, symbolizer) => new W.Rule({
            filter: new OpenLayers.Filter.Comparison({
                type: '==',
                value,
                evaluate(venue) {
                    return venue && venue.model && venue.model.attributes.wmephSeverity === this.value;
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

    function initializeHighlights() {
        const ruleGenerator = (value, symbolizer) => new W.Rule({
            filter: new OpenLayers.Filter.Comparison({
                type: '==',
                value,
                evaluate(venue) {
                    return venue && venue.model && venue.model.attributes.wmephSeverity === this.value;
                }
            }),
            symbolizer,
            wmephStyle: 'default'
        });

        // const severity0 = ruleGenerator(0, {
        //     pointRadius: 5,
        //     externalGraphic: '',
        //     label: '',
        //     strokeWidth: 4,
        //     strokeColor: '#24ff14',
        //     fillColor: '#ba85bf'
        // });

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

        function plaTypeRuleGenerator(value, symbolizer) {
            return new W.Rule({
                filter: new OpenLayers.Filter.Comparison({
                    type: '==',
                    value,
                    evaluate(venue) {
                        if ($('#WMEPH-PLATypeFill').prop('checked') && venue && venue.model && venue.model.attributes.categories
                            && venue.model.attributes.categoryAttributes && venue.model.attributes.categoryAttributes.PARKING_LOT
                            && venue.model.attributes.categories.includes('PARKING_LOT')) {
                            const type = venue.model.attributes.categoryAttributes.PARKING_LOT.parkingType;
                            return (!type && this.value === 'public') || (type && (type.toLowerCase() === this.value));
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

        _layer.styleMap.styles.default.rules.push(...[/* severity0, */severityLock, severity1, severityLock1, severity2,
            severity3, severity4, severityHigh, severityAdLock, publicPLA, restrictedPLA, privatePLA]);
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

        const storedBannButt = _buttonBanner;
        const storedBannServ = _servicesBanner;
        const storedBannButt2 = _buttonBanner2;
        const t0 = performance.now();
        const doHighlight = $('#WMEPH-ColorHighlighting').prop('checked');
        const disableRankHL = $('#WMEPH-DisableRankHL').prop('checked');

        venues.forEach(venue => {
            if (venue && venue.type === 'venue' && venue.attributes) {
                // Highlighting logic would go here
                // Severity can be: 0, 'lock', 1, 2, 3, 4, or 'high'. Set to
                // anything else to use default WME style.
                if (doHighlight && !(disableRankHL && venue.attributes.lockRank > _USER.rank - 1)) {
                    try {
                        const { id } = venue.attributes;
                        let severity;
                        let cachedResult;
                        // eslint-disable-next-line no-cond-assign
                        if (force || !isNaN(id) || ((cachedResult = _resultsCache[id]) === undefined) || (venue.updatedOn > cachedResult.u)) {
                            severity = harmonizePlaceGo(venue, 'highlight');
                            if (isNaN(id)) _resultsCache[id] = { s: severity, u: venue.updatedOn || -1 };
                        } else {
                            severity = cachedResult.s;
                        }
                        venue.attributes.wmephSeverity = severity;
                    } catch (err) {
                        console.error('WMEPH highlight error: ', err);
                    }
                } else {
                    venue.attributes.wmephSeverity = 'default';
                }
            }
        });

        // Trim the cache if it's over the max size limit.
        const keys = Object.keys(_resultsCache);
        if (keys.length > _MAX_CACHE_SIZE) {
            const trimSize = _MAX_CACHE_SIZE * 0.8;
            for (let i = keys.length - 1; i > trimSize; i--) {
                delete _resultsCache[keys[i]];
            }
        }

        const venue = getSelectedVenue();
        if (venue) {
            venue.attributes.wmephSeverity = harmonizePlaceGo(venue, 'highlight');
            _buttonBanner = storedBannButt;
            _servicesBanner = storedBannServ;
            _buttonBanner2 = storedBannButt2;
        }
        phlogdev(`Ran highlighter in ${Math.round((performance.now() - t0) * 10) / 10} milliseconds.`);
        phlogdev(`WMEPH cache size: ${Object.keys(_resultsCache).length}`);
    }

    // Set up CH loop
    function bootstrapWmephColorHighlights() {
        if (localStorage.getItem('WMEPH-ColorHighlighting') === '1') {
            // Add listeners
            W.model.venues.on('objectschanged', e => errorHandler(() => {
                if (!_disableHighlightTest) {
                    applyHighlightsTest(e, true);
                    _layer.redraw();
                }
            }));

            W.map.venueLayer.events.register('beforefeaturesadded', null, e => errorHandler(() => applyHighlightsTest(e.features.map(f => f.model))));

            // Clear the cache (highlight severities may need to be updated).
            _resultsCache = {};

            // Apply the colors
            applyHighlightsTest(W.model.venues.getObjectArray());
            _layer.redraw();
        } else {
            // reset the colors to default
            applyHighlightsTest(W.model.venues.getObjectArray());
            _layer.redraw();
        }
    }

    // Add array of actions to a MultiAction to be executed at once (counts as one edit for redo/undo purposes)
    function executeMultiAction(actions, description) {
        if (actions.length > 0) {
            const mAction = new MultiAction();
            mAction.setModel(W.model);
            mAction._description = description || mAction._description || 'Change(s) made by WMEPH';
            actions.forEach(action => { mAction.doSubAction(action); });
            W.model.actionManager.add(mAction);
        }
    }

    function addUpdateAction(venue, updateObj, actions) {
        const action = new UpdateObject(venue, updateObj);
        if (actions) {
            actions.push(action);
        } else {
            W.model.actionManager.add(action);
        }
    }

    function setServiceChecked(servBtn, checked, actions) {
        const servID = _WME_SERVICES_ARRAY[servBtn.servIDIndex];
        const checkboxChecked = $(`wz-checkbox[value="${servID}"]`).prop('checked');
        const venue = getSelectedVenue();

        if (checkboxChecked !== checked) {
            _UPDATED_FIELDS[`services_${servID}`].updated = true;
        }
        const toggle = typeof checked === 'undefined';
        let noAdd = false;
        checked = (toggle) ? !servBtn.checked : checked;
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
                services = venue.attributes.services.slice();
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

    // Only run the harmonization if a venue is selected
    function harmonizePlace() {
        // Beta version for approved users only
        if (_IS_BETA_VERSION && !_USER.isBetaUser) {
            WazeWrap.Alerts.error(_SCRIPT_NAME, 'Please sign up to beta-test this script version.<br>Send a PM or Slack-DM to MapOMatic or Tonestertm, or post in the WMEPH forum thread. Thanks.');
            return;
        }
        // Only run if a single place is selected
        const venue = getSelectedVenue();
        if (venue) {
            _UPDATED_FIELDS.reset();
            blurAll(); // focus away from current cursor position
            _disableHighlightTest = true;
            harmonizePlaceGo(venue, 'harmonize');
            _disableHighlightTest = false;
            applyHighlightsTest(venue);
        }
    }

    // Abstract flag classes.  Must be declared outside the "Flag" namespace.
    class FlagBase {
        constructor(active, severity, message) {
            this.active = active;
            this.severity = severity;
            this.message = message;
        }
    }
    // class ActionFlag extends FlagBase {
    //     constructor(active, severity, message, value, title) {
    //         super(active, severity, message);
    //         this.value = value;
    //         this.title = title;
    //     }

    //     // 5/19/2019 (mapomatic) This base class action function doesn't seem to be necessary.
    //     // action() { } // overwrite this
    // }
    class WLFlag extends FlagBase {
        WLactive;
        WLtitle;
        WLkeyName;
        constructor(active, severity, message, WLactive, WLtitle, WLkeyName) {
            super(active, severity, message);
            this.WLactive = WLactive;
            this.WLtitle = WLtitle;
            this.WLkeyName = WLkeyName;
        }

        WLaction() {
            const venue = getSelectedVenue();
            if (whitelistAction(venue.attributes.id, this.WLkeyName)) {
                harmonizePlaceGo(venue, 'harmonize');
            }
        }
    }
    class WLActionFlag extends WLFlag {
        value;
        title;
        constructor(active, severity, message, value, title, WLactive, WLtitle, WLkeyName) {
            super(active, severity, message, WLactive, WLtitle, WLkeyName);
            this.value = value;
            this.title = title;
        }

        // 5/19/2019 (mapomatic) This base class action function doesn't seem to be necessary.
        // action() { } // overwrite this
    }

    // Namespace to keep these grouped.
    const Flag = {
        MisspelledPlaceName: class extends WLActionFlag {
            static whitelistKey = 'misspelledPlaceName';
            constructor(venue, misspellingRegEx, correctedSpelling) {
                super(
                    true,
                    _SEVERITY.RED,
                    'This place has a misspelling.',
                    'Fix it',
                    'Fix place name',
                    true,
                    'Whitelist this issue (ignore it)',
                    Flag.MisspelledPlaceName.whitelistKey
                );
                this.misspellingRegEx = misspellingRegEx;
                this.correctedSpelling = correctedSpelling;
                this.venue = venue;
            }

            static eval(venue, expectedCategory, misspellingRegEx, correctedSpelling) {
                const attr = venue.attributes;
                let result = null;
                if (attr.categories.includes(expectedCategory) && !_wl[this.whitelistKey] && attr.name.match(misspellingRegEx)) {
                    result = new Flag.MisspelledPlaceName(venue, misspellingRegEx, correctedSpelling);
                }
                return result;
            }

            action() {
                const oldName = this.venue.attributes.name;
                const name = oldName.replace(this.misspellingRegEx, this.correctedSpelling);
                if (name !== oldName) {
                    const action = new UpdateObject(this.venue, { name });
                    W.model.actionManager.add(action);
                    _UPDATED_FIELDS.name.updated = true;
                }
                harmonizePlaceGo(this.venue, 'harmonize');
            }
        }
    }; // END Flag namespace

    function getButtonBanner() {
        // **** Set up banner action buttons.  Structure:
        // active: false until activated in the script
        // severity: determines the color of the banners and whether locking occurs
        // message: The text before the button option
        // value: button text
        // title: tooltip text
        // action: The action that happens if the button is pressed
        // WL terms are for whitelisting

        return {};
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
                active: false,
                checked: false,
                icon: 'serv-valet',
                w2hratio: 50 / 50,
                value: 'Valet',
                title: 'Valet service',
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
                }
            },
            addDriveThru: {
                active: false,
                checked: false,
                icon: 'serv-drivethru',
                w2hratio: 78 / 50,
                value: 'DriveThru',
                title: 'Drive-thru',
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
                }
            },
            addWiFi: {
                active: false,
                checked: false,
                icon: 'serv-wifi',
                w2hratio: 67 / 50,
                value: 'WiFi',
                title: 'Wi-Fi',
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
                }
            },
            addRestrooms: {
                active: false,
                checked: false,
                icon: 'serv-restrooms',
                w2hratio: 49 / 50,
                value: 'Restroom',
                title: 'Restrooms',
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
                }
            },
            addCreditCards: {
                active: false,
                checked: false,
                icon: 'serv-credit',
                w2hratio: 73 / 50,
                value: 'CC',
                title: 'Accepts credit cards',
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
                }
            },
            addReservations: {
                active: false,
                checked: false,
                icon: 'serv-reservations',
                w2hratio: 55 / 50,
                value: 'Reserve',
                title: 'Reservations',
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
                }
            },
            addOutside: {
                active: false,
                checked: false,
                icon: 'serv-outdoor',
                w2hratio: 73 / 50,
                value: 'OusideSeat',
                title: 'Outdoor seating',
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
                }
            },
            addAC: {
                active: false,
                checked: false,
                icon: 'serv-ac',
                w2hratio: 50 / 50,
                value: 'AC',
                title: 'Air conditioning',
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
                }
            },
            addParking: {
                active: false,
                checked: false,
                icon: 'serv-parking',
                w2hratio: 46 / 50,
                value: 'Customer parking',
                title: 'Parking',
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
                }
            },
            addDeliveries: {
                active: false,
                checked: false,
                icon: 'serv-deliveries',
                w2hratio: 86 / 50,
                value: 'Delivery',
                title: 'Deliveries',
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
                }
            },
            addTakeAway: {
                active: false,
                checked: false,
                icon: 'serv-takeaway',
                w2hratio: 34 / 50,
                value: 'Take-out',
                title: 'Take-out',
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
                }
            },
            addCurbside: {
                active: true,
                checked: false,
                icon: 'serv-curbside',
                w2hratio: 50 / 50,
                value: 'Curbside pickup',
                title: 'Curbside pickup',
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
                }
            },
            addWheelchair: {
                active: false,
                checked: false,
                icon: 'serv-wheelchair',
                w2hratio: 50 / 50,
                value: 'WhCh',
                title: 'Wheelchair accessible',
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
                }
            },
            addDisabilityParking: {
                active: false,
                checked: false,
                icon: 'serv-wheelchair',
                w2hratio: 50 / 50,
                value: 'DisabilityParking',
                title: 'Disability parking',
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
                }
            },
            add247: {
                active: false,
                checked: false,
                icon: 'serv-247',
                w2hratio: 73 / 50,
                value: '247',
                title: 'Hours: Open 24/7',
                action(actions) {
                    if (!_servicesBanner.add247.checked) {
                        const venue = getSelectedVenue();
                        addUpdateAction(venue, { openingHours: [new OpeningHour({ days: [1, 2, 3, 4, 5, 6, 0], fromHour: '00:00', toHour: '00:00' })] }, actions);
                        _servicesBanner.add247.checked = true;
                        _buttonBanner.noHours = null;
                    }
                },
                actionOn(actions) {
                    this.action(actions);
                }
            }
        };
    } // END getServicesBanner()

    function getButtonBanner2(venue, placePL) {
        return {
            clearWL: {
                active: false,
                severity: 0,
                message: '',
                value: 'Clear place whitelist',
                title: 'Clear all Whitelisted fields for this place',
                action() {
                    WazeWrap.Alerts.confirm(
                        _SCRIPT_NAME,
                        'Are you sure you want to clear all whitelisted fields for this place?',
                        () => {
                            delete _venueWhitelist[venue.attributes.id];
                            saveWhitelistToLS(true);
                            harmonizePlaceGo(venue, 'harmonize');
                        },
                        () => { },
                        'Yes',
                        'No'
                    );
                }
            },
            PlaceErrorForumPost: {
                active: true,
                severity: 0,
                message: '',
                value: 'Report script error',
                title: 'Report a script error',
                action() {
                    reportError({
                        subject: 'WMEPH Bug report: Script Error',
                        message: `Script version: ${_SCRIPT_VERSION}${_BETA_VERSION_STR}\nPermalink: ${
                            placePL}\nPlace name: ${venue.attributes.name}\nCountry: ${
                            venue.getAddress().getCountry().name}\n--------\nDescribe the error:  \n `
                    });
                }
            }
        };
    } // END getButtonBanner2()

    // Main script
    function harmonizePlaceGo(item, useFlag, actions) {
        let placePL;

        // Used for collecting all actions to be applied to the model.
        actions = actions || [];

        const highlightOnly = !useFlag.includes('harmonize');

        _severityButt = _SEVERITY.GREEN;

        // Whitelist: reset flags
        _wl = {
            dupeWL: []
        };
        // Whitelist breakout if place exists on the Whitelist and the option is enabled

        _buttonBanner = getButtonBanner();

        if (!highlightOnly) {
            // Uncomment this to test all field highlights.
            // _UPDATED_FIELDS.getFieldProperties().forEach(prop => {
            //     prop.updated = true;
            // });

            // The placePL should only be needed when harmonizing, not when highlighting.
            placePL = getCurrentPL() //  set up external post div and pull place PL
                .replace(/&layers=[^&]+(&?)/g, '$1') // remove Permalink Layers
                .replace(/&s=[^&]+(&?)/g, '$1') // remove Permalink Layers
                .replace(/&update_requestsFilter=[^&]+(&?)/g, '$1') // remove Permalink Layers
                .replace(/&problemsFilter=[^&]+(&?)/g, '$1') // remove Permalink Layers
                .replace(/&mapProblemFilter=[^&]+(&?)/g, '$1') // remove Permalink Layers
                .replace(/&mapUpdateRequestFilter=[^&]+(&?)/g, '$1') // remove Permalink Layers
                .replace(/&venueFilter=[^&]+(&?)/g, '$1'); // remove Permalink Layers

            _buttonBanner2 = getButtonBanner2(item, placePL);
            _servicesBanner = getServicesBanner();

            // Update icons to reflect current WME place services
            updateServicesChecks(_servicesBanner);

            if ($('#WMEPH-HideReportError').prop('checked')) {
                _buttonBanner2.PlaceErrorForumPost.active = false;
            }
        }

        let itemGPS;
        const itemID = item.attributes.id;
        const addr = item.getAddress().attributes;
        if (_venueWhitelist.hasOwnProperty(itemID) && (!highlightOnly || (highlightOnly && !$('#WMEPH-DisableWLHL').prop('checked')))) {
            // Enable the clear WL button if any property is true
            Object.keys(_venueWhitelist[itemID]).forEach(wlKey => { // loop thru the venue WL keys
                if (_venueWhitelist[itemID].hasOwnProperty(wlKey) && (_venueWhitelist[itemID][wlKey].active || false)) {
                    if (!highlightOnly) _buttonBanner2.clearWL.active = true;
                    _wl[wlKey] = _venueWhitelist[itemID][wlKey];
                }
            });
            if (_venueWhitelist[itemID].hasOwnProperty('dupeWL') && _venueWhitelist[itemID].dupeWL.length > 0) {
                if (!highlightOnly) _buttonBanner2.clearWL.active = true;
                _wl.dupeWL = _venueWhitelist[itemID].dupeWL;
            }
            // Update address and GPS info for the place
            if (!highlightOnly) {
                // get GPS lat/long coords from place, call as itemGPS.lat, itemGPS.lon
                if (!itemGPS) {
                    const centroid = item.attributes.geometry.getCentroid();
                    itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(centroid.x, centroid.y);
                }
                _venueWhitelist[itemID].city = addr.city.attributes.name; // Store city for the venue
                _venueWhitelist[itemID].state = addr.state.name; // Store state for the venue
                _venueWhitelist[itemID].country = addr.country.name; // Store country for the venue
                _venueWhitelist[itemID].gps = itemGPS; // Store GPS coords for the venue
            }
        }

        _buttonBanner.misspelledPlaceName = Flag.MisspelledPlaceName.eval(item, 'CHARGING_STATION', /Ladestaion/, 'Ladestation');

        // update Severity for banner messages
        Object.keys(_buttonBanner).forEach(key => {
            if (_buttonBanner[key] && _buttonBanner[key].active) {
                _severityButt = Math.max(_buttonBanner[key].severity, _severityButt);
            }
        });

        // Return severity for highlighter (no dupe run))
        if (highlightOnly) {
            // get severities from the banners
            _severityButt = _SEVERITY.GREEN;
            Object.keys(_buttonBanner).forEach(tempKey => {
                if (_buttonBanner[tempKey] && _buttonBanner[tempKey].active) { //  If the particular message is active
                    if (_buttonBanner[tempKey].hasOwnProperty('WLactive')) {
                        if (_buttonBanner[tempKey].WLactive) { // If there's a WL option, enable it
                            _severityButt = Math.max(_buttonBanner[tempKey].severity, _severityButt);
                        }
                    } else {
                        _severityButt = Math.max(_buttonBanner[tempKey].severity, _severityButt);
                    }
                }
            });

            return _severityButt;
        }

        // *** Below here is for harmonization only.  HL ends in previous step.

        executeMultiAction(actions);

        if (!highlightOnly) {
            // Update icons to reflect current WME place services
            updateServicesChecks(_servicesBanner);

            // Add green highlighting to edit panel fields that have been updated by WMEPH
            _UPDATED_FIELDS.updateEditPanelHighlights();
        }

        // Assemble the banners
        assembleBanner(); // Make Messaging banners

        showOpenPlaceWebsiteButton();
        showSearchButton();

        // Highlighting will return a value, but no need to return a value here (for end of harmonization).
        // Adding this line to satisfy eslint.
        return undefined;
    } // END harmonizePlaceGo function

    // Set up banner messages
    function assembleBanner() {
        const venue = getSelectedVenue();
        if (!venue) return;
        phlogdev('Building banners');
        let rowData;
        let $rowDiv;
        let rowDivs = [];
        _severityButt = _SEVERITY.GREEN;

        const func = elem => ({ id: elem.getAttribute('id'), val: elem.value });
        _textEntryValues = $('#WMEPH_banner input[type="text"]').toArray().map(func);
        _textEntryValues = _textEntryValues.concat($('#WMEPH_banner textarea').toArray().map(func));

        // Build banners above the Services
        Object.keys(_buttonBanner).forEach(tempKey => {
            rowData = _buttonBanner[tempKey];
            if (rowData && rowData.active) { //  If the particular message is active
                $rowDiv = $('<div class="banner-row">');
                if (rowData.severity === _SEVERITY.RED) {
                    $rowDiv.addClass('red');
                } else if (rowData.severity === _SEVERITY.YELLOW) {
                    $rowDiv.addClass('yellow');
                } else if (rowData.severity === _SEVERITY.BLUE) {
                    $rowDiv.addClass('blue');
                } else if (rowData.severity === _SEVERITY.GREEN) {
                    $rowDiv.addClass('gray');
                }
                if (rowData.divId) {
                    $rowDiv.attr('id', rowData.divId);
                }
                if (rowData.message && rowData.message.length) {
                    $rowDiv.append($('<span>').css({ 'margin-right': '4px' }).append(`&bull; ${rowData.message}`));
                }
                if (rowData.value) {
                    $rowDiv.append($('<button>', {
                        class: 'btn btn-default btn-xs wmeph-btn',
                        id: `WMEPH_${tempKey}`,
                        title: rowData.title || ''
                    }).css({ 'margin-right': '4px' }).html(rowData.value));
                }
                if (rowData.value2) {
                    $rowDiv.append($('<button>', {
                        class: 'btn btn-default btn-xs wmeph-btn',
                        id: `WMEPH_${tempKey}_2`,
                        title: rowData.title2 || ''
                    }).css({ 'margin-right': '4px' }).html(rowData.value2));
                }
                if (rowData.WLactive) {
                    if (rowData.WLaction) { // If there's a WL option, enable it
                        _severityButt = Math.max(rowData.severity, _severityButt);
                        $rowDiv.append(
                            $('<button>', { class: 'btn btn-success btn-xs wmephwl-btn', id: `WMEPH_WL${tempKey}`, title: rowData.WLtitle })
                                .text('WL')
                        );
                    }
                } else {
                    _severityButt = Math.max(rowData.severity, _severityButt);
                }
                if (rowData.suffixMessage) {
                    $rowDiv.append($('<div>').css({ 'margin-top': '2px' }).append(rowData.suffixMessage));
                }

                rowDivs.push($rowDiv);
            }
        });

        if ($('#WMEPH-ColorHighlighting').prop('checked')) {
            venue.attributes.wmephSeverity = _severityButt;
        }

        if ($('#WMEPH_banner').length === 0) {
            $('<div id="WMEPH_banner">').prependTo('#wmeph-panel');
        } else {
            $('#WMEPH_banner').empty();
        }
        let bgColor;
        switch (_severityButt) {
            case _SEVERITY.BLUE:
                bgColor = 'rgb(50, 50, 230)'; // blue
                break;
            case _SEVERITY.YELLOW:
                bgColor = 'rgb(217, 173, 42)'; // yellow
                break;
            case _SEVERITY.RED:
                bgColor = 'rgb(211, 48, 48)'; // red
                break;
            default:
                bgColor = 'rgb(36, 172, 36)'; // green
        }
        $('#WMEPH_banner').css({ 'background-color': bgColor }).append(rowDivs);

        assembleServicesBanner();

        //  Build general banners (below the Services)
        rowDivs = [];
        Object.keys(_buttonBanner2).forEach(tempKey => {
            const banner2RowData = _buttonBanner2[tempKey];
            if (banner2RowData.active) { //  If the particular message is active
                $rowDiv = $('<div>');
                $rowDiv.append(banner2RowData.message);
                if (banner2RowData.action) {
                    $rowDiv.append(` <input class="btn btn-info btn-xs wmeph-btn" id="WMEPH_${tempKey}" title="${
                        banner2RowData.title}" style="" type="button" value="${banner2RowData.value}">`);
                }
                rowDivs.push($rowDiv);
                _severityButt = Math.max(_buttonBanner2[tempKey].severity, _severityButt);
            }
        });

        if ($('#WMEPH_tools').length === 0) {
            $('#WMEPH_services').after($('<div id="WMEPH_tools">').css({
                // 'background-color': '#eee',
                color: 'black',
                'font-size': '15px',
                // padding: '0px 4px 4px 4px',
                'margin-left': '6px',
                'margin-right': 'auto'
            }));
        } else {
            $('#WMEPH_tools').empty();
        }
        $('#WMEPH_tools').append(rowDivs);

        // Setup bannButt onclicks
        setupButtons(_buttonBanner);

        // Setup bannButt2 onclicks
        setupButtons(_buttonBanner2);

        // Add click handlers for parking lot helper buttons.
        $('.wmeph-pla-spaces-btn').click(evt => {
            const selectedVenue = getSelectedVenue();
            const selectedValue = $(evt.currentTarget).attr('id').replace('wmeph_', '');
            const existingAttr = selectedVenue.attributes.categoryAttributes.PARKING_LOT;
            const newAttr = {};
            if (existingAttr) {
                Object.keys(existingAttr).forEach(prop => {
                    let value = existingAttr[prop];
                    if (Array.isArray(value)) value = [].concat(value);
                    newAttr[prop] = value;
                });
            }
            newAttr.estimatedNumberOfSpots = selectedValue;
            _UPDATED_FIELDS.parkingSpots.updated = true;
            W.model.actionManager.add(new UpdateObject(selectedVenue, { categoryAttributes: { PARKING_LOT: newAttr } }));
            harmonizePlaceGo(selectedVenue, 'harmonize');
        });

        $('.wmeph-pla-lot-type-btn').click(evt => {
            const selectedVenue = getSelectedVenue();
            const selectedValue = $(evt.currentTarget).data('lot-type');
            const existingAttr = selectedVenue.attributes.categoryAttributes.PARKING_LOT;
            const newAttr = {};
            if (existingAttr) {
                Object.keys(existingAttr).forEach(prop => {
                    let value = existingAttr[prop];
                    if (Array.isArray(value)) value = [].concat(value);
                    newAttr[prop] = value;
                });
            }
            newAttr.parkingType = selectedValue;
            _UPDATED_FIELDS.lotType.updated = true;
            W.model.actionManager.add(new UpdateObject(selectedVenue, { categoryAttributes: { PARKING_LOT: newAttr } }));
            harmonizePlaceGo(selectedVenue, 'harmonize');
        });

        $('.wmeph-pla-cost-type-btn').click(evt => {
            const selectedVenue = getSelectedVenue();
            const selectedValue = $(evt.currentTarget).attr('id').replace('wmeph_', '');
            const existingAttr = selectedVenue.attributes.categoryAttributes.PARKING_LOT;
            const newAttr = {};
            if (existingAttr) {
                Object.keys(existingAttr).forEach(prop => {
                    let value = existingAttr[prop];
                    if (Array.isArray(value)) value = [].concat(value);
                    newAttr[prop] = value;
                });
            }
            newAttr.costType = selectedValue;
            W.model.actionManager.add(new UpdateObject(selectedVenue, { categoryAttributes: { PARKING_LOT: newAttr } }));
            harmonizePlaceGo(selectedVenue, 'harmonize');
        });

        // If pressing enter in the HN entry box, add the HN
        $('#WMEPH-HNAdd').keyup(evt => {
            if (evt.keyCode === 13 && $('#WMEPH-HNAdd').val() !== '') {
                $('#WMEPH_hnMissing').click();
            }
        });

        // If pressing enter in the phone entry box, add the phone
        $('#WMEPH-PhoneAdd').keyup(evt => {
            if (evt.keyCode === 13 && $('#WMEPH-PhoneAdd').val() !== '') {
                $('#WMEPH_phoneMissing').click();
                $('#WMEPH_badAreaCode').click();
            }
        });

        // If pressing enter in the URL entry box, add the URL
        $('#WMEPH-UrlAdd').keyup(evt => {
            if (evt.keyCode === 13 && $('#WMEPH-UrlAdd').val() !== '') {
                $('#WMEPH_urlMissing').click();
            }
        });

        // If pressing enter in the USPS zip code alt entry box...
        $('#WMEPH-zipAltNameAdd').keyup(evt => {
            if (evt.keyCode === 13 && $(evt.currentTarget).val() !== '') {
                $('#WMEPH_missingUSPSZipAlt').click();
            }
        });

        // If pasting or dropping into hours entry box
        function resetHoursEntryHeight() {
            const $sel = $('#WMEPH-HoursPaste');
            $sel.focus();
            const oldText = $sel.val();
            if (oldText === _DEFAULT_HOURS_TEXT) {
                $sel.val('');
            }

            // A small delay to allow window to process pasted text before running.
            setTimeout(() => {
                const text = $sel.val();
                const elem = $sel[0];
                const lineCount = (text.match(/\n/g) || []).length + 1;
                const height = lineCount * 18 + 6 + (elem.scrollWidth > elem.clientWidth ? 20 : 0);
                $sel.css({ height: `${height}px` });
            }, 100);
        }
        $('#WMEPH-HoursPaste')
            .bind('paste', resetHoursEntryHeight)
            .bind('drop', resetHoursEntryHeight)
            .bind('dragenter', evt => {
                const $control = $(evt.currentTarget);
                const text = $control.val();
                if (text === _DEFAULT_HOURS_TEXT) {
                    $control.val('');
                }
            })
            .keydown(evt => {
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
            .focus(evt => {
                const target = evt.currentTarget;
                if (target.value === _DEFAULT_HOURS_TEXT) {
                    target.value = '';
                }
                target.style.color = 'black';
            })
            .blur(evt => {
                const target = evt.currentTarget;
                if (target.value === '') {
                    target.value = _DEFAULT_HOURS_TEXT;
                    target.style.color = '#999';
                }
            });

        // Format "no hours" section and hook up button events.
        $('#WMEPH_WLnoHours').css({ 'vertical-align': 'top' });

        // NOTE: Leave these wrapped in the "() => ..." functions, to make sure "this" is bound properly.
        if (_buttonBanner.noHours) {
            $('#WMEPH_noHours').click(() => _buttonBanner.noHours.addHoursAction());
            $('#WMEPH_noHours_2').click(() => _buttonBanner.noHours.replaceHoursAction());
        }

        if (_textEntryValues) {
            _textEntryValues.forEach(entry => $(`#${entry.id}`).val(entry.val));
        }
    } // END assemble Banner function

    function assembleServicesBanner() {
        const venue = getSelectedVenue();
        if (venue && !$('#WMEPH-HideServicesButtons').prop('checked')) {
            // setup Add Service Buttons for suggested services
            const rowDivs = [];
            if (!venue.isResidential()) {
                const $rowDiv = $('<div>');
                const servButtHeight = '27';
                const buttons = [];
                Object.keys(_servicesBanner).forEach(tempKey => {
                    const rowData = _servicesBanner[tempKey];
                    if (rowData.active) { //  If the particular service is active
                        const $input = $('<input>', {
                            class: rowData.icon,
                            id: `WMEPH_${tempKey}`,
                            type: 'button',
                            title: rowData.title
                        }).css(
                            {
                                border: 0,
                                'background-size': 'contain',
                                height: '27px',
                                width: `${Math.ceil(servButtHeight * rowData.w2hratio).toString()}px`
                            }
                        );
                        buttons.push($input);
                        if (!rowData.checked) {
                            $input.css({ '-webkit-filter': 'opacity(.3)', filter: 'opacity(.3)' });
                        } else {
                            $input.css({ color: 'green' });
                        }
                        $rowDiv.append($input);
                    }
                });
                if ($rowDiv.length) {
                    $rowDiv.prepend('<span class="control-label" title="Verify all Place services before saving">Services (select any that apply):</span><br>');
                }
                rowDivs.push($rowDiv);
            }
            if ($('#WMEPH_services').length === 0) {
                $('#WMEPH_banner').after($('<div id="WMEPH_services">').css({
                    color: 'black',
                    'font-size': '15px',
                    'margin-left': '6px'
                }));
            } else {
                $('#WMEPH_services').empty();
            }
            $('#WMEPH_services').append(rowDivs);

            // Setup bannServ onclicks
            if (!venue.isResidential()) {
                setupButtons(_servicesBanner);
            }
        }
    }

    // Button onclick event handler
    function setupButtons(b) {
        Object.keys(b).forEach(tempKey => { // Loop through the banner possibilities
            if (b[tempKey] && b[tempKey].active) { //  If the particular message is active
                if (b[tempKey].action && b[tempKey].value) { // If there is an action, set onclick
                    buttonAction(b, tempKey);
                }
                if (b[tempKey].action2 && b[tempKey].value2) { // If there is an action2, set onclick
                    buttonAction2(b, tempKey);
                }
                // If there's a WL option, set up onclick
                if (b[tempKey].WLactive && b[tempKey].WLaction) {
                    buttonWhitelist(b, tempKey);
                }
            }
        });
    }

    function buttonAction(b, bKey) {
        const button = document.getElementById(`WMEPH_${bKey}`);
        button.onclick = () => {
            b[bKey].action();
            if (!b[bKey].noBannerAssemble) assembleBanner();
        };
        return button;
    }
    function buttonAction2(b, bKey) {
        const button = document.getElementById(`WMEPH_${bKey}_2`);
        button.onclick = () => {
            b[bKey].action2();
            if (!b[bKey].noBannerAssemble) assembleBanner();
        };
        return button;
    }
    function buttonWhitelist(b, bKey) {
        const button = document.getElementById(`WMEPH_WL${bKey}`);
        button.onclick = () => {
            if (bKey.match(/^\d{5,}/) !== null) {
                b[bKey].WLaction(bKey);
            } else {
                b[bKey].WLaction();
            }
            b[bKey].WLactive = false;
            b[bKey].severity = _SEVERITY.GREEN;
            assembleBanner();
        };
        return button;
    }

    // Display run button on place sidebar
    function showRunButton() {
        $('<div id="WMEPH_runButton">').prependTo('#wmeph-panel');
        const devVersSuffix = _IS_BETA_VERSION ? '-β' : '';
        const strButt1 = `<input class="btn btn-primary wmeph-fat-btn" id="runWMEPH" title="Run WMEPH${
            devVersSuffix} on Place" type="button" value="Run WMEPH${devVersSuffix}">`;
        $('#WMEPH_runButton').append(strButt1);
        const btn = document.getElementById('runWMEPH');
        if (btn !== null) {
            btn.onclick = () => {
                harmonizePlace();
            };
        }
    }

    // Displays the Open Place Website button.
    function showOpenPlaceWebsiteButton() {
        const venue = getSelectedVenue();
        if (venue) {
            let openPlaceWebsiteURL = venue.attributes.url;
            if (openPlaceWebsiteURL && openPlaceWebsiteURL.replace(/[^A-Za-z0-9]/g, '').length > 2) {
                if (!$('#WMEPHurl').length) {
                    const strButt1 = '<input class="btn btn-success btn-xs wmeph-fat-btn" id="WMEPHurl" title="Open place URL" type="button" value="Website">';
                    $('#runWMEPH').after(strButt1);
                    const btn = document.getElementById('WMEPHurl');
                    if (btn !== null) {
                        btn.onclick = () => {
                            openPlaceWebsiteURL = venue.attributes.url;
                            if (openPlaceWebsiteURL.match(/^http/i) === null) {
                                openPlaceWebsiteURL = `http://${openPlaceWebsiteURL}`;
                            }
                            if ($('#WMEPH-WebSearchNewTab').prop('checked')) {
                                window.open(openPlaceWebsiteURL);
                            } else {
                                window.open(openPlaceWebsiteURL, _SEARCH_RESULTS_WINDOW_NAME, _searchResultsWindowSpecs);
                            }
                        };
                    } else {
                        setTimeout(initWmephPanel, 100);
                    }
                }
            } else if ($('#WMEPHurl').length) {
                $('#WMEPHurl').remove();
            }
        }
    }

    function showSearchButton() {
        const venue = getSelectedVenue();
        if (venue && $('#wmephSearch').length === 0 && !venue.isResidential()) {
            const strButt1 = '<input class="btn btn-danger btn-xs wmeph-fat-btn" id="wmephSearch" title="Search the web for this place.  Do not copy info from 3rd party sources!" '
                + 'type="button" value="Google">';
            $('#WMEPH_runButton').append(strButt1);
            const btn = document.getElementById('wmephSearch');
            if (btn !== null) {
                btn.onclick = () => {
                    const addr = venue.getAddress();
                    if (addr.hasState()) {
                        const url = buildGLink(venue.attributes.name, addr, venue.attributes.houseNumber);
                        if ($('#WMEPH-WebSearchNewTab').prop('checked')) {
                            window.open(url);
                        } else {
                            window.open(url, _SEARCH_RESULTS_WINDOW_NAME, _searchResultsWindowSpecs);
                        }
                    } else {
                        WazeWrap.Alerts.error(_SCRIPT_NAME, 'The state and country haven\'t been set for this place yet.  Edit the address first.');
                    }
                };
            } else {
                setTimeout(initWmephPanel, 100);
            }
        }
    }

    // Catch PLs and reloads that have a place selected already and limit attempts to about 10 seconds
    function initWmephPanel() {
        $('#wmeph-panel').remove();
        if (W.selectionManager.getSelectedFeatures().length === 1) {
            const venue = getSelectedVenue();
            if (venue && venue.isApproved()) {
                $('.contents').prepend('<div id="wmeph-panel">');
                showRunButton();
                showOpenPlaceWebsiteButton();
                showSearchButton();
                getPanelFields();
            }
        }
    }

    // Find field divs
    function getPanelFields() {
        let panelFieldsList = $('.form-control');
        for (let pfix = 0; pfix < panelFieldsList.length; pfix++) {
            const pfa = panelFieldsList[pfix].name;
            if (pfa === 'name') {
                _PANEL_FIELDS.name = pfix;
            }
            if (pfa === 'lockRank') {
                _PANEL_FIELDS.lockRank = pfix;
            }
            if (pfa === 'description') {
                _PANEL_FIELDS.description = pfix;
            }
            if (pfa === 'url') {
                _PANEL_FIELDS.url = pfix;
            }
            if (pfa === 'phone') {
                _PANEL_FIELDS.phone = pfix;
            }
            if (pfa === 'brand') {
                _PANEL_FIELDS.brand = pfix;
            }
        }
        const placeNavTabs = $('.nav');
        for (let pfix = 0; pfix < placeNavTabs.length; pfix++) {
            const pfa = placeNavTabs[pfix].innerHTML;
            if (pfa.includes('venue-edit')) {
                panelFieldsList = placeNavTabs[pfix].children;
                _PANEL_FIELDS.navTabsIX = pfix;
                break;
            }
        }
        for (let pfix = 0; pfix < panelFieldsList.length; pfix++) {
            const pfa = panelFieldsList[pfix].innerHTML;
            if (pfa.includes('venue-edit-general')) {
                _PANEL_FIELDS.navTabGeneral = pfix;
            }
            if (pfa.includes('venue-edit-more')) {
                _PANEL_FIELDS.navTabMore = pfix;
            }
        }
    }

    function buildGLink(searchName, addr, HN) {
        let searchHN = '';
        let searchStreet = '';
        let searchCity = '';
        searchName = searchName.replace(/\//g, ' ');
        if (!addr.isEmptyStreet()) {
            searchStreet = `${addr.getStreetName()}, `
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
        const city = addr.getCity();
        if (city && !city.isEmpty()) {
            searchCity = `${city.getName()}, `;
        }

        searchName = searchName + (searchName ? ', ' : '') + searchHN + searchStreet
            + searchCity + addr.getStateName();
        return `http://www.google.com/search?q=${encodeURIComponent(searchName)}`;
    }

    // Function that inserts a string or a string array into another string array at index ix and removes any duplicates
    function insertAtIX(array1, array2, ix) { // array1 is original string, array2 is the inserted string, at index ix
        const arrayNew = array1.slice(); // slice the input array so it doesn't change
        if (typeof (array2) === 'string') { array2 = [array2]; } // if a single string, convert to an array
        if (typeof (array2) === 'object') { // only apply to inserted arrays
            const arrayTemp = arrayNew.splice(ix); // split and hold the first part
            arrayNew.push(...array2); // add the insert
            arrayNew.push(...arrayTemp); // add the tail end of original
        }
        return _.uniq(arrayNew); // remove any duplicates (so the function can be used to move the position of a string)
    }

    function initSettingsCheckbox(settingID) {
        // Associate click event of new checkbox to call saveSettingToLocalStorage with proper ID
        $(`#${settingID}`).click(() => { saveSettingToLocalStorage(settingID); });
        // Load Setting for Local Storage, if it doesn't exist set it to NOT checked.
        // If previously set to 1, then trigger "click" event.
        if (!localStorage.getItem(settingID)) {
            // phlogdev(settingID + ' not found.');
        } else if (localStorage.getItem(settingID) === '1') {
            $(`#${settingID}`).prop('checked', true);
        }
    }

    // This routine will create a checkbox in the #PlaceHarmonizer tab and will load the setting
    //        settingID:  The #id of the checkbox being created.
    //  textDescription:  The description of the checkbox that will be use
    function createSettingsCheckbox($div, settingID, textDescription) {
        const $checkbox = $('<input>', { type: 'checkbox', id: settingID });
        $div.append(
            $('<div>', { class: 'controls-container' }).css({ paddingTop: '2px' }).append(
                $checkbox,
                $('<label>', { for: settingID }).text(textDescription).css({ whiteSpace: 'pre-line' })
            )
        );
        return $checkbox;
    }

    function onKBShortcutModifierKeyClick() {
        const $modifKeyCheckbox = $('#WMEPH-KBSModifierKey');
        const $shortcutInput = $('#WMEPH-KeyboardShortcut');
        const $warn = $('#PlaceHarmonizerKBWarn');
        const modifKeyNew = $modifKeyCheckbox.prop('checked') ? 'Ctrl+' : 'Alt+';

        _shortcutParse = parseKBSShift($shortcutInput.val());
        $warn.empty(); // remove any warning
        _SHORTCUT.remove(_modifKey + _shortcutParse);
        _modifKey = modifKeyNew;
        _SHORTCUT.add(_modifKey + _shortcutParse, harmonizePlace);
        $('#PlaceHarmonizerKBCurrent').empty().append(
            `<span style="font-weight:bold">Current shortcut: ${_modifKey}${_shortcutParse}</span>`
        );
    }

    function onKBShortcutChange() {
        const keyId = 'WMEPH-KeyboardShortcut';
        const $warn = $('#PlaceHarmonizerKBWarn');
        const $key = $(`#${keyId}`);
        const oldKey = localStorage.getItem(keyId);
        const newKey = $key.val();

        $warn.empty(); // remove old warning
        if (newKey.match(/^[a-z]{1}$/i) !== null) { // If a single letter...
            _shortcutParse = parseKBSShift(oldKey);
            const shortcutParseNew = parseKBSShift(newKey);
            _SHORTCUT.remove(_modifKey + _shortcutParse);
            _shortcutParse = shortcutParseNew;
            _SHORTCUT.add(_modifKey + _shortcutParse, harmonizePlace);
            $(localStorage.setItem(keyId, newKey));
            $('#PlaceHarmonizerKBCurrent').empty().append(`<span style="font-weight:bold">Current shortcut: ${_modifKey}${_shortcutParse}</span>`);
        } else { // if not a letter then reset and flag
            $key.val(oldKey);
            $warn.append('<p style="color:red">Only letters are allowed<p>');
        }
    }

    function setCheckedByDefault(id) {
        if (localStorage.getItem(id) === null) {
            localStorage.setItem(id, '1');
        }
    }

    // User pref for KB Shortcut:
    function initShortcutKey() {
        const $current = $('#PlaceHarmonizerKBCurrent');
        const defaultShortcutKey = _IS_BETA_VERSION ? 'S' : 'A';
        const shortcutID = 'WMEPH-KeyboardShortcut';
        let shortcutKey = localStorage.getItem(shortcutID);
        const $shortcutInput = $(`#${shortcutID}`);

        // Set local storage to default if none
        if (shortcutKey === null || !/^[a-z]{1}$/i.test(shortcutKey)) {
            localStorage.setItem(shortcutID, defaultShortcutKey);
            shortcutKey = defaultShortcutKey;
        }
        $shortcutInput.val(shortcutKey);

        if (localStorage.getItem('WMEPH-KBSModifierKey') === '1') { // Change modifier key code if checked
            _modifKey = 'Ctrl+';
        }
        _shortcutParse = parseKBSShift(shortcutKey);
        if (!_initAlreadyRun) _SHORTCUT.add(_modifKey + _shortcutParse, harmonizePlace);
        $current.empty().append(`<span style="font-weight:bold">Current shortcut: ${_modifKey}${_shortcutParse}</span>`);

        $('#WMEPH-KBSModifierKey').click(onKBShortcutModifierKeyClick);

        // Upon change of the KB letter:
        $shortcutInput.change(onKBShortcutChange);
    }

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
            WazeWrap.Alerts.confirm( // if the category doesn't translate, then pop an alert that will make a forum post to the thread
                _SCRIPT_NAME,
                '***Do you want to reset all Whitelist data?<br>Click OK to erase.',
                () => {
                    _venueWhitelist = { '1.1.1': { Placeholder: {} } }; // Populate with a dummy place
                    saveWhitelistToLS(true);
                },
                () => { }
            );
        } else { // try to merge uncompressed WL data
            _WLSToMerge = validateWLS($('#WMEPH-WLInput').val());
            if (_WLSToMerge) {
                phlog('Whitelists merged!');
                _venueWhitelist = mergeWL(_venueWhitelist, _WLSToMerge);
                saveWhitelistToLS(true);
                $wlToolsMsg.append('<p style="color:green">Whitelist data merged<p>');
                $wlInput.val('');
            } else { // try compressed WL
                _WLSToMerge = validateWLS(LZString.decompressFromUTF16($('#WMEPH-WLInput').val()));
                if (_WLSToMerge) {
                    phlog('Whitelists merged!');
                    _venueWhitelist = mergeWL(_venueWhitelist, _WLSToMerge);
                    saveWhitelistToLS(true);
                    $wlToolsMsg.append('<p style="color:green">Whitelist data merged<p>');
                    $wlInput.val('');
                } else {
                    $wlToolsMsg.append('<p style="color:red">Invalid Whitelist data<p>');
                }
            }
        }
    }

    function onWLPullClick() {
        $('#WMEPH-WLInput').val(
            LZString.decompressFromUTF16(
                localStorage.getItem(_WL_LOCAL_STORE_NAME_COMPRESSED)
            )
        );
        $('#PlaceHarmonizerWLToolsMsg').empty().append(
            '<p style="color:green">To backup the data, copy & paste the text in the box to a safe location.<p>'
        );
        localStorage.setItem('WMEPH_WLAddCount', 1);
    }

    function onWLStatsClick() {
        const currWLData = JSON.parse(
            LZString.decompressFromUTF16(
                localStorage.getItem(_WL_LOCAL_STORE_NAME_COMPRESSED)
            )
        );
        const countryWL = {};
        const stateWL = {};
        const entries = Object.keys(currWLData).filter(key => key !== '1.1.1');

        $('#WMEPH-WLInputBeta').val('');
        entries.forEach(venueKey => {
            const country = currWLData[venueKey].country || 'None';
            const state = currWLData[venueKey].state || 'None';
            countryWL[country] = countryWL[country] + 1 || 1;
            stateWL[state] = stateWL[state] + 1 || 1;
        });

        const getSectionDiv = (title, list) => $('<div>', { style: 'margin-bottom: 10px;' }).append(
            $('<div>', { style: 'font-weight: bold; text-decoration: underline' }).text(title),
            Object.keys(list).map(key => $('<div>').text(`${key}: ${list[key]}`))
        );

        $('#PlaceHarmonizerWLToolsMsg').empty().append(
            $('<div>', { style: 'margin-bottom: 10px;' }).text(`Number of WL places: ${entries.length}`),
            getSectionDiv('States', stateWL),
            getSectionDiv('Countries', countryWL)
        );
    }

    function onWLStateFilterClick() {
        const $wlInput = $('#WMEPH-WLInput');
        const stateToRemove = $wlInput.val().trim();
        let msgColor;
        let msgText;

        if (stateToRemove.length < 2) {
            msgColor = 'red';
            msgText = 'Invalid state. Enter the state name in the "Whitelist string" box above, '
                + 'exactly as it appears in the Stats output.';
        } else {
            const currWLData = JSON.parse(
                LZString.decompressFromUTF16(
                    localStorage.getItem(_WL_LOCAL_STORE_NAME_COMPRESSED)
                )
            );
            const venuesToRemove = Object.keys(currWLData).filter(
                venueKey => venueKey !== '1.1.1' && (currWLData[venueKey].state === stateToRemove
                    || (!currWLData[venueKey].state && stateToRemove === 'None'))
            );
            if (venuesToRemove.length > 0) {
                if (localStorage.WMEPH_WLAddCount === '1') {
                    /* if (confirm(`Are you sure you want to clear all whitelist data for ${
                        stateToRemove}? This CANNOT be undone. Press OK to delete, cancel to preserve the data.`)) {
                        backupWhitelistToLS(true);
                        venuesToRemove.forEach(venueKey => {
                            delete _venueWhitelist[venueKey];
                        });
                        saveWhitelistToLS(true);
                        msgColor = 'green';
                        msgText = `${venuesToRemove.length} items removed from WL`;
                        $wlInput.val('');
                    } else {
                        msgColor = 'blue';
                        msgText = 'No changes made';
                    } */
                    WazeWrap.Alerts.confirm(
                        _SCRIPT_NAME,
                        `Are you sure you want to clear all whitelist data for ${stateToRemove}? This CANNOT be undone. `
                        + 'Press OK to delete, cancel to preserve the data.',
                        () => {
                            backupWhitelistToLS(true);
                            venuesToRemove.forEach(venueKey => {
                                delete _venueWhitelist[venueKey];
                            });
                            saveWhitelistToLS(true);
                            $wlInput.val('');
                            $('#PlaceHarmonizerWLToolsMsg').empty().append($('<p>').css({ color: 'green' }).text(`${venuesToRemove.length} items removed from WL`));
                        },
                        () => { $('#PlaceHarmonizerWLToolsMsg').empty().append($('<p>').css({ color: 'blue' }).text('No changes made')); }
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
        $('#PlaceHarmonizerWLToolsMsg').empty().append($('<p>').css({ color: msgColor }).text(msgText));
    }

    function onWLShareClick() {
        window.open(`https://docs.google.com/forms/d/1k_5RyOq81Fv4IRHzltC34kW3IUbXnQqDVMogwJKFNbE/viewform?entry.1173700072=${_USER.name}`);
    }

    // settings tab
    function initWmephTab() {
        // Enable certain settings by default if not set by the user:
        setCheckedByDefault('WMEPH-ColorHighlighting');
        setCheckedByDefault('WMEPH-DisablePLAExtProviderCheck');

        // Initialize settings checkboxes
        initSettingsCheckbox('WMEPH-WebSearchNewTab');
        initSettingsCheckbox('WMEPH-DisableDFZoom');
        initSettingsCheckbox('WMEPH-EnableIAZoom');
        initSettingsCheckbox('WMEPH-HidePlacesWiki');
        initSettingsCheckbox('WMEPH-HideReportError');
        initSettingsCheckbox('WMEPH-HideServicesButtons');
        initSettingsCheckbox('WMEPH-HidePURWebSearch');
        initSettingsCheckbox('WMEPH-ShowPLAExitWhileClosed');
        if (_USER.isDevUser || _USER.isBetaUser || _USER.rank >= 2) {
            initSettingsCheckbox('WMEPH-DisablePLAExtProviderCheck');
            initSettingsCheckbox('WMEPH-AddAddresses');
            initSettingsCheckbox('WMEPH-EnableCloneMode');
            initSettingsCheckbox('WMEPH-AutoLockRPPs');
        }
        initSettingsCheckbox('WMEPH-ColorHighlighting');
        initSettingsCheckbox('WMEPH-DisableHoursHL');
        initSettingsCheckbox('WMEPH-DisableRankHL');
        initSettingsCheckbox('WMEPH-DisableWLHL');
        initSettingsCheckbox('WMEPH-PLATypeFill');
        initSettingsCheckbox('WMEPH-KBSModifierKey');

        if (_USER.isDevUser) {
            initSettingsCheckbox('WMEPH-RegionOverride');
        }

        // Turn this setting on one time.
        if (!_initAlreadyRun) {
            const runOnceDefaultIgnorePlaGoogleLinkChecks = localStorage.getItem('WMEPH-runOnce-defaultToOff-plaGoogleLinkChecks');
            if (!runOnceDefaultIgnorePlaGoogleLinkChecks) {
                const $chk = $('#WMEPH-DisablePLAExtProviderCheck');
                if (!$chk.prop('checked')) { $chk.trigger('click'); }
            }
            localStorage.setItem('WMEPH-runOnce-defaultToOff-plaGoogleLinkChecks', true);
        }

        initShortcutKey();

        if (localStorage.getItem('WMEPH_WLAddCount') === null) {
            localStorage.setItem('WMEPH_WLAddCount', 2); // Counter to remind of WL backups
        }

        // Reload Data button click event
        $('#WMEPH-ReloadDataBtn').click(() => {
            $('.checkmark').toggle();
            downloadPnhData(true);
            setTimeout(() => $('.checkmark').toggle(), 3000);
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
        $('#WMEPH-PLATypeFill').click(() => applyHighlightsTest(W.model.venues.getObjectArray()));

        _initAlreadyRun = true;
    }

    function addWmephTab() {
        // Set up the CSS
        GM_addStyle(_CSS);

        const $container = $('<div class="active">');
        const $reloadDataBtn = $('<div style="margin-bottom:6px; text-align:center;"><div style="position:relative; display:inline-block; width:75%"><input id="WMEPH-ReloadDataBtn" style="min-width:90px; width:50%" class="btn btn-success wmeph-fat-btn" type="button" title="Refresh Data" value="Refresh Data"/><div class="checkmark draw"></div></div></div>');
        const $navTabs = $(
            '<ul class="nav nav-tabs"><li class="active"><a data-toggle="tab" href="#sidepanel-harmonizer">Harmonize</a></li>'
            + '<li><a data-toggle="tab" href="#sidepanel-highlighter">HL / Scan</a></li>'
            + '<li><a data-toggle="tab" href="#sidepanel-wltools">WL Tools</a></li>'
            + '<li><a data-toggle="tab" href="#sidepanel-pnh-moderators">Moderators</a></li></ul>'
        );
        const $tabContent = $('<div class="tab-content">');
        const $harmonizerTab = $('<div class="tab-pane active" id="sidepanel-harmonizer"></div>');
        const $highlighterTab = $('<div class="tab-pane" id="sidepanel-highlighter"></div>');
        const $wlToolsTab = $('<div class="tab-pane" id="sidepanel-wltools"></div>');
        const $moderatorsTab = $('<div class="tab-pane" id="sidepanel-pnh-moderators"></div>');
        $tabContent.append($harmonizerTab, $highlighterTab, $wlToolsTab, $moderatorsTab);
        $container.append($reloadDataBtn, $navTabs, $tabContent);

        // Harmonizer settings
        // createSettingsCheckbox($harmonizerTab, 'WMEPH-WebSearchNewTab', 'Open URL & Search Results in new tab instead of new window');
        // createSettingsCheckbox($harmonizerTab, 'WMEPH-DisableDFZoom', 'Disable zoom & center for duplicates');
        // createSettingsCheckbox($harmonizerTab, 'WMEPH-EnableIAZoom', 'Enable zoom & center for places with no address');
        // createSettingsCheckbox($harmonizerTab, 'WMEPH-HidePlacesWiki', 'Hide "Places Wiki" button in results banner');
        createSettingsCheckbox($harmonizerTab, 'WMEPH-HideReportError', 'Hide "Report script error" button in results banner');
        createSettingsCheckbox($harmonizerTab, 'WMEPH-HideServicesButtons', 'Hide services buttons in results banner');
        createSettingsCheckbox($harmonizerTab, 'WMEPH-HidePURWebSearch', 'Hide "Web Search" button on PUR popups');
        // createSettingsCheckbox($harmonizerTab, 'WMEPH-ExcludePLADupes', 'Exclude parking lots when searching for duplicate places');
        // createSettingsCheckbox($harmonizerTab, 'WMEPH-ShowPLAExitWhileClosed', 'Always ask if cars can exit parking lots');
        if (_USER.isDevUser || _USER.isBetaUser || _USER.rank >= 2) {
            createSettingsCheckbox($harmonizerTab, 'WMEPH-DisablePLAExtProviderCheck', 'Disable check for "Google place link" on Parking Lot Areas');
            createSettingsCheckbox($harmonizerTab, 'WMEPH-AddAddresses', 'Add detected address fields to places with no address');
            createSettingsCheckbox($harmonizerTab, 'WMEPH-EnableCloneMode', 'Enable place cloning tools');
            createSettingsCheckbox($harmonizerTab, 'WMEPH-AutoLockRPPs', 'Lock residential place points to region default');
        }

        $harmonizerTab.append('<hr class="wmeph-hr" align="center" width="100%">');

        // Add Letter input box
        const $phShortcutDiv = $('<div id="PlaceHarmonizerKB">');
        // eslint-disable-next-line max-len
        $phShortcutDiv.append('<div id="PlaceHarmonizerKBWarn"></div>Shortcut Letter (a-Z): <input type="text" maxlength="1" id="WMEPH-KeyboardShortcut" style="width: 30px;padding-left:8px"><div id="PlaceHarmonizerKBCurrent"></div>');
        createSettingsCheckbox($phShortcutDiv, 'WMEPH-KBSModifierKey', 'Use Ctrl instead of Alt'); // Add Alt-->Ctrl checkbox

        if (_USER.isDevUser) { // Override script regionality (devs only)
            $phShortcutDiv.append('<hr class="wmeph-hr" align="center" width="100%"><p>Dev Only Settings:</p>');
            createSettingsCheckbox($phShortcutDiv, 'WMEPH-RegionOverride', 'Disable Region Specificity');
        }

        $harmonizerTab.append(
            $phShortcutDiv,
            '<hr class="wmeph-hr" align="center" width="100%">',
            `<div><a href="${_URLS.forum}" target="_blank">Submit script feedback & suggestions</a></div>`,
            '<hr class="wmeph-hr" align="center" width="95%">'
        );

        // Highlighter settings
        $highlighterTab.append('<p>Highlighter Settings:</p>');
        createSettingsCheckbox($highlighterTab, 'WMEPH-ColorHighlighting', 'Enable color highlighting of map to indicate places needing work');
        // createSettingsCheckbox($highlighterTab, 'WMEPH-DisableHoursHL', 'Disable highlighting for missing hours');
        // createSettingsCheckbox($highlighterTab, 'WMEPH-DisableRankHL', 'Disable highlighting for places locked above your rank');
        // createSettingsCheckbox($highlighterTab, 'WMEPH-DisableWLHL', 'Disable Whitelist highlighting (shows all missing info regardless of WL)');
        createSettingsCheckbox($highlighterTab, 'WMEPH-PLATypeFill', 'Fill parking lots based on type (public=blue, restricted=yellow, private=red)');
        if (_USER.isDevUser || _USER.isBetaUser || _USER.rank >= 3) {
            // createSettingsCheckbox($highlighterTab 'WMEPH-UnlockedRPPs','Highlight unlocked residential place points');
        }

        // Scanner settings
        // $highlighterTab.append('<hr align="center" width="90%">');
        // $highlighterTab.append('<p>Scanner Settings (coming !soon)</p>');
        // createSettingsCheckbox($highlighterTab, 'WMEPH-PlaceScanner','Placeholder, under development!');

        // Whitelisting settings
        const phWLContentHtml = $(
            '<div id="PlaceHarmonizerWLTools">Whitelist string: <input onClick="this.select();" type="text" id="WMEPH-WLInput" style="width:100%;padding-left:1px;display:block">'
            + '<div style="margin-top:3px;">'
            + '<input class="btn btn-success btn-xs wmeph-fat-btn" id="WMEPH-WLMerge" title="Merge the string into your existing Whitelist" type="button" value="Merge">'
            + '<input class="btn btn-success btn-xs wmeph-fat-btn" id="WMEPH-WLPull" title="Pull your existing Whitelist for backup or sharing" type="button" value="Pull">'
            + '<input class="btn btn-success btn-xs wmeph-fat-btn" id="WMEPH-WLShare" title="Share your Whitelist to a public Google sheet" type="button" value="Share your WL">'
            + '</div>'
            + '<div style="margin-top:12px;">'
            + '<input class="btn btn-info btn-xs wmeph-fat-btn" id="WMEPH-WLStats" title="Display WL stats" type="button" value="Stats">'
            + '<input class="btn btn-danger btn-xs wmeph-fat-btn" id="WMEPH-WLStateFilter" title="Remove all WL items for a state.  Enter the state in the \'Whitelist string\' box." '
            + '     type="button" value="Remove data for 1 State">'
            + '</div>'
            + '</div>'
            + '<div id="PlaceHarmonizerWLToolsMsg" style="margin-top:10px;"></div>'
        );
        $wlToolsTab.append(phWLContentHtml);

        new WazeWrap.Interface.Tab(`WMEPH${_IS_BETA_VERSION ? '-β' : ''}`, $container.html(), initWmephTab, null);
    }

    // function createCloneCheckbox(divID, settingID, textDescription) {
    //     $(`#${divID}`).append(`<input type="checkbox" id="${settingID}">${textDescription}</input>&nbsp&nbsp`);
    //     $(`#${settingID}`).click(() => saveSettingToLocalStorage(settingID));
    //     if (localStorage.getItem(settingID) === '1') {
    //         $(`#${settingID}`).trigger('click');
    //     }
    // }

    // Function to add Shift+ to upper case KBS
    function parseKBSShift(kbs) {
        return (/^[A-Z]{1}$/g.test(kbs) ? 'Shift+' : '') + kbs;
    }

    // Save settings prefs
    function saveSettingToLocalStorage(settingID) {
        localStorage.setItem(settingID, $(`#${settingID}`).prop('checked') ? '1' : '0');
    }

    // This function validates that the inputted text is a JSON
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

    // This function merges and updates venues from object wl2 into wl1
    function mergeWL(wl1, wl2) {
        let wlVenue1;
        let wlVenue2;
        Object.keys(wl2).forEach(venueKey => {
            if (wl1.hasOwnProperty(venueKey)) { // if the wl2 venue is in wl1, then update any keys
                wlVenue1 = wl1[venueKey];
                wlVenue2 = wl2[venueKey];
                // loop thru the venue WL keys
                Object.keys(wlVenue2).forEach(wlKey => {
                    // Only update if the wl2 key is active
                    if (wlVenue2.hasOwnProperty(wlKey) && wlVenue2[wlKey].active) {
                        // if the key is in the wl1 venue and it is active, then push any array data onto the key
                        if (wlVenue1.hasOwnProperty(wlKey) && wlVenue1[wlKey].active) {
                            if (wlVenue1[wlKey].hasOwnProperty('WLKeyArray')) {
                                wl1[venueKey][wlKey].WLKeyArray = insertAtIX(wl1[venueKey][wlKey].WLKeyArray, wl2[venueKey][wlKey].WLKeyArray, 100);
                            }
                        } else {
                            // if the key isn't in the wl1 venue, or if it's inactive, then copy the wl2 key across
                            wl1[venueKey][wlKey] = wl2[venueKey][wlKey];
                        }
                    }
                }); // END subLoop for venue keys
            } else { // if the venue doesn't exist in wl1, then add it
                wl1[venueKey] = wl2[venueKey];
            }
        });
        return wl1;
    }

    // Get services checkbox status
    function getServicesChecks(venue) {
        const servArrayCheck = [];
        for (let wsix = 0; wsix < _WME_SERVICES_ARRAY.length; wsix++) {
            if (venue.attributes.services.includes(_WME_SERVICES_ARRAY[wsix])) {
                servArrayCheck[wsix] = true;
            } else {
                servArrayCheck[wsix] = false;
            }
        }
        return servArrayCheck;
    }

    function updateServicesChecks() {
        const venue = getSelectedVenue();
        if (venue) {
            if (!_servicesBanner) return;
            const servArrayCheck = getServicesChecks(venue);
            let wsix = 0;
            Object.keys(_servicesBanner).forEach(keys => {
                if (_servicesBanner.hasOwnProperty(keys)) {
                    _servicesBanner[keys].checked = servArrayCheck[wsix]; // reset all icons to match any checked changes
                    _servicesBanner[keys].active = _servicesBanner[keys].active || servArrayCheck[wsix]; // display any manually checked non-active icons
                    wsix++;
                }
            });
            // Highlight 24/7 button if hours are set that way, and add button for all places
            if (isAlwaysOpen(venue)) {
                _servicesBanner.add247.checked = true;
            }
            _servicesBanner.add247.active = true;
        }
    }

    // Focus away from the current cursor focus, to set text box changes
    function blurAll() {
        const tmp = document.createElement('input');
        document.body.appendChild(tmp);
        tmp.focus();
        document.body.removeChild(tmp);
    }

    // Pulls the item PL
    function getCurrentPL() {
        // Return the current PL

        // 5/22/2019 (mapomatic)
        // I'm not sure what this was supposed to do.  Maybe an attempt to wait until the PL
        // was available when loading WME from PL with a place pre-selected and auto-run WMEPH
        // is turned on?  Whatever the purpose was, it won't work properly because it'll return
        // undefined, and the calling code is expecting a value.

        // if ($('.WazeControlPermalink').length === 0) {
        //     phlog('Waiting for PL div');
        //     setTimeout(getCurrentPL, 500);
        //     return;
        // }

        let pl = '';
        let elem = $('.WazeControlPermalink .permalink');
        if (elem.length && elem.attr('href').length) {
            pl = $('.WazeControlPermalink .permalink').attr('href');
        } else {
            elem = $('.WazeControlPermalink');
            if (elem.length && elem.children('.fa-link').length) {
                pl = elem.children('.fa-link')[0].href;
            }
        }
        return pl;
    }

    // Sets up error reporting
    function reportError() {
        window.open('https://www.waze.com/forum/viewtopic.php?t=239985', '_blank');
        // data.preview = 'Preview';
        // data.attach_sig = 'on';
        // if (_PM_USER_LIST.hasOwnProperty('WMEPH') && _PM_USER_LIST.WMEPH.approvalActive) {
        //     data[`address_list[u][${_PM_USER_LIST.WMEPH.modID}]`] = 'to';
        //     newForumPost('https://www.waze.com/forum/ucp.php?i=pm&mode=compose', data);
        // } else {
        //     data.addbbcode20 = 'to';
        //     data.notify = 'on';
        //     newForumPost(`${_URLS.forum}#preview`, data);
        // }
    } // END reportError function

    // // Make a populated post on a forum thread
    // function newForumPost(url, data) {
    //     const form = document.createElement('form');
    //     form.target = '_blank';
    //     form.action = url;
    //     form.method = 'post';
    //     form.style.display = 'none';
    //     Object.keys(data).forEach(k => {
    //         let input;
    //         if (k === 'message') {
    //             input = document.createElement('textarea');
    //         } else if (k === 'username') {
    //             input = document.createElement('username_list');
    //         } else {
    //             input = document.createElement('input');
    //         }
    //         input.name = k;
    //         input.value = data[k];
    //         // input.type = 'hidden'; // 2018-07/10 (mapomatic) Not sure if this is required, but was causing an error when setting on the textarea object.
    //         form.appendChild(input);
    //     });
    //     document.getElementById('WMEPH_formDiv').appendChild(form);
    //     form.submit();
    //     document.getElementById('WMEPH_formDiv').removeChild(form);
    //     return true;
    // } // END newForumPost function

    /**
     * Updates the geometry of a place.
     * @param place {Waze venue object} The place to update.
     * @param newGeometry {OpenLayers.Geometry} The new geometry for the place.
     */
    // function updateFeatureGeometry(place, newGeometry) {
    //     let oldGeometry;
    //     const model = W.model.venues;
    //     if (place && place.CLASS_NAME === 'Waze.Feature.Vector.Venue' && newGeometry && (newGeometry instanceof OpenLayers.Geometry.Point
    //         || newGeometry instanceof OpenLayers.Geometry.Polygon)) {
    //         oldGeometry = place.attributes.geometry;
    //         W.model.actionManager.add(new UpdateFeatureGeometry(place, model, oldGeometry, newGeometry));
    //     }
    // }

    function placeHarmonizerInit() {
        // Check for script updates.
        // checkWmephVersion();
        // setInterval(checkWmephVersion, VERSION_CHECK_MINUTES * 60 * 1000);

        _layer = W.map.venueLayer;

        // Add CSS stuff here
        const css = [
            '.wmeph-mods-table-cell { border: solid 1px #bdbdbd; padding-left: 3px; padding-right: 3px; }',
            '.wmeph-mods-table-cell.title { font-weight: bold; }'
        ].join('\n');
        $('head').append(`<style type="text/css">${css}</style>`);

        MultiAction = require('Waze/Action/MultiAction');
        UpdateObject = require('Waze/Action/UpdateObject');
        OpeningHour = require('Waze/Model/Objects/OpeningHour');

        // Append a form div for submitting to the forum, if it doesn't exist yet:
        const tempDiv = document.createElement('div');
        tempDiv.id = 'WMEPH_formDiv';
        tempDiv.style.display = 'none';
        $('body').append(tempDiv);

        _USER.ref = W.loginManager.user;
        _USER.name = _USER.ref.userName;
        _USER.rank = _USER.ref.rank + 1; // get editor's level (actual level)

        // Array prototype extensions (for Firefox fix)
        // 5/22/2019 (mapomatic) I'm guessing these aren't necessary anymore.  If no one reports any errors after a while, these lines may be deleted.
        // Array.prototype.toSet = function () { return this.reduce(function (e, t) { return e[t] = !0, e; }, {}); };
        // Array.prototype.first = function () { return this[0]; };
        // Array.prototype.isEmpty = function () { return 0 === this.length; };

        appendServiceButtonIconCss();
        _UPDATED_FIELDS.init();
        addPURWebSearchButton();

        if (localStorage.getItem('WMEPH-featuresExamined') === null) {
            localStorage.setItem('WMEPH-featuresExamined', '0'); // Storage for whether the User has pressed the button to look at updates
        }

        createObserver();

        const xrayMode = localStorage.getItem('WMEPH_xrayMode_enabled') === 'true';
        WazeWrap.Interface.AddLayerCheckbox('Display', 'WMEPH x-ray mode', xrayMode, toggleXrayMode);
        if (xrayMode) setTimeout(() => toggleXrayMode(true), 2000); // Give other layers time to load before enabling.

        // Whitelist initialization
        if (validateWLS(LZString.decompressFromUTF16(localStorage.getItem(_WL_LOCAL_STORE_NAME_COMPRESSED))) === false) { // If no compressed WL string exists
            if (validateWLS(localStorage.getItem(_WL_LOCAL_STORE_NAME)) === false) { // If no regular WL exists
                _venueWhitelist = { '1.1.1': { Placeholder: {} } }; // Populate with a dummy place
                saveWhitelistToLS(false);
                saveWhitelistToLS(true);
            } else { // if regular WL string exists, then transfer to compressed version
                localStorage.setItem('WMEPH-OneTimeWLBU', localStorage.getItem(_WL_LOCAL_STORE_NAME));
                loadWhitelistFromLS(false);
                saveWhitelistToLS(true);
                WazeWrap.Alerts.info(_SCRIPT_NAME, 'Whitelists are being converted to a compressed format.  If you have trouble with your WL, please submit an error report.');
            }
        } else {
            loadWhitelistFromLS(true);
        }

        if (_USER.name === 'ggrane') {
            _searchResultsWindowSpecs = `"resizable=yes, top=${
                Math.round(window.screen.height * 0.1)}, left=${
                Math.round(window.screen.width * 0.3)}, width=${
                Math.round(window.screen.width * 0.86)}, height=${
                Math.round(window.screen.height * 0.8)}"`;
        }

        // Settings setup
        if (!localStorage.getItem(_SETTING_IDS.gLinkWarning)) { // store settings so the warning is only given once
            localStorage.setItem(_SETTING_IDS.gLinkWarning, '0');
        }
        if (!localStorage.getItem(_SETTING_IDS.sfUrlWarning)) { // store settings so the warning is only given once
            localStorage.setItem(_SETTING_IDS.sfUrlWarning, '0');
        }

        WazeWrap.Events.register('mousemove', W.map, e => errorHandler(() => {
            const wmEvts = (W.map.events) ? W.map.events : W.map.getMapEventsListener();
            _wmephMousePosition = W.map.getLonLatFromPixel(wmEvts.getMousePosition(e));
        }));

        // Add zoom shortcut
        _SHORTCUT.add('Control+Alt+Z', zoomPlace);

        // Add Color Highlighting shortcut
        _SHORTCUT.add('Control+Alt+h', () => {
            $('#WMEPH-ColorHighlighting').trigger('click');
        });

        addWmephTab(); // initialize the settings tab

        // Event listeners
        W.selectionManager.events.register('selectionchanged', this, () => errorHandler(initWmephPanel));
        W.model.venues.on('objectssynced', e => errorHandler(() => syncWL(e)));
        W.model.venues.on('objectschanged', () => errorHandler(onObjectsChanged));

        // Remove any temporary ID values (ID < 0) from the WL store at startup.
        let removedWLCount = 0;
        Object.keys(_venueWhitelist).forEach(venueID => {
            if (venueID < 0) {
                delete _venueWhitelist[venueID];
                removedWLCount += 1;
            }
        });
        if (removedWLCount > 0) {
            saveWhitelistToLS(true);
            phlogdev(`Removed ${removedWLCount} venues with temporary ID's from WL store`);
        }

        if (!_wmephBetaList || _wmephBetaList.length === 0) {
            if (_IS_BETA_VERSION) {
                WazeWrap.Alerts.warning(_SCRIPT_NAME, 'Beta user list access issue.  Please post in the GHO or PM/DM MapOMatic about this message.  Script should still work.');
            }
            _USER.isBetaUser = false;
            _USER.isDevUser = false;
        } else {
            const lcName = _USER.name.toLowerCase();
            _USER.isDevUser = _wmephDevList.includes(lcName);
            _USER.isBetaUser = _wmephBetaList.includes(lcName);
        }
        if (_USER.isDevUser) {
            _USER.isBetaUser = true; // dev users are beta users
        }

        // Set up Run WMEPH button once place is selected
        initWmephPanel();

        // Setup highlight colors
        initializeHighlights();

        W.model.venues.on('objectschanged', () => errorHandler(() => {
            if ($('#WMEPH_banner').length > 0) {
                updateServicesChecks();
                assembleServicesBanner();
            }
        }));

        phlog('Starting Highlighter');
        bootstrapWmephColorHighlights();
    } // END placeHarmonizer_init function

    function placeHarmonizerBootstrap() {
        if (W && W.loginManager && W.loginManager.user && W.map && WazeWrap && WazeWrap.Ready && W.model.categoryBrands.PARKING_LOT && require) {
            WazeWrap.Interface.ShowScriptUpdate(_SCRIPT_NAME, _SCRIPT_VERSION, _SCRIPT_UPDATE_MESSAGE);
            placeHarmonizerInit();
        } else {
            phlog('Waiting for WME map and login...');
            setTimeout(placeHarmonizerBootstrap, 200);
        }
    }

    // const SPREADSHEET_ID = '1pBz4l4cNapyGyzfMJKqA4ePEFLkmz2RryAt1UV39B4g';
    // const SPREADSHEET_RANGE = '2019.01.20.001!A2:L';
    // const API_KEY = 'YTJWNVBVRkplbUZUZVVObU1YVXpSRVZ3ZW5OaFRFSk1SbTR4VGxKblRURjJlRTFYY3pOQ2NXZElPQT09';
    // const BETA_URL = 'YUhSMGNITTZMeTluY21WaGMzbG1iM0pyTG05eVp5OWxiaTl6WTNKcGNIUnpMekk0TmpnNUxYZHRaUzF3YkdGalpTMW9ZWEp0YjI1cGVtVnlMV0psZEdFPQ==';
    // const BETA_META_URL = 'YUhSMGNITTZMeTluY21WaGMzbG1iM0pyTG05eVp5OXpZM0pwY0hSekx6STROamc1TFhkdFpTMXdiR0ZqWlMxb1lYSnRiMjVwZW1WeUxXSmxkR0V2WTI5a1pTOVhUVVVsTWpCUWJHRmpaU1V5TUVoaGNtMXZibWw2WlhJbE1qQkNaWFJoTG0xbGRHRXVhbk09';
    // const PROD_URL = 'https://greasyfork.org/scripts/28690-wme-place-harmonizer/code/WME%20Place%20Harmonizer.user.js';
    // const PROD_META_URL = 'https://greasyfork.org/scripts/28690-wme-place-harmonizer/code/WME%20Place%20Harmonizer.meta.js';
    // const dec = s => atob(atob(s));
    // let _lastVersionChecked = '0';
    // const VERSION_CHECK_MINUTES = 60; // How frequently to check for script updates, in minutes.

    // function checkWmephVersion() {
    //     try {
    //         let url = _IS_BETA_VERSION ? dec(BETA_META_URL) : PROD_META_URL;
    //         GM_xmlhttpRequest({
    //             url: PROD_META_URL,
    //             onload(res) {
    //                 try {
    //                     const latestVersion = res.responseText.match(/@version\s+(.*)/)[1];
    //                     if (latestVersion > _SCRIPT_VERSION && latestVersion > (_lastVersionChecked || '0')) {
    //                         _lastVersionChecked = latestVersion;
    //                         url = _IS_BETA_VERSION ? dec(BETA_URL) : PROD_URL;
    //                         WazeWrap.Alerts.info(
    //                             _SCRIPT_NAME,
    //                             `<a href="${url}" target = "_blank">Version ${
    //                                 latestVersion}</a> is available.<br>Update now to get the latest features and fixes.`,
    //                             true,
    //                             false
    //                         );
    //                     }
    //                 } catch (ex) {
    //                     console.error('WMEPH upgrade version check:', ex);
    //                 }
    //             },
    //             onerror(res) {
    //                 // Silently fail with an error message in the console.
    //                 console.error('WMEPH upgrade version check:', res);
    //             }
    //         });
    //     } catch (ex) {
    //         // Silently fail with an error message in the console.
    //         console.error('WMEPH upgrade version check:', ex);
    //     }
    // }
    // function getSpreadsheetUrl(id, range, key) {
    //     return `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?${dec(key)}`;
    // }
    function downloadPnhData(skipBootstrap = false) {
        // TODO change the _PNH_DATA cache to use an object so we don't have to rely on ugly array index lookups.
        // const processData1 = (data, colIdx) => data.filter(row => row.length >= colIdx + 1).map(row => row[colIdx]);

        // $.getJSON(getSpreadsheetUrl(SPREADSHEET_ID, SPREADSHEET_RANGE, API_KEY)).done(res => {
        //     const { values } = res;
        //     if (values[0][0].toLowerCase() === 'obsolete') {
        //         WazeWrap.Alerts.error(_SCRIPT_NAME, 'You are using an outdated version of WMEPH that doesn\'t work anymore. Update or disable the script.');
        //         return;
        //     }

        //     // This needs to be performed before makeNameCheckList() is called.
        //     _wordVariations = processData1(values, 11).slice(1).map(row => row.toUpperCase().replace(/[^A-z0-9,]/g, '').split(','));

        //     _PNH_DATA.USA.pnh = processData1(values, 0);
        //     _PNH_DATA.USA.pnhNames = makeNameCheckList(_PNH_DATA.USA.pnh);

        //     _PNH_DATA.states = processData1(values, 1);

        //     _PNH_DATA.CAN.pnh = processData1(values, 2);
        //     _PNH_DATA.CAN.pnhNames = makeNameCheckList(_PNH_DATA.CAN.pnh);

        //     _PNH_DATA.USA.categories = processData1(values, 3);
        //     _PNH_DATA.USA.categoryNames = makeCatCheckList(_PNH_DATA.USA.categories);

        //     // For now, Canada uses some of the same settings as USA.
        //     _PNH_DATA.CAN.categories = _PNH_DATA.USA.categories;
        //     _PNH_DATA.CAN.categoryNames = _PNH_DATA.USA.categoryNames;

        //     const WMEPHuserList = processData1(values, 4)[1].split('|');
        //     const betaix = WMEPHuserList.indexOf('BETAUSERS');
        //     _wmephDevList = [];
        //     _wmephBetaList = [];
        //     for (let ulix = 1; ulix < betaix; ulix++) _wmephDevList.push(WMEPHuserList[ulix].toLowerCase().trim());
        //     for (let ulix = betaix + 1; ulix < WMEPHuserList.length; ulix++) _wmephBetaList.push(WMEPHuserList[ulix].toLowerCase().trim());

        //     const processTermsCell = (termsValues, colIdx) => processData1(termsValues, colIdx)[1]
        //         .toLowerCase().split('|').map(value => value.trim());
        //     _hospitalPartMatch = processTermsCell(values, 5);
        //     _hospitalFullMatch = processTermsCell(values, 6);
        //     _animalPartMatch = processTermsCell(values, 7);
        //     _animalFullMatch = processTermsCell(values, 8);
        //     _schoolPartMatch = processTermsCell(values, 9);
        //     _schoolFullMatch = processTermsCell(values, 10);

        if (!skipBootstrap) {
            placeHarmonizerBootstrap();
        }
        // }).fail(res => {
        //     const message = res.responseJSON && res.responseJSON.error ? res.responseJSON.error : 'See response error message above.';
        //     console.error('WMEPH failed to load spreadsheet:', message);
        // });
    }

    function bootstrap() {
        // Quit if another version of WMEPH is already running.
        if (unsafeWindow.wmephRunning) {
            WazeWrap.Alerts.error(_SCRIPT_NAME, 'Multiple versions of Place Harmonizer are turned on.  Only one will be enabled.');
            return;
        }
        unsafeWindow.wmephRunning = 1;
        // Start downloading the PNH spreadsheet data in the background.  Starts the script once data is ready.
        downloadPnhData();
    }

    bootstrap();
})();
