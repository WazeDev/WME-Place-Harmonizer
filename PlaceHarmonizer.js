// ==UserScript==
// @name         Place Harmonizer
// @namespace    http://your.homepage/
// @version      0.8
// @description  Harmonizes, formats, and locks a selected place
// @author       bmtg, vtpearce
// @include      https://www.waze.com/editor/*
// @grant        none
// ==/UserScript==

(function() {
	
	function registerKeyShortcut(action_name, annotation, callback, key_map) {
        Waze.accelerators.addAction(action_name, {group: 'default'});
        Waze.accelerators.events.register(action_name, null, callback);
        Waze.accelerators.registerShortcuts(key_map);
    }
    registerKeyShortcut("harmonizePlace", "Harmonize Place", harmonizePlace, {"A+a": "harmonizePlace"});
	
    function alertMessage(messageNum) {
		alertList = [ "If this is a bank branch, please add the Bank category and run script again.  If this is a standalone ATM, please add ATM after the name, add the ATM category, and run the script again.  If it is the bank's corporate offices, please add 'Corporate Offices' after the name, use the Offices category, and run again.",
			"If this is a bank branch, please remove ATM from the bank name, add the Bank category if needed, and run the script again.  If this is a standalone ATM, please add the ATM category and run the script again."];
		alert(alertList[messageNum]);
		return;
	}
	
	if (!String.plFormat) {
		String.plFormat = function (format) {
			var args = Array.prototype.slice.call(arguments, 1);
			return format.replace(/{(\d+)}/g, function (name, number) {
				return typeof args[number] != "undefined" ? args[number] : match;
				});
		};
	}
	
	function toTitleCase(str) {
		if (!str) {
			return str;
		}
		var ignoreWords = ["a", "an", "and", "as", "at", "by", "for", "from", "hhgregg", "in", "into", "of", "on", "or", "the", "to", "with"];
		var capWords = ["3M", "AMC", "AOL", "AT&T", "ATM", "BBC", "BMV", "BMW", "BP", "CBS", "CCS", "CGI", "CISCO", "CNN", "CVS", "DHL", "DKNY", 
			"DMV", "DSW", "ESPN", "FCUK", "GNC", "H&M", "HP", "HSBC", "IBM", "IKEA", "IRS", "JBL", "JCPenney", "KFC", "MBNA", "MCI", 
			"NBC", "PNC", "TCBY", "TNT", "UPS", "USA", "USPS", "VW", 
			"ZZZ" ];
		var allCaps = (str === str.toUpperCase());
		str = str.replace(/\b([^\W_\d][^\s-]*) */g, function(txt) {
			return ((txt == txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
		str = str.replace(/[oOlLdD]'[A-Za-z']{3,}/g, function(txt) {
			return ((txt == txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1) + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase();
		});
		str = str.replace(/[mM][cC][A-Za-z']{3,}/g, function(txt) {
			return ((txt == txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase() + txt.charAt(2).toUpperCase() + txt.substr(3).toLowerCase();
		});
		str = str.replace(/&\w+/g, function(txt) {
			return ((txt == txt.toUpperCase()) && !allCaps) ? txt : txt.charAt(0) + txt.charAt(1).toUpperCase() + txt.substr(2).toLowerCase();
		});
		
		str = str.replace(/[^ ]+/g, function(txt) {
			txtLC = txt.toLowerCase();
			return ( ignoreWords.indexOf(txtLC) > -1 )  ? txtLC : txt;
		});
		str = str.replace(/[^ ]+/g, function(txt) {
			txtLC = txt.toUpperCase();
			return ( capWords.indexOf(txtLC) > -1 )  ? txtLC : txt;
		});
		str = str.charAt(0).toUpperCase() + str.substr(1);
		return str
	}

	function normalizePhone(s, outputFormat) {
        if (!s) {
            return s;
        }
		// Remove all non digits
        var s1 = s.replace(/\D/g,'');
        // 9 or 10 digits?
        var m = s1.match(/^1?(\d{3})(\d{3})(\d{4})$/);
        if (!m) {
            return s;
        }
        else {
        	return String.plFormat(outputFormat, m[1], m[2], m[3]);
        }
    }
 
    function normalizeURL(s) {
		if (!s) {
			return s;
		}
		var m = s.match(/^https?:\/\/(.*)$/i);
		if (m) {
			return m[1];
		}
		else {
			return s;
		}
	}
 
	
	count = 0;
	thisUser = W.loginManager.user;
	if (thisUser === null)
		return;
	usrRank = thisUser.normalizedLevel;
	UpdateObject;
	lockLevel3 = 2;
	lockLevel4 = 3;
	lockLevel5 = 4;

	if (lockLevel3 > (usrRank - 1)) { lockLevel3 = (usrRank - 1); }
	if (lockLevel4 > (usrRank - 1)) { lockLevel4 = (usrRank - 1); }
	if (lockLevel5 > (usrRank - 1)) { lockLevel5 = (usrRank - 1); }
	
	if (typeof (require) !== "undefined") { UpdateObject = require("Waze/Action/UpdateObject"); }
		else { UpdateObject = W.Action.UpdateObject; }

		
	function harmonizePlace() {
	
		jQuery("#sidebar").focus();

		for (var ix = 0; ix < W.selectionManager.selectedItems.length; ix++) {
			var item = W.selectionManager.selectedItems[ix].model;
		
			if (item.type == "venue" )  {
				var categories   = item.attributes.categories;
				var vname   = item.attributes.name;
				var addr = item.getAddress()
				var nameShort = vname.replace(/[^A-Za-z]/g,'');
				var nameNumShort = vname.replace(/[^A-Za-z0-9]/g,'');
				if (!addr.state) {
					alert("Place has no address.  Script localization rules require a state.  Please set the address and rerun the script.");
					return;
				}

				if (addr.country.name != "United States") {
					alert("At present this script is for USA use only");
					return;
				}

	// console.log(addr.country.name)

	// Regional switches
				var region;
				switch (addr.state.name) {
					case "Kentucky":
					case "North Carolina":
					case "South Carolina":
					case "Tennessee":
						region = "USA_SAT";
						break;
					case "Alabama":
					case "Florida":
					case "Georgia":
					case "Alaska":
						region = "USA_SE";
						break;
					default:
						region = "Unknown";
				}
			
	// Title case, url and phone fixing

				var outputFormat = "({0}) {1}-{2}";
				// Phone customization for Southeast Region
				if (region === "USA_SE" &&
				!( /^\d{3}-\d{3}-\d{4}$/.test(item.attributes.phone) ||  /^\(\d{3}\) \d{3}-\d{4}$/.test(item.attributes.phone)) ) {
					outputFormat = "{0}-{1}-{2}";
				}
				var newPhone = normalizePhone(item.attributes.phone, outputFormat);
				W.model.actionManager.add(new UpdateObject(item, { phone: newPhone }));
			
	// Gas Station correction
				var subFuel = 0;  var brandSwap = 0;  var desServ = [];
				if ( categories.indexOf("GAS_STATION") > -1  ) {
					if (nameShort.toUpperCase() == "SAMSCLUB" || nameShort.toUpperCase() == "SAMSCLUBFUELCENTER" || nameShort.toUpperCase() == "SAMSCLUBGAS" || 
						nameShort.toUpperCase() == "SAMSCLUBFUEL" || nameShort.toUpperCase() == "SAMSCLUBGASOLINE" ) {
						desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
						W.model.actionManager.add(new UpdateObject(item, { name: "Sam's Club Gasoline", url: "samsclub.com", description: "Members only" }));
						subFuel = 1;
					}
					else if (nameShort.toUpperCase() == "COSTCO" || nameShort.toUpperCase() == "COSTCOFUELCENTER" || nameShort.toUpperCase() == "COSTCOGASOLINE" || 
						nameShort.toUpperCase() == "COSTCOGAS" || nameShort.toUpperCase() == "COSTCOFUEL" ) {
						desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
						W.model.actionManager.add(new UpdateObject(item, { name: "Costco Gasoline", url: "costco.com", description: "Members only" }));
						subFuel = 1;
					}
					else if (nameShort.toUpperCase() == "BJS" || nameShort.toUpperCase() == "BJSFUELCENTER" || nameShort.toUpperCase() == "BJSGAS" || 
						nameShort.toUpperCase() == "BJSFUEL" || nameShort.toUpperCase() == "BJSGASOLINE" ||
						nameShort.toUpperCase() == "BJSWHOLESALE" || nameShort.toUpperCase() == "BJSWHOLESALEFUELCENTER" || nameShort.toUpperCase() == "BJSWHOLESALEGAS" || 
						nameShort.toUpperCase() == "BJSWHOLESALEFUEL" || nameShort.toUpperCase() == "BJSWHOLESALEGASOLINE" ||
						nameShort.toUpperCase() == "BJSWHOLESALECLUB" || nameShort.toUpperCase() == "BJSWHOLESALECLUBFUELCENTER" || nameShort.toUpperCase() == "BJSWHOLESALECLUBGAS" || 
						nameShort.toUpperCase() == "BJSWHOLESALECLUBFUEL" || nameShort.toUpperCase() == "BJSWHOLESALECLUBGASOLINE" ) {
						desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
						W.model.actionManager.add(new UpdateObject(item, { name: "BJ's Gasoline", url: "bjs.com", description: "Members only" }));
						subFuel = 1;
					}
					else {
						if (!(item.attributes.brand.toUpperCase() == vname.toUpperCase() || item.attributes.brand == "" || item.attributes.brand == null)) {
							W.model.actionManager.add(new UpdateObject(item, { name: item.attributes.brand, aliases: [toTitleCase(vname)] }));
							vname = item.attributes.brand;  brandSwap = 1;
						}
						desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
						if ( categories.indexOf("ATM") > -1 ) { 
							if ( categories.indexOf("CAR_WASH") > -1 ) { 
								W.model.actionManager.add(new UpdateObject(item, { categories: ["GAS_STATION","CONVENIENCE_STORE","CAR_WASH","ATM"] }));
							}
							else {
								W.model.actionManager.add(new UpdateObject(item, { categories: ["GAS_STATION","CONVENIENCE_STORE","ATM"] }));
							}
						}
						else {
							if ( categories.indexOf("CAR_WASH") > -1 ) { 
								W.model.actionManager.add(new UpdateObject(item, { categories: ["GAS_STATION","CONVENIENCE_STORE","CAR_WASH"] }));
							}
							else {
								W.model.actionManager.add(new UpdateObject(item, { categories: ["GAS_STATION","CONVENIENCE_STORE"] }));
							}
						}
					}
				}
			
				var nameShort = vname.replace(/[^A-Za-z]/g,'');
				var nameNumShort = vname.replace(/[^A-Za-z0-9]/g,'');
			
	// Place Harmonization 
			
				var tempCat = item.attributes.categories;
				var tempName =  item.attributes.name;
				var tempServ = item.attributes.services.slice(0);
				var walmartFlag = 0;  var hotelCat = 0;
			
		//	Gas Stations:
		
				if (nameNumShort.toUpperCase() == "7ELEVEN" || nameShort.toUpperCase() == "SEVENELEVEN" || 
					nameNumShort.toUpperCase() == "711" || nameNumShort.toUpperCase() == "SEVEN11" ) {
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "7-Eleven", aliases: ["7-11"], url: "7-eleven.com" }));
				}
			
				else if (nameNumShort.toUpperCase() == "76" || nameNumShort.toUpperCase() == "76GAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "76", url: "76.com" }));
				}
			
				else if (nameShort.toUpperCase() == "AMOCO" || nameShort.toUpperCase() == "AMOCOGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Amoco", url: "amoco.com" }));
				}
			
				else if (nameShort.toUpperCase() == "BP" || nameShort.toUpperCase() == "BPGAS" || nameShort.toUpperCase() == "BRITISHPETROLEUM" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "BP", url: "bp.com" }));
				}
			
				else if (nameShort.toUpperCase() == "CHEVRON" || nameShort.toUpperCase() == "CHEVRONGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Chevron", url: "chevron.com" }));
				}
			
				else if (nameShort.toUpperCase() == "CIRCLEK" || nameShort.toUpperCase() == "CIRCLEKGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Circle K", url: "circlek.com" }));
				}
			
				else if (nameShort.toUpperCase() == "CITGO" || nameShort.toUpperCase() == "CITGOGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Citgo", url: "citgo.com" }));
				}
			
				else if (nameShort.toUpperCase() == "CONOCO" || nameShort.toUpperCase() == "CONOCOGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Conoco", url: "conoco.com" }));
				}
			
				else if (nameShort.toUpperCase() == "EXXON" || nameShort.toUpperCase() == "EXXONGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Exxon", url: "exxonmobilstations.com" }));
				}
			
				else if (nameShort.toUpperCase() == "FLYINGJ" || nameShort.toUpperCase() == "FLYINGJGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Flying J", url: "pilotflyingj.com.com" }));
				}
			
				else if (nameShort.toUpperCase() == "GETTY" || nameShort.toUpperCase() == "GETTYGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Getty", url: "getty.com" }));
				}
			
				else if (nameShort.toUpperCase() == "GULF" || nameShort.toUpperCase() == "GULFGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Gulf", url: "gulf.com" }));
				}
			
				else if (nameShort.toUpperCase() == "HESS" || nameShort.toUpperCase() == "HESSEXPRESS" || nameShort.toUpperCase() == "HESSGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Hess", url: "hess.com" }));
				}
			
				else if (nameShort.toUpperCase() == "KANGAROOEXPRESS" || nameShort.toUpperCase() == "KANGAROOEXPRESSGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Kangaroo Express", url: "kangarooexpress.com" }));
				}
			
				else if (nameShort.toUpperCase() == "LOVES" || nameShort.toUpperCase() == "LOVESGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Love's", url: "loves.com" }));
				}
			
				else if (nameShort.toUpperCase() == "MARATHON" || nameShort.toUpperCase() == "MARATHONGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Marathon", url: "marathon.com" }));
				}
			
				else if (nameShort.toUpperCase() == "MOBIL" || nameShort.toUpperCase() == "MOBILGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Mobil", url: "exxonmobilstations.com" }));
				}
			
				else if (nameShort.toUpperCase() == "MURPHYUSA" || nameShort.toUpperCase() == "MURPHYUSAGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Murphy USA", url: "murphyusa.com" }));
				}
			
				else if (nameNumShort.toUpperCase() == "PHILLIPS66" || nameNumShort.toUpperCase() == "PHILIPS66" || 
					nameShort.toUpperCase() == "PHILLIPS" || nameNumShort.toUpperCase() == "PHILLIPS66GAS"  ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Phillips 66", url: "phillips66.com" }));
				}
			
				else if (nameShort.toUpperCase() == "PILOT" || nameShort.toUpperCase() == "PILOTGAS"  ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Pilot", url: "pilotflyingj.com.com" }));
				}
			
				else if (nameShort.toUpperCase() == "QUIKTRIP" || nameShort.toUpperCase() == "QUIKTRIPGAS" ||
					nameShort.toUpperCase() == "QUICKTRIP" || nameShort.toUpperCase() == "QUICKTRIPGAS"  ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "QuikTrip", url: "quiktrip.com" }));
				}
			
				else if (nameShort.toUpperCase() == "RACETRAC" || nameShort.toUpperCase() == "RACETRACGAS"  ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "RaceTrac", url: "racetrac.com" }));
				}
			
				else if (nameShort.toUpperCase() == "RACEWAY" || nameShort.toUpperCase() == "RACEWAYGAS"  ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Raceway", url: "raceway.com" }));
				}
			
				else if (nameShort.toUpperCase() == "SHELL" || nameShort.toUpperCase() == "SHELLGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Shell", url: "shell.us/products-services/shell-for-motorists/station-locator.html" }));
				}
			
				else if (nameShort.toUpperCase() == "SINCLAIR" || nameShort.toUpperCase() == "SINCLAIRGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Sinclair", url: "sinclair.com" }));
				}
			
				else if (nameShort.toUpperCase() == "SPEEDWAY" || nameShort.toUpperCase() == "SPEEDWAYGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Speedway", url: "speedway.com" }));
				}
			
				else if (nameShort.toUpperCase() == "SUNOCO" || nameShort.toUpperCase() == "SUNOCOGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Sunoco", url: "sunoco.com" }));
				}
			
				else if (nameShort.toUpperCase() == "THORNTONS" || nameShort.toUpperCase() == "THORNTONSGAS" ||
					nameShort.toUpperCase() == "THORNTON" || nameShort.toUpperCase() == "THORNTONGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Thorntons", url: "thorntons.com" }));
				}
			
				else if (nameShort.toUpperCase() == "TEXACO" || nameShort.toUpperCase() == "TEXACOGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Texaco", url: "texaco.com" }));
				}
			
				else if (nameShort.toUpperCase() == "VALERO" || nameShort.toUpperCase() == "VALEROGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Valero", url: "valero.com/Stores/Pages/Home.aspx" }));
				}
			
				else if (nameShort.toUpperCase() == "TRAVELCENTERSOFAMERICA" || nameShort.toUpperCase() == "TRAVELCENTER" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Travelcenters of America", url: "ta-petro.com" }));
				}
			
				else if (nameShort.toUpperCase() == "WAWA" || nameShort.toUpperCase() == "WAWAGAS" ) {
					W.model.actionManager.add(new UpdateObject(item, { name: "Wawa", url: "wawa.com" }));
				}
			
			
		//	Non Gas Stations:
		
				else if (nameShort.toUpperCase() == "24HRFITNESS" || nameShort.toUpperCase() == "24HOURFITNESS" || nameShort.toUpperCase() == "24HFITNESS" ) {
					tempCat = ["GYM_FITNESS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "24 Hour Fitness", url: "24hourfitness.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "AAA" || nameShort.toUpperCase() == "AMERICANAUTOMOBILEASSOCIATION" || nameShort.toUpperCase() == "TRIPLEA" ) {
					tempCat = ["ORGANIZATION_OR_ASSOCIATION"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "AAA", aliases: ["American Automobile Association"], url: "aaa.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ACADEMYSPORTS" || nameShort.toUpperCase() == "ACADEMYSPORTSOUTDOORS" ) {
					tempCat = ["SPORTING_GOODS","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Academy Sports & Outdoors", url: "academy.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "ACEHARDWARE" || (nameShort.toUpperCase() == "ACE" && categories.indexOf("HARDWARE_STORE") > -1 ) ) {
					tempCat = ["HARDWARE_STORE"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Ace Hardware", url: "acehardware.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ALBERTSONS" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Albertsons", url: "albertsons.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "ALDI" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Aldi", url: "aldi.us", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "AMSCOT" ) {
					tempCat = ["BANK_FINANCIAL"]; desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Amscot", url: "amscot.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "ANYTIMEFITNESS" ) {
					tempCat = ["GYM_FITNESS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Anytime Fitness", url: "anytimefitness.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "APPLEBEES" || nameShort.toUpperCase() == "APPLEBEE" || nameShort.toUpperCase() == "APPLEBYS" ) {
					tempCat = ["RESTAURANT"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Applebee's", url: "applebees.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ARBYS" || nameShort.toUpperCase() == "ARBY" ) {
					tempCat = ["FAST_FOOD"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Arby's", url: "arbys.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ATLANTICSTORAGE" || nameShort.toUpperCase() == "ATLANTICSELFSTORAGE" ) {
					tempCat = ["SHOPPING_AND_SERVICES"];  desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Atlantic Self Storage", aliases: ["Atlantic Storage"], url: "atlanticselfstorage.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ATT" || nameShort.toUpperCase() == "ATANDT"  ) {
					tempCat = ["ELECTRONICS"]; desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "AT&T", url: "att.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ATTAUTHORIZEDRESELLER" ) {
					tempCat = ["ELECTRONICS"]; desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "AT&T Authorized Reseller", url: "att.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "AUBONPAIN" ) {
					tempCat = ["RESTAURANT"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Au Bon Pain", url: "aubonpain.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "AUTOZONE"  ) {
					tempCat = ["CAR_SERVICES"]; desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "AutoZone", url: "autozone.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "AVIS" || nameShort.toUpperCase() == "AVISCARRENTAL" || nameShort.toUpperCase() == "AVISRENTACAR" || 
				nameShort.toUpperCase() == "AVISRENTAL" || nameShort.toUpperCase() == "AVISRENTALCAR" ) {
					tempCat = ["CAR_RENTAL"];  desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Avis", url: "avis.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BABIESRUS" || nameShort.toUpperCase() == "BABIESAREUS"  ) {
					tempName = "Babies R Us"; tempCat = ["TOY_STORE"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: tempName, url: "babiesrus.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BACKYARDBURGERS"  ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Back Yard Burgers'", url: "backyardburgers.com", categories: tempCat }));
				}
			
			// ** Banks:  see list at end
			
				else if (nameShort.toUpperCase() == "BASSPROSHOPS" || nameShort.toUpperCase() == "BASSPRO" ) {
					tempCat = ["SPORTING_GOODS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Bass Pro Shops", url: "basspro.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "BEDBATHBEYOND" ) {
					tempCat = ["DEPARTMENT_STORE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Bed Bath & Beyond", url: "bedbathandbeyond.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "BEEFOBRADYS" || nameShort.toUpperCase() == "BEEFS" ) {
					tempCat = ["RESTAURANT","BAR"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Beef 'O' Brady's", aliases: ["Beef's"], url: "beefobradys.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BELK" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Belk", url: "belk.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BESTBUY" ) {
					tempCat = ["ELECTRONICS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Best Buy", url: "bestbuy.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "BILO" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "BI-LO", url: "bi-lo.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "BIGLOTS" ) {
					tempCat = ["SUPERMARKET_GROCERY","DEPARTMENT_STORE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Big Lots", url: "biglots.com", categories: tempCat  }));
				}
			
				// BJ's Gasoline: see gas station section
			
				else if ( !(categories.indexOf("GAS_STATION") > -1) && !(categories.indexOf("RESTAURANT") > -1) && 
					(nameShort.toUpperCase() == "BJS" || nameShort.toUpperCase() == "BJSWHOLESALE"  || nameShort.toUpperCase() == "BJSWHOLESALECLUB" ) ) {
					tempCat = ["SUPERMARKET_GROCERY","DEPARTMENT_STORE","FURNITURE_HOME_STORE","ELECTRONICS","FASHION_AND_CLOTHING"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "BJ's Wholesale Club", url: "bjs.com", description: "Members only" }));
				}
			
				else if (nameShort.toUpperCase() == "BJSRESTAURANT" || nameShort.toUpperCase() == "BJSBREWHOUSE" || nameShort.toUpperCase() == "BJSRESTAURANTBREWHOUSE" ) {
					tempCat = ["RESTAURANT","BAR"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "BJ's Restaurant & Brewhouse", url: "bjsrestaurants.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BOBEVANS" || nameShort.toUpperCase() == "BOBEVAN" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Bob Evans", url: "bobevans.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BOJANGLES"  ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Bojangles'", url: "bojangles.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BOOKSAMILLION" || nameShort.toUpperCase() == "BOOKSAMILION" ) {
					tempCat = ["BOOKSTORE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Books-A-Milion", aliases: ["Books a Million"], url: "academy.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "BOSTONMARKET" || nameShort.toUpperCase() == "BOSTONMKT" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Boston Market", url: "bostonmarket.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BUCADIBEPPO" || nameShort.toUpperCase() == "BUCADIBEPO" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Buca di Beppo", url: "bucadibeppo.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BUFFALOWILDWINGS" || nameShort.toUpperCase() == "BUFFALOWILDWINGSGRILLBAR" ||
					nameShort.toUpperCase() == "BWW" || nameShort.toUpperCase() == "BDUBS" || 
					nameShort.toUpperCase() == "BUFFALOWILDWINGSGRILLANDBAR" || nameShort.toUpperCase() == "BUFFALOWILDWINGSGRILL" ) {
					tempCat = ["RESTAURANT"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Buffalo Wild Wings Grill & Bar", aliases: ["BWW","BDubs"], url: "buffalowildwings.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BURGERFI"  ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "BurgerFi", url: "burgerfi.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "BURGERKING" || nameShort.toUpperCase() == "BK"  ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Burger King", aliases: ["BK"], url: "bk.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CAPTAINDS" || nameShort.toUpperCase() == "CAPTDS" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Captain D's", url: "captainds.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CARMAX"  ) {
					tempCat = ["CAR_DEALERSHIP"];  desServ = ["PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "CarMax", url: "carmax.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "CHECKERS" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Checkers", url: "checkers.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CHEDDARS" || nameShort.toUpperCase() == "CHEDARS" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Cheddar's", url: "cheddars.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CHICKENEXPRESS" || nameShort.toUpperCase() == "CHICKENXPRESS" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Chicken Express", url: "chickene.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CHICKENSALADCHICK" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Chicken Salad Chick", url: "chickensaladchick.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CHICKFILA" || nameShort.toUpperCase() == "CHICFILA" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Chick-fil-A", aliases: ["Chick Fil A","Chickfila"], url: "chickfila.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CHILIS" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Chili's", url: "chilis.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CHIPOTLEMEXICANGRILL" || nameShort.toUpperCase() == "CHIPOTLE" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Chipotle Mexican Grill", url: "chipotle.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CHUCKECHEESES" || nameShort.toUpperCase() == "CEC" || nameShort.toUpperCase() == "CHUCKECHEESE" ) {
					tempCat = ["GAME_CLUB","RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Chuck E Cheese's", aliases: ["CEC"], url: "chuckecheese.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CHURCHSCHICKEN" || nameShort.toUpperCase() == "CHURCHCHICKEN" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Church's Chicken", url: "churchs.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CHUYS" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Chuy's", url: "chuys.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "COOKOUT" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Cook Out", url: "cookoutnc.com", categories: tempCat }));
				}
			
				// Costco Gasoline: see gas station section
			
				else if ( !(categories.indexOf("GAS_STATION") > -1) && (nameShort.toUpperCase() == "COSTCO" || nameShort.toUpperCase() == "COSTCOWHOLESALE" ) ) {
					tempCat = ["SUPERMARKET_GROCERY","DEPARTMENT_STORE","FURNITURE_HOME_STORE","ELECTRONICS","FASHION_AND_CLOTHING"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Costco", description: "Members only", url: "costco.com" }));
				}
			
				else if (nameShort.toUpperCase() == "CRACKERBARREL" ) {
					tempCat = ["RESTAURANT","GIFTS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Cracker Barrel", url: "crackerbarrel.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "CVSPHARMACY" || nameShort.toUpperCase() == "CVS" ) {
					tempCat = ["PHARMACY","CONVENIENCE_STORE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "CVS Pharmacy", url: "cvs.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "DAIRYQUEEN" || nameShort.toUpperCase() == "DQ" ) {
					tempCat = ["FAST_FOOD","ICE_CREAM"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Dairy Queen", aliases: ["DQ"], url: "dq.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "DAVIDSBRIDAL" || nameShort.toUpperCase() == "DAVIDSBRIDE" ) {
					tempCat = ["FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "David's Bridal", url: "davidsbridal.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "DENNYS" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Denny's", url: "dennys.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "DILLARDS" || nameShort.toUpperCase() == "DILLARD" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Dillard's", url: "dillards.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "DOLLARGENERAL" || nameShort.toUpperCase() == "DOLLARGENERALSTORE" ) {
					tempCat = ["SHOPPING_AND_SERVICES"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Dollar General", url: "dollargeneral.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "DOLLARTREE" || nameShort.toUpperCase() == "DOLLARTREESTORE" ) {
					tempCat = ["SHOPPING_AND_SERVICES"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Dollar Tree", url: "dollartree.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "DOMINOS" || nameShort.toUpperCase() == "DOMINOSPIZZA" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","DELIVERIES","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Domino's", url: "dominos.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "DONATOS" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Donato's", url: "donatos.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "DUNKINDONUTS" || nameShort.toUpperCase() == "DUNKINGDONUTS" || vname.toUpperCase() == "DD" ) {
					tempCat = ["BAKERY","CAFE"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Dunkin' Donuts", url: "dunkindonuts.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "EARTHFARE" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Earth Fare", url: "earthfare.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "EINSTEINBROSBAGELS" || nameShort.toUpperCase() == "EINSTEINBROTHERSBAGELS" ||
					nameShort.toUpperCase() == "EINSTEINBROS" || nameShort.toUpperCase() == "EINSTEINBROTHERS" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Einstein Bros Bagels", aliases: ["Einstein Brothers"], url: "einsteinbros.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ELEPHANTBAR" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Elephant Bar", url: "elephantbar.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ENTERPRISE" || nameShort.toUpperCase() == "ENTERPRISECARRENTAL" ||
					nameShort.toUpperCase() == "ENTERPRISERENTACAR"  || nameShort.toUpperCase() == "ENTERPRISERENTAL" || nameShort.toUpperCase() == "ENTERPRISERENTALCAR" ) {
					tempCat = ["CAR_RENTAL"];  desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Enterprise", url: "enterprise.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "FANTASTICSAMS" || nameShort.toUpperCase() == "FANTASTICSAM" ) {
					tempCat = ["PERSONAL_CARE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Fantastic Sam's", url: "fantasticsams.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "FATZCAFE" || nameShort.toUpperCase() == "FATZ" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Fatz Cafe", url: "fatz.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "FEDEX" || nameShort.toUpperCase() == "FEDERALEXPRESS"  ) {
					tempCat = ["SHOPPING_AND_SERVICES"];  tempName = "FedEx";
					W.model.actionManager.add(new UpdateObject(item, { name: tempName, aliases: ["Federal Express"], url: "fedex.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "FEDEXOFFICE" ) {
					tempCat = ["SHOPPING_AND_SERVICES"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Fedex Office", url: "fedex.com", categories: tempCat,  }));
				}
			
				else if (nameShort.toUpperCase() == "FIREHOUSESUBS" || nameShort.toUpperCase() == "FIREHOUSE" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Firehouse Subs", url: "firehousesubs.com", categories: tempCat }));
				}
			
				else if (nameNumShort.toUpperCase() == "FIVEGUYSBURGERSFRIES" || nameNumShort.toUpperCase() == "5GUYSBURGERSFRIES" ||
					nameNumShort.toUpperCase() == "FIVEGUYS" || nameNumShort.toUpperCase() == "5GUYS" ||
					nameNumShort.toUpperCase() == "FIVEGUYSBURGERS" || nameNumShort.toUpperCase() == "5GUYSBURGERS" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Five Guys", url: "fiveguys.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "FOODLION" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Food Lion", url: "foodlion.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "GNC" || nameShort.toUpperCase() == "GENERALNUTRITIONCENTER" || 
					nameShort.toUpperCase() == "GENERALNUTRITIONCENTERS" ) {
					tempCat = ["PERSONAL_CARE"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "GNC", aliases: ["General Nutrition Centers"], url: "gnc.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "GOLDENCORRAL" || nameShort.toUpperCase() == "GOLDENCORAL" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Golden Corral", url: "goldencorral.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "GOLDSGYM" || nameShort.toUpperCase() == "GOLDGYM" ) {
					tempCat = ["GYM_FITNESS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Gold's Gym", url: "goldsgym.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "GREATCLIPS" || nameShort.toUpperCase() == "GREATCLIP" ) {
					tempCat = ["PERSONAL_CARE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Great Clips", url: "greatclips.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "HARDEES" || nameShort.toUpperCase() == "HARDEE" || nameShort.toUpperCase() == "HARDYS" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Hardee's", url: "hardees.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "HARRISTEETER" ) {
					tempCat = ["SUPERMARKET_GROCERY","PHARMACY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Harris Teeter", url: "harristeeter.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "HERTZ" || nameShort.toUpperCase() == "HERTZCARRENTAL" ||
					nameShort.toUpperCase() == "HERTZRENTACAR"  || nameShort.toUpperCase() == "HERTZRENTAL" || nameShort.toUpperCase() == "HERTZRENTALCAR" ) {
					tempCat = ["CAR_RENTAL"];  desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Hertz", url: "hertz.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "HHGREGG" || nameShort.toUpperCase() == "HHGREG" ) {
					tempCat = ["ELECTRONICS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "h.h. gregg", aliases: ["hhgregg","hh gregg"], url: "hhgregg.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "HOOTERS" || nameShort.toUpperCase() == "GOLDENCORAL" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Hooters", url: "hooters", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "HRBLOCK" || nameShort.toUpperCase() == "HANDRBLOCK" ) {
					tempCat = ["BANK_FINANCIAL"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "H&R Block", aliases: ["H And R Block"], url: "hrblock.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "HUDDLEHOUSE" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Huddle House", url: "huddlehouse.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "IGA" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "IGA", url: "iga.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "IHOP" || nameShort.toUpperCase() == "INTERNATIONALHOUSEOFPANCAKES" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "IHOP", url: "ihop.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "INGLES" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Ingles", url: "ingles-markets.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "JASONSDELI" || nameShort.toUpperCase() == "JASONDELI" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Jason's Deli", url: "jasonsdeli.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "JCPENNEY" || nameShort.toUpperCase() == "JCPENNEYS" ||
					nameShort.toUpperCase() == "JCPENNY" || nameShort.toUpperCase() == "JCPENNYS" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "JCPenney", url: "jcpenney.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "JIMMYJOHNS" || nameShort.toUpperCase() == "JIMMYJOHNSSUBS" ||
					nameShort.toUpperCase() == "JIMMIEJOHNS" || nameShort.toUpperCase() == "JIMMIEJOHNSSUBS" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Jimmy John's", url: "jimmyjohns.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "JOANNFABRICS" || nameShort.toUpperCase() == "JOANNFABRIC" || nameShort.toUpperCase() == "JOANNFABRICCRAFTS" ||
					nameShort.toUpperCase() == "JOANNEFABRICS" || nameShort.toUpperCase() == "JOANNEFABRIC" || nameShort.toUpperCase() == "JOANNEFABRICCRAFTS" ||
					nameShort.toUpperCase() == "JOANNSFABRICS" || nameShort.toUpperCase() == "JOANNS" ) {
					tempCat = ["ARTS_AND_CRAFTS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Jo-Ann Fabric & Craft", url: "joann.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "KFC" || nameShort.toUpperCase() == "KENTUCKYFRIEDCHICKEN" || nameShort.toUpperCase() == "KENTUCKYFRIED" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "KFC", aliases: ["Kentucky Fried Chicken"], url: "kfc.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "KMART" || nameShort.toUpperCase() == "KMARTSUPERSTORE" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Kmart", url: "kmart.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "KOBE" || nameShort.toUpperCase() == "KOBEJAPANESESTEAKHOUSE" || nameShort.toUpperCase() == "KOBESTEAKHOUSE" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Kobe Japanese Steakhouse", url: "kobesteakhouse.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "KOHLS" || nameShort.toUpperCase() == "KOHL" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Kohl's", url: "kohls.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "KRISPYKREME" || nameShort.toUpperCase() == "KRISPYKREAM" || vname.toUpperCase() == "KK" ) {
					tempCat = ["BAKERY","CAFE"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Krispy Kreme", url: "krispykreme.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "KRYSTAL" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Krystal", url: "krystal.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "LABCORP" ) {
					tempCat = ["OFFICES"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "LabCorp", aliases: ["Lab Corp"], url: "labcorp.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "LAFITNESS" ) {
					tempCat = ["GYM_FITNESS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "LA Fitness", url: "lafitness.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "LENSCRAFTERS" ) {
					tempCat = ["OFFICES"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "LabCorp", aliases: ["LensCrafters"], url: "lenscrafters.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "LITTLECAESARS" || nameShort.toUpperCase() == "LITTLECAESARSPIZZA" ||
					nameShort.toUpperCase() == "LITTLECESARS" || nameShort.toUpperCase() == "LITTLECESARSPIZZA" ||
					nameShort.toUpperCase() == "LITTLECEASARS" || nameShort.toUpperCase() == "LITTLECEASARSPIZZA" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","DELIVERIES","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Little Caesars", url: "littlecaesars.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "LONGHORN" || nameShort.toUpperCase() == "LONGHORNSTEAKHOUSE" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "LongHorn Steakhouse", url: "longhornsteakhouse.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "LOWES" || nameShort.toUpperCase() == "LOWESHOMEIMPROVEMENT" || nameShort.toUpperCase() == "LOWESHOMEIMPROVMENT" ) {
					tempCat = ["HARDWARE_STORE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Lowe's", url: "lowes.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "MACYS" || nameShort.toUpperCase() == "MACY" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Macy's", url: "macys.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "MANNYSORIGINALCHOPHOUSE" || nameShort.toUpperCase() == "MANNYSCHOPHOUSE" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Manny's Original Chophouse", url: "mannyschophouse.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "MARCOSPIZZA" || nameShort.toUpperCase() == "MARCOS" || nameShort.toUpperCase() == "MARCOPIZZA" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","DELIVERIES","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Marco's Pizza", url: "marcos.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "MARSHALLS" || nameShort.toUpperCase() == "MARSHALS" ) {
					tempCat = ["FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Marshalls", url: "marshallsonline.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "MATTRESSFIRM" || nameShort.toUpperCase() == "THEMATTRESSFIRM" || nameShort.toUpperCase() == "MATRESSFIRM" ) {
					tempCat = ["FURNITURE_HOME_STORE"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Mattress Firm", url: "mattressfirm.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "MCDONALDS" || nameShort.toUpperCase() == "MCDS" || nameShort.toUpperCase() == "MCDONALD" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "McDonald's", url: "mcdonalds.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "MELLOWMUSHROOM" || nameShort.toUpperCase() == "MELLOWMUSHROOMPIZZA" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Mellow Mushroom", url: "mellowmushroom.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "MENSWEARHOUSE" || nameShort.toUpperCase() == "MENSWAREHOUSE" ) {
					tempCat = ["FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Men's Wearhouse", url: "menswearhouse.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "METROPCS"  ) {
					tempCat = ["ELECTRONICS"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "MetroPCS", aliases: ["Metro PCS"], url: "metropcs.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "METROSTORAGE" || nameShort.toUpperCase() == "METROSELFSTORAGE" ) {
					tempCat = ["SHOPPING_AND_SERVICES"];  desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Metro Self Storage", aliases: ["Metro Storage"], url: "metrostorage.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "MICHAELS" ) {
					tempCat = ["ARTS_AND_CRAFTS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Michael's", url: "michaels.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "MOESSOUTHWESTGRILL" || nameShort.toUpperCase() == "MOESSWGRILL" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Moe's Southwest Grill", url: "moes.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "NEWKS" || nameShort.toUpperCase() == "NEWK" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Newk's", url: "newks.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "NORDSTROM" || nameShort.toUpperCase() == "NORDSTROMS" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Nordstrom", url: "nordstrom.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "NORDSTROMRACK" || nameShort.toUpperCase() == "NORDSTROMSRACK" ) {
					tempCat = ["FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Nordstrom Rack", url: "nordstromrack.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "OLIVEGARDEN" || nameShort.toUpperCase() == "THEOLIVEGARDEN" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Olive Garden", url: "olivegarden.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ONTHEBORDER" || nameShort.toUpperCase() == "ONTEHBORDER" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "On the Border", url: "home.ontheborder.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "OREILLYAUTOPARTS" || nameShort.toUpperCase() == "OREILLYPARTS" || nameShort.toUpperCase() == "OREILLYAUTO"  ) {
					tempCat = ["CAR_SERVICES"]; desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "O'Reilly Auto Parts", url: "oreillyauto.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "OUTBACK" || nameShort.toUpperCase() == "OUTBACKSTEAKHOUSE" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Outback Steakhouse", url: "outback.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PANDAEXPRESS" || nameShort.toUpperCase() == "PANDAXPRESS" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Panda Express", url: "pandaexpress.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PANERABREAD" || nameShort.toUpperCase() == "PANERA" ) {
					tempCat = ["RESTAURANT","BAKERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Panera Bread", url: "panerabread.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PAPAJOHNS" || nameShort.toUpperCase() == "PAPAJOHNSPIZZA" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","DELIVERIES","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Papa John's Pizza", url: "papajohns.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PAPPADEAUXSEAFOODKITCHEN" || nameShort.toUpperCase() == "PAPPADEAUXS" ||
					nameShort.toUpperCase() == "PAPPADEAUXSEAFOOD" || nameShort.toUpperCase() == "PAPPADEAUXSSEAFOODKITCHEN" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Pappadeaux Seafood Kitchen", aliases: ["Pappadeaux's"], url: "pappadeaux.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PAYLESS" || nameShort.toUpperCase() == "PAYLESSSHOES"  || nameShort.toUpperCase() == "PAYLESSSHOESOURCE" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Payless ShoeSource", url: "payless.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "PEPBOYS"  ) {
					tempCat = ["GARAGE_AUTOMOTIVE_SHOP","CAR_SERVICES"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Pep Boys", url: "pepboys.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PEPPERPALACE"  ) {
					tempCat = ["SHOPPING_AND_SERVICES"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Pepper Palace", url: "pepperpalace.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PETCO" ) {
					tempCat = ["PET_STORE_VETERINARIAN_SERVICES"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Petco", url: "petco.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "PETSMART" ) {
					tempCat = ["PET_STORE_VETERINARIAN_SERVICES"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "PetSmart", url: "petsmart.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "PFCHANGS" || nameShort.toUpperCase() == "PFCHANG" || 
					nameShort.toUpperCase() == "PFCHANGSCHINABISTRO" || nameShort.toUpperCase() == "PFCHANGSBISTRO" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "P.F. Chang's China Bistro", aliases: ["PF Chang's China Bistro"], url: "pfchangs.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PIGGLYWIGGLY" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Piggly Wiggly", url: "pigglywiggly.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "PIZZAHUT" || nameShort.toUpperCase() == "PIZAHUT" ) {
					tempCat = ["FAST_FOOD"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","DELIVERIES","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Pizza Hut", url: "pizzahut.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "POPEYES" || nameShort.toUpperCase() == "POPEYESLOUISIANAKITCHEN" ) {
					tempCat = ["FAST_FOOD"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Popeyes Louisiana Kitchen", url: "locations.popeyes.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PUBLICSTORAGE" || nameShort.toUpperCase() == "PUBLICSELFSTORAGE" ) {
					tempCat = ["SHOPPING_AND_SERVICES"];
					desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Public Storage", url: "publicstorage.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "PUBLIX" || nameShort.toUpperCase() == "PUBLIXSUPERMARKET" ) {
					tempCat = ["SUPERMARKET_GROCERY","PHARMACY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Publix", url: "publix.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "QUIZNOS" || nameShort.toUpperCase() == "QUIZNO" ) {
					tempCat = ["FAST_FOOD"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Quiznos", url: "quiznos.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "RADIOSHACK"  ) {
					tempCat = ["ELECTRONICS"];  desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Radio Shack", url: "radioshack.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "RAISINGCANES" || nameShort.toUpperCase() == "RAISINGCANE" ) {
					tempCat = ["FAST_FOOD"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Raising Cane's", url: "raisingcanes.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "REDLOBSTER" || nameShort.toUpperCase() == "REDLOBSTERGRILL" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Red Lobster", url: "redlobster.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ROSS" || nameShort.toUpperCase() == "ROSSDRESSFORLESS" || nameShort.toUpperCase() == "ROSSDRESS4LESS" ) {
					tempCat = ["FASHION_AND_CLOTHING"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Ross Dress for Less", url: "rossstores.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "RUBYTUESDAY" || nameShort.toUpperCase() == "RUBYTUESDAYS" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Ruby Tuesday", url: "rubytuesday.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "RURALKING" || nameShort.toUpperCase() == "RURALKINGSUPPLY" ) {
					tempCat = ["DEPARTMENT_STORE","SPORTING_GOODS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Rural King Supply", url: "ruralking.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "RYANS" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Ryan's", url: "ryans.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "SALSARITAS" ) {
					tempCat = ["FAST_FOOD"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Salsarita's", url: "salsaritas.com", categories: tempCat }));
				}
			
				// Sam's Club Gasoline: see gas station section
			
				else if ( !(categories.indexOf("GAS_STATION") > -1) && (nameShort.toUpperCase() == "SAMSCLUB" )) {
					tempCat = ["SUPERMARKET_GROCERY","DEPARTMENT_STORE","FURNITURE_HOME_STORE","ELECTRONICS","FASHION_AND_CLOTHING"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Sam's Club", url: "samsclub.com", description: "Members only" }));
				}
			
				else if (nameShort.toUpperCase() == "SAVEALOT" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Save-A-Lot", url: "save-a-lot.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "SCHLOTZSKYS" || nameShort.toUpperCase() == "SCHLOTSKYS" ||
					nameShort.toUpperCase() == "SHLOTZSKYS" || nameShort.toUpperCase() == "SHLOTSKYS" ) {
					tempCat = ["FAST_FOOD"];
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Schlotzsky's", url: "schlotzskys.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "SEARS" || nameShort.toUpperCase() == "SEARSHOME" ) {
					tempCat = ["DEPARTMENT_STORE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Sears", url: "sears.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "SEPHORA" || nameShort.toUpperCase() == "SEPHORASALON" ) {
					tempCat = ["PERSONAL_CARE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Sephora", url: "sephora.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "SIZZLER" || nameShort.toUpperCase() == "SIZZLERGRILL" || nameShort.toUpperCase() == "SIZZLERSTEAKHOUSE" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Sizzler", url: "sizzler.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "SMASHBURGER" ) {
					tempCat = ["FAST_FOOD"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Smashburger", url: "smashburger.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "SONIC" || nameShort.toUpperCase() == "SONICDRIVEIN" ) {
					tempCat = ["FAST_FOOD"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Sonic Drive-In", url: "sonicdrivein.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "SPORTSAUTHORITY" || nameShort.toUpperCase() == "THESPORTSAUTHORITY" ) {
					tempCat = ["SPORTING_GOODS","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Sports Authority", url: "sportsauthority.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "STARBUCKS" || nameShort.toUpperCase() == "STARBUCK" ) {
					tempCat = ["CAFE"]; desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Starbucks", aliases: [], url: "starbucks.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "STEAKNSHAKE" || nameShort.toUpperCase() == "STEAKANDSHAKE" ) {
					tempCat = ["FAST_FOOD","RESTAURANT"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Steak 'n Shake", aliases: ["Steak and Shake"], url: "steaknshake.com", categories: tempCat }));
				}
			
				else if ( nameShort.toUpperCase() == "SUBWAY" ) {
					tempCat = ["FAST_FOOD"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "SUBWAY", url: "subway.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "SUPERCUTS" || nameShort.toUpperCase() == "SUPERCUTSSALON" ) {
					tempCat = ["PERSONAL_CARE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Supercuts", url: "supercuts.com", categories: tempCat  }));
				}
			
				else if ( nameShort.toUpperCase() == "TACOBELL" ) {
					tempCat = ["FAST_FOOD"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Taco Bell", url: "tacobell.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "TARGET" || nameShort.toUpperCase() == "TARGETSUPERSTORE" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Target", url: "target.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "TEXASROADHOUSE" || nameShort.toUpperCase() == "TXROADHOUSE" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Texas Roadhouse", url: "texasroadhouse.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "TGIFRIDAYS" || nameShort.toUpperCase() == "TGIF" || nameShort.toUpperCase() == "TGIFRIDAY" ) {
					tempCat = ["RESTAURANT"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "TGI Friday's", aliases: ["TGIF"], url: "tgifridays.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "THEHOMEDEPOT" || nameShort.toUpperCase() == "HOMEDEPOT" ) {
					tempCat = ["HARDWARE_STORE"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "The Home Depot", url: "homedepot.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "TJMAXX" || nameShort.toUpperCase() == "TJMAX" ) {
					tempCat = ["FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "TJ Maxx", url: "tjmaxx.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "TOYSRUS" || nameShort.toUpperCase() == "TOYSAREUS"  ) {
					tempName = "Toys R Us"; tempCat = ["TOY_STORE"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: tempName, url: "toysrus.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "TRADERJOES" ) {
					tempCat = ["SUPERMARKET_GROCERY"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Trader Joe's", url: "traderjoes.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "UHAUL"  ) {
					tempCat = ["CAR_RENTAL","SHOPPING_AND_SERVICES"]; desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS"];
					W.model.actionManager.add(new UpdateObject(item, { name: "U-Haul", aliases: ["UHaul"], url: "uhaul.com", 
					description: "Moving truck rental", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ULTA" || nameShort.toUpperCase() == "ULTASALON" ) {
					tempCat = ["PERSONAL_CARE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "ULTA", url: "ulta.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "UNCLEBOBSSELFSTORAGE" ) {
					tempCat = ["SHOPPING_AND_SERVICES"];  desServ = ["CREDIT_CARDS","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Uncle Bob's Self Storage", url: "unclebobs.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "UPS" || nameShort.toUpperCase() == "UNITEDPARCELSERVICE"  ) {
					tempCat = ["SHOPPING_AND_SERVICES"]; tempName = "UPS";
					W.model.actionManager.add(new UpdateObject(item, { name: tempName, aliases: ["United Parcel Service"], url: "ups.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "UPSSTORE" || nameShort.toUpperCase() == "THEUPSSTORE"  ) {
					tempCat = ["SHOPPING_AND_SERVICES"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "The UPS Store", url: "theupsstore.com", categories: tempCat, 
					description: "For packing, shipping, printing and business service needs." }));
				}
			
				else if (nameShort.toUpperCase() == "VITAMINSHOPPE" || nameShort.toUpperCase() == "VITAMINSHOP" ||
					nameShort.toUpperCase() == "THEVITAMINSHOPPE" || nameShort.toUpperCase() == "THEVITAMINSHOP" ) {
					tempCat = ["PERSONAL_CARE"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Vitamin Shop", url: "vitaminshoppe.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "VONMAUR" || nameShort.toUpperCase() == "VONMAUER" ) {
					tempCat = ["DEPARTMENT_STORE","FASHION_AND_CLOTHING"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Von Maur", url: "vonmaur.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "WAFFLEHOUSE" || nameShort.toUpperCase() == "WAFLEHOUSE" ) {
					tempCat = ["FAST_FOOD"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Waffle House", url: "wafflehouse.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "WALGREENS" || nameShort.toUpperCase() == "WALGREEN" ) {
					tempCat = ["PHARMACY","CONVENIENCE_STORE"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Walgreens", url: "walgreens.com", categories: tempCat }));
				}
			
				else if ( nameShort.toUpperCase() == "WALMART" || nameShort.toUpperCase() == "WALMARTSUPERCENTER" || nameShort.toUpperCase() == "SUPERWALMART" ) {
					if ( categories.indexOf("SUPERMARKET_GROCERY") > -1 ) { tempCat = ["DEPARTMENT_STORE","SUPERMARKET_GROCERY"]; }
					else { tempCat = ["DEPARTMENT_STORE"];  walmartFlag = 1; }
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Walmart", url: "walmart.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "WALMARTNEIGHBORHOODMARKET" || nameShort.toUpperCase() == "WALMARTMARKET" ) {
					tempCat = ["SUPERMARKET_GROCERY"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Walmart Neighborhood Market", url: "walmart.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "WENDYS"  ) {
					tempCat = ["FAST_FOOD"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Wendy's", url: "wendys.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "WHATABURGER" ) {
					tempCat = ["FAST_FOOD"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Whataburger", url: "whataburger.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "WHOLEFOODSMARKET" || nameShort.toUpperCase() == "WHOLEFOODS" ) {
					tempCat = ["SUPERMARKET_GROCERY"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Whole Foods Market", url: "wholefoodsmarket.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "WORLDMARKET" || nameShort.toUpperCase() == "COSTPLUS" || nameShort.toUpperCase() == "COSTPLUSWORLDMARKET" ) {
					tempCat = ["DEPARTMENT_STORE","MARKET"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "World Market", aliases: ["Cost Plus World Market"], url: "worldmarket.com", categories: tempCat  }));
				}
			
				else if (nameShort.toUpperCase() == "YOUFIT" ) {
					tempCat = ["GYM_FITNESS"];  desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Youfit", url: "youfit.com", categories: tempCat }));
				}
			
				else if (nameShort.toUpperCase() == "ZAXBYS" || nameShort.toUpperCase() == "ZAXBY" ) {
					tempCat = ["FAST_FOOD"]; desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","TAKE_AWAY","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Zaxby's", url: "zaxbys.com", categories: tempCat }));
				}
			
			// HOTELS:
		
				else if (nameShort.toUpperCase() == "CANDLEWOODSUITES" || nameShort.toUpperCase() == "CANDLEWOOD" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Candlewood Suites", url: "ihg.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "CROWNEPLAZA" || nameShort.toUpperCase() == "CROWNPLAZA" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Crown Plaza", url: "ihg.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "EXTENDEDSTAYAMERICA" || nameShort.toUpperCase() == "EXTENDEDSTAY" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Extended Stay America", url: "extendedstayamerica.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HAMPTONINN" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Hampton Inn", url: "hamptoninn3.hilton.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HILTON" || nameShort.toUpperCase() == "HILTONHOTEL" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Hilton", url: "hilton.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HILTONGARDENINN" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Hilton Garden Inn", url: "hilton.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HOLIDAYINN"  ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Holiday Inn", url: "ihg.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HOLIDAYINNSUITES" || nameShort.toUpperCase() == "HOLIDAYINNANDSUITES"  ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Holiday Inn & Suites", aliases: ["Holiday Inn and Suites"], url: "ihg.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HOLIDAYINNEXPRESS"  ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Holiday Inn Express", url: "ihg.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HOLIDAYINNEXPRESSSUITES" || nameShort.toUpperCase() == "HOLIDAYINNEXPRESSANDSUITES"  ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Holiday Inn Express & Suites", aliases: ["Holiday Inn Express and Suites"], url: "ihg.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HOLIDAYINNRESORT"  ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Holiday Inn Resort", url: "ihg.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HOTELINDIGO"  ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Hotel Indigo", url: "ihg.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HOWARDJOHNSON" || nameShort.toUpperCase() == "HOJO"  ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Howard Johnson", aliases: ["HoJo"], url: "hojo.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "HYATT" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Hyatt", url: "hyatt.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "LAQUINTA" || nameShort.toUpperCase() == "LAQUINTAINN"  ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "La Quinta Inn", aliases: ["LaQuinta Inn"], url: "lq.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "MARRIOTT" || nameShort.toUpperCase() == "MARRIOT" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Marriott", url: "marriott.com", categories: tempCat }));
				}
				else if (nameNumShort.toUpperCase() == "MOTEL6" || nameShort.toUpperCase() == "MOTELSIX" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Motel 6", url: "motel6.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "STAYBRIDGESUITES" || nameShort.toUpperCase() == "STAYBRIDGE"  ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Staybridge Suites", url: "ihg.com", categories: tempCat }));
				}
				else if (nameNumShort.toUpperCase() == "SUPER8" || nameShort.toUpperCase() == "SUPEREIGHT" ) {
					hotelCat = 1; tempCat = ["HOTEL"];  desServ = ["WI_FI","RESTROOMS","CREDIT_CARDS","RESERVATIONS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Super 8", url: "super8.com", categories: tempCat }));
				}
			
			
			
			
			// BANKS: 
			
				else if (nameShort.toUpperCase() == "BANKOFAMERICA" || nameShort.toUpperCase() == "BOFA" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Bank of America", url: "bankofamerica.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "BANKOFAMERICAATM" || nameShort.toUpperCase() == "BOFAATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Bank of America ATM", url: "bankofamerica.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "BANKUNITED" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "BankUnited", url: "bankunited.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "BANKUNITEDATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "BankUnited ATM", url: "bankunited.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "BBT" || vname.toUpperCase() == "BBANDT" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "BB&T", aliases: ["BBT","BB and T"], url: "bbt.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "BBTATM" || vname.toUpperCase() == "BBANDTATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "BB&T ATM", aliases: ["BBT ATM","BB and T ATM"], url: "bbt.com", categories: tempCat }));
				}
			//	
				else if (nameNumShort.toUpperCase() == "C1BANK" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "C1 Bank", url: "c1bank.com", categories: tempCat }));
				}
				else if (nameNumShort.toUpperCase() == "C1BANKATM" || vname.toUpperCase() == "C1ATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "C1 Bank ATM", aliases: ["C1 ATM"], url: "c1bank.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "CHASEBANK" || vname.toUpperCase() == "CHASE" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Chase Bank", url: "chase.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "CHASEBANKATM" || vname.toUpperCase() == "CHASEATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Chase ATM", url: "chase.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "CITIBANK" || vname.toUpperCase() == "CITI" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Citibank", aliases: ["Citi Bank"], url: "citibank.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "CITIBANKATM" || vname.toUpperCase() == "CITIATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Citibank ATM", aliases: ["Citi ATM"], url: "citibank.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "CITIZENS" || vname.toUpperCase() == "CITIZENSBANK" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Citizens Bank", url: "citizens.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "CITIZENSATM" || vname.toUpperCase() == "CITIZENSBANKATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Citizens Bank ATM", url: "citizens.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "FIFTHTHIRDBANK" || nameShort.toUpperCase() == "FIFTHTHIRD" || nameNumShort.toUpperCase() == "53BANK" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Fifth Third Bank", aliases: ["5/3 Bank"], url: "53.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "FIFTHTHIRDBANKATM" || nameShort.toUpperCase() == "FIFTHTHIRDATM" || 
					nameNumShort.toUpperCase() == "53BANKATM" || nameNumShort.toUpperCase() == "53ATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Fifth Third Bank ATM", aliases: ["5/3 Bank ATM"], url: "53.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "FIRSTCITIZENSBANK" || nameShort.toUpperCase() == "FIRSTCITIZENS" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "First Citizens Bank", url: "firstcitizensonline.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "FIRSTCITIZENSBANKATM" || nameShort.toUpperCase() == "FIRSTCITIZENSATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "First Citizens Bank ATM", url: "firstcitizensonline.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "IBMSOUTHEASTEMPLOYEESFEDERALCREDITUNION" || nameShort.toUpperCase() == "IBMSOUTHEASTEFCU" ||
					nameShort.toUpperCase() == "IBMSEFCU" || nameShort.toUpperCase() == "IBMSEEFCU" ) {
					tempName = "IBM Southeast EFCU";
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: tempName, aliases: ["IBM Southeast Employees' Federal Credit Union","IBM SEFCU"], url: "ibmsecu.org", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "IBMSOUTHEASTEMPLOYEESFEDERALCREDITUNIONATM" || nameShort.toUpperCase() == "IBMSOUTHEASTEFCUATM" ||
					nameShort.toUpperCase() == "IBMSEFCUATM" || nameShort.toUpperCase() == "IBMSEEFCUATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "IBM Southeast EFCU ATM", aliases: ["IBM Southeast Employees' Federal Credit Union ATM","IBM SEFCU ATM"], url: "ibmsecu.org", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "PNCBANK" || nameShort.toUpperCase() == "PNC" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "PNC Bank", url: "pnc.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "PNCBANKATM" || nameShort.toUpperCase() == "PNCATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "PNC Bank ATM", url: "pnc.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "REGIONS" || nameShort.toUpperCase() == "REGIONSBANK" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Regions Bank", url: "regions.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "REGIONSATM" || nameShort.toUpperCase() == "REGIONSBANKATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Regions Bank ATM", url: "regions.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "SOUTHSTATEBANK" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "South State Bank", url: "southstatebank.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "SOUTHSTATEBANKATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "South State Bank ATM", url: "southstatebank.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "SUNCOASTCREDITUNION" || nameShort.toUpperCase() == "SUNCOASTSCHOOLSCREDITUNION" ||
					nameShort.toUpperCase() == "SUNCOASTFEDERALCREDITUNION" || nameShort.toUpperCase() == "SUNCOASTSCHOOLSFEDERALCREDITUNION" ||
					nameShort.toUpperCase() == "SUNCOASTCU" || nameShort.toUpperCase() == "SUNCOASTSCHOOLSCU" ||
					nameShort.toUpperCase() == "SUNCOASTFCU" || nameShort.toUpperCase() == "SUNCOASTSCHOOLSFCU" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Suncoast Credit Union", aliases: ["Suncoast CU","Suncoast Schools Credit Union"], url: "suncoastcreditunion.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "SUNCOASTCREDITUNIONATM" || nameShort.toUpperCase() == "SUNCOASTSCHOOLSCREDITUNIONATM" ||
					nameShort.toUpperCase() == "SUNCOASTFEDERALCREDITUNIONATM" || nameShort.toUpperCase() == "SUNCOASTSCHOOLSFEDERALCREDITUNIONATM" ||
					nameShort.toUpperCase() == "SUNCOASTCUATM" || nameShort.toUpperCase() == "SUNCOASTSCHOOLSCUATM" ||
					nameShort.toUpperCase() == "SUNCOASTFCUATM" || nameShort.toUpperCase() == "SUNCOASTSCHOOLSFCUATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Suncoast Credit Union ATM", aliases: ["Suncoast CU ATM"], url: "suncoastcreditunion.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "SUNTRUST" || nameShort.toUpperCase() == "SUNTRUSTBANK" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "SunTrust Bank", url: "suntrust.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "SUNTRUSTATM" || nameShort.toUpperCase() == "SUNTRUSTBANKATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "SunTrust Bank ATM", url: "suntrust.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "TDBANK" || nameShort.toUpperCase() == "TD" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "TD Bank", url: "tdbank.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "TDBANK" || nameShort.toUpperCase() == "TDATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "TD Bank ATM", url: "tdbank.com", categories: tempCat }));
				}
			//	
				else if (nameShort.toUpperCase() == "WELLSFARGO" || nameShort.toUpperCase() == "WELLSFARGOBANK" ) {
					if ( !(categories.indexOf("BANK_FINANCIAL") > -1) ) { alertMessage(0); return; }
					tempCat = ["BANK_FINANCIAL","ATM"];  desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Wells Fargo", url: "wellsfargo.com", categories: tempCat }));
				}
				else if (nameShort.toUpperCase() == "WELLSFARGOATM" || nameShort.toUpperCase() == "WELLSFARGOBANKATM" ) {
					if ( !(categories.indexOf("ATM") > -1) ) { alertMessage(1); return; }
					tempCat = ["ATM"];  desServ = ["WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { name: "Wells Fargo", url: "wellsfargo.com", categories: tempCat }));
				}
			//	
			
			
			
			
				else if (brandSwap == 1 ) {
					var newUrl = normalizeURL(item.attributes.url);
					W.model.actionManager.add(new UpdateObject(item, { url: newUrl }));
				}
				else {
					var newUrl = normalizeURL(item.attributes.url);
					var newName = toTitleCase(vname);
					W.model.actionManager.add(new UpdateObject(item, { name: newName, url: newUrl }));
				}
			
			
			
	// Category/Name-based Services:
				if (categories.indexOf("BANK_FINANCIAL") > -1 && !categories.indexOf("ATM") > -1) {
					desServ = ["AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
					W.model.actionManager.add(new UpdateObject(item, { categories: tempCat }));
				}
				if (tempCat.indexOf("SHOPPING_CENTER") > -1 || tempCat.indexOf("PARKING_LOT") > -1 || tempCat.indexOf("GARAGE_AUTOMOTIVE_SHOP") > -1 ) {
					desServ = ["PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
				}
				if (tempCat.indexOf("HOSPITAL_MEDICAL_CARE") > -1 || tempCat.indexOf("DEPARTMENT_STORE") > -1 || tempCat.indexOf("RESTAURANT") > -1 ||
					tempCat.indexOf("CAFE") > -1 || tempCat.indexOf("CAR_DEALERSHIP") > -1 || tempCat.indexOf("FURNITURE_HOME_STORE") > -1 ||
					tempCat.indexOf("SPORTING_GOODS") > -1 || tempCat.indexOf("CAR_DEALERSHIP") > -1 || tempCat.indexOf("BAR") > -1 ||
					tempCat.indexOf("GYM_FITNESS") > -1 || tempCat.indexOf("HARDWARE_STORE") > -1 || tempCat.indexOf("CONVENIENCE_STORE") > -1 ||
					tempCat.indexOf("SUPERMARKET_GROCERY") > -1 || tempCat.indexOf("PET_STORE_VETERINARIAN_SERVICES") > -1 || 
					tempCat.indexOf("TOY_STORE") > -1 || tempCat.indexOf("PERSONAL_CARE") > -1 ) {
					desServ = ["RESTROOMS","CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
				}
				if (tempCat.indexOf("BOOKSTORE") > -1 || tempCat.indexOf("FASHION_AND_CLOTHING") > -1 || tempCat.indexOf("PERSONAL_CARE") > -1 ||
					tempCat.indexOf("BAKERY") > -1 || tempCat.indexOf("DESSERT") > -1 || tempCat.indexOf("FAST_FOOD") > -1 ||
					tempCat.indexOf("PHARMACY") > -1 || tempCat.indexOf("ELECTRONICS") > -1 || tempCat.indexOf("FLOWERS") > -1 ||
					tempCat.indexOf("MARKET") > -1 || tempCat.indexOf("JEWELRY") > -1 || tempCat.indexOf("MUSIC_STORE") > -1 ) {
					desServ = ["CREDIT_CARDS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
				}
				for (var ixServ=0; ixServ<desServ.length;ixServ++) {
					if ( tempServ.indexOf(desServ[ixServ]) == -1 ) {
						tempServ.push(desServ[ixServ]);
					}
				}
				if ( (tempCat.indexOf("COLLEGE_UNIVERSITY") > -1 || tempCat.indexOf("SCHOOL") > -1 || tempCat.indexOf("RELIGIOUS_CENTER") > -1 || tempCat.indexOf("KINDERGARDEN") > -1 ) && !(tempCat.indexOf("PARKING_LOT") > -1) ) {
					tempServ = ["RESTROOMS","AIR_CONDITIONING","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"];
				}
				W.model.actionManager.add(new UpdateObject(item, { services: tempServ }));
				 
	// Address check

				var issues = [];
				if (!item.attributes.name && !item.attributes.residential) {
					issues.push("Place does not have a name.");
				}
				if (!addr.street || addr.street.isEmpty) {
					issues.push("Place does not have a street.");
				}
				if (!item.attributes.houseNumber) {
					issues.push("Place does not have a house number.");
				}
				if (issues.length > 0) {
					alert(issues.join("\n"));
					return;
				}
			


	// Place Area check
				if ( item.isPoint() && (tempCat.indexOf("GAS_STATION") > -1 || tempCat.indexOf("PARKING_LOT") > -1 || tempCat.indexOf("AIRPORT") > -1 ||
				tempCat.indexOf("BRIDGE") > -1 || tempCat.indexOf("CEMETERY") > -1 || tempCat.indexOf("EMBASSY_CONSULATE") > -1 || 
				tempCat.indexOf("FIRE_DEPARTMENT") > -1 || tempCat.indexOf("POLICE_STATION") > -1 ||  
				tempCat.indexOf("PRISON_CORRECTIONAL_FACILITY") > -1 || tempCat.indexOf("SCHOOL") > -1 || tempCat.indexOf("SHOPPING_CENTER") > -1 || 
				tempCat.indexOf("RACING_TRACK") > -1 || tempCat.indexOf("THEME_PARK") > -1 || tempCat.indexOf("GOLF_COURSE") > -1 || 
				tempCat.indexOf("PARK") > -1  )  ) {
					alert("This category should be an area.  Please change it, or manually lock it.");
					return;
				}
				if ( item.isPoint() && tempCat.indexOf("STADIUM_ARENA") > -1 ) {
						alert("This category should be an area.  Please change it, or manually lock it, or consider using the 'Sports Court' category and a place point for small/local ball fields and arenas. **");
						return;
				}
				if ( region === "USA_SE" && item.isPoint() && tempCat.indexOf("POST_OFFICE") > -1  ) {
						alert("Only use the 'Post Office' category for USPS post offices.  If this is a USPS location, please change to an area place and run the script again.  All other mail service places use the 'Shopping and Services' Category.");
						return;
				}
				if ( item.isPoint() && tempCat.indexOf("HOSPITAL_MEDICAL_CARE") > -1 ) {
					alert("This category should usually be an area.  Please change it, or manually lock it (if it is an ER point inside a larger hospital area).  ** Please use the 'Office' category for non-emergency medical offices. **");
					return;
				}
				if ( region === "USA_SE" && item.isPoint() && (tempCat.indexOf("JUNCTION_INTERCHANGE") > -1 || tempCat.indexOf("SEA_LAKE_POOL") > -1 || tempCat.indexOf("RIVER_STREAM") > -1 ||
				tempCat.indexOf("FOREST_GROVE") > -1 || tempCat.indexOf("CANAL") > -1 || tempCat.indexOf("SWAMP_MARSH") > -1 || 
				tempCat.indexOf("ISLAND") > -1 || tempCat.indexOf("BEACH") > -1 || tempCat.indexOf("TRANSPORTATION") > -1  )  ) {
					alert("This category is usually not mapped in the SE region.  Please manually lock it, if it's a valid place.");
					return;
				}
				if ( region === "USA_SE" && item.is2D() && (tempCat.indexOf("CAR_DEALERSHIP") > -1 ) ) {
					alert("This category should be a point place, not an area.");
					return;
				}
			
	// Post Office post processing
				if (tempCat.indexOf("POST_OFFICE") > -1 ) {
					W.model.actionManager.add(new UpdateObject(item, { url: "usps.com", aliases: ["United States Postal Service"],
					services: ["AIR_CONDITIONING","CREDIT_CARDS","PARKING_FOR_CUSTOMERS","WHEELCHAIR_ACCESSIBLE"] }));
				}
			
	// Check for weird HNs        	
				hnTemp = item.attributes.houseNumber.replace(/[^\d]/g,'');
				if (hnTemp != item.attributes.houseNumber || hnTemp > 999999) {
					alert("House number is non-standard.  Correct it and rerun, or manually lock if correct.");
					 return;
				}
			
			
	// Place locking
			
				var levelToLock = lockLevel3;
			
				if (region === "USA_SE") {
					if (tempCat.indexOf("COLLEGE_UNIVERSITY") > -1 && tempCat.indexOf("PARKING_LOT") > -1) {
						levelToLock = lockLevel4;
					}
					else if (item.isPoint() && tempCat.indexOf("COLLEGE_UNIVERSITY") > -1 && !(tempCat.indexOf("HOSPITAL_MEDICAL_CARE") > -1)) {
						levelToLock = lockLevel4;
					}
					else if (tempCat.indexOf("HOSPITAL_MEDICAL_CARE") > -1 || tempCat.indexOf("COLLEGE_UNIVERSITY") > -1 || 
					tempCat.indexOf("STADIUM_ARENA") > -1 || tempCat.indexOf("SCHOOL") > -1 || tempCat.indexOf("AIRPORT") > -1 ) {
						levelToLock = lockLevel5;
					}
				}

				if (region === "USA_SAT") {
					var level5Categories = ["HOSPITAL_MEDICAL_CARE","AIRPORT"];
					for (var ixCat=0; ixCat<item.attributes.categories.length;ixCat++) {
						if (level5Categories.indexOf(item.attributes.categories[ixCat]) > -1) {
							levelToLock = lockLevel5;
							break;
						}
					}
				}

				if (item.attributes.lockRank < levelToLock) {
					 W.model.actionManager.add(new UpdateObject(item, { lockRank: levelToLock }));
				}
		
			// console.log(W.model)
	// User alerts for potentially confusing places
			
				if ( tempName == "UPS" ) {
					alert("Place is complete, but note that if this is a UPS Store location, please change the name to The UPS Store and run the script again.");
					return;
				}
				if ( tempName == "Home" || tempName == "Casa" || tempName == "My Home" || tempName == "Mi Casa" ) {
					alert("Place is complete, but the name suggests a residential place.");
					return;
				}
				if ( tempName == "FedEx" ) {
					alert("Place is complete, but note that if this is a FedEx Office location, please change the name to FedEx Office and run the script again.");
					return;
				}
				if ( tempName == "IBM Southeast EFCU" ) {
					alert("Place is locked.  Please add the suffix ' - LOCATION' to the primary name as found on IBMSEFCU's website, ibmsecu.org");
					return;
				}
				if ( tempName == "Toys R Us" ) {
					alert("Place is complete.  If there is a Babies R Us at this location, please add it as an alt-name.");
					return;
				}
				if ( tempName == "Babies R Us" ) {
					alert("Place is complete.  If there is a Toys R Us at this location, please make it the primary name and Babies R Us the alt name.");
					return;
				}
				if ( walmartFlag == 1 ) {
					alert("Place is complete.  If this Walmart sells groceries; please add the Supermarket category to the place.");
					return;
				}
				if ( tempCat.indexOf("POST_OFFICE") > -1 ) {
					alert("NOTE: Please verify that the primary post office name is properly named: 'USPS - Branch Name' . If this isn't a USPS post office (eg UPS, Fedex, Mailboxes Etc.), please undo all the script changes and change the category.  'Post Office' is only used for USPS locations.");
					return;
				}
				if ( item.is2D() && tempCat.indexOf("STADIUM_ARENA") > -1 ) {
					alert("Place is complete.  If this is a small/local ball field/arena, please consider using the 'Sports Court' category and making it a point place.");
					return;
				}
				if ( subFuel == 1 ) {
					alert("Place is complete.  Make sure this place is for the gas station itself and not the main store building.  Otherwise undo and check the categories.");
					return;
				}
				if ( hotelCat == 1 || tempCat.indexOf("HOTEL") > -1) {
					alert("Please check hotel details, as names can often be unique (e.g. Holiday Inn - Tampa North). ");
					return;
				}
				if ( brandSwap == 1 ) {
					alert("The gas brand didn't match the primary name.  Check that the brand is indeed the current brand and verify all scripted changes.");
					return;
				}
			
		
			}
		
		}
		
	}
    
})();

