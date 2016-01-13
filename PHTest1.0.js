/* global I18n */
/* global OpenLayers */
/* global $ */
/* global W */
/* global unsafeWindow */
/* global Components */
// ==UserScript==
// @name		 Place Harmonizer Beta
// @namespace 	 https://greasyfork.org/en/users/19426-bmtg
// @version	  1.0.34
// @description  Harmonizes, formats, and locks a selected place
// @author	   WMEPH development group
// @include			 https://www.waze.com/editor/*
// @include			 https://www.waze.com/*/editor/*
// @include			 https://editor-beta.waze.com/editor/*
// @include			 https://editor-beta.waze.com/*/editor/*
// @exclude			 https://www.waze.com/user/editor/*
// @grant	   GM_xmlhttpRequest
// @require https://greasyfork.org/scripts/16071-wme-keyboard-shortcuts/code/WME%20Keyboard%20Shortcuts.js
// ==/UserScript==
(function () {
	var WMEPHversion = "1.0.34";
	var WMEPHversionMeta = WMEPHversion.match(/(\d+\.\d+)/i)[1];  // get the X.X version
	var majorNewFeature = false;  // set to true to make an alert pop up after script update with new feature
	var isDevVersion = true;  //  enables dev messages and options
	var USA_PNH_DATA, USA_PNH_NAMES = [], USA_CH_DATA, USA_CH_NAMES = [];  // Storage for PNH and Category data
	var CAN_PNH_DATA, CAN_PNH_NAMES = [], CAN_CH_DATA, CAN_CH_NAMES = [];
	var WMEPHdevList, WMEPHbetaList;  // Userlists
	var devVersStr='', devVersStrSpace='', devVersStrDash='';  // strings to differentiate DOM elements between regular and beta script
	if (isDevVersion) { devVersStr = "Beta"; devVersStrSpace = " " + devVersStr; devVersStrDash = "-" + devVersStr; }
	var WMEServicesArray = ["VALLET_SERVICE","DRIVETHROUGH","WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","OUTSIDE_SEATING","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","DELIVERIES","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
	var venueWhitelist, venueWhitelistStr, WLSToMerge;  // Whitelisting vars
	var WLlocalStoreName = 'WMEPH-venueWhitelistNew';
		
	function placeHarmonizer_bootstrap() {
		/*
		var bGreasemonkeyServiceDefined	= false;
		try { 
			if ("object" === typeof Components.interfaces.gmIGreasemonkeyService) {
				bGreasemonkeyServiceDefined = true;
			}
		}
		catch (err) { //Ignore. 
		}
		if ( "undefined" === typeof unsafeWindow || ! bGreasemonkeyServiceDefined) {
			unsafeWindow = ( function () {
				var dummyElem = document.createElement('p');
				dummyElem.setAttribute ('onclick', 'return window;');
				return dummyElem.onclick ();
			} ) ();
		}
		*/
		
		/* Pull data and begin running the code! */
		if (("undefined" !== typeof W.loginManager)) {
			setTimeout(function() {
				// Pull USA PNH Data
				GM_xmlhttpRequest({
					method: "GET",
					url: "https://docs.google.com/spreadsheets/d/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/export?format=tsv&id=1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY&gid=1061880663",
					onload: function (response) {
						USA_PNH_DATA = response.responseText.split('\n');
					}
				});
				// Pull USA Category Data
				GM_xmlhttpRequest({
					method: "GET",
					url: "https://docs.google.com/spreadsheets/d/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/export?format=tsv&id=1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY&gid=1898835833",
					onload: function (response) {
						USA_CH_DATA = response.responseText.split('\n');
					}
				});
				// Pull CAN PNH Data
				GM_xmlhttpRequest({
					method: "GET",
					url: "http://docs.google.com/spreadsheets/d/1TIxQZVLUbAJ8iH6LPTkJsvqFb_DstrHpKsJbv1W1FZs/export?format=tsv&id=1TIxQZVLUbAJ8iH6LPTkJsvqFb_DstrHpKsJbv1W1FZs&gid=947416380",
					onload: function (response) {
						CAN_PNH_DATA = response.responseText.split('\n');
					}
				});
				// Pull dev and beta UserList Data
				GM_xmlhttpRequest({
					method: "GET",
					url: "https://docs.google.com/spreadsheets/d/1L82mM8Xg-MvKqK3WOfsMhFEGmVM46lA8BVcx8qwgmA8/export?format=tsv&id=1L82mM8Xg-MvKqK3WOfsMhFEGmVM46lA8BVcx8qwgmA8&gid=2120603213",
					onload: function (response) {
						var WMEPHuserList = response.responseText;
						WMEPHuserList = WMEPHuserList.split("|");
						var betaix = WMEPHuserList.indexOf('BETAUSERS');
						WMEPHdevList = [];
						WMEPHbetaList = [];
						for (var ulix=1; ulix<betaix; ulix++) {
							WMEPHdevList.push(WMEPHuserList[ulix].toLowerCase());
						}
						for (ulix=betaix+1; ulix<WMEPHuserList.length; ulix++) {
							WMEPHbetaList.push(WMEPHuserList[ulix].toLowerCase());
						}
					}
				});
				
				
			}, 0);
			dataReady();  //  Run the code to check for data return from the Sheets
		} else {
			phlog("Bootstrap failed.  Trying again...");
			setTimeout(function () { placeHarmonizer_bootstrap(); }, 400);
		}
		
		function dataReady() {
			// If the data has returned, then start the script, otherwise wait a bit longer
			if ("undefined" !== typeof CAN_PNH_DATA && "undefined" !== typeof USA_PNH_DATA && "undefined" !== typeof USA_CH_DATA && "undefined" !== typeof WMEPHdevList && "undefined" !== typeof WMEPHbetaList) {
				setTimeout(function(){ // Build the name search lists
					USA_PNH_NAMES = makeNameCheckList(USA_PNH_DATA);
					USA_CH_NAMES = makeCatCheckList(USA_CH_DATA);
					CAN_PNH_NAMES = makeNameCheckList(CAN_PNH_DATA);
					// CAN using USA_CH_NAMES at the moment
				}, 50);
				setTimeout(runPH, 300);  //  start the main code
			} else {
				phlog("Waiting for PNH Data...");
				setTimeout(function () { dataReady(); }, 200);
			}
		}
	}
	
	function runPH() {
		// Script update info
		var WMEPHWhatsNewList = [
		'1.0.33: Added method to backup and merge Whitelist data. In the prefs panel, use the Pull button to get a string that you can copy/paste into a personal file or email. To restore or merge other venues, paste the string into the text box and press merge.', 
		'1.0.33: Added a service icon that adds 24/7 hours to the place.  Once pressed, pressing again doesn\'t do anything; use the undo key to restore the previous hours.', 
		'1.0.33: Fixed extraneous "" matches from PNH name search list', 
		'1.0.33: Fixed rarely mapped categories so they don\'t lock', 
		'1.0.32: Added phone and HN whitelisting', 
		'1.0.31: **NEW FEATURE** You can whitelist places that do not have URLs in reality. Click the WL button near the message and it will not color-flag it again. Clear any WL for the place with the Clear WL button on the banner.', 
		'1.0.31: Fixed dupefinder so it does not match places with no name', 
		'1.0.30: **NEW FEATURE** Duplicate place searching. Scans nearby places for name matches, displays them on the map with thick outline and name, and also in the banners. Photos indicated next to name.', 
		'1.0.30: Changed GLR region min lock to 3', 
		'1.0.30: Fixed SAT phone formatting.', 
		];  // New in this version
		var WMEPHWhatsNewMetaList = ['Live integration with PNH data','Over 700 chains harmonized','Works in the USA and Canada','Interactive banner buttons','Finds nearby duplicates','Whitelist places'];  // New in this major version
		var newSep = '\n - ', listSep = '<li>';  // joiners for script and html messages
		var WMEPHWhatsNew = WMEPHWhatsNewList.join(newSep);
		var WMEPHWhatsNewMeta = WMEPHWhatsNewMetaList.join(newSep);
		var WMEPHWhatsNewHList = WMEPHWhatsNewList.join(listSep);
		var WMEPHWhatsNewMetaHList = WMEPHWhatsNewMetaList.join(listSep);
		WMEPHWhatsNew = 'WMEPH v. ' + WMEPHversion + '\nUpdates:' + newSep + WMEPHWhatsNew;
		WMEPHWhatsNewMeta = 'WMEPH v. ' + WMEPHversionMeta + '\nMajor features:' + newSep + WMEPHWhatsNewMeta;
		if ( localStorage.getItem('featuresExamined') === null ) {
			localStorage.setItem('featuresExamined', '0');  // Storage for whether the User has pressed the button to look at updates
		}
		var thisUser = W.loginManager.user;
		if (thisUser === null) {
			phlog("Could not determine user.");
			return;
		}
		// Whitelist initialization
		if ( localStorage.getItem(WLlocalStoreName) === null ) {
			venueWhitelist = { '1.1.1': { Placeholder: { active: false } } }; // Populate with a dummy place
			saveWL_LS();
		} else {
			loadWL_LS();
		}
		var dupeWL = [], urlWL = false, phoneWL = false, HNWL = false, AvPWL = false; // initialize WL variables
		
		// If the editor installs a newer MAJOR version, pop up an alert with the new elements
		if ( localStorage.getItem('WMEPHversionMeta') === null ) {
			alert(WMEPHWhatsNewMeta);
			localStorage.setItem('WMEPHversionMeta', WMEPHversionMeta);
			localStorage.setItem('WMEPHversion', WMEPHversion);
			localStorage.setItem(GLinkWarning, '0');  // Reset warnings
			localStorage.setItem(SFURLWarning, '0');
			localStorage.setItem('featuresExamined', '1');  // disable the button
		} else if (localStorage.getItem('WMEPHversionMeta') !== WMEPHversionMeta) {
			alert(WMEPHWhatsNewMeta);
			localStorage.setItem('WMEPHversionMeta', WMEPHversionMeta);
			localStorage.setItem('WMEPHversion', WMEPHversion);
			localStorage.setItem(GLinkWarning, '0');  // Reset warnings
			localStorage.setItem(SFURLWarning, '0');
			localStorage.setItem('featuresExamined', '1');  // disable the button
		} else if (localStorage.getItem('WMEPHversion') !== WMEPHversion) {  // If MINOR version....
			if (majorNewFeature) {  //  with major feature update, then alert
				alert(WMEPHWhatsNew);
				localStorage.setItem('featuresExamined', '1');  // disable the button
			} else {  //  if not major feature update, then keep on the button
				localStorage.setItem('featuresExamined', '0');
			}
			localStorage.setItem('WMEPHversion', WMEPHversion);  // store last installed version
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
		// Setting for hours checking.
		if (!localStorage.getItem("WMEPH-AlertNoHours" + devVersStr)) {  // set default to ON if no previous setting
			localStorage.setItem("WMEPH-AlertNoHours" + devVersStr, '1');
		}
		setTimeout(add_PlaceHarmonizationSettingsTab, 50);  // initialize the settings tab
		
		var WMEPHurl = 'https://www.waze.com/forum/posting.php?mode=reply&f=819&t=164962';  // WMEPH Forum thread URL
		var USAPNHMasURL = 'https://docs.google.com/spreadsheets/d/1-f-JTWY5UnBx-rFTa4qhyGMYdHBZWNirUTOgn222zMY/edit#gid=0';  // Master USA PNH link
		var placesWikiURL = 'https://wiki.waze.com/wiki/Places';  // WME Places wiki
		var betaUser, devUser;
		if (WMEPHbetaList.length === 0 || "undefined" === typeof WMEPHbetaList) {
			if (isDevVersion) {
				alert('Beta user list access issue.  Please post in the GHO or PM/DM bmtg about this message.  Script should still work.');
			}
			betaUser = false;
			devUser = false;
		} else {
			devUser = (WMEPHdevList.indexOf(thisUser.userName.toLowerCase()) > -1);
			betaUser = (WMEPHbetaList.indexOf(thisUser.userName.toLowerCase()) > -1);
		}
		if (devUser) {
			betaUser = true; // dev users are beta users
			if (thisUser.userName !== 'bmtg') { debugger; }
		}  
		var usrRank = thisUser.normalizedLevel;  // get editor's level
		var userLanguage = 'en';
		
		// lock levels are offset by one
		var lockLevel1 = 0, lockLevel2 = 1, lockLevel3 = 2, lockLevel4 = 3, lockLevel5 = 4;
		var defaultLockLevel = lockLevel2;
		
		var PMUserList = { // user names and IDs for PM functions
			SER: {approvalActive: true, modID: '16941753', modName: 't0cableguy'},
			WMEPH: {approvalActive: true, modID: '17027620', modName: 'bmtg'},
		};
		// Couple of templates, keep for now:
		//var forumMsgInputs = { subject: 'Re: WMEPH', message: 'Message:', addbbcode20: '100', preview: 'Preview', attach_sig: 'on', notify: 'on' }; // Default forum post
		//var forumPMInputs = { subject: 'WMEPH message', message: 'Message:', preview: 'Preview', attach_sig: 'on' }; // Default PM post
		
		var severity;  // error tracking to determine banner color (messages)
		var severityButt;  // error tracking to determine banner color (action buttons)
		var bannMess, bannButt, bannButt2, bannServ;  // Banner Buttons objects
		var sidebarMessageOld;  //  *** Eventually delete once new method is complete
		var sidebarMessage;  // Holds the banner messages
		var duplicateName = '', withPhotos = '';
		
		var catTransWaze2Lang = I18n.translations[userLanguage].venues.categories;  // pulls the category translations
		var item, newName, optionalAlias, newURL, newPhone;
		var newAliases = [], newAliasesTemp = [], newCategories = [], newServices = [];
		
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
		var ignoreWords = ["an", "and", "as", "at", "by", "for", "from", "hhgregg", "in", "into", "of", "on", "or", "the", "to", "with"];
		var capWords = ["3M", "AMC", "AOL", "AT&T", "ATM", "BBC", "BLT", "BMV", "BMW", "BP", "CBS", "CCS", "CGI", "CISCO", "CNN", "CVS", "DHL", "DKNY",
			"DMV", "DSW", "ER", "ESPN", "FCUK", "GNC", "H&M", "HP", "HSBC", "IBM", "IHOP", "IKEA", "IRS", "JBL", "JCPenney", "KFC", "LLC", "MBNA", "MCA", "MCI",
			"NBC", "PNC", "TCBY", "TNT", "UPS", "USA", "USPS", "VW", "ZZZ"
		];
		function toTitleCase(str) {
			if (!str) {
				return str;
			}
			var allCaps = (str === str.toUpperCase());
			// Cap first letter of each word
			str = str.replace(/([A-Za-z\u00C0-\u017F][^\s-\/]*) */g, function(txt) {
				return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.substr(1);
			});
			// Cap O'Reilley's, L'Amour, D'Artagnan as long as 5+ letters
			str = str.replace(/[oOlLdD]'[A-Za-z']{3,}/g, function(txt) {
				return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1) + txt.charAt(2).toUpperCase() + txt.substr(3);
			});
			// Cap McFarley's, as long as 5+ letters long
			str = str.replace(/[mM][cC][A-Za-z']{3,}/g, function(txt) {
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
				var txtLC = txt.toUpperCase();
				return (capWords.indexOf(txtLC) > -1) ? txtLC : txt;
			});
			// Cap first letter of entire name
			str = str.charAt(0).toUpperCase() + str.substr(1);
			return str;
		}
	
		// Change place.name to title case
		function toTitleCaseStrong(str) {
			if (!str) {
				return str;
			}
			var allCaps = (str === str.toUpperCase());
			// Cap first letter of each word
			str = str.replace(/([A-Za-z\u00C0-\u017F][^\s-\/]*) */g, function(txt) {
				return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			});
			// Cap O'Reilley's, L'Amour, D'Artagnan as long as 5+ letters
			str = str.replace(/[oOlLdD]'[A-Za-z']{3,}/g, function(txt) {
				return ((txt === txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1) + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase();
			});
			// Cap McFarley's, as long as 5+ letters long
			str = str.replace(/[mM][cC][A-Za-z']{3,}/g, function(txt) {
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
			// Cap first letter of entire name
			str = str.charAt(0).toUpperCase() + str.substr(1);
			return str;
		}
		
		// normalize phone
		function normalizePhone(s, outputFormat) {
			if (!s) {
				if ($("#WMEPH-EnableWhitelisting" + devVersStr).prop('checked')) {
					if (phoneWL) {
						bannMess.phoneMissing.severity = 0;
						formBannMess('phoneMissing');
					} else {
						formBannButt('phoneMissing');
					}
				} else {
					formBannMess('phoneMissing');
				}
				return s;
			}
			var s1 = s.replace(/\D/g, '');  // remove non-number characters
			var m = s1.match(/^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/);  // Ignore leading 1, and also don't allow area code or exchange to start with 0 or 1 (***USA/CAN specific)
			if (!m) {
				formBannMess('phoneInvalid');
				return s;
			} else {
				return String.plFormat(outputFormat, m[1], m[2], m[3]);
			}
		}
		
		// Normalize url
		function normalizeURL(s) {
			if (!s) {  // Notify that url is missing and provide web search to find website and gather data (provided for all editors)
				if ($("#WMEPH-EnableWhitelisting" + devVersStr).prop('checked')) {
					if (urlWL) {
						bannMess.urlMissing.severity = 0;
						formBannMess('urlMissing');
					} else {
						formBannButt('urlMissing');
					}
				} else {
					formBannMess('urlMissing');
				}
				formBannButt('webSearch');
				return s;
			}
			s = s.replace(/ \(.*/g, '');  // remove anything with parentheses after it
			s = s.replace(/ /g, '');  // remove any spaces
			var m = s.match(/^https?:\/\/(.*)$/i);  // remove http(s):// 
			if (m) { s = m[1]; } 
			s = s.replace(/[^\/]+/i, function(txt) { // lowercase the domain
				return (txt === txt.toLowerCase()) ? txt : txt.toLowerCase();
			});
			/*  OLD CODE to strip www.   Keep in case of reinstatement
			if ($("#WMEPH-StripWWW" + devVersStr).prop('checked')) {  // if option is checked, remove 'www.' from the url
				m = s.match(/^www\.(.*)$/i);
				if (m) { s = m[1]; } 
			}
			*/
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
			phlog('Running script on selected place...');
			// Script is only for R2+ editors
			if (usrRank < 2) {
				alert("Script is currently available for editors of Rank 2 and up.");
				return;
			}
			// Beta version for approved users only
			if (isDevVersion && !betaUser) {
				alert("Please sign up to beta-test this script version.\nSend a PM or Slack-DM to bmtg, or post in the WMEPH forum thread. Thanks.");
				return;	
			}
			// Only run if a single place is selected
			if (W.selectionManager.selectedItems.length === 1) {
				var item = W.selectionManager.selectedItems[0].model;
				if (item.type === "venue") { 
					blurAll();  // focus away from current cursor position
					harmonizePlaceGo(); 
				}
			}
		}
	
		// Main script
		function harmonizePlaceGo() {
			// Not sure what this does, but it's in all the other scripts that update Waze objects
			var UpdateObject;
			if (typeof(require) !== "undefined") {
				UpdateObject = require("Waze/Action/UpdateObject");
			} else {
				UpdateObject = W.Action.UpdateObject;
			}
			
			var placePL = WMEPH_initialiseFL();  //  set up external post div and pull place PL
			placePL = placePL.replace(/&layers=[\d]+/g, '');  // remove Permalink Layers
			var region, state2L, newPlaceURL, approveRegionURL, servID;
			var gFormState = "";
			var PNHOrderNum = "", PNHNameTemp = "", PNHNameTempWeb = "";
			sidebarMessageOld = [];
			sidebarMessage = [];
			// var topSBMess;  // Unused, delete
			severity = 0;
			severityButt = 0;
			var customStoreFinder = false;  // switch indicating place-specific custom store finder url
			var customStoreFinderLocal = false;  // switch indicating place-specific custom store finder url with localization option (GPS/addr)
			var customStoreFinderURL = "";  // switch indicating place-specific custom store finder url
			var customStoreFinderLocalURL = "";  // switch indicating place-specific custom store finder url with localization option (GPS/addr)
			
			// Whitelist reset flags
			dupeWL = [], urlWL = false, phoneWL = false, HNWL = false, AvPWL = false;
			
			bannMess = {    // banner message array in order of display
				duplicateFound: { active: false, severity: 2, message: 'Duplicate found.' },
				bankType1: { active: false, severity: 3, message: 'Clarify the type of bank: the name has ATM but the primary category is Offices' },
				gasBrandMM: { active: false, severity: 3, message: 'Gas name and brand do not appear to match. Verify which is correct.' },
				gasUnbranded: { active: false, severity: 3, message: '"Unbranded" should not be used for the station brand. Change to the correct brand or use the blank entry at the top of the brand list.' },
				areaNotPoint: { active: false, severity: 3, message: 'This category should be an area place.  Either change it, or manually lock it.' },
				pointNotArea: { active: false, severity: 3, message: 'This category should be a point place.  Either change it, or manually lock it.' },
				unmappedRegion: { active: false, severity: 3, message: 'This category is usually not mapped in this region.  If it\'s a valid place, please manually lock it.' },
				nameMissing: { active: false, severity: 3, message: 'Name is missing.' },
				hnMissing: { active: false, severity: 3, message: 'House number missing.' },
				hnNonStandard: { active: false, severity: 3, message: 'House number is non-standard. Correct and rerun script, or manually lock the place.' },
				streetMissing: { active: false, severity: 3, message: 'Street missing.' },
				cityMissing: { active: false, severity: 3, message: 'City missing.' },
				
				parentCategory: { active: false, severity: 2, message: 'This parent category is usually not mapped in this region.' },
				checkDescription: { active: false, severity: 2, message: 'Description field already contained info; PNH description was added in front of existing. Check for consistency or duplicate info.' },
				resiTypeName: { active: false, severity: 2, message: 'The place name suggests a residential place or personalized place of work.  Please verify.' },
				phoneInvalid: { active: false, severity: 2, message: 'Phone invalid.' },
				mismatch247: { active: false, severity: 2, message: 'Hours of operation listed as open 24hrs but not for all 7 days.' },
				
				areaNotPointOpt: { active: false, severity: 1, message: 'This category is usually an area place, but can be a point in some cases. Verify if point is appropriate.' },
				pointNotAreaOpt: { active: false, severity: 1, message: 'This category is usually an point place, but can be a area in some cases. Verify if area is appropriate.' },
				pnhCatMess: { active: false, severity: 0, message: 'WMEPH: placeholder (please report this error if you see this message)' },
				subFuel: { active: false, severity: 1, message: 'Make sure this place is for the gas station itself and not the main store building.  Otherwise undo and check the categories.' },
				longURL: { active: false, severity: 1, message: 'Existing long URL was kept. Please verify.' },
				catHotel: { active: false, severity: 1, message: 'Please check hotel details, as names can often be unique (e.g. Holiday Inn - Tampa North).' },
				catPostOffice: { active: false, severity: 1, message: 'Verify the primary name according to your regional standards. If this is not a USPS post office, change the category, as "Post Office" is only used for USPS locations.' },
				phoneMissing: { active: false, severity: 1, message: 'Phone missing.' },
				urlMissing: { active: false, severity: 1, message: 'URL missing.' },
				gasNoBrand: { active: false, severity: 1, message: 'Verify that gas station has no brand.' },
				
				resiTypeNameSoft: { active: false, severity: 0, message: 'The place name suggests a residential place or personalized place of work.  Please verify.' },
				localURL: { active: false, severity: 0, message: 'Some locations for this business have localized urls, while others use the primary corporate site. Check if a local url applies to this location.' },
				babiesRUs: { active: false, severity: 0, message: 'If there is a Toys R Us at this location, please make it the primary name and Babies R Us the alt name and rerun the script.' },
				noHours: { active: false, severity: 0, message: 'Hours of operation missing.' },
				placeFormatted: { active: false, severity: 0, message: 'Place formatted.' },
				placeMatched: { active: false, severity: 0, message: 'Place matched from PNH data.' },
				placeLocked: { active: false, severity: 0, message: 'Place locked.' }
			};
			bannButt = {  // set up banner action buttons.  Structure:
				// active: false until activated in the script 
				// bannText: The text before the button option
				// id: button id
				// value: button text
				// title: tooltip text
				// cLog: message for console
				// action: The action that happens if the button is pressed
				
				/*
				duplicateFound: {  // append optional Alias to the name   **** NOT USED FOR NOW ****
					active: false, 
					bannText: "Possible duplicate" + withPhotos + ": " + duplicateName, 
					severity: 1,  
					id: "duplicateFound",  
					value: "PL for duplicate", 
					title: 'Jump to place',
					cLog: "Duplicate",  
					action: function() {
						phlogdev('PL pressed');
						//https://www.waze.com/editor/?env=usa&lon=-82.41235&lat=28.08298&layers=3493&zoom=6&venues=181928217.1819216632.2901377#
					}
				},  // END duplicateFound definition
				*/
				
				hnMissing: { 
					active: false, 
					severity: 3, 
					bannText: "House number missing ", 
					id: "hnMissing",  
					value: "WL", 
					title: 'Whitelist empty HN',
					cLog: "HN Whitelisted",  
					action: function() {
						if (!venueWhitelist.hasOwnProperty(itemID)) {
							venueWhitelist[itemID] = { HNWL: {active: false} };
						}
						venueWhitelist[itemID].HNWL.active = true;
						saveWL_LS();
						bannButt.hnMissing.active = false;
						bannMess.hnMissing.severity = 0;
						bannMess.hnMissing.active = true;
						bannButt2.clearWL.active = true;
						harmonizePlaceGo();
					}
				},
				phoneMissing: { 
					active: false, 
					severity: 1, 
					bannText: "Phone missing ", 
					id: "phoneMissing",  
					value: "WL", 
					title: 'Whitelist empty Phone',
					cLog: "Phone Whitelisted",  
					action: function() {
						if (!venueWhitelist.hasOwnProperty(itemID)) {
							venueWhitelist[itemID] = { phoneWL: {active: false} };
						}
						venueWhitelist[itemID].phoneWL.active = true;
						saveWL_LS();
						bannButt.phoneMissing.active = false;
						bannMess.phoneMissing.severity = 0;
						bannMess.phoneMissing.active = true;
						bannButt2.clearWL.active = true;
					}
				},
				urlMissing: { 
					active: false, 
					severity: 1, 
					bannText: "URL missing ", 
					id: "urlMissing",  
					value: "WL", 
					title: 'Whitelist empty URL',
					cLog: "URL Whitelisted",  
					action: function() {
						if (!venueWhitelist.hasOwnProperty(itemID)) {
							venueWhitelist[itemID] = { urlWL: {active: false} };
						}
						venueWhitelist[itemID].urlWL.active = true;
						saveWL_LS();
						bannButt.urlMissing.active = false;
						bannMess.urlMissing.severity = 0;
						bannMess.urlMissing.active = true;
						bannButt2.clearWL.active = true;
					}
				},
				addAlias: {  // append optional Alias to the name
					active: false, 
					bannText: "Is " + optionalAlias + " at this location?", 
					severity: 0,  
					id: "addAlias",  
					value: "Yes", 
					title: 'Add ' + optionalAlias,
					cLog: "Added optional alt-name",  
					action: function() {
						newAliases = insertAtIX(newAliases,optionalAlias,0);
						if (specCases.indexOf('altName2Desc') > -1) {
							if ( item.attributes.description.toUpperCase().indexOf(optionalAlias.toUpperCase()) === -1 ) {
								newDescripion = optionalAlias + '\n' + newDescripion;
								W.model.actionManager.add(new UpdateObject(item, { description: newDescripion }));
							}
						}
						W.model.actionManager.add(new UpdateObject(item, { aliases: newAliases }));
						//phlogdev(bannButt.addAlias.cLog);  
						bannButt.addAlias.active = false;  // reset the display flag
					}
				},  // END addAlias definition
				addCat2: {  // append optional secondary category to the place
					active: false, 
					bannText: "Is there a " + newCategories[0] + " at this location?", 
					severity: 0,  
					id: "addCat2",  
					value: "Yes", 
					title: 'Add ' + newCategories[0],
					cLog: "Added optional secondary category",  
					action: function() {
						newCategories.push.apply(newCategories,altCategories);
						W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
						//phlogdev(bannButt.addCat2.cLog);  
						bannButt.addCat2.active = false;  // reset the display flag
					}
				},  // END addCat2 definition
				addPharm: {  // append Pharmacy to the place
					active: false, 
					bannText: "Is there a Pharmacy at this location?", 
					severity: 1,  
					id: "addPharm",  
					value: "Yes", 
					title: 'Add Pharmacy category',
					cLog: "Added Pharmacy",  
					action: function() {
						newCategories = insertAtIX(newCategories, 'PHARMACY', 1);
						W.model.actionManager.add(new UpdateObject(item, {
							categories: newCategories
						}));
						//phlogdev(bannButt.addPharm.cLog);  
						bannButt.addPharm.active = false;  // reset the display flag
					}
				},  // END addPharm definition
				appendAMPM: {  // append AMPM to the name
					active: false, 
					bannText: "Is there an ampm at this location?", 
					severity: 1,  
					id: "appendAMPM",  
					value: "Yes", 
					title: 'Add ampm to the place',
					cLog: "Added ampm",  
					action: function() {
						newCategories = insertAtIX(newCategories, 'CONVENIENCE_STORE', 1);
						newName = 'ARCO ampm';
						newURL = 'ampm.com';
						W.model.actionManager.add(new UpdateObject(item, {
							name: newName,
							url: newURL,
							categories: newCategories
						}));
						//phlogdev(bannButt.appendAMPM.cLog);  
						bannButt.appendAMPM.active = false;  // reset the display flag
						bannButt.addConvStore.active = false;  // also reset the addConvStore display flag
					}
				},  // END appendAMPM definition
				gasMismatch: {  // if the gas brand and name don't match
					active: false, 
					bannText: "Gas name and brand don't match.  Move brand to name?", 
					severity: 3,  
					id: "gasMismatch",  
					value: "Yes", 
					title: 'Change the primary name to the brand and make the current name the alt-name.',
					cLog: "Updated station name from brand",  
					action: function() {
						newAliases = insertAtIX(newAliases, newName, 0);
						W.model.actionManager.add(new UpdateObject(item, {
							name: brand,
							aliases: newAliases
						}));
						phlogdev(bannButt.gasMismatch.cLog);  
						bannButt.gasMismatch.active = false;  // reset the display flag
						newName = item.attributes.brand;
					}
				},  // END gasMismatch definition
				STC: {  // Force strong title case option
					active: false,  // Activated if Strong Title Case != Normal Title Case (e.g. HomeSpace Company)
					bannText: "Force Title Case: ", 
					severity: 0,  
					id: "toTitleCaseStrong",  
					value: "Yes", 
					title: "Force Title Case to InterNal CaPs",
					cLog: "Applied Strong Title Case",  
					action: function() {
						newName = toTitleCaseStrong(item.attributes.name);  // Get the Strong Title Case name
						if (newName !== item.attributes.name) {  // if they are not equal
							W.model.actionManager.add(new UpdateObject(item, {  //  update the place name
								name: newName
							}));
							phlogdev(bannButt.STC.cLog);  
						}
						for (var ixali = 0; ixali < item.attributes.aliases.length; ixali++) {
							newAliases[ixali] = toTitleCaseStrong(item.attributes.aliases[ixali].slice(0));  // Get the Strong Title Case name
						}
						phlogdev('newAliases: ' + newAliases);
							phlogdev('item.attributes.aliases: ' + item.attributes.aliases);
							phlogdev('check: ' + newAliases !== item.attributes.aliases);
							//phlogdev(toTitleCaseStrong(item.attributes.aliases[ixali]));
							
						if (newAliases !== item.attributes.aliases) {  // if they are not equal
							W.model.actionManager.add(new UpdateObject(item, {  //  update the place name
								aliases: newAliases
							}));
							phlogdev(bannButt.STC.cLog);  
						}
						bannButt.STC.active = false;  // reset the display flag
					}
				},  // END Strong Title Case definition
				addATM: {
					active: false,
					bannText: "ATM at location? ",
					severity: 0,  
					id: "addATM",
					value: "Yes",
					title: "Add the ATM category to this place",
					cLog: "Added ATM category",
					action: function() {
						newCategories = insertAtIX(newCategories,"ATM",1);  // Insert ATM category in the second position
						W.model.actionManager.add(new UpdateObject(item, {  //  update the place name
							categories: newCategories
						}));
						bannButt.addATM.active = false;   // reset the display flag
					}
				},  // END addATM definition
				standaloneATM: {
					active: false,
					bannText: "Is this a standalone ATM? ",
					severity: 2,  
					id: "standaloneATM",
					value: "Yes",
					title: "Is this a standalone ATM with no bank branch?",
					cLog: "Changed to standalone ATM",
					action: function() {
						newCategories = ["ATM"];  // Change to ATM only
						if (newName.indexOf("ATM") === -1) {
							newName = newName + ' ATM';	
						}
						W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
						bannButt.bankCorporate.active = false;   // reset the bank Branch display flag
						bannButt.bankBranch.active = false;   // reset the bank Branch display flag
						bannButt.standaloneATM.active = false;   // reset the standalone ATM display flag
					}
				},  // END standaloneATM definition
				bankBranch: {
					active: false,
					bannText: "Is this a bank branch office? ",
					severity: 1,  
					id: "bankBranch",
					value: "Yes",
					title: "Is this a bank branch office?",
					cLog: "Changed to bank branch",
					action: function() {
						newCategories = ["BANK_FINANCIAL","ATM"];  // Change to bank and atm cats
						newName = newName.replace(/[\- (]*ATM[\- )]*/g, ' ').replace(/^ /g,'').replace(/ $/g,'');	 // strip ATM from name if present
						W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
						W.model.actionManager.add(new UpdateObject(item, { name: newName }));
						bannButt.bankCorporate.active = false;   // reset the bank Branch display flag
						bannButt.bankBranch.active = false;   // reset the bank Branch display flag
						bannButt.standaloneATM.active = false;   // reset the standalone ATM display flag
					}
				},  // END bankBranch definition
				bankCorporate: {
					active: false,
					bannText: "Is this the bank's corporate offices?",
					severity: 1,  
					id: "bankCorporate",
					value: "Yes",
					title: "Is this the bank's corporate offices?",
					cLog: "Changed to bank branch",
					action: function() {
						newCategories = ["OFFICES"];  // Change to offices category
						newName = newName.replace(/[\- (]*ATM[\- )]*/g, ' ').replace(/^ /g,'').replace(/ $/g,'');	 // strip ATM from name if present
						W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
						W.model.actionManager.add(new UpdateObject(item, { name: newName }));
						bannButt.bankCorporate.active = false;   // reset the bank Branch display flag
						bannButt.bankBranch.active = false;   // reset the bank Branch display flag
						bannButt.standaloneATM.active = false;   // reset the standalone ATM display flag
					}
				},  // END bankCorporate definition
				addConvStore: {
					active: false,
					bannText: "Add convenience store category? ",
					severity: 1,  
					id: "addConvStore",
					value: "Yes",
					title: "Add the Convenience Store category to this place",
					cLog: "Added Convenience Store category",
					action: function() {
						newCategories = insertAtIX(newCategories,"CONVENIENCE_STORE",1);  // Insert C.S. category in the second position
						W.model.actionManager.add(new UpdateObject(item, {  //  update 
							categories: newCategories
						}));
						bannButt.addConvStore.active = false;   // reset the display flag
					}
				},  // END addConvStore definition
				isitUSPS: {
					active: false,
					bannText: "Is this a USPS location? ",
					severity: 0,  
					id: "isitUSPS",
					value: "Yes",
					title: "Is this a USPS location?",
					cLog: "Fixed USPS",
					action: function() {
						newServices = ["AIR_CONDITIONING", "CREDIT_CARDS", "PARKING_FOR_CUSTOMERS", "WHEELCHAIR_ACCESSIBLE"];
						W.model.actionManager.add(new UpdateObject(item, { url: "usps.com" }));
						if (region === 'SER') {
							W.model.actionManager.add(new UpdateObject(item, { aliases: ["United States Postal Service"] }));
						}
						bannButt.isitUSPS.active = false;
					}
				},  // END isitUSPS definition
				PlaceWebsite: {
					active: false,
					bannText: "",
					severity: 0,  
					id: "PlaceWebsite",
					value: "Open place website",
					title: "Direct link to place website",
					cLog: "Open web search",
					action: function() {
						var openPlaceWebsiteURL = 'http:\/\/' + newURL;
						if (customStoreFinder) {
							openPlaceWebsiteURL = customStoreFinderURL;
						} else if (customStoreFinderLocal) {
							openPlaceWebsiteURL = customStoreFinderLocalURL;
						}
						
						if (localStorage.getItem(SFURLWarning) === '0' && customStoreFinderLocal) {
							if (confirm('***Localized store finder sites often show multiple nearby results. Please make sure you pick the right location.\nClick OK to agree and continue.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
								localStorage.setItem(SFURLWarning, '1');
								window.open(openPlaceWebsiteURL);
							}
						} else {
							window.open(openPlaceWebsiteURL);
						}
					}
				},  // END PlaceWebsite definition
				webSearch: {
					active: false,
					bannText: "",
					severity: 0,  
					id: "webSearch",
					value: "Web Search",
					title: "Search the web for this place.  Do not copy info from 3rd party sources!",
					cLog: "Open web search",
					action: function() {
						if (localStorage.getItem(GLinkWarning) === '1') {
							window.open(buildGLink(newName,addr,item.attributes.houseNumber));
						} else {
							if (confirm('***Please DO NOT copy info from Google or third party sources.*** This link is to help you find the business webpage.\nClick OK to agree and continue.') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
								localStorage.setItem(GLinkWarning, '1');
								window.open(buildGLink(newName,addr,item.attributes.houseNumber));
							}
						}
					}
				},  // END webSearch definition
				NewPlaceSubmit: {
					active: false,
					bannText: "No PNH match. If place is a chain: ",
					severity: 0,  
					id: "NewPlaceSubmit",
					value: "Submit new data",
					title: "Submit info for a new chain through the linked form",
					cLog: "Open submit new place form",
					action: function() {
						window.open(newPlaceURL);
					}
				},  // END NewPlaceSubmit definition
				ApprovalSubmit: {
					active: false,
					bannText: "PNH data exists but is not approved for your region: ",
					severity: 0,  
					id: "ApprovalSubmit",
					value: "Request approval",
					title: "Request region/country approval of this place",
					cLog: "Open request approval form",
					action: function() {
						if (PMUserList.hasOwnProperty(region)) {
							if (PMUserList[region].approvalActive) {
								var forumPMInputs = {
									subject: 'PNH approval for "' + PNHNameTemp + '"',
									message: 'Please approve "' + PNHNameTemp + '" for the ' + region + ' region.  Thanks\n \nPNH order number: ' + PNHOrderNum + '\n \nExample Permalink: ' + placePL + '\n \nPNH Link: ' + USAPNHMasURL,
									preview: 'Preview', attach_sig: 'on' 
								};
								forumPMInputs['address_list[u]['+PMUserList[region].modID+']'] = 'to';  // SER region, sends a PM to t0cableguy = 16941753
								WMEPH_openPostDataInNewTab('https://www.waze.com/forum/ucp.php?i=pm&mode=compose', forumPMInputs);
							} else {
								window.open(approveRegionURL);
							}
						} else {
							window.open(approveRegionURL);
						}
					}
				}  // END ApprovalSubmit definition
			};
			
			bannButt2 = {  
				placesWiki: {
					active: true,
					bannText: "",
					severity: 0,  
					id: "placesWiki",
					value: "Places wiki",
					title: "Open the places wiki page",
					cLog: "Opened places wiki",
					action: function() {
						window.open(placesWikiURL);
					}
				},  // END placesWiki definition
				clearWL: {
					active: false,
					bannText: "",
					severity: 0,  
					id: "placesWiki",
					value: "Clear Place whitelist",
					title: "Clear all Whitelisted fields for this place",
					cLog: "Cleared WL for place",
					action: function() {
						if (confirm('Are you sure you want to clear whitelisted items?') ) {  // misclick check
							venueWhitelist[itemID] = {urlWL: {active: false} };
							saveWL_LS();
							harmonizePlaceGo();
						}
					}
				},  // END placesWiki definition
				PlaceErrorForumPost: {
					active: true,
					bannText: "",
					severity: 0,  
					id: "PlaceErrorForumPost",
					value: "Report script error",
					title: "Report an error on the forum",
					cLog: "Post initiated",
					action: function() {
						var forumMsgInputs = {
							subject: 'Re: WMEPH Bug report',
							message: 'Script version: ' + WMEPHversion + devVersStr + '\nPermalink: ' + placePL + '\nPlace name: ' + item.attributes.name + '\nCountry: ' + addr.country.name + '\nDescribe the error:\n ',
							addbbcode20: '100', preview: 'Preview', attach_sig: 'on', notify: 'on'
						};
						WMEPH_openPostDataInNewTab(WMEPHurl + '#preview', forumMsgInputs);
					}
				},  // END PlaceErrorForumPost definition
				whatsNew: {
					active: false,
					bannText: "",
					severity: 0,  
					id: "whatsNew",
					value: "*Recent script updates*",
					title: "Open a list of recent script updates",
					cLog: "Opened script update alert",
					action: function() {
						alert(WMEPHWhatsNew);
						localStorage.setItem('featuresExamined', '1');
						bannButt2.whatsNew.active = false;
					}
				}  // END whatsNew definition
			};  // END bannButt2 definitions
			bannServ = {  // set up banner action buttons.  Structure:
				// active: false until activated in the script 
				// checked: whether the service is already set on the place. Determines grey vs white icon color 
				// bannText: The text before the button option
				// id: button id
				// value: button text  (Not used for Icons)
				// title: tooltip text
				// cLog: message for console
				// action: The action that happens if the button is pressed
				addValet: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					removed: false,
					id: "addValet",  
					icon: "serv-valet",
					value: "Valet", 
					title: 'Valet',
					cLog: "Toggled Valet Service",  
					action: function() {
						servID = WMEServicesArray[0];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addValet.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addValet.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addValet.cLog);
					}
				}, 
				addDriveThru: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addDriveThru",  
					icon: "serv-drivethru",
					value: "DriveThru", 
					title: 'Drive-Thru',
					cLog: "Toggled Drive-Thru service",  
					action: function() {
						servID = WMEServicesArray[1];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addDriveThru.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addDriveThru.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addDriveThru.cLog);
					}
				}, 
				addWiFi: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addWiFi",  
					icon: "serv-wifi",
					value: "WiFi", 
					title: 'WiFi',
					cLog: "Toggled WiFi service",  
					action: function() {
						servID = WMEServicesArray[2];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addWiFi.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addWiFi.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addWiFi.cLog);
					}
				}, 
				addRestrooms: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addRestrooms",  
					icon: "serv-restrooms",
					value: "Restroom", 
					title: 'Restrooms',
					cLog: "Toggled Restroom service",  
					action: function() {
						servID = WMEServicesArray[3];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addRestrooms.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addRestrooms.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addRestrooms.cLog);
					}
				}, 
				addCreditCards: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addCreditCards",  
					icon: "serv-credit",
					value: "CC", 
					title: 'Credit Cards',
					cLog: "Toggled Credit Card service",  
					action: function() {
						servID = WMEServicesArray[4];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addCreditCards.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addCreditCards.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addCreditCards.cLog);
					}
				}, 
				addReservations: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addReservations",  
					icon: "serv-reservations",
					value: "Reserve", 
					title: 'Reservations',
					cLog: "Toggled Reservations service",  
					action: function() {
						servID = WMEServicesArray[5];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addReservations.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addReservations.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addReservations.cLog);
					}
				}, 
				addOutside: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addOutside",  
					icon: "serv-outdoor",
					value: "OusideSeat", 
					title: 'Outside Seating',
					cLog: "Toggled Outside Seating service",  
					action: function() {
						servID = WMEServicesArray[6];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addOutside.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addOutside.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addOutside.cLog);
					}
				}, 
				addAC: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addAC",  
					icon: "serv-ac",
					value: "AC", 
					title: 'AC',
					cLog: "Toggled Air Conditioning service",  
					action: function() {
						servID = WMEServicesArray[7];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addAC.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addAC.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addAC.cLog);
					}
				},  
				addParking: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addParking",  
					icon: "serv-parking",
					value: "Parking", 
					title: 'Parking',
					cLog: "Toggled Parking for Customers service",  
					action: function() {
						servID = WMEServicesArray[8];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addParking.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addParking.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addParking.cLog);
					}
				}, 
				addDeliveries: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addDeliveries",  
					icon: "serv-deliveries",
					value: "Delivery", 
					title: 'Deliveries',
					cLog: "Toggled Delivery service",  
					action: function() {
						servID = WMEServicesArray[9];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addDeliveries.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addDeliveries.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addDeliveries.cLog);
					}
				}, 
				addTakeAway: {  // append optional Alias to the name
					active: false, 
					checked: false, 
					id: "addTakeAway",  
					icon: "serv-takeaway",
					value: "TakeOut", 
					title: 'Take Out',
					cLog: "Toggled Take Out service",  
					action: function() {
						servID = WMEServicesArray[10];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addTakeAway.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addTakeAway.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addTakeAway.cLog);
					}
				}, 
				addWheelchair: {  // add service
					active: false, 
					checked: false, 
					bannText: "", 
					icon: "serv-wheelchair",
					id: "addWheelchair",  
					value: "WhCh", 
					title: 'Wheelchair Accessible',
					cLog: "Toggled Wheelchair Accessible service",  
					action: function() {
						servID = WMEServicesArray[11];
						if ( ($("#service-checkbox-"+servID).prop('checked') && bannServ.addWheelchair.checked) || 
							(!$("#service-checkbox-"+servID).prop('checked') && !bannServ.addWheelchair.checked) ) { 
							$("#service-checkbox-"+servID).trigger('click');
						}
						updateServicesChecks(bannServ);
						phlogdev(bannServ.addWheelchair.cLog);
					}
				},
				add247: {  // add 24/7 hours
					active: true, 
					checked: false, 
					bannText: "", 
					icon: "serv-247",
					id: "add247",  
					value: "247", 
					title: 'Hours: Open 24/7',
					cLog: "Added 24/7 Hours ",  
					action: function() {
						if (!bannServ.add247.checked) {
							W.model.actionManager.add(new UpdateObject(item, { openingHours: [{days: [1,2,3,4,5,6,0], fromHour: "00:00", toHour: "00:00"}] }));
							bannServ.add247.checked = true;
						}
					}
				}
			};
			
			// Turn on New Features Button if not looked at yet
			if (localStorage.getItem('featuresExamined') === '0') {
				bannButt2.whatsNew.active = true;
			}
			//Setting switch for the Places Wiki button
			if ( $("#WMEPH-HidePlacesWiki" + devVersStr).prop('checked') ) {
				bannButt2.placesWiki.active = false;
			}
			// provide Google search link to places
			if (devUser || betaUser || usrRank > 2) {  // enable the link for all places, for R3+ and betas
				formBannButt('webSearch');
			}
			
			// Only can select one place at a time in WME, so the loop is superfluous (eg, ix=0 will work), but perhaps we leave it in case we add some sort of looping process like URs.
			for (var ix = 0; ix < W.selectionManager.selectedItems.length; ix++) {
				item = W.selectionManager.selectedItems[0].model;  // make the 0 --> ix for future looping
				// Whitelist breakout if place exists on the Whitelist
				var itemID = item.attributes.id, WLMatch = false;
				if (venueWhitelist.hasOwnProperty(itemID) && $("#WMEPH-EnableWhitelisting" + devVersStr).prop('checked')) {
					WLMatch = true;
					dupeWL = venueWhitelist[itemID].dupeWL.active;
					urlWL = venueWhitelist[itemID].urlWL.active;
					phoneWL = venueWhitelist[itemID].phoneWL.active;
					HNWL = venueWhitelist[itemID].HNWL.active;
					AvPWL = venueWhitelist[itemID].AvPWL.active;
					if (dupeWL || urlWL || phoneWL || HNWL || AvPWL) { bannButt2.clearWL.active = true; }
				}
				
				// get GPS lat/long coords from place, call as itemGPS.lat, itemGPS.lon
				var itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(item.attributes.geometry.bounds.right,item.attributes.geometry.bounds.top);
				
				var lockOK = true;  // if nothing goes wrong, then place will be locked
				var categories = item.attributes.categories;
				newCategories = categories.slice(0);
				newName = item.attributes.name;
				newName = toTitleCase(newName);
				// var nameShort = newName.replace(/[^A-Za-z]/g, '');  // strip non-letters for PNH name searching
				// var nameNumShort = newName.replace(/[^A-Za-z0-9]/g, ''); // strip non-letters/non-numbers for PNH name searching
				newAliases = item.attributes.aliases.slice(0);
				var brand = item.attributes.brand;
				var newDescripion = item.attributes.description;
				newURL = item.attributes.url;
				var newURLSubmit = "";
				if (newURL !== null) {
					newURLSubmit = newURL;
				}
				newPhone = item.attributes.phone;
				var newServices = [];
				for (var nsix=0; nsix<item.attributes.services.length; nsix++) {
					newServices[nsix]= item.attributes.services[nsix];
				}
				var addr = item.getAddress();
				var PNHNameRegMatch;
				
				// Some user submitted places have no data in the country, state and address fields.
				if (!addr.state || !addr.country) {
					var inferredAddress = WMEPH_inferAddress();  // Pull address info from nearby segments
					if (inferredAddress.state && inferredAddress.country) {
						addr = inferredAddress;
						if ( $("#WMEPH-AddAddresses" + devVersStr).prop('checked') ) {  // update the item's address if option is enabled
							updateAddress(item, addr);
						}
					} else {  //  if the inference doesn't work...
						alert("Place has no address data. Please set the address and rerun the script.");
						return;  //  don't run the rest of the script
					}
				}
				
				// Country restrictions
				var countryCode;
				if (addr.country.name === "United States") {
					countryCode = "USA";
				} else if (addr.country.name === "Canada") {
					countryCode = "CAN";
				} else {
					alert("At present this script is not supported in this country.");
					return;
				}
				
				if (countryCode === "USA") {
					// Setup USA State and Regional vars
					switch (addr.state.name) {
						case "Arkansas": state2L = "AR"; region = "SCR"; gFormState = "&entry.124157720=AR"; break;
						case "Louisiana": state2L = "LA"; region = "SCR"; gFormState = "&entry.124157720=LA"; defaultLockLevel = lockLevel4; break; // lock level from wiki/forum
						case "Mississippi": state2L = "MS"; region = "SCR"; gFormState = "&entry.124157720=MS"; break;
						case "Oklahoma": state2L = "OK"; region = "SCR"; gFormState = "&entry.124157720=OK"; break;
						
						case "Texas": state2L = "TX"; region = "TX"; gFormState = "&entry.1252443068=TX"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						
						case "Alaska": state2L = "AK"; region = "NWR"; gFormState = "&entry.124157720=AK"; break;
						case "Idaho": state2L = "ID"; region = "NWR"; gFormState = "&entry.124157720=ID"; break;
						case "Montana": state2L = "MT"; region = "NWR"; gFormState = "&entry.124157720=MT"; break;
						case "Oregon": state2L = "OR"; region = "NWR"; gFormState = "&entry.124157720=OR"; break;
						case "Washington": state2L = "WA"; region = "NWR"; gFormState = "&entry.124157720=WA"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						case "Wyoming": state2L = "WY"; region = "NWR"; gFormState = "&entry.124157720=WY"; break;
						
						case "Hawaii": state2L = "HI"; region = "HI"; gFormState = "&entry.124157720=HI"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						
						case "Arizona": state2L = "AZ"; region = "SWR"; gFormState = "&entry.124157720=AZ"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "California": state2L = "CA"; region = "SWR"; gFormState = "&entry.124157720=CA"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						case "Colorado": state2L = "CO"; region = "SWR"; gFormState = "&entry.124157720=CO"; defaultLockLevel = lockLevel4; break; // lock level from wiki/forum
						case "Nevada": state2L = "NV"; region = "SWR"; gFormState = "&entry.124157720=NV"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "New Mexico": state2L = "NM"; region = "SWR"; gFormState = "&entry.124157720=NM"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "Utah": state2L = "UT"; region = "SWR"; gFormState = "&entry.124157720=UT"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						
						case "Iowa": state2L = "IA"; region = "PLN"; gFormState = "&entry.124157720=IA"; break;
						case "Kansas": state2L = "KS"; region = "PLN"; gFormState = "&entry.124157720=KS"; break;
						case "Minnesota": state2L = "MN"; region = "PLN"; gFormState = "&entry.124157720=MN"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "Missouri": state2L = "MO"; region = "PLN"; gFormState = "&entry.124157720=MO"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "Nebraska": state2L = "NE"; region = "PLN"; gFormState = "&entry.124157720=NE"; break;
						case "North Dakota": state2L = "ND"; region = "PLN"; gFormState = "&entry.124157720=ND"; break;
						case "South Dakota": state2L = "SD"; region = "PLN"; gFormState = "&entry.124157720=SD"; break;
						
						case "Illinois": state2L = "IL"; region = "GLR"; gFormState = "&entry.124157720=IL"; defaultLockLevel = lockLevel3; break; // lock level From JustinS83
						case "Indiana": state2L = "IN"; region = "GLR"; gFormState = "&entry.124157720=IN"; defaultLockLevel = lockLevel3; break; // lock level From JustinS83
						case "Michigan": state2L = "MI"; region = "GLR"; gFormState = "&entry.124157720=MI"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						case "Ohio": state2L = "OH"; region = "GLR"; gFormState = "&entry.124157720=OH"; defaultLockLevel = lockLevel3; break; // lock level From JustinS83
						case "Wisconsin": state2L = "WI"; region = "GLR"; gFormState = "&entry.124157720=WI"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						
						case "Kentucky": state2L = "KY"; region = "SAT"; gFormState = "&entry.1025078817=KY+-+Kentucky"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						case "North Carolina": state2L = "NC"; region = "SAT"; gFormState = "&entry.1025078817=NC+-+North+Carolina"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						case "South Carolina": state2L = "SC"; region = "SAT"; gFormState = "&entry.1025078817=SC+-+South+Carolina"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						case "Tennessee": state2L = "TN"; region = "SAT"; gFormState = "&entry.1025078817=TN+-+Tennessee"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						
						case "Alabama": state2L = "AL"; region = "SER"; gFormState = "&entry.2010899807=AL+-+Alabama"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						case "Florida": state2L = "FL"; region = "SER"; gFormState = "&entry.2010899807=FL+-+Florida"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						case "Georgia": state2L = "GA"; region = "SER"; gFormState = "&entry.2010899807=GA+-+Georgia"; defaultLockLevel = lockLevel3; break; // lock level from wiki
						
						case "Connecticut": state2L = "CT"; region = "NEW"; gFormState = "&entry.124157720=CT"; break;
						case "Maine": state2L = "ME"; region = "NEW"; gFormState = "&entry.124157720=ME"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "Massachusetts": state2L = "MA"; region = "NEW"; gFormState = "&entry.124157720=MA"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "New Hampshire": state2L = "NH"; region = "NEW"; gFormState = "&entry.124157720=NH"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "Rhode Island": state2L = "RI"; region = "NEW"; gFormState = "&entry.124157720=RI"; defaultLockLevel = lockLevel2; break;
						case "Vermont": state2L = "VT"; region = "NEW"; gFormState = "&entry.124157720=VT"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						
						case "Delaware": state2L = "DE"; region = "NOR"; gFormState = "&entry.124157720=DE"; break;
						case "New Jersey": state2L = "NJ"; region = "NOR"; gFormState = "&entry.124157720=NJ"; break;
						case "New York": state2L = "NY"; region = "NOR"; gFormState = "&entry.124157720=NY"; break;
						case "Pennsylvania": state2L = "PA"; region = "NOR"; gFormState = "&entry.124157720=PA"; break;
						
						case "District of Columbia": state2L = "DC"; region = "MAR"; gFormState = "&entry.124157720=DC"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "Maryland": state2L = "MD"; region = "MAR"; gFormState = "&entry.124157720=MD"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "Virginia": state2L = "VA"; region = "MAR"; gFormState = "&entry.124157720=VA"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						case "West Virginia": state2L = "WV"; region = "MAR"; gFormState = "&entry.124157720=WV"; defaultLockLevel = lockLevel2; break; // lock level from wiki
						default: state2L = "Unknown"; region = "Unknown";
					}
					phlog("Place is in region " + region);
				}  // END USA regional/state assigning
				
				if (countryCode === "CAN") {
					// Setup Canadian provinces
					defaultLockLevel = lockLevel3; 
					switch (addr.state.name) {
						case "Ontario": state2L = "ON"; region = "CAN"; break;
						case "British Columbia": state2L = "BC"; region = "CAN"; break;
						case "Alberta": state2L = "AB"; region = "CAN"; break;
						case "Saskatchewan": state2L = "SK"; region = "CAN"; break;
						case "Manitoba": state2L = "MB"; region = "CAN"; break;
						case "Ontario": state2L = "ON"; region = "CAN"; break;
						case "Quebec": state2L = "QC"; region = "CAN"; break;
						case "Newfoundland And Labrador": state2L = "NL"; region = "CAN"; break;
						case "New Brunswick": state2L = "NB"; region = "CAN"; break;
						case "Prince Edward Island": state2L = "PE"; region = "CAN"; break;
						case "Nova Scotia": state2L = "NS"; region = "CAN"; break;
						case "Nunavut": state2L = "NU"; region = "CAN"; break;
						case "Northwest Territories": state2L = "NT"; region = "CAN"; break;
						case "Yukon": state2L = "YT"; region = "CAN"; break;
						default: state2L = "Unknown"; region = "Unknown";
					}
					phlog("Place is in province: " + state2L);
				}  // END Canada assignments
				
				// If region or state is unknown, report the error
				if (state2L === "Unknown" || region === "Unknown") {
					if (confirm('WMEPH: Localization Error\nClick OK to report this error') ) {  // if the location is not found, then pop an alert that will make a forum post to the thread
						var forumMsgInputs = {
							subject: 'Re: WMEPH Bug report',
							message: 'Error report: State name "' + addr.state.name + '" is not found.',
							addbbcode20: '100', preview: 'Preview', attach_sig: 'on', notify: 'on'
						};
						WMEPH_openPostDataInNewTab(WMEPHurl + '#preview', forumMsgInputs);
					}
					return;
				}
				
				// Clear attributes from residential places
				if (item.attributes.residential) {   
					newName = item.attributes.houseNumber + " " + addr.street.name;
					if (item.attributes.name !== newName) {  // Set the residential place name to the address (to clear any personal info)
						phlogdev("Residential Name reset");
						W.model.actionManager.add(new UpdateObject(item, {name: newName}));
					}
					newCategories = ["RESIDENCE_HOME"];
					newDescripion = null;
					if (item.attributes.description !== null && item.attributes.description !== "") {  // remove any description
						phlogdev("Residential description cleared");
						W.model.actionManager.add(new UpdateObject(item, {description: newDescripion}));
					}
					newPhone = null;
					if (item.attributes.phone !== null && item.attributes.phone !== "") {  // remove any phone info
						phlogdev("Residential Phone cleared");
						W.model.actionManager.add(new UpdateObject(item, {phone: newPhone}));
					}
					newURL = null;
					if (item.attributes.url !== null && item.attributes.url !== "") {  // remove any url
						phlogdev("Residential URL cleared");
						W.model.actionManager.add(new UpdateObject(item, {url: newURL}));
					}
					if (item.attributes.services.length > 0) {
						phlogdev("Residential services cleared");
						W.model.actionManager.add(new UpdateObject(item, {services: [] }));
					}
				} else if (item.attributes.name !== "" && item.attributes.name !== " " && item.attributes.name !== null) {  // for non-residential places
					// Place Harmonization 
					var PNHMatchData = harmoList(newName,state2L,region,countryCode,newCategories);  // check against the PNH list
					PNHNameRegMatch = false;
					if (PNHMatchData[0] !== "NoMatch" && PNHMatchData[0] !== "ApprovalNeeded" ) { // *** Replace place data with PNH data
						PNHNameRegMatch = true;
						var PNH_DATA_headers;
						if (countryCode === "USA") {
							PNH_DATA_headers = USA_PNH_DATA[0].split("|");
						} else if (countryCode === "CAN") {
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
						
						// Check special cases
						var specCases = PNHMatchData[ph_speccase_ix];
						if (specCases !== "0" && specCases !== "") {
							specCases = specCases.replace(/,[^A-Za-z0-9}]+/g, ",,");  // tighten up commas if more than one specCase flag.
							specCases = specCases.split(",,");  // split by comma
						}
						var scFlag;
						var localURLcheck = '';
						for (var scix = 0; scix < specCases.length; scix++) { 
						// find any button/message flags in the special case (format: butt_xyzXyz)
							if ( specCases[scix].match(/^buttOn_/g) !== null ) {  
								scFlag = specCases[scix].match(/^buttOn_(.+)/i)[1];
								bannButt[scFlag].active = true;
							} else if ( specCases[scix].match(/^buttOff_/g) !== null ) {
								scFlag = specCases[scix].match(/^buttOff_(.+)/i)[1];
								bannButt[scFlag].active = false;
							} else if ( specCases[scix].match(/^messOn_/g) !== null ) {
								scFlag = specCases[scix].match(/^messOn_(.+)/i)[1];
								bannMess[scFlag].active = true;
							} else if ( specCases[scix].match(/^messOff_/g) !== null ) {
								scFlag = specCases[scix].match(/^messOff_(.+)/i)[1];
								bannMess[scFlag].active = false;
							}
							// parseout localURL data if exists
							if ( specCases[scix].match(/^localURL_/g) !== null ) {
								localURLcheck = specCases[scix].match(/^localURL_(.+)/i)[1];
							}
							
							if ( specCases[scix].match(/^optionAltName<>(.+)/g) !== null ) {
								optionalAlias = specCases[scix].match(/^optionAltName<>(.+)/i)[1];
								if (newAliases.indexOf(optionalAlias) === -1) {
									bannButt.addAlias.active = true;
								}
							}
						}
						
						// Display any notes for the specific place
						if (PNHMatchData[ph_displaynote_ix] !== '0' && PNHMatchData[ph_displaynote_ix] !== '' ) {
							if ( containsAny(specCases,['pharmhours']) ) {
								if ( item.attributes.description.toUpperCase().indexOf('PHARMACY') === -1 || item.attributes.description.toUpperCase().indexOf('HOURS') === -1 ) {
									sidebarMessage.push(PNHMatchData[ph_displaynote_ix]);
									severity = Math.max(severity,1);
								}
							} else {
								sidebarMessage.push(PNHMatchData[ph_displaynote_ix]);
							}
						}
						
						// populate the variables from PNH data
						newName = PNHMatchData[ph_name_ix];
						newAliasesTemp = PNHMatchData[ph_aliases_ix].match(/([^\(]*)/i)[0];
						newDescripion = PNHMatchData[ph_description_ix];
						PNHOrderNum = PNHMatchData[ph_order_ix];
						
						// url parsing
						var localURLcheckRE;
						if ( localURLcheck !== '') {
							if (newURL !== null || newURL !== '') {
								localURLcheckRE = new RegExp(localURLcheck, "i");
								if ( newURL.match(localURLcheckRE) !== null ) {
									newURL = normalizeURL(newURL);
								} else {
									newURL = PNHMatchData[ph_url_ix];
									formBannMess('localURL');
								}
							} else {
								newURL = PNHMatchData[ph_url_ix];
								formBannMess('localURL');
							}
						} else {
							newURL = PNHMatchData[ph_url_ix];
						}
						
						// Storefinder code:
						if (PNHMatchData[ph_sfurllocal_ix] !== "" && PNHMatchData[ph_sfurllocal_ix] !== "0") {
							phlogdev('sfurllocal: ' + PNHMatchData[ph_sfurllocal_ix]);
							bannButt.PlaceWebsite.value = "Chain Store Finder";
							var tempLocalURL = PNHMatchData[ph_sfurllocal_ix].split("<>");
							var searchStreet = "", searchCity = "", searchState = "";
							if ("string" === typeof addr.street.name) {
								//searchCity = addr.city.name + ",%20";
								searchStreet = addr.street.name;
							}
							var searchStreetPlus = searchStreet.replace(/ /g, "+");
							searchStreet = searchStreet.replace(/ /g, "%20");
							if ("string" === typeof addr.city.name) {
								//searchCity = addr.city.name + ",%20";
								searchCity = addr.city.name;
							}
							var searchCityPlus = searchCity.replace(/ /g, "+");
							searchCity = searchCity.replace(/ /g, "%20");
							if ("string" === typeof addr.state.name) {
								//searchState = addr.state.name + ",%20";
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
									customStoreFinderLocalURL = customStoreFinderLocalURL + state2L;
								} else if (tempLocalURL[tlix] === 'ph_latitudeEW') {
									//customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS[0];
								} else if (tempLocalURL[tlix] === 'ph_longitudeNS') {
									//customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS[1];
								} else if (tempLocalURL[tlix] === 'ph_latitudePM') {
									customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS.lat;
								} else if (tempLocalURL[tlix] === 'ph_longitudePM') {
									customStoreFinderLocalURL = customStoreFinderLocalURL + itemGPS.lon;
								} else if (tempLocalURL[tlix] === 'ph_houseNumber') {
									customStoreFinderLocalURL = customStoreFinderLocalURL + item.attributes.houseNumber;
								} else {
									customStoreFinderLocalURL = customStoreFinderLocalURL + tempLocalURL[tlix];
								}
							}
							
							customStoreFinderLocal = true;
						} else if (PNHMatchData[ph_sfurl_ix] !== "" && PNHMatchData[ph_sfurl_ix] !== "0") {
							phlogdev('sfurl: ' + PNHMatchData[ph_sfurl_ix]);
							bannButt.PlaceWebsite.value = "Chain Store Finder";
							customStoreFinderURL = PNHMatchData[ph_sfurl_ix];
							customStoreFinder = true;
						}
						
						// Category parsing						
						var priPlaceCat = catTranslate(PNHMatchData[ph_category1_ix]);  // translate primary category to WME code
						var altCategories = PNHMatchData[ph_category2_ix];
						if (altCategories !== "0" && altCategories !== "") {
							altCategories = altCategories.replace(/,[^A-Za-z0-9]*/g, ",");  // tighten up commas if more than one secondary category.
							altCategories = altCategories.split(",");  // split by comma
							for (var catix = 0; catix<altCategories.length; catix++) {  // translate altCats into WME cat codes
								 var newAltTemp = catTranslate(altCategories[catix]);
								 if (newAltTemp === "ERROR") {  // if no translation, quit the loop
									 phlog('Category ' + altCategories[catix] + 'cannot be translated.');
									 return;
								 } else {
									altCategories[catix] = newAltTemp;  // replace with translated element
								 }
							}
						}
						
						if ( ["GAS_STATION"].indexOf(priPlaceCat) > -1 ) {  // for primary categories in the vector, don't replace existing sub-categories
							if ( altCategories !== "0" && altCategories !== "" ) {  // if alts exist
								insertAtIX(newCategories, altCategories, 1);  //  then insert the alts into the existing category array
							}
						} else {  // completely replace categories with PNH categories
							newCategories = [priPlaceCat];
							if (altCategories !== "0" && altCategories !== "") {
								newCategories.push.apply(newCategories,altCategories);
							}
						}
						
						// *** need to add a section above to allow other permissible categories to remain? (optional)
						
						
						if (newAliasesTemp !== "0" && newAliasesTemp !== "") {  // make aliases array
							newAliasesTemp = newAliasesTemp.replace(/,[^A-za-z0-9]*/g, ",");  // tighten up commas if more than one alias.
							newAliasesTemp = newAliasesTemp.split(",");  // split by comma
						}
						
						if (bannButt.addAlias.active) {
							bannButt.addAlias.bannText = "Is there a " + optionalAlias + " at this location?";
							bannButt.addAlias.title = 'Add ' + optionalAlias;
						}
						if (specCases.indexOf('buttOn_addCat2') > -1) {
							bannButt.addAlias.bannText = "Is there a " + catTransWaze2Lang[altCategories[0]] + " at this location?";
							bannButt.addAlias.title = 'Add ' + catTransWaze2Lang[altCategories[0]];
						}
						
						if ( specCases.indexOf('bank') > -1 ) {  // PNH banks
							
							// #### Needs work
							// Generic Bank treatment
							/*
							var newNameExt = ' '+newName+' ';
							newNameExt = newNameExt.replace(/[^A-Za-z0-9]/g, ' ');
							var ixBank = item.attributes.categories.indexOf("BANK_FINANCIAL");
							var ixATM = item.attributes.categories.indexOf("ATM");
							var ixOffices = item.attributes.categories.indexOf("OFFICES");
							// if the name contains ATM in it
							if ( newNameExt.toUpperCase().indexOf('ATM ') > -1 ) {
								if ( ixOffices === 0 ) {
									formBannMess('bankType1');
									formBannButt('standaloneATM');
									formBannButt('bankBranch');
									formBannButt('bankCorporate');
								} else if ( ixBank === -1 && ixATM === -1 ) {
									formBannButt('standaloneATM');
									formBannButt('bankBranch');
								} else if ( ixBank === 0 ) {
									formBannButt('standaloneATM');
									formBannButt('bankBranch');
								} else if ( ixATM === 0 && ixBank > 0) {
									formBannButt('bankBranch');
								}
								// Net result: If the place has ATM cat only and ATM in the name, then it will be green
							} else {  // if no ATM in name:
								if ( ixOffices === 0 ) {
									formBannButt('bankBranch');
								} else if ( ixBank === -1 && ixATM === -1 ) {
									formBannButt('standaloneATM');
									formBannButt('bankBranch');
								} else if ( ixBank > -1  && ixATM === -1 ) {
									formBannButt('addATM');
								} else if ( ixATM === 0 ) {
									formBannButt('standaloneATM');
									formBannButt('bankBranch');
								} else if ( ixBank > 0 && ixATM > 0 ) {
									formBannButt('standaloneATM');
									formBannButt('bankBranch');
								}
								// Net result: If the place has Bank category first, then it will be green
							}
							*/
						
						} else if ( specCases.indexOf('hotel') > 1 ) {  // for certain flags, proceed with update
						
						
						} else {  // for certain flags, proceed with update
							if (newName !== item.attributes.name) {
								phlogdev("Name updated");
								W.model.actionManager.add(new UpdateObject(item, { name: newName }));
							}
							
							if (!containsAll(newAliases,newAliasesTemp) && newAliasesTemp !== "0" && newAliasesTemp !== "" && specCases.indexOf('optionName2') === -1 ) {
								newAliases = insertAtIX(newAliases,newAliasesTemp,0);
								phlogdev("Alt Names updated");
								W.model.actionManager.add(new UpdateObject(item, { aliases: newAliases }));
							}
							
							if (!matchSets(item.attributes.categories,newCategories) && specCases.indexOf('optionCat2') === -1 ) {
								phlogdev("Categories updated" + " with " + newCategories);
								W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
							}
							if (newDescripion !== null && newDescripion !== "0") {
								if ( item.attributes.description.toUpperCase().indexOf(newDescripion.toUpperCase()) === -1 ) {
									if ( item.attributes.description !== "" || item.attributes.description !== null ) {
										formBannMess('checkDescription');
									}
									phlogdev("Description updated");
									newDescripion = newDescripion + '\n' + item.attributes.description;
									W.model.actionManager.add(new UpdateObject(item, { description: newDescripion }));
								}
								
							}
							
							
						}
						
						if ( PNHMatchData[ph_speccase_ix] === 'subFuel' ) {
							formBannMess('subFuel');
						}
						
						// *** Add storefinder URL codes
							
						
					} else {  // if no match found
						if (PNHMatchData[0] === "ApprovalNeeded") {
							PNHNameTemp = PNHMatchData[1];
							PNHNameTempWeb = PNHNameTemp.replace(/&/g, "%26");
							PNHNameTempWeb = PNHNameTempWeb.replace(/\//g, "%2F");
							PNHOrderNum = PNHMatchData[2];
						}
						
						if (newName !== item.attributes.name) {
							phlogdev("Name updated");
							W.model.actionManager.add(new UpdateObject(item, { name: newName }));
						}
						if (newName !== toTitleCaseStrong(newName)) {
							formBannButt('STC');
						}
						
						
						
						// #### Needs work
						// Generic Bank treatment
						var ixBank = item.attributes.categories.indexOf("BANK_FINANCIAL");
						var ixATM = item.attributes.categories.indexOf("ATM");
						var ixOffices = item.attributes.categories.indexOf("OFFICES");
						var newNameExt = ' '+newName+' ';
						newNameExt = newNameExt.replace(/[^A-Za-z0-9]/g, ' ');
						// if the name contains ATM in it
						if ( newNameExt.toUpperCase().indexOf('ATM ') > -1 ) {
							if ( ixOffices === 0 ) {
								formBannMess('bankType1');
								formBannButt('standaloneATM');
								formBannButt('bankBranch');
								formBannButt('bankCorporate');
							} else if ( ixBank === -1 && ixATM === -1 ) {
								formBannButt('standaloneATM');
								formBannButt('bankBranch');
							} else if ( ixBank === 0 ) {
								formBannButt('standaloneATM');
								formBannButt('bankBranch');
							} else if ( ixATM === 0 && ixBank > 0) {
								formBannButt('bankBranch');
							}
							// Net result: If the place has ATM cat only and ATM in the name, then it will be green
						} else if (ixBank > -1  || ixATM > -1) {  // if no ATM in name:
							if ( ixOffices === 0 ) {
								formBannButt('bankBranch');
							} else if ( ixBank > -1  && ixATM === -1 ) {
								formBannButt('addATM');
							} else if ( ixATM === 0 ) {
								formBannButt('standaloneATM');
								formBannButt('bankBranch');
							} else if ( ixBank > 0 && ixATM > 0 ) {
								formBannButt('standaloneATM');
								formBannButt('bankBranch');
							}
							// Net result: If the place has Bank category first, then it will be green
						}
						
						
						
					}  // END match/no-match updates
					
					// Gas station treatment applies to all
					if (newCategories[0] === 'GAS_STATION') {
						// Brand checking
						if ( !item.attributes.brand || item.attributes.brand === null || item.attributes.brand === "" ) {
							formBannMess('gasNoBrand');
						} else if (item.attributes.brand === 'Unbranded' ) {
							formBannMess('gasUnbranded');
							lockOK = false;
						} else {
							var brandNameRegEx = new RegExp('\\b'+item.attributes.brand.toUpperCase()+'\\b', "i");
							if ( newName.match(brandNameRegEx) === null ) {
								formBannButt('gasMismatch');
								lockOK = false;
							}
						}
						// Add convenience store category to station
						if (newCategories.indexOf("CONVENIENCE_STORE") === -1 && !bannMess.subFuel.active) {
							if ( $("#WMEPH-ConvenienceStoreToGasStations" + devVersStr).prop('checked') ) {  // Automatic if user has the setting checked
								newCategories = insertAtIX(newCategories, "CONVENIENCE_STORE", 1);  // insert the C.S. category
								W.model.actionManager.add(new UpdateObject(item, {  //  update
									categories: newCategories
								}));
							} else {  // If not checked, then it will be a banner button
								formBannButt('addConvStore');
							}
						}
					}
					
					
					// Make submission links
					var regionFormURL = '';
					var newPlaceAddon = '';
					var approvalAddon = '';
					var approvalMessage = 'Submitted via WMEPH. PNH order number ' + PNHOrderNum;
					switch (region) {
						case "NWR": regionFormURL = 'https://docs.google.com/forms/d/1hv5hXBlGr1pTMmo4n3frUx1DovUODbZodfDBwwTc7HE/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState;
							break;
						case "SWR": regionFormURL = 'https://docs.google.com/forms/d/1Qf2N4fSkNzhVuXJwPBJMQBmW0suNuy8W9itCo1qgJL4/viewform';
							newPlaceAddon = '?entry.1497446659='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.1497446659='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "HI": regionFormURL = 'https://docs.google.com/forms/d/1Qf2N4fSkNzhVuXJwPBJMQBmW0suNuy8W9itCo1qgJL4/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "PLN": regionFormURL = 'https://docs.google.com/forms/d/1ycXtAppoR5eEydFBwnghhu1hkHq26uabjUu8yAlIQuI/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "SCR": regionFormURL = 'https://docs.google.com/forms/d/1KZzLdlX0HLxED5Bv0wFB-rWccxUp2Mclih5QJIQFKSQ/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "TX": regionFormURL = 'https://docs.google.com/forms/d/1x7VM7ofPOKVnWOaX7d70OWXpnVKf6Mkadn4dgYxx4ic/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "GLR": regionFormURL = 'https://docs.google.com/forms/d/19btj-Qt2-_TCRlcS49fl6AeUT95Wnmu7Um53qzjj9BA/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "SAT": regionFormURL = 'https://docs.google.com/forms/d/1bxgK_20Jix2ahbmUvY1qcY0-RmzUBT6KbE5kjDEObF8/viewform';
							newPlaceAddon = '?entry.2063110249='+newName+'&entry.2018912633='+newURLSubmit+'&entry.1924826395='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.2063110249='+PNHNameTempWeb+'&entry.123778794='+approvalMessage+'&entry.1924826395='+thisUser.userName+gFormState; 
							break;
						case "SER": regionFormURL = 'https://docs.google.com/forms/d/1jYBcxT3jycrkttK5BxhvPXR240KUHnoFMtkZAXzPg34/viewform';
							newPlaceAddon = '?entry.822075961='+newName+'&entry.1422079728='+newURLSubmit+'&entry.1891389966='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.822075961='+PNHNameTempWeb+'&entry.607048307='+approvalMessage+'&entry.1891389966='+thisUser.userName+gFormState; 
							break;
						case "TER": regionFormURL = 'https://docs.google.com/forms/d/1v7JhffTfr62aPSOp8qZHA_5ARkBPldWWJwDeDzEioR0/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "NEW": regionFormURL = 'https://docs.google.com/forms/d/1UgFAMdSQuJAySHR0D86frvphp81l7qhEdJXZpyBZU6c/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "NOR": regionFormURL = 'https://docs.google.com/forms/d/1iYq2rd9HRd-RBsKqmbHDIEBGuyWBSyrIHC6QLESfm4c/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "MAR": regionFormURL = 'https://docs.google.com/forms/d/1PhL1iaugbRMc3W-yGdqESoooeOz-TJIbjdLBRScJYOk/viewform';
							newPlaceAddon = '?entry.925969794='+newName+'&entry.1970139752='+newURLSubmit+'&entry.1749047694='+thisUser.userName+gFormState; 
							approvalAddon = '?entry.925969794='+PNHNameTempWeb+'&entry.50214576='+approvalMessage+'&entry.1749047694='+thisUser.userName+gFormState; 
							break;
						case "CAN": regionFormURL = 'https://docs.google.com/forms/d/13JwXsrWPNmCdfGR5OVr5jnGZw-uNGohwgjim-JYbSws/viewform';
							newPlaceAddon = '?entry_839085807='+newName+'&entry_1067461077='+newURLSubmit; 
							approvalAddon = '?entry_839085807='+PNHNameTempWeb+'&entry_1125435193='+approvalMessage; 
							break;
					default: regionFormURL = "";
					}
					
					newPlaceURL = regionFormURL + newPlaceAddon;
					approveRegionURL = regionFormURL + approvalAddon;	
					
					
					// *** filter weak/parent categories from stronger categories (remove food and drink if restaurant, etc.)
					
						
					// Category/Name-based Services, added to any existing services:
					
					
					var CH_DATA, CH_NAMES;
					if (countryCode === "USA") {
						CH_DATA = USA_CH_DATA;
						CH_NAMES = USA_CH_NAMES;
					} else if (countryCode === "CAN") {
						CH_DATA = USA_CH_DATA;   // #### Eventually can be split to new sheet if needed
						CH_NAMES = USA_CH_NAMES;
					}
					var CH_DATA_headers = CH_DATA[0].split("|");
					var CH_DATA_keys = CH_DATA[1].split("|");
					var CH_DATA_list = CH_DATA[2].split("|");
					var servHeaders = [], servKeys = [], servList = [], servHeaderCheck;
					for (var jjj=0; jjj<CH_DATA_headers.length; jjj++) {
						servHeaderCheck = CH_DATA_headers[jjj].match(/^ps_/i);  // if it's a service header
						if (servHeaderCheck) { 
							servHeaders.push(jjj); 
							servKeys.push(CH_DATA_keys[jjj]); 
							servList.push(CH_DATA_list[jjj]); 
						}
					}
						
					var CH_DATA_Temp;
					for (var iii=0; iii<CH_NAMES.length; iii++) {
						if (newCategories.indexOf(CH_NAMES[iii]) > -1 ) {
							CH_DATA_Temp = CH_DATA[iii].split("|");
							for (var psix=0; psix<servHeaders.length; psix++) {
								if (CH_DATA_Temp[servHeaders[psix]] === '1') {
									bannServ[servKeys[psix]].active = true;
									if ($("#WMEPH-EnableServices" + devVersStr).prop('checked')) {
										// Automatically enable new services
										newServices = insertAtIX(newServices,servList[psix],12);
									}
									
								} else if (CH_DATA_Temp[servHeaders[psix]] === '2') {
									bannServ[servKeys[psix]].active = true;
								}
							}
						}
					}
					
					for (var slix=0; slix<servList.length; slix++) {
						if (newServices.indexOf(servList[slix]) > -1) {
							bannServ[servKeys[slix]].active = true;
							bannServ[servKeys[slix]].checked = true;
						}
					}
					
					
					// Area vs. Place checking, Category locking, and category-based messaging
					var pvaPoint, pvaArea, regPoint, regArea, pc_message, pc_lockTemp, pc_rare, pc_parent;
					for (iii=0; iii<CH_NAMES.length; iii++) {
						if (newCategories.indexOf(CH_NAMES[iii]) === 0 ) {  // Primary category
							CH_DATA_Temp = CH_DATA[iii].split("|");
							// CH_DATA_headers
							//pc_point	pc_area	pc_regpoint	pc_regarea	pc_lock1	pc_lock2	pc_lock3	pc_lock4	pc_lock5	pc_rare	pc_parent	pc_message
							pvaPoint = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_point')];
							pvaArea = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_area')];
							regPoint = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_regpoint')].split("|");
							regArea = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_regarea')].split("|");
							if (regPoint.indexOf(state2L) > -1 || regPoint.indexOf(region) > -1 || regPoint.indexOf(countryCode) > -1) {
								pvaPoint = '1';
								pvaArea = '';
							} else if (regArea.indexOf(state2L) > -1 || regArea.indexOf(region) > -1 || regArea.indexOf(countryCode) > -1) {
								pvaPoint = '';
								pvaArea = '1';
							}
							if (item.isPoint()) {
								if (pvaPoint === '' || pvaPoint === '0') {
									formBannMess('areaNotPoint');
									lockOK = false;
								} else if (pvaPoint === '2') {
									formBannMess('areaNotPointOpt');
								} else if (pvaPoint === '3') {
									formBannMess('areaNotPointOpt');
									severity = Math.max(2, severity);
									lockOK = false;
								}
							} else if (item.is2D()) {
								if (pvaArea === '' || pvaArea === '0') {
									formBannMess('pointNotArea');
									lockOK = false;
								} else if (pvaArea === '2') {
									formBannMess('pointNotAreaOpt');
								} else if (pvaArea === '3') {
									formBannMess('pointNotAreaOpt');
									severity = Math.max(2, severity);
									lockOK = false;
								}
							}
							// display any messaged regarding the category
							pc_message = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_message')];
							if (pc_message !== '0' && pc_message !== '' && pc_message === null) {
								bannMess.pnhCatMess.active = true;
								bannMess.pnhCatMess.message = pc_message;
							}
							// Unmapped categories
							pc_rare	 = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_rare')].replace(/,[^A-Za-z0-9}]+/g, ",").split(',');
							if (pc_rare.indexOf(state2L) > -1 || pc_rare.indexOf(region) > -1 || pc_rare.indexOf(countryCode) > -1) {
									bannMess.unmappedRegion.active = true;
									lockOK = false;
							}
							// Parent Category
							pc_parent	 = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_parent')].replace(/,[^A-Za-z0-9}]+/g, ",").split(',');
							if (pc_parent.indexOf(state2L) > -1 || pc_parent.indexOf(region) > -1 || pc_parent.indexOf(countryCode) > -1) {
									bannMess.parentCategory.active = true;
							}
							// Set lock level
							for (var lockix=1; lockix<6; lockix++) {
								pc_lockTemp = CH_DATA_Temp[CH_DATA_headers.indexOf('pc_lock'+lockix)].replace(/,[^A-Za-z0-9}]+/g, ",").split(',');
								if (pc_lockTemp.indexOf(state2L) > -1 || pc_lockTemp.indexOf(region) > -1 || pc_lockTemp.indexOf(countryCode) > -1) {
									defaultLockLevel = lockix - 1;  // Offset by 1 since lock ranks start at 0
									phlogdev(defaultLockLevel);
									break;
								}
							}
						break;  // If only looking at primary category, then break
						}
					}
										
					
					// Check for missing hours field
					if ( $("#WMEPH-AlertNoHours" + devVersStr).prop('checked') ) { 
						// ### Needs correct hours field check below
						if (item.attributes.openingHours.length === 0) {  // if no hours...
							if (!containsAny(newCategories,["PARKING_LOT","STADIUM_ARENA","CONVENTIONS_EVENT_CENTER","CEMETERY","FIRE_DEPARTMENT",
							"POLICE_STATION","MILITARY","FACTORY_INDUSTRIAL","ATM","TRANSPORTATION","AIRPORT","FERRY_PIER","SEAPORT_MARINA_HARBOR","SUBWAY_STATION","TRAIN_STATION",
							"BRIDGE","TUNNEL","TAXI_STATION","JUNCTION_INTERCHANGE","ISLAND","SEA_LAKE_POOL","RIVER_STREAM","FOREST_GROVE","FARM","CANAL","SWAMP_MARSH","DAM"]) ) {
								formBannMess('noHours');
							}
						} else if (item.attributes.openingHours.length === 1) {  // if one set of hours exist...
							if (item.attributes.openingHours[0].days.length < 7 && item.attributes.openingHours[0].fromHour==='00:00' && 
							(item.attributes.openingHours[0].toHour==='00:00' || item.attributes.openingHours[0].toHour==='23:59' ) ) {
								formBannMess('mismatch247');
							}
						}
					}
					/*
					if (item.attributes.openingHours.length === 0) {  // if no hours...
						bannServ.add247.active = true;
					} else if ( item.attributes.openingHours[0].days.length < 7 || item.attributes.openingHours[0].fromHour !== '00:00' || item.attributes.openingHours[0].toHour !=='00:00' ) {
						bannServ.add247.active = true;
					}
					*/
					if ( item.attributes.openingHours.length === 1) {
						if (item.attributes.openingHours[0].days.length === 7 && item.attributes.openingHours[0].fromHour === '00:00' && item.attributes.openingHours[0].toHour ==='00:00' ) {
							bannServ.add247.checked = true;
						}
					}
					
					// URL formatting
					newURL = normalizeURL(newURL);
					if (newURL !== item.attributes.url && newURL !== "" && newURL !== "0") {
						// if option is checked and place was harmonized, keep long URL for Harmonized place if domains match4444444
						if ($("#WMEPH-PreserveLongURLs" + devVersStr).prop('checked') && PNHNameRegMatch && item.attributes.url !== null) {  
							var tempNormURL = normalizeURL(item.attributes.url);  // Normalize existing url
							if (tempNormURL.match(/\/.+/i) !== null) {  // If there's something after the domain/ ...
								tempNormURL = tempNormURL.replace(/\/.*/g, '');  // strip everything after the domain
								var mTemp = tempNormURL.match(/^www\.(.*)$/i);  // strip www. if there (this is just for checking, doesn't strip www from the WME field)
								if (mTemp) { tempNormURL = mTemp[1]; } 	
								var tempNewURL = newURL.replace(/\/.*/g, '');  // strip PNH newURL down to domain
								mTemp = tempNewURL.match(/^www\.(.*)$/i);  // strip www. if there (this is just for checking, doesn't strip www from the WME field)
								if (mTemp) { tempNewURL = mTemp[1]; } 	
								if ( tempNormURL.indexOf(tempNewURL) > -1 ) {  // domain match check
									newURL = normalizeURL(item.attributes.url);  // Keep existing, normalized URL
									formBannMess('longURL');
								}
							} 
						}
						phlogdev("URL updated");
						W.model.actionManager.add(new UpdateObject(item, { url: newURL }));
					}
					
					// Phone formatting		
					var outputFormat = "({0}) {1}-{2}";
					if ( containsAny(["CA","CO"],[region,state2L]) && (/^\d{3}-\d{3}-\d{4}$/.test(item.attributes.phone))) {
						outputFormat = "{0}-{1}-{2}";
					} else if (region === "SER" && !(/^\(\d{3}\) \d{3}-\d{4}$/.test(item.attributes.phone))) {
						outputFormat = "{0}-{1}-{2}";
					} else if (region === "GLR") {
						outputFormat = "{0}-{1}-{2}";
					} else if (countryCode === "CAN") {
						outputFormat = "+1-{0}-{1}-{2}";
					}
					newPhone = normalizePhone(item.attributes.phone, outputFormat);
					if (newPhone !== item.attributes.phone) {
						phlogdev("Phone updated");
						W.model.actionManager.add(new UpdateObject(item, {phone: newPhone}));
					}
				
					// Post Office cat check
					if (newCategories.indexOf("POST_OFFICE") > -1) {
						
						
						formBannButt('isitUSPS');
					}
				
				}  // END if (!residential && has name)
				
				// Name check
				if (!item.attributes.name || item.attributes.name === '' || item.attributes.name === '') {
					formBannMess('nameMissing');
					lockOK = false;
				}
						
					// House number check
				if (!item.attributes.houseNumber) {
					if ($("#WMEPH-EnableWhitelisting" + devVersStr).prop('checked')) {
						if (HNWL) {
							bannMess.hnMissing.severity = 0;
							formBannMess('hnMissing');
						} else {
							formBannButt('hnMissing');
							lockOK = false;
						}
					} else {
						formBannMess('hnMissing');
						lockOK = false;
					}
				} else {
					var hnOK = false;
					var hnTemp = item.attributes.houseNumber.replace(/[^\d]/g, '');  // Digits only
					var hnTempDash = item.attributes.houseNumber.replace(/[^\d-]/g, '');  // Digits and dashes only
					if (hnTemp === item.attributes.houseNumber && hnTemp < 1000000) {  //  general check that HN is 6 digits or less, & that it is only [0-9]
						hnOK = true;
					}
					if (state2L === "HI") {  // Allowance for XX-XXXX HN format for Hawaii
						if (hnTempDash.match(/^\d{1,2}-\d{1,4}$/g) !== null) {
							if (hnTempDash === hnTempDash.match(/^\d{1,2}-\d{1,4}$/g)[0]) {
								hnOK = true;
							}
						}
					}
					if (!hnOK) {
						formBannMess('hnNonStandard');
						lockOK = false;
					}
				}
	
				if (!addr.street || addr.street.isEmpty) {
					formBannMess('streetMissing');
					lockOK = false;
				}
				if (!addr.city || addr.city.isEmpty) {
					formBannMess('cityMissing');
					lockOK = false;
				}
				
				//	Add services to existing, only if they are different than what's there
				if (!item.attributes.residential && !matchSets(item.attributes.services,newServices) && $("#WMEPH-EnableServices" + devVersStr).prop('checked')) {
					phlogdev("Services updated");
					W.model.actionManager.add(new UpdateObject(item, { services: newServices }));
				}
				
				// Place locking
				if (lockOK) {
					var levelToLock = defaultLockLevel;
					// Campus project exceptions
					if (region === "SER") {
						if (newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && newCategories.indexOf("PARKING_LOT") > -1) {
							levelToLock = lockLevel4;
						} else if ( item.isPoint() && newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && newCategories.indexOf("HOSPITAL_MEDICAL_CARE") === -1 ) {
							levelToLock = lockLevel4;
						}
					}
					if (levelToLock > (usrRank - 1)) {levelToLock = (usrRank - 1);}  // Only lock up to the user's level
					if (item.attributes.lockRank < levelToLock) {
						phlogdev("Venue locked!");
						W.model.actionManager.add(new UpdateObject(item, {
							lockRank: levelToLock
						}));
					}
					bannMess.placeLocked.active = true;
				}
	
				// Final alerts for non-severe locations
				var walmartFlag = 0;
				if (Math.max(severity, severityButt) < 3) {
					var nameShortSpace = newName.replace(/[^A-Za-z \']/g, '');
					if ( nameShortSpace.toUpperCase().indexOf("'S HOUSE") > -1 || nameShortSpace.toUpperCase().indexOf("'S HOME") > -1 || nameShortSpace.toUpperCase().indexOf("'S WORK") > -1) {
						formBannMess('resiTypeNameSoft'); 
					}
					nameShortSpace = newName.replace(/[^A-Za-z ]/g, '');
					if ( ["HOME","MY HOME","HOUSE","MY HOUSE","PARENTS HOUSE","CASA","MI CASA","WORK","OFFICE","MY WORK","MY OFFICE"].indexOf( nameShortSpace.toUpperCase() ) > -1 ) {
						formBannMess('resiTypeName');
						bannMess.resiTypeNameSoft.active = false;
					}
					
					if (newName === "UPS") {
						sidebarMessageOld.push("If this is a 'UPS Store' location, please change the name to The UPS Store and run the script again.");
						severity = Math.max(1, severity);
					}
					if (newName === "FedEx") {
						sidebarMessageOld.push("If this is a FedEx Office location, please change the name to FedEx Office and run the script again.");
						severity = Math.max(1, severity);
					}
					if (newName === "IBM Southeast EFCU") {
						sidebarMessageOld.push("Please add the suffix ' - LOCATION' to the primary name as found on IBMSEFCU's website");
						severity = Math.max(2, severity);
					}
					if (walmartFlag === 1) {
						sidebarMessageOld.push("If this Walmart sells groceries, please add the Supermarket category to the place.");
						severity = Math.max(1, severity);
					}
					if (newCategories.indexOf("POST_OFFICE") > -1) {
						customStoreFinderURL = "https://tools.usps.com/go/POLocatorAction.action";
						customStoreFinder = true;
						formBannMess('catPostOffice');
					}
					if (newCategories.indexOf("HOTEL") > -1) {
						formBannMess('catHotel');
					}
	
				}
	
				// Run nearby duplicate place finder function
				if (newName.length>1) {
					duplicateName = findNearbyDuplicate(newName, item);
					if (duplicateName.length > 0) {
						var dupeBannMess = 'Possible duplicate: ';
						if (duplicateName.length > 1) {
							dupeBannMess = 'Possible duplicates: ';
						}
						for (var ijx=0; ijx<duplicateName.length; ijx++) {
							dupeBannMess = dupeBannMess + '<br> --- ' + duplicateName[ijx];
						}
						bannMess.duplicateFound.message = dupeBannMess;
					}
				}
				
				
				// Turn on website linking button if there is a url
				if (newURL !== null && newURL !== "") {
						bannButt.PlaceWebsite.active = true;
				}
				
				assembleBanner(item);  // Make Messaging banners
				
			}  // (End Place 'loop')
			
		}  // END harmonizePlaceGo function
		
		// Set up banner messages
		function assembleBanner(item) {
			// push together messages from active bannMess objects
				
			var sidebarMessageEXT = sidebarMessage.slice(0);  // pull out message array to add on to if necessary
			var tempKey, strButt1, NHix;
			for (var bannKey in bannMess) {
				if (bannMess.hasOwnProperty(bannKey)) {
					if (bannMess[bannKey].active) {
						sidebarMessageEXT.push(bannMess[bannKey].message);
					}
				}
			}
			
			severityButt = 0;
			for (NHix = 0; NHix < Object.keys(bannButt).length; NHix++ ) {
				tempKey = Object.keys(bannButt)[NHix];
				var strButt2 = '';
				if (bannButt[tempKey].active) {
					strButt1 = bannButt[tempKey].bannText + '<input class="PHbutton" id="' + bannButt[tempKey].id + '" title="' + bannButt[tempKey].title + '" type="button" value="' + bannButt[tempKey].value + '">';
					sidebarMessageEXT.push(strButt1 + strButt2);
					severityButt = Math.max(bannButt[tempKey].severity, severityButt);
				}
			}
			
			if (!$("#WMEPH-HideServices" + devVersStr).prop('checked')) {
				// setup Add Service Buttons for suggested services
				var sidebarServButts = '';
				var servButtHeight = '28';
				for ( NHix = 0; NHix < Object.keys(bannServ).length; NHix++ ) {
					tempKey = Object.keys(bannServ)[NHix];
					if (bannServ[tempKey].active) {
						if (bannServ[tempKey].checked) {
							strButt1 = '&nbsp<input class="PHbutton" id="' + bannServ[tempKey].id + '" title="' + bannServ[tempKey].title + '" type="image" style="height:' + servButtHeight + 
							'px;background:none;border-color: none;border-style: none;" src="https://openmerchantaccount.com/img2/' + bannServ[tempKey].icon + '.png">';
						} else {
							strButt1 = '&nbsp<input class="PHbutton" id="' + bannServ[tempKey].id + '" title="' + bannServ[tempKey].title + '" type="image" style="height:' + servButtHeight + 
							'px;background:none;border-color: none;border-style: none;" src="https://openmerchantaccount.com/img2/' + bannServ[tempKey].icon + '-grey.png">';
						}
						sidebarServButts = sidebarServButts + strButt1;
					}
				}
				
				
				if (sidebarServButts.length>0) {
					//sidebarMessageEXT.push('Add services:<br>' + sidebarServButts + '<br><hr align="center" width="90%">');
					sidebarMessageEXT.push('Add services:<br>' + sidebarServButts);
				}
			}
			
			
			for (NHix = 0; NHix < Object.keys(bannButt2).length; NHix++ ) {
				tempKey = Object.keys(bannButt2)[NHix];
				if (bannButt2[tempKey].active) {
					strButt1 = bannButt2[tempKey].bannText + '<input class="PHbutton" id="' + bannButt2[tempKey].id + '" title="' + bannButt2[tempKey].title + '" type="button" value="' + bannButt2[tempKey].value + '">';
					sidebarMessageEXT.push(strButt1);
					severityButt = Math.max(bannButt2[tempKey].severity, severityButt);
				}
			}
			
			
			// Add banner indicating that it's the beta version
			if (isDevVersion) {
				sidebarMessageEXT.push('WMEPH Beta');
			} 
			displayBanners(sidebarMessageEXT.join("<li>"), Math.max(severity, severityButt) );
			setupButtons(item);
			if (!$("#WMEPH-HideServices" + devVersStr).prop('checked')) {
				setupServiceButtons(item);
			}
			setupButtons2(item);
		}  // END assemble Banner function
		
		// Button event handlers
		function setupButtons(item) {
			var ixButt = 0;
			var btn = [];
			for (var NHix = 0; NHix < Object.keys(bannButt).length; NHix++ ) {
				var tempKey = Object.keys(bannButt)[NHix];
				if (bannButt[tempKey].active) {
					btn[ixButt] = document.getElementById(bannButt[tempKey].id); 
					btn[ixButt].onclick = (function(buttonId, item){
						return function() {
							//bannButt[buttonId].action(item);
							bannButt[buttonId].action();
							assembleBanner(item);
						};
					})(tempKey, item)
					ixButt++;
				}
			}
			
		}  // END setupButtons function
		
		function setupServiceButtons(item) {
			var ixButt = 0;
			var btn = [];
			for (var NHix = 0; NHix < Object.keys(bannServ).length; NHix++ ) {
				var tempKey = Object.keys(bannServ)[NHix];
				if (bannServ[tempKey].active) {
					btn[ixButt] = document.getElementById(bannServ[tempKey].id); 
					btn[ixButt].onclick = (function(buttonId, item){
						return function() {
							bannServ[buttonId].action();
							assembleBanner(item);
						};
					})(tempKey, item)
					ixButt++;
				}
			}
			
		}  // END setupServiceButtons function
		
		function setupButtons2(item) {
			var ixButt = 0;
			var btn = [];
			for (var NHix = 0; NHix < Object.keys(bannButt2).length; NHix++ ) {
				var tempKey = Object.keys(bannButt2)[NHix];
				if (bannButt2[tempKey].active) {
					btn[ixButt] = document.getElementById(bannButt2[tempKey].id); 
					btn[ixButt].onclick = (function(buttonId, item){
						return function() {
							//bannButt[buttonId].action(item);
							bannButt2[buttonId].action();
							assembleBanner(item);
						};
					})(tempKey, item)
					ixButt++;
				}
			}
			
		}  // END setupButtons function
		
		// Display banners with <LI> string and severity
		function displayBanners(sbm,sev) {
			$('#WMEPH_logger_warn').empty();
			if (sev === 0) {
					$('<div id="WMEPH_logger_warn">').css("width", "290").css("background-color", "rgb(36, 172, 36)").css("color", "white").css("font-size", "15px").css("font-weight", "bold").css("margin-left", "auto").css("margin-right", "auto").prependTo(".contents");
				}
				if (sev === 1) {
					$('<div id="WMEPH_logger_warn">').css("width", "290").css("background-color", "rgb(40, 40, 230)").css("color", "white").css("font-size", "15px").css("font-weight", "bold").css("margin-left", "auto").css("margin-right", "auto").prependTo(".contents");
				}
				if (sev === 2) {
					$('<div id="WMEPH_logger_warn">').css("width", "290").css("background-color", "rgb(217, 173, 42)").css("color", "white").css("font-size", "15px").css("font-weight", "bold").css("margin-left", "auto").css("margin-right", "auto").prependTo(".contents");
				}
				if (sev === 3) {
					$('<div id="WMEPH_logger_warn">').css("width", "290").css("background-color", "rgb(211, 48, 48)").css("color", "white").css("font-size", "15px").css("font-weight", "bold").css("margin-left", "auto").css("margin-right", "auto").prependTo(".contents");
				}
				WMEPH_DispWarn(sbm);
				
		}  // END displayBanners funtion
		
		// CSS setups
		var cssCode = [".PHbutton {background: #ffffff;color: #000;padding: 0px 6px 0px 6px;text-decoration: none;}",
			".PHbutton:hover {background: #e8e5e8;text-decoration: none;}"];
		for (var cssix=0; cssix<cssCode.length; cssix++) {
			insertCss(cssCode[cssix]);
		}
		function insertCss( code ) {
			var style = document.createElement('style');
			style.type = 'text/css';
			style.innerHTML = code;
			document.head.appendChild( style );
		}  // END insertCss funtion
		
		// Banner production
		function WMEPH_DispWarn(e) {
			"use strict";
			e = "<li>" + e;
			var n = $('<div id="WMEPHlog">').append(e);
			$("#WMEPH_logger_warn").append(n);
		}  // END WMEPH_DispWarn function
	
		// Form banner Message with severity update
		function formBannMess(bannKey) {
			bannMess[bannKey].active = true;
			severity = Math.max(bannMess[bannKey].severity, severity);
		}
		// Form banner Button Message with severity update
		function formBannButt(bannKey) {
			bannButt[bannKey].active = true;
			severityButt = Math.max(bannButt[bannKey].severity, severityButt);
		}
		
		// Duplicate place finder  ###bmtg
		function findNearbyDuplicate(itemName, item) {
			var venueList = W.model.venues.objects, testVenueAtt, testName, itemNameRF;
			// Name formatting for the WME place name 
			itemNameRF = itemName.toUpperCase();  // UpperCase the current place name (The Holly And Ivy Pub #23 --> THE HOLLY AND IVY PUB #23 )
			itemNameRF = itemNameRF.replace(/ AND /g, '');  // Clear the word " AND " from the name (THE HOLLY AND IVY PUB #23 --> THE HOLLYIVY PUB #23 )
			itemNameRF = itemNameRF.replace(/^THE /g, '');  // Clear the word "THE " from the start of the name ( THE HOLLYIVY PUB #23 -- > HOLLYIVY PUB #23 )
			itemNameRF = itemNameRF.replace(/[^A-Z0-9]/g, '');  // Clear all non-letter and non-number characters ( HOLLYIVY PUB #23 -- > HOLLYIVYPUB23 )
			var itemNameNoNum = itemNameRF.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB ) 
			
			
			// Create PlaceName layer
			var rlayers = Waze.map.getLayersBy("uniqueName","__DuplicatePlaceNames");
			var wmepn_NameLayer;
			if(rlayers.length === 0) {
				var lname = "Duplicate Names";
				var style = new OpenLayers.Style({
					strokeDashstyle: 'solid',
					strokeColor : "${strokeColor}",
					strokeOpacity: 1.0,
					strokeWidth: "${strokeWidth}",
					fillColor: '#0040FF',
					fillOpacity: 1.0,
					pointRadius: "${pointRadius}",
					label : "${labelText}",
					fontFamily: "Tahoma, Courier New",
					labelOutlineColor: '#000000',
					labelOutlineWidth: 1.5,
					labelAlign: 'cm',
					fontColor: "#FFFFFF",
					fontOpacity: 1.0,
					fontSize: "20px",
					display: 'block',
					labelYOffset: "${yOffset}",
					fontStyle: "${style}"
				});
				var nameLayer = new OpenLayers.Layer.Vector(lname, {
					displayInLayerSwitcher: true,
					uniqueName: "__DuplicatePlaceNames",
					styleMap: new OpenLayers.StyleMap(style)
				});
				nameLayer.setVisibility(true);
				//drc_mapLayer1.moveLayerToTop();
				Waze.map.addLayer(nameLayer);
				//var zLandmarks = map.getLayersBy("uniqueName", "landmarks")[0].getZIndex();
				//var zPlaceNames = drc_mapLayer1.getZIndex();   
				//map.getLayersBy("uniqueName", "landmarks")[0].setZIndex(zPlaceNames);
				//drc_mapLayer1.setZIndex(zLandmarks);
				wmepn_NameLayer = nameLayer;
			} else {
				wmepn_NameLayer = rlayers[0];
			}
			wmepn_NameLayer.destroyFeatures();
			//phlogdev(Waze.map.layers.length);
			var vecLyr = Waze.map.getLayersBy("uniqueName","__DuplicatePlaceNames")[0];
			vecLyr.setZIndex(1000000);  // Move layer to top
			var labelFeatures = [], dupeNames = [];
							
			for (var venix in venueList) {
				if (venueList.hasOwnProperty(venix)) {
					testVenueAtt = venueList[venix].attributes;
					if (!testVenueAtt.residential && venix !== item.attributes.id && testVenueAtt.id !== -100) {
						//Reformat the testPlace name
						testName = testVenueAtt.name.toUpperCase();  // UpperCase the current place name (The Holly And Ivy Pub #23 --> THE HOLLY AND IVY PUB #23 )
						testName = testName.replace(/ AND /g, '');  // Clear the word " AND " from the name (THE HOLLY AND IVY PUB #23 --> THE HOLLYIVY PUB #23 )
						testName = testName.replace(/^THE /g, '');  // Clear the word "THE " from the start of the name ( THE HOLLYIVY PUB #23 -- > HOLLYIVY PUB #23 )
						testName = testName.replace(/[^A-Z0-9]/g, '');  // Clear all non-letter and non-number characters ( HOLLYIVY PUB #23 -- > HOLLYIVYPUB23 )
						var testNameNoNum = testName.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB )
						if ( (testName.indexOf(itemNameRF) > -1 || itemNameRF.indexOf(testName) > -1) &&  testName.length > 1) {
							phlogdev('Possible duplicate found. WME place: ' + itemName + ' / Nearby place: ' + testVenueAtt.name);
							document.getElementById(venueList[venix].geometry.id).setAttribute("r", 14);
							document.getElementById(venueList[venix].geometry.id).setAttribute("stroke-width", 10);
							
							var labelText = testVenueAtt.name;
							if (testVenueAtt.images.length > 0 ) {
								//bannButt.duplicateFound.bannText = "Possible duplicate (with Photos): " + duplicateName;
								for (var phix=0; phix<testVenueAtt.images.length; phix++) {
									if (phix===3) {
										labelText = labelText + '+';
										break;
									}
									labelText = labelText + '\u26F0';
								}
							}
							
							//var bounds = venue.geometry.bounds;
							var pt;
							pt = venueList[venix].geometry.getCentroid();
							var textFeature = new OpenLayers.Feature.Vector( pt, {labelText: labelText, fontColor: '#F0F0F0', pointRadius: 0 } );
							labelFeatures.push(textFeature);
							wmepn_NameLayer.addFeatures(labelFeatures);
							formBannMess('duplicateFound');
							dupeNames.push(testVenueAtt.name);
						}
					}
				}
			}
			return dupeNames;
		}
		
		
		// Functions to infer address from nearby segments
		function WMEPH_inferAddress() {
			'use strict';
			var city,
				country,
				distanceToSegment,
				foundAddresses = [],
				inferredAddress = {
					country: null,
					city: null,
					state: null,
					street: null
				},
				i,
				IGNORE_ROAD_TYPES = [10, 16, 18, 19], // Ignore pedestrian boardwalk, stairways, runways, and railroads
				MAX_RECURSION_DEPTH = 8,
				n,
				orderedSegments = [],
				segments = W.model.segments.getObjectArray(),
				selectedItem,
				state,
				stopPoint,
				street,
				wmeSelectedItems = W.selectionManager.selectedItems;

			var findClosestNode = function () {
				'use strict';
				var closestSegment = orderedSegments[0].segment,
					distanceA,
					distanceB,
					nodeA = W.model.nodes.get(closestSegment.attributes.fromNodeID),
					nodeB = W.model.nodes.get(closestSegment.attributes.toNodeID);
				if (nodeA && nodeB) {
					distanceA = stopPoint.distanceTo(nodeA.attributes.geometry);
					distanceB = stopPoint.distanceTo(nodeB.attributes.geometry);
					return distanceA < distanceB ? nodeA.attributes.id : nodeB.attributes.id;
				}
			};

			var findConnections = function (startingNodeID, recursionDepth) {
				'use strict';
				var addressDetails,
					connectedSegments,
					k,
					newNode;
				
				// Limit search depth to avoid problems.
				if (recursionDepth > MAX_RECURSION_DEPTH) {
					console.debug('Max recursion depth reached');
					return;
				}
				
				// Populate variable with segments connected to starting node.
				connectedSegments = _.where(orderedSegments, {
					fromNodeID: startingNodeID
				}),
				connectedSegments = connectedSegments.concat(_.where(orderedSegments, {
					toNodeID: startingNodeID
				}));

				//console.debug('Looking for connections at node ' + startingNodeID);
				
				// Check connected segments for address info.
				for (k in connectedSegments) {
					if (connectedSegments.hasOwnProperty(k)) {
						addressDetails = connectedSegments[k].segment.getAddressDetails();
						if (addressDetails.streetName !== 'No street') {
							// Address found, push to array.
							/*
							console.debug('Address found on connnected segment ' +
								connectedSegments[k].segment.attributes.id +
								'. Recursion depth: ' + recursionDepth);
							*/
							foundAddresses.push({
								depth: recursionDepth,
								distance: connectedSegments[k].distance,
								segment: connectedSegments[k].segment,
								streetName: connectedSegments[k].segment.getAddress().street.name // used for debugging - remove
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
					8: 6, // dirt
				};
				if (FC && !isNaN(FC)) {
					return typeToFCRank[FC] || 100;
				}
			};
			
			// phlogdev("No address data, gathering ", 2);
			
			// Make sure a place is selected.
			if (wmeSelectedItems.length > 0 && wmeSelectedItems[0].model.type === 'venue') {
				selectedItem = W.selectionManager.selectedItems[0];
			} else {
				return;
			}

			stopPoint = selectedItem.model.isPoint() ? selectedItem.geometry : W.geometryEditing.editors.venue.navigationPoint.lonlat.toPoint();
			
			// Go through segment array and calculate distances to segments.
			for (i = 0, n = segments.length; i < n; i++) {
				// Make sure the segment is not an ignored roadType.
				if (IGNORE_ROAD_TYPES.indexOf(segments[i].attributes.roadType) === -1) {
					distanceToSegment = stopPoint.distanceTo(segments[i].geometry);
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
			
			// Try to find address through branching method.
			findConnections(findClosestNode(), 1);
			if (foundAddresses.length > 0) {
				// Use address from segment with address that is closest by connectivity.
				foundAddresses = _.sortBy(foundAddresses, 'depth');
				foundAddresses = _.filter(foundAddresses, {
					depth: foundAddresses[0].depth
				});
				// If more than one address found at same recursion depth, look at FC of segments.
				if (foundAddresses.length > 1) {
					_.each(foundAddresses, function (element) {
						element.fcRank = getFCRank(element.segment.attributes.roadType);
					});
					foundAddresses = _.sortBy(foundAddresses, 'fcRank');
					foundAddresses = _.filter(foundAddresses, {
						fcRank: foundAddresses[0].fcRank
					});
				}
				// If more than one of the closest segments by connectivity has the same FC, look for
				// closest segment geometrically.
				if (foundAddresses.length > 1) {
					foundAddresses = _.sortBy(foundAddresses, 'distance');
				}
				//console.debug(foundAddresses[0].streetName, foundAddresses[0].depth);
				inferredAddress = foundAddresses[0].segment.getAddress();
			} else {
				// Default to closest if branching method fails.
				// Go through sorted segment array until a country, state, and city have been found.
				for (i = 0,
					n = orderedSegments.length; i < n; i++) {
					street = W.model.streets.get(orderedSegments[i].segment.attributes.primaryStreetID);
					city = W.model.cities.get(street.cityID);
					state = W.model.states.get(city.stateID);
					country = W.model.countries.get(city.countryID);
					if (inferredAddress.street === null && street.name !== '') {
						inferredAddress.street = street;
					}
					if (inferredAddress.city === null && city.name !== '') {
						inferredAddress.city = city;
					}
					if (inferredAddress.state === null && state.name !== '') {
						inferredAddress.state = state;
					}
					if (inferredAddress.country === null && country.name !== '') {
						inferredAddress.country = country;
					}
					// Stop looking for info if city, state, and country have been found.
					if (inferredAddress.street && inferredAddress.city && inferredAddress.state &&
						inferredAddress.country) {
						break;
					}
				}
			}
			return inferredAddress;
		}
		
		/**
		 * Updates the address for a place.
		 * @param feature {WME Venue Object} The place to update.
		 * @param address {Object} An object containing the country, state, city, and street
		 * objects.
		 */
		function updateAddress(feature, address) {
			'use strict';
			var newAttributes, 
				UpdateFeatureAddress = require('Waze/Action/UpdateFeatureAddress');
				feature = feature || item;
			if (feature && address && address.state && address.country) {
				newAttributes = {
					countryID: address.country.id,
					stateID: address.state.id,
					cityName: address.city.name,
					emptyCity: address.city.name ? null : true,
					streetName: address.street.name,
					emptyStreet: address.street.name ? null : true
				};
				W.model.actionManager.add(new UpdateFeatureAddress(feature, newAttributes));
			}
		}

		// Build a Google search url based on place name and address
		function buildGLink(searchName,addr,HN) {
			var searchHN = "", searchStreet = "", searchCity = "";
			searchName = searchName.replace(/&/g, "%26");
			searchName = searchName.replace(/[ \/]/g, "%20");
			if ("string" === typeof HN) {
				searchHN = HN + "%20";
			}
			if ("string" === typeof addr.street.name) {
				searchStreet = addr.street.name + ",%20";
			}
			searchStreet = searchStreet.replace(/ /g, "%20");
			if ("string" === typeof addr.city.name) {
				searchCity = addr.city.name + ",%20";
			}
			searchCity = searchCity.replace(/ /g, "%20");
			
			return "http://www.google.com/search?q=" + searchName + ",%20" + searchHN + searchStreet + searchCity + addr.state.name;
		} // END buildGLink function
		
		// WME Category translation from Natural language to object language
		function catTranslate(natCategories) {
			if (natCategories.toUpperCase().replace(/ AND /g, "").replace(/[^A-Z]/g, "").indexOf('PETSTORE') > -1) {
				return "PET_STORE_VETERINARIAN_SERVICES";
			}
			for(var keyCat in catTransWaze2Lang){
				if ( natCategories.toUpperCase().replace(/ AND /g, "").replace(/[^A-Z]/g, "") ===  catTransWaze2Lang[keyCat].toUpperCase().replace(/ AND /g, "").replace(/[^A-Z]/g, "")) {
					return keyCat;
				}
			}
			if (confirm('WMEPH: Category Error!\nClick OK to report this error') ) {  // if the category doesn't translate, then pop an alert that will make a forum post to the thread
				var forumMsgInputs = {
					subject: 'Re: WMEPH Bug report',
					message: 'Error report: category "' + natCategories + '" is not translatable.',
					addbbcode20: '100', preview: 'Preview', attach_sig: 'on', notify: 'on'
				};
				WMEPH_openPostDataInNewTab(WMEPHurl + '#preview', forumMsgInputs);
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
		
		// settings tab
		function add_PlaceHarmonizationSettingsTab() {
			//Create Settings Tab
			var phTabHtml = '<li><a href="#sidepanel-ph' + devVersStr + '" data-toggle="tab" id="PlaceHarmonization' + devVersStr + '">WMEPH' + devVersStrSpace + '</a></li>';
			$("#user-tabs ul.nav-tabs:first").append(phTabHtml);
		
			//Create Settings Tab Content
			var phContentHtml = '<div class="tab-pane" id="sidepanel-ph' + devVersStr + '"><div id="PlaceHarmonizer' + devVersStr + '"><p>WMEPH' + 
				devVersStrSpace + ' v. ' + WMEPHversion + '</p><hr align="center" width="90%"><p>Settings:</p></div></div>';
			$("#user-info div.tab-content:first").append(phContentHtml);
			
			//Create Settings Checkboxes and Load Data
			//example condition:  if ( $("#WMEPH-EnableWhitelisting" + devVersStr).prop('checked') ) { }
			createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-HidePlacesWiki" + devVersStr,"Hide 'Places Wiki' button in results banner");
			createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-AlertNoHours" + devVersStr,"Alert for missing or unlikely hours of operation");
			if (devUser || betaUser || usrRank > 2) {
				createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-ConvenienceStoreToGasStations" + devVersStr,'Automatically add "Convenience Store" category to gas stations');
			}
			if (devUser) {
				// Old option for removing www.  Keep in case it is needed.
				// createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-StripWWW" + devVersStr,"Strip 'www.' from all URLs");
			}
			if (devUser || betaUser || usrRank > 2) {
				createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-PreserveLongURLs" + devVersStr,"Preserve existing long URLs for harmonized places");
			}
			if (devUser || betaUser || usrRank > 1) {
				createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-HideServices" + devVersStr,"Hide Add Services banner buttons");
			}
			if (devUser || betaUser || usrRank > 3) {
				createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-EnableServices" + devVersStr,"Enable automatic addition of common services");
			}
			if (devUser || betaUser || usrRank > 3) {
				createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-AddAddresses" + devVersStr,"Add detected address fields to places with no address");
			}
			if (devUser || betaUser || usrRank > 3) {
				createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-EnableWhitelisting" + devVersStr,"Enable whitelisting mode");
			}
			var phHRContentHtml = '<hr align="center" width="90%">';
			$("#PlaceHarmonizer" + devVersStr).append(phHRContentHtml);
				
				
			// User pref for KB Shortcut:
			var defaultKBShortcut,shortcutParse, modifKey = 'Alt+', KBSwarn=false;
			// Set defaults
			if (thisUser.userName.toLowerCase() === 't0cableguy') {
				defaultKBShortcut = 'p';
			} else if (isDevVersion) {
				defaultKBShortcut = 'S';
			} else {
				defaultKBShortcut = 'A';
			}
			// Set local storage to default if none
			if (localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr) === null) {
				localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, defaultKBShortcut);
			}
			if (localStorage.getItem('WMEPH-KBSModifierKey'+devVersStr) === null) {
				localStorage.setItem('WMEPH-KBSModifierKey'+devVersStr, modifKey);
			}
			// Add Letter input box
			var phKBContentHtml = $('<div id="PlaceHarmonizerKBWarn' + devVersStr + '"></div><div id="PlaceHarmonizerKB' + devVersStr + 
				'"><form>Shortcut Letter (a-Z): <input type="text" maxlength="1" id="WMEPH-KeyboardShortcut'+devVersStr+'" style="width: 30px;padding-left:8px"></form></div>');
        	$("#PlaceHarmonizer" + devVersStr).append(phKBContentHtml);
			// Add Alt-->Ctrl checkbox
			createSettingsCheckbox("PlaceHarmonizerKB" + devVersStr, "WMEPH-KBSModifierKey" + devVersStr, "Use Ctrl instead of Alt");
			// Change modifier key code if checked
			if ( $("#WMEPH-UseKBSCtrl" + devVersStr).prop('checked') ) { 
				modifKey = 'Ctrl+';
				localStorage.setItem('WMEPH-KBSModifierKey'+devVersStr, modifKey);
			} 
			// Set values from local storage
			$('#WMEPH-KeyboardShortcut'+devVersStr).val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
			$('#WMEPH-KBSModifierKey'+devVersStr).val(localStorage.getItem('WMEPH-KBSModifierKey'+devVersStr));
			// If the local storage value is missing, set to default.
			if ($('#WMEPH-KeyboardShortcut'+devVersStr).val().match(/^[b-z]{1}$/i) === null) { 
            	$('#WMEPH-KeyboardShortcut'+devVersStr).val(defaultKBShortcut);
				$(localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, $('#WMEPH-KeyboardShortcut'+devVersStr).val()));
			}
			// Parse the short cut for Shift
			shortcutParse = $('#WMEPH-KeyboardShortcut'+devVersStr).val();
			if (shortcutParse.match(/^[A-Z]{1}$/g) !== null) {
				shortcutParse = 'Shift+' + shortcutParse;
			}
			
			
			shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
			phKBContentHtml = $('<div id="PlaceHarmonizerKBCurrent' + devVersStr + '"><span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span></div>');
        	$("#PlaceHarmonizerKB" + devVersStr).append(phKBContentHtml);
			
			
			// Modifier on-click changes
			$("#WMEPH-KBSModifierKey" + devVersStr).click(function() {
				$("#PlaceHarmonizerKBLetters" + devVersStr).remove();
				shortcutParse = localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr);
				if (shortcutParse.match(/^[A-Z]{1}$/g) !== null) {
					shortcutParse = 'Shift+' + shortcutParse;
				}
				shortcut.remove(modifKey + shortcutParse);
				
				if ($("#WMEPH-KBSModifierKey" + devVersStr).prop('checked')) {
					modifKey = 'Ctrl+';
				} else {
					modifKey = 'Alt+';
				}
				// add new shortcut
				shortcutParse = $('#WMEPH-KeyboardShortcut'+devVersStr).val();
				if (shortcutParse.match(/^[A-Z]{1}$/g) !== null) {
					shortcutParse = 'Shift+' + shortcutParse;
				}
				shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
				localStorage.setItem('WMEPH-KBSModifierKey'+devVersStr, modifKey);
				$("#PlaceHarmonizerKBCurrent" + devVersStr).remove();
				phKBContentHtml = $('<div id="PlaceHarmonizerKBCurrent' + devVersStr + '"><span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span></div>');
        		$("#PlaceHarmonizerKB" + devVersStr).append(phKBContentHtml);
			});
			
			// Upon change of the KB letter:
			$("#WMEPH-KeyboardShortcut"+devVersStr).change(function() {
				if ($('#WMEPH-KeyboardShortcut'+devVersStr).val().match(/^[b-z]{1}$/i) !== null) {
					$("#PlaceHarmonizerKBLetters" + devVersStr).remove();
					// remove previous
					shortcutParse = localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr);
					if (shortcutParse.match(/^[B-Z]{1}$/g) !== null) {
						shortcutParse = 'Shift+' + shortcutParse;
					}
					shortcut.remove(modifKey + shortcutParse);
					// add new shortcut
					shortcutParse = $('#WMEPH-KeyboardShortcut'+devVersStr).val();
					if (shortcutParse.match(/^[B-Z]{1}$/g) !== null) {
						shortcutParse = 'Shift+' + shortcutParse;
					}
					shortcut.add(modifKey + shortcutParse, function() { harmonizePlace(); });
					$(localStorage.setItem('WMEPH-KeyboardShortcut'+devVersStr, $('#WMEPH-KeyboardShortcut'+devVersStr).val()) );
					$("#PlaceHarmonizerKBCurrent" + devVersStr).remove();
					phKBContentHtml = $('<div id="PlaceHarmonizerKBCurrent' + devVersStr + '"><span style="font-weight:bold">Current shortcut: '+modifKey+shortcutParse+'</span></div>');
					$("#PlaceHarmonizerKB" + devVersStr).append(phKBContentHtml);
				} else {
					$('#WMEPH-KeyboardShortcut'+devVersStr).val(localStorage.getItem('WMEPH-KeyboardShortcut'+devVersStr));
					$("#PlaceHarmonizerKBLetters" + devVersStr).remove();
					phKBContentHtml = '<div id="PlaceHarmonizerKBLetters' + devVersStr + '"><p style="color:red">Only letters are allowed<p></div>';
					$("#PlaceHarmonizerKBWarn" + devVersStr).append(phKBContentHtml);
				}
			});
				
			if (devUser) {  // Override script regionality (devs only)
				var phDevContentHtml = '<hr align="center" width="90%"><p>Dev Only Settings:</p>';
				$("#PlaceHarmonizer" + devVersStr).append(phDevContentHtml);
				createSettingsCheckbox("PlaceHarmonizer" + devVersStr, "WMEPH-RegionOverride" + devVersStr,"Disable Region Specificity");
			
			}
			
			var phWLContentHtml = $('<hr align="center" width="90%"><div id="PlaceHarmonizerWLTools' + devVersStr + '"><form>Whitelist string: <input onClick="this.select();" type="text" id="WMEPH-WLInput'+devVersStr+
				'" style="width: 200px;padding-left:1px"><br>'+
				'<input class="PHbutton" id="WMEPH-WLMerge'+ devVersStr +'" title="Merge the string into your existing Whitelist" type="button" value="Merge">'+
				'<input class="PHbutton" id="WMEPH-WLPull'+ devVersStr +'" title="Pull your existing Whitelist for backup or sharing" type="button" value="Pull">'+
				'</form></div><div id="PlaceHarmonizerWLToolsMsg' + devVersStr + '"></div>');
        	$("#PlaceHarmonizerKB" + devVersStr).append(phWLContentHtml);
			
			
			$("#WMEPH-WLMerge" + devVersStr).click(function() {
				$("#PlaceHarmonizerWLToolsMsg" + devVersStr).remove();
				WLSToMerge = validateWLS($('#WMEPH-WLInput'+devVersStr).val());
				if (WLSToMerge) {
					phlogdev('Whitelists merged!');
					venueWhitelist = mergeWL(venueWhitelist,WLSToMerge);
					saveWL_LS();
				} else {
					phWLContentHtml = '<div id="PlaceHarmonizerWLToolsMsg' + devVersStr + '"><p style="color:red">Invalid Whitelist data<p></div>';
					$("#PlaceHarmonizerWLTools" + devVersStr).append(phWLContentHtml);
				}
			});
			
			// Pull the data to the text field
			$("#WMEPH-WLPull" + devVersStr).click(function() {
				$("#PlaceHarmonizerWLToolsMsg" + devVersStr).remove();
				$('#WMEPH-WLInput'+devVersStr).val(localStorage.getItem(WLlocalStoreName));
				phWLContentHtml = '<div id="PlaceHarmonizerWLToolsMsg' + devVersStr + '"><p style="color:green">To backup the data, copy & paste the text in the box to a safe location.<p></div>';
				$("#PlaceHarmonizerWLTools" + devVersStr).append(phWLContentHtml);
			});
			
			
			/*
			
			
			*/
			
			var feedbackString = 'Submit script feedback & suggestions';
			var placesWikiStr = 'Open the WME Places Wiki page';
			var phContentHtml2 = '<hr align="center" width="95%"><p><a href="' + 
				placesWikiURL + '" target="_blank" title="'+placesWikiStr+'">'+placesWikiStr+'</a><p><a href="' + 
				WMEPHurl + '" target="_blank" title="'+feedbackString+'">'+feedbackString+'</a></p><hr align="center" width="95%">Major features for v. ' + 
				WMEPHversionMeta+':<ul><li>'+WMEPHWhatsNewMetaHList+'</ul>Recent updates:<ul><li>'+WMEPHWhatsNewHList+'</ul>';
			$("#PlaceHarmonizer" + devVersStr).append(phContentHtml2);
			
			
			// $("#user-info div.tab-content:first").append(phContentHtml2);
			phlog('Ready...!');
		} // END Settings Tab
	
		// This routine will create a checkbox in the #PlaceHarmonizer tab and will load the setting
		//		settingID:  The #id of the checkbox being created.  
		//  textDescription:  The description of the checkbox that will be use
		function createSettingsCheckbox(divID, settingID, textDescription) {
			//Create settings checkbox and append HTML to settings tab
			var phTempHTML = '<input type="checkbox" id="' + settingID + '">'+ textDescription +'</input><br>';
			$("#" + divID).append(phTempHTML);
			//phlogdev(settingID + ' checkbox created');
			
			//Associate click event of new checkbox to call saveSettingToLocalStorage with proper ID
			$("#" + settingID).click(function() {saveSettingToLocalStorage(settingID);});
			//phlogdev('Callback Set');
			
			//Load Setting for Local Storage, if it doesn't exist set it to NOT checked.
			//If previously set to 1, then trigger "click" event.
			if (!localStorage.getItem(settingID))
			{
				//phlogdev(settingID + ' not found.');
			} else if (localStorage.getItem(settingID) === "1") {
				//phlogdev(settingID + ' = 1 so invoking click');
				$("#" + settingID).trigger('click');
			}
			//phlogdev('Setting Checked');
		}
	
		// Save settings prefs
		function saveSettingToLocalStorage(settingID) {
			if ($("#" + settingID).prop('checked')) {
				// phlogdev(settingID + ' to 1');
				localStorage.setItem(settingID, '1');
			} else {
				// phlogdev(settingID + ' to 0');
				localStorage.setItem(settingID, '0');
			}	
		}
		
		// This function validates that the inputted text is a JSON
		function validateWLS(jsonString) {
			"use strict";
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
			"use strict";
			var venueKey, WLKey, vWL_1_Venue, vWL_2_Venue;
			for (venueKey in vWL_2) {
				if (vWL_2.hasOwnProperty(venueKey)) {  // basic filter
					
					if (vWL_1.hasOwnProperty(venueKey)) {  // if the vWL_2 venue is in vWL_1, then update any keys
						vWL_1_Venue = vWL_1[venueKey];
						vWL_2_Venue = vWL_2[venueKey];
						for (WLKey in vWL_2_Venue) {  // loop thru the venue WL keys
							if (vWL_2_Venue.hasOwnProperty(WLKey)) {  // basic filter
		
								if (vWL_2_Venue[WLKey].active) {  // Only update if the vWL_2 key is active
									if ( vWL_1_Venue.hasOwnProperty(WLKey) && vWL_1_Venue[WLKey].active ) {  // if the key is in the vWL_1 venue and it is active, then push any array data onto the key
										if (vWL_1_Venue[WLKey].hasOwnProperty('WLKeyArray')) {
											vWL_1[venueKey][WLKey].WLKeyArray = insertAtIX(vWL_1[venueKey][WLKey].WLKeyArray,vWL_2[venueKey][WLKey].WLKeyArray,100);
										}
									} else {  // if the key isn't in the vWL_1 venue, or if it's inactive, then copy the vWL_2 key across
										vWL_1[venueKey][WLKey] = vWL_2[venueKey][WLKey];
									}
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
			var servArrayCheck = [];
			for (var wsix=0; wsix<WMEServicesArray.length; wsix++) {
				if ($("#service-checkbox-" + WMEServicesArray[wsix]).prop('checked')) {
					servArrayCheck[wsix] = true;
				} else {
					servArrayCheck[wsix] = false;
				}
			}
			return servArrayCheck;
		}
		
		function updateServicesChecks(bannServ) {
			var servArrayCheck = getServicesChecks(), wsix=0;
			for (var keys in bannServ) {
				if (bannServ.hasOwnProperty(keys)) {
					bannServ[keys].checked = servArrayCheck[wsix];  // reset all icons to match any checked changes
					bannServ[keys].active = bannServ[keys].active || servArrayCheck[wsix];  // display any manually checked non-active icons
					wsix++;
				}
			}
		}
				
		// Focus away from the current cursor focus, to set text box changes
		function blurAll() {
			var tmp = document.createElement("input");
			document.body.appendChild(tmp);
			tmp.focus();
			document.body.removeChild(tmp);
		}
		
		// Sets up a div for submitting forms
		function WMEPH_initialiseFL() {
			var wmephlinks = WMEPH_getId("WMEPH-forumlink");
			var mapFooter = WMEPH_getElementsByClassName("WazeControlPermalink");
			if (mapFooter.length === 0) {
				phlog("Error, can't find permalink container");
				setTimeout(WMEPH_initialiseFL, 1000);
				return;
			}
			var WMEPH_divPerma = mapFooter[0];
			var WMEPH_aPerma = null;
			for (var i = 0; i < WMEPH_divPerma.children.length; i++) {
				if (WMEPH_divPerma.children[i].className === 'icon-link') {
					WMEPH_aPerma = WMEPH_divPerma.children[i];
					break;
				}
				if (WMEPH_divPerma.children[i].className === 'fa fa-link') {
					WMEPH_aPerma = WMEPH_divPerma.children[i];
					break;
				}
			}
			//WMEPH_aPerma.style.display = 'none';
			if (wmephlinks !== null) {return WMEPH_aPerma.href;}
			var WMEPH_nodeWMEPH = document.createElement('div');
			WMEPH_nodeWMEPH.id = 'WMEPH-forumlink';
			WMEPH_nodeWMEPH.style.display = 'inline';
			WMEPH_divPerma.appendChild(WMEPH_nodeWMEPH);
			return WMEPH_aPerma.href;
		}  // END WMEPH_initialiseFL function
		
		function WMEPH_getElementsByClassName(classname, node) {  // Get element by class name
			if (!node) {node = document.getElementsByTagName("body")[0];}
			var a = [];
			var re = new RegExp('\\b' + classname + '\\b');
			var els = node.getElementsByTagName("*");
			for (var i = 0, j = els.length; i < j; i++) {
				if (re.test(els[i].className)) { a.push(els[i]); }
			}
			return a;
		}  // END WMEPH_getElementsByClassName function
		
		function WMEPH_getId(node) {  //  getID function
			return document.getElementById(node);
		}
		
		// Make a populated post on a forum thread
		function WMEPH_openPostDataInNewTab(url, data) {
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
			WMEPH_getId('WMEPH-forumlink').appendChild(form);
			form.submit();
			WMEPH_getId('WMEPH-forumlink').removeChild(form);
			return true;
		}  // END WMEPH_openPostDataInNewTab function

		// Function that checks current place against the Harmonization Data.  Returns place data or "NoMatch"		
		function harmoList(itemName,state2L,region3L,country,itemCats) {
			var PNH_DATA_headers;
			var ixendPNH_NAMES;
			if (country === 'USA') {
				PNH_DATA_headers = USA_PNH_DATA[0].split("|");  // pull the data header names
				ixendPNH_NAMES = USA_PNH_NAMES.length;
			} else if (country === 'CAN') {
				PNH_DATA_headers = CAN_PNH_DATA[0].split("|");  // pull the data header names
				ixendPNH_NAMES = CAN_PNH_NAMES.length;
			} else {
					alert("No PNH data exists for this country.");
					return;
			}
			var ph_name_ix = PNH_DATA_headers.indexOf("ph_name");
			var ph_category1_ix = PNH_DATA_headers.indexOf("ph_category1");
			var ph_forcecat_ix = PNH_DATA_headers.indexOf("ph_forcecat");  // Force the category match
			var ph_region_ix = PNH_DATA_headers.indexOf("ph_region");  // Find the index for regions
			var ph_order_ix = PNH_DATA_headers.indexOf("ph_order");
			var nameComps;  // filled with search names to compare against place name
			var PNHPriCat;  // Primary category of PNH data
			var PNHForceCat;  // Primary category of PNH data
			var approvedRegions;  // filled with the regions that are approved for the place, when match is found
			var matchPNHData = [];  // array of matched data
			var currMatchData;
			var currMatchNum = 0;  // index for multiple matches, currently returns on first match
			var PNHOrderNum;
			var PNHNameTemp;
			var PNHNameMatch = false;  // tracks match status
			var PNHMatchProceed;  // tracks match status
			itemName = itemName.toUpperCase();  // UpperCase the current place name (The Holly And Ivy Pub #23 --> THE HOLLY AND IVY PUB #23 )
			itemName = itemName.replace(/ AND /g, '');  // Clear the word " AND " from the name (THE HOLLY AND IVY PUB #23 --> THE HOLLYIVY PUB #23 )
			itemName = itemName.replace(/^THE /g, '');  // Clear the word "THE " from the start of the name ( THE HOLLYIVY PUB #23 -- > HOLLYIVY PUB #23 )
			itemName = itemName.replace(/[^A-Z0-9]/g, '');  // Clear all non-letter and non-number characters ( HOLLYIVY PUB #23 -- > HOLLYIVYPUB23 )
			var itemNameNoNum = itemName.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB ) 
			
			// Search performance stats
			var t0; var t1;
			if (devUser) {
				t0 = performance.now();  // Speed check start
			}
			
			// for each place on the PNH list (skipping headers at index 0)
			// phlogdev(ixendPNH_NAMES);
			for (var phnum=1; phnum<ixendPNH_NAMES; phnum++) { 
				PNHMatchProceed = false; 
				if (country === 'USA') {
					nameComps = USA_PNH_NAMES[phnum].split("|");  // splits all possible search names for the current PNH entry
				} else if (country === 'CAN') {
					nameComps = CAN_PNH_NAMES[phnum].split("|");  // splits all possible search names for the current PNH entry
				}
				
				if ( nameComps.indexOf(itemName) > -1 || nameComps.indexOf(itemNameNoNum) > -1 ) {  // Compare WME place name to PNH search name list
					if (country === 'USA') {
						matchPNHData[currMatchNum] = USA_PNH_DATA[phnum];  // Pull the data line from the PNH data table.  (**Set in array for future multimatch features)
					} else if (country === 'CAN') {
						matchPNHData[currMatchNum] = CAN_PNH_DATA[phnum];  // Pull the data line from the PNH data table.  (**Set in array for future multimatch features)
					}
					currMatchData = matchPNHData[currMatchNum].split("|");  // Split the PNH place data into string array
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
						
						PNHNameMatch = true;  // PNH match found (once true, stays true)
						PNHNameTemp = currMatchData[ph_name_ix];  // temp name for approval return
						PNHOrderNum = currMatchData[ph_order_ix];  // temp order number for approval return
						
						approvedRegions = currMatchData[ph_region_ix].replace(/ /g, '');  // remove spaces from region field
						approvedRegions = approvedRegions.toUpperCase().split(",");  // upper case the approved regions and split by commas
						if (approvedRegions.indexOf(state2L) > -1 || approvedRegions.indexOf(region3L) > -1 ||  // if the WME-selected item matches the region
						approvedRegions.indexOf(country) > -1 ||  //  OR if the country code is in the data then it is approved for all regions therein 
						$("#WMEPH-RegionOverride" + devVersStr).prop('checked')) {  // OR if region override is selected
							if (devUser) {
								t1 = performance.now();  // log search time
								phlogdev("Found place in " + (t1 - t0) + " milliseconds.");
							}
							bannMess.placeMatched.active = true;
							return currMatchData;  // Return the PNH data string array to the main script
						}
						currMatchNum++;  // *** Multiple matches for future work
					}
				} 
			}  // END loop through PNH places
			
			// If NO (name & region) match was found:
			if (PNHNameMatch) {  // if a name match was found but not for region, prod the user to get it approved
				bannButt.ApprovalSubmit.active = true;
				phlogdev("PNH data exists but not approved for this area.");	
				if (devUser) {
					t1 = performance.now();  // log search time
					phlogdev("Searched all PNH entries in " + (t1 - t0) + " milliseconds.");
				}
				return ["ApprovalNeeded", PNHNameTemp, PNHOrderNum];
			} else {  // if no match was found, suggest adding the place to the sheet if it's a chain
				bannButt.NewPlaceSubmit.active = true;
				phlogdev("Place not found in the " + country + " PNH list.");	
				if (devUser) {
					t1 = performance.now();  // log search time
					phlogdev("Searched all PNH entries in " + (t1 - t0) + " milliseconds.");
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
					if (opt['disable_in_input']) { //Don't enable shortcut keys in Input, Textarea fields
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
					var k;
					for (var i = 0; k = keys[i], i < keys.length; i++) {
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
						} else if (opt['keycode']) {
							if (opt['keycode'] === code) {kp++;}
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
						if (!opt['propagate']) { //Stop the event
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
				this.all_shortcuts[shortcut_combination] = { 'callback': func, 'target': ele, 'event': opt['type'] };
				//Attach the function with the event
				if (ele.addEventListener) {ele.addEventListener(opt['type'], func, false);}
				else if (ele.attachEvent) {ele.attachEvent('on' + opt['type'], func);}
				else {ele['on' + opt['type']] = func;}
			},
			//Remove the shortcut - just specify the shortcut and I will remove the binding
			'remove': function(shortcut_combination) {
				shortcut_combination = shortcut_combination.toLowerCase();
				var binding = this.all_shortcuts[shortcut_combination];
				delete(this.all_shortcuts[shortcut_combination]);
				if (!binding) {return;}
				var type = binding['event'];
				var ele = binding['target'];
				var callback = binding['callback'];
				if (ele.detachEvent) {ele.detachEvent('on' + type, callback);}
				else if (ele.removeEventListener) {ele.removeEventListener(type, callback, false);}
				else {ele['on' + type] = false;}
			}
		};  // END Shortcut function
		
		function phlogdev(m) {
			if (devUser) {
				console.log('WMEPH' + devVersStrDash + ': ' + m);
			}
		}
	
	} // END runPH Function
		
	
	// This function runs at script load, and splits the category dataset into the searchable categories.
	function makeCatCheckList(CH_DATA) {  // Builds the list of search names to match to the WME place name
		var CH_CATS = [];
		var CH_DATA_headers = CH_DATA[0].split("|");  // split the data headers out
		var pc_wmecat_ix = CH_DATA_headers.indexOf("pc_wmecat");  // find the indices needed for the function
		var chEntryTemp;
		for (var chix=0; chix<CH_DATA.length; chix++) {  // loop through all PNH places
			chEntryTemp = CH_DATA[chix].split("|");  // split the current PNH data line 
			CH_CATS.push(chEntryTemp[pc_wmecat_ix]);
		}
		return CH_CATS;
	} // END makeCatCheckList function
	
	// This function runs at script load, and builds the search name dataset to compare the WME selected place name to.
	function makeNameCheckList(PNH_DATA) {  // Builds the list of search names to match to the WME place name
		var PNH_NAMES = [];
		var PNH_DATA_headers = PNH_DATA[0].split("|");  // split the data headers out
		var ph_name_ix = PNH_DATA_headers.indexOf("ph_name");  // find the indices needed for the function
		var ph_category1_ix = PNH_DATA_headers.indexOf("ph_category1");
		var ph_searchnamebase_ix = PNH_DATA_headers.indexOf("ph_searchnamebase");
		var ph_searchnamemid_ix = PNH_DATA_headers.indexOf("ph_searchnamemid");
		var ph_searchnameend_ix = PNH_DATA_headers.indexOf("ph_searchnameend");
		var ph_disable_ix = PNH_DATA_headers.indexOf("ph_disable");
		
		var t0 = performance.now(); // Speed check start
		var newNameListLength;  // static list length
		
		for (var pnhix=0; pnhix<PNH_DATA.length; pnhix++) {  // loop through all PNH places
			var pnhEntryTemp = PNH_DATA[pnhix].split("|");  // split the current PNH data line 
			if (pnhEntryTemp[ph_disable_ix] !== "1") {
				var newNameList = pnhEntryTemp[ph_name_ix].toUpperCase();  // pull out the primary PNH name & upper case it
				newNameList = newNameList.replace(/ AND /g, '');  // Clear the word "AND" from the name
				newNameList = newNameList.replace(/^THE /g, '');  // Clear the word "THE" from the start of the name
				newNameList = [newNameList.replace(/[^A-Z0-9]/g, '')];  // Clear non-letter and non-number characters, store in array
				
				// The following code sets up alternate search names as outlined in the PNH dataset.  
				// Formula, with P = primary; B1, B2 = base terms; M1, M2 = mid terms; E1, E2 = end terms
				// Search list will build: P, B, PM, BM, PE, BE, PME, BME.  
				// Multiple M terms are applied singly and in pairs (B1M2M1E2).  Multiple B and E terms are applied singly (e.g B1B2M1 not used).
				// Any doubles like B1E2=P are purged at the end to reduce search times.
				if (pnhEntryTemp[ph_searchnamebase_ix] !== "0") {   // If base terms exist, otherwise only the primary name is matched
					var pnhSearchNameBase = pnhEntryTemp[ph_searchnamebase_ix].replace(/[^A-Za-z0-9,]/g, '');  // clear non-letter and non-number characters (keep commas)
					pnhSearchNameBase = pnhSearchNameBase.toUpperCase().split(",");  // upper case and split the base-name  list
					newNameList.push.apply(newNameList,pnhSearchNameBase);   // add them to the search list
					
					if (pnhEntryTemp[ph_searchnamemid_ix] !== "0") {  // if middle search term add-ons exist
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
					
					if (pnhEntryTemp[ph_searchnameend_ix] !== "0") {  // if end search term add-ons exist
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
				newNameList = uniq(newNameList);  // remove any duplicate search names
				newNameList = newNameList.join("|");  // join the list with |
				newNameList = newNameList.replace(/\|{2,}/g, '|');
				PNH_NAMES.push(newNameList);  // push the list to the master search list
			} else { // END if valid line
				PNH_NAMES.push('00');
			}
		}
		var t1 = performance.now();  // log search time
		phlog("Built search list of " + PNH_DATA.length + " PNH places in " + (t1 - t0) + " milliseconds.");
		phlog(PNH_NAMES[10]);
		return PNH_NAMES;
	}  // END makeNameCheckList
	
	// Whitelist stringifying and parsing
	function saveWL_LS() {
		venueWhitelistStr = JSON.stringify(venueWhitelist);
		localStorage.setItem(WLlocalStoreName, venueWhitelistStr);
	}
	function loadWL_LS() {
		venueWhitelistStr = localStorage.getItem(WLlocalStoreName);
		venueWhitelist = JSON.parse(venueWhitelistStr);
	}
	
	// Removes duplicate strings from string array
	function uniq(a) {
		"use strict";
		var seen = {};
		return a.filter(function(item) {
			return seen.hasOwnProperty(item) ? false : (seen[item] = true);
		});
	}  // END uniq function
	
	function phlog(m) {
        console.log('WMEPH' + devVersStrDash + ': ' + m);
    }
	
	placeHarmonizer_bootstrap();
})();
// var DLscript = document.createElement("script");
// DLscript.textContent = runPH.toString() + ' \n' + 'runPH();';
// DLscript.setAttribute("type", "application/javascript");
// document.body.appendChild(DLscript);// JavaScript Document
