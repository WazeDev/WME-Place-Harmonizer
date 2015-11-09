function harmoList(nShort,nNShort,state2L,region) {
		csv = [
			"Index;Name;AltName;Category;SecondaryCats;Description;URL;Regions;National;SpecCase;NameAddOn;AltSearchName",
			"1;24 Hour Fitness;0;GYM_FITNESS;0;0;24hourfitness.com;SWR, SAT, SER, TX;0;0;GYM;24HOURFITNESS,TWENTYFOURHOURFITNESS",
			"2;7-Eleven;7-11;CONVENIENCE_STORE;0;0;7-eleven.com;SWR, SER, SAT, TX, NEW, MAR;Yes;0;GAS;7ELEVEN,Seveneleven,seven11,711",
			"3;76;0;GAS_STATION;0;0;76.com;SWR, SAT, TX, NEW, MAR;0;0;GAS;76,seventysix",
			"4;99 Cents Only;0;SHOPPING_AND_SERVICES;0;0;99only.com;CA, TX, MAR;0;0;0;99CENTSONLY, 99CENTONLY, NINETYNINECENTSONLY"
		];
		var approvedRegions;
		var nameComps;
		var PNHMatch = false;
		for (var phnum=1; phnum<csv.length; phnum++) {
			csvTemp = csv[phnum].split(";");
			nameComps = csvTemp[11].replace(/ /g, '');
			nameComps = nameComps.toUpperCase();
			nameComps = nameComps.split(",");
			// var PNHRegMatch = false;
			for (var ixCat = 0; ixCat < nameComps.length; ixCat++) {
				if (nShort === nameComps[ixCat] || nNShort === nameComps[ixCat]) {
					PNHMatch = true;
					approvedRegions = csvTemp[7].replace(/ /g, '');
					approvedRegions = approvedRegions.toUpperCase();
					approvedRegions = approvedRegions.split(",");
					for (var ixCat = 0; ixCat < approvedRegions.length; ixCat++) {
						if (state2L === approvedRegions[ixCat] || region === approvedRegions[ixCat]) {
							// PNHRegMatch = true;
							return csvTemp;
						}
					}
				}
			}
		}
		if (PNHMatch) {
			sidebarMessage.push("Harmonization data exists for this place but is not yet approved for your state. Please contact your SM/RC.");	
		} else {
			sidebarMessage.push("Place is not on the harmonization sheet.  If it is a chain with more than a couple of locations, please submit the data HERE");	
		}
	}
	
