/* global I18n */
/* global OpenLayers */
/* global $ */
/* global W */
/* global unsafeWindow */
/* global Components */
// ==UserScript==
// @name		 Place Harmonizer
// @namespace 	 https://greasyfork.org/en/users/19426-bmtg
// @version	  1.0.00
// @description  Harmonizes, formats, and locks a selected place
// @author	   WMEPH development group
// @include			 https://www.waze.com/editor/*
// @include			 https://www.waze.com/*/editor/*
// @include			 https://editor-beta.waze.com/editor/*
// @include			 https://editor-beta.waze.com/*/editor/*
// @grant	   none
// ==/UserScript==
(function () {
	function placeHarmonizer_bootstrap() {
		var bGreasemonkeyServiceDefined	 = false;
	
		try {
			if ("object" === typeof Components.interfaces.gmIGreasemonkeyService) {
				bGreasemonkeyServiceDefined = true;
			}
		}
		catch (err)
		{
			//Ignore.
		}
		if ( "undefined" === typeof unsafeWindow  ||  ! bGreasemonkeyServiceDefined) {
			unsafeWindow = ( function () {
				var dummyElem = document.createElement('p');
				dummyElem.setAttribute ('onclick', 'return window;');
				return dummyElem.onclick ();
			} ) ();
		}
		/* begin running the code! */
		if (("undefined" !== typeof W.loginManager)) {
			setTimeout(runPH, 900);
			setTimeout(makeNameCheckList, 400);
		} else {
			console.log("WMEPH: Bootstrap failed.  Trying again...");
			setTimeout(function () {
				placeHarmonizer_bootstrap();
			}, 1000);
		}
	}
	
	function runPH() {
		var WMEPHversion = "1.0.00";
		WMEPHurl = 'https://www.waze.com/forum/posting.php?mode=reply&f=819&t=164962';
		var isDevVersion = true;
		// user name and rank
		var thisUser = W.loginManager.user;
		if (thisUser === null) {
			console.log("WMEPH: Could not determine user.");
			return;
		}
		var WMEPHdevList = "bmtg|vtpearce|cardyin|jtsmith2|joyriding|fjsawicki|coolcanuck".split("|");  
		var WMEPHbetaList = "jwe252|uscwaller|t0cableguy|tonestertm|driving79".split("|");
		var devUser = (WMEPHdevList.indexOf(thisUser.userName) > -1);
		var betaUser = (WMEPHbetaList.indexOf(thisUser.userName) > -1);
		if (devUser) {betaUser = true;}  // dev users are beta users
		var usrRank = thisUser.normalizedLevel;  // get user's level
		// lock levels are offset by one
		var lockLevel2 = 1;
		var lockLevel3 = 2;
		var lockLevel4 = 3;
		var lockLevel5 = 4;
		// Only lock up to the user's level
		if (lockLevel2 > (usrRank - 1)) {lockLevel2 = (usrRank - 1);}
		if (lockLevel3 > (usrRank - 1)) {lockLevel3 = (usrRank - 1);}
		if (lockLevel4 > (usrRank - 1)) {lockLevel4 = (usrRank - 1);}
		if (lockLevel5 > (usrRank - 1)) {lockLevel5 = (usrRank - 1);}
			
		var devVersStr;
		var devVersStrSpace;
		var sidebarMessage = [];  // message array
		var severity = 0;  // track any errors to determine banner color
		var NH_Bann;  // Banner Buttons object
		
		if (isDevVersion) {
			// debugger;
		}
		
		// WME Category translation from Natural language to code
		function catTranslate(natCategories) {
			var catTransWaze2Lang = I18n.translations['en'].venues.categories;
			for(var keyCat in catTransWaze2Lang){
				if ( natCategories.toUpperCase().replace(/ AND /g, "").replace(/[^A-Z]/g, "") ===  catTransWaze2Lang[keyCat].toUpperCase().replace(/ AND /g, "").replace(/[^A-Z]/g, "")) {
					return keyCat;
				}
			}
			if (confirm('WMEPH: Category Error!\nClick OK to report this error') ) {
				inputs = {
					subject: 'Re: WMEPH Bug report',
					message: 'Error report: category "' + natCategories + '" is not translatable.',
					addbbcode20: '100',
					preview: 'Preview',
					attach_sig: 'on',
					notify: 'on'
				}
				WMEPH_openPostDataInNewTab(WMEPHurl + '#preview', inputs);
			}
			return "ERROR";
		}  // END catTranslate function
		
		// Old function, will eventually be removed if not needed.
		function alertMessage(messageNum) {
			return alertList[messageNum];
		}
		// alert list, may eventually be removed.
		var alertList = ["If this is a bank branch, please add the Bank category and run script again.  If this is a standalone ATM, please add ATM after the name, add the ATM category, and run the script again.  If it is the bank's corporate offices, please add 'Corporate Offices' after the name, use the Offices category, and run again.",
			"If this is a bank branch, please remove ATM from the bank name, add the Bank category if needed, and run the script again.  If this is a standalone ATM, please add the ATM category and run the script again."
		];
	
		// initialize the KB shortcut and settings tab
		setTimeout(setupKBShort, 100);  // set up KB Shortcut 
		setTimeout(add_PlaceHarmonizationSettingsTab, 150);  // set up settings tab
		
		// prime the shortcut
		function setupKBShort() {
			console.log("WMEPH: Initializing");
			if (isDevVersion) {
				shortcut.add("Shift+Alt+s", function() {
					harmonizePlace();
				});
			} else {
				shortcut.add("Shift+Alt+a", function() {
					harmonizePlace();
				});
			}
		}
		
		// function that checks if any element of target is in source
		function containsAny(source,target) {
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
			if (isDevVersion) {
				devVersStr = "Dev";
				devVersStrSpace = " " + devVersStr;
			}
			else {
				devVersStr = "";
				devVersStrSpace = "";
			}
			// ' + devVersStr + '
			var phTabHtml = '<li><a href="#sidepanel-ph' + devVersStr + '" data-toggle="tab" id="PlaceHarmonization' + devVersStr + '">WMEPH' + devVersStrSpace + '</a></li>';
			$("#user-tabs ul.nav-tabs:first").append(phTabHtml);
		
			//Create Settings Tab Content
			var phContentHtml = '<div class="tab-pane" id="sidepanel-ph' + devVersStr + '"><div id="PlaceHarmonizer' + devVersStr + '"><p>WMEPH' + devVersStrSpace + ' v. ' + WMEPHversion + '</p><hr align="center" width="90%"><p>Settings:</p></div></div>';
			$("#user-info div.tab-content:first").append(phContentHtml);
			
			//Create Settings Checkboxes and Load Data
			//example condition:  $("#WMEPH-RegionOverride" + devVersStr).prop('checked')
			if (devUser || betaUser || usrRank > 2) {
				createSettingsCheckbox("WMEPH-EnableServices" + devVersStr,"Enable automatic addition of common services");
			}
			if (devUser || betaUser || usrRank > 2) {
				createSettingsCheckbox("WMEPH-ConvenienceStoreToGasStations" + devVersStr,"Add Convenience Store category to gas stations");
			}
			if (devUser || betaUser || usrRank > 2) {
				createSettingsCheckbox("WMEPH-GasStationBrandAutoReplace" + devVersStr,"If Gas Station Name and Brand don't match, move the Name to Alt, and the Brand to Name");
			}
			if (devUser || betaUser || usrRank > 2) {
				createSettingsCheckbox("WMEPH-StripWWW" + devVersStr,"Strip 'www.' from all URLs");
			}
			
			// createSettingsCheckbox("WMEPH-PreserveLongURLs" + devVersStr,"Preserve long URLs for harmonized places");
			
			if (devUser) {  // Override script regionality (devs only)
				createSettingsCheckbox("WMEPH-RegionOverride" + devVersStr,"Disable Region Specificity");
			}
			
			var phContentHtml2 = '<div class="tab-pane" id="sidepanel-ph' + devVersStr + '"><div id="PlaceHarmonizer' + devVersStr + '"><hr align="center" width="90%"><p><a href="https://www.waze.com/forum/viewtopic.php?f=819&t=164962" target="_blank" title="Submit feedback and suggestions">Submit feedback and suggestions</a></p></div></div>';
			$("#PlaceHarmonizer" + devVersStr).append(phContentHtml2);
			// $("#user-info div.tab-content:first").append(phContentHtml2);
			
		}
	
		// -----------------------------------------------------------------------------------------------
		// createSettingCheckbox
		// -----------------------------------------------------------------------------------------------
		// This routine will create a checkbox in the #PlaceHarmonizer tab and will load the setting
		//		settingID:  The #id of the checkbox being created.  
		//						This will be used later to refer to the checkbox in code.
		//  textDescription:  The description of the checkbox that will be use
		// -----------------------------------------------------------------------------------
		function createSettingsCheckbox(settingID, textDescription) {
			//Create settings checkbox and append HTML to settings tab
			var phTempHTML = '<input type="checkbox" id="' + settingID + '">'+ textDescription +'</input><br>';
			$("#PlaceHarmonizer" + devVersStr).append(phTempHTML);
			console.log(settingID + 'checkbox created');
			
			//Associate click event of new checkbox to call saveSettingToLocalStorage with proper ID
			$("#" + settingID).click(function() {saveSettingToLocalStorage(settingID);});
			console.log('Callback Set');
			
			//Load Setting for Local Storage, if it doesn't exist set it to NOT checked.
			//If previously set to 1, then trigger "click" event.
			if (!localStorage.getItem(settingID))
			{
				console.log(settingID + ' not found.');
			} else if(localStorage.getItem(settingID) === "1") {
				console.log(settingID + ' = 1 so invoking click');
				$("#" + settingID).trigger('click');
			}
			console.log('Setting Checked');
		}
	
		// Save settings prefs
		function saveSettingToLocalStorage(settingID) {
			if ($("#" + settingID).prop('checked')) {
				console.log(settingID + ' to 1');
				localStorage.setItem(settingID, '1');
			} else {
				console.log(settingID + ' to 0');
				localStorage.setItem(settingID, '0');
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
			if (wmephlinks !== null) {return WMEPH_aPerma.href;}
			var mapFooter = WMEPH_getElementsByClassName("WazeControlPermalink");
			if (mapFooter.length === 0) {
				WMEPH_log("WMEPH: error, can't find permalink container");
				setTimeout(WMEPH_initialiseFL, 1000);
				return;
			}
			WMEPH_divPerma = mapFooter[0];
			WMEPH_aPerma = null;
			for (var i = 0; i < WMEPH_divPerma.children.length; i++) {
				if (WMEPH_divPerma.children[i].className === 'icon-link') {
					WMEPH_aPerma = WMEPH_divPerma.children[i];
					break;
				}
			}
			//WMEPH_aPerma.style.display = 'none';
			WMEPH_nodeWMEPH = document.createElement('div');
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
		
		// used for phone reformatting
		if (!String.plFormat) {
			String.plFormat = function(format) {
				var args = Array.prototype.slice.call(arguments, 1);
				return format.replace(/{(\d+)}/g, function(name, number) {
					return typeof args[number] !== "undefined" ? args[number] : null;
				});
			};
		}
		
		// Banner production
		function WMEPH_DispWarn(e, t, o) {
			"use strict";
			// var numWords = e.split(' ').length;
			var r;
			if ("undefined" === typeof o) {
				r = 3e7;  // Don't remove the banner
			// OLD: If no duration is specified, use 30 seconds + 3 seconds per word (disabled)
			//	r = 3e4 + numWords * 3000;
			} else {r = o;}
			t !== !0 && (e = "<li>" + e);
			var n = $('<div id="WMEPHlog">').append(e);
			$("#WMEPH_logger_warn").append(n), n.delay(r).slideUp({
				duration: 200,
				complete: function() {
					n.remove();
				}
			})
		}  // END WMEPH_DispWarn function
	
		// Change place.name to title case
		var ignoreWords = ["an", "and", "as", "at", "by", "for", "from", "hhgregg", "in", "into", "of", "on", "or", "the", "to", "with"];
		var capWords = ["3M", "AMC", "AOL", "AT&T", "ATM", "BBC", "BLT", "BMV", "BMW", "BP", "CBS", "CCS", "CGI", "CISCO", "CNN", "CVS", "DHL", "DKNY",
			"DMV", "DSW", "ER", "ESPN", "FCUK", "GNC", "H&M", "HP", "HSBC", "IBM", "IKEA", "IRS", "JBL", "JCPenney", "KFC", "LLC", "MBNA", "MCA", "MCI",
			"NBC", "PNC", "TCBY", "TNT", "UPS", "USA", "USPS", "VW", "ZZZ"
		];
		function toTitleCase(str) {
			if (!str) {
				return str;
			}
			var allCaps = (str === str.toUpperCase());
			// Cap first letter of each word
			str = str.replace(/\b([^\W_\d][^\s-\/]*) */g, function(txt) {
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
			// anything with an "&" sign, cap the word after &
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
	
		// Change place.name to title case
		function toTitleCaseStrong(str) {
			if (!str) {
				return str;
			}
			var allCaps = (str === str.toUpperCase());
			// Cap first letter of each word
			str = str.replace(/\b([^\W_\d][^\s-\/]*) */g, function(txt) {
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
				sidebarMessage.push("Phone is missing.");
				severity = Math.max(1, severity);
				return s;
			}
			var s1 = s.replace(/\D/g, '');  // remove non-number characters
			var m = s1.match(/^1?([2-9]\d{2})([2-9]\d{2})(\d{4})$/);  // Ignore leading 1, and also don't allow area code or exchange to start with 0 or 1 (***USA/CAN specific)
			if (!m) {
				sidebarMessage.push("Phone is invalid.");
				severity = Math.max(2, severity);
				return s;
			} else {
				return String.plFormat(outputFormat, m[1], m[2], m[3]);
			}
		}
		
		// Build a Google search url based on place name and address
		function buildGLink(searchName,addr) {
			var searchStreet = "";
			var searchCity = "";
			
			searchName = searchName.replace(/&/g, function(txt) {  // Replace '&' sign in search name to prevent google search error
				return "%26";
			});
			searchName = searchName.replace(/[ \/]/g, function(txt) {  // Replace spaces and slashes in search name
				return "%20";
			});
			
			if ("string" === typeof addr.street.name) {
				searchStreet = addr.street.name;
			}
			searchStreet = searchStreet.replace(/ /g, function(txt) {  // Replace spaces in search term 
				return "%20";
			});
			
			if ("string" === typeof addr.city.name) {
				searchCity = addr.city.name;
			}
			searchCity = searchCity.replace(/ /g, function(txt) {  // Replace spaces in search term 
				return "%20";
			});
			return "http://www.google.com/search?q=" + searchName + ",%20" + searchStreet + ",%20" + searchCity + ",%20" + addr.state.name;
		} // END buildGLink function
		
		// Normalize url
		function normalizeURL(placeName,s,addr,gLink) {
			var searchG4S = buildGLink(placeName,addr);  // get a url to search Google for the place
			if (!s) {  // Notify that url is missing and provide web search to find website and gather data (provided for all editors)
				sidebarMessage.push('URL missing. (<a href="' + searchG4S + '" target="_blank" style="color: #FFF" title="Do not copy and paste from Google info">Web search</a>)');
				severity = Math.max(1, severity);
				return s;
			}
			s = s.replace(/ /g, '');  // remove any spaces
			
			var m = s.match(/^https?:\/\/(.*)$/i);  // remove http(s):// 
			if (m) { s = m[1]; } 
			
			if ($("#WMEPH-StripWWW" + devVersStr).prop('checked')) {  // if option is checked, remove 'www.' from the url
				m = s.match(/^www\.(.*)$/i);
				if (m) { s = m[1]; } 
			}
			m = s.match(/^(.*)\/$/i);  // remove final slash
			if (m) { s = m[1]; }
			 
			if (gLink) {  // post a link to do a web search based on name and address
				sidebarMessage.push('<a href="' + searchG4S + '" target="_blank" style="color: #FFF" title="Do not copy and paste from Google info">Web search</a>');
			}
			return s;
		}  // END normalizeURL function
	
		// Only run the harmonization if a venue is selected
		function harmonizePlace() {
			// Script is only for R2+ editors
			if (usrRank < 2) {
				alert("Script is currently available for editors of Rank 2 and up.");
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
			console.log(placePL);
		
			sidebarMessage = [];  // default message
			var gLink = false;  // provide Google search link to places
			if (devUser || betaUser || usrRank > 2) {  // enable the link for all places, for R4+ and betas
				gLink = true;
			}
			
			NH_Bann = {  // set up banner action buttons.  Structure:
//				active: false until activated in the script 
//				bannText: The text before the button option
//				id: button id
//				value: button text
//				cLog: message for console
//				action: The action that happens if the button is pressed
				
				STC: {  // Force strong title case option
					active: false,  // Activated if Strong Title Case != Normal Title Case (e.g. HomeSpace Company)
					bannText: "Force Title Case: ", 
					id: "toTitleCaseStrong",  
					value: "Yes", 
					cLog: "WMEPH: Applied Strong Title Case",  
					action: function(item) {
						newName = toTitleCaseStrong(item.attributes.name);  // Get the Strong Title Case name
						if (newName !== item.attributes.name) {  // if they are not equal
							W.model.actionManager.add(new UpdateObject(item, {  //  update the place name
								name: newName
							}));
							console.log(NH_Bann.STC.cLog);  
							NH_Bann.STC.active = false;  // reset the display flag
						}
					}
				},  // END Strong Title Case definition
				ATM: {
					active: false,
					bannText: "ATM at location? ",
					id: "addATMCat",
					value: "Yes",
					cLog: "WMEPH: Added ATM category",
					action: function() {
						newCategories = insertAtIX(categories,"ATM",1);  // Insert ATM category in the second position
						W.model.actionManager.add(new UpdateObject(item, {  //  update the place name
							categories: newCategories
						}));
						NH_Bann.ATM.active = false;   // reset the display flag
					}
				},  // END ATM definition
				USPS: {
					active: false,
					bannText: "Is this a USPS location? ",
					id: "USPSCat",
					value: "Yes",
					cLog: "WMEPH: Fixed USPS",
					action: function(item) {
						newServices = ["AIR_CONDITIONING", "CREDIT_CARDS", "PARKING_FOR_CUSTOMERS", "WHEELCHAIR_ACCESSIBLE"];
						W.model.actionManager.add(new UpdateObject(item, {
							url: "usps.com",
							aliases: ["United States Postal Service"],
							// services: newServices.push
						}));
						NH_Bann.USPS.active = false;
					}
				},  // END USPS definition
				PlaceErrorForumPost: {
					active: true,
					bannText: "",
					id: "PlaceErrorForumPost",
					value: "Report a script error",
					cLog: "WMEPH: Post initiated",
					action: function(item) {
						inputs = {
							subject: 'Re: WMEPH Bug report',
							message: 'Permalink: ' + placePL + '\nPlace name: ' + item.attributes.name + '\nCountry: ' + addr.country.name + '\nDescribe the error:\n ',
							addbbcode20: '100',
							preview: 'Preview',
							attach_sig: 'on',
							notify: 'on'
						};
						WMEPH_openPostDataInNewTab(WMEPHurl + '#preview', inputs);
					}
				}  // END USPS definition
			};  // END NH_Bann definitions
			
			// Only can select one place at a time in WME, so the loop is superfluous (eg, ix=0 will work), but perhaps we leave it in case we add some sort of looping process like URs.
			for (var ix = 0; ix < W.selectionManager.selectedItems.length; ix++) {
				
				var item = W.selectionManager.selectedItems[ix].model;
				
				// get GPS lat/long coords from place
				var itemGPS = OpenLayers.Layer.SphericalMercator.inverseMercator(item.attributes.geometry.bounds.right,item.attributes.geometry.bounds.top);
				console.log("WMPEH: Place GPS coords: "+itemGPS);
				
				var lockOK = true;  // if nothing goes wrong, then place will be locked
				var customStoreFinder = false;  // switch indicating place-specific custom store finder url
				var customStoreFinderLocal = false;  // switch indicating place-specific custom store finder url with localization option (GPS/addr)
				var categories = item.attributes.categories;
				var newCategories = categories.slice(0);
				var newName = item.attributes.name;
				var nameShort = newName.replace(/[^A-Za-z]/g, '');  // strip non-letters for PNH name searching
				var nameNumShort = newName.replace(/[^A-Za-z0-9]/g, ''); // strip non-letters/non-numbers for PNH name searching
				var newAliases = item.attributes.aliases.slice(0);
				var newDescripion = item.attributes.description;
				var newURL = item.attributes.url;
				var newPhone = item.attributes.phone;
				var newServices = item.attributes.services.slice(0);
				var addServices = [];
				
				var addr = item.getAddress();
				// Some user submitted places have no data in the country, state and address fields.  Need to have that to make the localization work.
				if (!addr.state || !addr.country) {
					alert("Place has no address data.  Localization rules require a country and/or state.  Set the address and rerun the script.");
					return;  //  don't run the script
				}
				// Country restrictions
				var countryCode;
				if (addr.country.name === "United States") {
					countryCode = "USA";
				} else if (addr.country.name === "Canada") {
					countryCode = "CAN";
					alert("At present this script is not supported in Canada.  Coming soon.");
					return;
				} else {
					alert("At present this script is not supported in this country.");
					return;
				}
				
				var region; var state2L;
				if (countryCode === "USA") {
					// Setup USA State and Regional vars
					switch (addr.state.name) {
						case "Arkansas": state2L = "AR"; region = "SCR"; break;
						case "Louisiana": state2L = "LA"; region = "SCR"; break;
						case "Mississippi": state2L = "MS"; region = "SCR"; break;
						case "Oklahoma": state2L = "OK"; region = "SCR"; break;
						case "Alaska": state2L = "AK"; region = "NWR"; break;
						case "Idaho": state2L = "ID"; region = "NWR"; break;
						case "Montana": state2L = "MT"; region = "NWR"; break;
						case "Oregon": state2L = "OR"; region = "NWR"; break;
						case "Washington": state2L = "WA"; region = "NWR"; break;
						case "Wyoming": state2L = "WY"; region = "NWR"; break;
						case "Hawaii": state2L = "HI"; region = "HI"; break;
						case "Arizona": state2L = "AZ"; region = "SWR"; break;
						case "California": state2L = "CA"; region = "SWR"; break;
						case "Colorado": state2L = "CO"; region = "SWR"; break;
						case "Nevada": state2L = "NV"; region = "SWR"; break;
						case "New Mexico": state2L = "NM"; region = "SWR"; break;
						case "Utah": state2L = "UT"; region = "SWR"; break;
						case "Iowa": state2L = "IA"; region = "PLN"; break;
						case "Kansas": state2L = "KS"; region = "PLN"; break;
						case "Minnesota": state2L = "MN"; region = "PLN"; break;
						case "Missouri": state2L = "MO"; region = "PLN"; break;
						case "Nebraska": state2L = "NE"; region = "PLN"; break;
						case "North Dakota": state2L = "ND"; region = "PLN"; break;
						case "South Dakota": state2L = "SD"; region = "PLN"; break;
						case "Texas": state2L = "TX"; region = "TX"; break;
						case "Illinois": state2L = "IL"; region = "GLR"; break;
						case "Indiana": state2L = "IN"; region = "GLR"; break;
						case "Michigan": state2L = "MI"; region = "GLR"; break;
						case "Ohio": state2L = "OH"; region = "GLR"; break;
						case "Wisconsin": state2L = "WI"; region = "GLR"; break;
						case "Kentucky": state2L = "KY"; region = "SAT"; break;
						case "North Carolina": state2L = "NC"; region = "SAT"; break;
						case "South Carolina": state2L = "SC"; region = "SAT"; break;
						case "Tennessee": state2L = "TN"; region = "SAT"; break;
						case "Alabama": state2L = "AL"; region = "SER"; break;
						case "Florida": state2L = "FL"; region = "SER"; break;
						case "Georgia": state2L = "GA"; region = "SER"; break;
						case "Connecticut": state2L = "CT"; region = "NEW"; break;
						case "Maine": state2L = "ME"; region = "NEW"; break;
						case "Massachusetts": state2L = "MA"; region = "NEW"; break;
						case "New Hampshire": state2L = "NH"; region = "NEW"; break;
						case "Rhode Island": state2L = "RI"; region = "NEW"; break;
						case "Vermont": state2L = "VT"; region = "NEW"; break;
						case "Delaware": state2L = "DE"; region = "NOR"; break;
						case "New Jersey": state2L = "NJ"; region = "NOR"; break;
						case "New York": state2L = "NY"; region = "NOR"; break;
						case "Pennsylvania": state2L = "PA"; region = "NOR"; break;
						case "District of Columbia": state2L = "DC"; region = "MAR"; break;
						case "Maryland": state2L = "MD"; region = "MAR"; break;
						case "Virginia": state2L = "VA"; region = "MAR"; break;
						case "West Virginia": state2L = "WV"; region = "MAR"; break;
						default: state2L = "Unknown"; region = "Unknown";
					}
					console.log("WMEPH: Place is in region " + region);
				}
				
				if (countryCode === "CAN") {
					// Setup Canadian provinces
					switch (addr.state.name) {
						case "Ontario": state2L = "ON"; region = "CAN"; break;
						// *** add the rest of the Canadian provinces
						default: state2L = "Unknown"; region = "Unknown";
					}
					console.log("WMEPH: Place is in province: " + state2L);
				}
				
				// Clear attributes from residential places
				if (item.attributes.residential) {   
					newName = item.attributes.houseNumber + " " + addr.street.name;
					if (item.attributes.name !== newName) {  // Set the residential place name to the address (to clear any personal info)
						console.log("WMEPH: Residential Name reset");
						W.model.actionManager.add(new UpdateObject(item, {name: newName}));
					}
					newCategories = ["OTHER"];
					if (item.attributes.categories !== newCategories) {  // Set the residential place category to OTHER
						console.log("WMEPH: Residential Category reset");
						W.model.actionManager.add(new UpdateObject(item, {categories: newCategories}));
					}
					newDescripion = null;
					if (item.attributes.description !== null && item.attributes.description !== "") {  // remove any description
						console.log("WMEPH: Residential description cleared");
						W.model.actionManager.add(new UpdateObject(item, {description: newDescripion}));
					}
					newPhone = null;
					if (item.attributes.phone !== null && item.attributes.phone !== "") {  // remove any phone info
						console.log("WMEPH: Residential Phone cleared");
						W.model.actionManager.add(new UpdateObject(item, {phone: newPhone}));
					}
					newURL = null;
					if (item.attributes.url !== null && item.attributes.url !== "") {  // remove any url
						console.log("WMEPH: Residential URL cleared");
						W.model.actionManager.add(new UpdateObject(item, {url: newURL}));
					}
				}
				
				if (!item.attributes.residential) {  // for non-residential places
					// Place Harmonization 
					var PNHMatchData = harmoList(newName,state2L,region,countryCode);
					
					if (PNHMatchData !== "NoMatch") { // *** Replace place data with PNH data
						
						var USA_PNH_DATA_headers = USA_PNH_DATA[0].split("|");
						var ph_name_ix = USA_PNH_DATA_headers.indexOf("ph_name");
						var ph_aliases_ix = USA_PNH_DATA_headers.indexOf("ph_aliases");
						var ph_category1_ix = USA_PNH_DATA_headers.indexOf("ph_category1");
						var ph_category2_ix = USA_PNH_DATA_headers.indexOf("ph_category2");
						var ph_description_ix = USA_PNH_DATA_headers.indexOf("ph_description");
						var ph_url_ix = USA_PNH_DATA_headers.indexOf("ph_url");
						var ph_order_ix = USA_PNH_DATA_headers.indexOf("ph_order");
						var ph_notes_ix = USA_PNH_DATA_headers.indexOf("ph_notes");
						var ph_speccase_ix = USA_PNH_DATA_headers.indexOf("ph_speccase");
						var ph_sfurl_ix = USA_PNH_DATA_headers.indexOf("ph_sfurl");
						var ph_sfurllocal_ix = USA_PNH_DATA_headers.indexOf("ph_sfurllocal");
						
						//populate the variables from PNH data
						newName = PNHMatchData[ph_name_ix];
						newAliases = PNHMatchData[ph_aliases_ix];
						newCategories = [PNHMatchData[ph_category1_ix]];
						var altCategories = PNHMatchData[ph_category2_ix];
						newDescripion = PNHMatchData[ph_description_ix];
						newURL = PNHMatchData[ph_url_ix];
						
						// Add secondary categories from PNH data
						if (altCategories !== "0" && altCategories !== "") {
							altCategories = altCategories.replace(/,[^A-za-z0-9]+/g, ",");  // tighten up commas if more than one secondary category.
							altCategories = altCategories.split(",");  // split by comma
							newCategories.push.apply(newCategories,altCategories);
						}
						
						// *** need to add a section here to allow other permissible categories to remain
						
						// Translate the natural language categories to the WME categories
						for (var catix = 0; catix<newCategories.length; catix++) {
							 newCatTemp = catTranslate(newCategories[catix]);
							 if (newCatTemp === "ERROR") {
								 console.log('WMEPH: category ' + newCategories[catix] + 'cannot be translated.');
								 return;
							 } else {
							 	newCategories[catix] = newCatTemp;
							 }
						}
						
						if (newAliases !== "0" && newAliases !== "") {  // make aliases array
							newAliases = newAliases.replace(/,[^A-za-z0-9]+/g, ",");  // tighten up commas if more than one alias.
							newAliases = newAliases.split(",");  // split by comma
						}
						
						if (PNHMatchData[ph_speccase_ix] === "0") {
							if (newName !== item.attributes.name) {
								console.log("WMEPH: Name updated");
								W.model.actionManager.add(new UpdateObject(item, { name: newName }));
							}
							if (newAliases !== item.attributes.aliases && newAliases !== "0" && newAliases !== "") {
								console.log("WMEPH: Alt Names updated");
								W.model.actionManager.add(new UpdateObject(item, { aliases: newAliases }));
							}
							if (newCategories !== item.attributes.categories) {
								console.log("WMEPH: Categories updated");
								W.model.actionManager.add(new UpdateObject(item, { categories: newCategories }));
							}
							if (newDescripion !== item.attributes.description && newDescripion !== null && newDescripion !== "0") {
								console.log("WMEPH: Description updated");
								W.model.actionManager.add(new UpdateObject(item, { description: newDescripion }));
							}
							newURL = normalizeURL(newName,newURL,addr,gLink);
							if (newURL !== item.attributes.url) {
								console.log("WMEPH: URL updated");
								W.model.actionManager.add(new UpdateObject(item, { url: newURL }));
							}
							
							// *** Add storefinder URL codes
							
							
						} else {
							// Special Case functions
							
						}
						
						
					} else {  // if no match found
						sidebarMessage.push("Place is formatted.");  // default message for 
						newName = toTitleCase(newName);
						if (newName !== item.attributes.name) {
							console.log("WMEPH: Name updated");
							W.model.actionManager.add(new UpdateObject(item, { name: newName }));
						}
						if (newName !== toTitleCaseStrong(newName)) {
							NH_Bann.STC.active = true;
						}
						var newUrl = normalizeURL(newName,item.attributes.url,addr,gLink);
						if (newUrl !== item.attributes.url) {
							console.log("WMEPH: URL updated");
							W.model.actionManager.add(new UpdateObject(item, { url: newUrl }));
						}
					}
					
					
					
				}  // END if (not residential)
				
				
	
				
				// Category/Name-based Services, added to any existing services:
				if ( containsAny(categories,["BANK_FINANCIAL","ATM"]) ) {
					addServices = ["AIR_CONDITIONING", "PARKING_FOR_CUSTOMERS", "WHEELCHAIR_ACCESSIBLE"];
				}
				if ( containsAny(categories,["SHOPPING_CENTER","PARKING_LOT","GARAGE_AUTOMOTIVE_SHOP"]) ) {
					addServices = ["PARKING_FOR_CUSTOMERS", "WHEELCHAIR_ACCESSIBLE"];
				}
				if ( containsAny(categories,["HOSPITAL_MEDICAL_CARE","DEPARTMENT_STORE","RESTAURANT","CAFE","CAR_DEALERSHIP","FURNITURE_HOME_STORE","SPORTING_GOODS",
				"CAR_DEALERSHIP","BAR","GYM_FITNESS","CONVENIENCE_STORE","SUPERMARKET_GROCERY","PET_STORE_VETERINARIAN_SERVICES","TOY_STORE","PERSONAL_CARE"]) ) {
					addServices = ["RESTROOMS", "CREDIT_CARDS", "AIR_CONDITIONING", "PARKING_FOR_CUSTOMERS", "WHEELCHAIR_ACCESSIBLE"];
				}
				if ( containsAny(categories,["BOOKSTORE","FASHION_AND_CLOTHING","PERSONAL_CARE","BAKERY","HARDWARE_STORE","DESSERT","FAST_FOOD","PHARMACY","ELECTRONICS",
					"FLOWERS","MARKET","JEWELRY","MUSIC_STORE"]) ) {
					addServices = ["CREDIT_CARDS", "AIR_CONDITIONING", "PARKING_FOR_CUSTOMERS", "WHEELCHAIR_ACCESSIBLE"];
				}
				// Push the services onto the existing services array
				newServices = insertAtIX(newServices,addServices,12);
			
				// These categories get their services replaced
				if ( containsAny(newCategories,["COLLEGE_UNIVERSITY","SCHOOL","RELIGIOUS_CENTER","KINDERGARDEN"]) && (newCategories.indexOf("PARKING_LOT") === -1) ) {
					newServices = ["RESTROOMS", "AIR_CONDITIONING", "PARKING_FOR_CUSTOMERS", "WHEELCHAIR_ACCESSIBLE"];
				}
				
				
				// Place Area check
				if (item.isPoint() && containsAny(newCategories,["GAS_STATION","PARKING_LOT","AIRPORT","BRIDGE","CEMETERY","EMBASSY_CONSULATE","FIRE_DEPARTMENT",
					"POLICE_STATION","PRISON_CORRECTIONAL_FACILITY","SCHOOL","SHOPPING_CENTER","RACING_TRACK","THEME_PARK","GOLF_COURSE","PARK"]) ) {
					sidebarMessage = ["This category should be an area.  Please change it, or manually lock it."];
					severity = Math.max(3, severity);
					lockOK = false;
				}
				if (item.isPoint() && newCategories.indexOf("STADIUM_ARENA") > -1) {
					sidebarMessage = ["This category should be an area.  Please change it, manually lock it, or consider using the 'Sports Court' category and a place point for small/local ball fields and arenas."];
					severity = Math.max(3, severity);
					lockOK = false;
				}
				if (region === "SER" && item.isPoint() && newCategories.indexOf("POST_OFFICE") > -1) {
					sidebarMessage = ["Only use the 'Post Office' category for USPS post offices.  If this is a USPS location, please change to an area place and run the script again.  All other mail service places use the 'Shopping and Services' Category."];
					severity = Math.max(3, severity);
					lockOK = false;
				}
				if (item.isPoint() && newCategories.indexOf("HOSPITAL_MEDICAL_CARE") > -1) {
					sidebarMessage = ["This category should usually be an area.  Please change it, or manually lock it (if it is an ER point inside a larger hospital area). Please use the 'Office' category for non-emergency medical offices."];
					severity = Math.max(3, severity);
					lockOK = false;
				}
				if (region === "SER" && containsAny(newCategories,["JUNCTION_INTERCHANGE","SEA_LAKE_POOL","RIVER_STREAM","FOREST_GROVE","CANAL","SWAMP_MARSH","ISLAND","BEACH","TRANSPORTATION"]) ) {
					sidebarMessage = ["This category is usually not mapped in the SE region.  Please manually lock it, if it's a valid place."];
					severity = Math.max(3, severity);
					lockOK = false;
				}
				if (region === "SER" && item.is2D() && (newCategories.indexOf("CAR_DEALERSHIP") > -1)) {
					sidebarMessage = ["This category should be a point place, not an area."];
					severity = Math.max(3, severity);
					lockOK = false;
				}
	
				// Address check
				if (!item.attributes.name && !item.attributes.residential) {
					sidebarMessage.push("Place does not have a name.");
					severity = Math.max(3, severity);
					lockOK = false;
				}
				if (!addr.street || addr.street.isEmpty) {
					sidebarMessage.push("Place does not have a street.");
					severity = Math.max(3, severity);
					lockOK = false;
				}
				if (!addr.city || addr.city.isEmpty) {
					sidebarMessage.push("Place does not have a city.");
					severity = Math.max(3, severity);
					lockOK = false;
				}
				
				// House number check
				if (!item.attributes.houseNumber) {
					sidebarMessage.push("Place does not have a house number.");
					severity = Math.max(3, severity);
					lockOK = false;
				} else {
					hnOK = false;
					var hnTemp = item.attributes.houseNumber.replace(/[^\d]/g, '');  // Digits only
					var hnTempDash = item.attributes.houseNumber.replace(/[^\d-]/g, '');  // Digits and dashes only
					if (hnTemp === item.attributes.houseNumber || hnTemp < 1000000) {  //  general check that HN is 6 digits or less, & that it is only [0-9]
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
						sidebarMessage.push("House number is non-standard. Correct it and rerun script, or manually lock if correct.");
						severity = Math.max(3, severity);
						lockOK = false;
					}
				}
	
				// Phone formatting		
				var outputFormat = "({0}) {1}-{2}";
				if (region === "SER" && !(/^\(\d{3}\) \d{3}-\d{4}$/.test(item.attributes.phone))) {
					outputFormat = "{0}-{1}-{2}";
				} else if (region === "GLR") {
					outputFormat = "{0}-{1}-{2}";
				} else if (countryCode === "CAN") {
					outputFormat = "+1-{0}-{1}-{2}";
				}
				if (!item.attributes.residential) {
					newPhone = normalizePhone(item.attributes.phone, outputFormat);
					if (newPhone !== item.attributes.phone) {
						console.log("WMEPH: Phone updated");
						W.model.actionManager.add(new UpdateObject(item, {phone: newPhone}));
					}
				} 
				
						
				// Post Office cat check
				if (newCategories.indexOf("POST_OFFICE") > -1) {
					NH_Bann.USPS.active = true;
				}
	
				//	Add services to existing, only if they are different than what's there
				var servMatch = true;  
				for (var idServ = 0; idServ < newServices.length; idServ++) {
					if (item.attributes.services.indexOf(newServices[idServ]) === -1) { servMatch = false; }
				}
				if (!item.attributes.residential && !servMatch && $("#WMEPH-EnableServices" + devVersStr).prop('checked')) {
					console.log("WMEPH: Services updated");
					W.model.actionManager.add(new UpdateObject(item, { services: newServices }));
				} else if (item.attributes.residential) {
					if (item.attributes.services.length > 0) {
						W.model.actionManager.add(new UpdateObject(item, {services: [] }));
					}
				}
				
				// Place locking
				if (lockOK) {
					var levelToLock = lockLevel3;
	
					if (region === "SER") {
						if (newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && newCategories.indexOf("PARKING_LOT") > -1) {
							levelToLock = lockLevel4;
						} else if ( item.isPoint() && newCategories.indexOf("COLLEGE_UNIVERSITY") > -1 && newCategories.indexOf("HOSPITAL_MEDICAL_CARE") === -1 ) {
							levelToLock = lockLevel4;
						} else if ( containsAny(newCategories,["HOSPITAL_MEDICAL_CARE","COLLEGE_UNIVERSITY","STADIUM_ARENA","SCHOOL","AIRPORT"]) ) {
							levelToLock = lockLevel5;
						}
					}
	
					if (region === "SAT") {
						var SATlevel5Categories = ["HOSPITAL_MEDICAL_CARE", "AIRPORT"];
						if ( containsAny(newCategories,SATlevel5Categories) ) {
							levelToLock = lockLevel5;
						}
					}
	
					if (region === "MAR") {
						var MARlevel4Categories = [ "HOSPITAL_MEDICAL_CARE", "AIRPORT", "FIRE_DEPARTMENT", "POLICE_STATION" ];
						if ( containsAny(newCategories,MARlevel4Categories) ) {
							levelToLock = lockLevel4;
						}
					}
	
					if (item.attributes.lockRank < levelToLock) {
						console.log("WMEPH: Venue locked!");
						W.model.actionManager.add(new UpdateObject(item, {
							lockRank: levelToLock
						}));
					}
					sidebarMessage.push("Place is locked.");
				}
	
				// console.log(W.model)
				// User alerts for potentially confusing places
				var brandSwap = 0;
				var subFuel = 0;
				var hotelCat = 0;
				var walmartFlag = 0;
				if (brandSwap === 1) {
					sidebarMessage = ["The gas brand didn't match the primary name.  The script placed the primary name into the alt, and put the brand in the primary spot.  Check that the brand is indeed the current brand and verify all scripted changes."];
					severity = Math.max(3, severity);
				}
	
				if (severity < 3) {
					if (newName === "UPS") {
						sidebarMessage.push("If this is a 'UPS Store' location, please change the name to The UPS Store and run the script again.");
						severity = Math.max(1, severity);
					}
					nameShortSpace = newName.replace(/[^A-Za-z ]/g, '');
					if ( ["HOME","MY HOME","HOUSE","MY HOUSE","CASA","MI CASA"].indexOf( nameShortSpace.toUpperCase() ) > -1 ) {
						sidebarMessage.push("The place name suggests a residential place.  Please verify.");
						severity = Math.max(2, severity);
					}
					if (newName === "FedEx") {
						sidebarMessage.push("If this is a FedEx Office location, please change the name to FedEx Office and run the script again.");
						severity = Math.max(1, severity);
					}
					if (newName === "IBM Southeast EFCU") {
						sidebarMessage.push("Please add the suffix ' - LOCATION' to the primary name as found on IBMSEFCU's website");
						severity = Math.max(2, severity);
					}
					if (newName === "Toys R Us") {
						sidebarMessage.push("If there is a Babies R Us at this location, please add it as an alt-name.");
						severity = Math.max(1, severity);
					}
					if (newName === "Babies R Us") {
						sidebarMessage.push("If there is a Toys R Us at this location, please make it the primary name and Babies R Us the alt name.");
						severity = Math.max(1, severity);
					}
					if (walmartFlag === 1) {
						sidebarMessage.push("If this Walmart sells groceries, please add the Supermarket category to the place.");
						severity = Math.max(1, severity);
					}
					if (newCategories.indexOf("POST_OFFICE") > -1) {
						customStoreURL = "https://tools.usps.com/go/POLocatorAction.action";
						customStoreFinder = true;
						sidebarMessage.push("Please verify that the primary post office name is properly named: 'USPS - Branch Name'. If this isn't a USPS post office (eg UPS, Fedex, Mailboxes Etc.), please undo the script changes and change the category.  'Post Office' is only used for USPS locations.");
						severity = Math.max(1, severity);
					}
					if (item.is2D() && newCategories.indexOf("STADIUM_ARENA") > -1) {
						sidebarMessage.push("If this is a small/local ball field/arena, please consider using the 'Sports Court' category and making it a point place.");
						severity = Math.max(0, severity);
					}
					if (subFuel === 1) {
						sidebarMessage.push("Make sure this place is for the gas station itself and not the main store building.  Otherwise undo and check the categories.");
						severity = Math.max(2, severity);
					}
					if (hotelCat === 1 || newCategories.indexOf("HOTEL") > -1) {
						sidebarMessage.push("Please check hotel details, as names can often be unique (e.g. Holiday Inn - Tampa North).");
						severity = Math.max(1, severity);
					}
	
				}
	
				if (item.attributes.url !== null && item.attributes.url !== "") {
					if (customStoreFinder) {
						sidebarMessage.push("(<a href=\"" + customStoreURL + "\" target=\"_blank\" style=\"color: #FFF\" title=\"Open " + item.attributes.name + " store finder in a new tab\">Website</a>)");
					} else {
						sidebarMessage.push("(<a href=\"http://" + item.attributes.url + "\" target=\"_blank\" style=\"color: #FFF\" title=\"Open " + item.attributes.url + " in a new tab\">Website</a>)");
					}
				}
				
				// Make Messaging banners
				assembleBanner(item);
				
			}  // (End Place 'loop')
			
		}  // END harmonizePlaceGo function
		
		// Set up banner messages
		function assembleBanner(item) {
			var sidebarMessageEXT = sidebarMessage.slice(0);  // pull out message array to add on to if necessary
			for (var NHix = 0; NHix < Object.keys(NH_Bann).length; NHix++ ) {
				var tempKey = Object.keys(NH_Bann)[NHix];
				if (NH_Bann[tempKey].active) {
					sidebarMessageEXT.push(NH_Bann[tempKey].bannText + '<input class="PHbutton" id="' + NH_Bann[tempKey].id + '" type="button" value="' + NH_Bann[tempKey].value + '">');
				}
			}
			displayBanners(sidebarMessageEXT.join("<li>"), severity);
			setupButtons(item);
			// if (EXTOption) {
			// 	sidebarMessageEXT = sidebarMessageEXT.join("<li>");
			// 	displayBanners(sidebarMessageEXT,severity);
			// 	setupButtons();
			// } else {
			// 	displayBanners(sidebarMessage,severity);	
			// 	setupButtons();
			// }
		}  // END assemble Banner function
		
		// Button event handlers
		function setupButtons(item) {
			var ixButt = 0;
			var btn = [];
			for (var NHix = 0; NHix < Object.keys(NH_Bann).length; NHix++ ) {
				var tempKey = Object.keys(NH_Bann)[NHix];
				if (NH_Bann[tempKey].active) {
					btn[ixButt] = document.getElementById(NH_Bann[tempKey].id); 
					btn[ixButt].onclick = (function(buttonId, item){
						return function() {
							NH_Bann[buttonId].action(item);
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
		
		// Function that checks current place against the Harmonization Data.  Returns place data or "NoMatch"		
		function harmoList(itemName,state2L,region3L,country) {
			var USA_PNH_DATA_headers = USA_PNH_DATA[0].split("|");  // pull the data header names
			var ph_region_ix = USA_PNH_DATA_headers.indexOf("ph_region");  // Find the index for regions
			var nameComps;  // filled with search names to compare against place name
			var approvedRegions;  // filled with the regions that are approved for the place, when match is found
			var matchPNHData = [];  // array of matched data
			var currMatchNum = 0;  // index for multiple matches, currently returns on first match
			var PNHMatch = false;  // tracks match status
			itemName = itemName.toUpperCase();  // UpperCase the current place name (The Holly And Ivy Pub #23 --> THE HOLLY AND IVY PUB #23 )
			itemName = itemName.replace(/ AND /g, '');  // Clear the word " AND " from the name (THE HOLLY AND IVY PUB #23 --> THE HOLLYIVY PUB #23 )
			itemName = itemName.replace(/^THE /g, '');  // Clear the word "THE " from the start of the name ( THE HOLLYIVY PUB #23 -- > HOLLYIVY PUB #23 )
			itemName = itemName.replace(/[^A-Z0-9]/g, '');  // Clear all non-letter and non-number characters ( HOLLYIVY PUB #23 -- > HOLLYIVYPUB23 )
			var itemNameNoNum = itemName.replace(/[^A-Z]/g, '');  // Clear non-letter characters for alternate match ( HOLLYIVYPUB23 --> HOLLYIVYPUB ) 
			var t0 = performance.now();  // Speed check start
			var t1;
			for (var phnum=1; phnum<USA_PNH_NAMES.length; phnum++) {  // for each place on the PNH list (skipping headers at index 0)
				nameComps = USA_PNH_NAMES[phnum].split("|");  // splits all possible search names for the current PNH entry
				if (nameComps.indexOf(itemName) > -1 || nameComps.indexOf(itemNameNoNum) > -1 ) {  // Compare WME place name to PNH search name list
					PNHMatch = true;  // Name match found
					matchPNHData[currMatchNum] = USA_PNH_DATA[phnum];  // Pull the data line from the PNH data table.  (**Set in array for future multimatch features)
					var currMatchData = matchPNHData[currMatchNum].split("|");  // Split the PNH place data into string array
					approvedRegions = currMatchData[ph_region_ix].replace(/ /g, '');  // remove spaces from region field
					approvedRegions = approvedRegions.toUpperCase().split(",");  // upper case the approved regions and split by commas
					// console.log(approvedRegions);
					if (approvedRegions.indexOf(state2L) > -1 || approvedRegions.indexOf(region3L) > -1 ||   // if the WME-selected item matches the region
							$("#WMEPH-RegionOverride" + devVersStr).prop('checked')) {  // or if region override is selected
						t1 = performance.now();  // log search time
						console.log("WMEPH: Found place in " + (t1 - t0) + " milliseconds.");
						sidebarMessage.push("Place matched from PNH data.");	
						return currMatchData;  // Return the PNH data string array to the main script
					}
					currMatchNum++;
				} 
			}  // END loop through PNH places
			
			// If NO (name & region) match was found:
			console.log(PNHMatch);
			if (PNHMatch) {  // if a name match was found but not for region, prod the user to get it approved
				sidebarMessage.push("PNH data exists but not approved for your state. Contact your SM/RC.");	
				console.log("WMEPH: PNH data exists but not approved for region.");	
			} else {  // if no match was found, suggest adding the place to the sheet if it's a chain
				sidebarMessage.push("No PNH match.  If it's a chain, please submit the place data to your region's PNH sheet.");	
				console.log("WMEPH: Place not found in PNH list.");	
			}
			t1 = performance.now();  // log search time
			console.log("WMEPH: Searched all PNH entries in " + (t1 - t0) + " milliseconds.");
			return "NoMatch";
		} // END harmoList function
		
		
		
		// Populate a submission form for new chains
	//	var PHSubForm = FormApp.openByUrl(
	//		'https://docs.google.com/forms/d/1hv5hXBlGr1pTMmo4n3frUx1DovUODbZodfDBwwTc7HE/viewform'
	//	);
	//	console.log(PHSubForm);
	//	 
	//	 function evenBetterBuildUrls() {
	//		var ss = SpreadsheetApp.getActive();
	//		var sheet = ss.getSheetByName("Form Responses 1");
	//		var data = ss.getDataRange().getValues();  // Data for pre-fill
	//		var headers = data[0];					 // Sheet headers == form titles (questions)
	//		
	//		var formUrl = ss.getFormUrl();			 // Use form attached to sheet
	//		var form = FormApp.openByUrl(
	//	'https://docs.google.com/forms/d/1hv5hXBlGr1pTMmo4n3frUx1DovUODbZodfDBwwTc7HE/viewform'
	//		);
	//		var items = form.getItems();
	//		var urlCol = headers.indexOf("Prefilled URL");   // If there is a column labeled this way, we'll update it
	//		
	//		// Skip headers, then build URLs for each row in Sheet1.
	//		for (var row = 1; row < data.length; row++ ) {
	//		  Logger.log("Generating pre-filled URL from spreadsheet for row="+row);
	//		  // build a response from spreadsheet info.
	//		  var response = form.createResponse();
	//		  for (var i=0; i<items.length; i++) {
	//			var ques = items[i].getTitle();		   // Get text of question for item
	//			var quesCol = headers.indexOf(ques);	  // Get col index that contains this question
	//			var resp = ques ? data[row][quesCol] : "";
	//			var type = items[i].getType().toString();
	//			Logger.log("Question='"+ques+"', resp='"+resp+"' type:"+type);
	//			// Need to treat every type of answer as its specific type.
	//			switch (items[i].getType()) {
	//			  case FormApp.ItemType.TEXT:
	//				var item = items[i].asTextItem();
	//				break;
	//			  case FormApp.ItemType.PARAGRAPH_TEXT: 
	//				item = items[i].asParagraphTextItem();
	//				break;
	//			  case FormApp.ItemType.LIST:
	//				item = items[i].asListItem();
	//				break;
	//			  case FormApp.ItemType.MULTIPLE_CHOICE:
	//				item = items[i].asMultipleChoiceItem();
	//				break;
	//			  case FormApp.ItemType.CHECKBOX:
	//				item = items[i].asCheckboxItem();
	//				// In a form submission event, resp is an array, containing CSV strings. Join into 1 string.
	//				// In spreadsheet, just CSV string. Convert to array of separate choices, ready for createResponse().
	//				if (typeof resp !== 'string')
	//				  resp = resp.join(',');	  // Convert array to CSV
	//				resp = resp.split(/ *, */);   // Convert CSV to array
	//				break;
	//			  case FormApp.ItemType.DATE:
	//				item = items[i].asDateItem();
	//				resp = new Date( resp );
	//				break;
	//			  case FormApp.ItemType.DATETIME:
	//				item = items[i].asDateTimeItem();
	//				resp = new Date( resp );
	//				break;
	//			  default:
	//				item = null;  // Not handling DURATION, GRID, IMAGE, PAGE_BREAK, SCALE, SECTION_HEADER, TIME
	//				break;
	//			}
	//			// Add this answer to our pre-filled URL
	//			if (item) {
	//			  var respItem = item.createResponse(resp);
	//			  response.withItemResponse(respItem);
	//			}
	//			// else if we have any other type of response, we'll skip it
	//			else Logger.log("Skipping i="+i+", question="+ques+" type:"+type);
	//		  }
	//		  // Generate the pre-filled URL for this row
	//		  var editResponseUrl = response.toPrefilledUrl();
	//		  // If there is a "Prefilled URL" column, update it
	//		  if (urlCol >= 0) {
	//			var urlRange = sheet.getRange(row+1,urlCol+1).setValue(editResponseUrl);
	//		  }
	//		}
	//	};
	//	
	
	
		// KB Shortcut function
		var shortcut = {
			'all_shortcuts': {}, //All the shortcuts are stored in this array
			'add': function(shortcut_combination, callback, opt) {
				//Provide a set of default options
				var default_options = {
					'type': 'keydown',
					'propagate': false,
					'disable_in_input': false,
					'target': document,
					'keycode': false
				}
				if (!opt) opt = default_options;
				else {
					for (var dfo in default_options) {
						if (typeof opt[dfo] == 'undefined') opt[dfo] = default_options[dfo];
					}
				}
	
				var ele = opt.target;
				if (typeof opt.target == 'string') ele = document.getElementById(opt.target);
				var ths = this;
				shortcut_combination = shortcut_combination.toLowerCase();
	
				//The function to be called at keypress
				var func = function(e) {
					e = e || window.event;
	
					if (opt['disable_in_input']) { //Don't enable shortcut keys in Input, Textarea fields
						var element;
						if (e.target) element = e.target;
						else if (e.srcElement) element = e.srcElement;
						if (element.nodeType == 3) element = element.parentNode;
	
						if (element.tagName == 'INPUT' || element.tagName == 'TEXTAREA') return;
					}
	
					//Find Which key is pressed
					var code;
					if (e.keyCode) code = e.keyCode;
					else if (e.which) code = e.which;
					var character = String.fromCharCode(code).toLowerCase();
	
					if (code == 188) character = ","; //If the user presses , when the type is onkeydown
					if (code == 190) character = "."; //If the user presses , when the type is onkeydown
	
					var keys = shortcut_combination.split("+");
					//Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
					var kp = 0;
	
					//Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
					var shift_nums = {
							"`": "~",
							"1": "!",
							"2": "@",
							"3": "#",
							"4": "$",
							"5": "%",
							"6": "^",
							"7": "&",
							"8": "*",
							"9": "(",
							"0": ")",
							"-": "_",
							"=": "+",
							";": ":",
							"'": "\"",
							",": "<",
							".": ">",
							"/": "?",
							"\\": "|"
						}
						//Special Keys - and their codes
					var special_keys = {
						'esc': 27,
						'escape': 27,
						'tab': 9,
						'space': 32,
						'return': 13,
						'enter': 13,
						'backspace': 8,
						'scrolllock': 145,
						'scroll_lock': 145,
						'scroll': 145,
						'capslock': 20,
						'caps_lock': 20,
						'caps': 20,
						'numlock': 144,
						'num_lock': 144,
						'num': 144,
						'pause': 19,
						'break': 19,
						'insert': 45,
						'home': 36,
						'delete': 46,
						'end': 35,
						'pageup': 33,
						'page_up': 33,
						'pu': 33,
						'pagedown': 34,
						'page_down': 34,
						'pd': 34,
						'left': 37,
						'up': 38,
						'right': 39,
						'down': 40,
						'f1': 112,
						'f2': 113,
						'f3': 114,
						'f4': 115,
						'f5': 116,
						'f6': 117,
						'f7': 118,
						'f8': 119,
						'f9': 120,
						'f10': 121,
						'f11': 122,
						'f12': 123
					}
	
					var modifiers = {
						shift: {
							wanted: false,
							pressed: false
						},
						ctrl: {
							wanted: false,
							pressed: false
						},
						alt: {
							wanted: false,
							pressed: false
						},
						meta: {
							wanted: false,
							pressed: false
						} //Meta is Mac specific
					};
	
					if (e.ctrlKey) modifiers.ctrl.pressed = true;
					if (e.shiftKey) modifiers.shift.pressed = true;
					if (e.altKey) modifiers.alt.pressed = true;
					if (e.metaKey) modifiers.meta.pressed = true;
	
					var k;
					for (var i = 0; k = keys[i], i < keys.length; i++) {
						//Modifiers
						if (k == 'ctrl' || k == 'control') {
							kp++;
							modifiers.ctrl.wanted = true;
	
						} else if (k == 'shift') {
							kp++;
							modifiers.shift.wanted = true;
	
						} else if (k == 'alt') {
							kp++;
							modifiers.alt.wanted = true;
						} else if (k == 'meta') {
							kp++;
							modifiers.meta.wanted = true;
						} else if (k.length > 1) { //If it is a special key
							if (special_keys[k] == code) kp++;
	
						} else if (opt['keycode']) {
							if (opt['keycode'] == code) kp++;
	
						} else { //The special keys did not match
							if (character == k) kp++;
							else {
								if (shift_nums[character] && e.shiftKey) { //Stupid Shift key bug created by using lowercase
									character = shift_nums[character];
									if (character == k) kp++;
								}
							}
						}
					}
	
					if (kp == keys.length &&
						modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
						modifiers.shift.pressed == modifiers.shift.wanted &&
						modifiers.alt.pressed == modifiers.alt.wanted &&
						modifiers.meta.pressed == modifiers.meta.wanted) {
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
				}
				this.all_shortcuts[shortcut_combination] = {
					'callback': func,
					'target': ele,
					'event': opt['type']
				};
				//Attach the function with the event
				if (ele.addEventListener) ele.addEventListener(opt['type'], func, false);
				else if (ele.attachEvent) ele.attachEvent('on' + opt['type'], func);
				else ele['on' + opt['type']] = func;
			},
	
			//Remove the shortcut - just specify the shortcut and I will remove the binding
			'remove': function(shortcut_combination) {
				shortcut_combination = shortcut_combination.toLowerCase();
				var binding = this.all_shortcuts[shortcut_combination];
				delete(this.all_shortcuts[shortcut_combination])
				if (!binding) return;
				var type = binding['event'];
				var ele = binding['target'];
				var callback = binding['callback'];
	
				if (ele.detachEvent) ele.detachEvent('on' + type, callback);
				else if (ele.removeEventListener) ele.removeEventListener(type, callback, false);
				else ele['on' + type] = false;
			}
		}  // END Shortcut function
		
		
	} // END runPH Function
		
	
	// This function runs at script load, and builds the search name dataset to compare the WME selected place name to.
	function makeNameCheckList() {  // Builds the list of search names to match to the WME place name
		var USA_PNH_DATA_headers = USA_PNH_DATA[0].split("|");  // split the data headers out
		var ph_name_ix = USA_PNH_DATA_headers.indexOf("ph_name");  // find the indices needed for the function
		var ph_category1_ix = USA_PNH_DATA_headers.indexOf("ph_category1");
		var ph_searchnamebase_ix = USA_PNH_DATA_headers.indexOf("ph_searchnamebase");
		var ph_searchnamemid_ix = USA_PNH_DATA_headers.indexOf("ph_searchnamemid");
		var ph_searchnameend_ix = USA_PNH_DATA_headers.indexOf("ph_searchnameend");
		var t0 = performance.now();  // Speed check start
		var newNameListLength;  // static list length
		
		for (var pnhix=0; pnhix<USA_PNH_DATA.length; pnhix++) {  // loop through all PNH places
			var pnhEntryTemp = USA_PNH_DATA[pnhix].split("|");  // split the current PNH data line 
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
			if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "HOTEL") {
				for (var catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Hotel to all items
					newNameList.push(newNameList[catix]+"HOTEL");
				}
			} else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "BANKFINANCIAL") {
				for (var catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Bank and ATM to all items
					newNameList.push(newNameList[catix]+"BANK");
					newNameList.push(newNameList[catix]+"ATM");
				}
			} else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "SUPERMARKETGROCERY") {
				for (var catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Supermarket to all items
					newNameList.push(newNameList[catix]+"SUPERMARKET");
				}
			} else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "GYMFITNESS") {
				for (var catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Gym to all items
					newNameList.push(newNameList[catix]+"GYM");
				}
			} else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "GASSTATION") {
				for (var catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Gas terms to all items
					newNameList.push(newNameList[catix]+"GAS");
					newNameList.push(newNameList[catix]+"GASOLINE");
					newNameList.push(newNameList[catix]+"FUEL");
					newNameList.push(newNameList[catix]+"GASSTATION");
				}
			} else if (pnhEntryTemp[ph_category1_ix].toUpperCase().replace(/[^A-Za-z0-9]/g, '') === "CARRENTAL") {
				for (var catix=0; catix<newNameListLength; catix++) {  // extend the list by adding Car Rental terms to all items
					newNameList.push(newNameList[catix]+"RENTAL");
					newNameList.push(newNameList[catix]+"RENTACAR");
					newNameList.push(newNameList[catix]+"CARRENTAL");
					newNameList.push(newNameList[catix]+"RENTALCAR");
				}
			} 
			newNameList = uniq(newNameList);  // remove any duplicate search names
			newNameList = newNameList.join("|");  // join the list with |
			USA_PNH_NAMES.push(newNameList);  // push the list to the master search list
		}
		var t1 = performance.now();  // log search time
		console.log("WMEPH: Built search list of " + USA_PNH_DATA.length + " PNH places in " + (t1 - t0) + " milliseconds.")
	}  // END makeNameCheckList
	
	// Removes duplicate strings from string array
	function uniq(a) {
		"use strict";
		var seen = {};
		return a.filter(function(item) {
			return seen.hasOwnProperty(item) ? false : (seen[item] = true);
		});
	}  // END uniq function
	
	var USA_PNH_NAMES = [];
	USA_PNH_DATA = [		
		"ph_order|ph_name|ph_aliases|ph_category1|ph_category2|ph_description|ph_url|ph_region|ph_national|ph_speccase|ph_searchnamebase|ph_searchnamemid|ph_searchnameend|ph_sfurl|ph_sfurllocal",
		"1|24 Hour Fitness|0|Gym / Fitness|0|0|24hourfitness.com|SWR, SAT, SER, TX,|0|0|twentyfourhourfitness, 24hrfitness|0|0|http://www.24hourfitness.com/health_clubs/locations/finder/|0",
		"2|7-Eleven|7-11|Convenience Store|0|0|7-eleven.com|SWR, SER, SAT, TX, NEW, MAR|Yes|1|Seveneleven, seven11, 711|0|0|https://www.7-eleven.com/Home/Locator|0",
		"3|76|0|Gas Station|0|0|76.com|SWR, SAT, TX, NEW, MAR|0|0|seventysix|0|0|http://www.76.com/stationlocator/|0",
		"4|99 Cents Only|0|Shopping and services|0|0|99only.com|SWR, TX, MAR|0|0|99centonly, ninetyninecentsonly|0|0|http://99only.com/stores/|0",
		"5|AAA|Auto Club|Car Services|0|0|aaa.com|CA, NEW|0|1|triplea|0|0|need local to provide better location search|0",
		"6|AAA|American Automobile Association|Organization or Association|0|0|aaa.com|SER, SAT, MAR|0|1|triplea|0|0|http://autoclubsouth.aaa.com/Branches/Search.aspx|0",
		"7|Aaron Brothers|0|Arts & Crafts|0|0|aaronbrothers.com|SWR, TX, SER|0|0|aaronbros|0|0|http://aaronbrothers.com/store_locator|0",
		"8|Alberto's|0|Fast Food|0|Mexican Food|albertosweb.com|CA,|0|0|albertos|mexican|food|http://albertosweb.com/locations.htm|0",
		"9|Albertsons|0|Supermarket / Grocery|0|0|albertsons.com|SWR, SER, TX|0|0|albertson|0|0|http://albertsons.mywebgrocer.com/Stores/?mobile=0&mwg=store&loc=2&f=Any|0",
		"10|Aldi|0|Supermarket / Grocery|0|0|aldi.us|SER, SAT, TX, NEW, MAR|0|0|aldius|0|0|https://storelocator.aldi.us/Presentation/AldiSued/en-us/Start|0",
		"11|Anytime Fitness|0|Gym / Fitness|0|0|anytimefitness.com|SER, LA, NY, SWR, SAT, TX, NEW, MAR|0|0|0|0|0|http://anytimefitness.com/find-gym|0",
		"12|Applebee’s|0|Restaurant|0|0|applebees.com|SWR, SER, SAT, NEW, MAR|0|0|applebees, applebys, applebies|bar, grill|0|http://www.applebees.com/locations|0",
		"13|Arby's|0|Fast Food|0|0|arbys.com|SWR, SER, SAT, NEW, MAR|0|0|arby|0|0|http://locations.arbys.com/search.html|0",
		"14|ARCO|0|Gas Station|0|0|arco.com|SWR, TX|0|1|0|0|0|http://arco.com/find-a-station/|0",
		"15|ARCO ampm|0|Gas Station|Convenience Store|0|ampm.com|SWR, TX|0|1|ampm|0|0|http://www.ampm.com/storelocator|0",
		"16|AutoZone|0|Car Services|0|0|autozone.com|SWR, SER, SAT, TX, NEW, MAR|0|0|autozone|car|parts|http://www.autozone.com/storelocator/storeLocatorMain.jsp;jsessionid=E007315AA389389AFFFF3EEF158464F4.diyprod8-b2c22?targetPage=storeLocator|0",
		"17|Avis|0|Car Rental|0|0|avis.com|SWR, SER, SAT, TX, NEW, MAR|0|0|avis|0|0|http://www.avis.com/car-rental/location/US|0",
		"18|Baja Fresh|0|Fast Food|0|0|bajafresh.com|SWR, SAT, TX, MAR, SER|0|0|0|0|0|http://www.bajafresh.com/mexican-restaurant-locations?loc=Zip+Code+or+City+and+State|0",
		"19|Bank of America|0|Bank / Financial|ATM|0|bankofamerica.com|SWR, SER, SAT, TX, NEW, MAR|0|1|0|0|0|https://locators.bankofamerica.com/search?q=&rad=100|0",
		"20|Bed Bath & Beyond|0|Department Store|0|0|bedbathandbeyond.com|CA, SER, SAT, TX, NEW, MAR|0|0|bedbath|0|0|http://www.bedbathandbeyond.com/store/selfservice/FindStore|0",
		"21|Benihana|0|Restaurant|0|0|benihana.com|SWR, MAR, SER|0|0|benyhana, benihanna, benyhanna|0|0|http://benihana.com/set-location/|0",
		"22|Best Buy|0|Electronics|0|0|bestbuy.com|SWR, SER, SAT, TX, NEW, MAR|0|0|bestbuy|0|electronics|http://www.bestbuy.com/site/store-locator|0",
		"23|BevMo!|0|Supermarket / Grocery|0|0|bevmo.com|SWR, TX|0|0|0|0|0|http://www.bevmo.com/storelocator/|0",
		"24|Big Lots|0|Shopping and services|0|0|biglots.com|SWR, TX,|0|0|0|0|0|http://local.biglots.com/|0",
		"25|Big Lots|0|Department Store|Supermarket / Grocery|0|biglots.com|SER, SAT, NEW, MAR|0|0|0|0|0|http://local.biglots.com/|0",
		"26|Big Mama's & Papa's Pizzeria|0|Fast Food|0|0|bigmamaspizza.com|CA,|0|0|bigmamas, bigmamaspapas|0|pizza, pizzeria|https://ordernow.bigmamaspizza.com/locations/|0",
		"27|BJ's Restaurant & Brewhouse|0|Restaurant|Bar|0|bjsrestaurants.com|SWR, SER, SAT, TX, MAR|0|1|bjs|restaurant, brewhouse|0|http://www.bjsrestaurants.com/locations|0",
		"28|Boston Market|0|Restaurant|0|0|bostonmarket.com|SWR, SER, SAT, TX, NEW, MAR|0|0|0|0|0|https://www.bostonmarket.com/locations/|0",
		"29|Buca di Beppo|0|Restaurant|0|0|bucadibeppo.com|SWR, SER, SAT, TX, MAR|0|0|bucadibepo, buccadibeppo, buccadibepo|0|0|http://bucadibeppo.com/restaurants|0",
		"30|Buffalo Wild Wings Grill & Bar|BWW, Bdubs|Restaurant|0|0|buffalowildwings.com|SWR, SER, SAT, TX, NEW, MAR|0|0|bww, bdubs, buffalowildwings|grill, bar|0|http://buffalowildwings.com/en/locations/|0",
		"31|Burger King|BK|Fast Food|0|0|bk.com|SWR, SER, SAT, TX, NEW, MAR|0|0|bk|0|0|http://www.bk.com/locations|0",
		"32|California Pizza Kitchen|CPK|Restaurant|0|0|cpk.com|CA, SAT, TX, NEW, MAR, SER|0|0|californiapizza|0|0|http://www.cpk.com/locations/|0",
		"33|Carl's Jr|0|Fast Food|0|0|carlsjr.com|SWR, TX|0|0|carljr|0|0|http://www.carlsjr.com/locations|0",
		"34|CarMax|0|Car Dealership|0|0|carmax.com|SWR, SER, SAT, TX, NEW, MAR|0|0|0|0|0|http://www.carmax.com/enus/locations/default.html|0",
		"35|Chase Bank|0|Bank / Financial|ATM|0|chase.com|SWR, SER, SAT, TX, MAR|0|0|chase|0|0|https://locator.chase.com/?LOC=en_US|0",
		"36|Checkers|0|Fast Food|0|0|checkers.com|SER, SAT, TX, MAR|0|0|0|0|0|http://checkers.com/locations|0",
		"37|Cheesecake Factory|0|Restaurant|0|0|cheesecakefactory.com|SWR, SAT, TX, NEW, MAR, SER|0|0|0|0|0|http://www.thecheesecakefactory.com/locations|0",
		"38|Chevron|0|Gas Station|0|0|chevron.com|SWR, SER, SAT, TX, MAR|0|0|0|0|0|http://www.chevronwithtechron.com/findastation.aspx|0",
		"39|Chevys Fresh Mex|0|Restaurant|0|0|chevys.com|SWR, TX, MAR, SER|0|0|chevys|fresh|mex, mexican|http://locations.chevys.com/|0",
		"40|Chick-fil-A|Chick Fil A, Chickfila|Fast Food|0|0|chickfila.com|SWR, SER, SAT, TX, NEW, MAR|0|0|chicfila|0|0|http://www.chick-fil-a.com/Locations/Locator|0",
		"41|Chili's|0|Restaurant|0|0|chilis.com|SWR, SER, SAT, TX, NEW, MAR|0|0|0|0|0|http://www.chilis.com/EN/Pages/locationsearch.aspx|0",
		"42|Chipotle Mexican Grill|0|Fast Food|0|0|chipotle.com|SWR, SER, SAT, TX, NEW, MAR|0|0|chipotle, chipotles|mexican|grill|http://chipotle.com/locations/|http://chipotle.com/locations/#/?address=City%20Name%20Florida&radius=250",
		"43|Chuck E Cheese's|CEC|Game Club|Restaurant|Where A Kid Can Be A Kid. Admission is always free.|chuckecheese.com|SER, SAT, TX, NEW, MAR|0|0|cec, chuckycheese, chuckecheese, chuckycheeses|0|0|https://www.chuckecheese.com/locations|https://www.chuckecheese.com/locations/?type=2&val=FL&miles=10",
		"44|Claim Jumper|0|Restaurant|0|0|claimjumper.com|SWR, SAT, TX|0|0|0|0|0|http://claimjumper.com/locations.aspx|no easy way to see url",
		"45|Coco's|0|Restaurant|0|0|cocosbakery.com|SWR, TX|0|0|cocos|bakery|0|http://www.cocosbakery.com/locations/|http://www.cocosbakery.com/locations#q=City Name, State",
		"46|Cold Stone Creamery|0|Ice Cream|0|0|coldstonecreamery.com|SWR, NY, SAT, TX, NEW, MAR, SER|0|0|coldstone|ice cream|0|http://www.coldstonecreamery.com/locator/|http://www.coldstonecreamery.com/locator/index.php?brand=cs&mode=desktop&pagesize=7&mi_or_km=mi&latitude=&longitude=&q=City+Name%2C+State",
		"47|Corner Bakery Cafe|0|Restaurant|0|0|cornerbakerycafe.com|SWR, TX, NEW, MAR, SER|0|0|cornerbakery|cafe|0|https://orderonline.cornerbakerycafe.com/#content=/Restaurant/Search|http://www.cornerbakerycafe.com/locations?address=St%20Petersburg,%20Florida&ll=27.7518284,-82.6267345",
		"48|Cost Plus World Market|0|Furniture / Home Store|0|0|worldmarket.com|CA, TX|0|0|costplus|0|market|http://www.worldmarket.com/store-locator/landing.do|http://www.worldmarket.com/store-locator.do?eslSearchInput1=City+Name%2C+State&eslSearchButton1.x=0&eslSearchButton1.y=0&method=viewSearchPage",
		"49|Costco|0|Department Store|Supermarket / Grocery|0|costco.com|CA, SAT, NEW, MAR, SER|0|0|costco|wholesale|0|http://www.costco.com/warehouse-locations|http://www.costco.com/warehouse-locations?location=City+Name%2C+State",
		"50|Costco|0|Supermarket / Grocery|0|0|costco.com|TX|0|0|costco|wholesale|0|http://www.costco.com/warehouse-locations|http://www.costco.com/warehouse-locations?location=City+Name%2C+State",
		"51|CVS Pharmacy|0|Pharmacy|Convenience Store|0|cvs.com|CA, SER, SAT, TX, NEW, MAR|0|0|cvs|pharmacy|photo|http://www.cvs.com/store-locator/landing|no easy way to see url",
		"52|Dairy Queen|DQ|Fast Food|0|0|dq.com|CA, SER, SAT, TX, NEW, MAR|0|0|dairyqueen|ice cream|0|http://www.dairyqueen.com/us-en/locator/|http://www.dairyqueen.com/us-en/locator/?s=CityName,State",
		"53|Daphne's|0|Fast Food|0|California Greek|daphnes.biz|CA, SAT, TX|0|0|daphnes|greek|food|http://daphnes.biz/locations|no easy way to see url",
		"54|David's Bridal|0|Fashion and Clothing|0|0|davidsbridal.com|CA, SER, SAT, NEW, MAR|0|0|0|0|0|http://www.davidsbridal.com/AjaxStoreLocatorDisplayView?catalogId=10051&langId=-1&storeId=10052|no easy way to see url",
		"55|Del Taco|0|Fast Food|0|0|deltaco.com|CA, TX, SER|0|0|deltaco|mexican|food|http://deltaco.com/locations.html|0",
		"56|Denny's|0|Restaurant|0|0|dennys.com|CA, SER, SAT, TX, MAR|0|0|0|0|0|https://www.dennys.com/locations/|0",
		"57|Dollar Tree|0|Shopping and services|0|0|dollartree.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|https://www.dollartree.com/custserv/custserv.jsp?pageName=StoreLocations|0",
		"58|Domino's|0|Fast Food|0|Pizza, Pasta, Sandwiches, Chicken|dominos.com|SER, SAT, TX, MAR|0|0|domino, dominos|0|pizza, pizzeria|0|0",
		"59|Domino's Pizza|0|Fast Food|0|0|dominos.com|CA, TX, NEW, MAR|0|0|domino, dominos|0|pizza, pizzeria|0|0",
		"60|Dunkin' Donuts|0|Bakery|Coffee shop|Donuts|dunkindonuts.com|SER, SAT, TX, NEW, MAR|0|0|dd, dunkingdonuts|0|0|0|0",
		"61|Dunkin' Donuts|0|Dessert|0|Donuts|dunkindonuts.com|CA|0|0|dd, dunkingdonuts|0|0|0|0",
		"62|El Pollo Loco|0|Fast Food|0|0|elpolloloco.com|CA, TX|0|0|polloloco|0|0|http://elpolloloco.com/locations/|0",
		"63|El Torito|0|Restaurant|0|0|eltorito.com|CA, TX|0|0|eltorito|mexican|food|http://locations.eltorito.com/#/map|0",
		"64|Enterprise|0|Car Rental|0|0|enterprise.com|CA, SER, SAT, TX, NEW, MAR|0|0|enterprise|0|0|https://www.enterprise.com/en/car-rental/locations/us.html|0",
		"65|Fantastic Sams|0|Personal Care|0|Hair Salon|fantasticsams.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"66|Fatburger|0|Fast Food|0|0|fatburger.com|CA, TX, MAR|0|0|0|0|0|0|0",
		"67|Fedex|0|Shopping and services|0|0|fedex.com|SER, SAT, TX, NEW, MAR|0|0|fedex|kinkos|office|0|0",
		"68|Firehouse Subs|0|Fast Food|0|Founded by Firemen|firehousesubs.com|SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"69|Five Guys|0|Fast Food|0|0|fiveguys.com|CA, SER, SAT, NEW, MAR|0|0|fiveguys, 5guys|burgers|fries|0|0",
		"70|Food 4 Less|0|Supermarket / Grocery|0|0|food4less.com|CA, TX|0|0|foodforless|0|0|0|0",
		"71|Fred Meyer|0|Department Store|Supermarket / Grocery|0|fredmeyer.com|OR, TX|0|0|fredmeyers|0|0|0|0",
		"72|Fresh & Easy|0|Supermarket / Grocery|0|0|freshandeasy.com|CA, TX|0|0|0|0|0|0|0",
		"73|Fry's Electronics|0|Electronics|0|0|frys.com|CA, MAR|0|1|0|0|0|0|0",
		"74|GameStop|0|Electronics|0|0|gamestop.com|CA, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"76|Gold's Gym|0|Gym / Fitness|0|0|goldsgym.com|SER, CA, NY, WA, SAT, TX, MAR|0|0|goldgym|0|0|0|0",
		"77|Golden Corral|0|Restaurant|0|0|goldencorral.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"78|H&R Block|0|Bank / Financial|0|0|hrblock.com|SER, SAT, TX, NEW, MAR|0|0|hrblock|0|taxes, tax service|0|0",
		"79|Hangar 18 Climbing Gym|0|Gym / Fitness|0|0|climbhangar18.com|CA, TX|0|0|hangar18|climbing|gym|0|0",
		"80|Hertz|0|Car Rental|0|0|hertz.com|CA, SER, SAT, TX, NEW, MAR|0|0|hertz|0|0|0|0",
		"81|Hilton|0|Hotel|0|0|hilton.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"82|Home DepotNOMATCH|See: The Home Depot|0|0|0|homedepot.com|SWR, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"83||||||||||0|0|0|0|0",
		"84|Hooters|0|Restaurant|0|Delightfully tacky yet unrefined. Established on April 1st 1983, The Original Hooters opened its doors on October 4th 1983 in sunny Clearwater, Florida and is still serving guests today.|hooters.com|SER, SAT, TX, NEW, MAR|0|0|hooters|bar, grill|0|0|0",
		"85|Hyatt|0|Hotel|0|0|hyatt.com|SWR, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"86|IBM Southeast EFCU - 'Location'|IBM Southeast Employees' Federal Credit Union, IBM SEFCU|Bank / Financial|ATM|0|ibmsecu.org|SER, TX|0|1|0|0|0|0|0",
		"87|IHOP|0|Restaurant|0|0|ihop.com|CA, SER, SAT, TX, NEW, MAR|0|0|internationalhouseofpancakes|0|0|0|0",
		"88|In-N-Out Burger|0|Fast Food|0|0|in-n-out.com|CA, TX, MAR|0|0|inout, innout|0|burger, burgers|0|0",
		"89|Jack in the Box|0|Fast Food|0|0|jackinthebox.com|CA, SAT, MAR|0|0|jacknthebox|0|0|0|0",
		"90|Jamba Juice|0|Fast Food|0|Juices|jambajuice.com|CA, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"91|JCPenney|0|Department Store|0|0|jcpenney.com|CA|0|0|jcpenneys, jcpennies|0|0|0|0",
		"92|Jersey Mike's Subs|0|Fast Food|0|0|jerseymikes.com|CA, SAT, TX, NEW, MAR|0|0|jerseymikes|0|0|0|0",
		"93|Jo-Ann Fabric and Craft|0|Arts & Crafts|0|0|joann.com|CA, SER, SAT, TX, NEW, MAR|0|0|joann, joanns|fabric|craft, crafts|0|0",
		"94|Joe's Crab Shack|0|Restaurant|0|0|joescrabshack.com|deo, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"95|Jons International Marketplace|0|Supermarket / Grocery|0|0|jonsmarketplace.com|CA, TX|0|0|jonsmarketplace|0|0|0|0",
		"96|Kangaroo Express|0|Gas Station|Convenience Store|0|kangarooexpress.com|SER, SAT, TX, MAR|0|0|0|0|0|0|0",
		"97|KFC|Kentucky Fried Chicken|Fast Food|0|0|kfc.com|CA, SER, SAT, TX, NEW, MAR|0|0|kentuckyfriedchicken|0|0|0|0",
		"98|Kmart|0|Department Store|0|0|kmart.com|CA, SER, SAT, NEW, MAR|0|0|kmart|0|superstore|0|0",
		"99|Kohl's|0|Department Store|0|0|kohls.com|CA, SER, SAT, TX, NEW, MAR|0|0|kohl|0|0|0|0",
		"100|Krispy Kreme|0|Bakery|Coffee shop|Donuts|krispykreme.com|SER, SAT, MAR|0|0|krispykreme|0|donuts|0|0",
		"101|Krispy Kreme|0|Dessert|Coffee shop|Donuts|krispykreme.com|CA,|0|0|krispykreme|0|donuts|0|0",
		"102|Krystal|0|Fast Food|0|0|krystal.com|MS, LA, AR, VA, SER, SAT, SAT, TX, MAR|0|0|0|0|0|0|0",
		"103|LA Fitness|0|Gym / Fitness|0|0|lafitness.com|CA, SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"104|La Quinta Inn|LaQuinta Inn|Hotel|0|0|lq.com|SER, SAT, TX, NEW, MAR|0|0|laquinta|0|0|0|0",
		"105|Lee's Sandwiches|0|Fast Food|0|Vietnamese|leesandwiches.com|CA, , TX|0|0|0|0|0|0|0",
		"106|Little Caesars|0|Fast Food|0|0|littlecaesars.com|CA, SER, SAT, TX, NEW, MAR|0|0|littlecaesars, littleceasars|0|pizza, pizzeria|0|0",
		"107|Living Spaces|0|Furniture / Home Store|0|0|livingspaces.com|CA, TX, MAR|0|0|0|0|0|0|0",
		"108|Loving Hut|0|Restaurant|0|Vegan|lovinghut.us|CA, TX, NEW|0|0|0|0|0|0|0",
		"109|Lowe's|0|Hardware Store|0|Never Stop Improving|lowes.com|CA, SER, SAT, TX, NEW, MAR|0|0|lowes|homeimprovement|0|0|0",
		"110|Lucille's Smokehouse BBQ|0|Restaurant|0|0|lucillesbbq.com|CA, TX|0|0|lucillesbbq|0|0|0|0",
		"111|Macy's|0|Department Store|0|0|macys.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"112|Marie Callender's|Marie Callenders|Restaurant|0|0|mariecallenders.com|CA, SAT, NEW, MAR|0|0|mariecallanders|0|0|0|0",
		"113|Marriott|0|Hotel|0|0|marriott.com|CA, SER, SAT, TX, NEW, MAR|0|0|jwmarriott, mariott, marriot|0|0|0|0",
		"114|Marshalls|0|Fashion and Clothing|0|0|marshallsonline.com|CA, SER, SAT, NEW, MAR|0|0|marshals|0|0|0|0",
		"115|McDonald's|0|Fast Food|0|0|mcdonalds.com|CA, SER, SAT, TX, NEW, MAR|0|0|mcds|0|0|0|0",
		"116|Men's Wearhouse|0|Fashion and Clothing|0|0|menswearhouse.com|CA, SER, SAT, TX, NEW, MAR|0|0|menswarehouse|0|0|0|0",
		"117|Merrill Lynch|0|Bank / Financial|0|0|ml.com|TX, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"118|Michael's|0|Arts & Crafts|0|0|michaels.com|CA, SER, SAT, TX, NEW, MAR|0|0|michaels, micheals|arts|crafts|0|0",
		"119|Mimi's Cafe|0|Restaurant|0|0|mimiscafe.com|CA, SAT, TX, MAR|0|0|0|0|0|0|0",
		"120|Mobil|0|Gas Station|0|0|exxonmobilstations.com|CA, SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"121|Moe's Southwest Grill|0|Fast Food|0|0|moes.com|SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"122|Motel 6|0|Hotel|0|0|motel6.com|CA, SER, SAT, NEW, MAR|0|0|motelsix|0|0|0|0",
		"123|Nordstrom Rack|0|Fashion and Clothing|0|0|nordstromrack.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"124|Norms|0|Restaurant|0|Classic googie diner|normsrestaurants.com|CA,|0|0|norms|diner|0|0|0",
		"125|O'Reilly Auto Parts|0|Car Services|0|0|oreillyauto.com|CA, SER, SAT, TX, NEW, MAR|0|0|oreilly, oreillys|auto|parts|0|0",
		"126|Olive Garden|0|Restaurant|0|0|olivegarden.com|CA, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"127|OneWest Bank|0|Bank / Financial|ATM|0|onewestbank.com|SWR, MAR|0|0|1west, onewest|0|0|0|0",
		"128|Outback Steakhouse|0|Restaurant|0|0|outback.com|CA, SER, SAT, TX, NEW, MAR|0|0|outback|0|0|0|0",
		"129|P.F. Chang's China Bistro|P F Chang's China Bistro|Restaurant|0|0|pfchangs.com|CA, SER, SAT, NEW, MAR|0|0|pfchang, pfchangs|china|bistro|0|0",
		"130|Panda Express|0|Fast Food|0|Chinese|pandaexpress.com|CA, SER, SAT, TX, NEW, MAR|0|0|pandaexpress|chinese|food|0|0",
		"131|Panera Bread|0|Restaurant|Bakery|0|panerabread.com|CA, SER, SAT, TX, NEW, MAR|0|0|panera|0|0|0|0",
		"132|Papa John's Pizza|0|Fast Food|0|0|papajohns.com|CA, SER, SAT, TX, NEW, MAR|0|0|papajohns|0|pizza, pizzeria|0|0",
		"133|Pavilions|0|Supermarket / Grocery|0|0|pavilions.com|CA, TX|0|0|0|0|0|0|0",
		"134|Payless Drug|0|Pharmacy|Convenience Store|0|paylessdrug.com|CA, TX|0|0|paylesspharmacy|0|0|0|0",
		"135|Payless ShoeSource|0|Fashion and Clothing|0|0|payless.com|CA, SER, SAT, TX, NEW, MAR|0|0|paylessshoes|0|0|0|0",
		"136|Peet's Coffee & Tea|0|Coffee shop|0|0|peets.com|CA, TX, NEW, MAR|0|0|peets|coffee, tea|0|0|0",
		"137|Pep Boys|0|Garage / Automotive Shop|Shopping and services|0|pepboys.com|CA, SER, SAT, TX, NEW, MAR|0|0|pepboys|autorepair|0|0|0",
		"138|Petco|0|Pet Store / Veterinarian|0|0|petco.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"139|PetSmart|0|Pet Store / Veterinarian|0|0|petsmart.com|CA, SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"140|PF Chang's|P F Chang's China Bistro|Restaurant|0|0|pfchangs.com|TX, MAR|0|0|pfchang, pfchangs|china|bistro|0|0",
		"141|Pick Up Stix|0|Restaurant|0|Asian|pickupstix.com|CA, TX|0|0|pickupsticks|0|0|0|0",
		"142|Pizza Hut|0|Fast Food|0|0|pizzahut.com|CA, SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"143|Pollo Campero|0|Fast Food|0|0|campero.com|CA, NEW|0|0|0|0|0|0|0",
		"144|Postal Annex +|0|Shopping and services|0|0|postalannex.com|CA, TX|0|0|0|0|0|0|0",
		"145|Publix|0|Supermarket / Grocery|Pharmacy|Where Shopping is a Pleasure|publix.com|SER, SAT, CA, TX, MAR|0|0|0|0|0|0|0",
		"146|Qdoba Mexican Grill|0|Fast Food|0|0|qdoba.com|CA, SAT, NEW, MAR|0|0|qdoba|mexican|grill|0|0",
		"147|QuikTrip|QT|Gas Station|Convenience Store|0|quiktrip.com|SER, SAT, TX, MAR|0|0|qt|0|0|0|0",
		"148|Quiznos|0|Fast Food|0|0|quiznos.com|CA, SER, SAT, NEW, MAR|0|0|quiznos|subs|0|0|0",
		"149|RadioShack|0|Electronics|0|0|radioshack.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"150|Raley's|0|Supermarket / Grocery|0|0|raleys.com|CA, TX|0|0|0|0|0|0|0",
		"151|Ralphs|0|Supermarket / Grocery|0|0|ralphs.com|CA, TX|0|0|0|0|0|0|0",
		"152|Red Lobster|0|Restaurant|0|0|redlobster.com|CA, SER, SAT, MAR|0|0|0|0|0|0|0",
		"153|Red Robin|0|Restaurant|0|0|redrobin.com|CA, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"154|Rent-A-Wreck|0|Car Rental|0|0|rentawreck.com|CA, SAT, TX, NEW, MAR|0|0|rentawreck|0|0|0|0",
		"155|Rite Aid Pharmacy|0|Pharmacy|Convenience Store|0|riteaid.com|CA, SAT, TX, NEW, MAR|0|0|riteaid|drugstore|0|0|0",
		"156|Robeks|0|Fast Food|0|Fresh Juices & Smoothies|robeks.com|CA,|0|0|0|0|0|0|0",
		"157|Romano's Macaroni Grill|0|Restaurant|0|0|macaronigrill.com|CA, SAT, TX, NEW, MAR|0|0|macaronigrill|0|0|0|0",
		"158|Roscoe's House of Chicken 'N Waffles|0|Restaurant|0|0|roscoeschickenandwaffles.com|CA,|0|0|roscoeschickennwaffles, roscoeschickenwaffles|0|0|0|0",
		"159|Ross Dress for Less|0|Fashion and Clothing|0|0|rossstores.com|CA, SER, SAT, TX, MAR|0|0|ross|0|0|0|0",
		"160|Round Table Pizza|0|Fast Food|0|0|roundtablepizza.com|CA, TX|0|0|roundtable|0|pizza, pizzeria|0|0",
		"161|Rubio's|0|Fast Food|0|0|rubios.com|CA, TX|0|0|0|0|0|0|0",
		"162|Ryan's|0|Restaurant|0|0|ryans.com|SER, SAT, NEW|0|0|0|0|0|0|0",
		"163|Safeway|0|Supermarket / Grocery|0|0|safeway.com|CA, SAT, TX, MAR|0|0|0|0|0|0|0",
		"164|Sam's Club|0|Department Store|0|0|samsclub.com|CA, SAT, TX, NEW, MAR|0|0|samsclub|wholesale|0|0|0",
		"165|Sears|0|Department Store|0|0|sears.com|CA, SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"166|Sephora|0|Personal Care|0|0|sephora.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"167|Shakey's Pizza Parlor|0|Fast Food|0|0|shakeys.com|CA, TX|0|0|shakeys|0|pizza, pizzeria|0|0",
		"168|Shell|0|Gas Station|0|0|shell.us/products-services/shell-for-motorists/station-locator.html|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"169|Sizzler|0|Restaurant|0|0|sizzler.com|CA, SER,|0|0|sizzler|grill|0|0|0",
		"170|Smart and Final|0|Supermarket / Grocery|0|0|smartandfinal.com|CA,|0|0|0|0|0|0|0",
		"171|Sonic Drive-In|0|Fast Food|0|0|sonicdrivein.com|CA, SER, SAT, NEW, MAR|0|0|sonic|drivethru|0|0|0",
		"172|Speedway|0|Gas Station|Convenience Store|0|speedway.com|SER, OH, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"173|Sport Chalet|0|Sporting Goods|0|0|sportchalet.com|CA, TX, MAR|0|0|0|0|0|0|0",
		"174|Sports Authority|0|Sporting Goods|0|0|sportsauthority.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"175|Sprouts Farmers Market|0|Supermarket / Grocery|0|0|sprouts.com|CA, TX|0|0|sprouts|market|0|0|0",
		"176|Starbucks|0|Coffee Shop|0|0|starbucks.com|CA, SER, SAT, TX, NEW, MAR|0|0|starbucks|coffee|0|0|0",
		"177|Stater Bros|0|Supermarket / Grocery|0|0|staterbros.com|CA,|0|0|staterbrothers|0|0|0|0",
		"178|SUBWAY|0|Fast Food|0|0|subway.com|CA, SER, SAT, TX, NEW, MAR|0|0|subway|sandwiches|0|0|0",
		"179|Sunoco|0|Gas Station|0|0|sunoco.com|SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"180|Supercuts|0|Personal Care|0|Haircuts|supercuts.com|CA, SER, SAT, TX, NEW, MAR|0|0|supercuts|salon|0|0|0",
		"181|Taco Bell|0|Fast Food|0|0|tacobell.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"182|Target|0|Department Store|0|0|target.com|SWR, SER, SAT, TX, NEW, MAR|0|0|supertarget|0|0|0|0",
		"183|Texas Roadhouse|0|Restaurant|0|0|texasroadhouse.com|CA, SER, SAT, TX, NEW, MAR|0|0|texasroadhouse|bar, grill|0|0|0",
		"184|TGI Friday's|0|Restaurant|0|0|tgifridays.com|SWR, SER, SAT, TX, NEW, MAR|0|0|TGIF|bar, grill|0|0|0",
		"185|The Coffee Bean & Tea Leaf|0|Coffee shop|0|0|coffeebean.com|SWR, TX, SER|0|0|0|0|0|http://locations.coffeebean.com/#/map|no easy way to see url",
		"186|The Counter|0|Fast Food|0|Burgers|thecounterburger.com|CA, TX|0|0|counterburger|0|0|0|0",
		"187|The Habit Burger Grill|0|Fast Food|0|0|habitburger.com|CA, TX|0|0|habit|burger|grill|0|0",
		"188|The Home Depot|0|Hardware Store|0|0|homedepot.com|SWR, SER, SAT, TX, NEW, MAR|Yes|0|0|0|0|0|0",
		"189|The Old Spaghetti Factory|0|Restaurant|0|0|osf.com|SWR, TX, SAT|0|0|0|0|0|0|0",
		"190|The Original Pancake House|0|Restaurant|0|0|originalpancakehouse.com|CA, SAT, TX|0|0|0|0|0|0|0",
		"191|The Ritz-Carlton|0|Hotel|0|0|ritzcarlton.com|CA, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"192|The UPS Store|0|Shopping and services|0|For packing, shipping, printing and business service needs.|theupsstore.com|SER, SAT, TX, NEW, MAR|0|1|ups|0|0|0|0",
		"193|Tilly's|0|Fashion and Clothing|0|0|tillys.com|CA, TX, NEW, MAR|0|0|0|0|0|0|0",
		"194|TJ Maxx|0|Fashion and Clothing|0|0|tjmaxx.com|CA, SER, SAT, TX, NEW, MAR|0|0|tjmax|0|0|0|0",
		"195|Togo's|0|Fast Food|0|Sub sandwiches|togos.com|CA, TX|0|0|0|0|0|0|0",
		"196|Tony Roma's|0|Restaurant|0|0|tonyromas.com|CA, TX, MAR|0|0|tonyroma|0|0|0|0",
		"197|Total Wine & More|0|Supermarket / Grocery|0|Wine, Beer, Liquor|totalwine.com|CA, SAT, TX, MAR|0|0|totalwine|0|0|0|0",
		"198|Toys R Us|Babies R Us|Toy Store|0|0|toysrus.com|CA, SER, SAT, NEW, MAR|0|1|toysareus|0|0|0|0",
		"199|Trader Joe's|0|Supermarket / Grocery|0|0|traderjoes.com|CA, SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"200|ULTA|0|Personal Care|0|0|ulta.com|CA, SER, SAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"201|UPS|United Parcel Service|Shopping and services|0|0|ups.com|SER, SAT, TX, NEW, MAR|0|1|unitedparcelservice|0|0|0|0",
		"202|Valero|0|Gas Station|0|0|valero.com/Stores/Pages/Home.aspx|CA, SER, nSAT, TX, NEW, MAR|0|0|0|0|0|0|0",
		"203|VeggieGrill|0|Fast Food|0|Vegan|veggiegrill.com|CA, TX|0|0|0|0|0|0|0",
		"204|Vons|0|Supermarket / Grocery|0|0|vons.com|CA, TX, MAR|0|0|0|0|0|0|0",
		"205|Wahoo's Fish Taco|0|Fast Food|0|0|wahoos.com|CA,|0|0|wahoos|fish|tacos|0|0",
		"206|Walgreens|0|Pharmacy|Convenience Store|0|walgreens.com|CA, SER, SAT, TX, NEW, MAR|0|0|walgreens|pharmacy|photo|0|0",
		"207|Walmart|0|Department Store|Supermarket / Grocery|0|walmart.com|CA, SAT, TX, NEW, MAR|0|1|walmart|superstore|0|http://www.walmart.com/store/finder?location=St%20Petersburg,%20FL&distance=25|0",
		"208|Walmart|0|Department Store|0|0|walmart.com|SER|0|1|0|0|0|http://www.walmart.com/store/finder?location=St%20Petersburg,%20FL&distance=25|0",
		"209|Wells Fargo Bank|0|Bank / Financial|ATM|0|wellsfargo.com|SWR, SER, SAT, TX, NEW, MAR|0|0|wellsfargo|0|0|0|0",
		"210|Wendy's|0|Fast Food|0|0|wendys.com|CA, SER, SAT, NEW, MAR|0|0|wendys|burgers|0|0|0",
		"211|Western Bagel|0|Bakery|Fast Food|0|westernbagel.com|CA, TX|0|0|0|0|0|0|0",
		"212|Whole Foods Market|0|Supermarket / Grocery|0|0|wholefoodsmarket.com|CA, SER, SAT, TX, NEW, MAR|0|0|wholefoods|0|0|0|0",
		"213|WinCo Foods|0|Supermarket / Grocery|0|0|wincofoods.com|CA, TX|0|0|winco|0|0|0|0",
		"214|World|0|Gas Station|0|0|0|CA, TX|0|0|0|0|0|0|0",
		"215|Yard House|0|Restaurant|Bar|0|yardhouse.com|CA, NEW, MAR|0|0|0|0|0|0|0",
		"216|Yoshinoya|0|Fast Food|0|0|yoshinoyaamerica.com|CA,|0|0|0|0|0|0|0",
		"217|Youfit|0|Gym / Fitness|0|1-888-968-3481|youfit.com|AZ, CA, CO, LA, MS, RI, VA, SER, SAT, TX, MAR|0|0|0|0|0|0|0",
		"218|Yum Yum Donuts|0|Fast Food|0|Open 24 hours|yumyumdonuts.com|CA, TX|0|0|yumyum|donuts|0|0|0",
		"219|ZZ Test Delaware|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"220|ZZ Test Iowa|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"221|ZZ Test Kentucky|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"222|ZZ Test Maine|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"223|ZZ Test Michigan|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"224|ZZ Test Nationwide|0|0|0|0|0|0|Yes|0|0|0|0|0|0",
		"225|ZZ Test North Carolina|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"226|ZZ Test Virginia|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"227|ZZTest Montana|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"228|ZZTest Oklahoma|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"229|ZZTest Puerto Rico|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"230|Manny's Original Chophouse|0|Restaurant|Bar|You've Found the Best Place!|mannyschophouse.com|SER|No|0|mannys|original|chophouse|0|0",
		"231|Holiday Inn|0|Hotel|0|0|ihg.com|SER, SAT, MAR|0|0|0|0|0|0|0",
		"232|Holiday Inn & Suites|Holiday Inn and Suites|Hotel|0|0|ihg.com|SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"233|Holiday Inn Express|0|Hotel|0|0|ihg.com|SER, SAT, MAR|0|0|0|0|0|0|0",
		"234|Holiday Inn Express & Suites|Holiday Inn Express and Suites|Hotel|0|0|ihg.com|SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"235|Crowne Plaza|0|Hotel|0|0|crowneplaza.com|SER, SAT, NEW, MAR|0|0|0|0|0|http://www.ihg.com/crowneplaza/hotels/us/en/reservation|https://www.ihg.com/crowneplaza/hotels/us/en/reservation/searchresult?qRef=df&qDest=St.%2BPetersburg%252C%2BFlorida%252C%2BUnited%2BStates&qRpn=1&qChld=0&qAAR=6CBARC&qSrt=sBR&qSHp=1&qSmP=3&qGRM=0&qLng=0&qRms=1&srb_u=1&qAdlt=1&qPSt=0&qRtP=6CBARC&qCiMy=102015&qCoD=09&qLat=0&qCiD=08&qCoMy=102015&qRRSrt=rt&qRpp=12&qBrs=hi.ex.rs.ic.cp.in.sb.cw.cv.6c.vn.ul&qWch=0",
		"236|Holiday Inn Resort|0|Hotel|0|0|ihg.com|SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"237|Hotel Indigo|0|Hotel|0|0|ihg.com|SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"238|Staybridge Suites|0|Hotel|0|0|ihg.com|SER, SAT, MAR|0|0|0|0|0|0|0",
		"239|Candlewood Suites|0|Hotel|0|0|candlewoodsuites.com|SER, SAT, NEW, MAR|0|0|0|0|0|http://www.ihg.com/candlewood/content/us/en/exp/main|0",
		"240|EVEN Hotel|0|Hotel|0|0|evenhotel.com|, NEW, MAR|0|0|0|0|0|0|0",
		"241|Sam's Club|0|Supermarket / Grocery|0|0|samsclub.com|SER|0|1|samsclub|wholesale|0|0|0",
		"242|Brookshire's|0|Supermarket / Grocery|0|0|brookshires.com|TX, AR, LA|0|0|0|0|0|http://brookshires.mywebgrocer.com/Stores/|0",
		"243|Raising Cane's|0|Fast Food|0|0|raisingcanes.com|TX, LA, SER, SAT, NEW|0|0|raisingcains|0|0|0|0",
		"244|HEB|H-E-B|Supermarket / Grocery|0|0|heb.com|TX|0|1|0|0|0|0|0",
		"245|Books-A-Million|0|Bookstore|0|0|booksamillion.com|TX, OK, LA, MS, SER, SAT, NEW, MAR|0|0|0|0|0|http://www.booksamillion.com/storefinder?id=6469506579022|0",
		"246|Chuy's|0|Restaurant|0|0|chuys.com|TX, OK, LA, SER, MAR|0|0|0|grill|0|https://www.chuys.com/locations|no easy way to see url",
		"247|Chicken Express|0|Fast Food|0|0|chickene.com|TX, OK, LA, SER|0|0|0|0|0|http://www.chickene.com/locations/store_locator.php|0",
		"248|Super 1 Foods|0|Supermarket / Grocery|0|0|super1foods.com|TX, LA, AR|0|0|superonefoods|0|0|0|0",
		"249|Einstein Bros Bagels|0|Fast Food|0|0|einsteinbros.com|SER, SAT, SWR, NEW, MAR|0|0|einsteinbros, einsteinbrothers|bagels|0|http://www.einsteinbros.com/locator|0",
		"250|Steak 'n Shake|Steak and Shake|Fast Food|Restaurant|0|steaknshake.com|TX, OK, LA, MS, SER, SAT, MAR|0|0|steakshake|0|0|0|0",
		"251|Pappadeaux Seafood Kitchen|Pappadeaux's|Restaurant|0|0|pappadeaux.com|TX, SER, MAR|0|0|pappadeaux, papadeaux, pappadeauxs|seafood|kitchen|0|0",
		"252|Salsarita's|0|Fast Food|0|0|salsaritas.com|TX, MS, SER, SAT|0|0|0|0|0|0|0",
		"253|Newk's|0|Restaurant|0|0|newks.com|TX, LA, MS, SER, MAR|0|0|0|0|0|0|0",
		"254|Academy Sports & Outdoors|0|Sporting Goods|Fashion and Clothing|0|academy.com|TX, OK, LA, MS, SER, SAT, MAR|0|0|academysports|0|0|http://www.academy.com/shop/storelocator|0",
		"255|Sam's Club Gas|0|Gas Station|0|0|samsclub.com|TX, SER, SAT, NEW, MAR|0|1|0|0|0|0|0",
		"256|Brookshire's Fuel Center|0|Gas Station|0|0|brookshires.com/explore/departments/fuel-center|TX|0|1|brookshiresgas|0|0|http://brookshires.mywebgrocer.com/Stores/Cir/Filter?Services=Fuel|0",
		"257|Murphy USA|0|Gas Station|Convenience Store|0|murphyusa.com|TX, OK, LA, MS, SER, SAT, MAR|0|0|0|0|0|0|0",
		"258|Dillard's|0|Department Store|Fashion and Clothing|0|dillards.com|TX, OK, LA, MS, SER, SAT, MAR|0|0|0|0|0|http://www.dillards.com/shop/StoreLocatorView?catalogId=301&langId=-1&storeId=301&cm_sp=EspotFooterBar-_-StoreLocator-_-TextLink0212|Store Listing",
		"259|JCPenney|0|Department Store|Fashion and Clothing|0|jcpenney.com|TX, OK, LA, MS, SAT, SER, NEW, MAR|0|0|jcpenneys, jcpenny|0|0|0|0",
		"260|HEB Gas|H-E-B Gas|Gas Station|0|0|heb.com|TX|0|1|0|0|0|0|0",
		"261|Cowboy Chicken|0|Fast Food|0|0|cowboychicken.com|TX, SER|0|0|0|0|0|http://www.cowboychicken.com/locations/|Store Listing",
		"262|Smashburger|0|Fast Food|0|0|smashburger.com|TX, OK, LA, SER, SAT, NEW, MAR|0|0|0|0|0|0|0",
		"263|El Fenix|0|Restaurant|0|0|elfenix.com|TX, OK|0|0|0|0|0|http://elfenix.com/locations/|0",
		"264|On The Border|0|Restaurant|0|0|home.ontheborder.com|TX, OK, LA, SER, NEW, MAR|0|0|0|0|0|0|0",
		"265|Cheddar's|0|Restaurant|0|0|cheddars.com|TX, SER, SAT, MAR|0|0|0|0|0|http://cheddars.com/locations/|0",
		"266|Babies R Us|0|Toy Store|0|0|babiesrus.com|SER, SAT, NEW, MAR|0|1|0|0|0|http://www.toysrus.com/storeLocator/index.jsp|0",
		"267|BB&T|BBT, BB and T|Bank / Financial|ATM|0|bbt.com|SAT, SER, MAR|0|0|bbt, bbandt|0|0|http://www.bbt.com/bbtdotcom/locator/search.page|0",
		"75|Gelson's|0|Supermarket / Grocery|0|0|gelsons.com|CA, TX|0|0|0|0|0|0|0",
		"269|World Market|Cost Plus World Market|Department Store|Market|0|worldmarket.com|SAT, SER, MAR|0|1|costplus|world|market|http://www.worldmarket.com/store-locator.do?eslSearchInput1=City+Name%2C+State&eslSearchButton1.x=0&eslSearchButton1.y=0&method=viewSearchPage|http://www.worldmarket.com/store-locator.do?eslSearchInput1=City+Name%2C+State&eslSearchButton1.x=0&eslSearchButton1.y=0&method=viewSearchPage",
		"270|Great Clips|0|Personal Care|0|Haircuts|greatclips.com|SAT, SER, NEW, MAR|0|0|0|0|0|0|0",
		"271|TD Bank|0|Bank / Financial|ATM|0|tdbank.com|SAT, SER, NEW, MAR|0|0|0|0|0|0|0",
		"272|Lizard's Thicket|0|Restaurant|0|0|lizardsthicket.com|SAT|0|0|0|0|0|0|0",
		"273|First Citizens Bank|0|Bank / Financial|ATM|0|firstcitizensonline.com|SAT, SER, MAR|0|0|firstcitizens|0|0|0|0",
		"274|South State Bank|0|Bank / Financial|0|0|southstatebank.com|SAT, SER|0|0|southstate|0|0|0|0",
		"275|Waffle House|0|Fast Food|0|0|wafflehouse.com|SAT, SER, MAR|0|0|0|0|0|0|0",
		"276|Hardee's|0|Fast Food|0|0|hardees.com|SAT, SER, MAR|0|0|0|0|0|0|0",
		"277|Bojangles'|0|Fast Food|0|0|bojangles.com|SAT, SER, MAR|0|0|0|0|0|http://www.bojangles.com/locator|0",
		"278|Popeyes Louisiana Kitchen|0|Fast Food|0|0|popeyes.com|SAT, SER, NEW, MAR|0|0|popeyes|louisiana|kitchen|0|0",
		"279|Cook-Out|0|Fast Food|0|0|cookoutnc.com|SAT, SER, MAR|0|0|0|0|0|http://cookoutnc.com/index.php?action=locations|0",
		"280|Schlotzsky's|0|Fast Food|0|0|schlotzskys.com|SAT, SER, MAR|0|0|shlotzskys, schlotskys|0|0|0|0",
		"281|Zaxby's|0|Fast Food|0|0|zaxbys.com|SAT, SER, MAR|0|0|0|0|0|0|0",
		"282|Jimmy John's|0|Fast Food|0|0|jimmyjohns.com|SAT, SER, NEW, MAR|0|0|jimmyjohns|subs|0|0|0",
		"283|LongHorn Steakhouse|0|Restaurant|0|0|longhornsteakhouse.com|SAT, SER, NEW, MAR|0|0|longhorn|0|0|0|0",
		"284|BI-LO|0|Supermarket / Grocery|0|0|bi-lo.com|SAT, SER|0|0|0|0|0|https://www.bi-lo.com/Locator|0",
		"285|Piggly Wiggly|0|Supermarket / Grocery|0|0|pigglywiggly.com|SAT, SER|0|0|0|0|0|0|0",
		"286|IGA|0|Supermarket / Grocery|0|0|iga.com|SAT, SER, MAR|0|0|0|0|0|0|0",
		"287|Save-A-Lot|0|Supermarket / Grocery|0|0|save-a-lot.com|SAT, SER, NEW|0|0|0|0|0|0|0",
		"288|Harris Teeter|0|Supermarket / Grocery|Pharmacy|0|harristeeter.com|SAT, SER, MAR|0|0|0|0|0|0|0",
		"289|Food Lion|0|Supermarket / Grocery|0|0|foodlion.com|SAT, SER, MAR|0|0|0|0|0|0|0",
		"290|Earth Fare|0|Supermarket / Grocery|0|0|earthfare.com|SAT, SER|0|0|0|0|0|0|0",
		"291|Walmart Neighborhood Market|0|Supermarket / Grocery|0|0|walmart.com|SAT, SER, SWR, MAR|0|1|0|0|0|http://www.walmart.com/store/finder?location=St%20Petersburg,%20FL&distance=25|0",
		"292|Extended Stay America|0|Hotel|0|0|extendedstayamerica.com|SAT, SER, NEW, MAR|0|0|0|0|0|0|0",
		"293|Lowes Foods|0|Supermarket / Grocery|0|0|lowesfoods.com|SAT, MAR|0|1|0|0|0|0|0",
		"294|Rush's|0|Fast Food|0|0|rushs.net|SAT|0|0|0|0|0|0|0",
		"295|Buc-ee's|Bucees|Gas Station|Fast Food|0|buc-ees.com|TX|0|0|0|0|0|https://www.buc-ees.com/locations.php|0",
		"296|Ace Hardware|0|Hardware Store|0|0|acehardware.com|SAT, SER, SWR, NEW, MAR|0|0|0|0|0|http://www.acehardware.com/mystore/storeLocator.jsp|0",
		"297|Howard Johnson|HoJo|Hotel|0|0|hojo.com|SAT, SER, NEW, MAR|0|0|0|0|0|0|0",
		"298|Conway National Bank|CNB|Bank / Financial|0|0|conwaynationalbank.com|SAT|0|0|0|0|0|http://conwaynationalbank.com/locations_hours_h.cfm|0",
		"299|Church's Chicken|0|Fast Food|0|0|churchs.com|SAT, SER, SWR, MAR|0|0|churchs|0|0|http://churchslocator.nextxnow.com/|no easy way to see url",
		"300|Pepper Palace|0|Shopping and services|0|0|pepperpalace.com|SAT, SER, NEW|0|0|0|0|0|0|0",
		"301|Ingles|0|Supermarket / Grocery|0|0|ingles-markets.com|SAT, SER|0|0|0|0|0|0|0",
		"302|Ruby Tuesday|0|Restaurant|0|0|rubytuesday.com|SAT, SER, AZ, NV, NEW, MAR|0|0|rubytuesdays|0|0|0|0",
		"303|Marco's Pizza|0|Fast Food|0|0|marcos.com|SAT, SER, CA, AZ, UT|0|0|marcos|0|pizza, pizzeria|0|0",
		"304|Vitamin Shoppe|0|Personal Care|0|0|vitaminshoppe.com|SAT. SER, SWR, NEW, MAR|0|0|vitaminshop|0|0|0|0",
		"305|Chicken Salad Chick|0|Restaurant|0|0|chickensaladchick.com|SAT, SER|0|0|chickensaladchic|0|0|http://www.chickensaladchick.com/store-locator|0",
		"306|GNC|General Nutrition Centers|Personal Care|0|0|GNC.com|SAT, SER, SWR, SCR, NEW, MAR|0|0|generalnutritioncenters,generalnutritioncenter|0|0|0|0",
		"307|Miyo's|0|Restaurant|0|0|miyos.com|SAT, MAR|0|0|0|0|0|0|0",
		"308|Mellow Mushroom|0|Restaurant|0|0|mellowmushroom.com|SAT, SER, MAR|0|0|mellowmushroom|0|pizza, pizzeria|0|0",
		"309|Belk|0|Department Store|Fashion and Clothing|0|belk.com|SAT, SER, MAR|0|0|0|0|0|http://www.belk.com/AST/Misc/Belk_Stores/Store_Locator.jsp|0",
		"310|Von Maur|0|Department Store|Fashion and Clothing|0|vonmaur.com|SAT, SER, MAR|0|0|0|0|0|0|0",
		"311|Fatz Cafe|0|Restaurant|0|0|fatz.com|SAT, SER, MAR|0|0|fatz|0|0|0|0",
		"312|Au Bon Pain|0|Restaurant|0|0|aubonpain.com|SAT, SER, CA , NEW, MAR|0|0|0|0|0|http://aubonpain.com/search|0",
		"313|Back Yard Burgers|Backyard Burgers|Fast Food|0|0|backyardburgers.com|SAT, SER|0|0|0|0|0|http://www.backyardburgers.com/locations|0",
		"314|Beef 'O' Brady's|Beef's|Restaurant|Bar|0|beefobradys.com|SAT, SER, MAR|0|0|beefobrady, beefs|0|0|http://locationstogo.com/beefs/|0",
		"315|Captain D's|0|Fast Food|0|0|captainds.com|SAT, SER|0|0|0|0|0|http://captainds.com/locations/|0",
		"316|Donato's|0|Fast Food|0|0|donatos.com|SAT, SER|0|0|0|0|0|0|0",
		"317|Huddle House|0|Fast Food|0|0|huddlehouse.com|SAT, SER, MAR|0|0|0|0|0|0|0",
		"318|Cracker Barrel|0|Restaurant|Gifts|0|crackerbarrel.com|SAT, AZ, CO, UT, SCR,|0|0|0|0|0|http://crackerbarrel.com/locations|http://crackerbarrel.com/locations?query=City%20Name,%20State",
		"319|Costco Gasoline|0|Gas Station|0|0|costco.com/gasoline.html|SWR, SER, SAT, NEW, MAR|0|1|0|0|0|http://www.costco.com/warehouse-locations?&hasGas=true|http://www.costco.com/warehouse-locations?location=City+Name%2C+State&hasGas=true",
		"320|BurgerFi|0|Fast Food|0|0|burgerfi.com|SER, SAT|0|0|0|0|0|http://burgerfi.com/locations/|0",
		"321|White Castle|0|Fast Food|0|0|whitecastle.com|SAT, MAR|0|0|whitecastle|burgers|0|0|0",
		"322|Hallmark|0|Gifts|0|0|hallmark.com|SAT, NEW, MAR|0|0|hallmark|store|0|0|0",
		"323|Dick's Sporting Goods|0|Sporting Goods|0|0|dickssportinggoods.com|SWR, SAT, SCR, NEW, MAR, SER|0|0|0|0|0|http://www.dickssportinggoods.com/storeLocator/index.jsp?ab=Header_FindAStore|no easy way to see url",
		"324|Regions Bank|0|Bank / Financial|ATM|0|regions.com|SER|0|0|regions|0|0|0|0",
		"325|AT&T Company Store|0|Electronics|0|0|att.com|SER, MAR|0|1|ATT|0|0|https://www.att.com/maps/store-locator.html|0",
		"326|AT&T Authorized Reseller|0|Electronics|0|0|att.com|SER, MAR|0|1|ATT|0|0|https://www.att.com/maps/store-locator.html|0",
		"327|Walmart|0|Department Store|Supermarket / Grocery|0|walmart.com|SER, MAR|0|1|walmart|supercenter|0|http://www.walmart.com/store/finder?location=St%20Petersburg,%20FL&distance=25|0",
		"328|99|0|Restaurant|0|0|99restaurants.com|NEW|0|1|0|0|0|http://www.99restaurants.com/all-locations|0",
		"329|A L Prime Energy|0|Gas Station|0|0|alprime.com|NEW|0|0|alprime|0|0|http://alprime.com/storelocator.php|0",
		"330|Advance Auto Parts|0|Car Services|0|0|shop.advanceautoparts.com|NEW, SAT, MAR|0|0|0|0|0|http://shop.advanceautoparts.com/web/StoreLocatorView?storeId=10151&|0",
		"331|Ben & Jerry's|0|Ice Cream|0|0|benjerry.com|NEW, SWR, MAR, SER|0|0|benjerrys|icecream|0|http://www.benjerry.com/scoop-shops|0",
		"332|Benny's|0|Department Store|0|0|hellobennys.com|NEW|0|0|hellobennys|0|0|http://hellobennys.com/locations/|0",
		"333|Bertucci's|0|Restaurant|0|0|bertuccis.com|NEW, MAR|0|0|0|0|0|http://bertuccis.com/locations/false|0",
		"334|BJ's Gas|0|Gas Station|0|0|bjs.com|NEW, MAR, SER|0|1|0|0|0|http://www.bjs.com/webapp/wcs/stores/servlet/LocatorIndexView|0",
		"335|BJ's Wholesale Club|0|Department Store|0|Club Wholesaler|bjs.com|NEW, MAR, SER|0|0|bjs|wholesale|club|http://www.bjs.com/webapp/wcs/stores/servlet/LocatorIndexView|0",
		"336|BP|0|Gas Station|0|0|mybpstation.com/|NEW, MAR, SER|0|0|0|0|0|https://mybpstation.com/station-finder|0",
		"337|Bruegger's Bagels|0|Fast Food|0|0|brueggers.com|NEW, SER|0|0|brueggers|0|0|https://www.brueggers.com/locations/|0",
		"338|Christmas Tree Shop|0|Department Store|0|0|christmastreeshops.com|NEW, MAR, SER|0|0|0|0|0|http://www.christmastreeshops.com/store-locator/landing.do|http://www.christmastreeshops.com/store-locator.do?eslSearchInput1=St+Petersburg%2C+Florida&eslSearchButton1.x=0&eslSearchButton1.y=0&method=viewSearchPage",
		"339|Circle K|0|Gas Station|Convenience Store|0|circlek.com|NEW, MAR, SER|0|1|0|0|0|http://www.circlek.com/store-locator?language=en|0",
		"340|Citgo|0|Gas Station|0|0|citgo.com|NEW, MAR, SER|0|0|0|0|0|http://citgo.com/Locator/StoreLocator.jsp|0",
		"341|Citizens Bank|0|Bank / Financial|ATM|0|citizensbank.com|NEW, SER, MAR|0|0|0|0|0|https://www.citizensbank.com/branchlocator/|https://www.citizensbank.com/branchlocator/?search=St%20Petersburg%2C%20Florida",
		"342|Clover Food Lab|0|Fast Food|0|0|cloverfoodlab.com|NEW|0|0|0|0|0|https://www.cloverfoodlab.com/location-and-hours/|Store Listing",
		"343|Cumberland Farms|0|Gas Station|Convenience Store|0|cumberlandfarms.com|NEW, SER|0|0|0|0|0|https://www.cumberlandfarms.com/stores|no easy way to see url",
		"344|D'Angelo's|0|Fast Food|0|0|dangelos.com|NEW|0|0|0|0|0|http://dangelos.com/locations/all|no easy way to see url",
		"345|Dave & Buster's|Dave and Buster's, D&B, D & B|Restaurant|Game Club|0|daveandbusters.com/|NEW, MAR, SER|0|0|0|0|0|http://www.daveandbusters.com/locations/alllocations.aspx|http://www.daveandbusters.com/locations/default.aspx?search=Atlanta%2c+Georgia",
		"346|Eastern Bank|0|Bank / Financial|0|0|easternbank.com|NEW|0|0|0|0|0|https://www.easternbank.com/site/corporate_pages/Pages/office_locations.aspx|Store Listing",
		"347|Eastern Mountain Sports|EMS|Sporting Goods|0|0|ems.com|NEW, MAR|0|1|EMS|0|0|http://www.ems.com/store-locator|0",
		"348|Elena's Cafe|0|Fast Food|Coffee shop|0|elenascafe.com|NEW|0|0|0|0|0|http://www.elenascafe.com/content/contact.html|0",
		"349|Family Dollar|0|Department Store|0|0|familydollar.com|NEW, MAR|0|0|0|0|0|0|0",
		"350|Finagle a Bagel|0|Fast Food|0|0|finagleabagel.com|NEW|0|0|0|0|0|0|0",
		"351|Friendly's|0|Restaurant|Ice Cream|0|friendlys.com/|NEW, MAR|0|0|0|0|0|0|0",
		"352|FroyoWorld|0|Ice Cream|0|Frozen yogurt|froyoworld.com/|NEW, MAR|0|0|0|0|0|0|0",
		"353|Fuddruckers|0|Restaurant|0|0|fuddruckers.com/|NEW, MAR|0|0|0|0|0|0|0",
		"354|Gymboree|0|Fashion and Clothing|0|Clothing for kids|gymboree.com/|NEW, SWR, MAR|0|0|0|0|0|0|0",
		"355|Hannaford|0|Supermarket / Grocery|0|0|hannaford.com|NEW|0|0|0|0|0|0|0",
		"356|Hess|0|Gas Station|0|Rebranding to Speedway|speedway.com|NEW, MAR|0|1|0|0|0|0|0",
		"357|Hobby Lobby|0|Arts & Crafts|0|0|hobbylobby.com|NEW, SWR, MAR|0|0|0|0|0|0|0",
		"358|Honey Dew Donuts|Honeydew Donuts|Fast Food|0|0|honeydewdonuts.com/|NEW|0|0|0|0|0|0|0",
		"359|IKEA|0|Furniture / Home Store|0|0|ikea.com/|NEW, MAR|0|0|0|0|0|0|0",
		"360|Johnny Rockets|0|Restaurant|0|Burgers|johnnyrockets.com|NEW, MAR|0|0|0|0|0|0|0",
		"361|Legal Sea Foods|Legal Seafoods|Restaurant|0|0|legalseafoods.com|NEW, MAR|0|0|0|0|0|0|0",
		"362|Market Basket|0|Supermarket / Grocery|0|0|mydemoulas.net|NEW|0|0|0|0|0|0|0",
		"363|Ocean State Job Lot|0|Shopping and services|0|0|oceanstatejoblot.com|NEW|0|0|0|0|0|0|0",
		"364|Osco|0|Pharmacy|0|0|shawsoscopharmacies.com|NEW|0|0|0|0|0|0|0",
		"365|Papa Gino's|0|Restaurant|0|Pizza|papaginos.com/|NEW|0|0|0|0|0|0|0",
		"366|Pavilions Pharmacy|0|Pharmacy|0|0|pavilions.com/ShopStores/Pharmacy-Nutrition.page|NEW, MAR|0|1|0|0|0|0|0",
		"367|Pizzeria Regina|0|Fast Food|0|0|reginapizzeria.com/|NEW|0|0|regina|0|pizza, pizzeria|0|0",
		"368|REI|0|Sporting Goods|0|0|rei.com|NEW, SWR, MAR|0|0|0|0|0|0|0",
		"369|Roche Brothers|Roche Bros|Supermarket / Grocery|0|0|rochebros.com/|NEW|0|0|rochebros|0|0|0|0",
		"370|Rockland Trust|0|Bank / Financial|0|0|rocklandtrust.com/|NEW|0|0|0|0|0|0|0",
		"371|Sam's Club Fuel Center|0|Gas Station|0|0|samsclub.com/sams/pagedetails/content.jsp?pageName=fuelCenter|NEW, MAR|0|1|0|0|0|0|0",
		"372|Santander|0|Bank / Financial|0|0|santanderbank.com/us|NEW|0|0|0|0|0|0|0",
		"373|Shaw's|0|Supermarket / Grocery|0|0|shaws.com|NEW|0|0|0|0|0|0|0",
		"374|Staples|0|Department Store|0|0|staples.com|NEW, SWR, MAR|0|0|0|0|0|0|0",
		"375|Star Market|0|Supermarket / Grocery|0|0|starmarket.com/|NEW|0|0|0|0|0|0|0",
		"376|Stop & Shop|Stop and Shop|Supermarket / Grocery|0|0|stopandshop.com|NEW|0|1|0|0|0|0|0",
		"377|Stop & Shop Gas|0|Gas Station|0|0|stopandshop.com|NEW|0|1|0|0|0|0|0",
		"378|Stop & Shop Pharmacy|0|Pharmacy|0|0|stopandshop.com/live-well/pharmacy/|NEW|0|1|0|0|0|0|0",
		"379|Target Pharmacy|0|Pharmacy|0|0|target.com|NEW, MAR|0|1|0|0|0|0|0",
		"380|Tavern in the Square|0|Restaurant|0|0|taverninthesquare.com|NEW|0|0|0|0|0|0|0",
		"381|Tedeschi|0|Convenience Store|0|0|tedeschifoodshops.com/|NEW|0|0|0|0|0|0|0",
		"382|Walmart Pharmacy|0|Pharmacy|0|0|walmart.com/cp/pharmacy/5431|NEW, SER|0|1|0|0|0|http://www.walmart.com/store/finder?location=St%20Petersburg,%20FL&distance=25&services=pharmacy|0",
		"383|Whataburger|0|Fast Food|0|0|whataburger.com|TX, SER, MAR|0|0|0|0|0|0|0",
		"384|Bass Pro Shops|0|Sporting Goods|0|0|basspro.com|MA, NH, SER, MAR|0|0|basspro|0|0|http://www.basspro.com/webapp/wcs/stores/servlet/CFPageC?appID=94&storeId=10151&catalogId=10051&langId=-1&tab=3&tab=3|0",
		"385|My Gym|0|Gym / Fitness|0|Children's Fitness Center|mygymboston.com/|MA|0|0|0|0|0|0|0",
		"386|Jasper White's Summer Shack|0|Restaurant|0|0|summershackrestaurant.com/|CT, MA|0|0|jasperwhites|0|shack|0|0",
		"387|Stone Hearth Pizza|0|Restaurant|0|0|stonehearthpizza.com/|MA|0|0|stonehearth|0|pizza, pizzeria|0|0",
		"388|L.L. Bean|0|Fashion and Clothing|Sporting Goods|0|llbean.com|CT, ME, MA, NH, VT, MAR|0|0|llbean|0|outfitters|0|0",
		"389|Boston Sports Clubs|BSC|Gym / Fitness|0|0|mysportsclubs.com|MA, RI|0|0|bsc|0|0|https://www.mysportsclubs.com/studio/search|0",
		"390|Times Supermarket|0|Supermarket / Grocery|0|0|timessupermarkets.com/|HI|0|0|0|0|0|0|0",
		"391|Big Save|0|Supermarket / Grocery|0|0|bigsavemarkets.mywebgrocer.com/|HI|0|0|0|0|0|http://www.timessupermarkets.com/2013/01/01/our-locations-on-oahu-maui-kauai/?_ga=1.50285222.1266355115.1446926589|0",
		"392|Foodland|0|Supermarket / Grocery|0|0|foodland.com/|HI, MAR|0|0|0|0|0|0|0",
		"393|Sack N Save|0|Supermarket / Grocery|0|0|foodland.com/|HI|0|0|sacksave|0|0|0|0",
		"394|Foodland Farms|0|Supermarket / Grocery|0|0|foodland.com/|HI|0|0|0|0|0|0|0",
		"395|Coffee Bean & Tea Leaf DUPLICATE|see The Coffee Bean & Tea Leaf|0|0|0|0|SWR, SER|0|0|0|0|0|0|0",
		"396|Elephant Bar|0|Restaurant|0|0|elephantbar.com|SWR, SER|0|0|0|0|0|http://www.elephantbar.com/location|0",
		"397|Kobe Japanese Steakhouse|0|Restaurant|Bar|0|kobesteakhouse.com|SER, MAR|0|0|kobe|japanese|steakhouse|0|0",
		"398|Rural King Supply|0|Department Store|Sporting Goods|0|ruralking.com|SER|0|0|0|0|0|0|0",
		"399|Progressive Service Center|0|Garage / Automotive Shop|Car Rental|0|www.progressive.com/claims/concierge-service/|CT, MA, RI, MAR|0|0|0|0|0|0|0",
		"400|0|0|0|0|0|0|0|0|0|0|0|0|0|0",
		"401|Monro Muffler/Brake & Service|0|Garage / Automotive Shop|0|0|www.monro.com|NEW, MAR|0|0|monro|muffler, brakes|service|0|0",
		"402|Ferguson Plumbing|0|Hardware Store|0|0|www.ferguson.com|CT, ME, MA, NH, VT, MAR|0|0|0|0|0|0|0",
		"403|A.C. Moore|0|Arts & Crafts|0|0|acmoore.com|NEW, MAR, SER|0|0|0|0|0|http://www.acmoore.com/storelocator|0",
		"404|Ethan Allen|0|Furniture / Home Store|0|0|ethanallen.com|NEW, MAR, SER|0|0|0|0|0|http://www.ethanallen.com/en_US/stores|0",
		"405|CosmoProf|0|Personal Care|0|0|cosmoprofbeauty.com|NEW, SER|0|0|0|0|0|http://info.cosmoprofbeauty.com/StoreLocator.aspx|no easy way to see url",
		"406|Barnes & Noble|Barnes and Noble|Bookstore|Coffee shop|0|barnesandnoble.com|NEW, SWR, MAR, SER|0|0|barnesnoble|0|booksellers|http://stores.barnesandnoble.com/|0",
		"407|SafeLite AutoGlass|0|Garage / Automotive Shop|0|0|www.safelite.com|NEW, MAR, SER|0|0|safelite|0|0|0|0",
		"408|Atlantic Self Storage|0|Shopping and services|0|0|atlanticselfstorage.com|SER|0|0|atlanticstorage|0|0|https://atlanticselfstorage.com/location/|0",
		"409|Uncle Bob's Self Storage|0|Shopping and services|0|0|www.unclebobs.com|SER|0|0|unclebobsstorage|0|0|0|0",
		"410|Citibank|0|Bank / Financial|ATM|0|citibank.com|SWR, MAR, SER|0|0|0|0|0|https://online.citi.com/US/GCL/citilocator/flow.action?JFP_TOKEN=I67W2I3H|no easy way to see url",
		"411|CorePower Yoga|0|Gym / Fitness|0|0|corepoweryoga.com|SWR, SER|0|0|0|0|0|http://www.corepoweryoga.com/locations/|http://www.corepoweryoga.com/locations/27.8985161,-81.5947526",
		"412|U.S. Bank|0|Bank / Financial|ATM|0|www.usbank.com|SWR, MAR|0|0|0|0|0|0|0",
		"413|Circle K|0|Convenience Store|0|0|circlek.com|SWR, MAR|0|1|0|0|0|http://www.circlek.com/store-locator?language=en|0",
		"414|Bob's Stores|0|Fashion and Clothing|0|Family Apparel and Footwear|www.bobstores.com|NEW|0|0|0|0|0|http://www.bobstores.com/store-locator|0",
		"415|Claire's|0|Jewelry|0|0|claires.com|NEW, HI, SWR, MAR, SER|0|0|0|0|0|http://www.claires.com/us/pws/StoreFinder.ice|http://www.claires.com/us/pws/StoreFinder.ice?findStore=true&latitude=27.7518284&longitude=-82.6267345&maxStores=15",
		"416|Victoria's Secret|0|Fashion and Clothing|0|0|www.victoriassecret.com/|NEW, SWR, HI, MAR|0|0|0|0|0|0|0",
		"417|Charming Charlie|0|Fashion and Clothing|0|0|charmingcharlie.com|CT, ME, MA, NH, MAR, SER|0|0|0|0|0|http://stores.charmingcharlie.com/|0",
		"418|Express|0|Fashion and Clothing|0|0|express.com|NEW, HI, SWR, MAR, SER|0|0|0|0|0|http://www.express.com/storelocator/store-locator.jsp|0",
		"419|Old Navy|0|Fashion and Clothing|0|0|www.oldnavy.com|NEW, HI, SWR, MAR|0|0|0|0|0|0|0",
		"420|Bar Louie|0|Restaurant|Bar|0|www.barlouieamerica.com|MA, RI, MAR, SER|0|0|0|0|0|http://www.barlouieamerica.com/locations.aspx|0",
		"421|Muse Paintbar|0|Arts & Crafts|Bar|0|www.musepaintbar.com|NEW|0|0|0|0|0|0|0",
		"422|U-Haul|Uhaul|Car Rental|Shopping and services|Moving truck Rental|www.uhaul.com|NEW, SER, MAR|0|1|uhaul|truck|0|0|0",
		"423|7 For All Mankind|0|Fashion and Clothing|0|0|7forallmankind.com|HI, MAR, SER|0|0|sevenforallmankind|0|0|http://www.7forallmankind.com/store-locator|0",
		"424|ABC Stores|0|Convenience Store|0|0|abcstores.com|HI|0|0|0|0|0|http://www.abcstores.com/store-locator/|0",
		"425|Abercrombie & Fitch|0|Fashion and Clothing|0|0|abercrombie.com|HI, MAR, SER|0|0|0|0|0|http://www.abercrombie.com/webapp/wcs/stores/servlet/StoreLocator?catalogId=10901&langId=-1&storeId=10051|0",
		"426|Abercrombie Kids|0|Fashion and Clothing|0|0|abercrombiekids.com|HI, MAR, SER|0|0|0|0|0|http://www.abercrombiekids.com/webapp/wcs/stores/servlet/StoreLocator?catalogId=10851&langId=-1&storeId=10101|0",
		"427|Aeropostale|0|Fashion and Clothing|0|0|aeropostale.com|HI, MAR, SER|0|0|0|0|0|http://www.aeropostale.com/storeLocator/index.jsp|0",
		"428|Aldo Shoes|0|Fashion and Clothing|0|0|aldoshoes.com|HI, MAR, SER|0|0|0|0|0|http://www.aldoshoes.com/us/en_US/store-finder|0",
		"429|Aloha Petroleum|Aloha Gas|Gas Station|0|0|alohagas.com|HI|0|0|0|0|0|https://www.alohagas.com/oahu.html|0",
		"430|American Savings Bank|0|Bank / Financial|0|0|asbhawaii.com|HI, MAR|0|0|0|0|0|https://www.asbhawaii.com/find-branch-atm|0",
		"431|Ann Taylor|0|Fashion and Clothing|0|0|anntaylor.com|HI, MAR, SER|0|0|0|0|0|http://www.anntaylor.com/stores.jsp|0",
		"432|Anthropologie|0|Fashion and Clothing|0|0|anthropologie.com|HI, MAR, SER|0|0|0|0|0|https://www.anthropologie.com/anthro/store/store.jsp#/search?viewAll=true|0",
		"433|Apple Store|0|Electronics|0|0|apple.com|HI, MAR, SER|0|0|0|0|0|http://www.apple.com/retail/|0",
		"434|Armani Exchange|0|Fashion and Clothing|0|0|armaniexchange.com|HI, MAR, SER|0|0|0|0|0|http://www.armaniexchange.com/store-locator/landing.do|0",
		"435|AT&T Store|0|Electronics|0|0|att.com|HI, MAR|0|0|0|0|0|https://www.att.com/maps/store-locator.html|0",
		"436|Balenciaga|0|Fashion and Clothing|0|0|balenciaga.com|HI, SER|0|0|0|0|0|http://www.balenciaga.com/experience/us/pages/store-locator/|0",
		"437|Bally|0|Fashion and Clothing|0|0|bally.com|HI, MAR, SER|0|0|0|0|0|http://www.bally.com/en_us/store-locator|0",
		"438|Banana Republic|0|Fashion and Clothing|0|0|bananarepublic.com|HI, MAR, SER|0|0|0|0|0|http://bananarepublic.gap.com/customerService/storeLocator.do|0",
		"439|Bank of Hawaii|0|Bank / Financial|0|0|www.boh.com|HI|0|0|0|0|0|https://www.boh.com/apps/findus/locations/index.asp|0",
		"440|bareMinerals|0|Personal Care|0|0|www.bareescentuals.com|HI, MAR, SER|0|0|0|0|0|http://www.bareescentuals.com/on/demandware.store/Sites-BareEscentuals-Site/en_US/Landing-Show?cid=CA_STORE_LOCATOR|0",
		"441|Bath and Body Works|0|Personal Care|0|0|bathandbodyworks.com|HI, MAR, SER|0|0|0|0|0|http://www.bathandbodyworks.com/corp/index.jsp?page=storeLocator|0",
		"442|bebe|0|Fashion and Clothing|0|0|bebe.com|HI, MAR, SER|0|0|0|0|0|http://www.bebe.com/custserv/locate_store.cmd|0",
		"443|Ben Bridge|0|Shopping and services|0|0|benbridge.com|HI|0|0|0|0|0|http://www.benbridge.com/store-list|0",
		"444|Big Island Candies|0|Shopping and services|0|0|www.bigislandcandies.com|HI|0|0|0|0|0|store listing on main page|0",
		"445|Bloomingdale's|0|Fashion and Clothing|0|0|www.bloomingdales.com|HI, MAR, SER|0|0|0|0|0|http://locations.bloomingdales.com/store-locator|0",
		"446|Brookstone|0|Electronics|0|0|brookstone.com|HI, MAR, SER|0|0|0|0|0|http://www.brookstone.com/store-finder|0",
		"447|Burberry|0|Fashion and Clothing|0|0|www.burberry.com|HI, MAR, SER|0|0|0|0|0|https://us.burberry.com/store-locator/united-states|0",
		"448|Carter's|0|Fashion and Clothing|0|0|carters.com|HI, MAR, SER|0|0|0|0|0|http://www.carters.com/find-a-store|0",
		"449|Cartier|0|Shopping and services|0|0|cartier.com|HI, MAR, SER|0|0|0|0|0|http://www.cartier.us/en-us/find-boutique.html?origin=Header|0",
		"450|Champs Sports|0|Fashion and Clothing|0|0|champssports.com|HI, MAR, SER|0|0|0|0|0|http://www.champssports.com/Store-Locator|0",
		"451|Chanel Boutique|0|Fashion and Clothing|0|0|chanel.com|HI, MAR, SER|0|0|0|0|0|http://www.chanel.com/en_US/#storelocator|0",
		"452|Chapel Hats|0|Fashion and Clothing|0|0|chapelhats.com|HI, SER|0|0|0|0|0|http://www.chapelhats.com/pages/locations.html|0",
		"453|Cinnamon Girl|0|Fashion and Clothing|0|0|www.cinnamongirl.com|HI|0|0|0|0|0|http://www.cinnamongirl.com/pages/store-locations|0",
		"454|Clarks|0|Fashion and Clothing|0|0|clarksusa.com|HI, MAR, SER|0|0|0|0|0|http://www.clarksusa.com/us/store-locator|http://www.clarksusa.com/us/store-locator?status=OK&latitude=27.7518284&longitude=-82.6267345&geocoded=St+Petersburg%2C+FL&q=St+Petersburg%2C+Florida&radius=50&_kids=on&CSRFToken=c58693ea-aceb-488a-a096-010d8c1cd449",
		"455|Coach|0|Fashion and Clothing|0|0|coach.com|HI, MAR, SER|0|0|0|0|0|http://www.coach.com/stores|Store Listing",
		"456|Cole Hann|0|Fashion and Clothing|0|0|colehaan.com|HI, MAR, SER|0|0|0|0|0|http://www.colehaan.com/store-locator|no easy way to see url",
		"457|Crazy Shirts|0|Fashion and Clothing|0|0|crazyshirts.com|HI, SER|0|0|0|0|0|http://www.crazyshirts.com/category/customer+service/our+stores.do|Store Listing",
		"458|Crocs|0|Fashion and Clothing|0|0|crocs.com|HI, MAR, SER|0|0|0|0|0|http://www.crocs.com/crocs-store-locator/stores.html|no easy way to see url",
		"459|Dianne von Furstenberg|0|Fashion and Clothing|0|0|www.dvf.com|HI. SER|0|0|0|0|0|http://www.dvf.com/stores|Store Listing",
		"460|Diesel|0|Fashion and Clothing|0|0|diesel.com|HI, MAR, SER|0|0|0|0|0|http://www.diesel.com/store-locator|Store Listing",
		"461|Disney Store|0|Toy Store|0|0|www.disneystore.com|HI, MAR, SER|0|0|0|0|0|http://www.disneystore.com/disney-store-locator-and-events/mn/1001278/|0",
		"462|Emporio Armani|0|Fashion and Clothing|0|0|armani.com/us/emporioarmani|HI, MAR, SER|0|0|0|0|0|http://storelocator.armani.com/us/|0",
		"463|FedEx Office|Kinkos|Shopping and Services|0|0|www.fedex.com/us/office/|HI, MAR|0|1|0|0|0|0|0",
		"464|First Hawaiian Bank|0|Bank / Financial|0|0|www.fhb.com|HI|0|0|0|0|0|0|0",
		"465|Footlocker|0|Fashion and Clothing|0|0|www.footlocker.com|HI, MAR|0|0|0|0|0|0|0",
		"466|Forever 21|0|Fashion and Clothing|0|0|www.forever21.com|HI, MAR|0|0|0|0|0|0|0",
		"467|Fossil|0|Fashion and Clothing|0|0|www.fossil.com|HI, MAR|0|0|0|0|0|0|0",
		"468|Gap|0|Fashion and Clothing|0|0|www.gap.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"469|Gap Factory Store|0|Fashion and Clothing|0|0|www.gap.com|MAR|0|0|0|0|0|0|0",
		"470|Gap Kids|0|Fashion and Clothing|0|0|www.gap.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"471|Genki Sushi|0|Restaurant|0|0|www.genkisushiusa.com|HI|0|0|0|0|0|0|0",
		"472|Gloria Jeans|0|Coffee Shop|0|0|www.gloriajeans.com|HI|0|0|0|0|0|0|0",
		"473|Gucci|0|Fashion and Clothing|0|0|www.gucci.com|HI, MAR|0|0|0|0|0|0|0",
		"474|Guess|0|Fashion and Clothing|0|0|www.guess.com|HI, MAR|0|0|0|0|0|0|0",
		"475|H&M|0|Fashion and Clothing|0|0|www.hm.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"476|Harry Winston|0|Fashion and Clothing|0|0|www.harrywinston.com|HI, MAR|0|0|0|0|0|0|0",
		"477|Hawaii State Federal Credit Union|0|Bank / Financial|0|0|www.hsfcu.com|HI|0|0|0|0|0|0|0",
		"478|Hawaii USA Federal Credit Union|0|Bank / Financial|0|0|www.hawaiiusafcu.com|HI|0|0|0|0|0|0|0",
		"479|Hawaiian Island Creations|0|Fashion and Clothing|0|0|www.hic.com|HI|0|0|0|0|0|0|0",
		"480|Hermes|0|Fashion and Clothing|0|0|www.hermes.com|HI, MAR|0|0|0|0|0|0|0",
		"481|Hilo Hattie|0|Fashion and Clothing|0|0|www.hilohattie.com|HI|0|0|0|0|0|0|0",
		"482|Hollister|0|Fashion and Clothing|0|0|www.hollisterco.com|HI, MAR|0|0|0|0|0|0|0",
		"483|Home Street Bank|0|Bank / Financial|0|0|www.homestreet.com|HI|0|0|0|0|0|0|0",
		"484|Hot Topic|0|Fashion and Clothing|0|0|www.hottopic.com|HI, MAR|0|0|0|0|0|0|0",
		"485|Islands Burgers|0|Restaurant|0|0|www.islandsrestaurants.com|HI|0|0|0|0|0|0|0",
		"486|J Crew|0|Fashion and Clothing|0|0|www.jcrew.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"487|Jeans Wearhouse|0|Fashion and Clothing|0|0|www.jeanswarehousehawaii.com|HI|0|0|0|0|0|0|0",
		"488|Jimmy Buffet's Margaritaville|0|Restaurant|0|0|www.margaritaville.com|HI, MAR|0|0|margaritaville|0|0|0|0",
		"489|Jimmy Choo|0|Fashion and Clothing|0|0|us.jimmychoo.com|HI, MAR|0|0|0|0|0|0|0",
		"490|Journeys|0|Fashion and Clothing|0|0|www.journeys.com|HI, MAR|0|0|0|0|0|0|0",
		"491|Kahala Sportswear|Kahala|Fashion and Clothing|0|0|www.kahala.com|HI|0|0|0|0|0|0|0",
		"492|kate spade new york|0|Fashion and Clothing|0|0|www.katespade.com|HI, MAR|0|0|katespade|0|0|0|0",
		"493|Kay Jewelers|0|Jewelry|0|0|kay.com|HI, MAR, SER|0|0|0|0|0|0|0",
		"494|Kids Footlocker|0|Fashion and Clothing|0|0|www.kidsfootlocker.com|HI, MAR|0|0|footlockerkids|0|0|0|0",
		"495|Kipling|0|Fashion and Clothing|0|0|www.kipling-usa.com|HI|0|0|0|0|0|0|0",
		"496|Kit and Ace|0|Fashion and Clothing|0|0|www.kitandace.com|HI|0|0|0|0|0|0|0",
		"497|Lacoste|0|Fashion and Clothing|0|0|www.lacoste.com|HI, MAR|0|0|0|0|0|0|0",
		"498|Lady Footlocker|0|Fashion and Clothing|0|0|www.ladyfootlocker.com|HI, MAR|0|0|footlockerlady|0|0|0|0",
		"499|LEGO Store|0|Toy Store|0|0|www.lego.com|HI, MAR|0|0|0|0|0|0|0",
		"500|LensCrafters|0|Personal Care|0|0|www.lenscrafters.com|HI, MAR|0|0|0|0|0|0|0",
		"501|LeSportsac|0|Fashion and Clothing|0|0|www.lesportsac.com|HI|0|0|0|0|0|0|0",
		"502|Levi's|0|Fashion and Clothing|0|0|www.levi.com/US/en_US/|HI, MAR|0|0|0|0|0|0|0",
		"503|Lids|0|Fashion and Clothing|0|0|www.lids.com|HI, MAR|0|0|0|0|0|0|0",
		"504|Lids Locker Room|Locker Room by Lids|Fashion and Clothing|0|0|www.lids.com|HI, MAR|0|0|0|0|0|0|0",
		"505|Local Motion|0|Fashion and Clothing|0|0|www.localmotionhawaii.com|HI|0|0|0|0|0|0|0",
		"506|Longs Drugs|CVS|Pharmacy|0|0|www.cvs.com|HI|0|0|0|0|0|0|0",
		"507|Louis Vuitton|0|Fashion and Clothing|0|0|www.louisvuitton.com|HI, MAR|0|0|0|0|0|0|0",
		"508|Lucky Brand Jeans|0|Fashion and Clothing|0|0|www.luckybrand.com|HI, MAR|0|0|luckybrand|0|0|0|0",
		"509|lululemon athletica|0|Fashion and Clothing|0|0|www.lululemon.com|HI, MAR|0|0|lululemon|0|0|0|0",
		"510|LUSH|0|Personal Care|0|0|www.lushusa.com|HI, MAR|0|0|0|0|0|0|0",
		"511|M.A.C.|0|Personal Care|0|0|www.maccosmetics.com|HI, MAR|0|0|0|0|0|0|0",
		"512|Magnolia Bakery|0|Bakery|0|0|www.magnoliabakery.com|HI|0|0|0|0|0|0|0",
		"513|Michael Kors|0|Fashion and Clothing|0|0|www.michaelkors.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"514|Microsoft Store|0|Electronics|0|0|www.microsoftstore.com/store/msusa/en_US/home|HI, MAR|0|0|0|0|0|0|0",
		"515|Miu Miu|0|Fashion and Clothing|0|0|www.miumiu.com|HI, MAR|0|0|0|0|0|0|0",
		"516|Montblanc|0|Shopping and Services|0|0|www.montblanc.com|HI, MAR|0|0|0|0|0|0|0",
		"517|Nature Republic|0|Personal Care|0|0|www.naturerepublic.com/eng/|HI|0|0|0|0|0|0|0",
		"518|Navy Federal Credit Union|0|Bank / Financial|0|0|www.navyfederal.org/|HI, MAR, SAT|0|0|0|0|0|0|0",
		"519|Neiman Marcus|0|Department Store|0|0|www.neimanmarcus.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"520|Nine West|0|Fashion and Clothing|0|0|www.ninewest.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"521|Nordstrom|0|Department Store|0|0|www.nordstrom.com|HI, MAR|0|0|0|0|0|0|0",
		"522|Oakley|0|Fashion and Clothing|0|0|www.oakley.com|HI, MAR|0|0|0|0|0|0|0",
		"523|Office Depot|0|Electronics|0|0|www.officedepot.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"524|Office Max|0|Electronics|0|0|www.officedepot.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"525|ONCÖUR|0|Fashion and Clothing|0|0|0|HI|0|0|oncour|0|0|0|0",
		"526|OshKosh B'Gosh|0|Fashion and Clothing|0|0|www.oshkosh.com|HI, MAR|0|0|0|0|0|0|0",
		"527|PacSun|Pacific Sunwear|Fashion and Clothing|0|0|www.pacsun.com|HI, MAR, SAT|0|0|pacificsunwear|0|0|0|0",
		"528|Pandora Jewelry|0|Fashion and Clothing|0|0|www.pandora.net/|HI, MAR, SAT|0|0|0|0|0|0|0",
		"529|Perfumania|0|Personal Care|0|0|www.perfumania.com|HI, MAR|0|0|0|0|0|0|0",
		"530|Prada|0|Fashion and Clothing|0|0|www.prada.com/en.html?cc=US|HI, MAR|0|0|0|0|0|0|0",
		"531|Ralph Lauren|0|Fashion and Clothing|0|0|www.ralphlauren.com|HI, MAR|0|0|0|0|0|0|0",
		"532|Regis Salon|0|Personal Care|0|0|www.regissalons.com|HI, SAT|0|0|0|0|0|0|0",
		"533|Reyn Spooner|0|Fashion and Clothing|0|0|www.reynspooner.com|HI|0|0|0|0|0|0|0",
		"534|Rimowa|0|Shopping and Services|0|0|www.rimowa.com/en-us/|HI|0|0|0|0|0|0|0",
		"535|Rip Curl|0|Fashion and Clothing|0|0|www.ripcurl.com/us/shop/|HI|0|0|0|0|0|0|0",
		"536|Saint Laurent Paris|0|Fashion and Clothing|0|0|www.ysl.com/us|HI, MAR|0|0|0|0|0|0|0",
		"537|Salvatore Ferragamo|0|Fashion and Clothing|0|0|www.ferragamo.com|HI, MAR|0|0|0|0|0|0|0",
		"538|See's Candy|0|Shopping and Services|0|0|www.sees.com|HI, SAT|0|0|0|0|0|0|0",
		"539|Skechers|0|Fashion and Clothing|0|0|www.skechers.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"540|Sprint Store|0|Electronics|0|0|www.sprint.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"541|Sunglass Hut|0|Fashion and Clothing|0|0|www.sunglasshut.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"542|Swarovski|0|Fashion and Clothing|0|0|www.swarovski.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"543|Swatch|0|Fashion and Clothing|0|0|www.swatch.com/en/|HI, MAR|0|0|0|0|0|0|0",
		"544|T-Mobile Store|0|Electronics|0|0|www.t-mobile.com/|HI, MAR, SAT|0|0|tmobile|0|0|0|0",
		"545|T&C Surf Design|0|Fashion and Clothing|0|0|www.tcsurf.com|HI|0|0|0|0|0|0|0",
		"546|Tanaka's of Tokyo|0|Restaurant|0|0|www.tanakaoftokyo.com|HI|0|0|0|0|0|0|0",
		"547|Ted Baker London|0|Fashion and Clothing|0|0|www.tedbaker.com|HI, MAR|0|0|0|0|0|0|0",
		"548|Territorial Savings|0|Bank / Financial|0|0|www.territorialsavings.net/|HI|0|0|0|0|0|0|0",
		"549|The Art of Shaving|0|Personal Care|0|0|www.theartofshaving.com|HI, MAR|0|0|0|0|0|0|0",
		"550|The Body Shop|0|Personal Care|0|0|www.thebodyshop-usa.com|HI, MAR|0|0|0|0|0|0|0",
		"551|The D Shop - Desigual|0|Fashion and Clothing|0|0|www.desigual.com/en_US|HI|0|0|dshop|0|0|0|0",
		"552|The Walking Company|0|Fashion and Clothing|0|0|www.thewalkingcompany.com|HI, MAR, SAT|0|0|walkingco|0|0|0|0",
		"553|Tiffany & Co.|0|Fashion and Clothing|0|0|www.tiffany.com|HI, MAR|0|0|0|0|0|0|0",
		"554|Tod's|0|Fashion and Clothing|0|0|www.tods.com/en_us/|HI, MAR|0|0|0|0|0|0|0",
		"555|Tommy Bahama|0|Fashion and Clothing|0|0|www.tommybahama.com|HI, MAR|0|0|0|0|0|0|0",
		"556|Tori Richard|0|Fashion and Clothing|0|0|www.toririchard.com|HI, MAR|0|0|0|0|0|0|0",
		"557|Tory Burch|0|Fashion and Clothing|0|0|www.toryburch.com|HI, MAR|0|0|0|0|0|0|0",
		"558|Tricked Out Accessories|0|Electronics|0|0|http://trickedoutonline.com|HI|0|0|0|0|0|0|0",
		"559|True Religion Brand Jeans|0|Fashion and Clothing|0|0|www.truereligion.com|HI, MAR|0|0|0|0|0|0|0",
		"560|Tumi|0|Shopping and Services|0|0|www.tumi.com|HI, MAR|0|0|0|0|0|0|0",
		"561|Urban Outfitters|0|Fashion and Clothing|0|0|www.urbanoutfitters.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"562|Vans|0|Fashion and Clothing|0|0|www.vans.com|HI, MAR|0|0|0|0|0|0|0",
		"563|Vera Bradley|0|Fashion and Clothing|0|0|www.verabradley.com|HI, MAR|0|0|0|0|0|0|0",
		"564|Verizon Store|0|Electronics|0|0|www.verizon.com|HI, MAR, SAT|0|0|verizonwireless|0|0|0|0",
		"565|Versace|0|Fashion and Clothing|0|0|www.versace.com|HI, MAR|0|0|0|0|0|0|0",
		"566|White House | Black Market|0|Fashion and Clothing|0|0|www.whitehouseblackmarket.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"567|Williams-Sonoma|0|Shopping and Services|0|0|www.williams-sonoma.com|HI, MAR, SAT|0|0|0|0|0|0|0",
		"568|Zara|0|Fashion and Clothing|0|0|www.zara.com|HI, MAR|0|0|0|0|0|0|0",
		"569|Zumiez|0|Fashion and Clothing|0|0|www.zumiez.com|HI, MAR|0|0|0|0|0|0|0",
		"570|Famous Dave's|0|Restaurant|0|BBQ|famousdaves.com|SWR, MAR, SER|0|0|0|0|0|http://www.famousdaves.com/locations/|0",
		"571|Jason's Deli|0|Restaurant|0|Deli chain featuring piled-high sandwiches, a salad bar & health-conscious fare.|jasonsdeli.com|SER, MAR|0|0|0|0|0|0|0",
		"572|Logan's Roadhouse|0|Restaurant|0|0|logansroadhouse.com|SAT, MAR|0|0|0|0|0|0|0",
		"573|O'Charley's|0|Restaurant|0|0|ocharleys.com|SAT, MAR|0|0|0|0|0|0|0",
		"574|Buddy's Bar-b-q|Buddy's Barbeque|Restaurant|0|0|buddysbarbq.com|SAT|0|0|buddysbarbeque|0|0|http://www.buddysbarbq.com/Our-Locations|0",
		"575|Pal's Sudden service|0|Fast Food|0|0|palsweb.com|SAT|0|0|0|0|0|0|0",
		"576|Weigel's|0|Gas Station|Convenience Store|0|weigels.com|SAT|0|0|0|0|0|0|0",
		"577|Food City|0|Supermarket / Grocery|Pharmacy|0|foodcity.com|SAT, MAR|0|1|0|0|0|0|0",
		"578|Food City Gas 'N Go|0|Gas Station|0|0|foodcity.com|SAT, MAR|0|1|0|0|0|0|0",
		"579|Tropical Smoothie Cafe|0|Fast Food|Dessert|0|www.tropicalsmoothie.com|MAR, SER|Yes|0|tropicalsmoothie|0|0|0|0",
		"580|Quaker Steak & Lube|0|Restaurant|Bar|0|www.thelube.com|MAR|Yes|0|0|0|0|0|0",
		"581|Which Wich|0|Fast Food|0|0|www.whichwich.com|MAR|Yes|0|0|0|0|0|0",
		"582|Sport Clips|SportClips|Personal Care|0|Barber shop|www.sportclips.com|MAR, SAT|Yes|0|sportsclips|0|0|0|0",
		"583|Chanello's Pizza|0|Fast Food|0|0|chanellospizza.com|MAR|0|0|chanellos|0|pizza, pizzeria|http://chanellospizza.com/locator.php|0",
		"584|Fuel Express at Farm Fresh|0|Gas Station|0|0|www.farmfreshsupermarkets.com|MAR|0|1|0|0|0|0|0",
		"585|Farm Fresh|0|Supermarket / Grocery|0|0|www.farmfreshsupermarkets.com|MAR|0|1|0|0|0|0|0",
		"586|Sheetz|0|Gas Station|Convenience Store|0|www.sheetz.com|MAR, SAT|Yes|0|0|0|0|0|0",
		"587|AAMCO|0|Garage / Automotive Shop|0|0|aamco.com|MAR, SER, SAT|Yes|0|0|0|0|http://www.aamco.com/storelocator/index.asp|0",
		"588|Bob Evans|0|Restaurant|0|0|www.bobevans.com|MAR, SER, SAT|Yes|0|0|0|0|https://www.bobevans.com/our-restaurants/locations|0",
		"589|Cracker Barrel Old Country Store|0|Restaurant|Gifts|0|crackerbarrel.com|MAR, SER, SAT|0|0|crackerbarrel|0|0|http://crackerbarrel.com/locations|http://crackerbarrel.com/locations?query=City%20Name,%20State",
		"590|Albertsons Express|0|Gas Station|0|0|albertsons.com|MAR|Yes|1|0|0|0|defunct?|0",
		"591|Kroger|0|Supermarket / Grocery|0|0|www.kroger.com|MAR, SAT|Yes|1|0|0|0|0|0",
		"592|Kroger Fuel Center|0|Gas Station|0|0|www.kroger.com|MAR, SAT|Yes|1|0|0|0|0|0",
		"593|Giant|0|Supermarket / Grocery|0|0|www.giantfood.com|MAR|Yes|0|0|0|0|0|0",
		"594|Tractor Supply Co.|Tractor Supply Company|Pet Store / Veterinarian|Hardware Store|0|www.tractorsupply.com|MAR, SAT|Yes|0|tractorsupplycompany|0|0|0|0",
		"595|Martin's|0|Supermarket / Grocery|0|0|www.martinsfoods.com|MAR|Yes|0|0|0|0|0|0",
		"596|Fidelity Investments Investor Center|0|Bank / Financial|0|0|www.fidelity.com|MAR|Yes|0|fidelity|investments|0|0|0",
		"597|Baker's Drive Thru|0|Fast Food|0|0|bakersdrivethru.com|CA|0|0|bakersdrivethrough|0|0|http://www.bakersdrivethru.com/location/|0",
		"598|WaBa Grill|0|Fast Food|0|0|wabagrill.com|CA|0|0|waba|0|0|0|0",
		"599|Famous Footwear|0|Fashion and Clothing|0|0|famousfootwear.com|SWR, SER|Yes|0|0|0|0|0|0",
		"600|Goodyear|0|Garage / Automotive Shop|0|0|www.goodyear.com|SWR, SAT|Yes|0|goodyear|0|tires, tirestore|0|0",
		"601|Sherwin-Williams|0|Furniture / Home Store|0|0|www.sherwin-williams.com/|SWR, SAT|Yes|0|sherwinwilliams|0|paints, paintstore|0|0",
		"602|Creamistry|0|Ice Cream|0|0|creamistry.com|CA|0|0|0|0|0|http://creamistry.com/locations|http://creamistry.com/locations?address=City+Name%2C+State",
		"603|Advance Auto Parts|0|Garage / Automotive Shop|0|0|advanceautoparts.com|SER|0|0|advancedautoparts|0|0|http://shop.advanceautoparts.com/web/StoreLocatorView?storeId=10151&|0",
		"604|American Savings Bank|0|Bank / Financial|0|0|bankwithasb.com|0|0|0|0|0|0|http://www.bankwithasb.com/locations.html|0",
		"605|Comfort Inn|0|Hotel|0|0|comfortinn.com|SAT, SER|Yes|0|0|0|0|0|0",
		"606|Family Dollar|0|Shopping and services|0|0|familydollar.com|SER|0|0|0|0|0|0|0",
		"607|Wawa|0|Gas Station|Convenience Store|0|wawa.com|SER|Yes|0|0|0|0|wawa.com/StoreLocator.aspx|0",
		"608|FiveStar|Five Star|Gas Station|Convenience Store|0|www.fivestarfoodmart.com/|SAT|0|0|0|0|0|0|0",
		"609|First Republic Bank|0|Bank / Financial|ATM|0|www.firstrepublic.com|CA|0|0|0|0|0|0|0",
	];
	
	placeHarmonizer_bootstrap();
})();
// var DLscript = document.createElement("script");
// DLscript.textContent = runPH.toString() + ' \n' + 'runPH();';
// DLscript.setAttribute("type", "application/javascript");
// document.body.appendChild(DLscript);