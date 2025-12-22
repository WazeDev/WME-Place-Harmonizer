# Place Harmonizer

## Overview
Place Harmonizer cleans and standardizes a single selected place in WME. It harmonizes chain data, fixes common formatting issues, highlights problems, and locks places when they meet regional standards.

## Quick Links
- Production install: https://greasyfork.org/en/scripts/28690-wme-place-harmonizer
- Beta install (beta list access required): https://greasyfork.org/en/scripts/28689-wme-place-harmonizer-beta
- Bugs and issues: https://github.com/WazeDev/WME-Place-Harmonizer/issues
- Contact: MapOMatic

## Installation
1. Install Tampermonkey or Greasemonkey for your browser.
2. Open the production or beta install link above and confirm the userscript install.

## Usage
1. Select a place in WME.
2. Run the script via the "RUN WMEPH" button or shortcut `Shift-Alt-A`.
3. Review the suggested changes, adjust if needed, and save.

## Examples
- McDonald's autocorrection:
  - http://img.prntscr.com/img?url=http://i.imgur.com/YazP0ci.png
- 7-Eleven autocorrection:
  - http://img.prntscr.com/img?url=http://i.imgur.com/fi5hBPe.png
- Standalone restaurant with no harmonization data:
  - http://img.prntscr.com/img?url=http://i.imgur.com/1MLCQZB.png

## Feature Set
- Localization
  - Regional detection with USA region support and region-specific locking, formatting, and phone rules.
  - Country support for USA and Canada, expandable later.
- Chain harmonization
  - Live integration with Place Name Harmonization data for names, alt-names, categories, and URLs.
- Services
  - Common services auto-added per category; existing checked services are preserved.
- Gas stations
  - Rename to brand when primary name mismatches brand; preserve existing brand field and move prior name to alt-name.
  - Add Convenience Store category; keep ATM and Car Wash if present; drop other categories.
  - Set services to Restrooms, Credit Cards, Air Conditioning, Parking, Wheelchair Accessible.
  - Special handling for Costco, BJ's, and Sam's Club stations: append "Gasoline" to name, add "Members only" description, restrict services to Credit Cards, Parking, Wheelchair Accessible.
- Title casing rules
  - Capitalize leading letters; handle Mc/O' prefixes and ampersands; preserve mixed-case words and known acronyms; optionally enforce strict title case when all-caps or mixed casing is detected.
- Phone correction
  - Reformat 10-digit numbers to xxx-xxx-xxxx, removing a leading 1 if present.
- URL correction
  - Strip http/https prefixes from website fields.
- Basic validation before locking
  - Check area vs. point per wiki guidance (with SE post office deviation); alert when mismatched.
  - Require name and address (HN and street); flag odd HNs for manual review (e.g., 8133455678, 123A, 31-2).
- Map highlights
  - Red: major missing items (name, address). Blue: minor gaps (URL, phone, hours). Green: name, address, phone, URL, and hours present. Red/black border for severe issues. Options allow relaxing checks.
- Locking
  - Apply SE locking guidelines when validation passes; never down-lock; cap at editor rank when lower than required.
- Alerts and reminders
  - Warnings for questionable categories (e.g., USPS-only Post Office) with autofill for USPS data and services.
  - Reminders for Stadium and Hospital category rules.
  - Alerts for similar bank/business names to confirm correct harmonization.
- Duplicate detection
  - Search radius for duplicate names with per-place whitelisting applied to both locations.
- Whitelisting
  - Per-place exceptions for missing phone, address, URL, or hours to allow a place to be treated as complete.

## Development Team
bmtg, vtpearce, cardyin, fjsawicki, jtsmith2, joyriding, MapOMatic, RavenDT, 73VW

## Changelog
### Unreleased
#### Changed
- Rewrote the README for clarity, structure, and current links.
