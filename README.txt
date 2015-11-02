Place Locker (SE version) BETA documentation;  
developed by vtpearce and bmtg;  
comments for this version to: bmtg (PM), bmtg_4 (Slack DM)

Description:

This script acts on a single selected place.  It will generally clean up many place details, harmonize names and details of many chains, and, if the place is complete according to standards, it will lock to an appropriate level.  Full feature list is below.

----------------

Installation:

-- Option 1: Shortcut key for Chrome 
Install the Chrome extension "Shortcut Manager" from https://chrome.google.com/webstore/detail/shortcut-manager/mgjjeipcdnnjhgodgjpfkffcejoljijf

Open the PlaceLockerSE_Beta page here on the github directory, and copy all the code, starting with and including the line:

javascript: (function () {" 

Then, follow the intructions on this screenshot to assign the script to a keystroke: 

http://prntscr.com/8two3c

(If you are installing an updated version, you can simply paste the new code into the javascript field in your existing shortcut, save the change, and reload WME.)

-- Option 2: Bookmarklet.  

Open the PlaceLockerSE_Beta page here on the github directory, and copy all the code, starting with and including the line:

javascript: (function () {" 

Then follow the directions on the following page, and paste the copied code into the URL field there as indicated.

https://wiki.waze.com/wiki/Bookmarklets

-------------

Usage:

Select a place in WME, and press the shortcut key or browser bookmarklet.  Verify changes, adjust as needed, save.

-------------

Examples (before and after using the script):

Automatic correction of a McDonald's:
http://prntscr.com/8y1ic1

Automatic correction of a 7-Eleven:
http://prntscr.com/8y1gk0

A place with no harmonization data (standalone restaurant):
http://prntscr.com/8y1js4

-------------

Current features:

-- Regional Localization: Script will automatically detect the region of the selected place:  Currently SE, SAT, or Undefined.  If it's in SE or SAT, regional locking rules, place formats, and Phone# formats are applied.  For other regions, these are kept to the basic locking at 3 and (xxx) phone format (until other regions' rules are brought in, in the future).  **Note that for some app-submitted places, no state name is stored.  In these cases, you have to enter at least a city and street in the address field for the script to run.

-- Place name harmonization: An ongoing project is to harmonize place names for chains.  This mostly involves having the same primary name, alt-name(s), category(s), and website address for every place from that chain.  This script will harmonize the current place based on the detected place name and the place harmonization sheet, for many chains on the sheet (more places added with each new update).  When using the script, if the script finds a match for a place on the harm. sheet, it will auto correct the name to the standard name, add any alt-names if needed, put in the correct category(s), and put in the standardized url for the chain.

-- Common services are added for several categories.  For example, Schools receive Restroom, Parking, AC, Wheelchair services.  Any existing checked services are preserved.


-- Gas station correction: This script will do the following to places that have the gas station category:

1) If the primary name doesn't match the brand, then the primary name is moved to the alt name, and the brand is set as the primary name.  Example:  A place named CIRCLE K that has a brand of Shell, will be changed so that Shell is the Primary name, and Circle K is the alt name.  If there is no brand, then there is no change to the name.  The brand field is never changed by this script; if a station has changed brands, that edit needs to be done manually, after which the script can be run.  If the name is changed, the script will alert the user to check the info before saving.

2) The category "Convenience Store" is added to the place.  Very few stations do not have a convenience store, so this adds a likely category.  If your station doesn't have a convenience store, then simply X out the convenience store category after running the script.  If the station had the categories of ATM or Car Wash already in the place, this will preserve them.  Any other categories are wiped out.

3) Services check boxes are set automatically to : Restrooms, Credit Cards, Air Conditioning, Parking, and Wheelchair Accessible.

4) Special stations that are subsets of a larger store are treated slightly differently; At present the script handles Costco, BJ's and Sam's Club stations so that the primary name has "Gasoline" after the name.  Rules 1, 2, and 3 just above are not applied to these places, and also the text "Members only" is added to the description.  Services are limited to Credit Cards, Parking, and Wheelchair Accessible.

-- Place name Title casing: 

1) If there are any lower case letters in any word, then it will Title Case that word. Example:  john's Pass BakERY -> John's Pass Bakery

2) If there is an ALL CAPS word ALONG with other words that are not in all caps, then the ALL CAPS word will be left ALL CAPS while the others are title cased.  Examples:  ALCCO store -> ALCCO Store; QVN Pharmacy -> QVN Pharmacy

3) If the _entire_ place name is in ALL CAPS, then the script will change the entire name to Title Case.  Examples:  ALLCO -> Allco; JOHN'S PASS BAKERY -> John's Pass Bakery.

4) Some common articles and prepositions are kept lowercase.  (a, an, the, of, for, and so forth)

5) Some common ALL CAPS words are made/kept all caps (USA, IRS, BMW)

6) Chain name harmonization overrides title case processing.  

** As you can see, some single word ALL CAPS place names might be correct as ALL CAPS.  Additionally, some places have internal caps, like CollegeUSA.  Unless they are in the chain list, they will be Title cased.  Please observe the name as you use the script and correct as necessary.  

-- Phone correction: If the phone field contains 10 digits, and the digits are not in either xxx-xxx-xxxx or (xxx) xxx-xxxx formats, then the script will put the digits into xxx-xxx-xxxx format.  Those phone numbers that are already in either correct format are not altered.  A leading 1 will be stripped.

-- url correction: If there is an http:// or https:// at the start of the website address, it will remove that from the website and keep the rest.

-- Basic info validation: Three checks are done prior to locking

1) Place area vs. point checking:
Script will check for area vs. point according to wiki guidance (including SE deviation for  US Post Offices).  If the place is a point but is supposed to be an area, then the script will pop up an alert.  For categories that are not supposed to be mapped (junctions, water features), the script will pop up a warning instead of locking, and suggest manual locking if the place is truly valid.  (The reverse check, saying that an area place should be a point, is not performed except for car dealerships, because many of the "point" categories are used inside of valid area places.  Convenience store in a gas station area, for example.)  

2) Name checking: the place has to have a name, or it will pop up an alert.

3) Address checking: If the HN or the street field are not filled, the script pops up an alert.

4) Places with weird HNs are flagged for manual check and lock (8133455678, 123A, 31-2)

** Note: the name and address checks look to see that the info is there, but they don't say if it's correct (i.e., a wrong HN can't be detected by a script like this).  The Harmonization part of the script can autocorrect some misspellings for chains but the editor needs to make sure that the name and address are the correct ones for the place.

-- Applying a lock: If a place satisfies the 3 checks above, then the script will lock the place at the correct level.  The level is determined from the SE locking guidelines.  For example, hospitals are locked at 5, restaurants at 3.  Places in the College Campus Project are locked according to those standards as much as possible.  Notes: If your editor rank is lower than the lock required, then the script locks it to your rank.  Also, the script will never down-lock a place.  Please recognize that not all cases can be scripted.  For example, park-and-ride lots are not easy to distinguish from regular parking lots in a script, so they are locked to 3 in this case.  So use your judgement.  This is just an (imperfect but hopefully useful) tool!

-- Alerts about potentially incorrect information

-- Post Office category gives a warning that the category is only used for USPS.  Populates the url and alt name, warns to check that it's really a USPS or use other category, and adds services: creditcards, AC, parking, wheelchair

-- Reminders for Stadium and Hospital categories, that they are only used in certain cases

-- Places like banks and certain businesses that have similar names now pop up an alert to the editor can verify the script selected the right harmonization.


